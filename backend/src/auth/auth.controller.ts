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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  private static readonly COOKIE_MAX_AGE = 30 * 60 * 1000; // 30 minutes

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a new user account and sends a verification email',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully. Verification email sent.',
    schema: {
      example: {
        email: 'user@example.com',
        name: 'John Doe',
        isEmailVerified: false,
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered',
    schema: {
      example: {
        statusCode: 409,
        message: 'Email already registered with email/password',
        error: 'Conflict',
      },
    },
  })
  @Post('register')
  @HttpCode(201)
  async register(@Body(ValidationPipe) dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({
    summary: 'Verify email address',
    description: 'Verifies user email using verification token and logs them in',
  })
  @ApiQuery({
    name: 'token',
    description: 'Email verification token (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully. User is now logged in.',
    schema: {
      example: {
        message: 'Email verified successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid verification token',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid verification token',
        error: 'Bad Request',
      },
    },
  })
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

  @ApiOperation({
    summary: 'Resend verification email',
    description: 'Sends a new verification email to the user',
  })
  @ApiBody({ type: ResendVerificationDto })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent successfully',
    schema: {
      example: {
        message: 'Verification email sent',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'User not found or email already verified',
    schema: {
      example: {
        statusCode: 400,
        message: 'Email already verified',
        error: 'Bad Request',
      },
    },
  })
  @Post('resend-verification')
  @HttpCode(200)
  async resendVerification(@Body(ValidationPipe) dto: ResendVerificationDto) {
    await this.authService.resendVerificationEmail(dto);
    return { message: 'Verification email sent' };
  }

  @ApiOperation({
    summary: 'Login user',
    description: 'Authenticates user with email and password',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Authentication cookie set.',
    schema: {
      example: {
        message: 'Login successful',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or email not verified',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid credentials',
        error: 'Unauthorized',
      },
    },
  })
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

  @ApiOperation({
    summary: 'Google OAuth login',
    description: 'Initiates Google OAuth authentication flow',
  })
  @ApiResponse({
    status: 200,
    description: 'Redirects to Google OAuth consent screen',
  })
  @Get('google')
  @HttpCode(200)
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Request() req) {}

  @ApiOperation({
    summary: 'Google OAuth callback',
    description: 'Handles Google OAuth callback and logs user in',
  })
  @ApiResponse({
    status: 200,
    description: 'Google login successful',
    schema: {
      example: {
        accessToken: 'jwt-token-here',
        message: 'Google login successful',
        user: {
          email: 'user@example.com',
          name: 'John Doe',
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered with different method',
    schema: {
      example: {
        statusCode: 409,
        message: 'An account with this email already exists. Please sign in with email and password.',
        error: 'Conflict',
      },
    },
  })
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

  @ApiOperation({
    summary: 'Get user profile',
    description: 'Returns authenticated user profile information',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('access_token')
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        email: 'user@example.com',
        name: 'John Doe',
        isEmailVerified: true,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  @HttpCode(200)
  getProfile(@Request() req) {
    return req.user;
  }

  @ApiOperation({
    summary: 'Logout user',
    description: 'Logs out the authenticated user by clearing authentication cookie',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('access_token')
  @ApiResponse({
    status: 204,
    description: 'Logout successful',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(204)
  async logout(@Request() req, @Response({ passthrough: true }) res) {
    res.clearCookie('access_token');
    return { message: 'Logout successful' };
  }

  @ApiOperation({
    summary: 'Get current user',
    description: 'Returns detailed information about the currently authenticated user',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('access_token')
  @ApiResponse({
    status: 200,
    description: 'Current user information retrieved successfully',
    schema: {
      example: {
        email: 'user@example.com',
        isEmailVerified: true,
        name: 'John Doe',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  @HttpCode(200)
  async getCurrentUser(@Request() req) {
    return this.authService.getCurrentUser(req.user);
  }

  @ApiOperation({
    summary: 'Get user by email',
    description: 'Returns user information by email address (for authenticated users)',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('access_token')
  @ApiQuery({
    name: 'email',
    description: 'Email address of the user to lookup',
    example: 'user@example.com',
  })
  @ApiResponse({
    status: 200,
    description: 'User information retrieved successfully',
    schema: {
      example: {
        email: 'user@example.com',
        isEmailVerified: true,
        name: 'John Doe',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'User not found',
    schema: {
      example: {
        statusCode: 400,
        message: 'User not found',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
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
