import Grn from "../../../Models/Grn.js";
import StockBatch from "../../../Models/StockBatch.js";
import InventoryBatch from "../../../Models/InventoryBatch.js";
import CurrentStock from "../../../Models/CurrentStock.js";
import ActivityLog from "../../../Models/ActivityLog.js";
import User from "../../../Models/User.js";
import VendorPayment from "../../../Models/VendorPayment.js";
import StockMovement from "../../../Models/StockMovement.js";
import mongoose from "mongoose";
import GRNTransactionValidator from "./GRNTransactionValidator.js";

/**
 * GRNBatchEditValidator
 * 
 * Implements STRICT delta-based GRN edit workflow:
 * 
 * ✅ CAN EDIT if ALL conditions met:
 * 1. GRN status = "POSTED"
 * 2. Payment status = "PENDING"
 * 3. ALL stock batches fully available (no consumption)
 * 
 * ❌ CANNOT EDIT if:
 * - Status != POSTED
 * - Payment != PENDING
 * - Any batch has consumed stock
 * 
 * Delta Logic:
 * - Calculate qty difference (newQty - oldQty)
 * - Update stock by delta
 * - Update batch originalQty & availableQty
 * - Handle edge cases (remove item, add item)
 */

class GRNBatchEditValidator {
  /**
   * Main entry point: Check if GRN can be edited
   * 
   * @param {ObjectId} grnId
   * @returns {Promise<Object>} - { canEdit, reason, details }
   */
  static async canEditGrn(grnId) {
    try {
      console.log(`\n🔍 Validating GRN edit eligibility: ${grnId}`);

      const grn = await Grn.findById(grnId);
      if (!grn) {
        return {
          canEdit: false,
          reason: "GRN not found",
          errors: ["GRN does not exist"]
        };
      }

      const errors = [];
      const warnings = [];

      // ✅ DRAFT GRNs are ALWAYS editable (no stock/payment impacts yet)
      if (grn.status === "Draft") {
        console.log(`✅ Draft GRN - always editable`);
        return {
          canEdit: true,
          reason: "✅ Draft GRN - always editable",
          errors: [],
          warnings: [],
          checks: {
            statusOk: true,
            paymentOk: true,
            batchesOk: true
          },
          details: {
            grnStatus: grn.status,
            editType: "draft"
          }
        };
      }

      // ✅ POSTED/Received GRNs: Apply strict batch availability check
      if (grn.status !== "POSTED" && grn.status !== "Received") {
        errors.push(`GRN status is "${grn.status}" - must be Draft or POSTED to edit`);
      }

      // ✅ Condition 2: Payment must be PENDING
      const paymentCheck = await GRNTransactionValidator.checkVendorPayments(grn.grnNumber);
      if (paymentCheck.blocksEdit === true) {
        errors.push(`${paymentCheck.reason} - Payment status blocks editing`);
      }

      // ✅ Condition 3: Batch must be available
      const batchCheck = await GRNTransactionValidator.checkBatchAvailability(grnId, grn.items);
      if (!batchCheck.allBatchesAvailable) {
        errors.push(`${batchCheck.reason}`);
      }

      const canEdit = errors.length === 0;

      return {
        canEdit,
        reason: canEdit
          ? "✅ GRN is editable - All conditions met"
          : `❌ GRN cannot be edited - ${errors[0]}`,
        errors,
        warnings,
        checks: {
          statusOk: grn.status === "POSTED" || grn.status === "Received",
          paymentOk: !paymentCheck.blocksEdit,
          batchesOk: batchCheck.allBatchesAvailable
        },
        details: {
          grnStatus: grn.status,
          paymentStatus: paymentCheck.status,
          batchDetails: batchCheck.details,
          editType: "posted"
        }
      };

    } catch (error) {
      console.error("❌ Edit eligibility check error:", error);
      return {
        canEdit: false,
        reason: "Error checking edit eligibility",
        error: error.message
      };
    }
  }

