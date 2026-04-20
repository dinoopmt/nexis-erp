import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Winston Logger Configuration
 * Provides structured logging for debugging and monitoring
 */

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level.toUpperCase()}] ${message} ${metaString}`;
  })
);

const transports = [
  // Console transport for development
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }),

  // File transport for errors
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // File transport for all logs
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/combined.log'),
    maxsize: 5242880, // 5MB
    maxFiles: 10,
  }),
];

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/rejections.log'),
    }),
  ],
});

/**
 * Express middleware for structured request logging
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  const requestId = req.id || `${Date.now()}-${Math.random()}`;
  req.requestId = requestId;

  // Store original response methods
  const originalSend = res.send;
  let responseBody = '';

  // Override res.send to capture response body
  res.send = function (data) {
    responseBody = typeof data === 'string' ? data : JSON.stringify(data);
    return originalSend.call(this, data);
  };

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - start;

    const logData = {
      requestId,
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      status: res.statusCode,
      statusText: res.statusMessage,
      duration: `${duration}ms`,
      contentLength: res.get('content-length') || 'unknown',
      userAgent: req.get('user-agent'),
      user: req.user?.id || 'anonymous',
      ip: req.ip,
      timestamp: new Date().toISOString(),
    };

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error('HTTP_ERROR', { ...logData, responseBody: responseBody.substring(0, 500) });
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP_CLIENT_ERROR', { ...logData, responseBody: responseBody.substring(0, 500) });
    } else if (res.statusCode >= 200 && res.statusCode < 300) {
      logger.info('HTTP_SUCCESS', logData);
    } else {
      logger.debug('HTTP_RESPONSE', logData);
    }
  });

  // Log on error
  res.on('error', (error) => {
    logger.error('HTTP_STREAM_ERROR', {
      requestId,
      method: req.method,
      path: req.path,
      error: error.message,
      stack: error.stack,
    });
  });

  next();
};

/**
 * Specific error logger for database operations
 */
export const dbLogger = (operation, details) => {
  logger.info('DB_OPERATION', {
    operation,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Business logic event logger
 */
export const businessEventLogger = (eventName, data) => {
  logger.info('BUSINESS_EVENT', {
    event: eventName,
    ...data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Security event logger
 */
export const securityLogger = (eventName, data) => {
  logger.warn('SECURITY_EVENT', {
    event: eventName,
    ...data,
    timestamp: new Date().toISOString(),
  });
};

export default {
  logger,
  requestLogger,
  dbLogger,
  businessEventLogger,
  securityLogger,
};
