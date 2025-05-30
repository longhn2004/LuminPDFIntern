import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { File } from './schemas/file.schema';
import { Annotation } from './schemas/annotation.schema';
import { Invitation } from './schemas/invitation.schema';
import { User } from '../auth/schemas/user.schema';
import { InviteUserDto } from './dto/invite-user.dto';
import { ListFilesDto } from './dto/list-files.dto';
import { CreateAnnotationDto } from './dto/create-annotation.dto';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { google } from 'googleapis';
import { createWriteStream, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';
import { ChangeRoleDto } from './dto/change-role.dto';

@Injectable()
export class FileService {
  constructor(
    @InjectModel(File.name) private fileModel: Model<File>,
    @InjectModel(Annotation.name) private annotationModel: Model<Annotation>,
    @InjectModel(Invitation.name) private invitationModel: Model<Invitation>,
    @InjectModel(User.name) private userModel: Model<User>,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

    async uploadFile(file: Express.Multer.File, user: User) {    
      if (!file) {      
        throw new BadRequestException('No file uploaded');    
      }    
      const newFile = new this.fileModel({      
        name: file.originalname,      
        path: file.path,      
        owner: user._id,      
        ownerEmail: user.email,      
        viewers: [],      
        editors: [],    
      });    
      await newFile.save();    
      return newFile;  
    }

  async uploadFromDrive(fileId: string, user: User) {
    const auth = new google.auth.GoogleAuth({
      keyFile: join(__dirname, '..', '..', 'config', 'service-account-key.json'),
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    try {
      // Lấy metadata để kiểm tra định dạng và kích thước
      const fileMetadata = await drive.files.get({ fileId, fields: 'name,mimeType,size' });
      if (fileMetadata.data.mimeType !== 'application/pdf') {
        throw new BadRequestException('Only PDF files are allowed');
      }
      const fileSize = parseInt(fileMetadata.data.size || '0');
      if (fileSize > 20 * 1024 * 1024) {
        throw new BadRequestException('File size exceeds 20MB limit');
      }

      // Tải file
      const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
      const filePath = join(this.configService.get<string>('FILE_UPLOAD_PATH') || './uploads', `${uuidv4()}.pdf`);
      const writeStream = createWriteStream(filePath);
      res.data.pipe(writeStream);

      return new Promise((resolve, reject) => {
        writeStream.on('finish', async () => {
                    const newFile = new this.fileModel({            
                      name: fileMetadata.data.name || `drive-file-${fileId}.pdf`,            
                      path: filePath,            
                      owner: user._id,            
                      ownerEmail: user.email,            
                      viewers: [],            
                      editors: [],          
                    });
          await newFile.save();
          resolve(newFile);
        });
        writeStream.on('error', (err) => reject(new BadRequestException('Failed to save file')));
      });
    } catch (error) {
      throw new BadRequestException(`Failed to upload from Google Drive: ${error.message}`);
    }
  }

  async totalFiles(user: User) {
    return this.fileModel.countDocuments({ $or: [{ ownerEmail: user.email }, { viewers: user.email }, { editors: user.email }] });
  }

  async listFiles(query: ListFilesDto, user: User) {
    const { page = 0, sort = 'DESC' } = query;
    const limit = 10;
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

    return files.map((file) => ({
      id: file._id,
      name: file.name,
      owner: file.owner.name,
      role: this.getUserRole(file, user),
      updatedAt: file.updatedAt,
    }));
  }

  async downloadFile(id: string, user: User, res: Response) {
    const file = await this.fileModel.findById(id).exec();
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const role = this.getUserRole(file, user);
    if (role === 'none') {
      throw new ForbiddenException('You do not have permission to access this file');
    }

    if (role === 'owner' || role === 'editor') {
      const annotations = await this.annotationModel.find({ file: id }).exec();
      // Gửi file kèm annotations (giả sử frontend xử lý XML với Apryse WebViewer)
      res.setHeader('X-Annotations', JSON.stringify(annotations.map(a => a.xml)));
    }

    res.download(file.path);
  }

  async getFileInfo(id: string) {    
    const file = await this.fileModel.findById(id).exec();    
    if (!file) {      
      throw new NotFoundException('File not found');    
    }        
    // Get owner information    
    const ownerUser = await this.userModel.findOne({ email: file.ownerEmail }).exec();    
    const ownerName = ownerUser ? ownerUser.name : '[Unregistered User]';        // Format response with detailed information    
    return {      
      id: file._id,      
      name: file.name,      
      createdAt: file.createdAt,      
      updatedAt: file.updatedAt,     
       owner: {        
        email: file.ownerEmail,        
        name: ownerName      
      },      
      viewers: file.viewers || [],      
      editors: file.editors || []    
    };  
  }

  async deleteFile(id: string, user: User) {
    const file = await this.fileModel.findById(id).exec();
    if (!file) {
      throw new NotFoundException('File not found');
    }

        if (file.ownerEmail !== user.email) {      
          throw new ForbiddenException('Only the owner can delete the file');    
        }

    await this.fileModel.findByIdAndDelete(id).exec();

    //Delete from storage
    const filePath = join(this.configService.get<string>('FILE_UPLOAD_PATH') || './uploads', file.path.slice(8));
    console.log('filePath ', filePath);
    if (existsSync(filePath)) {
      console.log('Deleting file from storage:', filePath);
      unlinkSync(filePath);

      //Delete annotations
      await this.annotationModel.deleteMany({ file: id }).exec();

      //Delete invitations
      await this.invitationModel.deleteMany({ file: id }).exec();
      
    }

    return { message: 'File deleted successfully' };
  }

  async getFileUsers(fileId: string, user: User) {
    const file = await this.fileModel.findById(fileId).exec();
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const role = this.getUserRole(file, user);
    if (role !== 'owner') {
      throw new ForbiddenException('Only the owner can view file users');
    }

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

    return users;
  }

  async inviteUser(inviteDto: InviteUserDto, owner: User) {
    const { fileId, emails, role } = inviteDto;
    const file = await this.fileModel.findById(fileId).exec();
    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.ownerEmail !== owner.email) {
      throw new ForbiddenException('Only the owner can invite users');
    }
    
    // Process emails sequentially instead of in parallel
    for (const email of emails) {
      // Check if the user is registered
      if (role === 'viewer' && !file.viewers.includes(email)) {
        file.viewers.push(email);
      } else if (role === 'editor' && !file.editors.includes(email)) {
        file.editors.push(email);
      }
      const existingUser = await this.userModel.findOne({ email }).exec();
      
      if (existingUser) {
        // Notify registered user about access
        await this.emailService.sendAccessNotification(email, file.name, role);
      } else {
        const invitationToken = uuidv4();
        const invitation = new this.invitationModel({
          email,
          file: fileId,
          role,
          token: invitationToken,
        });
        await invitation.save();
        
        // Send invitation to register
        await this.emailService.sendInvitationEmail(email, invitationToken, file.name);
      }
    }
    
    // Save the file once after all emails are processed
    await file.save();
    
    return { message: 'Invitations sent successfully' };
  }

  async changeRole(changeRoleDto: ChangeRoleDto, owner: User) {    
    const { fileId, email, role } = changeRoleDto;    
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

    // Find user to send email if they exist
    const targetUser = await this.userModel.findOne({ email }).exec();
    if (targetUser) {
      // Send email notification
      if (role === 'none') {
        await this.emailService.sendRoleRemovedNotification(email, file.name);
      } else {
        await this.emailService.sendRoleChangedNotification(email, file.name, role || 'none');
      }
    }

    return { message: role === 'none' ? 'Role removed successfully' : 'Role changed successfully' };
  }

  async getAnnotations(fileId: string) {
    return this.annotationModel.find({ file: fileId }).exec();
  }

  async createAnnotation(fileId: string, annotationDto: CreateAnnotationDto, user: User) {
    const file = await this.fileModel.findById(fileId).exec();
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const role = this.getUserRole(file, user);
    if (role !== 'owner' && role !== 'editor') {
      throw new ForbiddenException('You do not have permission to add annotations');
    }

    const newAnnotation = new this.annotationModel({
      file: fileId,
      creator: user._id,
      xml: annotationDto.xml,
    });

    await newAnnotation.save();
    return newAnnotation;
  }

  async updateAnnotation(fileId: string, annotationId: string, annotationDto: CreateAnnotationDto, user: User) {
    const file = await this.fileModel.findById(fileId).exec();
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const role = this.getUserRole(file, user);
    if (role !== 'owner' && role !== 'editor') {
      throw new ForbiddenException('You do not have permission to update annotations');
    }

    const annotation = await this.annotationModel.findById(annotationId).exec();
    if (!annotation) {
      throw new NotFoundException('Annotation not found');
    }

    if (annotation.creator.toString() !== (user._id as Types.ObjectId).toString()) {
      throw new ForbiddenException('You can only update your own annotations');
    }

    annotation.xml = annotationDto.xml;
    await annotation.save();
    return annotation;
  }

  async deleteAnnotation(fileId: string, annotationId: string, user: User) {
    const file = await this.fileModel.findById(fileId).exec();
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const role = this.getUserRole(file, user);
    if (role !== 'owner' && role !== 'editor') {
      throw new ForbiddenException('You do not have permission to delete annotations');
    }

    const annotation = await this.annotationModel.findById(annotationId).exec();
    if (!annotation) {
      throw new NotFoundException('Annotation not found');
    }

    if (annotation.creator.toString() !== (user._id as Types.ObjectId).toString()) {
      throw new ForbiddenException('You can only delete your own annotations');
    }

    await annotation.deleteOne();
    return { message: 'Annotation deleted successfully' };
  }

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
}