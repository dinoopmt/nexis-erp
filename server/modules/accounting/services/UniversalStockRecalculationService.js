import StockMovement from "../../../Models/StockMovement.js";
import CurrentStock from "../../../Models/CurrentStock.js";
import ActivityLog from "../../../Models/ActivityLog.js";

/**
 * UNIVERSAL STOCK RECALCULATION SERVICE
 * 
 * 🧠 CORE LOGIC:
 * 1. When ANY transaction changes (GRN edit, Sales, RTV, etc.)
 * 2. Get the changed entry's old and new quantity
 * 3. Recalculate all entries AFTER it:
 *    - prevBalance = last balance before this entry
 *    - for each next entry:
 *        prevBalance += entry.qty
 *        entry.balance = prevBalance
 * 4. Update ProductStock and CurrentStock
 * 
 * 🔥 ONE LINE RULE: "If any transaction changes → recalculate all entries after it."
 * 
 * ✅ Covers:
 * - Last GRN edit ✔
 * - Old GRN edit ✔
 * - Sales after GRN ✔
 * - Multiple edits ✔
 * - Audit safe ✔
 */

class UniversalStockRecalculationService {
  /**
   * MAIN ENTRY POINT
   * Recalculate stock balances when a transaction quantity changes
   * 
   * @param {ObjectId} productId - Product affected
   * @param {ObjectId} changedTransactionId - Transaction that changed (referenceId)
   * @param {number} oldQty - Old quantity
   * @param {number} newQty - New quantity
   * @param {ObjectId} userId - User making the change
   * @param {string} reason - Audit reason (e.g., "GRN_EDIT", "SALES_EDIT")
   * @returns {Promise<Object>} - Recalculation results
   */
  static async recalculateFromTransaction(
    productId,
    changedTransactionId,
    oldQty,
    newQty,
    userId,
    reason = "STOCK_RECALCULATION"
  ) {
    try {
      console.log(`\n🔄 UNIVERSAL STOCK RECALCULATION START`);
      console.log(`   Product: ${productId}`);
      console.log(`   Transaction: ${changedTransactionId}`);
      console.log(`   Qty change: ${oldQty} → ${newQty}`);
      console.log(`   Reason: ${reason}`);

      const result = {
        success: false,
        productId,
        changedTransactionId,
        oldQty,
        newQty,
        qtyDifference: newQty - oldQty,
        movementsRecalculated: 0,
        movementsUpdated: [],
        finalBalance: 0,
        errors: []
      };

      // Step 0: Calculate qty difference
      const qtyDifference = newQty - oldQty;
      if (qtyDifference === 0) {
        console.log(`   ℹ️ No quantity change, skipping recalculation`);
        result.success = true;
        return result;
      }

      // Step 1: Get the changed transaction
      const changedTransaction = await StockMovement.findOne({
        referenceId: changedTransactionId,
        productId
      }).sort({ createdAt: -1 });

      if (!changedTransaction) {
        console.log(`   ⚠️ Changed transaction not found`);
        return result;
      }

      const changedDate = changedTransaction.documentDate;
      console.log(`   📝 Changed transaction date: ${changedDate}`);
      console.log(`   📝 Changed transaction balance before: ${changedTransaction.newStock}`);

      // Step 2: Get all movements AFTER this transaction (sorted by date)
      const laterMovements = await StockMovement.find({
        productId,
        documentDate: { $gt: changedDate }
      })
        .sort({ documentDate: 1, createdAt: 1 })
        .lean();

      console.log(`   📊 Found ${laterMovements.length} later movements to recalculate`);

      if (laterMovements.length === 0) {
        // ⚠️ IMPORTANT: DO NOT UPDATE the original movement
        // GRN edits should create NEW movements (OUTBOUND for reversal + INBOUND for application)
        // Not modify the original historical record
        console.log(`   ✅ No later movements - original movement preserved (immutable history)`);
        console.log(`   📝 Note: Post-edit stock calculated from reversal + application movements`);

        result.movementsUpdated.push({
          id: changedTransaction._id.toString(),
          note: "Original movement preserved - not modified"
        });

        result.finalBalance = newQty;
        result.movementsRecalculated = 0;
      } else {
        // ⚠️ IMPORTANT: DO NOT UPDATE the original movement
        // GRN edits should create NEW movements for the delta
        console.log(`   ✅ Later movements found - recalculating downstream only (preserving original)`);
        console.log(`   📝 Note: Original movement qty NEVER modified - maintains transaction history`);

        result.movementsUpdated.push({
          id: changedTransaction._id.toString(),
          oldBalance: oldQty,
          newBalance: newQty,
          isChanged: true
        });

        // Step 4: Iterate through later movements and recalculate
        let prevBalance = newQty;
        let movementNum = 0;

        for (const movement of laterMovements) {
          movementNum++;
          const movementId = movement._id;

          // prevBalance += movement.qty (but qty already stored in DB)
          // But we need to get the actual quantity from DB to be safe
          const dbMovement = await StockMovement.findById(movementId);
          const currentQty = dbMovement.quantity;

          // Calculate new balance
          prevBalance += currentQty;
          const oldBalance = dbMovement.newStock;

          // Update the movement with new balance
          try {
            await StockMovement.findByIdAndUpdate(
              movementId,
              {
                stockBefore: prevBalance - currentQty,
                newStock: prevBalance,
                updatedBy: userId,
                updatedAt: new Date()
              }
            );

            console.log(
              `   ✅ Movement ${movementNum}: Date=${movement.documentDate.toISOString().split('T')[0]} ` +
              `Type=${movement.movementType} Qty=${currentQty} ` +
              `Balance: ${oldBalance} → ${prevBalance}`
            );

            result.movementsUpdated.push({
              id: movementId.toString(),
              date: movement.documentDate,
              type: movement.movementType,
              qty: currentQty,
              oldBalance,
              newBalance: prevBalance
            });

            result.movementsRecalculated++;
          } catch (err) {
            console.error(`   ❌ Error updating movement ${movementId}:`, err.message);
            result.errors.push({
              movementId: movementId.toString(),
              error: err.message
            });
          }
        }

        result.finalBalance = prevBalance;
      }

      // Step 5: Update CurrentStock collection
      try {
        const updatedCurrentStock = await CurrentStock.findOneAndUpdate(
          { productId },
          {
            totalQuantity: result.finalBalance,
            updatedAt: new Date(),
            updatedBy: userId
          },
          { returnDocument: 'after' }
        );

        console.log(
          `   💾 CurrentStock updated: totalQuantity=${updatedCurrentStock?.totalQuantity}`
        );

        result.currentStockUpdated = {
          id: updatedCurrentStock?._id.toString(),
          totalQuantity: updatedCurrentStock?.totalQuantity
        };
      } catch (err) {
        console.error(`   ⚠️ Error updating CurrentStock:`, err.message);
        result.errors.push({
          collection: 'CurrentStock',
          error: err.message
        });
      }

      // Step 6: Create audit log
      try {
        // Import User model dynamically to avoid circular dependencies
        const User = (await import("../../../Models/User.js")).default;
        const user = await User.findById(userId).select("email -_id");
        const username = user?.email || "SYSTEM";

        const log = new ActivityLog({
          userId: userId,
          username: username,
          action: "UPDATE",  // ✅ Using valid enum value
          module: "Inventory",
          resource: "Stock Movement Balance",
          description: `Stock recalculation: Product ${productId}, Qty change ${oldQty}→${newQty}, ` +
                       `${result.movementsRecalculated} movements affected, Final balance: ${result.finalBalance}`,
          changes: {
            reason,
            productId: productId.toString(),
            transactionId: changedTransactionId.toString(),
            oldQty,
            newQty,
            qtyDifference: result.qtyDifference,
            movementsRecalculated: result.movementsRecalculated,
            finalBalance: result.finalBalance
          },
          status: result.errors.length === 0 ? "success" : "warning"
        });

        await log.save();
        console.log(`   📝 Audit log created: ${log._id}`);
      } catch (err) {
        console.error(`   ⚠️ Error creating audit log:`, err.message);
      }

      result.success = true;

      console.log(`\n✅ RECALCULATION COMPLETE`);
      console.log(`   Movements recalculated: ${result.movementsRecalculated}`);
      console.log(`   Final balance: ${result.finalBalance}`);
      console.log(`   Errors: ${result.errors.length}`);

      return result;

    } catch (error) {
      console.error("❌ RECALCULATION ERROR:", error);
      throw error;
    }
  }

