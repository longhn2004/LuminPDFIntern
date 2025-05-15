import { Controller, Post, Body, Get, UseGuards, Request, HttpCode, Query, Response, Res, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { Response as ExpressResponse } from 'express';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(201)
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
  async login(@Body() loginDto: LoginDto, @Response({ passthrough: true }) res) {
    const { accessToken} = await this.authService.login(loginDto);
    res.cookie('access_token', accessToken, {
      httpOnly: false, 
      secure: false, 
      sameSite: 'lax',
      maxAge: 30 * 60 * 1000, // 15p
    });
    // res.cookie('refresh_token', refreshToken, {
    //   httpOnly: true, 
    //   secure: false, 
    //   sameSite: 'lax',
    //   maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    // });
    return { message: 'Login successful' };
  }

  @Get('google')
  @HttpCode(200)
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Request() req) {}

  @Get('google/callback')
  @HttpCode(200)
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Request() req, @Response({ passthrough: true }) res) {
    const { accessToken} = await this.authService.googleLogin(req.user);
    // Gửi Access Token trong cookie
    res.cookie('access_token', accessToken, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: 30 * 60 * 1000,
    });
    // res.cookie('refresh_token', refreshToken, {
    //   httpOnly: true,
    //   secure: false,
    //   sameSite: 'lax',
    //   maxAge: 7 * 24 * 60 * 60 * 1000,
    // });
    // Chuyển hướng về frontend
    res.redirect('http://localhost:3000/dashboard/document-list');
    // res.redirect('http://localhost:3000/dashboard');
  }

  // @Post('refresh')
  // @UseGuards(AuthGuard('jwt'))
  // @HttpCode(200)
  // async refreshToken(
  //   @Request() req,
  //   @Body() refreshTokenDto: RefreshTokenDto,
  //   @Response({ passthrough: true }) res,
  // ) {
  //   const { accessToken, refreshToken } = await this.authService.refreshToken(req.user['_id'], refreshTokenDto);
  //   res.cookie('access_token', accessToken, {
  //     httpOnly: false,
  //     secure: false,
  //     sameSite: 'lax',
  //     maxAge: 15 * 60 * 1000,
  //   });
  //   res.cookie('refresh_token', refreshToken, {
  //     httpOnly: true,
  //     secure: false,
  //     sameSite: 'lax',
  //     maxAge: 7 * 24 * 60 * 60 * 1000,
  //   });
  //   return { message: 'Token refreshed' };
  // }

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
    // await this.authService.invalidateRefreshToken(req.user['_id']);
    res.clearCookie('access_token');
    // res.clearCookie('refresh_token');
    return { message: 'Logout successful' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  @HttpCode(200)
  async getCurrentUser(@Request() req) {
    return this.authService.getCurrentUser(req.user);
  }
}