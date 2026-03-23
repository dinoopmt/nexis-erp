/**
 * ✅ IMPROVED GRN EDIT MANAGER - TRANSACTION VERSION (PRODUCTION)
 * 
 * Features:
 * 1. ✅ MongoDB transactions for atomic operations
 * 2. ✅ Delta calculation (newQty - oldQty)
 * 3. ✅ Atomic stock updates using $inc
 * 4. ✅ Automatic availableQuantity recalculation
 * 5. ✅ Automatic rollback on error
 * 6. ✅ Handles item additions, modifications, and removals
 * 7. ✅ Comprehensive logging
 * 
 * REQUIRES: MongoDB configured for transactions (replica set)
 * See: MONGODB_REPLICA_SET_SETUP.md
 */

import mongoose from 'mongoose';
import Grn from '../../../Models/Grn.js';
import CurrentStock from '../../../Models/CurrentStock.js';
import StockMovement from '../../../Models/StockMovement.js';
import InventoryBatch from '../../../Models/InventoryBatch.js';
import VendorPayment from '../../../Models/VendorPayment.js';
import StockBefore from '../../../Models/StockBefore.js';

class ImprovedGRNEditManager {
  /**
   * Edit GRN with transaction support
   * 
   * @param {ObjectId} grnId - GRN ID to edit
   * @param {Object} changes - { items: [...], notes?: string }
   * @param {ObjectId} userId - User making the change
   * @returns {Promise<Object>} - Result with success status and details
   */
  static async editGRN(grnId, changes, userId) {
    const session = await mongoose.startSession();

    try {
      console.log(`\n✏️ IMPROVED GRN EDIT (Transaction-Based): ${grnId}`);
      
      let result = null;

      // All operations happen atomically within this transaction
      await session.withTransaction(async () => {
        // ===============================================
        // STEP 1: FETCH EXISTING GRN AND VALIDATE
        // ===============================================
        const oldGRN = await Grn.findById(grnId).session(session);

        if (!oldGRN) {
          throw new Error(`GRN not found: ${grnId}`);
        }

        console.log(`  ✅ GRN found: ${oldGRN.grnNumber}`);
        console.log(`     Status: ${oldGRN.status}`);
        console.log(`     Old items: ${oldGRN.items?.length}`);
        console.log(`     New items: ${changes.items?.length}`);

        // Validation
        const validStatuses = ['Draft', 'Received', 'Verified'];
        if (!validStatuses.includes(oldGRN.status)) {
          throw new Error(`Cannot edit GRN with status: ${oldGRN.status}`);
        }

        // Check payment status
        const existingPayment = await VendorPayment.findOne({
          grnId: oldGRN._id.toString()
        }).session(session);

        if (existingPayment && existingPayment.paymentStatus !== 'PENDING') {
          throw new Error(
            `Cannot edit GRN - Payment status is ${existingPayment.paymentStatus}. ` +
            `Only PENDING payments can be edited.`
          );
        }

        // ===============================================
        // STEP 2: BUILD ITEM MAPS (OLD vs NEW)
        // ===============================================
        const oldItemMap = this.buildItemMap(oldGRN.items);
        const newItemMap = this.buildItemMap(changes.items);

        console.log(`  📊 Item maps created`);
        console.log(`     Old items: ${oldItemMap.size}`);
        console.log(`     New items: ${newItemMap.size}`);

        // ===============================================
        // STEP 3: CALCULATE DELTAS FOR EACH PRODUCT
        // ===============================================
        const allKeys = new Set([...oldItemMap.keys(), ...newItemMap.keys()]);
        const deltas = [];
        const stockUpdates = [];

        for (const key of allKeys) {
          const { productId, batchNumber } = this.parseItemKey(key);
          const oldQty = oldItemMap.get(key)?.quantity || 0;
          const newQty = newItemMap.get(key)?.quantity || 0;
          const delta = newQty - oldQty;

          if (delta !== 0) {
            deltas.push({
              key,
              productId,
              batchNumber,
              oldQty,
              newQty,
              delta,
              oldItem: oldItemMap.get(key),
              newItem: newItemMap.get(key)
            });

            console.log(`  📋 ${productId}: ${oldQty} → ${newQty} (delta: ${delta > 0 ? '+' : ''}${delta})`);
          }
        }

        // ===============================================
        // STEP 4: UPDATE CURRENT STOCK WITH DELTAS
        // ===============================================
        console.log(`\n  🔄 Updating current stock...`);

        for (const delta of deltas) {
          const { productId, oldQty, newQty } = delta;

          // Update stock with delta using $inc (atomic increment)
          const updated = await CurrentStock.findOneAndUpdate(
            { productId },
            {
              $inc: { totalQuantity: delta.delta },
              $set: { updatedAt: new Date(), updatedBy: userId }
            },
            { upsert: true, session, returnDocument: 'after' }
          );

          console.log(`     ✅ ${productId}: ${oldQty} → ${newQty}`);
          console.log(`        totalQuantity: ${updated.totalQuantity - delta.delta} → ${updated.totalQuantity}`);

          stockUpdates.push({
            productId,
            oldBalance: updated.totalQuantity - delta.delta,
            newBalance: updated.totalQuantity,
            deltaApplied: delta.delta
          });
        }

        // ===============================================
        // STEP 5: RECALCULATE AVAILABLE QUANTITY
        // ===============================================
        console.log(`\n  🧮 Recalculating available quantities...`);

        for (const delta of deltas) {
          const { productId } = delta;

          const stock = await CurrentStock.findOne({ productId }).session(session);

          if (stock) {
            // availableQty = totalQty - allocatedQty - damageQty
            const availableQty = 
              (stock.totalQuantity || 0) - 
              (stock.allocatedQuantity || 0) - 
              (stock.damageQuality || 0);

            await CurrentStock.updateOne(
              { productId },
              {
                $set: { availableQuantity: Math.max(0, availableQty) }
              },
              { session }
            );

            console.log(`     ✅ ${productId}: availableQty = ${availableQty}`);
          }
        }

        // ===============================================
        // STEP 6: UPDATE INVENTORY BATCHES (if applicable)
        // ===============================================
        console.log(`\n  📦 Updating inventory batches...`);

        for (const delta of deltas) {
          const { productId, batchNumber, newQty } = delta;

          if (batchNumber) {
            const batchUpdate = await InventoryBatch.findOneAndUpdate(
              {
                batchNumber,
                productId,
                batchStatus: 'ACTIVE'
              },
              {
                $set: {
                  quantity: newQty,
                  quantityRemaining: newQty,
                  updatedAt: new Date()
                }
              },
              { session, returnDocument: 'after' }
            );

            if (batchUpdate) {
              console.log(`     ✅ Batch ${batchNumber}: qty → ${newQty}`);
            }
          }
        }

        // ===============================================
        // STEP 7: UPDATE ORIGINAL STOCK MOVEMENTS (audit trail)
        // ===============================================
        console.log(`\n  📜 Updating stock movement records...`);

        for (const delta of deltas) {
          const { productId, oldQty, newQty } = delta;

          // Find and update the original StockMovement created when GRN was posted
          const updatedMovement = await StockMovement.findOneAndUpdate(
            {
              referenceId: oldGRN._id,
              productId,
              movementType: 'INBOUND'
            },
            {
              $set: {
                quantity: newQty,
                newStock: newQty,
                currentStock: newQty,
                totalAmount: newQty * (delta.newItem?.unitCost || delta.oldItem?.unitCost || 0),
                updatedAt: new Date()
              }
            },
            { session, returnDocument: 'after' }
          );

          if (updatedMovement) {
            console.log(`     ✅ StockMovement updated: ${productId} (qty: ${oldQty} → ${newQty})`);
          }
        }

        // ===============================================
        // STEP 8: LOG STOCK MOVEMENTS (auditing)
        // ===============================================
        console.log(`\n  📝 Logging stock edit history...`);

        for (const delta of deltas) {
          const { productId, batchNumber, oldQty, newQty } = delta;

          await StockBefore.create([{
            grnId: oldGRN._id,
            productId,
            batchNumber,
            stockBefore: oldQty,
            newStock: newQty,
            difference: delta.delta,
            editedBy: userId,
            notes: `GRN Edit: ${oldGRN.grnNumber}`
          }], { session });

          console.log(`     ✅ StockBefore logged for ${productId}`);
        }

        // ===============================================
        // STEP 9: UPDATE VENDOR PAYMENT (if PENDING)
        // ===============================================
        let paymentUpdated = false;

        if (existingPayment && existingPayment.paymentStatus === 'PENDING') {
          console.log(`\n  💳 Updating vendor payment...`);

          // ✅ Recalculate all GRN totals for accurate payment amount
          const recalculatedTotals = this.recalculateGRNTotals(
            changes.items,
            oldGRN.shippingCost || 0,
            oldGRN.discountAmount || 0
          );

          const newTotal = recalculatedTotals.finalTotal;
          const oldTotal = existingPayment.initialAmount;
          const amountDelta = newTotal - oldTotal;

          const updatedPayment = await VendorPayment.findByIdAndUpdate(
            existingPayment._id,
            {
              $set: {
                initialAmount: newTotal,
                balance: newTotal,
                amountPaid: 0,
                updatedAt: new Date()
              }
            },
            { session, returnDocument: 'after' }
          );

          console.log(`     ✅ Payment updated: ${oldTotal} → ${newTotal} (${amountDelta > 0 ? '+' : ''}${amountDelta})`);
          paymentUpdated = true;
        }

        // ===============================================
        // STEP 10: UPDATE GRN DOCUMENT
        // ===============================================
        console.log(`\n  📝 Updating GRN document...`);

        // ✅ Recalculate ALL GRN totals including tax, discount, etc.
        const newTotals = this.recalculateGRNTotals(
          changes.items,
          oldGRN.shippingCost || 0,
          oldGRN.discountAmount || 0
        );

        // ✅ Update GRN with all recalculated totals
        oldGRN.items = changes.items;
        oldGRN.totalQty = newTotals.totalQty;
        oldGRN.subtotal = newTotals.subtotal;
        oldGRN.discountAmount = newTotals.discountAmount;
        oldGRN.discountPercent = newTotals.discountPercent;
        oldGRN.totalExTax = newTotals.totalExTax;
        oldGRN.taxAmount = newTotals.taxAmount;
        oldGRN.netTotal = newTotals.netTotal;
        oldGRN.finalTotal = newTotals.finalTotal;
        oldGRN.totalAmount = newTotals.finalTotal;
        oldGRN.notes = changes.notes || oldGRN.notes;
        oldGRN.updatedAt = new Date();
        oldGRN.lastModifiedBy = userId;

        await oldGRN.save({ session });

        console.log(`     ✅ GRN updated: ${oldGRN.grnNumber}`);
        console.log(`        totalQty: ${newTotals.totalQty}`);
        console.log(`        subtotal: ${newTotals.subtotal}`);
        console.log(`        taxAmount: ${newTotals.taxAmount}`);
        console.log(`        finalTotal: ${newTotals.finalTotal}`);

        // ===============================================
        // PREPARE RESULT
        // ===============================================
        result = {
          success: true,
          message: 'GRN edited successfully with all collections updated (transaction committed)',
          grnId: oldGRN._id,
          grnNumber: oldGRN.grnNumber,
          changes: {
            itemsCount: changes.items.length,
            deltasApplied: deltas.length,
            productIdsAffected: deltas.map(d => d.productId),
            stockUpdates,
            paymentUpdated,
            totalsRecalculated: newTotals
          }
        };

      }); // End transaction - automatic commit or rollback

      console.log(`\n✅ GRN EDIT COMPLETED SUCCESSFULLY (Transaction Committed)`);
      console.log(`   Items: ${result.changes.itemsCount}`);
      console.log(`   Deltas applied: ${result.changes.deltasApplied}`);
      console.log(`   Payment updated: ${result.changes.paymentUpdated}`);

      return result;

    } catch (error) {
      console.error(`\n❌ GRN Edit failed (Transaction Rolled Back):`, error.message);
      return {
        success: false,
        error: error.message,
        grnId
      };

    } finally {
      await session.endSession();
    }
  }

