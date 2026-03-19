import AddProduct from "../../../Models/AddProduct.js";
import InventoryBatch from "../../../Models/InventoryBatch.js";
import StockBatch from "../../../Models/StockBatch.js";
import StockMovement from "../../../Models/StockMovement.js";
import ActivityLog from "../../../Models/ActivityLog.js";

/**
 * RTVStockUpdateService
 * Handles stock reversal when RTV is posted
 * - Reduce product quantity
 * - Reduce/update batch records
 * - Update product cost (reverse costing method impact)
 * - Create audit logs
 * - Reverse batch expiry tracking
 */

class RTVStockUpdateService {
  /**
   * Process stock reversal for RTV posting
   * Main entry point - orchestrates all stock reversals
   *
   * @param {Object} rtvData - RTV document with items
   * @param {string} userId - User posting the RTV
   * @returns {Promise<Object>} - Result with reversed products, batches, costs, logs
   */
  static async processRtvStockReversal(rtvData, userId) {
    try {
      console.log("🔄 Processing RTV stock reversals:", {
        rtvNumber: rtvData.rtvNumber,
        totalItems: rtvData.items?.length,
        createdBy: userId
      });

      const results = {
        rtvNumber: rtvData.rtvNumber,
        processedItems: [],
        reversedProducts: [],
        batchesAdjusted: [],
        costReversal: [],
        logs: [],
        errors: []
      };

      // Process each item in RTV
      for (const item of rtvData.items || []) {
        try {
          // Get product
          const product = await AddProduct.findById(item.productId);
          if (!product) {
            results.errors.push({
              itemCode: item.itemCode,
              error: "Product not found"
            });
            continue;
          }

          // ✅ 1. REVERSE: Reduce stock quantity
          const stockReversal = await this.reverseProductStock(
            product,
            item,
            rtvData
          );
          results.processedItems.push(stockReversal);
          results.reversedProducts.push(product._id.toString());

          // ✅ 2. REVERSE: Reduce/update batch record
          const batchAdjustment = await this.adjustBatchQuantity(
            product,
            item,
            rtvData
          );
          if (batchAdjustment) {
            results.batchesAdjusted.push(batchAdjustment);
          }

          // ✅ 3. REVERSE: Reverse product cost impact
          const costReversal = await this.reverseProductCost(
            product,
            item,
            rtvData
          );
          if (costReversal) {
            results.costReversal.push(costReversal);
          }

          // ✅ 4. Create stock movement record (OUTBOUND)
          await this.createStockMovement(
            product,
            item,
            rtvData,
            userId
          );

          // ✅ 5. Create audit log
          await this.createAuditLog(
            product,
            item,
            rtvData,
            userId,
            stockReversal,
            costReversal
          );
          results.logs.push({
            productId: product._id.toString(),
            action: "RTV_STOCK_RETURNED"
          });

        } catch (itemError) {
          console.error(`❌ Error processing item ${item.itemCode}:`, itemError.message);
          results.errors.push({
            itemCode: item.itemCode,
            error: itemError.message
          });
        }
      }

      console.log("✅ RTV stock reversal complete:", {
        itemsProcessed: results.processedItems.length,
        batchesAdjusted: results.batchesAdjusted.length,
        costReversals: results.costReversal.length,
        errors: results.errors.length
      });

      return results;

    } catch (error) {
      console.error("❌ Error processing RTV stock reversal:", error);
      throw error;
    }
  }

  /**
   * Reverse (reduce) product stock quantity
   * ✅ REVERSE: Opposite of GRN update
   *
   * @param {Object} product - Product document
   * @param {Object} item - RTV line item
   * @param {Object} rtvData - RTV data
   * @returns {Promise<Object>} - Stock reversal details
   */
  static async reverseProductStock(product, item, rtvData) {
    try {
      const quantityBefore = product.quantityInStock || 0;
      const quantityReturned = item.quantity || 0;

      // ✅ CRITICAL: Cannot return more than available
      if (quantityReturned > quantityBefore) {
        throw new Error(
          `Cannot return ${quantityReturned} units. Only ${quantityBefore} available.`
        );
      }

      // ✅ REVERSE: Reduce stock
      product.quantityInStock = (quantityBefore - quantityReturned);
      product.lastStockUpdate = new Date();
      product.lastStockUpdateBy = rtvData.createdBy;

      // ✅ Update minimum stock warning if needed
      if (product.minStock && product.quantityInStock < product.minStock) {
        product.lowStockAlert = true;
        product.lowStockAlertDate = new Date();
      } else if (product.quantityInStock >= product.minStock) {
        product.lowStockAlert = false;
      }

      await product.save();

      console.log(`✅ Stock reversed for ${product.itemcode}: ${quantityBefore} → ${product.quantityInStock} (-${quantityReturned})`);

      return {
        productId: product._id.toString(),
        itemCode: product.itemcode,
        itemName: product.name,
        quantityReturned,
        quantityBefore,
        quantityAfter: product.quantityInStock,
        uom: product.unitSymbol,
        returnReason: item.returnReason
      };

    } catch (error) {
      console.error("❌ Error reversing product stock:", error);
      throw error;
    }
  }

