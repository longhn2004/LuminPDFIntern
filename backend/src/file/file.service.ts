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
    return this.fileModel.countDocuments({ $or: [{ owner: user._id }, { viewers: user._id }, { editors: user._id }] });
  }

  async listFiles(query: ListFilesDto, user: User) {
    const { page = 0, sort = 'DESC' } = query;
    const limit = 10;
    const skip = page * limit;
    const sortOrder = sort === 'ASC' ? 1 : -1;

    const files = await this.fileModel
      .find({
        $or: [{ owner: user._id }, { viewers: user._id }, { editors: user._id }],
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

  async deleteFile(id: string, user: User) {
    const file = await this.fileModel.findById(id).exec();
    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.owner.toString() !== (user._id as Types.ObjectId).toString()) {
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

  async inviteUser(inviteDto: InviteUserDto, owner: User) {
    const { fileId, email, role } = inviteDto;
    const file = await this.fileModel.findById(fileId).exec();
    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.owner.toString() !== (owner._id as Types.ObjectId).toString()) {
      throw new ForbiddenException('Only the owner can invite users');
    }

    const invitedUser = await this.userModel.findOne({ email }).exec();
    if (invitedUser) {
      const invitedUserId = invitedUser._id as Types.ObjectId;

      if (
        role === 'viewer' &&
        !file.viewers.some((viewer: any) => (viewer._id as Types.ObjectId).equals(invitedUserId))
      ) {
        file.viewers.push(invitedUser);
      } else if (
        role === 'editor' &&
        !file.editors.some((editor: any) => (editor._id as Types.ObjectId).equals(invitedUserId))
      ) {
        file.editors.push(invitedUser);
      }
      await file.save();
      await this.emailService.sendAccessNotification(email, file.name, role);
      return { message: 'User added successfully' };
    } else {
      const invitationToken = uuidv4();
      const invitation = new this.invitationModel({
        email,
        file: fileId,
        role,
        token: invitationToken,
      });
      await invitation.save();

      await this.emailService.sendInvitationEmail(email, invitationToken, file.name);
      return { message: 'Invitation sent to unregistered user' };
    }
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
    const fileOwner = (file.owner._id as User).toString();
    const userOwner = (user._id as User).toString();
    if (fileOwner === userOwner) {
        return 'owner';
    }
    if (file.viewers.some(id => id.toString() === userOwner)) {
        return 'viewer';
    }
    if (file.editors.some(id => id.toString() === userOwner)) {
        return 'editor';
    }
    return 'none';
  }
}