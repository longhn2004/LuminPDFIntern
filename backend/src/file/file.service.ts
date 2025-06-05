import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { Response } from 'express';
import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';

// Schemas
import { File } from './schemas/file.schema';
import { Invitation } from './schemas/invitation.schema';
import { ShareableLink } from './schemas/shareable-link.schema';
import { User } from '../auth/schemas/user.schema';

// DTOs
import { InviteUserDto } from './dto/invite-user.dto';
import { ListFilesDto } from './dto/list-files.dto';
import { CreateAnnotationDto } from './dto/create-annotation.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { ChangeRolesDto } from './dto/change-roles.dto';
import { CreateShareableLinkDto } from './dto/create-shareable-link.dto';
import { ToggleShareableLinkDto } from './dto/toggle-shareable-link.dto';

// Services
import { EmailService } from '../email/email.service';
import { CacheService } from '../cache/cache.service';
import { S3Service } from './s3.service';

@Injectable()
export class FileService {
  private static readonly DEFAULT_XFDF = "<?xml version=\"1.0\" encoding=\"UTF-8\" ?><xfdf xmlns=\"http://ns.adobe.com/xfdf/\" xml:space=\"preserve\"><annots></annots></xfdf>";
  private static readonly MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
  private static readonly FILES_PER_PAGE = 10;

  constructor(
    @InjectModel(File.name) private fileModel: Model<File>,
    @InjectModel(Invitation.name) private invitationModel: Model<Invitation>,
    @InjectModel(ShareableLink.name) private shareableLinkModel: Model<ShareableLink>,
    @InjectModel(User.name) private userModel: Model<User>,
    private configService: ConfigService,
    private emailService: EmailService,
    private cacheService: CacheService,
    private s3Service: S3Service,
  ) {
    console.log('🚀 FileService initialized with S3 storage and Redis caching support');
  }

  // =============================================
  // FILE UPLOAD & MANAGEMENT
  // =============================================

