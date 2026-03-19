import express from 'express';
import { createSalesReturn, getSalesReturns, getSalesReturnById, updateSalesReturn, deleteSalesReturn, getNextReturnNumber } from '../controllers/salesReturnController.js';
const router = express.Router();

// Auto return number endpoint
router.get('/nextReturnNumber', getNextReturnNumber);

router.post('/createSalesReturn', createSalesReturn);
router.get('/getSalesReturns', getSalesReturns);
router.get('/getSalesReturnById/:id', getSalesReturnById);
router.put('/updateSalesReturn/:id', updateSalesReturn);
router.delete('/deleteSalesReturn/:id', deleteSalesReturn);

export default router;
