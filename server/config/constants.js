// Server-side constants

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

// Database Status
const DB_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  DISCONNECTING: 'disconnecting',
};

// Role Types
const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  VIEWER: 'viewer',
};

// Stock Movement Types
const STOCK_MOVEMENT_TYPES = {
  INBOUND: 'INBOUND',      // Purchase/GRN
  OUTBOUND: 'OUTBOUND',    // Sales invoice
  ADJUSTMENT: 'ADJUSTMENT', // Manual adjustment
  RETURN: 'RETURN',        // Return from customer
  TRANSFER: 'TRANSFER',    // Transfer between locations
};

// GRN Status
const GRN_STATUS = {
  DRAFT: 'Draft',
  RECEIVED: 'Received',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
};

// Invoice Status
const INVOICE_STATUS = {
  DRAFT: 'draft',
  ISSUED: 'issued',
  PAID: 'paid',
  PARTIALLY_PAID: 'partially_paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
};

// Payment Status
const PAYMENT_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  OVERDUE: 'overdue',
};

// Countries
const COUNTRIES = {
  UAE: 'UAE',
  OMAN: 'Oman',
  INDIA: 'India',
};

// Tax Types (India)
const TAX_TYPES = {
  REGISTERED: 'Registered',
  UNREGISTERED: 'Unregistered',
  COMPOSITION: 'Composition',
  OVERSEAS: 'Overseas',
};

// Tax Names
const TAX_NAMES = {
  VAT: 'VAT',
  GST: 'GST',
};

// Default Values
const DEFAULTS = {
  TAX_RATE: 5,
  DECIMAL_PLACES: 2,
  PAGE_SIZE: 20,
  CURRENCY_UAE: 'AED',
  CURRENCY_OMAN: 'OMR',
  CURRENCY_INDIA: 'INR',
};

// Validation Rules
const VALIDATION_RULES = {
  MIN_INVOICE_AMOUNT: 0,
  MAX_DISCOUNT_PERCENT: 100,
  MIN_QUANTITY: 0,
  PHONE_REGEX: /^[0-9\s\-\+\(\)]+$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  TRN_REGEX: /^[0-9]{15}$/,
};

// Error Messages
const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation error',
  DATABASE_ERROR: 'Database error',
  DUPLICATE_ENTRY: 'Duplicate entry',
  INVALID_DATA: 'Invalid data provided',
  ACCESS_DENIED: 'Access denied',
};

// Success Messages
const SUCCESS_MESSAGES = {
  CREATED: 'Created successfully',
  UPDATED: 'Updated successfully',
  DELETED: 'Deleted successfully',
  RETRIEVED: 'Retrieved successfully',
  SAVED: 'Saved successfully',
};

// Performance & Caching Config
const CACHE_CONFIG = {
  PRODUCT_TTL: 3600, // 1 hour
  USER_TTL: 1800, // 30 minutes
  COMPANY_TTL: 7200, // 2 hours
  TAX_TTL: 86400, // 1 day
};

// Rate Limiting
const RATE_LIMITS = {
  AUTH_ATTEMPTS: 5,
  AUTH_WINDOW_MS: 900000, // 15 minutes
  API_REQUESTS_PER_MINUTE: 100,
};

// File Upload Config
const FILE_UPLOAD = {
  MAX_SIZE: 50 * 1024 * 1024, // 50 MB
  ALLOWED_FORMATS: ['pdf', 'xlsx', 'xls', 'csv', 'jpg', 'png'],
};

// Pagination
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 1000,
};

// API Response Format
const API_RESPONSE = {
  SUCCESS: 'success',
  ERROR: 'error',
  VALIDATION_ERROR: 'validation_error',
};

export {
  HTTP_STATUS,
  DB_STATUS,
  ROLES,
  STOCK_MOVEMENT_TYPES,
  GRN_STATUS,
  INVOICE_STATUS,
  PAYMENT_STATUS,
  COUNTRIES,
  TAX_TYPES,
  TAX_NAMES,
  DEFAULTS,
  VALIDATION_RULES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  CACHE_CONFIG,
  RATE_LIMITS,
  FILE_UPLOAD,
  PAGINATION,
  API_RESPONSE,
};
