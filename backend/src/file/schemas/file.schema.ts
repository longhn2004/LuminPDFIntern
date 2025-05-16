import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';

@Schema({ timestamps: true })
export class File extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  path: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  owner: User;

  @Prop([{ type: Types.ObjectId, ref: 'User' }])
  viewers: User[];

  @Prop([{ type: Types.ObjectId, ref: 'User' }])
  editors: User[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const FileSchema = SchemaFactory.createForClass(File);