  /**
   * Main edit handler: Apply delta-based updates with batch validation
   * 
   * @param {ObjectId} grnId
   * @param {Array} newItems - Updated items
   * @param {String} userId - Who is editing
   * @returns {Promise<Object>} - Edit result with before/after
   */
  static async applyGrnEdit(grnId, newItems, userId) {
    try {
      console.log(`\n✏️ Applying GRN edit for ${grnId}`);

      // 1. Validate edit permission
      const permission = await this.canEditGrn(grnId);
      if (!permission.canEdit) {
        throw new Error(permission.reason);
      }

      const grn = await Grn.findById(grnId);
      const originalData = JSON.parse(JSON.stringify(grn.toObject()));

      // ✅ DRAFT GRNs: Simple update without delta calculations
      if (grn.status === "Draft") {
        console.log(`📝 Draft GRN edit - simple update (no delta calculations)`);

        // ✅ Recalculate item tax amounts before saving
        this.recalculateItemTaxes(newItems);
        
        // Just update items and totals
        grn.items = newItems;
        
        // Recalculate totals
        const newTotals = this.recalculateTotals(newItems);
        grn.totalQty = newTotals.totalQty;
        grn.subtotal = newTotals.subtotal;
        grn.netTotal = newTotals.netTotal;
        grn.finalTotal = newTotals.finalTotal;
        grn.totalAmount = newTotals.totalAmount;  // ✅ Include totalAmount (with tax)
        grn.taxAmount = newTotals.taxAmount;  // ✅ Update taxAmount

        await grn.save();
        console.log(`✅ Draft GRN updated successfully (no stock/payment impacts)`);

        return {
          success: true,
          message: "Draft GRN updated successfully",
          editType: "draft",
          data: {
            grnId,
            grnNumber: grn.grnNumber,
            itemsCount: newItems.length,
            finalTotal: grn.finalTotal
          }
        };
      }

      // ✅ POSTED GRNs: Delta-based update with stock & batch updates
      console.log(`📊 Posted GRN edit - applying delta calculations`);

      // 2. Calculate deltas for each item
      const deltas = this.calculateDeltas(originalData.items, newItems, grnId);
      console.log(`📊 Calculated ${deltas.length} delta(s)`);

      // 3. Apply stock updates (delta-based)
      const stockUpdates = await this.applyStockDeltas(deltas, grn, userId, originalData.items);
      console.log(`✅ Stock updates applied: ${stockUpdates.length} updates`);

      // 4. Update batch quantities (pass grnId to fetch original batch numbers)
      const batchUpdates = await this.updateBatchQuantities(deltas, newItems, grnId, originalData.items);
      console.log(`✅ Batch updates applied: ${batchUpdates.length} updates`);

      // 5. Update GRN items
      // ✅ Recalculate item tax amounts before saving
      this.recalculateItemTaxes(newItems);
      
      grn.items = newItems;
      
      // Recalculate totals
      const newTotals = this.recalculateTotals(newItems);
      grn.totalQty = newTotals.totalQty;
      grn.subtotal = newTotals.subtotal;
      grn.netTotal = newTotals.netTotal;
      grn.finalTotal = newTotals.finalTotal;
      grn.totalAmount = newTotals.totalAmount;  // ✅ Include totalAmount (with tax)
      grn.taxAmount = newTotals.taxAmount;  // ✅ Update taxAmount

      await grn.save();
      console.log(`✅ GRN updated successfully`);

      // 6. Update VendorPayment if amount changed
      // ✅ Use totalAmount (includes tax), not finalTotal
      const amountDelta = grn.totalAmount - originalData.totalAmount;
      console.log(`💰 Amount Delta: ${originalData.totalAmount} → ${grn.totalAmount} (delta: ${amountDelta})`);
      const paymentUpdates = await this.updateVendorPayment(grnId, amountDelta);
      console.log(`✅ Vendor payment updated: ${paymentUpdates.length} updates`);

      // 7. Create audit log
      const audit = await this.createAuditLog(grnId, userId, {
        mode: "DELTA_INSTANT",
        reason: "Batch fully available",
        before: originalData,
        after: grn.toObject(),
        deltas,
        stockUpdates,
        batchUpdates,
        paymentUpdates
      });

      return {
        success: true,
        editType: "posted",
        message: "GRN edited and updated successfully",
        grn: {
          _id: grn._id,
          grnNumber: grn.grnNumber,
          status: grn.status,
          finalTotal: grn.finalTotal
        },
        changes: {
          itemsModified: deltas.length,
          stockUpdates: stockUpdates.length,
          batchUpdates: batchUpdates.length,
          paymentUpdates: paymentUpdates?.length || 0
        },
        auditLog: audit?._id || null
      };

    } catch (error) {
      console.error("❌ GRN edit error:", error.message);
      throw error;
    }
  }

