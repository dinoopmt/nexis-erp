import { z } from 'zod';

/**
 * Common Zod schemas for reuse across validators
 */

// ObjectId validation (for MongoDB)
const objectIdSchema = z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid MongoDB ObjectId');

// Email validation
const emailSchema = z.string().email('Invalid email address').toLowerCase();

// Phone validation
const phoneSchema = z.string().regex(/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/, 'Invalid phone number');

// Date validation
const dateSchema = z.string().datetime().or(z.date());

// Pagination
const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sort: z.string().optional(),
  search: z.string().optional(),
});

// ============================================
// AUTH SCHEMAS
// ============================================

export const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ============================================
// SALES INVOICE SCHEMAS
// ============================================

export const createSalesInvoiceSchema = z.object({
  invoiceNumber: z.string().optional(),
  financialYear: z.string(),
  date: z.string().or(z.date()).optional(),
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional(),
  paymentType: z.string().optional(),
  paymentTerms: z.string().optional(),
  createdDate: z.string().optional(),
  updatedDate: z.string().optional(),
  
  // Customer information
  customerPhone: z.string().optional(),
  customerTRN: z.string().optional(),
  customerAddress: z.string().optional(),
  customerContact: z.string().optional(),
  
  // Counts and totals
  totalItems: z.number().optional(),
  totalItemQty: z.number().optional(),
  
  // Financial breakdown
  subtotal: z.number().optional(),
  discountPercentage: z.number().optional(),
  discountAmount: z.number().optional(),
  totalAfterDiscount: z.number().optional(),
  vatPercentage: z.number().optional(),
  vatAmount: z.number().optional(),
  totalIncludeVat: z.number().optional(),
  
  // Cost and profitability
  totalCost: z.number().optional(),
  grossProfit: z.number().optional(),
  grossProfitMargin: z.number().optional(),
  netProfit: z.number().optional(),
  netProfitMargin: z.number().optional(),
  
  // Notes
  notes: z.string().optional(),
  
  // Items - flexible schema to accept various field names
  items: z.array(z.object({
    itemName: z.string().optional(),
    itemcode: z.string().optional(),
    productId: z.string().optional(),
    quantity: z.number().optional(),
    unitPrice: z.number().optional(),
    rate: z.number().optional(),
    lineAmount: z.number().optional(),
    unitCost: z.number().optional(),
    lineCost: z.number().optional(),
    discountPercentage: z.number().optional(),
    discount: z.number().optional(),
    discountAmount: z.number().optional(),
    amountAfterDiscount: z.number().optional(),
    vatPercentage: z.number().optional(),
    vatAmount: z.number().optional(),
    total: z.number().optional(),
    serialNumbers: z.array(z.string()).optional(),
    note: z.string().optional(),
  })).optional(),
}).passthrough(); // Allow additional fields

export const updateSalesInvoiceSchema = createSalesInvoiceSchema.partial();

// ============================================
// FINANCIAL YEAR SCHEMAS
// ============================================

export const createFinancialYearSchema = z.object({
  yearCode: z.string().min(1, 'Year code required').toUpperCase(),
  yearName: z.string().min(1, 'Year name required'),
  startDate: dateSchema,
  endDate: dateSchema,
  status: z.enum(['OPEN', 'CLOSED', 'LOCKED']).default('OPEN'),
  isCurrent: z.boolean().default(false),
}).refine((data) => new Date(data.startDate) < new Date(data.endDate), {
  message: 'Start date must be before end date',
  path: ['endDate'],
});

// Update schema without refinement - refinement only needed on creation
export const updateFinancialYearSchema = z.object({
  yearCode: z.string().min(1, 'Year code required').toUpperCase().optional(),
  yearName: z.string().min(1, 'Year name required').optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  status: z.enum(['OPEN', 'CLOSED', 'LOCKED']).optional(),
  isCurrent: z.boolean().optional(),
}).refine((data) => {
  // Only validate date order if both dates are provided
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) < new Date(data.endDate);
  }
  return true;
}, {
  message: 'Start date must be before end date',
  path: ['endDate'],
});

export const setCurrentFinancialYearSchema = z.object({
  id: objectIdSchema,
});

// ============================================
// PRODUCT SCHEMAS
// ============================================

export const createProductSchema = z.object({
  itemCode: z.string().min(1, 'Item code required'),
  itemName: z.string().min(1, 'Item name required'),
  categoryId: objectIdSchema,
  unitId: objectIdSchema,
  basePrice: z.number().positive('Base price must be positive'),
  costPrice: z.number().positive('Cost price must be positive'),
  reorderLevel: z.number().nonnegative().default(0),
  reorderQty: z.number().positive().default(1),
  description: z.string().optional(),
  hsn: z.string().optional(),
  taxable: z.boolean().default(true),
  trackExpiry: z.boolean().default(false),
});

export const updateProductSchema = createProductSchema.partial();

// ============================================
// CUSTOMER SCHEMAS
// ============================================

export const createCustomerSchema = z.object({
  customerCode: z.string().min(1, 'Customer code required'),
  customerName: z.string().min(1, 'Customer name required'),
  email: emailSchema.optional(),
  phone: phoneSchema,
  address: z.string().min(1, 'Address required'),
  city: z.string().min(1, 'City required'),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('AE'),
  creditLimit: z.number().nonnegative().default(0),
  paymentTerms: z.string().optional(),
  taxId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateCustomerSchema = createCustomerSchema.partial();

// ============================================
// COMPANY SETTINGS SCHEMAS
// ============================================

export const updateCompanySettingsSchema = z.object({
  companyName: z.string().min(1).optional(),
  registrationNumber: z.string().optional(),
  taxId: z.string().optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  website: z.string().url().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  industry: z.string().optional(),
  costingMethod: z.enum(['FIFO', 'LIFO', 'WAC']).optional(),
  decimalPlaces: z.number().int().min(0).max(4).optional(),
  taxType: z.string().optional(),
  taxRate: z.number().nonnegative().optional(),
});

// ============================================
// VALIDATOR HELPER
// ============================================

/**
 * Reusable validator middleware generator
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {string} source - 'body', 'params', or 'query'
 * @returns {Function} Express middleware
 */
export const validate = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      const dataToValidate = req[source];
      await schema.parseAsync(dataToValidate);
      next();
    } catch (error) {
      console.error('Validation error:', error);
      
      // Handle Zod validation errors
      if (error.name === 'ZodError' && error.issues && Array.isArray(error.issues)) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }
      
      // Handle other validation errors
      const statusCode = error.status || error.statusCode || 500;
      const message = error.message || 'Validation failed';
      
      res.status(statusCode).json({
        success: false,
        message: message,
      });
    }
  };
};

export default {
  loginSchema,
  registerSchema,
  createSalesInvoiceSchema,
  updateSalesInvoiceSchema,
  createFinancialYearSchema,
  updateFinancialYearSchema,
  createProductSchema,
  updateProductSchema,
  createCustomerSchema,
  updateCustomerSchema,
  updateCompanySettingsSchema,
  validate,
};
