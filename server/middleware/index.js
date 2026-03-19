// Middleware exports

/**
 * Simple error handling middleware
 * Catches errors and sends standard error response
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Request logging middleware
 * Logs incoming requests with method, URL, and timestamp
 */
const requestLogger = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
};

/**
 * Simple validation middleware
 * Checks if required fields are present in request body
 */
const validateRequired = (requiredFields) => {
  return (req, res, next) => {
    const missing = requiredFields.filter(field => !req.body[field]);
    
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        missingFields: missing,
      });
    }
    
    next();
  };
};

/**
 * CORS middleware wrapper
 * Handles cross-origin requests
 */
const corsMiddleware = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
};

/**
 * Authentication middleware (placeholder)
 * Should verify JWT tokens from request headers
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No authentication token provided',
    });
  }
  
  // TODO: Verify JWT token
  // For now, just pass through
  next();
};

module.exports = {
  errorHandler,
  requestLogger,
  validateRequired,
  corsMiddleware,
  authenticateToken,
};