  /**
   * Calculate delta (difference) for each item
   * 
   * @private
   * @returns {Array} - Array of deltas
   */
  static calculateDeltas(oldItems, newItems, grnId) {
    const deltas = [];
    const itemMap = new Map(newItems.map((item, idx) => [idx, item]));

    console.log(`\n🔍 Comparing ${oldItems.length} old items with ${newItems.length} new items`);

    for (let i = 0; i < oldItems.length; i++) {
      const oldItem = oldItems[i];
      const newItem = newItems[i];

      if (!newItem) {
        // Item removed
        console.log(`  ➖ Item ${i}: REMOVED - ${oldItem.itemName || oldItem.productId}`);
        deltas.push({
          type: "ITEM_REMOVED",
          productId: oldItem.productId,
          itemName: oldItem.itemName,
          oldQty: oldItem.quantity,
          newQty: 0,
          deltaQty: -oldItem.quantity,
          grnId
        });
      } else {
        // ✅ Compare multiple fields with numeric conversion
        const oldQty = parseFloat(oldItem.quantity) || 0;
        const newQty = parseFloat(newItem.quantity) || 0;
        const oldCost = parseFloat(oldItem.unitCost) || 0;
        const newCost = parseFloat(newItem.unitCost) || 0;
        const oldTax = parseFloat(oldItem.taxPercent) || 0;
        const newTax = parseFloat(newItem.taxPercent) || 0;

        const qtyChanged = oldQty !== newQty;
        const costChanged = oldCost !== newCost;
        const taxChanged = oldTax !== newTax;
        const anyChange = qtyChanged || costChanged || taxChanged;

        if (anyChange) {
          console.log(`  ✏️ Item ${i}: MODIFIED - ${newItem.itemName || newItem.productId}`);
          console.log(`     Qty: ${oldQty} → ${newQty} ${qtyChanged ? '(CHANGED)' : ''}`);
          console.log(`     Cost: ${oldCost} → ${newCost} ${costChanged ? '(CHANGED)' : ''}`);
          console.log(`     Tax: ${oldTax}% → ${newTax}% ${taxChanged ? '(CHANGED)' : ''}`);

          deltas.push({
            type: qtyChanged ? "QTY_CHANGED" : "ITEM_UPDATED",
            productId: newItem.productId,
            itemName: newItem.itemName,
            oldQty,
            newQty,
            deltaQty: newQty - oldQty,
            grnId,
            oldCost,
            newCost,
            oldTax,
            newTax,
            costChanged,
            qtyChanged,
            taxChanged
          });
        } else {
          console.log(`  ✅ Item ${i}: NO CHANGE - ${newItem.itemName || newItem.productId}`);
        }
      }
    }

    // Check for new items
    if (newItems.length > oldItems.length) {
      console.log(`\n➕ ${newItems.length - oldItems.length} new items detected`);
      for (let i = oldItems.length; i < newItems.length; i++) {
        const newItem = newItems[i];
        console.log(`  ➕ Item ${i}: ADDED - ${newItem.itemName || newItem.productId} (Qty: ${newItem.quantity})`);
        deltas.push({
          type: "ITEM_ADDED",
          productId: newItem.productId,
          itemName: newItem.itemName,
          oldQty: 0,
          newQty: newItem.quantity,
          deltaQty: newItem.quantity,
          grnId
        });
      }
    }

    console.log(`\n📊 Delta calculation complete: ${deltas.length} change(s) detected\n`);
    return deltas;
  }