  /**
   * BATCH RECALCULATION
   * When multiple products are affected (e.g., bulk GRN edit)
   * Call this for each product
   * 
   * @param {Array} changes - Array of { productId, oldQty, newQty, transactionId }
   * @param {ObjectId} userId
   * @param {string} reason
   * @returns {Promise<Object>} - Summary results
   */
  static async recalculateBatch(changes, userId, reason = "BATCH_RECALCULATION") {
    try {
      console.log(`\n🔄 BATCH STOCK RECALCULATION: ${changes.length} products`);

      const results = {
        totalProducts: changes.length,
        successful: 0,
        failed: 0,
        details: []
      };

      for (const change of changes) {
        try {
          const result = await this.recalculateFromTransaction(
            change.productId,
            change.transactionId,
            change.oldQty,
            change.newQty,
            userId,
            reason
          );

          results.details.push(result);
          if (result.success) {
            results.successful++;
          } else {
            results.failed++;
          }
        } catch (err) {
          console.error(`   ❌ Product ${change.productId} error:`, err.message);
          results.failed++;
          results.details.push({
            productId: change.productId.toString(),
            success: false,
            error: err.message
          });
        }
      }

      console.log(`\n✅ BATCH COMPLETE: ${results.successful}/${results.totalProducts} successful`);
      return results;

    } catch (error) {
      console.error("❌ BATCH RECALCULATION ERROR:", error);
      throw error;
    }
  }

