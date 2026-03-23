import express from 'express';
import {
  getCurrentStock,
  stockIn,
  stockOut,
  adjustStock,
  getStockHistory
} from '../controllers/stockController.js';
import { authenticateToken } from '../../../middleware/index.js';
import StockReconciliationService from '../../accounting/services/StockReconciliationService.js';
import ActivityLog from '../../../Models/ActivityLog.js';

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

// ================= STOCK RECONCILIATION ROUTES =================

/**
 * POST /api/stock/reconciliation
 * Run stock reconciliation
 * Query params: type = 'check', 'heal', or 'quick'
 */
router.post('/reconciliation', authenticateToken, async (req, res) => {
  try {
    const { type = 'check' } = req.query;
    const userId = req.user._id;

    if (!['check', 'heal', 'quick'].includes(type)) {
      return res.status(400).json({ error: 'Invalid reconciliation type' });
    }

    let result;

    if (type === 'check') {
      // Full reconciliation check
      result = await StockReconciliationService.reconcileAllStock({
        products: [],
        autoHeal: false,
        verbose: true
      });
    } else if (type === 'heal') {
      // Reconciliation with auto-heal
      result = await StockReconciliationService.reconcileAllStock({
        products: [],
        autoHeal: true,
        verbose: true
      });
    } else if (type === 'quick') {
      // Quick check - just top discrepancies
      result = await StockReconciliationService.reconcileAllStock({
        products: [],
        autoHeal: false,
        verbose: false
      });
    }

    // Generate formatted report
    const report = StockReconciliationService.generateReport(result);

    // Log this action to ActivityLog
    try {
      await ActivityLog.create({
        userId,
        action: type === 'heal' ? 'UPDATE' : 'READ',
        module: 'inventory',
        resource: 'Stock Reconciliation',
        description: `Stock reconciliation (${type}): ${result.reconciled} products checked, ${result.discrepancies} discrepancies found, ${result.healed} healed`,
        changes: {
          type,
          reconciled: result.reconciled,
          discrepancies: result.discrepancies,
          healed: result.healed,
          totalVariance: result.summary.variance
        }
      });
    } catch (logErr) {
      console.warn('Failed to log reconciliation activity:', logErr.message);
    }

    res.json(report);
  } catch (error) {
    console.error('Reconciliation error:', error);
    res.status(500).json({ error: error.message || 'Reconciliation failed' });
  }
});

/**
 * POST /api/stock/reconciliation/product/:productId
 * Check specific product reconciliation
 */
router.post('/reconciliation/product/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await StockReconciliationService.reconcileProduct(
      productId,
      false,
      true
    );

    res.json(result);
  } catch (error) {
    console.error('Product reconciliation error:', error);
    res.status(500).json({ error: error.message || 'Reconciliation failed' });
  }
});

export default router;
