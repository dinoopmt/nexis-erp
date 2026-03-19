import express from 'express';
import {
  createBatch,
  getBatchesByProduct,
  getExpiringBatches,
  getExpiredBatches,
  consumeBatchQuantity,
  updateBatch,
  deleteBatch,
  getBatchStats,
  getFIFOBatch,
  getLowStockBatches,
  getBatchByNumber,
} from '../controllers/stockBatchController.js';

const router = express.Router();

/**
 * Stock Batch Routes
 * Base path: /api/v1/stock-batches
 */

// Create new batch
router.post('/', createBatch);

// Get all batches for a product
router.get('/product/:productId', getBatchesByProduct);

// Get batches expiring within X days
router.get('/expiring/list', getExpiringBatches);

// Get expired batches
router.get('/expired/list', getExpiredBatches);

// Get batches with low stock
router.get('/low-stock/list', getLowStockBatches);

// Get batch statistics for product
router.get('/stats/:productId', getBatchStats);

// Get FIFO batch for product
router.get('/fifo/:productId', getFIFOBatch);

// Get specific batch by number
router.get('/:productId/batch/:batchNumber', getBatchByNumber);

// Consume batch quantity
router.post('/:batchId/consume', consumeBatchQuantity);

// Update batch
router.put('/:batchId', updateBatch);

// Delete batch
router.delete('/:batchId', deleteBatch);

export default router;
