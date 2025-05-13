import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  password: string; // Only for email/password users

  @Prop({ required: false })
  googleId?: string; // For Google OAuth users

  @Prop()
  refreshToken: string; // Store hashed refresh token

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop()
  verificationToken: string; // For email verification

  @Prop()
  name: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);