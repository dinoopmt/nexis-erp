import express from 'express';
import { createSalesInvoice, getSalesInvoices, getSalesInvoiceById, updateSalesInvoice, deleteSalesInvoice, getNextInvoiceNumber, getInvoicesByCustomer } from '../controllers/salesInvoiceController.js';
import { validate, createSalesInvoiceSchema, updateSalesInvoiceSchema } from '../../../middleware/validators/schemaValidator.js';
import { authenticateToken } from '../../../middleware/index.js';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const idParamSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid MongoDB ObjectId'),
});

// Auto invoice number endpoint
router.get('/nextInvoiceNumber', getNextInvoiceNumber);

// Create - with full validation and authentication
router.post('/createSalesInvoice', authenticateToken, validate(createSalesInvoiceSchema, 'body'), createSalesInvoice);

// List - with authentication
router.get('/getSalesInvoices', authenticateToken, getSalesInvoices);

// ✅ NEW: Get invoices by customer ID (for Sales Return invoice lookup)
router.get('/getInvoicesByCustomer/:customerId', authenticateToken, getInvoicesByCustomer);

// Get by ID - validate ID parameter and authenticate
router.get('/getSalesInvoiceById/:id', authenticateToken, validate(idParamSchema, 'params'), getSalesInvoiceById);

// Update - validate ID and body with authentication
router.put('/updateSalesInvoice/:id', authenticateToken, validate(idParamSchema, 'params'), validate(updateSalesInvoiceSchema, 'body'), updateSalesInvoice);

// Delete - validate ID parameter with authentication
router.delete('/deleteSalesInvoice/:id', authenticateToken, validate(idParamSchema, 'params'), deleteSalesInvoice);

export default router;
    