  /**
   * Apply stock delta updates with proper CurrentStock field updates and StockMovement creation
   * 
   * @private
   * @param {Array} deltas - Delta changes
   * @param {Object} grn - Full GRN object (for ID and grnNumber)
   * @param {String} userId - User making the edit
   * @param {Array} originalItems - Original items to find batch numbers
   * @returns {Promise<Array>} - Update results
   */
  static async applyStockDeltas(deltas, grn, userId, originalItems) {
    const updates = [];
    const grnNumber = grn.grnNumber;
    const grnId = grn._id || grn.id;

    console.log(`\n📦 [STOCK-DELTAS-START] Processing ${deltas.length} delta(s) for ${grnNumber}`);
    deltas.forEach((d, idx) => {
      console.log(`   [${idx}] ${d.itemName}: ${d.oldQty} → ${d.newQty} (delta: ${d.deltaQty})`);
    });

    for (const delta of deltas) {
      try {
        if (delta.deltaQty !== 0) {
          console.log(`\n   🔄 Processing delta: ${delta.itemName} (${delta.deltaQty > 0 ? "+" : ""}${delta.deltaQty})`);
          
          // ✅ Fetch batch to get batchId for StockMovement
          let batchId = null;
          try {
            // Find batch by productId and invoiceNumber (GRN number)
            const batch = await InventoryBatch.findOne({
              productId: delta.productId,
              invoiceNumber: grnNumber
            });
            if (batch) {
              batchId = batch._id;
              console.log(`     Found batchId: ${batchId}`);
            }
          } catch (batchError) {
            console.warn(`     ⚠️ Could not find batch for StockMovement:`, batchError.message);
          }
          
          // ✅ Update CurrentStock with correct field names
          let currentStock = await CurrentStock.findOne({
            productId: delta.productId
          });

          if (!currentStock) {
            console.warn(`⚠️ CurrentStock not found for ${delta.itemName}, creating...`);
            currentStock = new CurrentStock({
              productId: delta.productId,
              totalQuantity: Math.max(0, delta.deltaQty),
              availableQuantity: Math.max(0, delta.deltaQty),
              allocatedQuantity: 0,
              grnReceivedQuantity: Math.max(0, delta.deltaQty),
              lastGrnDate: new Date()
            });
          } else {
            // Apply delta to BOTH totalQuantity and availableQuantity
            const oldTotal = currentStock.totalQuantity || 0;
            const oldAvailable = currentStock.availableQuantity || 0;
            const newTotal = oldTotal + delta.deltaQty;
            const newAvailable = oldAvailable + delta.deltaQty;
            
            // 🔥 Negative stock protection
            if (newTotal < 0 || newAvailable < 0) {
              throw new Error(`Stock cannot go negative for ${delta.itemName} (delta: ${delta.deltaQty})`);
            }

            currentStock.totalQuantity = newTotal;
            currentStock.availableQuantity = newAvailable;
            
            // Update GRN tracking if this delta is QTY_CHANGED
            if (delta.type === "QTY_CHANGED") {
              currentStock.grnReceivedQuantity = (currentStock.grnReceivedQuantity || 0) + delta.deltaQty;
            }
            
            currentStock.lastGrnDate = new Date();
          }

          await currentStock.save();

          // ✅ Create StockMovement record for delta
          if (delta.deltaQty !== 0) {
            try {
              const stockBefore = currentStock.totalQuantity - delta.deltaQty;
              
              // Get unit cost from delta (for cost tracking)
              const unitCost = delta.newCost || 0;
              
              const newStockMovement = new StockMovement({
                productId: delta.productId,
                batchId: batchId,  // ✅ Link to batch (found above)
                movementType: delta.deltaQty > 0 ? "INBOUND" : "OUTBOUND",
                quantity: Math.abs(delta.deltaQty),
                stockBefore: stockBefore,
                newStock: currentStock.totalQuantity,
                currentStock: currentStock.totalQuantity,
                unitCost: unitCost,  // ✅ REQUIRED: Cost per unit
                totalAmount: Math.abs(delta.deltaQty) * unitCost,  // Computed field
                reference: grnNumber || "GRN_EDIT",
                referenceId: grnId,  // ✅ GRN ObjectId for traceability
                referenceType: "PURCHASE_ORDER",  // ✅ Valid enum: SALES_INVOICE, PURCHASE_ORDER, STOCK_ADJUSTMENT, RETURN
                costingMethodUsed: "FIFO",
                createdBy: userId,  // ✅ User making the edit
                documentDate: new Date(),
                notes: `GRN Edit Delta - ${delta.itemName}: ${delta.oldQty} → ${delta.newQty}`
              });

              const savedMovement = await newStockMovement.save();
              console.log(`  ✅ StockMovement CREATED: ${savedMovement._id} | ${grnNumber} | qty: ${delta.deltaQty}`);
              console.log(`     batchId: ${batchId}, referenceId: ${grnId}, createdBy: ${userId}`);
              console.log(`     Before: ${stockBefore}, After: ${currentStock.totalQuantity}, UnitCost: ${unitCost}`);
            } catch (movementError) {
              console.error(`  ❌ CRITICAL: Failed to create StockMovement for ${delta.itemName}:`, movementError.message);
              console.error(`     Stack:`, movementError.stack);
              // Don't throw - allow stock update even if movement creation fails
            }
          }

          updates.push({
            productId: delta.productId,
            type: delta.type,
            deltaQty: delta.deltaQty,
            oldStock: currentStock.totalQuantity - delta.deltaQty,
            newStock: currentStock.totalQuantity
          });

          console.log(`  ✅ ${delta.itemName}: Stock ${delta.deltaQty > 0 ? "+" : ""}${delta.deltaQty} → total: ${currentStock.totalQuantity}, available: ${currentStock.availableQuantity}`);
        }
      } catch (error) {
        console.error(`  ❌ Stock update error for ${delta.itemName}:`, error.message);
        throw error;
      }
    }

    return updates;
  }