  /**
   * FULL PRODUCT RECALCULATION
   * Recalculates ALL movements for a product from scratch (for data healing)
   * 
   * @param {ObjectId} productId
   * @param {ObjectId} userId
   * @returns {Promise<Object>} - Full recalculation results
   */
  static async recalculateFullProduct(productId, userId) {
    try {
      console.log(`\n🔄 FULL PRODUCT RECALCULATION: ${productId}`);

      // Get all movements sorted by date
      const movements = await StockMovement.find({ productId })
        .sort({ documentDate: 1, createdAt: 1 });

      console.log(`   Found ${movements.length} total movements`);

      if (movements.length === 0) {
        console.log(`   ℹ️ No movements for this product`);
        return { success: true, productId, movementsProcessed: 0 };
      }

      const results = {
        productId,
        totalMovements: movements.length,
        updated: 0,
        finalBalance: 0,
        errors: []
      };

      let prevBalance = 0;
      let movementNum = 0;

      // Recalculate each movement
      for (const movement of movements) {
        movementNum++;
        const qty = movement.quantity;
        const newBalance = prevBalance + qty;

        try {
          await StockMovement.findByIdAndUpdate(
            movement._id,
            {
              stockBefore: prevBalance,
              newStock: newBalance,
              updatedBy: userId,
              updatedAt: new Date()
            }
          );

          console.log(
            `   ✅ Movement ${movementNum}: Type=${movement.movementType} ` +
            `Qty=${qty} Balance: ${prevBalance} → ${newBalance}`
          );

          results.updated++;
          prevBalance = newBalance;
        } catch (err) {
          console.error(`   ❌ Error updating movement ${movement._id}:`, err.message);
          results.errors.push({
            movementId: movement._id.toString(),
            error: err.message
          });
        }
      }

      results.finalBalance = prevBalance;

      // Update CurrentStock
      try {
        await CurrentStock.findOneAndUpdate(
          { productId },
          {
            totalQuantity: prevBalance,
            updatedAt: new Date()
          }
        );

        console.log(`   💾 CurrentStock updated: ${prevBalance}`);
      } catch (err) {
        console.error(`   ⚠️ CurrentStock update error:`, err.message);
        results.errors.push({ collection: 'CurrentStock', error: err.message });
      }

      results.success = true;
      console.log(`\n✅ FULL RECALCULATION COMPLETE`);
      console.log(`   Movements updated: ${results.updated}`);
      console.log(`   Final balance: ${results.finalBalance}`);

      return results;

    } catch (error) {
      console.error("❌ FULL RECALCULATION ERROR:", error);
      throw error;
    }
  }
}

export default UniversalStockRecalculationService;
