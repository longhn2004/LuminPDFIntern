import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID', 'default');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY', 'default');
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME', 'default');

    if (!region || !accessKeyId || !secretAccessKey || !this.bucketName) {
      throw new Error('AWS S3 configuration is incomplete. Please check your environment variables.');
    }

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log(`S3Service initialized with bucket: ${this.bucketName} in region: ${region}`);
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(file: Express.Multer.File, key?: string): Promise<string> {
    const fileKey = key || this.generateFileKey(file.originalname);
    
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);
      this.logger.log(`File uploaded successfully to S3: ${fileKey}`);
      return fileKey;
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${error.message}`, error.stack);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  /**
   * Upload a stream to S3 (for Google Drive uploads)
   */
  async uploadStream(stream: NodeJS.ReadableStream, fileName: string, contentType: string = 'application/pdf'): Promise<string> {
    const fileKey = this.generateFileKey(fileName);
    
    try {
      const chunks: Buffer[] = [];
      
      // Convert stream to buffer
      await new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(undefined));
        stream.on('error', reject);
      });
      
      const buffer = Buffer.concat(chunks);
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          originalName: fileName,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);
      this.logger.log(`Stream uploaded successfully to S3: ${fileKey}`);
      return fileKey;
    } catch (error) {
      this.logger.error(`Failed to upload stream to S3: ${error.message}`, error.stack);
      throw new Error(`Failed to upload stream to S3: ${error.message}`);
    }
  }

  /**
   * Generate a signed URL for downloading a file
   */
  async getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      this.logger.log(`Generated signed URL for file: ${key}`);
      return signedUrl;
    } catch (error) {
      this.logger.error(`Failed to generate signed URL for file: ${key}`, error.stack);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Get file object from S3
   */
  async getFileObject(key: string) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      return response;
    } catch (error) {
      this.logger.error(`Failed to get file object from S3: ${key}`, error.stack);
      throw new Error(`Failed to get file: ${error.message}`);
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully from S3: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${key}`, error.stack);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Check if a file exists in S3
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      this.logger.error(`Failed to check file existence in S3: ${key}`, error.stack);
      throw new Error(`Failed to check file existence: ${error.message}`);
    }
  }

  /**
   * Generate a unique file key for S3
   */
  private generateFileKey(originalName: string): string {
    const timestamp = Date.now();
    const randomId = uuidv4();
    const extension = originalName.split('.').pop();
    return `pdfs/${timestamp}-${randomId}.${extension}`;
  }

  /**
   * Get the public URL for a file (if bucket is public)
   */
  getPublicUrl(key: string): string {
    const bucketUrl = this.configService.get<string>('AWS_S3_BUCKET_URL');
    if (bucketUrl) {
      return `${bucketUrl}/${key}`;
    }
    
    const region = this.configService.get<string>('AWS_REGION');
    return `https://${this.bucketName}.s3.${region}.amazonaws.com/${key}`;
  }
} 