  /**
   * Adjust batch quantity for returned items
   * ✅ REVERSE: Reduce batch quantity or mark as reduced
   *
   * @param {Object} product - Product document
   * @param {Object} item - RTV line item
   * @param {Object} rtvData - RTV data
   * @returns {Promise<Object|null>} - Batch adjustment details
   */
  static async adjustBatchQuantity(product, item, rtvData) {
    try {
      const isExpiryTracked = product.trackExpiry || false;
      const BatchModel = isExpiryTracked ? StockBatch : InventoryBatch;

      // ✅ REVERSE: Find batch by original batch number from RTV item
      const batchNumber = item.originalBatchNumber;
      if (!batchNumber) {
        console.warn(`⚠️ No batch number for return, skipping batch adjustment`);
        return null;
      }

      const batch = await BatchModel.findOne({
        productId: product._id,
        batchNumber,
        batchStatus: "ACTIVE"
      });

      if (!batch) {
        console.warn(`⚠️ Batch ${batchNumber} not found, may be consumed already`);
        return null;
      }

      const quantityBefore = batch.quantity;

      // ✅ REVERSE: Reduce batch quantity
      const quantityReturned = item.quantity;
      batch.quantity = Math.max(0, batch.quantity - quantityReturned);

      if (isExpiryTracked) {
        // StockBatch: Mark used quantity reduction
        batch.usedQuantity = Math.max(0, batch.usedQuantity - quantityReturned);
      } else {
        // InventoryBatch: Mark remaining quantity reduction
        batch.quantityRemaining = Math.max(0, batch.quantityRemaining - quantityReturned);
      }

      // Update batch status if emptied
      if (batch.quantity <= 0) {
        batch.batchStatus = "CONSUMED";
      }

      await batch.save();

      console.log(`✅ Batch adjusted: ${batchNumber} (${quantityBefore} → ${batch.quantity})`);

      return {
        batchId: batch._id.toString(),
        batchNumber: batch.batchNumber,
        model: isExpiryTracked ? "StockBatch" : "InventoryBatch",
        quantityBefore,
        quantityAfter: batch.quantity,
        quantityReturned,
        status: batch.batchStatus
      };

    } catch (error) {
      console.error("❌ Error adjusting batch quantity:", error);
      return null;
    }
  }

  /**
   * Reverse product cost impact from RTV
   * ✅ REVERSE: Adjust product cost back up based on costing method
   * For WAC: Recalculate using remaining stock
   *
   * @param {Object} product - Product document
   * @param {Object} item - RTV line item
   * @param {Object} rtvData - RTV data
   * @returns {Promise<Object|null>} - Cost reversal details
   */
  static async reverseProductCost(product, item, rtvData) {
    try {
      const costingMethod = product.costingMethod || "FIFO";
      const oldCost = product.cost || 0;

      // Note: For FIFO/LIFO, cost typically doesn't change on return
      // For WAC (Weighted Average Cost), we need to recalculate
      // The cost of returned items affects the overall average

      if (costingMethod === "WAC") {
        // ✅ CRITICAL: Recalculate WAC after removing this batch
        // New WAC = (remaining inventory value) / (remaining quantity)
        
        const quantityReturned = item.quantity || 0;
        const currentStock = product.quantityInStock; // After reversal
        const returnedValue = quantityReturned * item.unitCost;

        // Calculate new WAC without the returned items
        if (currentStock > 0) {
          const currentTotalValue = currentStock * oldCost + returnedValue; // Value before removal
          const newWac = currentTotalValue / (currentStock + quantityReturned);
          
          const newCost = Math.round(newWac * 100) / 100;

          product.cost = newCost;
          product.lastCostUpdate = new Date();
          product.lastCostUpdateBy = rtvData.createdBy;

          console.log(`✅ WAC adjusted for ${product.itemcode}: ${oldCost} → ${newCost} (returned: ${quantityReturned} @ ${item.unitCost})`);

          return {
            productId: product._id.toString(),
            itemCode: product.itemcode,
            costingMethod,
            oldCost,
            newCost,
            quantityReturned,
            returnedValue,
            difference: newCost - oldCost
          };
        }
      }

      // For FIFO/LIFO, cost remains the same on return
      return null;

    } catch (error) {
      console.error("❌ Error reversing product cost:", error);
      return null;
    }
  }

