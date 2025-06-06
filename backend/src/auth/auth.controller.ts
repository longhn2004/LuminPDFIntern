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
      const { accessToken } = await this.authService.googleLogin(req.user);

      this.setAuthCookie(res, accessToken);
      
      // Ensure cookie is set before redirect
      await this.ensureCookieSetBeforeRedirect(res, accessToken);
      console.log("Login with Google Success - Cookie verified");
      res.redirect(
        `${this.configService.get('APP_URL')}/dashboard/document-list`,
      );
    } catch (error) {
      await this.handleGoogleAuthError(error, res);
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
    res.cookie('access_token', accessToken, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: AuthController.COOKIE_MAX_AGE,
    });
  }

  private async ensureCookieSetBeforeRedirect(res: ExpressResponse, accessToken: string): Promise<void> {
    // Wait for a short delay to ensure cookie is processed
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Verify the cookie was set by checking the response headers
    const cookies = res.getHeader('Set-Cookie');
    if (!cookies || (Array.isArray(cookies) && !cookies.some(cookie => cookie.includes('access_token')))) {
      console.log('Cookie may not have been set properly, retrying...');
      // Retry setting the cookie
      this.setAuthCookie(res, accessToken);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('Cookie setting verified');
  }

  private async handleGoogleAuthError(error: any, res: ExpressResponse) {
    // Small delay before redirect
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("Error Login with Google");
    
    // Check if error is because email already used with password
    if (
      error?.message?.includes('email and password') ||
      error?.response?.message?.includes('email and password')
    ) {
      res.redirect(
        `${this.configService.get('APP_URL')}/auth/signin?verification=conflictemail`,
      );
    } else {
      // Generic error - redirect to signin
      res.redirect(`${this.configService.get('APP_URL')}/auth/signin`);
    }
  }
}
