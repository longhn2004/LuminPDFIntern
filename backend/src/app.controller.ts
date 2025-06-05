import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { CacheService } from './cache/cache.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly cacheService: CacheService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

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
