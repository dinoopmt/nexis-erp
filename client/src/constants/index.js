// Client-side constants

// API Response Status Codes
export const API_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  LOADING: 'loading',
};

// Invoice Types
export const INVOICE_TYPES = {
  SALES: 'sales',
  PURCHASE: 'purchase',
  RETURN: 'return',
  CREDIT_NOTE: 'credit_note',
  DEBIT_NOTE: 'debit_note',
};

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  OVERDUE: 'overdue',
};

// Stock Status
export const STOCK_STATUS = {
  CRITICAL: 'CRITICAL',
  LOW: 'LOW',
  HEALTHY: 'HEALTHY',
  OVERSTOCKED: 'OVERSTOCKED',
};

// Country Codes
export const COUNTRIES = {
  UAE: 'UAE',
  OMAN: 'Oman',
  INDIA: 'India',
};

// Tax Types (India GST)
export const TAX_TYPES = {
  REGISTERED: 'Registered',
  UNREGISTERED: 'Unregistered',
  COMPOSITION: 'Composition',
  OVERSEAS: 'Overseas',
};

// Discount Types
export const DISCOUNT_TYPES = {
  PERCENTAGE: 'percentage',
  AMOUNT: 'amount',
};

// Financial Year Status
export const FINANCIAL_YEAR_STATUS = {
  ACTIVE: 'active',
  CLOSED: 'closed',
  ARCHIVED: 'archived',
};

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_INFO: 'userInfo',
  CURRENT_COMPANY: 'currentCompany',
  THEME: 'theme',
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  DEFAULT_PAGE: 1,
};

// Time Constants
export const TIME = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
};

export default {
  API_STATUS,
  INVOICE_TYPES,
  PAYMENT_STATUS,
  STOCK_STATUS,
  COUNTRIES,
  TAX_TYPES,
  DISCOUNT_TYPES,
  FINANCIAL_YEAR_STATUS,
  STORAGE_KEYS,
  PAGINATION,
  TIME,
};


