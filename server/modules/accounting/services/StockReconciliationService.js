import StockMovement from "../../../Models/StockMovement.js";
import CurrentStock from "../../../Models/CurrentStock.js";
import AddProduct from "../../../Models/AddProduct.js";
import UniversalStockRecalculationService from "./UniversalStockRecalculationService.js";

/**
 * STOCK RECONCILIATION SERVICE
 * 
 * Recalculates running balances from scratch and identifies discrepancies
 * 
 * Features:
 * ✅ Recalculate all balances fresh
 * ✅ Compare with current data
 * ✅ Identify discrepancies
 * ✅ Generate reconciliation report
 * ✅ Heal data if needed
 */

class StockReconciliationService {
  /**
   * FULL RECONCILIATION
   * Check all products, recalculate, identify discrepancies
   * 
   * @param {Object} options - { products: [], autoHeal: false, verbose: true }
   * @returns {Promise<Object>} - Reconciliation report
   */
  static async reconcileAllStock(options = {}) {
    const {
      products = [],  // Empty = all products
      autoHeal = false,
      verbose = true
    } = options;

    try {
      console.log(`\n📊 STOCK RECONCILIATION STARTED`);
      console.log(`   Auto-heal: ${autoHeal ? '✅' : '❌'}`);
      console.log(`   Verbose: ${verbose ? '✅' : '❌'}\n`);

      // Get products to reconcile
      let productList = products;
      if (productList.length === 0) {
        productList = await AddProduct.find({}).select("_id itemcode");
        console.log(`   Found ${productList.length} products to reconcile`);
      }

      const report = {
        timestamp: new Date(),
        totalProducts: productList.length,
        reconciled: 0,
        discrepancies: 0,
        healed: 0,
        errors: 0,
        details: [],
        summary: {
          totalCurrentStock: 0,
          totalMovements: 0,
          totalCalculatedBalance: 0,
          variance: 0
        }
      };

      // Reconcile each product
      for (const product of productList) {
        try {
          const result = await this.reconcileProduct(
            product._id,
            autoHeal,
            verbose
          );

          report.details.push(result);
          report.reconciled++;

          if (result.hasDiscrepancy) {
            report.discrepancies++;
          }
          if (result.healed) {
            report.healed++;
          }

          report.summary.totalCurrentStock += result.currentStock?.totalQuantity || 0;
          report.summary.totalMovements += result.totalMovements;
          report.summary.totalCalculatedBalance += result.calculatedBalance;

        } catch (err) {
          console.error(`❌ Product ${product.itemcode}:`, err.message);
          report.errors++;
          report.details.push({
            productId: product._id.toString(),
            itemcode: product.itemcode,
            success: false,
            error: err.message
          });
        }
      }

      // Calculate variance
      report.summary.variance = 
        report.summary.totalCurrentStock - report.summary.totalCalculatedBalance;

      console.log(`\n✅ RECONCILIATION COMPLETE`);
      console.log(`   Reconciled: ${report.reconciled}`);
      console.log(`   Discrepancies found: ${report.discrepancies}`);
      console.log(`   Healed: ${report.healed}`);
      console.log(`   Errors: ${report.errors}`);
      console.log(`   Total variance: ${report.summary.variance}`);

      return report;

    } catch (error) {
      console.error("❌ Reconciliation error:", error);
      throw error;
    }
  }