  /**
   * Build a map of items keyed by productId + batchNumber
   * 
   * @param {Array} items - Array of GRN items
   * @returns {Map} - Map with key: productId|batchNumber, value: item
   */
  static buildItemMap(items) {
    const map = new Map();

    if (!items || items.length === 0) return map;

    items.forEach(item => {
      const key = this.createItemKey(
        item.productId?.toString?.() || item.productId,
        item.batchNumber || 'NO_BATCH'
      );
      map.set(key, item);
    });

    return map;
  }

  /**
   * Create a unique key for an item
   * Uses pipe (|) separator which is safer than underscore
   * 
   * @param {string} productId - Product ID
   * @param {string} batchNumber - Batch number
   * @returns {string} - Unique key
   */
  static createItemKey(productId, batchNumber) {
    return `${productId}|${batchNumber}`;
  }

  /**
   * Parse an item key back to components
   * 
   * @param {string} key - Key created by createItemKey
   * @returns {Object} - { productId, batchNumber }
   */
  static parseItemKey(key) {
    const [productId, batchNumber] = key.split('|');
    return {
      productId,
      batchNumber: batchNumber === 'NO_BATCH' ? '' : batchNumber
    };
  }

  /**
   * Calculate total amount for GRN items
   * 
   * @param {Array} items - GRN items
   * @returns {number} - Total amount
   */
  static calculateGRNTotal(items) {
    if (!items || items.length === 0) return 0;

    return items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity || 0);
      const cost = parseFloat(item.unitCost || item.cost || 0);
      return sum + (qty * cost);
    }, 0);
  }

  /**
   * Recalculate all GRN totals from items
   * 
   * @param {Array} items - GRN items with all details (qty, cost, tax, discount)
   * @param {number} shippingCost - Optional shipping cost
   * @param {number} discountAmount - Optional header-level discount
   * @returns {Object} - Calculated totals
   */
  static recalculateGRNTotals(items, shippingCost = 0, discountAmount = 0) {
    if (!items || items.length === 0) {
      return {
        totalQty: 0,
        subtotal: 0,
        taxAmount: 0,
        netTotal: 0,
        finalTotal: 0,
        discountAmount: 0,
        discountPercent: 0
      };
    }

    let totalQty = 0;
    let subtotal = 0;
    let discountSum = 0;
    let taxSum = 0;

    items.forEach(item => {
      const qty = parseFloat(item.quantity || 0);
      const unitCost = parseFloat(item.unitCost || 0);
      const discount = parseFloat(item.itemDiscount || 0);
      const tax = parseFloat(item.taxAmount || 0);

      totalQty += qty;
      subtotal += (qty * unitCost);
      discountSum += discount;
      taxSum += tax;
    });

    // Apply header-level discount if provided
    const totalDiscount = discountSum + discountAmount;
    const subtotalAfterDiscount = subtotal - totalDiscount;
    const netTotal = subtotalAfterDiscount + taxSum;
    const finalTotal = netTotal + shippingCost;

    return {
      totalQty: parseInt(totalQty),
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: Math.round(totalDiscount * 100) / 100,
      discountPercent: subtotal > 0 ? Math.round((totalDiscount / subtotal) * 100 * 100) / 100 : 0,
      totalExTax: Math.round(subtotalAfterDiscount * 100) / 100,
      taxAmount: Math.round(taxSum * 100) / 100,
      netTotal: Math.round(netTotal * 100) / 100,
      finalTotal: Math.round(finalTotal * 100) / 100
    };
  }
}

export default ImprovedGRNEditManager;