  /**
   * Update batch quantities using InventoryBatch model
   * 
   * @private
   * @param {Array} deltas - Delta changes
   * @param {Array} newItems - New items (may not have batchNumber)
   * @param {ObjectId} grnId - GRN ID for context
   * @param {Array} originalItems - Original items from GRN (may not have batch numbers)
   * @returns {Promise<Array>} - Batch update results
   */
  static async updateBatchQuantities(deltas, newItems, grnId, originalItems) {
    const updates = [];

    // If original items don't have batch numbers, fetch them from InventoryBatch collection
    let batchMap = new Map();
    
    // First try: Get batch numbers from original items
    if (originalItems && Array.isArray(originalItems)) {
      console.log(`\n🔍 [BATCH-MAP] Building batch map from ${originalItems.length} original items...`);
      originalItems.forEach((item) => {
        if (item.productId && item.batchNumber) {
          const key = item.productId.toString ? item.productId.toString() : item.productId;
          batchMap.set(key, item.batchNumber);
          console.log(`  ✅ ProductId ${key} → BatchNumber: ${item.batchNumber}`);
        }
      });
    }
    
    // Second try: Query InventoryBatch collection by invoiceNumber (GRN number) since grnId field doesn't exist
    if (batchMap.size === 0) {
      console.log(`\n🔍 [BATCH-MAP] Original items had no batch numbers, querying InventoryBatch collection...`);
      
      try {
        // ✅ Query by invoiceNumber (stores GRN number) since InventoryBatch schema doesn't have grnId field
        const grnNumber = originalItems?.[0]?.itemName ? null : null; // Will get from context
        
        // Get GRN to find its grnNumber
        const grn = await Grn.findById(grnId);
        if (grn) {
          console.log(`  🔍 Looking for batches with invoiceNumber: ${grn.grnNumber}`);
          
          // Query all batches for this GRN by invoiceNumber
          const grnBatches = await InventoryBatch.find({ invoiceNumber: grn.grnNumber });
          console.log(`  📦 Found ${grnBatches.length} batch(es) for GRN ${grn.grnNumber}`);
          
          grnBatches.forEach((batch) => {
            if (batch.productId) {
              const key = batch.productId.toString ? batch.productId.toString() : batch.productId;
              batchMap.set(key, batch.batchNumber);
              console.log(`  ✅ ProductId ${key} → BatchNumber: ${batch.batchNumber}`);
            }
          });
        } else {
          console.warn(`  ⚠️ GRN not found: ${grnId}`);
        }
      } catch (queryError) {
        console.error(`  ❌ Error querying InventoryBatch:`, queryError.message);
      }
    }
    
    // Third try: Try newItems as fallback
    if (batchMap.size === 0) {
      console.log(`\n⚠️  [BATCH-MAP] No batches found in DB, trying newItems...`);
      newItems.forEach((item) => {
        const key = item.productId.toString ? item.productId.toString() : item.productId;
        if (item.batchNumber && !batchMap.has(key)) {
          batchMap.set(key, item.batchNumber);
          console.log(`  ✅ ProductId ${key} (from newItems) → BatchNumber: ${item.batchNumber}`);
        }
      });
    }
    
    console.log(`🔍 [BATCH-MAP] Final batch map: ${batchMap.size} product(s)\n`);

    for (const delta of deltas) {
      try {
        if (delta.type === "QTY_CHANGED" || delta.type === "ITEM_UPDATED") {
          const batchNumber = batchMap.get(delta.productId.toString());
          console.log(`\n🔍 Searching InventoryBatch: productId=${delta.productId}, batchNumber=${batchNumber}`);

          if (!batchNumber) {
            console.warn(`  ⚠️ No batchNumber found for this product - skipping batch update`);
            continue;
          }

          // ✅ Find batch by productId + batchNumber
          let batch = await InventoryBatch.findOne({
            productId: delta.productId,
            batchNumber: batchNumber
          });

          if (batch) {
            console.log(`  ✅ Batch found: ${batch.batchNumber}`);
            const oldQty = batch.quantity;
            const newQty = delta.newQty;

            batch.quantity = newQty;
            batch.quantityRemaining = newQty;

            await batch.save();

            updates.push({
              batchId: batch._id,
              batchNumber: batch.batchNumber,
              oldQty,
              newQty
            });

            console.log(`  ✅ InventoryBatch ${batch.batchNumber}: ${oldQty} → ${newQty}`);
          } else {
            console.warn(`  ⚠️ No InventoryBatch found for ${delta.itemName} (batch: ${batchNumber})`);
          }
        } else if (delta.type === "ITEM_REMOVED") {
          // ✅ For removed items, find and delete the batch
          console.log(`\n🗑️ Deleting batch for removed item: ${delta.itemName}`);

          const batchNumber = batchMap.get(delta.productId.toString());
          if (!batchNumber) {
            console.warn(`  ⚠️ No batchNumber found - cannot delete batch`);
            continue;
          }

          const result = await InventoryBatch.deleteOne({
            productId: delta.productId,
            batchNumber: batchNumber
          });

          if (result.deletedCount > 0) {
            updates.push({
              batchId: null,
              action: "DELETED",
              productId: delta.productId,
              batchNumber: batchNumber
            });

            console.log(`  ✅ InventoryBatch deleted`);
          } else {
            console.warn(`  ⚠️ No batch found to delete`);
          }
        } else if (delta.type === "ITEM_ADDED") {
          // ✅ For new items, create a new InventoryBatch
          console.log(`\n➕ Creating new InventoryBatch for added item: ${delta.itemName}`);

          const batchNumber = batchMap.get(delta.productId.toString());
          if (!batchNumber) {
            console.warn(`  ⚠️ No batchNumber for new item - skipping batch creation`);
            continue;
          }

          const newBatch = new InventoryBatch({
            productId: delta.productId,
            batchNumber: batchNumber,
            purchasePrice: delta.newCost || 0,
            quantity: delta.newQty,
            quantityRemaining: delta.newQty,
            purchaseDate: new Date(),
            batchStatus: "ACTIVE"
          });

          await newBatch.save();

          updates.push({
            batchId: newBatch._id,
            batchNumber: newBatch.batchNumber,
            action: "CREATED",
            qty: delta.newQty
          });

          console.log(`  ✅ New InventoryBatch created: ${newBatch.batchNumber}`);
        }
      } catch (error) {
        console.error(`  ❌ Batch update error:`, error.message);
        throw error;
      }
    }

    return updates;
  }

