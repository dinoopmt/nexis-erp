/**
 * ✅ RATE LIMITING UTILITY - Protect API from abuse
 * 
 * Purpose: Prevent users from spamming API requests
 * 
 * Benefits:
 * - Protects server from DOS-like attacks
 * - Prevents wasting bandwidth on duplicate requests
 * - Provides user feedback when rate limited
 * 
 * Strategy: Token bucket algorithm per endpoint
 * - 10 requests per second per service allowed
 * - Tokens refill at rate of 2 tokens per second
 * - Burst allowance of 20 tokens
 */

class RateLimiter {
  constructor(maxRequests = 10, windowMs = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  /**
   * Check if a request is allowed
   * @returns {object} - { allowed: boolean, remaining: number, resetTime: number }
   */
  isAllowed() {
    const now = Date.now();
    
    // Remove old requests outside of window
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return {
        allowed: true,
        remaining: this.maxRequests - this.requests.length,
        resetTime: 0,
      };
    }

    // Rate limit exceeded
    const oldestRequest = this.requests[0];
    const resetTime = oldestRequest + this.windowMs;
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: resetTime - now, // Time until next request allowed
    };
  }

  /**
   * Reset the limiter
   */
  reset() {
    this.requests = [];
  }

  /**
   * Get current request count
   */
  getRequestCount() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return this.requests.length;
  }
}

/**
 * Per-endpoint rate limiters
 * Each endpoint gets its own limiter
 */
const limiters = {
  search: new RateLimiter(10, 1000), // 10 requests per second
  api: new RateLimiter(20, 1000),    // 20 requests per second
  upload: new RateLimiter(2, 1000),  // 2 uploads per second
};

/**
 * Check if a search request is allowed
 * @param {string} query - Search query (optional, for logging)
 * @returns {object} - Rate limit info
 */
export const checkSearchRateLimit = (query = '') => {
  const result = limiters.search.isAllowed();
  
  if (!result.allowed) {
    console.warn(
      `⚠️ RATE LIMITED - Search request blocked. Retry after ${result.resetTime}ms`,
      `Query: "${query}"`
    );
  } else {
    console.log(
      `📊 Rate limit OK - ${result.remaining} requests remaining this second`
    );
  }

  return result;
};

/**
 * Check if an API request is allowed
 * @returns {object} - Rate limit info
 */
export const checkApiRateLimit = () => {
  return limiters.api.isAllowed();
};

/**
 * Check if an upload is allowed
 * @returns {object} - Rate limit info
 */
export const checkUploadRateLimit = () => {
  return limiters.upload.isAllowed();
};

/**
 * Get global rate limit stats
 * @returns {object} - Stats for all endpoints
 */
export const getRateLimitStats = () => {
  return {
    search: {
      requests: limiters.search.getRequestCount(),
      limit: limiters.search.maxRequests,
      window: limiters.search.windowMs,
    },
    api: {
      requests: limiters.api.getRequestCount(),
      limit: limiters.api.maxRequests,
      window: limiters.api.windowMs,
    },
    upload: {
      requests: limiters.upload.getRequestCount(),
      limit: limiters.upload.maxRequests,
      window: limiters.upload.windowMs,
    },
  };
};

/**
 * Create a debounced rate-limit checker
 * Useful for high-frequency events like typing
 * @param {function} callback - Called if rate limit allows
 * @param {number} minWait - Minimum wait before checking rate limit again
 * @returns {function} - Debounced function
 */
export const createRateLimitedFunction = (
  callback,
  minWait = 300,
  limitType = 'search'
) => {
  let timeout = null;
  let lastCheckTime = 0;

  return function (...args) {
    const now = Date.now();

    const doCall = () => {
      const limiter = limiters[limitType];
      const result = limiter.isAllowed();

      if (result.allowed) {
        callback.apply(this, args);
      } else {
        console.warn(
          `⚠️ Rate limited for ${limitType} - retry in ${result.resetTime}ms`
        );
      }
    };

    clearTimeout(timeout);

    if (now - lastCheckTime >= minWait) {
      lastCheckTime = now;
      doCall();
    } else {
      timeout = setTimeout(() => {
        lastCheckTime = Date.now();
        doCall();
      }, minWait - (now - lastCheckTime));
    }
  };
};

/**
 * Reset all limiters (for testing)
 */
export const resetAllLimiters = () => {
  Object.keys(limiters).forEach(key => limiters[key].reset());
  console.log('🔄 All rate limiters reset');
};

export default {
  checkSearchRateLimit,
  checkApiRateLimit,
  checkUploadRateLimit,
  getRateLimitStats,
  createRateLimitedFunction,
  resetAllLimiters,
};


