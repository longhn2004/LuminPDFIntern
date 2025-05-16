import { Injectable, NotFoundException, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File } from '../database/entities/file.entity';
import { User } from '../database/entities/user.entity';
import { FileAccess } from '../database/entities/file-access.entity';
import { FileRole } from '../database/entities/file-role.enum';

interface FileUploadData {
  filename: string; // original filename from upload
  storedFilename: string; // name used for storage (e.g., with unique suffix)
  path: string;
  mimetype: string;
  size: number;
}

export interface FileDownloadDetails {
  filePath: string;
  originalFilename: string;
  role: FileRole; // To be used later for annotation handling
}

export interface EnrichedFileDetails {
  id: string;
  fileName: string; // This is the original filename
  ownerName: string;
  userRole: FileRole;
  lastUpdatedAt: Date;
  size: number;
  mimetype: string;
  createdAt: Date;
  // Add other relevant fields from File entity if needed
}

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(FileAccess)
    private readonly fileAccessRepository: Repository<FileAccess>,
  ) {}

  async createFileRecord(fileData: FileUploadData, ownerId: string): Promise<File> {
    // Step 1: Find the owner. For a real app, ensure user exists.
    // For this example, we'll assume ownerId is valid and fetch the user.
    // If you don't have user creation yet, you might need to create a placeholder user
    // or ensure the user exists before calling this.
    const owner = await this.userRepository.findOneBy({ id: ownerId });
    if (!owner) {
      // In a real app, you might create a user on-the-fly or handle this differently.
      // For now, we'll throw an error if the user isn't found.
      // This highlights the need for user management (part of Auth module usually).
      console.error(`User with ID "${ownerId}" not found. Cannot assign file ownership.`);
      throw new NotFoundException(`User with ID "${ownerId}" not found. Cannot assign file ownership.`);
    }

    const queryRunner = this.fileRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Step 2: Create and save the File entity
      const newFile = this.fileRepository.create({
        ...fileData,
        owner: owner,
        ownerId: owner.id, // Explicitly set ownerId
      });
      const savedFile = await queryRunner.manager.save(newFile);

      // Step 3: Create and save the FileAccess entity for the owner
      const ownerAccess = this.fileAccessRepository.create({
        file: savedFile,
        user: owner,
        role: FileRole.OWNER,
      });
      await queryRunner.manager.save(ownerAccess);

      await queryRunner.commitTransaction();
      // Eager load owner for the returned entity, or ensure it's loaded if needed by controller
      return this.fileRepository.findOne({ where: {id: savedFile.id }, relations: ['owner']});
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error saving file metadata:', error);
      throw new InternalServerErrorException('Failed to save file information.');
    } finally {
      await queryRunner.release();
    }
  }

  async getFileAccessInfo(fileId: string, userId: string): Promise<FileAccess | null> {
    return this.fileAccessRepository.findOne({
      where: { fileId, userId },
      relations: ['file', 'file.owner', 'user'], // Eager load related entities
    });
  }

  async getFileForDownload(fileId: string, userId: string): Promise<FileDownloadDetails> {
    const fileAccess = await this.getFileAccessInfo(fileId, userId);

    if (!fileAccess || !fileAccess.file) {
      // Check if file exists at all, even if user has no access, to give a 404 vs 403
      const fileExists = await this.fileRepository.findOneBy({ id: fileId });
      if (!fileExists) {
        throw new NotFoundException('File not found.');
      }
      throw new ForbiddenException('You do not have access to this file.');
    }

    // User has some role (owner, editor, or viewer), so they can download.
    // Later, we'll use fileAccess.role to determine if annotations are included.
    return {
      filePath: fileAccess.file.path,
      originalFilename: fileAccess.file.filename, // This is the original uploaded filename
      role: fileAccess.role,
    };
  }

  async getFileDetails(fileId: string, userId: string): Promise<EnrichedFileDetails> {
    const fileAccess = await this.getFileAccessInfo(fileId, userId);

    if (!fileAccess || !fileAccess.file) {
      const fileExists = await this.fileRepository.findOneBy({ id: fileId });
      if (!fileExists) {
        throw new NotFoundException('File not found.');
      }
      throw new ForbiddenException('You do not have access to view details for this file.');
    }

    const fileEntity = fileAccess.file;
    if (!fileEntity.owner) {
        // This case should be rare if getFileAccessInfo populates file.owner
        this.fileRepository.manager.connection.logger.log('warn', `Owner not loaded via FileAccess for file ${fileId}. Re-fetching file details.`);
        const reFetchedFile = await this.fileRepository.findOne({ where: { id: fileId }, relations: ['owner'] });
        if (!reFetchedFile || !reFetchedFile.owner) {
            throw new InternalServerErrorException('Could not retrieve complete file owner details.');
        }
        fileEntity.owner = reFetchedFile.owner; // Augment the owner info
    }

    return {
      id: fileEntity.id,
      fileName: fileEntity.filename, // This is the original filename as per File entity design
      ownerName: fileEntity.owner.name, // Assumes User entity has a 'name' property
      userRole: fileAccess.role,
      lastUpdatedAt: fileEntity.updatedAt,
      size: fileEntity.size,
      mimetype: fileEntity.mimetype,
      createdAt: fileEntity.createdAt,
    };
  }

  // ... other methods for listing, downloading, permissions will be added here
} 