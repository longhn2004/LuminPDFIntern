import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { File } from './file.schema';
import { User } from '../../auth/schemas/user.schema';

@Schema({ timestamps: true })
export class Annotation extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'File', index: true })
  file: File;

  @Prop({ required: true, default:  "<?xml version=\"1.0\" encoding=\"UTF-8\" ?><xfdf xmlns=\"http://ns.adobe.com/xfdf/\" xml:space=\"preserve\"><annots></annots></xfdf>" })
  xfdf: string;

  @Prop({ required: true, default: 0 })
  version: number;
}

export const AnnotationSchema = SchemaFactory.createForClass(Annotation);