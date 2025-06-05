import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheService } from './cache.service';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        console.log('🔧 Initializing Redis cache configuration with cache-manager-redis-yet...');
        
        const redisTtl = configService.get<number>('REDIS_TTL') || 300;
        console.log(`⏰ Default TTL: ${redisTtl}s`);
        
        // Check for Redis URL first, then fallback to individual components
        const redisUrl = configService.get<string>('REDIS_URL');
        
        let storeConfig;
        if (redisUrl) {
          console.log(`📡 Using Redis URL: ${redisUrl.replace(/:[^:@]*@/, ':***@')}`); // Hide password in logs
          
          // Handle different Redis URL formats (redis:// and rediss://)
          storeConfig = {
            url: redisUrl,
            // Additional options for external Redis services
            lazyConnect: true,
            retryDelayOnFailover: 100,
            enableAutoPipelining: true,
            maxRetriesPerRequest: 3,
          };
          
          // If URL contains rediss:// (SSL), add TLS configuration
          if (redisUrl.startsWith('rediss://')) {
            storeConfig.tls = {
              rejectUnauthorized: false, // For some hosted Redis services
            };
          }
        } else {
          // Fallback to individual Redis configuration
          const redisHost = configService.get<string>('REDIS_HOST') || 'localhost';
          const redisPort = configService.get<number>('REDIS_PORT') || 6379;
          const redisPassword = configService.get<string>('REDIS_PASSWORD');
          
          console.log(`📡 Redis Host: ${redisHost}:${redisPort}`);
          console.log(`🔐 Redis Password: ${redisPassword ? '***' : 'not set'}`);
          
          storeConfig = {
            socket: {
              host: redisHost,
              port: redisPort,
              tls: false, // Set to true if using SSL
            },
            lazyConnect: true,
            retryDelayOnFailover: 100,
            enableAutoPipelining: true,
            maxRetriesPerRequest: 3,
          };
          
          if (redisPassword) {
            storeConfig.password = redisPassword;
          }
        }
        
        try {
          // Create the Redis store
          const store = await redisStore(storeConfig);
          console.log('✅ Redis store created successfully');
          
          return {
            store: () => store,
            ttl: redisTtl * 1000, // Convert to milliseconds for cache-manager
            max: 1000,
            isGlobal: true,
          };
        } catch (error) {
          console.error('❌ Failed to create Redis store:', error);
          console.log('🔄 Falling back to memory cache...');
          
          // Fallback to memory cache if Redis fails
          return {
            ttl: redisTtl * 1000,
            max: 100, // Lower limit for memory cache
            isGlobal: true,
          };
        }
      },
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService],
  exports: [CacheService, NestCacheModule],
})
export class CacheModule {} 