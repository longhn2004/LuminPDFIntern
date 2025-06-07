import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { CacheService } from './cache/cache.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly cacheService: CacheService,
  ) {}

  @ApiOperation({
    summary: 'Health check',
    description: 'Simple health check endpoint',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    schema: {
      example: 'Hello World!',
    },
  })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @ApiOperation({
    summary: 'Detailed health check',
    description: 'Returns detailed application health information',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed health information',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2023-01-01T00:00:00.000Z',
        uptime: 123.456,
        memory: {
          rss: 12345678,
          heapTotal: 8765432,
          heapUsed: 5432109,
          external: 876543,
        },
        environment: 'development',
      },
    },
  })
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @ApiOperation({
    summary: 'Test Redis cache',
    description: 'Tests Redis cache connectivity and operations',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache test successful',
    schema: {
      example: {
        status: 'success',
        message: 'Redis cache is working properly',
        test: {
          message: 'Redis is working!',
          timestamp: 1640995200000,
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Cache test failed',
    schema: {
      example: {
        status: 'error',
        message: 'Redis cache test failed',
        error: 'Connection refused',
      },
    },
  })
  @Get('cache/test')
  async testCache() {
    try {
      const testKey = 'health-check';
      const testValue = { message: 'Redis is working!', timestamp: Date.now() };
      
      console.log('🧪 Testing Redis cache...');
      
      // Test SET
      await this.cacheService.set(testKey, testValue, 60);
      console.log('✅ Cache SET successful');
      
      // Test GET
      const result = await this.cacheService.get(testKey);
      console.log('✅ Cache GET successful:', result);
      
      // Test DEL
      await this.cacheService.del(testKey);
      console.log('✅ Cache DEL successful');
      
      return {
        status: 'success',
        message: 'Redis cache is working properly',
        test: result,
      };
    } catch (error) {
      console.error('❌ Redis cache test failed:', error);
      return {
        status: 'error',
        message: 'Redis cache test failed',
        error: error.message,
      };
    }
  }
}
