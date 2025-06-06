import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  Query,
  Response,
  Res,
  Req,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { Response as ExpressResponse } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('api/auth')
export class AuthController {
  private static readonly COOKIE_MAX_AGE = 30 * 60 * 1000; // 30 minutes

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('register')
  @HttpCode(201)
  async register(@Body(ValidationPipe) dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Get('verify-email')
  @HttpCode(200)
  async verifyEmail(
    @Query('token', ParseUUIDPipe) token: string,
    @Response({ passthrough: true }) res,
  ) {
    const { accessToken } = await this.authService.verifyEmail(token);

    this.setAuthCookie(res, accessToken);
    return { message: 'Email verified successfully' };
  }

  @Post('resend-verification')
  @HttpCode(200)
  async resendVerification(@Body(ValidationPipe) dto: ResendVerificationDto) {
    await this.authService.resendVerificationEmail(dto);
    return { message: 'Verification email sent' };
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body(ValidationPipe) loginDto: LoginDto,
    @Response({ passthrough: true }) res,
  ) {
    const { accessToken } = await this.authService.login(loginDto);

    this.setAuthCookie(res, accessToken);
    return { message: 'Login successful' };
  }

  @Get('google')
  @HttpCode(200)
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Request() req) {}

  @Get('google/callback')
  @HttpCode(200)
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(
    @Request() req,
    @Response({ passthrough: true }) res,
  ) {
    try {
      console.log('Google callback - User:', req.user?.email);
      const { accessToken } = await this.authService.googleLogin(req.user);

      console.log('Google callback - Returning token for:', req.user?.email);
      
      // Return the access token to frontend for cookie setting and redirect
      return { 
        accessToken, 
        message: 'Google login successful',
        user: {
          email: req.user?.email,
          name: req.user?.name
        }
      };
    } catch (error) {
      console.error('Google callback error:', error);
      // Throw the error to let frontend handle it
      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  @HttpCode(200)
  getProfile(@Request() req) {
    return req.user;
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(204)
  async logout(@Request() req, @Response({ passthrough: true }) res) {
    res.clearCookie('access_token');
    return { message: 'Logout successful' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  @HttpCode(200)
  async getCurrentUser(@Request() req) {
    return this.authService.getCurrentUser(req.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('user-by-email')
  @HttpCode(200)
  async getUserByEmail(@Request() req, @Query('email') email: string) {
    return this.authService.getUserByEmail(email);
  }

  private setAuthCookie(res: ExpressResponse, accessToken: string) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    
    res.cookie('access_token', accessToken, {
      httpOnly: false,
      secure: isProduction, // Use secure cookies in production (HTTPS)
      sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-site cookies in production
      domain: isProduction ? this.configService.get('COOKIE_DOMAIN') : undefined,
      maxAge: AuthController.COOKIE_MAX_AGE,
    });
  }


}
