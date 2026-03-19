/**
 * Redis Client Configuration
 * Handles caching for product searches, frequently accessed data, and analytics
 * 
 * ⚠️ WARNING: Redis has been removed and replaced with Meilisearch for search
 * This file is kept for backward compatibility but should not be used.
 */

// ⚠️ Redis package removed - import commented out
// import { createClient } from 'redis';

let redisClient = null;
let isConnected = false;

const initializeRedis = async () => {
  try {
    // ✅ Temporarily disabled Redis due to "require is not defined" error
    console.log('⚠️  Redis initialization skipped (temporarily disabled)');
    isConnected = false;
    return null;
    
    // redisClient = createClient({
    //   host: process.env.REDIS_HOST || 'localhost',
    //   port: process.env.REDIS_PORT || 6379,
    //   socket: {
    //     reconnectStrategy: (retries) => Math.min(retries * 50, 500),
    //   },
    // });

    // redisClient.on('error', (err) => {
    //   console.error('❌ Redis Client Error:', err);
    //   isConnected = false;
    // });

    // redisClient.on('connect', () => {
    //   console.log('✅ Redis Connected');
    //   isConnected = true;
    // });

    // await redisClient.connect();
    // return redisClient;
  } catch (err) {
    console.error('❌ Redis Connection Failed:', err.message);
    console.log('⚠️  Continuing without Redis caching (fallback to database)');
    isConnected = false;
    return null;
  }
};

// Cache Management Functions
const setCache = async (key, value, ttlSeconds = 3600) => {
  if (!redisClient || !isConnected) return false;

  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error('❌ Cache Set Error:', err.message);
    return false;
  }
};

const getCache = async (key) => {
  if (!redisClient || !isConnected) return null;

  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    console.error('❌ Cache Get Error:', err.message);
    return null;
  }
};

const deleteCache = async (key) => {
  if (!redisClient || !isConnected) return false;

  try {
    await redisClient.del(key);
    return true;
  } catch (err) {
    console.error('❌ Cache Delete Error:', err.message);
    return false;
  }
};

const flushCache = async () => {
  if (!redisClient || !isConnected) return false;

  try {
    await redisClient.flushDb();
    console.log('✅ Cache Flushed');
    return true;
  } catch (err) {
    console.error('❌ Cache Flush Error:', err.message);
    return false;
  }
};

// Cache Key Generation
const generateSearchCacheKey = (query, page = 1, limit = 100) => {
  return `search:${query.toLowerCase().trim()}:p${page}:l${limit}`;
};

const generateAnalyticsCacheKey = (metric) => {
  return `analytics:${metric}`;
};

export {
  initializeRedis,
  setCache,
  getCache,
  deleteCache,
  flushCache,
  generateSearchCacheKey,
  generateAnalyticsCacheKey,
};

export const getConnectionStatus = () => isConnected;
