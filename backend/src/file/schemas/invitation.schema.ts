import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { File } from './file.schema';

@Schema({ timestamps: true })
export class Invitation extends Document {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'File' })
  file: File;

  @Prop({ required: true, enum: ['viewer', 'editor'] })
  role: string;

  @Prop({ required: true })
  token: string;
}

export const InvitationSchema = SchemaFactory.createForClass(Invitation);