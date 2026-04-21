import rateLimit from 'express-rate-limit';

// Global rate limiter - Apply to write operations only (POST, PUT, DELETE, PATCH)
// GET requests (read-only) are not rate limited globally
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 write requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // ✅ Use default keyGenerator which properly handles IPv6
  skip: (req, res) => {
    // Skip rate limiting for:
    // 1. GET requests (read-only operations are safe)
    // 2. Health checks
    // 3. Terminal verification endpoint
    // 4. Public endpoints (login, register)
    if (req.method === 'GET') {
      return true; // Skip rate limiting for GET requests
    }
    if (req.path === '/health' || req.path.includes('/terminals/verify/')) {
      return true;
    }
    return false;
  },
});

// Strict rate limiter for authentication - 5 attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Limit login attempts
  message: 'Too many login attempts, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// API endpoint rate limiter - 500 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

export default {
  globalLimiter,
  authLimiter,
  apiLimiter,
};
