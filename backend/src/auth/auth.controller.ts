import { Controller, Post, Body, Get, UseGuards, Request, HttpCode, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Get('verify-email')
  @HttpCode(200)
  async verifyEmail(@Query('token') token: string) {
    await this.authService.verifyEmail(token);
    return { message: 'Email verified successfully' };
  }

  @Post('resend-verification')
  @HttpCode(200)
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.authService.resendVerificationEmail(dto);
    return { message: 'Verification email sent' };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Request() req) {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Request() req) {
    return this.authService.googleLogin(req.user);
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(200)
  async refresh(@Body() dto: RefreshTokenDto, @Request() req) {
    return this.authService.refreshToken(req.user._id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @HttpCode(204)
  async logout(@Request() req) {
    await this.authService.invalidateRefreshToken(req.user._id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getCurrentUser(@Request() req) {
    return this.authService.getCurrentUser(req.user);
  }
}