  /**
   * RECONCILE SINGLE PRODUCT
   * Recalculate balance for one product and check for discrepancies
   * 
   * @param {ObjectId} productId
   * @param {boolean} autoHeal - Heal if discrepancy found
   * @param {boolean} verbose - Detailed logging
   * @returns {Promise<Object>} - Product reconciliation result
   */
  static async reconcileProduct(productId, autoHeal = false, verbose = true) {
    try {
      // Step 1: Get all movements for this product
      const movements = await StockMovement.find({ productId })
        .sort({ documentDate: 1, createdAt: 1 })
        .lean();

      // Step 2: Recalculate balance from scratch
      let calculatedBalance = 0;
      const recalculatedMovements = [];

      for (const movement of movements) {
        calculatedBalance += movement.quantity;
        recalculatedMovements.push({
          id: movement._id,
          oldBalance: movement.newStock,
          calculatedBalance: calculatedBalance,
          qty: movement.quantity,
          type: movement.movementType
        });
      }

      // Step 3: Get current stock
      const currentStock = await CurrentStock.findOne({ productId });
      const product = await AddProduct.findById(productId).select("itemcode");

      // Step 4: Compare
      const currentTotalQty = currentStock?.totalQuantity || 0;
      const hasDiscrepancy = currentTotalQty !== calculatedBalance;
      const variance = currentTotalQty - calculatedBalance;

      const result = {
        productId: productId.toString(),
        itemcode: product?.itemcode || "Unknown",
        totalMovements: movements.length,
        currentStock: {
          totalQuantity: currentTotalQty,
          availableQuantity: currentStock?.availableQuantity,
          grnReceivedQuantity: currentStock?.grnReceivedQuantity
        },
        calculatedBalance: calculatedBalance,
        hasDiscrepancy,
        variance,
        discrepancyPercent: calculatedBalance > 0 
          ? ((variance / calculatedBalance) * 100).toFixed(2) 
          : 0,
        healed: false,
        movements: recalculatedMovements.length > 0 ? recalculatedMovements.slice(-5) : []
      };

      // Step 5: Verbose logging
      if (verbose) {
        console.log(`\n📦 ${product?.itemcode || productId}`);
        console.log(`   Movements: ${movements.length}`);
        console.log(`   Current: ${currentTotalQty}`);
        console.log(`   Calculated: ${calculatedBalance}`);
        
        if (hasDiscrepancy) {
          console.log(`   ⚠️ DISCREPANCY: ${variance > 0 ? '+' : ''}${variance} (${result.discrepancyPercent}%)`);
        } else {
          console.log(`   ✅ Match`);
        }
      }

      // Step 6: Auto-heal if needed
      if (autoHeal && hasDiscrepancy) {
        try {
          await UniversalStockRecalculationService.recalculateFullProduct(
            productId,
            "SYSTEM_RECONCILIATION"
          );
          result.healed = true;
          console.log(`   ✅ Healed successfully`);
        } catch (healErr) {
          console.log(`   ⚠️ Heal failed: ${healErr.message}`);
          result.healError = healErr.message;
        }
      }

      return result;

    } catch (error) {
      console.error(`❌ Reconciliation error for ${productId}:`, error);
      throw error;
    }
  }

  /**
   * GENERATE RECONCILIATION REPORT
   * Format reconciliation data for export/display
   * 
   * @param {Object} reconciliationData - Report from reconcileAllStock()
   * @returns {Object} - Formatted report
   */
  static generateReport(reconciliationData) {
    const report = {
      title: "Stock Reconciliation Report",
      timestamp: reconciliationData.timestamp,
      summary: {
        totalProducts: reconciliationData.totalProducts,
        reconciled: reconciliationData.reconciled,
        discrepancies: reconciliationData.discrepancies,
        discrepancyRate: `${((reconciliationData.discrepancies / reconciliationData.reconciled) * 100).toFixed(2)}%`,
        healed: reconciliationData.healed,
        errors: reconciliationData.errors
      },
      financialImpact: {
        totalCurrentStock: reconciliationData.summary.totalCurrentStock,
        totalCalculatedBalance: reconciliationData.summary.totalCalculatedBalance,
        totalVariance: reconciliationData.summary.variance,
        variance_percent: `${
          reconciliationData.summary.totalCalculatedBalance > 0
            ? ((reconciliationData.summary.variance / reconciliationData.summary.totalCalculatedBalance) * 100).toFixed(2)
            : 0
        }%`
      },
      discrepancies: reconciliationData.details
        .filter(d => d.hasDiscrepancy && !d.error)
        .map(d => ({
          product: d.itemcode,
          productId: d.productId,
          current: d.currentStock.totalQuantity,
          calculated: d.calculatedBalance,
          variance: d.variance,
          variance_percent: d.discrepancyPercent,
          status: d.healed ? 'HEALED' : 'DISCREPANCY'
        })),
      okProducts: reconciliationData.details
        .filter(d => !d.hasDiscrepancy && !d.error)
        .length,
      errors: reconciliationData.details
        .filter(d => d.error)
        .map(d => ({
          product: d.itemcode || d.productId,
          error: d.error
        }))
    };

    return report;
  }

  /**
   * EXPORT RECONCILIATION REPORT
   * Convert to JSON/CSV format
   * 
   * @param {Object} report - Formatted report
   * @param {string} format - 'json' or 'csv'
   * @returns {string} - Formatted data
   */
  static exportReport(report, format = 'json') {
    if (format === 'json') {
      return JSON.stringify(report, null, 2);
    }

    if (format === 'csv') {
      let csv = "Product,Current Stock,Calculated,Variance,Variance %,Status\n";
      
      report.discrepancies.forEach(row => {
        csv += `"${row.product}",${row.current},${row.calculated},${row.variance},${row.variance_percent},${row.status}\n`;
      });

      return csv;
    }

    return JSON.stringify(report);
  }
}

export default StockReconciliationService;
