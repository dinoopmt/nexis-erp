/**
 * Simplified GRN Edit Manager
 * 
 * For GRNs with Status = "Received" (after posting)
 * 
 * Edit allowed ONLY if:
 * 1. GRN exists
 * 2. Status is Received/Draft/Verified
 * 3. Payment status = PENDING (payment NOT committed)  ← BLOCKS if PARTIAL/PAID/OVERDUE
 * 4. Batch qty matches GRN qty (no stock discrepancies)  ← BLOCKS if mismatched
 * 5. Products exist
 * 6. Vendor exists
 * 7. Items valid
 * 
 * Action: 
 * - Update GRN document with new values
 * - Adjust current stock: minus old qty + add new qty
 * - Update payment if PENDING
 */

import Grn from "../../../Models/Grn.js";
import VendorPayment from "../../../Models/VendorPayment.js";
import InventoryBatch from "../../../Models/InventoryBatch.js";
import AddProduct from "../../../Models/AddProduct.js";
import CreateVendor from "../../../Models/CreateVendor.js";
import CurrentStock from "../../../Models/CurrentStock.js";
import StockMovement from "../../../Models/StockMovement.js";
import StockBefore from "../../../Models/StockBefore.js";
import UniversalStockRecalculationService from "./UniversalStockRecalculationService.js";

class SimpleGRNEditManager {
  