  /**
   * Recalculate item tax amounts based on netCost and taxPercent
   * Updates each item's taxAmount field in place
   * 
   * @private
   * @param {Array} items - Items to recalculate
   */
  static recalculateItemTaxes(items) {
    for (const item of items) {
      const qty = item.quantity || 0;
      const unitCost = item.unitCost || 0;
      const netCost = qty * unitCost;
      const taxPercent = item.taxPercent || 0;
      
      // ✅ Update netCost = qty * unitCost
      item.netCost = netCost;
      
      // ✅ Recalculate taxAmount = netCost * taxPercent / 100
      const calculatedTax = (netCost * taxPercent) / 100;
      item.taxAmount = calculatedTax;
      
      // Also recalculate totalCost = netCost + tax
      item.totalCost = netCost + calculatedTax;
      
      console.log(`  🧮 Item tax recalc: ${item.itemName} qty=${qty}, netCost=${netCost}, tax%=${taxPercent}% → taxAmount=${calculatedTax}, totalCost=${item.totalCost}`);
    }
  }

  /**
   * Recalculate GRN totals
   * 
   * @private
   */
  static recalculateTotals(items) {
    let totalQty = 0;
    let subtotal = 0;
    let taxAmount = 0;

    for (const item of items) {
      const qty = item.quantity || 0;
      const unitCost = item.unitCost || 0;
      const itemTotal = qty * unitCost;
      const taxPercent = item.taxPercent || 0;

      totalQty += qty;
      subtotal += itemTotal;
      
      // ✅ Recalculate item tax amount based on netCost and taxPercent
      const itemTax = (itemTotal * taxPercent) / 100;
      taxAmount += itemTax;
    }

    const netTotal = subtotal + taxAmount;
    const finalTotal = netTotal;
    const totalAmount = netTotal;  // ✅ totalAmount = subtotal + tax (what vendor pays)

    return {
      totalQty,
      subtotal,
      taxAmount,
      netTotal,
      finalTotal,
      totalAmount  // ✅ Include for payment calculations (includes tax)
    };
  }

