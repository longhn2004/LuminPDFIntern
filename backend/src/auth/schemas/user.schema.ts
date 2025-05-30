import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class User extends Document {
  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop({ required: false })
  password: string; 

  @Prop({ required: false })
  googleId: string; 

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop()
  verificationToken: string; 

  @Prop({ required: false, type: Date })
  verificationTokenExpires?: Date;

  @Prop()
  name: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);