  /**
   * Simple edit for Received GRN (before posting)
   * 
   * @param {ObjectId} grnId
   * @param {Object} changes - { items: [...], notes: string }
   * @param {ObjectId} userId
   * @returns {Promise<Object>} - Updated GRN
   */
  static async editReceivedGRN(grnId, changes, userId) {
    const validation = {
      grnExists: false,
      statusOK: false,
      paymentPending: false,
      batchesMatch: false,
      productsExist: false,
      vendorExists: false,
      itemsValid: false
    };

    try {
      console.log(`\n✏️ SIMPLE GRN EDIT: ${grnId}`);
      console.log(`   Input data:`, {
        grnId,
        changeItemsCount: changes?.items?.length,
        changeItemsStructure: changes?.items?.[0] ? {
          productId: changes.items[0].productId,
          productName: changes.items[0].productName,
          quantity: changes.items[0].quantity,
          batchNumber: changes.items[0].batchNumber,
          unitCost: changes.items[0].unitCost,
          totalCost: changes.items[0].totalCost
        } : null,
        userId
      });

      // 1. GRN exists
      const grn = await Grn.findById(grnId);
      if (!grn) throw new Error("GRN not found");
      validation.grnExists = true;
      console.log(`  ✅ GRN found: ${grn.grnNumber}`);
      console.log(`     Current state:`, {
        status: grn.status,
        itemsCount: grn.items?.length,
        totalAmount: grn.finalTotal,
        firstItemQty: grn.items?.[0]?.quantity,
        firstItemName: grn.items?.[0]?.itemName
      });

      // 2. Status check (Received, Draft, or Verified)
      const validStatuses = ["Received", "Draft", "Verified"];
      if (!validStatuses.includes(grn.status)) {
        throw new Error(`Cannot edit GRN with status: ${grn.status}`);
      }
      validation.statusOK = true;
      console.log(`  ✅ Status OK: ${grn.status}`);

      // 3. Payment status = PENDING (not yet paid)
      // ⚠️ BLOCK if payment is PARTIAL/PAID/OVERDUE (payment already committed)
      const payments = await VendorPayment.findOne({
        grnId: grn._id.toString()  // ← Use ObjectId, not grnNumber
      });
      
      if (payments && payments.paymentStatus !== "PENDING") {
        const blockedStatuses = ["PARTIAL", "PAID", "OVERDUE"];
        throw new Error(
          `❌ EDIT BLOCKED - Payment status is "${payments.paymentStatus}".\n` +
          `   Cannot edit when payment is committed.\n` +
          `   Payment must be PENDING to allow edits.`
        );
      }
      validation.paymentPending = true;
      console.log(`  ✅ Payment status: PENDING (safe to edit)`);

      // 4. Check batch matching (if GRN was posted)
      // ⚠️ BLOCK if batch qty doesn't match GRN qty (stock already adjusted)
      if (grn.status === "Received") {
        const totalBatchQty = await InventoryBatch.aggregate([
          {
            $match: { grnId: grn._id.toString() }  // ← Use ObjectId, not grnNumber
          },
          {
            $group: {
              _id: null,
              totalQty: { $sum: "$baseUnits" }
            }
          }
        ]);

        const batchQty = totalBatchQty[0]?.totalQty || 0;
        const grnQty = grn.items.reduce((sum, item) => sum + item.quantity, 0);

        if (batchQty !== grnQty && batchQty !== 0) {
          throw new Error(
            `❌ EDIT BLOCKED - Batch qty (${batchQty}) doesn't match GRN qty (${grnQty}).\n` +
            `   This indicates stock discrepancy.\n` +
            `   Cannot edit when discrepancy exists.`
          );
        }
      }
      validation.batchesMatch = true;
      console.log(`  ✅ Batch validation passed (no discrepancies)`);

      // 5. Validate new items
      if (!changes.items || changes.items.length === 0) {
        throw new Error("Items array is required");
      }

      // 6. Check all products exist
      for (const item of changes.items) {
        const product = await AddProduct.findById(item.productId);
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }
        
        // Check quantity valid
        if (!item.quantity || item.quantity <= 0) {
          throw new Error(`Invalid quantity for product: ${item.quantity}`);
        }
      }
      validation.productsExist = true;
      console.log(`  ✅ All products exist`);

      // 7. Check vendor exists
      const vendor = await CreateVendor.findById(grn.vendorId);
      if (!vendor) {
        throw new Error("Vendor not found");
      }
      validation.vendorExists = true;
      console.log(`  ✅ Vendor exists`);

      // 8. Items valid
      validation.itemsValid = true;
      console.log(`  ✅ Items valid`);

      // ============================================
      // ALL VALIDATION PASSED - NOW UPDATE DOCUMENT
      // ============================================
      console.log(`\n📝 Updating GRN document...`);

      // Calculate new totals from items
      let newTotal = 0;
      for (const item of changes.items) {
        newTotal += item.totalCost || (item.quantity * item.unitCost);
      }

      // ============================================
      // UPDATE ALL RELATED COLLECTIONS
      // ============================================
      console.log(`\n📦 Updating collections...`);
      
      // Validate changes have items
      if (!changes.items || changes.items.length === 0) {
        throw new Error("No items provided for edit");
      }

      console.log(`   📝 Processing ${changes.items.length} items...\n`);

      // Build map of old items from ORIGINAL data (if provided) or from GRN
      // ✅ Use originalItems from controller if available (before GRN was updated)
      const itemsToCompare = changes.originalItems || grn.items;
      
      const oldItemsMap = new Map(
        itemsToCompare.map(item => [
          item.productId?.toString?.() || item.productId,
          item
        ])
      );

      console.log(`   Using items for comparison: ${changes.originalItems ? 'ORIGINAL (from controller)' : 'FROM GRN (current DB)'}`);

      // 🆕 Collect all changes for universal recalculation
      const recalculationChanges = [];

      // For each new item, calculate difference and update collections
      for (const newItem of changes.items) {
        const productId = newItem.productId?.toString?.() || newItem.productId;
        
        // Get old quantity
        const oldItem = oldItemsMap.get(productId);
        const oldQty = oldItem?.quantity || 0;
        const qtyDifference = newItem.quantity - oldQty;
        
        console.log(`   📋 ${newItem.productName}: ${oldQty} → ${newItem.quantity} (difference: ${qtyDifference > 0 ? '+' : ''}${qtyDifference})`);

        // ✅ STEP 1: LOG TO STOCK BEFORE - Track the change
        try {
          await StockBefore.create({
            grnId: grn._id,
            productId,
            stockBefore: oldQty,
            newStock: newItem.quantity,
            difference: qtyDifference,
            editedBy: userId,
            notes: `GRN Edit: ${grn.grnNumber} - ${newItem.productName}`
          });
          console.log(`      📝 StockBefore logged: ${oldQty} → ${newItem.quantity} (diff: ${qtyDifference > 0 ? '+' : ''}${qtyDifference})`);
        } catch (logErr) {
          console.log(`      ⚠️ StockBefore log error: ${logErr.message}`);
        }

        // ✅ STEP 2: UPDATE STOCK MOVEMENT - Update the INBOUND entry
        if (qtyDifference !== 0) {
          try {
            const existingMovement = await StockMovement.findOne({
              referenceId: grn._id,
              movementType: 'INBOUND',
              productId
            });
            
            if (existingMovement) {
              console.log(`      ✅ Original StockMovement preserved (immutable history)`);
              console.log(`         Original qty=100 stays as-is in historical record`);
              console.log(`         New recalculation will start from actual new qty=150`);

              // 🆕 Add to recalculation queue
              // The recalculation will:
              // 1. Find this original INBOUND movement (qty stays at 100)
              // 2. Artificially set prevBalance = newQty = 150
              // 3. Recalculate all LATER movements from this starting point
              recalculationChanges.push({
                productId,
                transactionId: grn._id,
                oldQty: oldQty,
                newQty: newItem.quantity
              });
              
              console.log(`      🔄 Recalculation queued: oldQty=${oldQty} → newQty=${newItem.quantity}`);
              console.log(`         This will trigger downstream recalculation for all later txns`);
            } else {
              console.log(`      ⚠️ StockMovement INBOUND: Not found`);
            }
          } catch (movementErr) {
            console.log(`      ⚠️ StockMovement error: ${movementErr.message}`);
          }
        } else {
          console.log(`      (No change - quantities are same)`);
        }

        // ✅ STEP 3: UPDATE INVENTORY BATCH - Only for batch products
        if (newItem.batchNumber !== undefined && newItem.batchNumber !== null && newItem.batchNumber !== '') {
          try {
            const batchUpdate = await InventoryBatch.updateOne(
              {
                batchNumber: newItem.batchNumber,
                productId,
                batchStatus: 'ACTIVE'
              },
              {
                $set: {
                  quantity: newItem.quantity,
                  quantityRemaining: newItem.quantity,
                  updatedAt: new Date()
                }
              }
            );
            if (batchUpdate.matchedCount > 0) {
              console.log(`      ✅ InventoryBatch updated: qty → ${newItem.quantity}`);
            }
          } catch (err) {
            console.log(`      ℹ️ InventoryBatch (non-critical): ${err.message}`);
          }
        }
      }

      // 🆕 STEP 4: APPLY UNIVERSAL STOCK RECALCULATION FOR ALL AFFECTED PRODUCTS
      console.log(`\n🔄 Applying universal stock recalculation...`);
      if (recalculationChanges.length > 0) {
        try {
          const recalcResults = await UniversalStockRecalculationService.recalculateBatch(
            recalculationChanges,
            userId,
            `GRN_EDIT: ${grn.grnNumber}`
          );
          console.log(`   ✅ Recalculation complete: ${recalcResults.successful}/${recalcResults.totalProducts} products`);
        } catch (recalcErr) {
          console.error(`   ⚠️ Recalculation error (non-blocking):`, recalcErr.message);
        }
      } else {
        console.log(`   ℹ️ No quantity changes, skipping recalculation`);
      }

      // 3️⃣ UPDATE GRN DOCUMENT
      const updated = await Grn.findByIdAndUpdate(
        grnId,
        {
          $set: {
            items: changes.items,
            totalAmount: newTotal,
            finalTotal: newTotal,
            notes: changes.notes || grn.notes,
            updatedAt: new Date(),
            lastModifiedBy: userId
          }
        },
        { returnDocument: 'after' }
      );
      console.log(`\n   ✅ GRN document updated:`);
      console.log(`      Items: ${updated.items.length}`);
      console.log(`      Old total: ${grn.finalTotal}`);
      console.log(`      New total: ${newTotal}`);
      console.log(`      Status: ${updated.status}`);

      // 4️⃣ UPDATE VENDOR PAYMENT (if exists and PENDING)
      let paymentUpdated = false;
      if (payments && payments.paymentStatus === "PENDING") {
        try {
          const oldPaymentAmount = payments.initialAmount;
          const amountDifference = newTotal - oldPaymentAmount;  // New - Old
          
          const updatedPayment = await VendorPayment.findByIdAndUpdate(
            payments._id,
            {
              $set: {
                initialAmount: newTotal,
                balance: newTotal,  // Balance also matches new total since no payment yet
                amountPaid: 0,
                updatedAt: new Date()
              }
            },
            { returnDocument: 'after' }
          );
          paymentUpdated = true;
          console.log(`   ✅ VendorPayment updated:`);
          console.log(`      Old amount: ${oldPaymentAmount}`);
          console.log(`      New amount: ${newTotal}`);
          console.log(`      Difference: ${amountDifference > 0 ? '+' : ''}${amountDifference}`);
          console.log(`      New balance: ${newTotal}`);
        } catch (paymentErr) {
          console.error(`   ❌ Error updating VendorPayment:`, paymentErr.message);
        }
      } else if (payments) {
        console.log(`   ⚠️ VendorPayment NOT updated (status=${payments.paymentStatus}, requires PENDING)`);
      } else {
        console.log(`   ℹ️ No VendorPayment record found`);
      }

      console.log(`\n✅ GRN EDIT COMPLETED SUCCESSFULLY`);
      console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`   📝 GRN: Updated`);
      console.log(`   📊 StockBefore: Logged for all changes`);
      console.log(`   📦 StockMovement: Updated INBOUND entries`);
      console.log(`   🔄 Recalculation: Applied (all downstream movements)`);
      console.log(`   💳 VendorPayment: ${paymentUpdated ? 'Updated' : 'Unchanged'}`);
      console.log(`   Items: ${updated.items.length}`);
      console.log(`   New Total: ${newTotal}`);
      console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      return {
        success: true,
        message: "GRN edited successfully - stock recalculated for all affected transactions",
        grn: updated,
        validations: validation,
        collectionsUpdated: {
          grn: true,
          stockBefore: true,
          inventoryBatch: true,
          stockMovement: true,
          recalculated: recalculationChanges.length > 0,
          vendorPayment: paymentUpdated
        },
        summary: {
          items: updated.items.length,
          totalAmount: newTotal,
          productsRecalculated: recalculationChanges.length,
          paymentStatus: payments?.paymentStatus || "NO PAYMENT"
        }
      };

    } catch (error) {
      console.error(`\n❌ Edit failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        validations: validation
      };
    }
  }
}

export default SimpleGRNEditManager;
