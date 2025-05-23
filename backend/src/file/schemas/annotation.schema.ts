import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { File } from './file.schema';
import { User } from '../../auth/schemas/user.schema';

@Schema({ timestamps: true })
export class Annotation extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'File' })
  file: File;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  creator: User;

  @Prop({ required: true })
  xml: string;
}

export const AnnotationSchema = SchemaFactory.createForClass(Annotation);