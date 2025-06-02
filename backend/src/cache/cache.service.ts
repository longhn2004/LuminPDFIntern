import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    console.log('🚀 CacheService initialized with Redis');
  }

  // Generic cache methods
  async get<T>(key: string): Promise<T | null> {
    try {
      console.log(`🔍 Cache GET: ${key}`);
      const result = await this.cacheManager.get<T>(key);
      console.log(`✅ Cache ${result ? 'HIT' : 'MISS'}: ${key}`);
      
      // Additional debugging - log the actual value returned
      if (result) {
        console.log(`📊 Cache value type: ${typeof result}, value:`, JSON.stringify(result).substring(0, 100) + '...');
      } else {
        console.log(`🔍 Cache value is null/undefined for key: ${key}`);
      }
      
      return result || null;
    } catch (error) {
      console.error(`❌ Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      console.log(`💾 Cache SET: ${key} (TTL: ${ttl || 'default'}s)`);
      console.log(`📊 Setting value type: ${typeof value}, value:`, JSON.stringify(value).substring(0, 100) + '...');
      
      // NestJS cache-manager expects TTL in milliseconds, but we pass it in seconds for convenience
      const ttlMs = ttl ? ttl * 1000 : undefined;
      await this.cacheManager.set(key, value, ttlMs);
      console.log(`✅ Cache SET successful: ${key}`);
      
      // Immediate verification - try to get the value back
      console.log(`🔍 Immediate verification GET: ${key}`);
      const verification = await this.cacheManager.get<T>(key);
      if (verification) {
        console.log(`✅ Immediate verification SUCCESS: ${key}`);
      } else {
        console.log(`❌ Immediate verification FAILED: ${key} - value not found after SET`);
      }
      
    } catch (error) {
      console.error(`❌ Cache SET error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      console.log(`🗑️ Cache DEL: ${key}`);
      await this.cacheManager.del(key);
      console.log(`✅ Cache DEL successful: ${key}`);
    } catch (error) {
      console.error(`❌ Cache DEL error for key ${key}:`, error);
    }
  }

  // Document-specific cache methods
  async getFileInfo(fileId: string) {
    const key = this.generateFileInfoKey(fileId);
    return this.get(key);
  }

  async setFileInfo(fileId: string, fileInfo: any, ttl: number = 600) {
    const key = this.generateFileInfoKey(fileId);
    console.log(`📄 Caching file info for fileId: ${fileId}`);
    return this.set(key, fileInfo, ttl);
  }

  async deleteFileInfo(fileId: string) {
    const key = this.generateFileInfoKey(fileId);
    console.log(`🗑️ Removing cached file info for fileId: ${fileId}`);
    return this.del(key);
  }

  async getUserFileRole(fileId: string, userId: string) {
    const key = this.generateUserFileRoleKey(fileId, userId);
    return this.get(key);
  }

  async setUserFileRole(fileId: string, userId: string, role: string, ttl: number = 300) {
    const key = this.generateUserFileRoleKey(fileId, userId);
    console.log(`👤 Caching user role for fileId: ${fileId}, userId: ${userId}, role: ${role}`);
    return this.set(key, { role }, ttl);
  }

  async deleteUserFileRole(fileId: string, userId: string) {
    const key = this.generateUserFileRoleKey(fileId, userId);
    console.log(`🗑️ Removing cached user role for fileId: ${fileId}, userId: ${userId}`);
    return this.del(key);
  }

  async getFileUsers(fileId: string) {
    const key = this.generateFileUsersKey(fileId);
    return this.get(key);
  }

  async setFileUsers(fileId: string, users: any[], ttl: number = 300) {
    const key = this.generateFileUsersKey(fileId);
    console.log(`👥 Caching file users for fileId: ${fileId}, users count: ${users.length}`);
    return this.set(key, users, ttl);
  }

  async deleteFileUsers(fileId: string) {
    const key = this.generateFileUsersKey(fileId);
    console.log(`🗑️ Removing cached file users for fileId: ${fileId}`);
    return this.del(key);
  }

  async getUserFileList(userId: string, page: number, sort: string) {
    const key = this.generateUserFileListKey(userId, page, sort);
    return this.get(key);
  }

  async setUserFileList(userId: string, page: number, sort: string, files: any[], ttl: number = 180) {
    const key = this.generateUserFileListKey(userId, page, sort);
    console.log(`📋 Caching file list for userId: ${userId}, page: ${page}, files count: ${files.length}`);
    return this.set(key, files, ttl);
  }

  async deleteUserFileList(userId: string) {
    const pattern = `user_files:${userId}:*`;
    console.log(`🗑️ Removing cached file lists for userId: ${userId}`);
    // Note: This is a simplified approach. In production, you might want to use Redis SCAN
    // to find and delete all matching keys
    await this.deleteByPattern(pattern);
  }

  async getFileAnnotations(fileId: string) {
    const key = this.generateFileAnnotationsKey(fileId);
    return this.get(key);
  }

  async setFileAnnotations(fileId: string, annotations: any, ttl: number = 600) {
    const key = this.generateFileAnnotationsKey(fileId);
    console.log(`📝 Caching annotations for fileId: ${fileId}`);
    return this.set(key, annotations, ttl);
  }

  async deleteFileAnnotations(fileId: string) {
    const key = this.generateFileAnnotationsKey(fileId);
    console.log(`🗑️ Removing cached annotations for fileId: ${fileId}`);
    return this.del(key);
  }

  // Cache invalidation methods
  async invalidateFileCache(fileId: string) {
    console.log(`🔄 Invalidating all cache for fileId: ${fileId}`);
    const keys = [
      this.generateFileInfoKey(fileId),
      this.generateFileUsersKey(fileId),
      this.generateFileAnnotationsKey(fileId),
    ];
    
    for (const key of keys) {
      await this.del(key);
    }
    
    // Also invalidate user file lists (this is simplified - in production you'd want a more efficient approach)
    console.log(`🔄 File cache invalidation completed for fileId: ${fileId}`);
  }

  async invalidateUserCache(userId: string) {
    console.log(`🔄 Invalidating all cache for userId: ${userId}`);
    await this.deleteUserFileList(userId);
    console.log(`🔄 User cache invalidation completed for userId: ${userId}`);
  }

  // Private helper methods for generating cache keys
  private generateFileInfoKey(fileId: string): string {
    return `file_info:${fileId}`;
  }

  private generateUserFileRoleKey(fileId: string, userId: string): string {
    return `user_file_role:${fileId}:${userId}`;
  }

  private generateFileUsersKey(fileId: string): string {
    return `file_users:${fileId}`;
  }

  private generateUserFileListKey(userId: string, page: number, sort: string): string {
    return `user_files:${userId}:${page}:${sort}`;
  }

  private generateFileAnnotationsKey(fileId: string): string {
    return `file_annotations:${fileId}`;
  }

  // Helper method to get cache statistics
  async getCacheStats(): Promise<any> {
    try {
      console.log('📊 Getting basic cache statistics...');
      
      // Test cache functionality with a simple round trip
      const testResult = await this.testCacheRoundTrip('stats:test:key');
      
      return {
        cacheOperational: testResult.success,
        testRoundTrip: testResult,
        message: testResult.success ? 'Cache is operational' : 'Cache may have issues',
        timestamp: new Date().toISOString(),
        note: 'Using simplified cache stats without Redis client access'
      };
    } catch (error) {
      console.error('❌ Error getting cache stats:', error);
      return { 
        error: error.message,
        cacheOperational: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  async testCacheRoundTrip(testKey: string = 'test:round:trip'): Promise<any> {
    try {
      console.log('🧪 Testing cache round trip...');
      
      const testValue = {
        message: 'Cache round trip test',
        timestamp: new Date().toISOString(),
        randomId: Math.random()
      };
      
      console.log('💾 Setting test value...');
      await this.set(testKey, testValue, 60); // 60 second TTL
      
      console.log('🔍 Getting test value immediately...');
      const retrieved = await this.get(testKey);
      
      console.log('🧹 Cleaning up test key...');
      await this.del(testKey);
      
      const success = retrieved && JSON.stringify(retrieved) === JSON.stringify(testValue);
      
      return {
        success,
        original: testValue,
        retrieved,
        match: success
      };
    } catch (error) {
      console.error('❌ Error in cache round trip test:', error);
      return { error: error.message };
    }
  }

  // Debug methods for troubleshooting
  async debugCacheState(): Promise<any> {
    try {
      console.log('🔍 Debugging cache state...');
      
      // Test basic cache functionality
      const testResult = await this.testCacheRoundTrip('debug:state:test');
      
      return {
        cacheManager: this.cacheManager ? 'Cache manager exists' : 'Cache manager is null',
        testResult
      };
    } catch (error) {
      console.error('❌ Error debugging cache state:', error);
      return { error: error.message };
    }
  }

  // Public method for deleting cache keys by pattern
  async deleteByPattern(pattern: string): Promise<{ success: boolean; message: string; deletedCount?: number; error?: string }> {
    try {
      console.log(`🔍 Deleting cache keys matching pattern: ${pattern}`);
      
      // Use simple pattern-based approach instead of Redis client access
      let deletedCount = 0;
      
      if (pattern.includes('user_files:')) {
        // Handle user file list patterns like "user_files:userId:*"
        const userIdMatch = pattern.match(/user_files:([^:*]+)/);
        if (userIdMatch) {
          const userId = userIdMatch[1];
          console.log(`🔄 Deleting user file lists for userId: ${userId}`);
          deletedCount = await this.deleteUserFileListPatterns(userId);
        } else {
          // Generic user_files pattern - try common patterns
          console.log(`🔄 Deleting generic user_files patterns`);
          deletedCount = await this.deleteGenericUserFilesPatterns();
        }
      } else if (pattern.includes('file_info:')) {
        // Handle file info patterns like "file_info:*"
        console.log(`🔄 Deleting file info patterns`);
        deletedCount = await this.deleteFileInfoPatterns(pattern);
      } else if (pattern.includes('file_users:')) {
        // Handle file users patterns like "file_users:*"
        console.log(`🔄 Deleting file users patterns`);
        deletedCount = await this.deleteFileUsersPatterns(pattern);
      } else if (pattern.includes('file_annotations:')) {
        // Handle file annotations patterns like "file_annotations:*"
        console.log(`🔄 Deleting file annotations patterns`);
        deletedCount = await this.deleteFileAnnotationsPatterns(pattern);
      } else if (pattern.includes('user_file_role:')) {
        // Handle user file role patterns like "user_file_role:*"
        console.log(`🔄 Deleting user file role patterns`);
        deletedCount = await this.deleteUserFileRolePatterns(pattern);
      } else {
        // Generic pattern - try to delete based on known cache key structures
        console.log(`🔄 Deleting generic patterns`);
        deletedCount = await this.deleteGenericPatterns(pattern);
      }
      
      console.log(`✅ Successfully deleted ${deletedCount} keys matching pattern: ${pattern}`);
      
      return {
        success: true,
        message: `Successfully deleted ${deletedCount} keys matching pattern '${pattern}'`,
        deletedCount
      };
      
    } catch (error) {
      console.error(`❌ Error deleting keys by pattern ${pattern}:`, error);
      return {
        success: false,
        message: `Failed to delete cache pattern '${pattern}'`,
        error: error.message
      };
    }
  }
  
  // Helper methods for pattern-specific deletion
  private async deleteUserFileListPatterns(userId: string): Promise<number> {
    console.log(`🗑️ Deleting user file list patterns for userId: ${userId}`);
    let deletedCount = 0;
    
    // Common pagination and sorting patterns
    const sortOptions = ['DESC', 'ASC'];
    const maxPages = 10; // Delete up to 10 pages worth of cache
    
    for (const sort of sortOptions) {
      for (let page = 0; page < maxPages; page++) {
        const key = `user_files:${userId}:${page}:${sort}`;
        try {
          const exists = await this.get(key);
          if (exists) {
            await this.del(key);
            deletedCount++;
            console.log(`🗑️ Deleted: ${key}`);
          }
        } catch (error) {
          console.log(`ℹ️ Key ${key} not found or already deleted`);
        }
      }
    }
    
    return deletedCount;
  }
  
  private async deleteGenericUserFilesPatterns(): Promise<number> {
    console.log(`🗑️ Deleting generic user_files patterns`);
    // This is a simplified approach - in a real scenario, you'd want to track user IDs
    // For now, we'll return 0 and log that manual deletion is needed
    console.log(`⚠️ Generic user_files pattern deletion requires specific user IDs`);
    return 0;
  }
  
  private async deleteFileInfoPatterns(pattern: string): Promise<number> {
    console.log(`🗑️ Deleting file info patterns: ${pattern}`);
    let deletedCount = 0;
    
    // Extract file ID if specific pattern like "file_info:fileId"
    const fileIdMatch = pattern.match(/file_info:([^:*]+)/);
    if (fileIdMatch) {
      const fileId = fileIdMatch[1];
      const key = `file_info:${fileId}`;
      try {
        const exists = await this.get(key);
        if (exists) {
          await this.del(key);
          deletedCount++;
          console.log(`🗑️ Deleted: ${key}`);
        }
      } catch (error) {
        console.log(`ℹ️ Key ${key} not found or already deleted`);
      }
    }
    
    return deletedCount;
  }
  
  private async deleteFileUsersPatterns(pattern: string): Promise<number> {
    console.log(`🗑️ Deleting file users patterns: ${pattern}`);
    let deletedCount = 0;
    
    // Extract file ID if specific pattern like "file_users:fileId"
    const fileIdMatch = pattern.match(/file_users:([^:*]+)/);
    if (fileIdMatch) {
      const fileId = fileIdMatch[1];
      const key = `file_users:${fileId}`;
      try {
        const exists = await this.get(key);
        if (exists) {
          await this.del(key);
          deletedCount++;
          console.log(`🗑️ Deleted: ${key}`);
        }
      } catch (error) {
        console.log(`ℹ️ Key ${key} not found or already deleted`);
      }
    }
    
    return deletedCount;
  }
  
  private async deleteFileAnnotationsPatterns(pattern: string): Promise<number> {
    console.log(`🗑️ Deleting file annotations patterns: ${pattern}`);
    let deletedCount = 0;
    
    // Extract file ID if specific pattern like "file_annotations:fileId"
    const fileIdMatch = pattern.match(/file_annotations:([^:*]+)/);
    if (fileIdMatch) {
      const fileId = fileIdMatch[1];
      const key = `file_annotations:${fileId}`;
      try {
        const exists = await this.get(key);
        if (exists) {
          await this.del(key);
          deletedCount++;
          console.log(`🗑️ Deleted: ${key}`);
        }
      } catch (error) {
        console.log(`ℹ️ Key ${key} not found or already deleted`);
      }
    }
    
    return deletedCount;
  }
  
  private async deleteUserFileRolePatterns(pattern: string): Promise<number> {
    console.log(`🗑️ Deleting user file role patterns: ${pattern}`);
    let deletedCount = 0;
    
    // Extract file ID and user ID if specific pattern like "user_file_role:fileId:userId"
    const match = pattern.match(/user_file_role:([^:*]+):?([^:*]*)/);
    if (match) {
      const fileId = match[1];
      const userId = match[2];
      
      if (userId && userId !== '*') {
        // Specific user role
        const key = `user_file_role:${fileId}:${userId}`;
        try {
          const exists = await this.get(key);
          if (exists) {
            await this.del(key);
            deletedCount++;
            console.log(`🗑️ Deleted: ${key}`);
          }
        } catch (error) {
          console.log(`ℹ️ Key ${key} not found or already deleted`);
        }
      } else {
        // All roles for a file - this is trickier without SCAN, so we'll log it
        console.log(`⚠️ Pattern ${pattern} requires scanning - consider manual deletion of specific keys`);
      }
    }
    
    return deletedCount;
  }
  
  private async deleteGenericPatterns(pattern: string): Promise<number> {
    console.log(`🗑️ Attempting to delete generic pattern: ${pattern}`);
    console.log(`⚠️ Generic pattern deletion not implemented - please use specific patterns like:
    - user_files:userId:*
    - file_info:fileId
    - file_users:fileId
    - file_annotations:fileId
    - user_file_role:fileId:userId`);
    return 0;
  }
} 