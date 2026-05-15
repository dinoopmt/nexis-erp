import express from 'express';
import {
  getCreditCustomerCashflows,
  getCreditCustomerCashflowById,
  getCashflowByCustomerAndYear,
  recordReceiptPayment,
  recordPartialReceiptAllocation,
  recordAdvanceReceipt,
  applyAdvanceToInvoice,
  getCustomerAgingReport,
  recordInvoiceReversal,
  getTransactionHistory
} from '../controllers/creditCustomerCashflowController.js';
import { validate } from '../../../middleware/validators/schemaValidator.js';
import { authenticateToken } from '../../../middleware/index.js';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const idParamSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid MongoDB ObjectId')
});

const customerYearParamSchema = z.object({
  customerId: z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid MongoDB ObjectId'),
  financialYear: z.string()
});

/**
 * GET /cashflows - Get all cashflow entries with optional filters
 * Query params: customerId, financialYear, status, sortBy
 */
router.get('/getCreditCustomerCashflows', authenticateToken, getCreditCustomerCashflows);

/**
 * GET /cashflows/:id - Get cashflow entry by ID
 */
router.get('/getCreditCustomerCashflowById/:id', authenticateToken, validate(idParamSchema, 'params'), getCreditCustomerCashflowById);

/**
 * GET /cashflows/:customerId/:financialYear - Get cashflow for specific customer and year
 */
router.get(
  '/getCashflowByCustomerAndYear/:customerId/:financialYear',
  authenticateToken,
  validate(customerYearParamSchema, 'params'),
  getCashflowByCustomerAndYear
);

/**
 * POST /cashflows/:id/record-payment - Record receipt payment
 * Body: { receiptNumber, receiptId, amountPaid, paymentMode, advanceAmount?, narration? }
 */
router.post('/recordReceiptPayment/:id', authenticateToken, validate(idParamSchema, 'params'), recordReceiptPayment);

/**
 * POST /cashflows/:id/record-partial - Record partial receipt allocation
 * Body: { receiptNumber, receiptId, invoiceAmount, allocatedAmount, paymentMode }
 */
router.post(
  '/recordPartialReceiptAllocation/:id',
  authenticateToken,
  validate(idParamSchema, 'params'),
  recordPartialReceiptAllocation
);

/**
 * POST /cashflows/advance/record - Record advance receipt
 * Body: { customerId, receiptNumber, receiptId, advanceAmount, paymentMode, financialYear }
 */
router.post('/recordAdvanceReceipt', authenticateToken, recordAdvanceReceipt);

/**
 * POST /cashflows/:id/apply-advance - Apply advance to invoice
 * Body: { advanceToApply, receiptNumber?, receiptId? }
 */
router.post('/applyAdvanceToInvoice/:id', authenticateToken, validate(idParamSchema, 'params'), applyAdvanceToInvoice);

/**
 * GET /cashflows/aging-report - Get customer aging report
 * Query params: customerId?, financialYear?
 */
router.get('/getCustomerAgingReport', authenticateToken, getCustomerAgingReport);

/**
 * POST /cashflows/:id/reversal - Record invoice reversal
 * Body: { reversalReason, narration? }
 */
router.post('/recordInvoiceReversal/:id', authenticateToken, validate(idParamSchema, 'params'), recordInvoiceReversal);

/**
 * GET /cashflows/:id/transactions - Get transaction history for cashflow entry
 */
router.get(
  '/getTransactionHistory/:id',
  authenticateToken,
  validate(idParamSchema, 'params'),
  getTransactionHistory
);

export default router;
