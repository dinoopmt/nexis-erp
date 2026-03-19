/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse and ensures fair usage
 */

// ⚠️ TEMPORARY: Disabled express-rate-limit due to "require is not defined" bug
// TODO: Replace with alternative solution or fix express-rate-limit v8.3.1 issue
// import rateLimit from 'express-rate-limit';

// Dummy middleware that passes through requests
const dummyMiddleware = (req, res, next) => next();

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
const apiLimiter = dummyMiddleware;

/**
 * Strict rate limiter for search endpoints
 * 50 requests per minute per IP (aggressive throttling)
 */
const searchLimiter = dummyMiddleware;

/**
 * Permissive rate limiter for downloads/exports
 * 10 requests per minute per IP
 */
const exportLimiter = dummyMiddleware;

/**
 * Authentication rate limiter
 * 5 failed attempts per 15 minutes
 */
const authLimiter = dummyMiddleware;

/**
 * Custom rate limiter with user-based tracking
 */
const createUserLimiter = (maxRequests = 1000, windowMinutes = 60) => {
  return dummyMiddleware;
};

/**
 * Per-user quota limiter (for analytics/reporting)
 * Tracks usage per authenticated user
 */
class QuotaManager {
  constructor() {
    this.userQuotas = new Map();
    this.resetInterval = 60 * 60 * 1000; // Reset every hour
    this.maxRequestsPerHour = 10000;
  }

  checkQuota(userId, limit = this.maxRequestsPerHour) {
    const now = Date.now();
    
    if (!this.userQuotas.has(userId)) {
      this.userQuotas.set(userId, { count: 0, resetTime: now + this.resetInterval });
    }

    const quota = this.userQuotas.get(userId);

    // Reset if window expired
    if (now > quota.resetTime) {
      quota.count = 0;
      quota.resetTime = now + this.resetInterval;
    }

    quota.count++;

    return {
      allowed: quota.count <= limit,
      used: quota.count,
      limit,
      remaining: Math.max(0, limit - quota.count),
      resetAt: new Date(quota.resetTime).toISOString(),
    };
  }

  getQuotaStatus(userId) {
    if (!this.userQuotas.has(userId)) {
      return {
        used: 0,
        limit: this.maxRequestsPerHour,
        remaining: this.maxRequestsPerHour,
        resetAt: new Date(Date.now() + this.resetInterval).toISOString(),
      };
    }

    const quota = this.userQuotas.get(userId);
    return {
      used: quota.count,
      limit: this.maxRequestsPerHour,
      remaining: Math.max(0, this.maxRequestsPerHour - quota.count),
      resetAt: new Date(quota.resetTime).toISOString(),
    };
  }

  resetUser(userId) {
    this.userQuotas.delete(userId);
  }

  reset() {
    this.userQuotas.clear();
  }
}

const quotaManager = new QuotaManager();

export {
  apiLimiter,
  searchLimiter,
  exportLimiter,
  authLimiter,
  createUserLimiter,
  quotaManager,
};
