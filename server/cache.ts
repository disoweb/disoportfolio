import Redis from 'ioredis';

// Enterprise-grade Redis caching system for ultra-fast performance
class CacheManager {
  private redis: Redis | null = null;
  private memoryCache: Map<string, { data: any; expires: number }> = new Map();
  private isRedisConnected = false;

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis() {
    // Only attempt Redis connection if explicitly configured
    const redisUrl = process.env.REDIS_URL || process.env.REDISCLOUD_URL;
    
    if (!redisUrl || redisUrl.includes('localhost')) {
      console.log('ℹ️ [CACHE] Redis not configured, using memory cache');
      this.isRedisConnected = false;
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        enableReadyCheck: true,
        keepAlive: 30000,
        connectTimeout: 5000,
        commandTimeout: 3000,
      });

      await this.redis.ping();
      this.isRedisConnected = true;
      console.log('✅ [CACHE] Redis connected successfully');

      // Set up error handling
      this.redis.on('error', (err) => {
        this.isRedisConnected = false;
        // Silently fall back to memory cache in production
        if (process.env.NODE_ENV !== 'production') {
          console.warn('⚠️ [CACHE] Redis connection lost, falling back to memory cache');
        }
      });

      this.redis.on('connect', () => {
        this.isRedisConnected = true;
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ [CACHE] Redis reconnected');
        }
      });

    } catch (error) {
      this.isRedisConnected = false;
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ [CACHE] Redis not available, using memory cache');
      }
    }
  }

  // Ultra-fast get with multi-tier fallback
  async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first for ultimate performance
      if (this.redis && this.isRedisConnected) {
        const cached = await this.redis.get(key);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      // Fallback to memory cache
      const memCached = this.memoryCache.get(key);
      if (memCached && memCached.expires > Date.now()) {
        return memCached.data;
      }

      return null;
    } catch (error) {
      console.warn('⚠️ [CACHE] Get error:', (error as Error).message);
      return null;
    }
  }

  // Ultra-fast set with multi-tier storage
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    try {
      const serialized = JSON.stringify(value);

      // Set in Redis for persistence and sharing across instances
      if (this.redis && this.isRedisConnected) {
        await this.redis.setex(key, ttlSeconds, serialized);
      }

      // Always set in memory for ultra-fast access
      this.memoryCache.set(key, {
        data: value,
        expires: Date.now() + (ttlSeconds * 1000)
      });

      // Clean up expired memory cache entries
      this.cleanupMemoryCache();
    } catch (error) {
      console.warn('⚠️ [CACHE] Set error:', (error as Error).message);
    }
  }

  // Invalidate cache keys with pattern matching
  async invalidate(pattern: string): Promise<void> {
    try {
      // Invalidate Redis cache
      if (this.redis && this.isRedisConnected) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }

      // Invalidate memory cache
      const memoryKeys = Array.from(this.memoryCache.keys());
      for (const key of memoryKeys) {
        if (key.includes(pattern.replace('*', ''))) {
          this.memoryCache.delete(key);
        }
      }
    } catch (error) {
      console.warn('⚠️ [CACHE] Invalidate error:', (error as Error).message);
    }
  }

  // Clean up expired memory cache entries
  private cleanupMemoryCache(): void {
    const now = Date.now();
    const entries = Array.from(this.memoryCache.entries());
    for (const [key, entry] of entries) {
      if (entry.expires < now) {
        this.memoryCache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats(): { memoryKeys: number; redisConnected: boolean } {
    return {
      memoryKeys: this.memoryCache.size,
      redisConnected: this.isRedisConnected
    };
  }

  // Cache-aside pattern helper
  async getOrSet<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetcher();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }
}

// Global cache instance
export const cacheManager = new CacheManager();

// Cache key generators for consistent naming
export const CacheKeys = {
  userStats: (userId: string) => `user:${userId}:stats`,
  userProjects: (userId: string) => `user:${userId}:projects`,
  userOrders: (userId: string) => `user:${userId}:orders`,
  servicePackages: () => 'services:packages',
  adminStats: () => 'admin:stats',
  seoSettings: () => 'seo:settings',
} as const;

// Performance monitoring decorator
export function cached(ttlSeconds: number = 300) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;
      
      return await cacheManager.getOrSet(
        cacheKey,
        () => method.apply(this, args),
        ttlSeconds
      );
    };
  };
}