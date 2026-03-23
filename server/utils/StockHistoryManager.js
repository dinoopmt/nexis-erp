import StockMovement from "../Models/StockMovement.js";
import CurrentStock from "../Models/CurrentStock.js";

/**
 * StockHistoryManager
 * Centralized utility for tracking stock movements in StockMovement collection
 * Ensures consistent audit trail across all stock operations (GRN, RTV, Sales, Adjustments)
 * 
 * NOTE: UPDATE HISTORY IS NO LONGER STORED IN CURRENTSTOCK
 * Reason: Unbounded array growth causes performance issues after 2-3 months
 * Solution: All history is tracked here in StockMovement collection instead
 */

class StockHistoryManager {
  /**
   * Record a stock movement in StockMovement collection
   * This is the ONLY place for audit trail tracking
   * 
   * @param {Object} data
   * @param {ObjectId} data.productId
   * @param {ObjectId} data.batchId
   * @param {ObjectId} data.grnId - ✅ Link to GRN for full traceability
   * @param {string} data.movementType - INBOUND, OUTBOUND, ADJUSTMENT, RETURN
   * @param {number} data.quantity
   * @param {number} data.unitCost
   * @param {string} data.reference - Document number (GRN-2026-001, SALES-2026-001, etc.)
   * @param {ObjectId} data.referenceId - Document ID (_id from GRN, Sales, etc.)
   * @param {string} data.referenceType - SALES_INVOICE, PURCHASE_ORDER, STOCK_ADJUSTMENT, RETURN
   * @param {string} data.costingMethodUsed - FIFO, LIFO, WAC
   * @param {Date} data.documentDate
   * @param {ObjectId} data.createdBy
   * @param {string} data.reasonCode - DAMAGE, LOSS, EXPIRY, QUALITY, OTHER (for adjustments)
   * @param {string} data.notes
   * @returns {Promise<Object>} - Created StockMovement document
   */
  static async recordMovement(data) {
    try {
      const movement = new StockMovement({
        productId: data.productId,
        batchId: data.batchId,
        grnId: data.grnId,  // ✅ ADD: Link to GRN for traceability
        movementType: data.movementType,
        quantity: data.quantity,
        unitCost: data.unitCost,
        totalAmount: data.quantity * data.unitCost,
        reference: data.reference,
        referenceId: data.referenceId,
        referenceType: data.referenceType,
        costingMethodUsed: data.costingMethodUsed,
        documentDate: data.documentDate || new Date(),
        rationCode: data.reasonCode,
        createdBy: data.createdBy,
        notes: data.notes,
        createdAt: new Date()
      });

      const saved = await movement.save();
      console.log(`✅ Stock movement recorded: ${data.reference} - ${data.quantity} units`);
      return saved;

    } catch (error) {
      console.error("❌ Error recording stock movement:", error);
      throw error;
    }
  }

  /**
   * Update CurrentStock lastActivity field
   * Lightweight snapshot for quick UI reference (last transaction only)
   * 
   * @param {Object} data
   * @param {ObjectId} data.productId
   * @param {string} data.type - GRN, RTV, SALES, SALES_RETURN, ADJUSTMENT
   * @param {ObjectId} data.referenceId
   * @param {string} data.reference - Document number
   * @param {number} data.quantityChange
   * @returns {Promise<Object>} - Updated CurrentStock
   */
  static async updateLastActivity(data) {
    try {
      const updated = await CurrentStock.findOneAndUpdate(
        { productId: data.productId },
        {
          $set: {
            lastActivity: {
              timestamp: new Date(),
              type: data.type,
              referenceId: data.referenceId,
              reference: data.reference,
              description: `${data.type} ${data.reference} - ${data.quantityChange} units`
            }
          }
        },
        { returnDocument: 'after' }
      );

      return updated;

    } catch (error) {
      console.error("❌ Error updating lastActivity:", error);
      throw error;
    }
  }

  /**
   * Get complete history for a product (from StockMovement)
   * ✅ Efficient - only loads history documents, not the main stock doc
   * 
   * @param {ObjectId} productId
   * @param {Object} options
   * @param {number} options.days - Number of days to look back (default: 90)
   * @param {number} options.limit - Max records to return (default: 100)
   * @param {string} options.type - Filter by movement type (INBOUND, OUTBOUND, etc.)
   * @returns {Promise<Array>} - Array of movements
   */
  static async getProductHistory(productId, options = {}) {
    try {
      const { days = 90, limit = 100, type = null } = options;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const query = {
        productId: productId,
        createdAt: { $gte: startDate }
      };

      if (type) {
        query.movementType = type;
      }

      const history = await StockMovement.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('batchId', 'batchNumber expiryDate')
        .populate('createdBy', 'name');

      return history;

    } catch (error) {
      console.error("❌ Error fetching product history:", error);
      throw error;
    }
  }

  /**
   * Get product activity for dashboard
   * ✅ Uses lastActivity field (lightweight)
   * 
   * @param {ObjectId} productId
   * @returns {Promise<Object>} - Last activity record
   */
  static async getLastActivity(productId) {
    try {
      const stock = await CurrentStock.findOne({ productId })
        .select('lastActivity lastGrnDate lastSaleDate lastAdjustmentDate');

      return stock?.lastActivity || null;

    } catch (error) {
      console.error("❌ Error fetching last activity:", error);
      throw error;
    }
  }

  /**
   * Get summary statistics for product (used for reports)
   * ✅ Efficient aggregation on StockMovement
   * 
   * @param {ObjectId} productId
   * @param {Object} options
   * @param {number} options.days - Number of days to analyze (default: 30)
   * @returns {Promise<Object>} - Summary with totals, movements, etc.
   */
  static async getProductSummary(productId, options = {}) {
    try {
      const { days = 30 } = options;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await StockMovement.aggregate([
        {
          $match: {
            productId: productId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$movementType',
            quantity: { $sum: '$quantity' },
            totalAmount: { $sum: '$totalAmount' },
            count: { $sum: 1 },
            lastDate: { $max: '$createdAt' }
          }
        },
        {
          $sort: { lastDate: -1 }
        }
      ]);

      const current = await CurrentStock.findOne({ productId })
        .select('totalQuantity availableQuantity allocatedQuantity totalCost averageCost');

      return {
        current,
        movements: result,
        period: `Last ${days} days`
      };

    } catch (error) {
      console.error("❌ Error fetching product summary:", error);
      throw error;
    }
  }
}

export default StockHistoryManager;
