import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

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

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = uuidv4();
    const user = new this.userModel({
      email,
      password: hashedPassword,
      verificationToken,
      isEmailVerified: false,
      name,
    });
    const savedUser = await user.save();

    await this.emailService.sendVerificationEmail(email, verificationToken);
    return { email, name, isEmailVerified: false };
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.userModel.findOne({ verificationToken: token }).exec();
    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    user.isEmailVerified = true;
    user.verificationToken = "";
    await user.save();
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
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
    let user = await this.userModel.findOne({ googleId }).exec();
    if (user) {
      return user;
    }

    user = await this.userModel.findOne({ email }).exec();
    if (user) {
      if (user.googleId) {
        return user;
      }
      user.googleId = googleId;
      user.isEmailVerified = true;
      user.name = user.name || name; // Update name if not already set
      await user.save();
      return user;
    }

    user = new this.userModel({
      email,
      googleId,
      isEmailVerified: true,
      name, // Save name from Google profile
    });
    await user.save();
    return user;
  }

  async googleLogin(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    return this.generateTokens(user);
  }

  async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { email: user.email, sub: user._id };
    
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const jwtRefreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    // console.log('JWT_SECRET in generateTokens:', jwtSecret);
    // console.log('JWT_REFRESH_SECRET in generateTokens:', jwtRefreshSecret);

    // if (!jwtSecret || !jwtRefreshSecret) {
    //   throw new Error('JWT_SECRET or JWT_REFRESH_SECRET is not defined in generateTokens');
    // }

    try {
      const accessToken = this.jwtService.sign(payload, { secret: jwtSecret });
      const refreshToken = this.jwtService.sign(payload, {
        secret: jwtRefreshSecret,
        expiresIn: '7d',
      });

      user.refreshToken = await bcrypt.hash(refreshToken, 10);
      await user.save();

      return { accessToken, refreshToken };
    } catch (error) {
      console.error('Error in generateTokens:', error);
      throw error;
    }
  }

  async refreshToken(userId: string, dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    const { refreshToken } = dto;
    const user = await this.userModel.findById(userId).exec();
    if (!user || !user.refreshToken || !(await bcrypt.compare(refreshToken, user.refreshToken))) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.generateTokens(user);
  }

  async validateUser(payload: any): Promise<User | null> {
    return this.userModel.findById(payload.sub).exec();
  }

  async invalidateRefreshToken(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (user) {
      user.refreshToken = "";
      await user.save();
    }
  }

  async getCurrentUser(user: User): Promise<{ email: string; isEmailVerified: boolean }> {
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return {
      email: user.email,
      isEmailVerified: user.isEmailVerified,
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
    user.verificationToken = verificationToken;
    await user.save();

    await this.emailService.sendVerificationEmail(email, verificationToken);
  }
}