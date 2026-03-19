import express from 'express';
import { 
  getNextOrderNumber,
  createSalesOrder, 
  getSalesOrders, 
  getSalesOrderById, 
  updateSalesOrder,
  updateOrderStatus,
  deleteSalesOrder 
} from '../controllers/salesOrderController.js';

const router = express.Router();

// Get next order number
router.get('/nextOrderNumber', getNextOrderNumber);

// Order operations
router.post('/createSalesOrder', createSalesOrder);
router.get('/getSalesOrders', getSalesOrders);
router.get('/getSalesOrderById/:id', getSalesOrderById);
router.put('/updateSalesOrder/:id', updateSalesOrder);
router.put('/updateStatus/:id', updateOrderStatus);
router.delete('/deleteSalesOrder/:id', deleteSalesOrder);

export default router;