  /**
   * Update VendorPayment when GRN amount changes
   * 
   * @private
   * @param {String} grnNumber - GRN number to find payments
   * @param {Number} amountDelta - Change in total amount
   * @returns {Promise<Array>} - Updated payment records
   */
  static async updateVendorPayment(grnIdOrNumber, amountDelta) {
    const updates = [];

    try {
      if (amountDelta === 0) {
        console.log(`💰 No amount change - VendorPayment unchanged`);
        return updates;
      }

      let vendorPayment;
      
      // ✅ Convert grnId to string since VendorPayment.grnId is stored as STRING in DB
      const grnIdString = grnIdOrNumber.toString ? grnIdOrNumber.toString() : String(grnIdOrNumber);
      
      // Try by grnId first (as string, matching DB storage format)
      vendorPayment = await VendorPayment.findOne({ grnId: grnIdString });
      
      // If not found, try by grnNumber
      if (!vendorPayment) {
        vendorPayment = await VendorPayment.findOne({ grnNumber: grnIdString });
      }

      if (!vendorPayment) {
        console.warn(`⚠️ VendorPayment not found for GRN ID: ${grnIdString}`);
        return updates;
      }

      const oldAmount = vendorPayment.initialAmount || 0;
      const oldBalance = vendorPayment.balance || 0;
      
      console.log(`💰 VendorPayment LOOKUP: Found payment for ${grnIdString}`);
      console.log(`💰 BEFORE: initialAmount=${oldAmount}, balance=${oldBalance}`);
      
      // Update payment amounts
      vendorPayment.initialAmount = oldAmount + amountDelta;
      vendorPayment.balance = oldBalance + amountDelta;
      vendorPayment.updatedDate = new Date();

      await vendorPayment.save();

      updates.push({
        vendorPaymentId: vendorPayment._id,
        grnId: grnIdString,
        oldAmount,
        newAmount: vendorPayment.initialAmount,
        oldBalance,
        newBalance: vendorPayment.balance,
        amountDelta
      });

      console.log(`💰 VendorPayment UPDATED: ${oldAmount} → ${vendorPayment.initialAmount} (delta: ${amountDelta > 0 ? "+" : ""}${amountDelta})`);
    } catch (error) {
      console.error(`⚠️ VendorPayment update error:`, error.message);
      // Don't throw - allow GRN edit even if payment update fails
    }

    return updates;
  }

  /**
   * Create comprehensive audit log
   * 
   * @private
   */
  static async createAuditLog(grnId, userId, details) {
    try {
      // ✅ Fetch user to get username
      const user = await User.findById(userId);
      if (!user) {
        console.warn(`⚠️ User ${userId} not found - audit log will be incomplete`);
      }

      const username = user?.username || user?.email || "Unknown";

      // ✅ Create audit log with correct ActivityLog schema
      const log = new ActivityLog({
        userId,
        username,
        action: "UPDATE",  // Valid enum value
        module: "Inventory",  // Valid enum value
        resource: "GRN",  // Required field
        description: `GRN ${grnId.toString().slice(-4)} edited with delta-based updates (${details.deltas?.length || 0} items modified)`,
        status: "success",
        changes: {
          mode: details.mode,
          reason: details.reason,
          itemsModified: details.deltas?.length || 0,
          stockUpdates: details.stockUpdates?.length || 0,
          batchUpdates: details.batchUpdates?.length || 0,
          deltas: details.deltas || [],
          before: details.before,
          after: details.after,
          timestamp: new Date()
        }
      });

      await log.save();
      console.log(`✅ Audit log created: ${log._id}`);
      return log;

    } catch (error) {
      console.warn(`⚠️ Audit log creation failed: ${error.message}`);
      // Return null instead of throwing - audit log is non-critical
      return null;
    }
  }
}

export default GRNBatchEditValidator;
