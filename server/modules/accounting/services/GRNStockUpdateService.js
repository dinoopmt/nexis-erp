import AddProduct from "../../../Models/AddProduct.js";
import InventoryBatch from "../../../Models/InventoryBatch.js";
import StockBatch from "../../../Models/StockBatch.js";
import StockMovement from "../../../Models/StockMovement.js";
import ActivityLog from "../../../Models/ActivityLog.js";
import CostingService from "../../../services/CostingService.js";

/**
 * GRNStockUpdateService
 * Handles stock updates when GRN is posted
 * - Update product quantity
 * - Create/update batch records
 * - Update product cost (using costing methods)
 * - Update unit variant costs
 * - Create audit logs
 * - Handle expiry tracking
 */

class GRNStockUpdateService {
  /**
   * Process stock update for GRN posting
   * Main entry point - orchestrates all stock updates
   * 
   * @param {Object} grnData - GRN document with items
   * @param {string} userId - User posting the GRN
   * @returns {Promise<Object>} - Result with updated products, batches, costs, logs
   */
  static async processGrnStockUpdate(grnData, userId) {
    try {
      console.log("📦 Processing GRN stock updates:", {
        grnNumber: grnData.grnNumber,
        totalItems: grnData.items?.length,
        createdBy: userId
      });

      const results = {
        grnNumber: grnData.grnNumber,
        processedItems: [],
        updatedProducts: [],
        createdBatches: [],
        costUpdates: [],
        variantUpdates: [],
        logs: [],
        errors: []
      };

      // Process each item in GRN
      for (const item of grnData.items || []) {
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

          // 1. Update stock quantity
          const stockUpdate = await this.updateProductStock(
            product,
            item,
            grnData
          );
          results.processedItems.push(stockUpdate);
          results.updatedProducts.push(product._id.toString());

          // 2. Create/update batch record
          const batchRecord = await this.createOrUpdateBatch(
            product,
            item,
            grnData
          );
          if (batchRecord) {
            results.createdBatches.push(batchRecord);
          }

          // 3. Update product cost based on costing method
          const costUpdate = await this.updateProductCost(
            product,
            item,
            grnData
          );
          if (costUpdate) {
            results.costUpdates.push(costUpdate);
          }

          // 4. Update unit variant costs if applicable
          const variantUpdate = await this.updateUnitVariantCosts(
            product,
            item,
            costUpdate?.newCost
          );
          if (variantUpdate) {
            results.variantUpdates.push(variantUpdate);
          }

          // 5. Create stock movement record
          await this.createStockMovement(
            product,
            item,
            batchRecord,
            grnData,
            userId
          );

          // 6. Create audit log
          await this.createAuditLog(
            product,
            item,
            grnData,
            userId,
            stockUpdate,
            costUpdate
          );
          results.logs.push({
            productId: product._id.toString(),
            action: "GRN_STOCK_RECEIVED"
          });

        } catch (itemError) {
          console.error(`❌ Error processing item ${item.itemCode}:`, itemError.message);
          results.errors.push({
            itemCode: item.itemCode,
            error: itemError.message
          });
        }
      }

      console.log("✅ GRN stock processing complete:", {
        itemsProcessed: results.processedItems.length,
        batchesCreated: results.createdBatches.length,
        costUpdates: results.costUpdates.length,
        variantUpdates: results.variantUpdates.length,
        errors: results.errors.length
      });

      return results;

    } catch (error) {
      console.error("❌ Error processing GRN stock update:", error);
      throw error;
    }
  }

  /**
   * Update product stock quantity
   * @param {Object} product - Product document
   * @param {Object} item - GRN line item
   * @param {Object} grnData - GRN data
   * @returns {Promise<Object>} - Stock update details
   */
  static async updateProductStock(product, item, grnData) {
    try {
      const quantityBefore = product.quantityInStock || 0;
      
      // ✅ ADD: Get conversion factor from item (for unit variants)
      // If user bought via variant (e.g., Outer Box), factor indicates base units per variant
      // Example: Outer Box factor=10 means 1 Outer Box = 10 base units
      const conversionFactor = item.conversionFactor || 1;
      
      // ✅ CHANGE: Convert quantity to base units
      // If item.quantity=5 Outer Boxes and factor=10, actualQty=50 base units
      const quantityReceived = (item.quantity || 0) * conversionFactor;
      const focQuantity = (item.focQty || 0) * conversionFactor;  // FOC also converted

      // Update stock (now with actual base unit quantity)
      product.quantityInStock = (quantityBefore + quantityReceived);
      product.lastStockUpdate = new Date();
      product.lastStockUpdateBy = grnData.createdBy;

      // Update minimum stock warning if needed
      if (product.minStock && product.quantityInStock < product.minStock) {
        product.lowStockAlert = true;
        product.lowStockAlertDate = new Date();
      } else {
        product.lowStockAlert = false;
      }

      await product.save();

      console.log(`✅ Stock updated for ${product.itemcode}: ${quantityBefore} → ${product.quantityInStock} (variant qty: ${item.quantity}, factor: ${conversionFactor}, base units: ${quantityReceived})`);

      return {
        productId: product._id.toString(),
        itemCode: product.itemcode,
        itemName: product.name,
        conversionFactor: conversionFactor,              // ✅ ADD: Show conversion factor
        quantityReceivedInVariant: item.quantity || 0,  // ✅ ADD: Show variant units (e.g., 5 Outer Boxes)
        quantityReceivedInBaseUnits: quantityReceived,  // ✅ ADD: Show converted quantity (e.g., 50 units)
        focQuantity: focQuantity,                        // ✅ UPDATE: Also in base units
        quantityBefore,
        quantityAfter: product.quantityInStock,
        uom: product.unitSymbol,
        note: conversionFactor > 1 ? `Converted from ${item.quantity} variant units (factor ${conversionFactor}) to ${quantityReceived} base units` : "Single unit"
      };

    } catch (error) {
      console.error("❌ Error updating product stock:", error);
      throw error;
    }
  }

  /**
   * Create or update batch record
   * ✅ UPDATED: Now uses actual quantity in base units for variant items
   * Uses StockBatch for expiry-tracked products, InventoryBatch for others
   * 
   * @param {Object} product - Product document
   * @param {Object} item - GRN line item
   * @param {Object} grnData - GRN data
   * @returns {Promise<Object|null>} - Created batch record
   */
  static async createOrUpdateBatch(product, item, grnData) {
    try {
      // Determine which batch model to use
      const isExpiryTracked = product.trackExpiry || false;
      const BatchModel = isExpiryTracked ? StockBatch : InventoryBatch;

      // ✅ ADD: Get conversion factor for unit variants
      const conversionFactor = item.conversionFactor || 1;
      const actualQuantity = (item.quantity || 0) * conversionFactor;  // Base units

      // Generate batch number from GRN if not provided
      const batchNumber = item.batchNumber || `${grnData.grnNumber}-${Date.now()}`;

      if (isExpiryTracked) {
        // Create StockBatch for expiry-tracked products
        const batch = new StockBatch({
          productId: product._id,
          batchNumber,
          manufacturingDate: new Date(), // Default to today if not provided
          expiryDate: item.expiryDate || null,
          quantity: actualQuantity,  // ✅ CHANGED: Use actual base unit quantity
          usedQuantity: 0,
          costPerUnit: item.unitCost,
          supplier: grnData.vendorName,
          referenceNumber: grnData.grnNumber,
          notes: `GRN Receipt - ${grnData.grnNumber}${conversionFactor > 1 ? ` (Variant: ${item.quantity} × factor ${conversionFactor})` : ''}`,
          batchStatus: "ACTIVE"
        });

        await batch.save();

        console.log(`✅ StockBatch created: ${batch.batchNumber} (${actualQuantity} base units = ${item.quantity} variant units × factor ${conversionFactor} @ ${batch.costPerUnit})`);

        return {
          batchId: batch._id.toString(),
          batchNumber: batch.batchNumber,
          model: "StockBatch",
          quantity: batch.quantity,
          quantityInVariants: item.quantity,            // ✅ ADD: show variant qty
          conversionFactor: conversionFactor,           // ✅ ADD: show factor
          expiryDate: batch.expiryDate,
          costPerUnit: batch.costPerUnit
        };
      } else {
        // Create InventoryBatch for non-expiry-tracked products
        const batch = new InventoryBatch({
          productId: product._id,
          batchNumber,
          purchasePrice: item.unitCost,
          quantity: actualQuantity,  // ✅ CHANGED: Use actual base unit quantity
          quantityRemaining: actualQuantity,  // ✅ CHANGED: Also in remaining
          purchaseDate: grnData.grnDate,
          vendorId: grnData.vendorId,
          expiryDate: item.expiryDate || null,
          lotNumber: item.batchNumber || null,
          invoiceNumber: grnData.invoiceNo,
          batchStatus: "ACTIVE"
        });

        await batch.save();

        console.log(`✅ InventoryBatch created: ${batch.batchNumber} (${actualQuantity} base units = ${item.quantity} variant units × factor ${conversionFactor} @ ${batch.purchasePrice})`);

        return {
          batchId: batch._id.toString(),
          batchNumber: batch.batchNumber,
          model: "InventoryBatch",
          quantity: batch.quantity,
          quantityInVariants: item.quantity,            // ✅ ADD: show variant qty
          conversionFactor: conversionFactor,           // ✅ ADD: show factor
          purchasePrice: batch.purchasePrice
        };
      }

    } catch (error) {
      console.error("❌ Error creating batch:", error);
      // Don't throw - batching is optional
      return null;
    }
  }

  /**
   * Calculate effective unit cost after applying discounts and FOC
   * ✅ UPDATED: Now excludes FOC items from cost calculation
   * ✅ UPDATED: Now converts unit variant quantities to base units
   * @param {Object} item - GRN line item
   * @param {Object} grnData - GRN data (for header discount)
   * @returns {number} - Effective unit cost per base unit
   */
  static calculateEffectiveUnitCost(item, grnData = {}) {
    try {
      // ✅ ADD: Get conversion factor for unit variants
      // If item.conversionFactor=10, then 1 variant unit = 10 base units
      const conversionFactor = item.conversionFactor || 1;
      const actualQuantity = (item.quantity || 0) * conversionFactor;  // Actual base units

      // ✅ NEW: Handle FOC (Free on Cost) items
      const focQty = (item.focQty || 0) * conversionFactor;  // FOC in base units
      
      // Start with item's net cost (already has item-level discount applied)
      let itemNetCost = item.netCost || ((item.quantity * conversionFactor) * item.unitCost - (item.itemDiscount || 0));

      // ✅ NEW: Reduce by FOC cost (free items shouldn't contribute to cost)
      if (focQty > 0) {
        const focCost = focQty * item.unitCost;
        itemNetCost = itemNetCost - focCost;
      }

      // Apply proportional GRN header discount if exists
      if (grnData.discountAmount > 0 || grnData.discountPercent > 0) {
        // Calculate proportional discount based on item's proportion of total
        const totalSubtotal = (grnData.netTotal + grnData.discountAmount) - (grnData.taxAmount || 0);
        if (totalSubtotal > 0) {
          const proportionalDiscount = (item.totalCost / totalSubtotal) * grnData.discountAmount;
          itemNetCost = itemNetCost - proportionalDiscount;
        }
      }

      // ✅ CRITICAL: Divide by ACTUAL quantity (in base units, including conversion)
      // This spreads the cost proportionally across all base units received
      const effectiveUnitCost = itemNetCost / actualQuantity;
      return effectiveUnitCost;
    } catch (error) {
      console.warn("⚠️  Error calculating effective unit cost:", error.message);
      return item.unitCost; // Fallback to original cost
    }
  }

  /**
   * Update product cost based on costing method (FIFO, LIFO, WAC)
   * ✅ UPDATED: Now uses actual quantity in base units for variant calculations
   * @param {Object} product - Product document
   * @param {Object} item - GRN line item
   * @param {Object} grnData - GRN data (includes item discounts and GRN header discount)
   * @returns {Promise<Object|null>} - Cost update details
   */
  static async updateProductCost(product, item, grnData) {
    try {
      // Get company costing method (assume from product or system default)
      const costingMethod = product.costingMethod || "FIFO";
      const oldCost = product.cost || 0;

      // ✅ ADD: Get conversion factor for unit variants
      const conversionFactor = item.conversionFactor || 1;
      const actualQuantity = (item.quantity || 0) * conversionFactor;  // Base units

      // ✅ NEW: Calculate effective unit cost (with discounts applied, per BASE unit)
      const effectiveUnitCost = this.calculateEffectiveUnitCost(item, grnData);

      let newCost;

      if (costingMethod === "FIFO") {
        // FIFO: Use latest purchase cost (after discount)
        newCost = effectiveUnitCost;
      } else if (costingMethod === "LIFO") {
        // LIFO: Use latest cost (after discount)
        newCost = effectiveUnitCost;
      } else if (costingMethod === "WAC") {
        // Weighted Average Cost: blend all inventory including discounts and FOC
        // ✅ CRITICAL: Use actual quantity in base units
        const currentStock = product.quantityInStock - actualQuantity; // Before this GRN
        const currentTotalValue = currentStock * oldCost;

        // ✅ Calculate net cost for new items (with discounts)
        const itemNetCost = item.netCost || ((item.quantity * conversionFactor) * item.unitCost - (item.itemDiscount || 0));
        let newItemsValue = itemNetCost;

        // Apply proportional GRN header discount if exists
        if (grnData.discountAmount > 0) {
          const totalSubtotal = (grnData.netTotal + grnData.discountAmount) - (grnData.taxAmount || 0);
          if (totalSubtotal > 0) {
            const proportionalDiscount = (item.totalCost / totalSubtotal) * grnData.discountAmount;
            newItemsValue = item.totalCost - proportionalDiscount;
          }
        }

        // ✅ NEW: Reduce by FOC cost (free items don't contribute to WAC)
        const focQty = (item.focQty || 0) * conversionFactor;  // FOC in base units
        if (focQty > 0) {
          const focCost = focQty * item.unitCost;
          newItemsValue = newItemsValue - focCost;
        }

        // ✅ CRITICAL: Use actualQuantity in divisor
        newCost = (currentTotalValue + newItemsValue) / (currentStock + actualQuantity);
      } else {
        newCost = effectiveUnitCost;
      }

      // Round to 2 decimal places
      newCost = Math.round(newCost * 100) / 100;

      // Update product cost
      product.cost = newCost;
      product.lastCostUpdate = new Date();
      product.lastCostUpdateBy = grnData.createdBy;
      product.costingMethod = costingMethod;

      // ✅ NEW: Update costIncludeVat using effective cost, not original cost
      if (item.taxType === "inclusive" && item.taxPercent > 0) {
        const costWithoutTax = effectiveUnitCost / (1 + item.taxPercent / 100);
        const taxAmount = effectiveUnitCost - costWithoutTax;
        product.costIncludeVat = effectiveUnitCost;
      }

      await product.save();

      console.log(`✅ Cost updated for ${product.itemcode}: ${oldCost} → ${newCost} (${costingMethod}, effective: ${effectiveUnitCost.toFixed(2)}, variant qty: ${item.quantity}, factor: ${conversionFactor}, base units: ${actualQuantity})`);

      return {
        productId: product._id.toString(),
        itemCode: product.itemcode,
        conversionFactor: conversionFactor,                   // ✅ ADD
        quantityInVariants: item.quantity,                   // ✅ ADD
        quantityInBaseUnits: actualQuantity,                 // ✅ ADD
        costingMethod,
        oldCost,
        newCost,
        itemOriginalUnitCost: item.unitCost,
        effectiveUnitCost: Number(effectiveUnitCost.toFixed(2)),
        itemDiscount: item.itemDiscount || 0,
        headerDiscountApplied: grnData.discountAmount || 0,
        focQty: (item.focQty || 0) * conversionFactor,                     // ✅ UPDATE: FOC in base units
        focCost: ((item.focQty || 0) * conversionFactor) * item.unitCost,  // ✅ UPDATE: Cost of free items
        paidAmount: itemNetCost - (((item.focQty || 0) * conversionFactor) * item.unitCost),  // ✅ UPDATE: What was actually paid
        difference: newCost - oldCost
      };

    } catch (error) {
      console.error("❌ Error updating product cost:", error);
      // Don't throw - cost update is optional
      return null;
    }
  }

  /**
   * Update unit variant costs
   * If product has packing variants, update their costs proportionally
   * 
   * @param {Object} product - Product document
   * @param {Object} item - GRN line item
   * @param {number} newProductCost - New product cost
   * @returns {Promise<Object|null>} - Variant update details
   */
  static async updateUnitVariantCosts(product, item, newProductCost) {
    try {
      if (!newProductCost) {
        return null; // No cost update
      }

      if (!product.packingUnits || product.packingUnits.length === 0) {
        return null; // No variants to update
      }

      const updates = [];

      // Update each packing unit cost based on conversion factor
      for (let i = 0; i < product.packingUnits.length; i++) {
        const unit = product.packingUnits[i];
        const oldVariantCost = unit.cost || 0;

        // Calculate new cost for variant: base cost * conversion factor
        const newVariantCost = newProductCost * (unit.conversionFactor || 1);
        const roundedVariantCost = Math.round(newVariantCost * 100) / 100;

        // Calculate margin amount if margin exists
        if (unit.margin && unit.margin > 0) {
          unit.marginAmount = (roundedVariantCost * unit.margin) / 100;
        }

        unit.cost = roundedVariantCost;

        updates.push({
          unitName: unit.name,
          factor: unit.conversionFactor,
          oldCost: oldVariantCost,
          newCost: roundedVariantCost
        });
      }

      await product.save();

      console.log(`✅ Unit variant costs updated for ${product.itemcode}: ${updates.length} variants`);

      return {
        productId: product._id.toString(),
        itemCode: product.itemcode,
        variantsUpdated: updates.length,
        updates
      };

    } catch (error) {
      console.error("❌ Error updating unit variant costs:", error);
      // Don't throw - variant update is optional
      return null;
    }
  }

  /**
   * Create stock movement record for audit trail
   * @param {Object} product - Product document
   * @param {Object} item - GRN line item
   * @param {Object} batchRecord - Created batch record
   * @param {Object} grnData - GRN data
   * @param {string} userId - User ID
   */
  static async createStockMovement(product, item, batchRecord, grnData, userId) {
    try {
      // Only create if batch exists (from inventory batch)
      if (!batchRecord) return;

      const movement = new StockMovement({
        productId: product._id,
        batchId: batchRecord.batchId,
        movementType: "INBOUND",
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalAmount: item.quantity * item.unitCost,
        reference: grnData.grnNumber,
        referenceId: grnData._id,
        referenceType: "PURCHASE_ORDER",
        costingMethodUsed: product.costingMethod || "FIFO",
        documentDate: grnData.grnDate,
        notes: `GRN Receipt - ${grnData.grnNumber} from ${grnData.vendorName}`,
        createdBy: userId
      });

      await movement.save();

      console.log(`✅ Stock movement recorded: ${movement._id}`);

    } catch (error) {
      console.error("❌ Error creating stock movement:", error);
      // Non-critical, don't throw
    }
  }

  /**
   * Create audit log for stock update
   * @param {Object} product - Product document
   * @param {Object} item - GRN line item
   * @param {Object} grnData - GRN data
   * @param {string} userId - User ID
   * @param {Object} stockUpdate - Stock update details
   * @param {Object} costUpdate - Cost update details
   */
  static async createAuditLog(product, item, grnData, userId, stockUpdate, costUpdate) {
    try {
      const changes = {
        action: "GRN_STOCK_RECEIVED",
        grnNumber: grnData.grnNumber,
        vendor: grnData.vendorName,
        ...stockUpdate,
        ...costUpdate
      };

      const log = new ActivityLog({
        userId: userId,
        username: grnData.createdBy || "SYSTEM",
        action: "CREATE",
        module: "Inventory",
        resource: "Stock - GRN Receipt",
        description: `Stock received for ${product.itemcode}: +${item.quantity} units from GRN ${grnData.grnNumber}`,
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
   * Get stock update summary for GRN
   * @param {string} grnId - GRN ID
   * @returns {Promise<Object>} - Summary of stock updates
   */
  static async getGrnStockSummary(grnId) {
    try {
      // Find related stock movements
      const movements = await StockMovement.find({
        referenceId: grnId,
        referenceType: "PURCHASE_ORDER"
      }).populate("productId", "itemcode name").populate("batchId");

      const summary = {
        grnId,
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
          batchNumber: movement.batchId?.batchNumber,
          quantity: movement.quantity,
          unitCost: movement.unitCost,
          totalAmount: movement.totalAmount
        });
      }

      return summary;

    } catch (error) {
      console.error("❌ Error getting GRN stock summary:", error);
      return null;
    }
  }
}

export default GRNStockUpdateService;
