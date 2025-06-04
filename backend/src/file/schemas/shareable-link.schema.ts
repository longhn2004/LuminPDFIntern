import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { File } from './file.schema';

@Schema({ timestamps: true })
export class ShareableLink extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'File', index: true })
  file: File;

  @Prop({ required: true, enum: ['viewer', 'editor'] })
  role: string;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true, default: true })
  enabled: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;

  @Prop()
  expiresAt?: Date;
}

export const ShareableLinkSchema = SchemaFactory.createForClass(ShareableLink); 