import express from 'express';
import * as costingController from '../controllers/costingController.js';

const router = express.Router();

// ==================== Inventory Batch Routes ====================

// Get all batches
router.get('/batches', costingController.getAllBatches);

// Get single batch
router.get('/batches/:id', costingController.getBatchById);

// Create batch
router.post('/batches', costingController.createBatch);

// Update batch
router.put('/batches/:id', costingController.updateBatch);

// Delete batch
router.delete('/batches/:id', costingController.deleteBatch);

// ==================== Costing Calculation Routes ====================

// Calculate cost using specific method
router.post('/calculate', costingController.calculateCost);

// Compare all three methods
router.post('/compare', costingController.compareMethods);

// ==================== Configuration Routes ====================

// Get costing method configuration for company
router.get('/config/:companyId', costingController.getCostingMethod);

// Update costing method configuration
router.put('/config/:companyId', costingController.updateCostingMethod);

// ==================== Analysis Routes ====================

// ABC Analysis
router.get('/analysis/abc', costingController.getABCAnalysis);

// Inventory Valuation
router.get('/analysis/valuation', costingController.getInventoryValuation);

export default router;
