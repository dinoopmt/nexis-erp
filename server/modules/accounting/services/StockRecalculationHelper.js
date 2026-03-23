import CurrentStock from "../../../Models/CurrentStock.js";

/**
 * StockRecalculationHelper
 * 
 * Provides universal Phase 1.5 recalculation for all stock operations
 * Ensures availableQuantity is always calculated from formula:
 * availableQuantity = totalQuantity - allocatedQuantity - damageQuality
 * 
 * Used by:
 * - GRNStockUpdateService (GRN posting)
 * - GRNEditManager (GRN editing)
 * - RTVService (RTV)
 * - SalesService (Sales)
 * - SalesReturnService (Sales Return)
 * - InventoryAdjustmentService (Adjustments)
 * - ReconciliationService (Physical count)
 * 
 * Rule: After ANY $inc operation, always call recalculateAvailableQuantity()
 */

class StockRecalculationHelper {
  /**
   * Recalculate availableQuantity for one or more products
   * 
   * ✅ PHASE 1.5 implementation for all stock operations
   * - Gets current values for totalQuantity, allocatedQuantity, damageQuality
   * - Calculates correct availableQuantity using formula
   * - Updates if different from stored value
   * - Supports MongoDB session for transaction consistency
   * 
   * @param {Array<string>|string} productIds - Single product ID or array
   * @param {Object} options
   * @param {string} options.operation - Context (GRN_POST, GRN_EDIT, RTV, SALES, etc.)
   * @param {boolean} options.verbose - Log each correction
   * @param {Object} options.session - MongoDB session for transaction context (optional)
   * @returns {Promise<Object>} - { processed: n, corrected: n, errors: [] }
   */
  static async recalculateAvailableQuantity(productIds, options = {}) {
    try {
      const { operation = 'OPERATION', verbose = false, session = null } = options;

      // Normalize to array
      const ids = Array.isArray(productIds) ? productIds : [productIds];

      const result = {
        operation,
        processed: 0,
        corrected: 0,
        corrections: [],
        errors: []
      };

      for (const productId of ids) {
        try {
          // READ with session to ensure transaction consistency
          const findOpts = session ? { session } : {};
          const stock = await CurrentStock.findOne({ productId }, null, findOpts);
          
          if (!stock) {
            result.errors.push({
              productId,
              error: 'CurrentStock record not found'
            });
            continue;
          }

          // ✅ Apply formula: availableQuantity = totalQuantity - allocatedQuantity - damageQuality
          const correctedAvailable = Math.max(
            0,
            stock.totalQuantity - stock.allocatedQuantity - stock.damageQuality
          );

          result.processed++;

          // Update only if different
          if (correctedAvailable !== stock.availableQuantity) {
            const oldValue = stock.availableQuantity;
            
            // UPDATE with session to ensure transaction consistency
            const updateOpts = session ? { session } : {};
            await CurrentStock.updateOne(
              { productId },
              { $set: { availableQuantity: correctedAvailable } },
              updateOpts
            );

            result.corrected++;
            result.corrections.push({
              productId: productId.toString(),
              before: oldValue,
              after: correctedAvailable,
              formula: `${stock.totalQuantity} - ${stock.allocatedQuantity} - ${stock.damageQuality}`
            });

            if (verbose) {
              console.log(`   📐 [${operation}] Product ${productId}: ${oldValue} → ${correctedAvailable}`);
            }
          }

        } catch (itemError) {
          result.errors.push({
            productId,
            error: itemError.message
          });
        }
      }

      if (verbose) {
        console.log(`✅ [PHASE 1.5] ${operation}: ${result.corrected} of ${result.processed} corrected`);
      }

      return result;

    } catch (error) {
      console.error(`❌ StockRecalculationHelper error:`, error);
      throw error;
    }
  }

  /**
   * Batch recalculate after multiple products updated
   * More efficient than calling recalculateAvailableQuantity multiple times
   * 
   * @param {Array<string>} productIds
   * @param {string} operation - Context for logging
   * @param {Object} session - MongoDB session for transaction context (optional)
   * @returns {Promise<Object>} - Summary result
   */
  static async batchRecalculate(productIds, operation, session = null) {
    // Remove duplicates and filter empty values
    const uniqueIds = [...new Set(productIds.map(id => id.toString()))].filter(Boolean);

    if (uniqueIds.length === 0) {
      return {
        operation,
        processed: 0,
        corrected: 0,
        corrections: [],
        errors: []
      };
    }

    return this.recalculateAvailableQuantity(uniqueIds, { 
      operation,
      session,  // Pass session for transaction consistency
      verbose: uniqueIds.length <= 10  // Be verbose only for small batches
    });
  }

  /**
   * Recalculate AND recalculate averageCost for products with totalCost
   * 
   * @param {Array<string>} productIds
   * @param {string} operation
   * @returns {Promise<Object>} - Combined results
   */
  static async recalculateAvailableAndCost(productIds, operation) {
    const uniqueIds = [...new Set(productIds.map(id => id.toString()))].filter(Boolean);

    const result = {
      operation,
      available: { processed: 0, corrected: 0, corrections: [] },
      cost: { processed: 0, corrected: 0, corrections: [] },
      errors: []
    };

    for (const productId of uniqueIds) {
      try {
        const stock = await CurrentStock.findOne({ productId });
        if (!stock) continue;

        // Recalculate availableQuantity
        const correctedAvailable = Math.max(
          0,
          stock.totalQuantity - stock.allocatedQuantity - stock.damageQuality
        );

        if (correctedAvailable !== stock.availableQuantity) {
          result.available.corrected++;
          result.available.corrections.push({
            productId: productId.toString(),
            before: stock.availableQuantity,
            after: correctedAvailable
          });
        }

        // Recalculate averageCost
        let correctedCost = 0;
        if (stock.totalQuantity > 0) {
          correctedCost = stock.totalCost / stock.totalQuantity;
        }

        if (Math.abs(correctedCost - stock.averageCost) > 0.01) {
          result.cost.corrected++;
          result.cost.corrections.push({
            productId: productId.toString(),
            before: stock.averageCost,
            after: correctedCost
          });
        }

        // Update both if needed
        const updates = {};
        if (correctedAvailable !== stock.availableQuantity) {
          updates.availableQuantity = correctedAvailable;
        }
        if (Math.abs(correctedCost - stock.averageCost) > 0.01) {
          updates.averageCost = correctedCost;
        }

        if (Object.keys(updates).length > 0) {
          await CurrentStock.updateOne({ productId }, { $set: updates });
        }

        result.available.processed++;
        result.cost.processed++;

      } catch (itemError) {
        result.errors.push({
          productId,
          error: itemError.message
        });
      }
    }

    return result;
  }
}

export default StockRecalculationHelper;