  async uploadFile(file: Express.Multer.File, user: User) {    
    console.log(`📤 Uploading file to S3: ${file.originalname} for user: ${user.email}`);
    if (!file) {      
      throw new BadRequestException('No file uploaded');    
    }    

    try {
      // Upload file to S3
      const s3Key = await this.s3Service.uploadFile(file);
      
      const newFile = new this.fileModel({      
        name: file.originalname,      
        path: s3Key, // Store S3 key instead of local path     
        owner: user._id,      
        ownerEmail: user.email,      
        viewers: [],      
        editors: [],    
      });    
      
      await newFile.save();
      console.log(`✅ File uploaded successfully to S3: ${newFile._id} with key: ${s3Key}`);
      
      // Invalidate user cache since file list changed
      await this.cacheService.invalidateUserCache((user._id as Types.ObjectId).toString());
      
      return newFile;  
    } catch (error) {
      console.error(`❌ Error uploading file to S3:`, error);
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

  async uploadFromDrive(fileId: string, user: User) {
    console.log(`📤 Uploading from Google Drive to S3: ${fileId} for user: ${user.email}`);
    
    // Validate Google Drive file ID format
    if (!fileId || typeof fileId !== 'string' || !/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) {
      throw new BadRequestException('Invalid Google Drive file ID format');
    }
    
    const serviceAccountKeyPath = this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_KEY_PATH') || 
                                  require('path').join(__dirname, '..', '..', 'config', 'service-account-key.json');
    
    const auth = new google.auth.GoogleAuth({
      keyFile: serviceAccountKeyPath,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    try {
      // Get metadata to check format and size
      const fileMetadata = await drive.files.get({ 
        fileId, 
        fields: 'name,mimeType,size,id' 
      });
      
      if (!fileMetadata.data.id) {
        throw new BadRequestException('File not found in Google Drive');
      }
      
      if (fileMetadata.data.mimeType !== 'application/pdf') {
        throw new BadRequestException('Only PDF files are allowed');
      }
      
      const fileSize = parseInt(fileMetadata.data.size || '0');
      if (fileSize > FileService.MAX_FILE_SIZE) {
        throw new BadRequestException(`File size exceeds ${FileService.MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
      }

      // Download file stream from Google Drive
      const res = await drive.files.get({ 
        fileId, 
        alt: 'media' 
      }, { 
        responseType: 'stream' 
      });
      
      // Upload stream directly to S3
      const fileName = fileMetadata.data.name || `drive-file-${fileId}.pdf`;
      const s3Key = await this.s3Service.uploadStream(res.data, fileName, 'application/pdf');
      
      const newFile = new this.fileModel({            
        name: fileName,            
        path: s3Key, // Store S3 key instead of local path           
        owner: user._id,            
        ownerEmail: user.email,            
        viewers: [],            
        editors: [],          
      });
      
      await newFile.save();
      console.log(`✅ File from Google Drive uploaded successfully to S3: ${newFile._id} with key: ${s3Key}`);
      
      // Invalidate user cache since file list changed
      await this.cacheService.invalidateUserCache((user._id as Types.ObjectId).toString());
      
      return newFile;
    } catch (error) {
      console.error(`❌ Error uploading from Google Drive to S3:`, error);
      
      if (error.response?.status === 404) {
        throw new BadRequestException('File not found in Google Drive or access denied');
      } else if (error.response?.status === 403) {
        throw new BadRequestException('Access denied to Google Drive file');
      } else if (error instanceof BadRequestException) {
        throw error;
      } else {
        throw new BadRequestException(`Failed to upload from Google Drive: ${error.message || 'Unknown error'}`);
      }
    }
  }

  async totalFiles(user: User) {
    console.log(`📊 Getting total files count for user: ${user.email}`);
    const count = await this.fileModel.countDocuments({ $or: [{ ownerEmail: user.email }, { viewers: user.email }, { editors: user.email }] });
    console.log(`📊 Total files for user ${user.email}: ${count}`);
    return count;
  }

  // =============================================
  // FILE LISTING & QUERYING
  // =============================================

  async listFiles(query: ListFilesDto, user: User) {
    const { page = 0, sort = 'DESC' } = query;
    console.log(`📋 Listing files for user: ${user.email}, page: ${page}, sort: ${sort}`);
    
    // Try to get from cache first
    const cachedFiles = await this.cacheService.getUserFileList((user._id as Types.ObjectId).toString(), page, sort);
    if (cachedFiles) {
      console.log(`💰 Cache HIT: Returning cached file list for user: ${user.email}`);
      return cachedFiles;
    }
    
    console.log(`🔍 Cache MISS: Fetching file list from database for user: ${user.email}`);
    const limit = FileService.FILES_PER_PAGE;
    const skip = page * limit;
    const sortOrder = sort === 'ASC' ? 1 : -1;

    const files = await this.fileModel      
    .find({        
      $or: [          
        { ownerEmail: user.email },           
        { viewers: user.email },           
        { editors: user.email }        
      ],      
    })      
    .sort({ updatedAt: sortOrder })      
    .skip(skip)      
    .limit(limit)      
    .populate('owner', 'name')      
    .exec();

    const result = files.map((file) => ({
      id: file._id,
      name: file.name,
      owner: file.owner.name,
      role: this.getUserRole(file, user),
      updatedAt: file.updatedAt,
    }));
    
    // Cache the result
    await this.cacheService.setUserFileList((user._id as Types.ObjectId).toString(), page, sort, result);
    console.log(`💾 Cached file list for user: ${user.email}, files count: ${result.length}`);
    
    return result;
  }

  // =============================================
  // FILE DOWNLOAD & ACCESS
  // =============================================

  async downloadFile(id: string, user: User, res: Response, token?: string) {
    console.log(`⬇️ Download file request: ${id} by user: ${user.email}${token ? ' via shareable link' : ''}`);
    const file = await this.fileModel.findById(id).exec();
    if (!file) {
      throw new NotFoundException('File not found');
    }

    let role = this.getUserRole(file, user);
    
    // If user doesn't have direct access, check for shareable link access
    if (role === 'none' && token) {
      const shareableLink = await this.shareableLinkModel.findOne({
        token: token,
        file: id,
        enabled: true
      }).exec();
      
      if (shareableLink && file.shareableLinkEnabled) {
        role = shareableLink.role;
        console.log(`🔗 Access granted via shareable link: ${role} for file: ${id}`);
      }
    }

    console.log(`👤 User role for file ${id}: ${role}`);
    if (role === 'none') {
      throw new ForbiddenException('You do not have permission to access this file');
    }

    try {
      console.log(`✅ File download authorized for: ${id}, generating signed URL from S3`);
      
      // Generate a signed URL for the file download
      const signedUrl = await this.s3Service.getSignedDownloadUrl(file.path, 3600); // 1 hour expiry
      
      // Redirect to the signed URL
      res.redirect(signedUrl);
    } catch (error) {
      console.error(`❌ Error generating download URL for file ${id}:`, error);
      throw new NotFoundException('File not found in storage');
    }
  }

  async downloadFileWithAnnotations(id: string, user: User, token?: string) {
    console.log(`⬇️ Download file with annotations request: ${id} by user: ${user.email}${token ? ' via shareable link' : ''}`);
    
    // Try to get annotations from cache first
    const cachedAnnotations = await this.cacheService.getFileAnnotations(id);
    if (cachedAnnotations) {
      console.log(`💰 Cache HIT: Returning cached annotations for file: ${id}`);
      return cachedAnnotations;
    }
    
    console.log(`🔍 Cache MISS: Fetching annotations from database for file: ${id}`);
    const file = await this.fileModel.findById(id).exec();
    if (!file) {
      throw new NotFoundException('File not found');
    }

    let role = this.getUserRole(file, user);
    
    // If user doesn't have direct access, check for shareable link access
    if (role === 'none' && token) {
      const shareableLink = await this.shareableLinkModel.findOne({
        token: token,
        file: id,
        enabled: true
      }).exec();
      
      if (shareableLink && file.shareableLinkEnabled) {
        role = shareableLink.role;
        console.log(`🔗 Access granted via shareable link: ${role} for file: ${id}`);
      }
    }

    if (role === 'none') {
      throw new ForbiddenException('You do not have permission to access this file');
    }

    // Only owners and editors can download with annotations
    if (role !== 'owner' && role !== 'editor') {
      throw new ForbiddenException('You do not have permission to download with annotations');
    }
    
    try {
      // Generate signed URL for S3 file
      const signedUrl = await this.s3Service.getSignedDownloadUrl(file.path, 3600);
      
      const result = {
        fileId: id,
        fileName: file.name,
        filePath: file.path, // S3 key
        downloadUrl: signedUrl, // Signed S3 URL
        annotations: file.xfdf,
        hasAnnotations: !!file.xfdf && file.xfdf !== FileService.DEFAULT_XFDF
      };
      
      // Cache the annotations
      await this.cacheService.setFileAnnotations(id, result);
      console.log(`💾 Cached annotations for file: ${id}`);
      
      return result;
    } catch (error) {
      console.error(`❌ Error generating download URL for file ${id}:`, error);
      throw new NotFoundException('File not found in storage');
    }
  }

  // =============================================
  // FILE INFORMATION & METADATA
  // =============================================

  async getFileInfo(id: string) {    
    console.log(`ℹ️ Getting file info for: ${id}`);
    
    // Try to get from cache first
    const cachedInfo = await this.cacheService.getFileInfo(id);
    if (cachedInfo) {
      console.log(`💰 Cache HIT: Returning cached file info for: ${id}`);
      return cachedInfo;
    }
    
    console.log(`🔍 Cache MISS: Fetching file info from database for: ${id}`);
    const file = await this.fileModel.findById(id).exec();    
    if (!file) {      
      throw new NotFoundException('File not found');    
    }        
    // Get owner information    
    const ownerUser = await this.userModel.findOne({ email: file.ownerEmail }).exec();    
    const ownerName = ownerUser ? ownerUser.name : '[Unregistered User]';        
    
    // Get shareable links for this file
    const shareableLinks = await this.shareableLinkModel.find({
      file: id,
      enabled: true
    }).exec();
    
    // Format response with detailed information    
    const result = {      
      id: file._id,      
      name: file.name,      
      createdAt: file.createdAt,      
      updatedAt: file.updatedAt,     
       owner: {        
        email: file.ownerEmail,        
        name: ownerName      
      },      
      viewers: file.viewers || [],      
      editors: file.editors || [],
      shareableLinkEnabled: file.shareableLinkEnabled,
      shareableLinks: shareableLinks.map(link => ({
        id: link._id,
        role: link.role,
        token: link.token,
        enabled: link.enabled,
        createdAt: link.createdAt
      }))
    };
    
    // Cache the file info
    await this.cacheService.setFileInfo(id, result);
    console.log(`💾 Cached file info for: ${id}`);
    
    return result;
  }

  async deleteFile(id: string, user: User) {
    console.log(`🗑️ Delete file request: ${id} by user: ${user.email}`);
    const file = await this.fileModel.findById(id).exec();
    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.ownerEmail !== user.email) {      
      throw new ForbiddenException('Only the owner can delete the file');    
    }

    try {
      // Delete from S3
      await this.s3Service.deleteFile(file.path);
      console.log(`✅ File deleted from S3: ${file.path}`);
      
      // Delete from database
      await this.fileModel.findByIdAndDelete(id).exec();
      
      // Delete related invitations
      await this.invitationModel.deleteMany({ file: id }).exec();
      console.log('✅ Deleted related invitations for file:', id);
      
      // Invalidate all caches related to this file
      await this.cacheService.invalidateFileCache(id);
      
      // Invalidate user cache since file list changed
      await this.cacheService.invalidateUserCache((user._id as Types.ObjectId).toString());
      
      console.log(`✅ File deleted successfully: ${id}`);
      return { message: 'File deleted successfully' };
    } catch (error) {
      console.error(`❌ Error deleting file ${id}:`, error);
      throw new BadRequestException(`Failed to delete file: ${error.message}`);
    }
  }

  // =============================================
  // USER MANAGEMENT & PERMISSIONS
  // =============================================

  async getFileUsers(fileId: string, user: User) {
    console.log(`👥 Getting file users for: ${fileId} by user: ${user.email}`);
    const file = await this.validateOwnerAccess(fileId, user);
    
    // Try to get from cache first
    const cachedUsers = await this.cacheService.getFileUsers(fileId);
    if (cachedUsers) {
      console.log(`💰 Cache HIT: Returning cached file users for: ${fileId}`);
      return cachedUsers;
    }
    
    console.log(`🔍 Cache MISS: Fetching file users from database for: ${fileId}`);
    const users: { id?: Types.ObjectId; email: string; role: string, name: string }[] = [];
    
        // Add owner    
    const ownerUser = await this.userModel.findOne({ email: file.ownerEmail }).exec();    
    users.push({       
      id: ownerUser?._id as Types.ObjectId | undefined,       
      email: file.ownerEmail,       
      role: 'owner',       
      name: ownerUser?.name || '[Unregistered User]'     
    });
    
        // Add viewers    
    for (const email of file.viewers) {      
      const viewerUser = await this.userModel.findOne({ email }).exec();      
      users.push({         
        id: viewerUser?._id as Types.ObjectId | undefined,         
        email,         
        role: 'viewer',         
        name: viewerUser?.name || '[Unregistered User]'       
      });    
    }
    
        // Add editors    
    for (const email of file.editors) {      
      const editorUser = await this.userModel.findOne({ email }).exec();      
      users.push({         
        id: editorUser?._id as Types.ObjectId | undefined,         
        email,         
        role: 'editor',         
        name: editorUser?.name || '[Unregistered User]'       
      });    
    }
    
    // Cache the file users
    await this.cacheService.setFileUsers(fileId, users);
    console.log(`💾 Cached file users for: ${fileId}, users count: ${users.length}`);

    return users;
  }

  async inviteUser(inviteDto: InviteUserDto, owner: User) {
    const { fileId, emails, role } = inviteDto;
    console.log(`📨 Inviting users to file: ${fileId}, emails: ${emails.join(', ')}, role: ${role}`);
    const file = await this.fileModel.findById(fileId).exec();
    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.ownerEmail !== owner.email) {
      throw new ForbiddenException('Only the owner can invite users');
    }
    
    // Process emails sequentially instead of in parallel
    for (const email of emails) {
      console.log(`📧 Processing invitation for: ${email}`);
      // Check if the user is registered
      if (role === 'viewer' && !file.viewers.includes(email)) {
        file.viewers.push(email);
      } else if (role === 'editor' && !file.editors.includes(email)) {
        file.editors.push(email);
      }
      const existingUser = await this.userModel.findOne({ email }).exec();
      
      if (existingUser) {
        // Notify registered user about access
        console.log(`✅ Notifying registered user: ${email}`);
        await this.emailService.sendAccessNotification(email, file.name, role, fileId);
      } else {
        console.log(`📝 Creating invitation for unregistered user: ${email}`);
        const invitationToken = uuidv4();
        const invitation = new this.invitationModel({
          email,
          file: fileId,
          role,
          token: invitationToken,
        });
        await invitation.save();
        
        // Send invitation to register
        await this.emailService.sendInvitationEmail(email, invitationToken, file.name, fileId);
      }
    }
    
    // Save the file once after all emails are processed
    await file.save();
    
    // Invalidate caches related to this file
    await this.cacheService.invalidateFileCache(fileId);
    
    console.log(`✅ Invitations sent successfully for file: ${fileId}`);
    return { message: 'Invitations sent successfully' };
  }

  async changeRole(changeRoleDto: ChangeRoleDto, owner: User) {    
    const { fileId, email, role } = changeRoleDto;
    console.log(`🔄 Changing role for file: ${fileId}, email: ${email}, new role: ${role}`);
    const file = await this.fileModel.findById(fileId).exec();    
    if (!file) {      
      throw new NotFoundException('File not found');    
    }    
    if ((file.owner._id as Types.ObjectId).toString() !== (owner._id as Types.ObjectId).toString()) {      
      throw new ForbiddenException('Only the owner can change roles');    
    }    
    
    // Don't require user to exist in database
    if (email === file.ownerEmail) {
      throw new BadRequestException('Cannot change the owner role');
    }

    // Remove from current lists
    file.viewers = file.viewers.filter(viewerEmail => viewerEmail !== email);    
    file.editors = file.editors.filter(editorEmail => editorEmail !== email);

    // Add to new list if not removing role
    if (role && role !== 'none') {
      if (role === 'viewer') {
        file.viewers.push(email);
      } else if (role === 'editor') {
        file.editors.push(email);
      }
    }

    await file.save();
    
    // Invalidate caches related to this file
    await this.cacheService.invalidateFileCache(fileId);

    // Find user to send email if they exist
    const targetUser = await this.userModel.findOne({ email }).exec();
    if (targetUser) {
      console.log(`📧 Sending role change notification to: ${email}`);
      // Send email notification
      if (role === 'none') {
        await this.emailService.sendRoleRemovedNotification(email, file.name);
      } else {
        await this.emailService.sendRoleChangedNotification(email, file.name, role || 'none', fileId);
      }
    }

    console.log(`✅ Role changed successfully for file: ${fileId}, email: ${email}`);
    return { message: role === 'none' ? 'Role removed successfully' : 'Role changed successfully' };
  }

  async changeRoles(changeRolesDto: ChangeRolesDto, owner: User) {
    const { fileId, changes } = changeRolesDto;
    console.log(`🔄 Changing multiple roles for file: ${fileId}, changes count: ${changes.length}`);
    const file = await this.fileModel.findById(fileId).exec();
    if (!file) {
      throw new NotFoundException('File not found');
    }

    for (const change of changes) {
      await this.changeRole(change, owner);
    }

    console.log(`✅ Multiple roles changed successfully for file: ${fileId}`);
    return { message: 'Roles changed successfully' };
  }

  // =============================================
  // ANNOTATION MANAGEMENT
  // =============================================

  async getAnnotations(fileId: string, user: User, token?: string) {
    console.log(`📝 Getting annotations for file: ${fileId} by user: ${user.email}${token ? ' via shareable link' : ''}`);
    
    // Try to get from cache first
    const cachedAnnotations = await this.cacheService.getFileAnnotations(fileId);
    if (cachedAnnotations) {
      console.log(`💰 Cache HIT: Returning cached annotations for file: ${fileId}`);
      return cachedAnnotations;
    }
    
    console.log(`🔍 Cache MISS: Fetching annotations from database for file: ${fileId}`);
    const file = await this.fileModel.findById(fileId).exec();
    if (!file) {
      throw new NotFoundException('File not found');
    }

    let role = this.getUserRole(file, user);
    
    // If user doesn't have direct access, check for shareable link access
    if (role === 'none' && token) {
      const shareableLink = await this.shareableLinkModel.findOne({
        token: token,
        file: fileId,
        enabled: true
      }).exec();
      
      if (shareableLink && file.shareableLinkEnabled) {
        role = shareableLink.role;
        console.log(`🔗 Access granted via shareable link: ${role} for file: ${fileId}`);
      }
    }

    if (role === 'none') {
      throw new ForbiddenException('You do not have permission to access this file');
    }

    // Only owners and editors can access annotations
    if (role !== 'owner' && role !== 'editor') {
      throw new ForbiddenException('You do not have permission to access annotations');
    }
    
    const result = {
      _id: file._id,
      file: fileId,
      xfdf: file.xfdf,
      version: file.version,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt
    };
    
    // Cache the annotations
    await this.cacheService.setFileAnnotations(fileId, result);
    console.log(`💾 Cached annotations for file: ${fileId}`);
    
    return result;
  }

  async saveAnnotation(fileId: string, annotationDto: CreateAnnotationDto, user: User, token?: string) {
    console.log(`💾 Saving annotations for file: ${fileId} by user: ${user.email}${token ? ' via shareable link' : ''}`);
    
    const file = await this.fileModel.findById(fileId).exec();
    if (!file) {
      throw new NotFoundException('File not found');
    }

    let role = this.getUserRole(file, user);
    
    // If user doesn't have direct access, check for shareable link access
    if (role === 'none' && token) {
      const shareableLink = await this.shareableLinkModel.findOne({
        token: token,
        file: fileId,
        enabled: true
      }).exec();
      
      if (shareableLink && file.shareableLinkEnabled) {
        role = shareableLink.role;
        console.log(`🔗 Access granted via shareable link: ${role} for file: ${fileId}`);
      }
    }

    if (role === 'none') {
      throw new ForbiddenException('You do not have permission to access this file');
    }

    // Only owners and editors can save annotations
    if (role !== 'owner' && role !== 'editor') {
      throw new ForbiddenException('You do not have permission to save annotations');
    }

    // Update the file's xfdf and increment version
    const updatedFile = await this.fileModel.findByIdAndUpdate(
      fileId,
      { 
        xfdf: annotationDto.xfdf,
        $inc: { version: 1 }
      },
      { new: true }
    ).exec();

    if (!updatedFile) {
      throw new NotFoundException('File not found');
    }
    
    // Invalidate annotation cache since it changed
    await this.cacheService.deleteFileAnnotations(fileId);
    
    // Invalidate file info cache since it was updated
    await this.cacheService.deleteFileInfo(fileId);
    
    console.log(`✅ Annotations saved successfully for file: ${fileId}, new version: ${updatedFile.version}`);

    return {
      _id: updatedFile._id,
      file: fileId,
      xfdf: updatedFile.xfdf,
      version: updatedFile.version,
      createdAt: updatedFile.createdAt,
      updatedAt: updatedFile.updatedAt
    };
  }

  // =============================================
  // SHAREABLE LINK MANAGEMENT
  // =============================================

  async createShareableLink(createShareableLinkDto: CreateShareableLinkDto, user: User) {
    const { fileId, role } = createShareableLinkDto;
    console.log(`🔗 Creating shareable link for file: ${fileId}, role: ${role} by user: ${user.email}`);
    
    // Validate that user is the owner
    const file = await this.validateOwnerAccess(fileId, user);
    
    // Check if shareable links are enabled for this file
    if (!file.shareableLinkEnabled) {
      throw new ForbiddenException('Shareable links are disabled for this file');
    }
    
    // Check if a link with this role already exists
    const existingLink = await this.shareableLinkModel.findOne({
      file: fileId,
      role: role,
      enabled: true
    }).exec();
    
    if (existingLink) {
      console.log(`🔗 Returning existing shareable link for file: ${fileId}, role: ${role}`);
      return {
        id: existingLink._id,
        token: existingLink.token,
        role: existingLink.role,
        enabled: existingLink.enabled,
        url: `${this.configService.get<string>('APP_URL') || 'http://localhost:3000'}/share?token=${existingLink.token}`,
        createdAt: existingLink.createdAt
      };
    }
    
    // Create new shareable link
    const token = uuidv4();
    const shareableLink = new this.shareableLinkModel({
      file: fileId,
      role: role,
      token: token,
      enabled: true
    });
    
    await shareableLink.save();
    
    console.log(`✅ Shareable link created successfully for file: ${fileId}, role: ${role}`);
    
    return {
      id: shareableLink._id,
      token: shareableLink.token,
      role: shareableLink.role,
      enabled: shareableLink.enabled,
      url: `${this.configService.get<string>('APP_URL') || 'http://localhost:3000'}/share?token=${shareableLink.token}`,
      createdAt: shareableLink.createdAt
    };
  }

  async getShareableLinks(fileId: string, user: User) {
    console.log(`🔗 Getting shareable links for file: ${fileId} by user: ${user.email}`);
    
    // Validate that user is the owner
    await this.validateOwnerAccess(fileId, user);
    
    const links = await this.shareableLinkModel.find({
      file: fileId,
      enabled: true
    }).exec();
    
    const frontendUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    
    return links.map(link => ({
      id: link._id,
      token: link.token,
      role: link.role,
      enabled: link.enabled,
      url: `${frontendUrl}/share?token=${link.token}`,
      createdAt: link.createdAt
    }));
  }

  async deleteShareableLink(linkId: string, user: User) {
    console.log(`🗑️ Deleting shareable link: ${linkId} by user: ${user.email}`);
    
    const link = await this.shareableLinkModel.findById(linkId).populate('file').exec();
    if (!link) {
      throw new NotFoundException('Shareable link not found');
    }
    
    // Validate that user is the owner of the file
    const file = link.file as any;
    if (file.ownerEmail !== user.email) {
      throw new ForbiddenException('Only the file owner can delete shareable links');
    }
    
    await this.shareableLinkModel.findByIdAndDelete(linkId).exec();
    
    console.log(`✅ Shareable link deleted successfully: ${linkId}`);
    return { message: 'Shareable link deleted successfully' };
  }

  async toggleShareableLinkFeature(toggleDto: ToggleShareableLinkDto, user: User) {
    const { fileId, enabled } = toggleDto;
    console.log(`🔄 Toggling shareable link feature for file: ${fileId}, enabled: ${enabled} by user: ${user.email}`);
    
    // Validate that user is the owner
    const file = await this.validateOwnerAccess(fileId, user);
    
    // Update the file's shareable link setting
    await this.fileModel.findByIdAndUpdate(
      fileId,
      { shareableLinkEnabled: enabled }
    ).exec();
    
    // If disabling, also disable all existing links
    if (!enabled) {
      await this.shareableLinkModel.updateMany(
        { file: fileId },
        { enabled: false }
      ).exec();
    }
    
    // Invalidate file info cache since it was updated
    await this.cacheService.deleteFileInfo(fileId);
    
    console.log(`✅ Shareable link feature ${enabled ? 'enabled' : 'disabled'} for file: ${fileId}`);
    return { 
      message: `Shareable link feature ${enabled ? 'enabled' : 'disabled'} successfully`,
      shareableLinkEnabled: enabled
    };
  }

  async accessViaLink(token: string, user: User) {
    console.log(`🔗 Accessing file via shareable link token by user: ${user.email}`);
    
    const shareableLink = await this.shareableLinkModel.findOne({
      token: token,
      enabled: true
    }).populate('file').exec();
    
    if (!shareableLink) {
      throw new NotFoundException('Invalid or expired shareable link');
    }
    
    const file = shareableLink.file as any;
    
    // Check if the file's shareable link feature is enabled
    if (!file.shareableLinkEnabled) {
      throw new ForbiddenException('Shareable links are disabled for this file');
    }
    
    // Check if user already has access to this file
    const existingRole = this.getUserRole(file, user);
    if (existingRole !== 'none') {
      console.log(`👤 User already has access to file: ${file._id}, existing role: ${existingRole}`);
      return {
        fileId: file._id,
        fileName: file.name,
        accessGranted: true,
        role: existingRole,
        message: `You already have ${existingRole} access to this file`
      };
    }
    
    // Grant temporary access without permanently adding to viewers/editors
    console.log(`✅ Temporary access granted via shareable link: ${shareableLink.role} access to file: ${file._id}`);
    
    return {
      fileId: file._id,
      fileName: file.name,
      accessGranted: true,
      role: shareableLink.role,
      temporary: true,
      message: `Temporary ${shareableLink.role} access granted via shareable link`
    };
  }

  // =============================================
  // UTILITY & HELPER METHODS
  // =============================================

  private getUserRole(file: File, user: User): string {
    if (file.ownerEmail === user.email) {
      return 'owner';
    }
    if (file.viewers.includes(user.email)) {
      return 'viewer';
    }
    if (file.editors.includes(user.email)) {
      return 'editor';
    }
    return 'none';
  }

  async getFileUserRole(fileId: string, user: User) {
    console.log(`👤 Getting user role for file: ${fileId} by user: ${user.email}`);
    
    // Try to get from cache first
    const cachedRole = await this.cacheService.getUserFileRole(fileId, (user._id as Types.ObjectId).toString());
    if (cachedRole) {
      console.log(`💰 Cache HIT: Returning cached user role for file: ${fileId}, user: ${user.email}`);
      return cachedRole;
    }
    
    console.log(`🔍 Cache MISS: Fetching user role from database for file: ${fileId}, user: ${user.email}`);
    const file = await this.fileModel.findById(fileId).exec();
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const role = this.getUserRole(file, user);
    if (role === 'none') {
      throw new ForbiddenException('You do not have access to this file');
    }
    
    const result = { role };
    
    // Cache the user role
    await this.cacheService.setUserFileRole(fileId, (user._id as Types.ObjectId).toString(), role);
    console.log(`💾 Cached user role for file: ${fileId}, user: ${user.email}, role: ${role}`);

    return result;
  }

  private async validateFileAccess(fileId: string, user: User, allowedRoles: string[] = ['owner', 'editor', 'viewer']): Promise<File> {
    const file = await this.fileModel.findById(fileId).exec();
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const role = this.getUserRole(file, user);
    if (!allowedRoles.includes(role)) {
      throw new ForbiddenException('You do not have permission to access this file');
    }

    return file;
  }

  private async validateOwnerAccess(fileId: string, user: User): Promise<File> {
    return this.validateFileAccess(fileId, user, ['owner']);
  }

  private async validateEditAccess(fileId: string, user: User): Promise<File> {
    return this.validateFileAccess(fileId, user, ['owner', 'editor']);
  }
}