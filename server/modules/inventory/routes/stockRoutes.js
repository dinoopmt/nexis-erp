import express from 'express';
import {
  getCurrentStock,
  stockIn,
  stockOut,
  adjustStock,
  getStockHistory
} from '../controllers/stockController.js';

const router = express.Router();

// ================= STOCK TRACKING ROUTES =================

/**
 * GET /api/stock/current/:productId
 * Get current stock level and batch details
 */
router.get('/current/:productId', getCurrentStock);

/**
 * POST /api/stock/inbound
 * Record stock inbound (purchase receipt)
 * Body: { productId, quantity, purchasePrice, vendorId, batchNumber, purchaseOrderNo, expiryDate }
 */
router.post('/inbound', stockIn);

/**
 * POST /api/stock/outbound
 * Record stock outbound (sales/issuance)
 * Body: { items: [{productId, quantity}], saleInvoiceId, saleInvoiceNo }
 */
router.post('/outbound', stockOut);

/**
 * POST /api/stock/adjustment
 * Adjust stock manually (damage, loss, count variance)
 * Body: { productId, quantity, reason, notes, referenceNumber }
 */
router.post('/adjustment', adjustStock);

/**
 * GET /api/stock/history/:productId
 * Get stock movement history for a product
 * Query: ?startDate=2026-01-01&endDate=2026-12-31&movementType=OUTBOUND
 */
router.get('/history/:productId', getStockHistory);

export default router;
