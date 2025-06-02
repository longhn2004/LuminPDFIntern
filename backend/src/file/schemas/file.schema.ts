import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';

@Schema({ timestamps: true })
export class File extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  path: string;

  @Prop({ required: true, index: true })
  ownerEmail: string;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  owner: User;

  @Prop([{ type: String }])
  viewers: string[];

  @Prop([{ type: String }])
  editors: string[];

  @Prop({
    required: true,
    default:
      '<?xml version="1.0" encoding="UTF-8" ?><xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve"><annots></annots></xfdf>',
  })
  xfdf: string;

  @Prop({ required: true, default: 0 })
  version: number;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const FileSchema = SchemaFactory.createForClass(File);
