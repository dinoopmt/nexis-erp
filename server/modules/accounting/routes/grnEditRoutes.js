/**
 * GRN Edit Routes
 * Endpoints for managing GRN edits before and after posting
 */

import express from 'express';
import GRNEditManager from '../services/GRNEditManager.js';
import GRNTransactionValidator from '../services/GRNTransactionValidator.js';
import { authenticateToken } from '../../auth/middleware.js';

const router = express.Router();

/**
 * GET /api/grn/:id/editability
 * Check if a GRN can be edited
 */
router.get('/:id/editability', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await GRNEditManager.validateEditability(id);

    res.json(result);

  } catch (error) {
    console.error('❌ Editability check error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/grn/:id/edit-draft
 * Edit Draft GRN (before posting)
 * Body: { items, grnDate, vendorId, ... }
 */
router.patch('/:id/edit-draft', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const result = await GRNEditManager.editDraftGRN(id, updates, userId);

    res.json({
      success: true,
      message: 'Draft GRN updated successfully',
      grn: result
    });

  } catch (error) {
    console.error('❌ Draft edit error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PATCH /api/grn/:id/edit-posted
 * Edit Posted GRN (after posting)
 * 
 * Body: {
 *   itemUpdates: [{ productId, quantity, cost }],
 *   reason: "Quantity correction due to..."
 * }
 */
router.patch('/:id/edit-posted', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { itemUpdates, reason } = req.body;

    console.log(`\n${'='.repeat(80)}`);
    console.log(`📝 [GRN EDIT REQUEST] Starting edit for GRN ID: ${id}`);
    console.log(`   User: ${userId}`);
    console.log(`   Reason: ${reason || 'No reason provided'}`);
    console.log(`   Item Updates: ${itemUpdates?.length || 0} items`);
    if (itemUpdates && itemUpdates.length > 0) {
      itemUpdates.forEach((item, idx) => {
        console.log(`     [${idx+1}] ProductId: ${item.productId}, Qty: ${item.quantity}, Cost: ${item.unitCost}`);
      });
    }
    console.log(`${'='.repeat(80)}\n`);

    if (!itemUpdates || !Array.isArray(itemUpdates) || itemUpdates.length === 0) {
      console.error('❌ Validation failed: itemUpdates missing or empty');
      return res.status(400).json({ error: 'itemUpdates array is required and must not be empty' });
    }

    console.log(`✅ [VALIDATION] Request parameters valid, calling editPostedGRN...\n`);
    const result = await GRNEditManager.editPostedGRN(
      id,
      { itemUpdates, reason },
      userId
    );

    console.log(`\n✅ [SUCCESS] Edit completed`);
    console.log(`   GRN: ${result.grn.grnNumber}`);
    console.log(`   Net Stock Change: ${result.summary.netStockChange}`);
    console.log(`   Net Cost Change: ${result.summary.netCostChange}`);
    console.log(`   Related Collections Updated: ${Object.keys(result.relatedCollections).length} types`);
    console.log(`${'='.repeat(80)}\n`);

    res.json({
      success: true,
      message: 'Posted GRN edited successfully with stock management',
      grn: result.grn,
      summary: result.summary,
      relatedCollections: result.relatedCollections
    });

  } catch (error) {
    console.error(`\n❌ [ERROR] Posted edit failed:`);
    console.error(`   Message: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    console.error(`${'='.repeat(80)}\n`);
    res.status(400).json({ error: error.message, details: error.stack });
  }
});

/**
 * DELETE /api/grn/:id/line-items
 * Delete specific line items from GRN
 * 
 * Body: {
 *   productIds: ["id1", "id2"],
 *   reason: "Item no longer needed"
 * }
 */
router.delete('/:id/line-items', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { productIds, reason } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'productIds array is required' });
    }

    const result = await GRNEditManager.deleteLineItems(
      id,
      productIds,
      reason || 'Deleted by user',
      userId
    );

    res.json({
      success: true,
      message: `${result.deletedCount} line items deleted`,
      grn: result.updatedGRN,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('❌ Delete items error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/grn/:id/line-items/add
 * Add new line items to existing GRN
 * 
 * Body: {
 *   items: [
 *     { productId: "...", quantity: 10, cost: 100 },
 *     { productId: "...", quantity: 5, cost: 50 }
 *   ]
 * }
 */
router.post('/:id/line-items/add', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required and must not be empty' });
    }

    const result = await GRNEditManager.addLineItems(id, items, userId);

    res.json({
      success: true,
      message: `${result.addedItems.length} items added to GRN`,
      grn: result.updatedGRN,
      addedItems: result.addedItems
    });

  } catch (error) {
    console.error('❌ Add items error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/grn/:id/edit-history
 * Get complete edit history for a GRN
 */
router.get('/:id/edit-history', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const history = await GRNEditManager.getEditHistory(id);

    res.json({
      success: true,
      grnId: id,
      editCount: history.length,
      history
    });

  } catch (error) {
    console.error('❌ History fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/grn/:id/transaction-summary
 * Get transaction dependencies for a GRN (why it can/cannot be edited)
 * 
 * Shows:
 * - Vendor payment status
 * - Stock consumption details
 * - RTV return details
 * 
 * Useful for explaining to user why edit is blocked
 */
router.get('/:id/transaction-summary', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const summary = await GRNTransactionValidator.getTransactionSummary(id);

    res.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('❌ Transaction summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/grn/:id/transaction-dependencies
 * Get detailed transaction check (for debugging/admin)
 */
router.get('/:id/transaction-dependencies', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const check = await GRNTransactionValidator.checkTransactionDependencies(id);

    res.json({
      success: true,
      check
    });

  } catch (error) {
    console.error('❌ Transaction dependencies error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
