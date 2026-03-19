import environment from './environment.js';
import logger from './logger.js';

// Global error handler middleware
export const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error('API Error:', {
    status,
    message,
    path: req.path,
    method: req.method,
    stack: environment.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(status).json({
    success: false,
    status,
    message,
    ...(environment.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// 404 handler middleware
export const notFoundHandler = (req, res) => {
  logger.warn('Route not found:', { path: req.path, method: req.method });
  res.status(404).json({
    success: false,
    status: 404,
    message: 'Route not found',
  });
};

// Custom error class
export class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Async error wrapper
export const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