  /**
   * Create stock movement record for reversal (OUTBOUND)
   *
   * @param {Object} product - Product document
   * @param {Object} item - RTV line item
   * @param {Object} rtvData - RTV data
   * @param {string} userId - User ID
   */
  static async createStockMovement(product, item, rtvData, userId) {
    try {
      const movement = new StockMovement({
        productId: product._id,
        movementType: "OUTBOUND", // ✅ REVERSE: Mark as outbound
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalAmount: item.quantity * item.unitCost,
        reference: rtvData.rtvNumber,
        referenceId: rtvData._id,
        referenceType: "RETURN_TO_VENDOR",
        costingMethodUsed: product.costingMethod || "FIFO",
        documentDate: rtvData.rtvDate,
        notes: `RTV Return - ${rtvData.rtvNumber} to ${rtvData.vendorName} - Reason: ${item.returnReason}`,
        createdBy: userId
      });

      await movement.save();

      console.log(`✅ Stock movement recorded (OUTBOUND): ${movement._id}`);

    } catch (error) {
      console.error("❌ Error creating stock movement:", error);
      // Non-critical, don't throw
    }
  }

  /**
   * Create audit log for stock reversal
   *
   * @param {Object} product - Product document
   * @param {Object} item - RTV line item
   * @param {Object} rtvData - RTV data
   * @param {string} userId - User ID
   * @param {Object} stockReversal - Stock reversal details
   * @param {Object} costReversal - Cost reversal details
   */
  static async createAuditLog(product, item, rtvData, userId, stockReversal, costReversal) {
    try {
      const changes = {
        action: "RTV_STOCK_RETURNED",
        rtvNumber: rtvData.rtvNumber,
        vendor: rtvData.vendorName,
        returnReason: item.returnReason,
        ...stockReversal,
        ...costReversal
      };

      const log = new ActivityLog({
        userId: userId,
        username: rtvData.createdBy || "SYSTEM",
        action: "CREATE",
        module: "Inventory",
        resource: "Stock - RTV Return",
        description: `Stock reversed for ${product.itemcode}: -${item.quantity} units from RTV ${rtvData.rtvNumber}`,
        changes: changes,
        status: "success"
      });

      await log.save();

      console.log(`✅ Audit log created for ${product.itemcode}`);

    } catch (error) {
      console.error("❌ Error creating audit log:", error);
      // Non-critical, don't throw
    }
  }

  /**
   * Get RTV stock reversal summary
   *
   * @param {string} rtvId - RTV ID
   * @returns {Promise<Object>} - Summary of stock reversals
   */
  static async getRtvStockSummary(rtvId) {
    try {
      // Find related stock movements
      const movements = await StockMovement.find({
        referenceId: rtvId,
        referenceType: "RETURN_TO_VENDOR"
      }).populate("productId", "itemcode name").populate("batchId");

      const summary = {
        rtvId,
        totalMovements: movements.length,
        totalQuantity: 0,
        totalValue: 0,
        items: []
      };

      for (const movement of movements) {
        summary.totalQuantity += movement.quantity;
        summary.totalValue += movement.totalAmount;
        summary.items.push({
          productCode: movement.productId?.itemcode,
          productName: movement.productId?.name,
          quantity: movement.quantity,
          unitCost: movement.unitCost,
          totalAmount: movement.totalAmount
        });
      }

      return summary;

    } catch (error) {
      console.error("❌ Error getting RTV stock summary:", error);
      return null;
    }
  }
}

export default RTVStockUpdateService;
