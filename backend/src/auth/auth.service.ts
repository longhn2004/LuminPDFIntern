import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from 'src/email/email.service';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AuthService {
  private static readonly SALT_ROUNDS = 10;
  private static readonly TOKEN_EXPIRY = '30m';
  private static readonly VERIFICATION_TOKEN_EXPIRY_HOURS = 24; // 24 hours for email verification

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  // =============================================
  // USER REGISTRATION & EMAIL VERIFICATION
  // =============================================

  async register(dto: RegisterDto): Promise<any> {
    const { email, password, name } = dto;
    
    const existingUser = await this.userModel.findOne({ email }).exec();
    if (existingUser) {
      if (existingUser.password) {
        throw new ConflictException('Email already registered with email/password');
      } else if (existingUser.googleId) {
        throw new ConflictException('Email already registered with Google account');
      }
    }

    const hashedPassword = await bcrypt.hash(password, AuthService.SALT_ROUNDS);
    const verificationToken = uuidv4();
    const verificationTokenExpires = new Date();
    verificationTokenExpires.setHours(verificationTokenExpires.getHours() + AuthService.VERIFICATION_TOKEN_EXPIRY_HOURS);
    
    const user = new this.userModel({
      email,
      password: hashedPassword,
      verificationToken,
      verificationTokenExpires,
      isEmailVerified: false,
      name,
    });
    
    const savedUser = await user.save();
    await this.emailService.sendVerificationEmail(email, verificationToken);
    
    return { 
      email: savedUser.email, 
      name: savedUser.name, 
      isEmailVerified: savedUser.isEmailVerified 
    };
  }

  async verifyEmail(token: string): Promise<{ accessToken: string }> {
    const user = await this.userModel.findOne({ verificationToken: token }).exec();
    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Check if the verification token has expired
    if (user.verificationTokenExpires && new Date() > user.verificationTokenExpires) {
      throw new BadRequestException('Verification token has expired. Please request a new verification email.');
    }

    user.isEmailVerified = true;
    user.verificationToken = "";
    user.verificationTokenExpires = undefined;
    await user.save();

    return this.generateTokens(user);
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const { email, password } = dto;
    const user = await this.userModel.findOne({ email }).exec();
    
    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Email not verified');
    }

    return this.generateTokens(user);
  }

  async findOrCreateGoogleUser(googleId: string, email: string, name: string): Promise<User> {
    // First, try to find user by Google ID
    let user = await this.userModel.findOne({ googleId }).exec();
    if (user) {
      return user;
    }

    // Then, try to find user by email
    user = await this.userModel.findOne({ email }).exec();
    if (user) {
      if (user.googleId) {
        // Update existing Google user
        user.googleId = googleId;
        user.isEmailVerified = true;
        user.name = user.name || name; 
        await user.save();
        return user;
      }
      // User exists with email/password - return existing user
      return user;
    }

    // Create new Google user
    user = new this.userModel({
      email,
      googleId,
      isEmailVerified: true,
      name, 
    });
    await user.save();
    return user;
  }

  async googleLogin(user: User): Promise<{ accessToken: string}> {
    const existingUser = await this.userModel.findOne({ email: user.email }).exec();
    if (existingUser && existingUser.password) {
      throw new ConflictException(
        'An account with this email already exists. Please sign in with email and password.',
        'EMAIL_PASSWORD_EXISTS'
      );
    }
    return this.generateTokens(user);
  }

  async generateTokens(user: User): Promise<{ accessToken: string}> {
    const payload = { email: user.email, sub: user._id };
    const jwtSecret = this.configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    try {
      const accessToken = this.jwtService.sign(payload, { secret: jwtSecret });
      await user.save();
      return { accessToken };
    } catch (error) {
      console.error('Error in generateTokens:', error);
      throw new Error('Failed to generate authentication tokens');
    }
  }

  // =============================================
  // USER VALIDATION & INFORMATION
  // =============================================

  async validateUser(payload: any): Promise<User | null> {
    return this.userModel.findById(payload.sub).exec();
  }

  async getCurrentUser(user: User): Promise<{ email: string; isEmailVerified: boolean; name: string }> {
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return {
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      name: user.name,
    };
  }

  async getUserByEmail(email: string): Promise<{ email: string; isEmailVerified: boolean; name: string }> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return {
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      name: user.name,
    };
  }

  async resendVerificationEmail(dto: ResendVerificationDto): Promise<void> {
    const { email } = dto;
    const user = await this.userModel.findOne({ email }).exec();
    
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }
    if (!user.password) {
      throw new BadRequestException('This account is registered with Google');
    }

    const verificationToken = uuidv4();
    const verificationTokenExpires = new Date();
    verificationTokenExpires.setHours(verificationTokenExpires.getHours() + AuthService.VERIFICATION_TOKEN_EXPIRY_HOURS);
    
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = verificationTokenExpires;
    await user.save();

    await this.emailService.sendVerificationEmail(email, verificationToken);
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  /**
   * Clean up expired verification tokens from the database
   * This method can be called periodically to remove expired tokens
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredVerificationTokens(): Promise<void> {
    const now = new Date();
    await this.userModel.updateMany(
      { 
        verificationTokenExpires: { $lt: now },
        isEmailVerified: false 
      },
      { 
        $unset: { 
          verificationToken: "",
          verificationTokenExpires: ""
        }
      }
    ).exec();
  }
}