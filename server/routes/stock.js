import express from "express";
import authenticate from "../middleware/authenticate.js";
import StockReconciliationService from "../modules/accounting/services/StockReconciliationService.js";

const router = express.Router();

/**
 * POST /api/stock/reconciliation
 * Run stock reconciliation
 * Query params: type = 'check', 'heal', or 'quick'
 */
router.post("/reconciliation", authenticate, async (req, res) => {
  try {
    const { type = "check" } = req.query;
    const userId = req.user._id;

    if (!["check", "heal", "quick"].includes(type)) {
      return res.status(400).json({ error: "Invalid reconciliation type" });
    }

    let result;

    if (type === "check") {
      // Full reconciliation check
      result = await StockReconciliationService.reconcileAllStock({
        products: [],
        autoHeal: false,
        verbose: true
      });
    } else if (type === "heal") {
      // Reconciliation with auto-heal
      result = await StockReconciliationService.reconcileAllStock({
        products: [],
        autoHeal: true,
        verbose: true
      });
    } else if (type === "quick") {
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
    await logReconciliationActivity(userId, type, result);

    res.json(report);
  } catch (error) {
    console.error("Reconciliation error:", error);
    res.status(500).json({ error: error.message || "Reconciliation failed" });
  }
});

/**
 * POST /api/stock/reconciliation/product/:productId
 * Check specific product reconciliation
 */
router.post("/reconciliation/product/:productId", authenticate, async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await StockReconciliationService.reconcileProduct(
      productId,
      false,
      true
    );

    res.json(result);
  } catch (error) {
    console.error("Product reconciliation error:", error);
    res.status(500).json({ error: error.message || "Reconciliation failed" });
  }
});

/**
 * Log reconciliation activity to ActivityLog
 */
async function logReconciliationActivity(userId, type, result) {
  try {
    const ActivityLog = (await import("../Models/ActivityLog.js")).default;
    
    const action = type === "heal" ? "UPDATE" : "READ";
    
    await ActivityLog.create({
      userId,
      action,
      module: "accounting",
      resource: "Stock Reconciliation",
      description: `Stock reconciliation (${type}): ${result.reconciled} products checked, ${result.discrepancies} discrepancies found, ${result.healed} healed`,
      changes: {
        type,
        reconciled: result.reconciled,
        discrepancies: result.discrepancies,
        healed: result.healed,
        totalVariance: result.summary.variance
      }
    });
  } catch (err) {
    console.warn("Failed to log reconciliation activity:", err.message);
    // Don't fail the reconciliation if logging fails
  }
}

export default router;
