import express from 'express';
import {
  createProductPacking,
  getProductPackings,
  getProductPackingById,
  getDefaultProductPacking,
  updateProductPacking,
  deleteProductPacking,
  convertPackingQuantity,
  calculatePackingCost,
  getPackingStats,
  createFromTemplate,
  updatePackingStock,
  adjustPackingStock,
  getLowStock,
} from '../controllers/productPackingController.js';

const router = express.Router();

// Create
router.post('/create', createProductPacking);
router.post('/create-from-template', createFromTemplate);

// Read
router.get('/product/:productId', getProductPackings);
router.get('/default/:productId', getDefaultProductPacking);
router.get('/stats/:productId', getPackingStats);
router.get('/low-stock/:productId', getLowStock);
router.get('/:id', getProductPackingById);

// Update
router.put('/update/:id', updateProductPacking);
router.put('/stock/:id', updatePackingStock);
router.post('/adjust-stock/:id', adjustPackingStock);

// Calculations
router.post('/convert', convertPackingQuantity);
router.post('/calculate-cost', calculatePackingCost);

// Delete
router.delete('/delete/:id', deleteProductPacking);

export default router;
