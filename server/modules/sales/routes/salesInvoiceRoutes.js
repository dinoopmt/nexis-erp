import express from 'express';
import { createSalesInvoice, getSalesInvoices, getSalesInvoiceById, updateSalesInvoice, deleteSalesInvoice, getNextInvoiceNumber } from '../controllers/salesInvoiceController.js';
const router = express.Router();
// Auto invoice number endpoint
router.get('/nextInvoiceNumber', getNextInvoiceNumber);

router.post('/createSalesInvoice', createSalesInvoice);        // Create
router.get('/getSalesInvoices', getSalesInvoices);           // List
router.get('/getSalesInvoiceById/:id', getSalesInvoiceById);     // Get by ID
router.put('/updateSalesInvoice/:id', updateSalesInvoice);      // Update
router.delete('/deleteSalesInvoice/:id', deleteSalesInvoice);   // Delete



export default router;
    