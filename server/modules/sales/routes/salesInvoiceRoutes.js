import express from 'express';
import { createSalesInvoice, getSalesInvoices, getSalesInvoiceById, updateSalesInvoice, deleteSalesInvoice, getNextInvoiceNumber, getInvoicesByCustomer } from '../controllers/salesInvoiceController.js';
import { validate, createSalesInvoiceSchema, updateSalesInvoiceSchema } from '../../../middleware/validators/schemaValidator.js';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const idParamSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid MongoDB ObjectId'),
});

// Auto invoice number endpoint
router.get('/nextInvoiceNumber', getNextInvoiceNumber);

// Create - with full validation
router.post('/createSalesInvoice', validate(createSalesInvoiceSchema, 'body'), createSalesInvoice);

// List - no validation needed
router.get('/getSalesInvoices', getSalesInvoices);

// ✅ NEW: Get invoices by customer ID (for Sales Return invoice lookup)
router.get('/getInvoicesByCustomer/:customerId', getInvoicesByCustomer);

// Get by ID - validate ID parameter
router.get('/getSalesInvoiceById/:id', validate(idParamSchema, 'params'), getSalesInvoiceById);

// Update - validate ID and body
router.put('/updateSalesInvoice/:id', validate(idParamSchema, 'params'), validate(updateSalesInvoiceSchema, 'body'), updateSalesInvoice);

// Delete - validate ID parameter
router.delete('/deleteSalesInvoice/:id', validate(idParamSchema, 'params'), deleteSalesInvoice);

export default router;
    