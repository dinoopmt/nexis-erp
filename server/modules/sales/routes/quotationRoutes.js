import express from 'express';
import { 
  createQuotation, 
  getQuotations, 
  getQuotationById, 
  updateQuotation, 
  deleteQuotation, 
  getNextQuotationNumber,
  updateQuotationStatus 
} from '../controllers/quotationController.js';

const router = express.Router();

// Auto quotation number endpoint
router.get('/nextQuotationNumber', getNextQuotationNumber);

router.post('/createQuotation', createQuotation);        // Create
router.get('/getQuotations', getQuotations);            // List all
router.get('/getQuotationById/:id', getQuotationById);  // Get by ID
router.put('/updateQuotation/:id', updateQuotation);    // Update
router.put('/updateStatus/:id', updateQuotationStatus); // Update status
router.delete('/deleteQuotation/:id', deleteQuotation); // Delete

export default router;
