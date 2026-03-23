import Grn from "../../../Models/Grn.js";
import AddProduct from "../../../Models/AddProduct.js";
import CurrentStock from "../../../Models/CurrentStock.js";
import StockMovement from "../../../Models/StockMovement.js";
import ActivityLog from "../../../Models/ActivityLog.js";
import InventoryBatch from "../../../Models/InventoryBatch.js";
import VendorPayment from "../../../Models/VendorPayment.js";
import FailedEdit from "../../../Models/FailedEdit.js";
import CostingService from "../../../services/CostingService.js";
import StockHistoryManager from "../../../utils/StockHistoryManager.js";
import GRNTransactionValidator from "./GRNTransactionValidator.js";
import StockRecalculationHelper from "./StockRecalculationHelper.js";
import mongoose from "mongoose";

/**
 * GRNEditManager
 * Comprehensive GRN editing workflow for both Draft and Posted GRNs
 * 
 * Scenarios:
 * 1. Edit Draft GRN (before posting) - Simple quantity/cost updates
 * 2. Edit Posted GRN - Reverse stock, recalculate, apply new values
 * 3. Delete line items - Manage stock rollback
 * 4. Add line items to posted GRN - Append new products
 * 5. Track all changes with audit trail
 * 6. Prevent concurrent edits
 * 
 * Key Features:
 * - Two-phase updates for posted GRNs (reverse -> recalculate -> apply)
 * - Atomic transaction handling
 * - Complete change history tracking
 * - Validates stock availability for reversals
 * - Recalculates costs using appropriate method (FIFO/LIFO/WAC)
 */

class GRNEditManager {
  /**
   * Validate if GRN can be edited
   * Checks both status AND downstream transactions
   * 
   * ✅ Can edit: Draft GRN (no transactions possible)
   * ✅ Can edit: Posted GRN with NO vendor payments, sales, or returns
   * ❌ Cannot edit: Any vendor payment made
   * ❌ Cannot edit: Any stock consumed
   * ❌ Cannot edit: Any returns committed
   * 
   * @param {ObjectId} grnId
   * @returns {Promise<Object>} - { canEdit: boolean, reason: string, currentStatus: string, transactionCheck: object }
   */
  static async validateEditability(grnId) {
    try {
      const grn = await Grn.findById(grnId);
      
      if (!grn) {
        return { canEdit: false, reason: "GRN not found", currentStatus: null, transactionCheck: null };
      }

      if (grn.status === 'Rejected') {
        return { canEdit: false, reason: "Rejected GRNs cannot be edited", currentStatus: 'Rejected', transactionCheck: null };
      }

      const canEditByStatus = ['Draft', 'Received', 'Verified'].includes(grn.status);
      if (!canEditByStatus) {
        return {
          canEdit: false,
          reason: `Cannot edit GRN with status: ${grn.status}`,
          currentStatus: grn.status,
          transactionCheck: null
        };
      }
      
      // ✅ For Draft GRNs: No need to check transactions (not posted yet)
      if (grn.status === 'Draft') {
        return {
          canEdit: true,
          reason: "GRN can be edited (Draft status)",
          currentStatus: grn.status,
          postedDate: null,
          postedBy: null,
          transactionCheck: {
            bypassTransactionCheck: true,
            reason: "No transaction check needed for Draft GRNs"
          }
        };
      }
      
      // ✅ For Posted GRNs: Check downstream transactions
      console.log(`\n🔐 Checking transaction dependencies for Posted GRN ${grnId}`);
      const transactionCheck = await GRNTransactionValidator.validateEditPermission(grnId);
      
      return {
        canEdit: transactionCheck.canEdit,
        reason: transactionCheck.reason,
        currentStatus: grn.status,
        postedDate: grn.postedDate || null,
        postedBy: grn.postedBy || null,
        transactionCheck: transactionCheck.transactionSummary
      };

    } catch (error) {
      console.error("❌ Validation error:", error);
      throw error;
    }
  }

  /**
   * ========================================
   * CONCURRENCY CONTROL: Edit Locks
   * ========================================
   */

  /**
   * Acquire pessimistic lock on GRN before editing
   * Prevents concurrent edits by the same or different users
   * 
   * @param {ObjectId} grnId - GRN to lock
   * @param {ObjectId} userId - User acquiring lock
   * @param {Number} lockDurationMs - How long lock lasts (default 30 min)
   * @returns {Promise<Object>} - { locked: true/false, expiresAt }
   */
  static async acquireEditLock(grnId, userId, lockDurationMs = 30 * 60 * 1000) {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + lockDurationMs);

      console.log(`🔒 Acquiring edit lock for GRN ${grnId} by user ${userId}`);

      // ✅ ATOMIC: Only update if lock is free or expired
      const updated = await Grn.findOneAndUpdate(
        {
          _id: grnId,
          $or: [
            { editLock: null },                        // No lock
            { "editLock.expiresAt": { $lt: now } },   // Lock expired
          ],
        },
        {
          editLock: {
            lockedBy: userId,
            lockedAt: now,
            expiresAt,
          },
        },
        { returnDocument: "after" }
      );

      if (!updated) {
        // Lock is held by someone else
        const existingLock = await Grn.findById(grnId).select("editLock");
        
        // Safety check: ensure lock exists before accessing it
        if (!existingLock || !existingLock.editLock) {
          const lockError = new Error(
            `Cannot acquire lock for GRN (lock state invalid)`
          );
          lockError.code = "LOCK_STATE_ERROR";
          throw lockError;
        }
        
        const lockError = new Error(
          `GRN is locked by another user until ${existingLock.editLock.expiresAt?.toISOString?.() || 'unknown time'}`
        );
        lockError.code = "EDIT_LOCKED";
        lockError.existingLock = existingLock.editLock;
        throw lockError;
      }

      console.log(`✅ Lock acquired for GRN ${grnId} (expires in ${lockDurationMs / 1000}s)`);
      return { locked: true, expiresAt };
    } catch (error) {
      console.error(`❌ Failed to acquire lock: ${error.message}`);
      throw error;
    }
  }

  /**
   * Release edit lock after edit completes or fails
   * Only the user who locked it can unlock it
   * 
   * @param {ObjectId} grnId
   * @param {ObjectId} userId
   * @returns {Promise<Boolean>} - Success
   */
  static async releaseEditLock(grnId, userId) {
    try {
      const updated = await Grn.findOneAndUpdate(
        {
          _id: grnId,
          "editLock.lockedBy": userId, // ← Only release if YOU locked it
        },
        { editLock: null },
        { returnDocument: "after" }
      );

      if (!updated) {
        console.warn(
          `⚠️ Lock not released for GRN ${grnId} - may belong to another user or no lock exists`
        );
        return false;
      }

      console.log(`✅ Lock released for GRN ${grnId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error releasing lock: ${error.message}`);
      throw error;
    }
  }

  /**
   * ========================================
   * VALIDATION: Pre-edit safety checks
   * ========================================
   */

  /**
   * Comprehensive pre-edit validation
   * Validates BEFORE entering transaction to fail fast and save time
   * 
   * @param {ObjectId} grnId
   * @param {Object} proposedChanges - { items: [...], notes: string }
   * @param {ObjectId} userId
   * @returns {Promise<Object>} - { safe: boolean, checks: {}, error: string }
   */
  static async validateEditSafety(grnId, proposedChanges, userId) {
    const checks = {
      grnExists: false,
      hasItems: false,
      canEdit: false,
      paymentStatus: false,
      stockSufficient: false,
      userPermission: false,
      quantityValid: false,
      noConcurrentEdit: false,
    };

    try {
      console.log(`\n🔍 Pre-edit validation for GRN ${grnId}`);

      // Check 0: Items array is provided (REQUIRED)
      if (!proposedChanges.items || !Array.isArray(proposedChanges.items) || proposedChanges.items.length === 0) {
        throw new Error(
          `❌ EDIT REQUEST INCOMPLETE: 'items' array is required with new item details. ` +
          `Format: { items: [{ productId, quantity, unitCost, totalCost, ... }], notes: "..." }`
        );
      }
      checks.hasItems = true;

      // Check 1: GRN exists
      const grn = await Grn.findById(grnId);
      if (!grn) throw new Error("GRN not found");
      checks.grnExists = true;

      // Check 2: Can edit by transaction validator
      const editCheck = await GRNTransactionValidator.validateEditPermission(grnId);
      if (!editCheck.canEdit) {
        throw new Error(
          editCheck.reason || "Cannot edit - GRN has locked transactions (payments/sales/returns)"
        );
      }
      checks.canEdit = true;

      // Check 3: Payment status check
      const payments = await VendorPayment.find({ grnId });
      const hasLockedPayments = payments.some((p) =>
        ["PARTIAL", "PAID", "OVERDUE"].includes(p.paymentStatus)
      );
      if (hasLockedPayments) {
        throw new Error("Cannot edit - confirmed vendor payments exist");
      }
      checks.paymentStatus = true;

      // Check 4: Stock availability for reversals
      // LOGIC: For Posted GRN edits, system will:
      //   Phase 0: Reverse old qty → Stock increases
      //   Phase 1: Apply new qty → Stock decreases
      // So we only need: availableStock >= NET_INCREASE_NEEDED
      // Where: NET_INCREASE_NEEDED = newQty - originalQty
      
      for (const item of proposedChanges.items || []) {
        const currentStock = await CurrentStock.findOne({
          productId: item.productId,
        });

        // Find original quantity from GRN
        const originalItem = grn.items.find(
          (i) => i.productId.toString() === item.productId.toString()
        );
        const originalQty = originalItem ? originalItem.quantity : 0;
        const newQty = item.quantity || 0;
        
        // Calculate NET change needed
        const netChange = newQty - originalQty;

        // ✅ If decreasing qty: no stock needed (reversal gives back more than we take)
        // ✅ If increasing qty: need enough stock to cover the difference
        if (netChange > 0) {
          // Need additional stock
          if (!currentStock || currentStock.availableQuantity < netChange) {
            throw new Error(
              `Insufficient stock for product ${item.productId}: ` +
              `need additional ${netChange} units (edit: ${originalQty}→${newQty}), ` +
              `but only ${currentStock?.availableQuantity || 0} available`
            );
          }
        } else if (netChange < 0) {
          // Decreasing qty - always allowed (reversal returns stock)
          console.log(`   ✓ Qty decrease OK: ${originalQty}→${newQty} (returns ${Math.abs(netChange)} units)`);
        }
      }
      checks.stockSufficient = true;

      // Check 5: No concurrent edit (user has lock)
      if (grn.editLock && grn.editLock.expiresAt > new Date()) {
        if (grn.editLock.lockedBy.toString() !== userId.toString()) {
          throw new Error(
            `GRN is being edited by another user until ${grn.editLock.expiresAt.toISOString()}`
          );
        }
      }
      checks.noConcurrentEdit = true;

      // Check 6: Quantities valid (positive, non-zero)
      for (const item of proposedChanges.items || []) {
        if (!item.quantity || item.quantity <= 0) {
          throw new Error(
            `Invalid quantity for product ${item.productId}: ${item.quantity}`
          );
        }
      }
      checks.quantityValid = true;

      console.log(`✅ All validation checks passed`);
      return {
        safe: true,
        checks,
        message: "All validation checks passed",
      };
    } catch (error) {
      console.error(`❌ Validation failed: ${error.message}`);
      return {
        safe: false,
        checks,
        error: error.message,
        message: `Edit validation failed: ${error.message}`,
      };
    }
  }

  /**
   * ========================================
   * TRANSACTION WRAPPER: Two-phase commit
   * ========================================
   */

  /**
   * Edit Posted GRN with full transaction support
   * Wraps updateRelatedCollections with:
   * - Pre-validation
   * - Lock acquisition
   * - MongoDB transaction (atomic all-or-nothing)
   * - Auto-rollback on failure
   * - Lock release
   * - Error logging for recovery
   * 
   * @param {ObjectId} grnId
   * @param {Object} changes - { items: [...], notes: string }
   * @param {ObjectId} userId
   * @returns {Promise<Object>} - { success, result }
   */
  static async editPostedGRNWithTransaction(grnId, changes, userId) {
    let lockAcquired = false;
    let sessionCreated = false;
    const session = await mongoose.startSession();

    try {
      console.log(`\n${'═'.repeat(80)}`);
      console.log(`🔐 TRANSACTION START: Edit Posted GRN ${grnId}`);
      console.log(`${'═'.repeat(80)}`);

      // Step 1: Pre-validation (before lock/transaction)
      const validation = await this.validateEditSafety(grnId, changes, userId);
      if (!validation.safe) {
        throw new Error(validation.error);
      }

      // Step 2: Acquire lock
      await this.acquireEditLock(grnId, userId);
      lockAcquired = true;

      // Step 3: Fetch fresh GRN and old data for snapshot
      const oldData = await Grn.findById(grnId).populate("items.productId");
      if (!oldData) throw new Error("GRN not found");

      // Step 4: Start transaction
      session.startTransaction({
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
        readPreference: "primary",
      });
      sessionCreated = true;

      console.log(`✅ Transaction session started`);

      // Step 5: Update GRN to capture timestamp
      const updatedGRN = await Grn.findByIdAndUpdate(
        grnId,
        { ...changes, $inc: { __v: 1 } },
        { returnDocument: "after", session }
      );

      if (!updatedGRN) throw new Error("Failed to update GRN");
      console.log(`✅ GRN updated (v${updatedGRN.__v})`);

      // Step 6: Cascade updates (Phase 0, 1, 2, 3)
      const cascadeResult = await this.updateRelatedCollections(
        grnId,
        updatedGRN,
        oldData,
        userId,
        session // ← Pass session for all writes
      );

      console.log(`✅ All cascade phases completed`);

      // Step 7: Commit transaction (all-or-nothing)
      await session.commitTransaction();
      console.log(`✅ Transaction COMMITTED - all changes persisted`);

      // Step 8: Release lock
      await this.releaseEditLock(grnId, userId);
      lockAcquired = false;

      return {
        success: true,
        grnId,
        updatedGRN,
        cascade: cascadeResult,
        message: "GRN edited successfully - all changes committed",
      };
    } catch (error) {
      // ROLLBACK on any error
      if (sessionCreated) {
        try {
          await session.abortTransaction();
          console.error(`\n🔄 ROLLBACK executed - all changes reverted`);
        } catch (abortError) {
          console.error(`❌ Abort error: ${abortError.message}`);
        }
      }

      console.error(`❌ TRANSACTION FAILED: ${error.message}`);

      // Release lock if acquired
      if (lockAcquired) {
        try {
          await this.releaseEditLock(grnId, userId);
        } catch (unlockError) {
          console.error(`⚠️ Failed to release lock: ${unlockError.message}`);
        }
      }

      // Log for recovery
      try {
        const grn = await Grn.findById(grnId).select("grnNumber");
        await this.logEditFailure({
          grnId,
          grnNumber: grn?.grnNumber || "UNKNOWN",
          userId,
          phase: error.phase || "transaction",
          error: error.message,
          stack: error.stack,
          proposedChanges: changes,
          originalState: {}, // Would save snapshot if needed
        });
      } catch (logError) {
        console.error(`⚠️ Failed to log failure: ${logError.message}`);
      }

      throw error;
    } finally {
      await session.endSession();
      console.log(`${'═'.repeat(80)}\n`);
    }
  }

  /**
   * Log a failed edit for manual recovery and debugging
   * 
   * @param {Object} failureData
   */
  static async logEditFailure(failureData) {
    try {
      const failure = new FailedEdit({
        grnId: failureData.grnId,
        grnNumber: failureData.grnNumber,
        userId: failureData.userId,
        failedAt: new Date(),
        phase: failureData.phase || "unknown",
        error: failureData.error,
        stack: failureData.stack || "",
        originalState: failureData.originalState || {},
        proposedChanges: failureData.proposedChanges || {},
        recovered: false,
        recoveryAttempts: 0,
      });

      await failure.save();
      console.log(`📋 Failure logged: ${failure._id}`);

      // Alert admin
      console.error(`\n🚨 GRN EDIT FAILED - Recovery ID: ${failure._id}`);
      console.error(`   GRN: ${failureData.grnNumber}`);
      console.error(`   Phase: ${failureData.phase}`);
      console.error(`   Error: ${failureData.error}`);

      return failure;
    } catch (error) {
      console.error(`❌ Failed to log edit failure: ${error.message}`);
    }
  }

  /**
   * Attempt manual recovery of a failed edit
   * 
   * @param {ObjectId} failureId
   * @param {String} action - "retry" or "rollback"
   * @returns {Promise<Object>}
   */
  static async manualEditRecovery(failureId, action = "retry") {
    try {
      const failure = await FailedEdit.findById(failureId);
      if (!failure) throw new Error("Failure record not found");

      console.log(
        `\n🔄 Attempting ${action} recovery for GRN ${failure.grnNumber}`
      );

      if (action === "retry") {
        console.log(`   Retrying edit...`);

        const result = await this.updateRelatedCollections(
          failure.grnId,
          failure.originalState.grn,
          failure.originalState,
          failure.userId
        );

        failure.recovered = true;
      } else if (action === "rollback") {
        console.log(`   Rolling back to original state...`);

        // Restore GRN from snapshot
        await Grn.updateOne({ _id: failure.grnId }, failure.originalState.grn);

        failure.recovered = true;
      }

      failure.recoveryAttempts++;
      failure.recoveryLog.push({
        timestamp: new Date(),
        action,
        result: "success",
      });

      await failure.save();
      console.log(`✅ Recovery successful`);
      return { success: true, recovered: true };
    } catch (error) {
      console.error(`❌ Recovery failed: ${error.message}`);

      failure.recoveryAttempts++;
      failure.recoveryLog.push({
        timestamp: new Date(),
        action,
        result: "failed",
        error: error.message,
      });

      await failure.save();
      throw error;
    }
  }

  /**
   * Edit Draft GRN (before posting)
   * Simple updates without stock impact
   * 
   * @param {ObjectId} grnId
   * @param {Object} updates - { items, grnDate, vendorId, ... }
   * @param {ObjectId} userId - User making the edit
   * @returns {Promise<Object>} - Updated GRN
   */
  static async editDraftGRN(grnId, updates, userId) {
    try {
      console.log(`"\n✏️ Editing Draft GRN ${grnId}`);

      const grn = await Grn.findById(grnId);
      if (!grn) throw new Error("GRN not found");

      if (grn.status !== 'Draft') {
        throw new Error(`Only Draft GRNs can be edited via editDraftGRN. Current status: ${grn.status}`);
      }

      // ✅ 1. Store original state for audit
      const originalData = {
        items: JSON.parse(JSON.stringify(grn.items)),
        totalQty: grn.totalQty,
        totalAmount: grn.totalAmount,
        updatedAt: grn.updatedAt
      };

      // ✅ 2. Apply updates
      const updatedGRN = await Grn.findByIdAndUpdate(
        grnId,
        {
          ...updates,
          updatedBy: userId,
          updatedDate: new Date()
        },
        { returnDocument: 'after', runValidators: true }
      );

      // ✅ 3. Create audit log (no stock impact)
      await this.createEditAuditLog(grnId, userId, 'DRAFT_EDIT', {
        before: originalData,
        after: {
          items: updatedGRN.items,
          totalQty: updatedGRN.totalQty,
          totalAmount: updatedGRN.totalAmount
        },
        status: 'No stock impact - Draft mode'
      });

      console.log(`✅ Draft GRN updated successfully`);
      return updatedGRN;

    } catch (error) {
      console.error("❌ Draft edit error:", error.message);
      throw error;
    }
  }

  /**
   * Edit Posted GRN (after posting)
   * 
   * ⚠️ CRITICAL CONSTRAINTS:
   * - Cannot edit if vendor payments made
   * - Cannot edit if stock consumed by sales
   * - Cannot edit if returns committed
   * - Only cost adjustments allowed if stock was consumed
   * 
   * Two-phase operation when allowed:
   * Phase 1: Reverse original stock impact
   * Phase 2: Apply new stock with recalculated costs
   * 
   * @param {ObjectId} grnId
   * @param {Object} changes - { itemUpdates: [{productId, quantity, cost}], reason: string }
   * @param {ObjectId} userId
   * @returns {Promise<Object>} - Updated GRN with change details
   */
  static async editPostedGRN(grnId, changes, userId) {
    try {
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`🔄 [editPostedGRN] Starting Posted GRN Edit`);
      console.log(`   GRN ID: ${grnId}`);
      console.log(`   Changes: ${changes.itemUpdates.length} items`);
      const startTime = Date.now();

      const grn = await Grn.findById(grnId)
        .populate('items.productId')
        .populate('vendorId');

      if (!grn) {
        console.error(`❌ [Phase 0] GRN not found`);
        throw new Error("GRN not found");
      }

      console.log(`✅ [Phase 0] GRN loaded: ${grn.grnNumber}`);
      
      if (grn.status !== 'Received') {
        console.error(`❌ [Phase 0] Invalid status: ${grn.status} (expected: Received)`);
        throw new Error(`Only Posted GRNs can be edited via editPostedGRN. Current status: ${grn.status}`);
      }

      console.log(`✅ [Phase 0] Status valid: ${grn.status}`);
      
      // ✅ NEW: Validate no blocking transactions exist
      console.log(`\n📋 [Phase 0.5] Validating transaction constraints...`);
      const permission = await GRNTransactionValidator.validateEditPermission(grnId);
      
      if (!permission.canEdit) {
        console.error(`❌ [Phase 0.5] Transaction validation FAILED`);
        console.error(`   Reason: ${permission.reason}`);
        
        // Log the denied attempt
        await GRNTransactionValidator.logEditDenial(
          grnId,
          userId,
          'editPostedGRN',
          permission.reason
        );
        
        throw new Error(`Cannot edit GRN: ${permission.reason}`);
      }

      console.log(`✅ [Phase 0.5] Transaction check PASSED - edit allowed\n`);

      // ✅ 1. Store original state
      const originalData = JSON.parse(JSON.stringify({
        items: grn.items,
        totalQty: grn.totalQty,
        totalCost: grn.totalCost
      }));

      console.log(`📊 [Phase 1] Original State:`);
      console.log(`   Items: ${originalData.items.length}`);
      console.log(`   Total Qty: ${originalData.totalQty}`);
      console.log(`   Total Cost: ${originalData.totalCost}`);

      // ✅ 2. Validate changes are compatible
      await this.validatePostedGRNChanges(grn, changes);
      console.log(`✅ [Phase 1] Changes validated`);

      // ✅ 3. PHASE 2: Reverse original stock impact
      console.log(`\n📊 [Phase 2] REVERSING original stock impact...`);
      const reversedData = await this.reverseGRNStockImpact(grn, userId);
      console.log(`✅ [Phase 2] Reversal complete:`);
      console.log(`   Items reversed: ${reversedData.count}`);
      console.log(`   Total reversed: ${reversedData.totalQuantity} units`);

      // ✅ 4. PHASE 3: Apply new changes
      console.log(`\n📊 [Phase 3] APPLYING new changes...`);
      const recalculatedData = await this.applyGRNChanges(grnId, changes, userId);
      console.log(`✅ [Phase 3] Application complete:`);
      console.log(`   Items applied: ${recalculatedData.count}`);
      console.log(`   Total applied: ${recalculatedData.newTotalQty} units`);

      // ✅ 5. Update GRN document (direct values only - no editHistory)
      console.log(`\n📝 [Phase 4] Updating GRN document...`);
      const updatedGRN = await Grn.findByIdAndUpdate(
        grnId,
        {
          items: recalculatedData.newItems,
          totalQty: recalculatedData.newTotalQty,
          totalCost: recalculatedData.newTotalCost,
          updatedBy: userId,
          updatedDate: new Date()
        },
        { returnDocument: 'after' }
      );

      console.log(`✅ [Phase 4] GRN updated:`);
      console.log(`   New Qty: ${updatedGRN.totalQty}`);
      console.log(`   New Cost: ${updatedGRN.totalCost}`);

      // ✅ 6. Create simple audit log (no new fields)
      console.log(`\n📋 [Phase 5] Creating audit log...`);
      await this.createEditAuditLog(grnId, userId, 'POSTED_EDIT', {
        before: originalData,
        after: {
          items: recalculatedData.newItems,
          totalQty: recalculatedData.newTotalQty,
          totalCost: recalculatedData.newTotalCost
        },
        reason: changes.reason
      });
      console.log(`✅ [Phase 5] Audit log created`);

      // ✨ 7. CASCADE UPDATE: All related collections
      console.log(`\n✨ [Phase 6] CASCADE UPDATE: All related collections...`);
      const relatedUpdates = await this.updateRelatedCollections(
        grnId,
        updatedGRN,
        originalData,
        userId
      );
      
      console.log(`✅ [Phase 6] Related collections updated:`);
      console.log(`   Vendor Payments: ${relatedUpdates.vendorPayments.length}`);
      console.log(`   Products: ${relatedUpdates.products.length}`);
      if (relatedUpdates.errors.length > 0) {
        console.warn(`   ⚠️ Errors: ${relatedUpdates.errors.length}`);
      }

      const totalTime = Date.now() - startTime;
      console.log(`\n✅ [SUCCESS] GRN edited successfully (${totalTime}ms)`);
      console.log(`${'─'.repeat(80)}\n`);

      return {
        grn: updatedGRN,
        summary: {
          reversals: reversedData.count,
          applications: recalculatedData.count,
          netStockChange: recalculatedData.newTotalQty - originalData.totalQty,
          netCostChange: recalculatedData.newTotalCost - originalData.totalCost
        },
        relatedCollections: relatedUpdates
      };

    } catch (error) {
      console.error(`\n❌ [FAILED] Posted edit error at step:`);
      console.error(`   ${error.message}`);
      console.error(`${'─'.repeat(80)}\n`);
      throw error;
    }
  }

  /**
   * PHASE 1: Reverse original GRN stock impact
   * 
   * Undoes all stock movements created by original GRN posting:
   * - Decreases CurrentStock quantities
   * - Removes batch allocations
   * - Creates reversal stock movements
   * 
   * @private
   * @param {Object} grn - The GRN document
   * @param {ObjectId} userId
   * @returns {Promise<Object>} - Summary of reversals
   */
  static async reverseGRNStockImpact(grn, userId) {
    try {
      console.log(`↩️ Reversing ${grn.items.length} items...`);

      const reversals = [];
      let totalReversed = 0;

      for (const item of grn.items) {
        if (!item.productId) continue;

        const product = await AddProduct.findById(item.productId);
        if (!product) {
          console.warn(`⚠️ Product ${item.productId} not found, skipping reversal`);
          continue;
        }

        // ✅ 1. Reverse quantity in CurrentStock
        const currentStock = await CurrentStock.findOne({ productId: item.productId });
        if (!currentStock) continue;

        // Validate we have enough to reverse
        if (currentStock.grnReceivedQuantity < item.quantity) {
          throw new Error(
            `Cannot reverse: Product ${product.itemcode} has been partially consumed. ` +
            `GRN qty: ${item.quantity}, Available to reverse: ${currentStock.grnReceivedQuantity}`
          );
        }

        // ✅ 2. Decrease stock
        const reversed = await CurrentStock.findOneAndUpdate(
          { productId: item.productId },
          {
            $inc: {
              totalQuantity: -item.quantity,
              availableQuantity: -item.quantity,
              grnReceivedQuantity: -item.quantity
            },
            $set: {
              lastUpdatedBy: userId
            }
          },
          { returnDocument: 'after' }
        );

        // ✅ 3. Record reversal movement
        await StockHistoryManager.recordMovement({
          productId: item.productId,
          batchId: null,  // Reversals don't track batches
          movementType: 'OUTBOUND',  // Technically reversal but can use OUTBOUND
          quantity: item.quantity,
          unitCost: item.cost || 0,
          reference: `${grn.grnNumber} - REVERSAL`,
          referenceId: grn._id,
          referenceType: 'PURCHASE_ORDER',  // Original type
          costingMethodUsed: grn.costingMethod || 'FIFO',
          documentDate: new Date(),
          createdBy: userId,
          notes: `Reversal of GRN ${grn.grnNumber} posted on ${grn.postedDate}`
        });

        // ✅ 4. Update batch status
        await InventoryBatch.updateMany(
          { grnId: grn._id, productId: item.productId },
          { $set: { status: 'REVERSED', reversedAt: new Date() } }
        );

        totalReversed += item.quantity;
        reversals.push({
          productId: item.productId,
          itemCode: product.itemcode,
          quantity: item.quantity,
          cost: item.cost,
          status: 'Reversed'
        });
      }

      console.log(`✅ Reversed ${reversals.length} items, ${totalReversed} units total`);
      return { count: reversals.length, items: reversals, totalQuantity: totalReversed };

    } catch (error) {
      console.error("❌ Reversal error:", error);
      throw error;
    }
  }

  /**
   * PHASE 2: Apply new GRN changes
   * 
   * Processes new item quantities and costs:
   * - Recalculates using current costing method
   * - Creates new batch records
   * - Updates CurrentStock with new quantities
   * - Records new stock movements
   * 
   * @private
   * @param {ObjectId} grnId
   * @param {Object} changes - { itemUpdates, reason }
   * @param {ObjectId} userId
   * @returns {Promise<Object>} - New quantities, costs, and items
   */
  static async applyGRNChanges(grnId, changes, userId) {
    try {
      console.log(`✅ Applying ${changes.itemUpdates.length} new item changes...`);

      const grn = await Grn.findById(grnId).populate('items.productId');
      const newItems = [];
      let totalNewQty = 0;
      let totalNewCost = 0;
      let applicationCount = 0;

      for (const change of changes.itemUpdates) {
        const product = await AddProduct.findById(change.productId);
        if (!product) throw new Error(`Product not found: ${change.productId}`);

        // ✅ 1. Update CurrentStock
        const updated = await CurrentStock.findOneAndUpdate(
          { productId: change.productId },
          {
            $inc: {
              totalQuantity: change.quantity,
              availableQuantity: change.quantity,
              grnReceivedQuantity: change.quantity
            },
            $set: {
              lastGrnDate: grn.grnDate,
              lastUpdatedBy: userId,
              lastActivity: {
                timestamp: new Date(),
                type: 'GRN',
                referenceId: grnId,
                reference: `${grn.grnNumber} (EDITED)`
              }
            }
          },
          { returnDocument: 'after', upsert: true }
        );

        // ✅ 2. Record new movement
        await StockHistoryManager.recordMovement({
          productId: change.productId,
          batchId: null,
          movementType: 'INBOUND',
          quantity: change.quantity,
          unitCost: change.cost || 0,
          reference: `${grn.grnNumber} - EDITED`,
          referenceId: grnId,
          referenceType: 'PURCHASE_ORDER',
          costingMethodUsed: grn.costingMethod || 'FIFO',
          documentDate: grn.grnDate,
          createdBy: userId,
          notes: `Updated quantity in GRN edit: ${change.quantity} units`
        });

        totalNewQty += change.quantity;
        totalNewCost += change.quantity * (change.cost || 0);

        newItems.push({
          productId: change.productId,
          itemCode: product.itemcode,
          quantity: change.quantity,
          cost: change.cost || 0,
          total: change.quantity * (change.cost || 0)
        });

        applicationCount++;
      }

      console.log(`✅ Applied ${applicationCount} changes, ${totalNewQty} units`);
      return {
        count: applicationCount,
        newItems,
        newTotalQty: totalNewQty,
        newTotalCost: totalNewCost
      };

    } catch (error) {
      console.error("❌ Application error:", error);
      throw error;
    }
  }

  /**
   * Delete line items from GRN
   * 
   * Handles deletion before and after posting:
   * - Draft: Simple removal
   * - Posted: Reverse stock and recalculate
   * 
   * @param {ObjectId} grnId
   * @param {Array<ObjectId>} itemProductIds - Product IDs to remove
   * @param {string} reason - Reason for deletion
   * @param {ObjectId} userId
   * @returns {Promise<Object>} - Deletion summary
   */
  static async deleteLineItems(grnId, itemProductIds, reason, userId) {
    try {
      console.log(`\n🗑️ Deleting ${itemProductIds.length} line items from GRN ${grnId}`);

      const grn = await Grn.findById(grnId).populate('items.productId');
      if (!grn) throw new Error("GRN not found");

      // ✅ 1. If posted, reverse stock for deleted items
      if (grn.status === 'Received') {
        const itemsToDelete = grn.items.filter(item => 
          itemProductIds.includes(item.productId._id.toString())
        );

        for (const item of itemsToDelete) {
          await CurrentStock.findOneAndUpdate(
            { productId: item.productId._id },
            {
              $inc: {
                totalQuantity: -item.quantity,
                availableQuantity: -item.quantity,
                grnReceivedQuantity: -item.quantity
              },
              $set: { lastUpdatedBy: userId }
            }
          );

          // Record deletion as reversal
          await StockHistoryManager.recordMovement({
            productId: item.productId._id,
            movementType: 'OUTBOUND',
            quantity: item.quantity,
            unitCost: item.cost || 0,
            reference: `${grn.grnNumber} - DELETE`,
            referenceId: grnId,
            referenceType: 'PURCHASE_ORDER',
            costingMethodUsed: grn.costingMethod || 'FIFO',
            documentDate: new Date(),
            createdBy: userId,
            notes: `Line item deleted: ${reason}`
          });
        }
      }

      // ✅ 2. Remove items from GRN
      const updatedGRN = await Grn.findByIdAndUpdate(
        grnId,
        {
          $pull: { items: { productId: { $in: itemProductIds } } },
          updatedBy: userId,
          updatedDate: new Date()
        },
        { returnDocument: 'after' }
      );

      // ✅ 3. Audit log
      await this.createEditAuditLog(grnId, userId, 'DELETE_ITEMS', {
        deletedCount: itemProductIds.length,
        reason,
        status: grn.status,
        newTotalQty: updatedGRN.totalQty
      });

      console.log(`✅ Deleted ${itemProductIds.length} items`);
      return { updatedGRN, deletedCount: itemProductIds.length };

    } catch (error) {
      console.error("❌ Deletion error:", error.message);
      throw error;
    }
  }

  /**
   * Add items to existing GRN
   * 
   * Can add to both Draft and Posted GRNs
   * If Posted: Immediately updates stock
   * 
   * @param {ObjectId} grnId
   * @param {Array<Object>} newItems - { productId, quantity, cost }
   * @param {ObjectId} userId
   * @returns {Promise<Object>} - Updated GRN
   */
  static async addLineItems(grnId, newItems, userId) {
    try {
      console.log(`\n➕ Adding ${newItems.length} items to GRN ${grnId}`);

      const grn = await Grn.findById(grnId);
      if (!grn) throw new Error("GRN not found");

      const addedItems = [];

      // ✅ 1. If posted, immediately apply stock updates
      if (grn.status === 'Received') {
        for (const item of newItems) {
          const product = await AddProduct.findById(item.productId);
          if (!product) throw new Error(`Product not found: ${item.productId}`);

          // Update stock
          await CurrentStock.findOneAndUpdate(
            { productId: item.productId },
            {
              $inc: {
                totalQuantity: item.quantity,
                availableQuantity: item.quantity,
                grnReceivedQuantity: item.quantity
              },
              $set: { lastUpdatedBy: userId }
            },
            { upsert: true }
          );

          // Record movement
          await StockHistoryManager.recordMovement({
            productId: item.productId,
            movementType: 'INBOUND',
            quantity: item.quantity,
            unitCost: item.cost || 0,
            reference: `${grn.grnNumber} - NEW ITEM`,
            referenceId: grnId,
            referenceType: 'PURCHASE_ORDER',
            costingMethodUsed: grn.costingMethod || 'FIFO',
            documentDate: grn.grnDate,
            createdBy: userId,
            notes: `New item added to existing GRN`
          });

          addedItems.push({
            productId: item.productId,
            itemCode: product.itemcode,
            quantity: item.quantity,
            cost: item.cost
          });
        }
      }

      // ✅ 2. Add to GRN document
      const updatedGRN = await Grn.findByIdAndUpdate(
        grnId,
        {
          $push: { items: { $each: newItems } },
          $inc: {
            totalQty: newItems.reduce((sum, item) => sum + item.quantity, 0),
            totalCost: newItems.reduce((sum, item) => sum + (item.quantity * (item.cost || 0)), 0)
          },
          updatedBy: userId,
          updatedDate: new Date()
        },
        { returnDocument: 'after' }
      );

      // ✅ 3. Audit log
      await this.createEditAuditLog(grnId, userId, 'ADD_ITEMS', {
        addedCount: newItems.length,
        status: grn.status,
        stockUpdated: grn.status === 'Received',
        newItems: addedItems,
        newTotalQty: updatedGRN.totalQty
      });

      console.log(`✅ Added ${newItems.length} items`);
      return { updatedGRN, addedItems };

    } catch (error) {
      console.error("❌ Add items error:", error.message);
      throw error;
    }
  }

  /**
   * Get edit history for a GRN
   * @param {ObjectId} grnId
   * @returns {Promise<Array>} - Edit history entries
   */
  static async getEditHistory(grnId) {
    try {
      const logs = await ActivityLog.find({
        entityId: grnId,
        action: { $in: ['DRAFT_EDIT', 'POSTED_EDIT', 'DELETE_ITEMS', 'ADD_ITEMS'] }
      })
      .sort({ timestamp: -1 })
      .populate('userId', 'name email')
      .lean();

      return logs;

    } catch (error) {
      console.error("❌ History fetch error:", error);
      throw error;
    }
  }

  /**
   * Validate changes before applying to posted GRN
   * @private
   */
  static async validatePostedGRNChanges(grn, changes) {
    // Ensure quantities make sense
    for (const change of changes.itemUpdates) {
      if (change.quantity <= 0) {
        throw new Error(`Invalid quantity: ${change.quantity} (must be > 0)`);
      }

      const product = await AddProduct.findById(change.productId);
      if (!product) {
        throw new Error(`Product not found: ${change.productId}`);
      }
    }

    return true;
  }

  /**
   * Create audit log for edits
   * @private
   */
  static async createEditAuditLog(grnId, userId, action, details) {
    try {
      const log = new ActivityLog({
        entityId: grnId,
        entityType: 'GRN',
        userId,
        action,
        changes: details,
        timestamp: new Date()
      });

      await log.save();
      console.log(`📝 Audit log created for ${action}`);

    } catch (error) {
      console.warn(`⚠️ Failed to create audit log: ${error.message}`);
      // Don't throw - operation shouldn't fail if logging fails
    }
  }

  static async updateRelatedCollections(grnId, updatedGRN, oldData, userId, session = null) {
    try {
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`🔄 [updateRelatedCollections] Starting cascade updates`);
      console.log(`   GRN: ${updatedGRN.grnNumber}`);
      console.log(`   New Total: ${updatedGRN.totalAmount}`);
      if (session) {
        console.log(`   📌 Running within MongoDB transaction`);
      }

      const updateSummary = {
        vendorPayments: [],
        products: [],
        errors: []
      };
      
      // ✅ Helper for session-aware queries
      const findOpts = session ? { session } : {};
      const updateOpts = session ? { session, returnDocument: 'after' } : { returnDocument: 'after' };

      // ========================================
      // 1️⃣ UPDATE VENDOR PAYMENTS (IF PENDING)
      // ========================================
      console.log(`\n💳 [Collection 1] Processing VendorPayment...`);
      
      try {
        // ========================================
        // 📊 PHASE 0: REVERSE OLD STOCK IMPACT
        // ========================================
        console.log(`\n📊 [PHASE 0] Reversing old stock movements...`);
        const reversalSummary = {
          count: 0,
          items: [],
          totalQuantity: 0
        };

        for (const oldItem of oldData.items) {
          if (!oldItem.productId) continue;

          const product = await AddProduct.findById(oldItem.productId);
          if (!product) {
            console.warn(`   ⚠️ Product ${oldItem.productId} not found, skipping reversal`);
            continue;
          }

          console.log(`   Reversing: ${product.itemcode} qty ${oldItem.quantity}`);

          // ✅ 1. Decrease CurrentStock quantities (with session for transaction)
          const reversed = await CurrentStock.findOneAndUpdate(
            { productId: oldItem.productId },
            {
              $inc: {
                totalQuantity: -oldItem.quantity,
                availableQuantity: -oldItem.quantity,
                grnReceivedQuantity: -oldItem.quantity
              },
              $set: { lastUpdatedBy: userId }
            },
            { ...updateOpts }
          );

          if (reversed) {
            console.log(`     ✅ CurrentStock decremented`);
            console.log(`        New totalQuantity: ${reversed.totalQuantity}`);
            console.log(`        New availableQuantity: ${reversed.availableQuantity}`);
          }

          // ✅ 2. Find ORIGINAL batch created during GRN posting (must exist for Posted GRN)
          let batchId = null;
          let originalBatch = null;

          try {
            // Find the original batch using:
            // - productId: matches the GRN item
            // - batchNumber: contains GRN number
            // - batchStatus: not reversed
            // - vendorId: from GRN (safer than looking for non-existent grnId)
            originalBatch = await InventoryBatch.findOne({
              productId: oldItem.productId,
              batchNumber: { $regex: updatedGRN.grnNumber },  // Batch number includes GRN number
              vendorId: updatedGRN.vendorId,
              batchStatus: { $ne: 'REVERSED' }
            }, null, findOpts);

            if (originalBatch) {
              batchId = originalBatch._id;
              console.log(`     ✅ Found original batch: ${batchId}`);
              console.log(`        Batch Number: ${originalBatch.batchNumber}`);
              console.log(`        Current qty: ${originalBatch.quantity}`);
            } else {
              // Try alternative query - by invoice number and product
              console.log(`     ℹ️ Batch not found with batchNumber, trying invoiceNumber...`);
              const altBatch = await InventoryBatch.findOne({
                productId: oldItem.productId,
                invoiceNumber: updatedGRN.invoiceNo,
                vendorId: updatedGRN.vendorId,
                batchStatus: { $ne: 'REVERSED' }
              });

              if (altBatch) {
                batchId = altBatch._id;
                console.log(`     ✅ Found batch via invoiceNumber: ${batchId}`);
                originalBatch = altBatch;
              } else {
                console.warn(`     ⚠️ BATCH NOT FOUND for GRN ${updatedGRN.grnNumber}, product ${oldItem.productId}`);
                console.warn(`        Searched by batchNumber and invoiceNumber`);
                console.warn(`        This means GRN was not properly posted`);
              }
            }
          } catch (batchError) {
            console.error(`     ❌ Error querying batch: ${batchError.message}`);
          }

          // ✅ 3. Record OUTBOUND movement (use batch if found)
          if (batchId) {
            try {
              await StockHistoryManager.recordMovement({
                grnId: updatedGRN._id,  // ✅ ADD: Link to GRN
                productId: oldItem.productId,
                batchId: batchId,
                movementType: 'OUTBOUND',
                quantity: oldItem.quantity,
                unitCost: oldItem.unitCost || 0,
                reference: `${updatedGRN.grnNumber} - REVERSAL`,
                referenceId: updatedGRN._id,
                referenceType: 'PURCHASE_ORDER',
                costingMethodUsed: updatedGRN.costingMethod || 'FIFO',
                documentDate: new Date(),
                createdBy: userId,
                notes: `GRN edit reversal: removing old quantity ${oldItem.quantity}`,
                reasonCode: 'GRN_EDIT'
              });
              console.log(`     ✅ Reversal movement recorded`);
            } catch (movementError) {
              console.error(`     ❌ Failed to record reversal movement: ${movementError.message}`);
              updateSummary.errors.push({
                collection: 'StockMovement_Reversal',
                error: movementError.message,
                product: product.itemcode
              });
            }
          } else {
            console.warn(`     ⚠️ Skipping stock movement recording (batch not found) - stock quantities already updated`);
          }

          reversalSummary.count++;
          reversalSummary.totalQuantity += oldItem.quantity;
          reversalSummary.items.push({
            productId: oldItem.productId,
            itemCode: product.itemcode,
            quantity: oldItem.quantity
          });
        }

        console.log(`✅ [PHASE 0] Reversal complete: ${reversalSummary.count} items, ${reversalSummary.totalQuantity} units`);
        updateSummary.stockReversal = reversalSummary;

        // ========================================
        // 📊 PHASE 1: APPLY NEW STOCK IMPACT
        // ========================================
        console.log(`\n📊 [PHASE 1] Applying new stock movements...`);
        const applicationSummary = {
          count: 0,
          items: [],
          totalQuantity: 0
        };

        for (const newItem of updatedGRN.items) {
          if (!newItem.productId) continue;

          const product = await AddProduct.findById(newItem.productId);
          if (!product) {
            console.warn(`   ⚠️ Product ${newItem.productId} not found, skipping application`);
            continue;
          }

          console.log(`   Applying: ${product.itemcode} qty ${newItem.quantity}`);

          // ✅ 1. Increase CurrentStock quantities
          const applied = await CurrentStock.findOneAndUpdate(
            { productId: newItem.productId },
            {
              $inc: {
                totalQuantity: newItem.quantity,
                availableQuantity: newItem.quantity,
                grnReceivedQuantity: newItem.quantity
              },
              $set: {
                lastGrnDate: updatedGRN.grnDate,
                lastUpdatedBy: userId,
                lastActivity: {
                  timestamp: new Date(),
                  type: 'GRN_EDIT',
                  reference: updatedGRN.grnNumber,
                  referenceId: updatedGRN._id,
                  change: `Updated qty: ${newItem.quantity}`
                }
              }
            },
            { returnDocument: 'after', upsert: true }
          );

          if (applied) {
            console.log(`     ✅ CurrentStock incremented`);
            console.log(`        New totalQuantity: ${applied.totalQuantity}`);
            console.log(`        New availableQuantity: ${applied.availableQuantity}`);
          }

          // ✅ 2. Find ORIGINAL batch and update with new data
          let batchId = null;

          try {
            // Find the original batch using:
            // - productId: matches the GRN item
            // - batchNumber: contains GRN number
            // - vendorId: from GRN
            // - batchStatus: not reversed
            let batch = await InventoryBatch.findOne({
              productId: newItem.productId,
              batchNumber: { $regex: updatedGRN.grnNumber },
              vendorId: updatedGRN.vendorId,
              batchStatus: { $ne: 'REVERSED' }
            });

            if (!batch) {
              // Try alternative query - by invoice number
              console.log(`     ℹ️ Batch not found with batchNumber, trying invoiceNumber...`);
              batch = await InventoryBatch.findOne({
                productId: newItem.productId,
                invoiceNumber: updatedGRN.invoiceNo,
                vendorId: updatedGRN.vendorId,
                batchStatus: { $ne: 'REVERSED' }
              });
            }

            if (batch) {
              console.log(`     ✅ Found original batch: ${batch._id}`);
              console.log(`        Batch Number: ${batch.batchNumber}`);
              console.log(`        Old qty: ${batch.quantity}, new qty: ${newItem.quantity}`);

              // Update the original batch with new quantity and cost
              const updatedBatch = await InventoryBatch.findByIdAndUpdate(
                batch._id,
                {
                  $set: {
                    quantity: newItem.quantity,
                    quantityRemaining: newItem.quantity,
                    purchasePrice: newItem.unitCost || batch.purchasePrice,
                    batchStatus: 'ACTIVE',
                    updatedBy: userId,
                    updatedDate: new Date()
                  }
                },
                { returnDocument: 'after' }
              );

              batchId = updatedBatch._id;
              console.log(`     ✅ Batch updated successfully`);
              console.log(`        New qty: ${updatedBatch.quantity}, new cost: ${updatedBatch.purchasePrice}`);
            } else {
              console.warn(`     ⚠️ BATCH NOT FOUND for GRN ${updatedGRN.grnNumber}, product ${newItem.productId}`);
              console.warn(`        Searched by batchNumber and invoiceNumber`);
              console.warn(`        This means GRN was not properly posted`);
            }
          } catch (batchError) {
            console.error(`     ❌ Error updating batch: ${batchError.message}`);
            updateSummary.errors.push({
              collection: 'InventoryBatch',
              error: batchError.message,
              product: product.itemcode
            });
          }

          // ✅ 3. Record INBOUND movement (use batch if found)
          if (batchId) {
            try {
              await StockHistoryManager.recordMovement({
                grnId: updatedGRN._id,  // ✅ ADD: Link to GRN
                productId: newItem.productId,
                batchId: batchId,
                movementType: 'INBOUND',
                quantity: newItem.quantity,
                unitCost: newItem.unitCost || 0,
                reference: `${updatedGRN.grnNumber} - EDITED`,
                referenceId: updatedGRN._id,
                referenceType: 'PURCHASE_ORDER',
                costingMethodUsed: updatedGRN.costingMethod || 'FIFO',
                documentDate: updatedGRN.grnDate,
                createdBy: userId,
                notes: `GRN edit application: updated quantity to ${newItem.quantity} at cost ${newItem.unitCost}`,
                reasonCode: 'GRN_EDIT'
              });
              console.log(`     ✅ Application movement recorded`);
            } catch (movementError) {
              console.error(`     ❌ Failed to record application movement: ${movementError.message}`);
              updateSummary.errors.push({
                collection: 'StockMovement_Application',
                error: movementError.message,
                product: product.itemcode
              });
            }
          } else {
            console.warn(`     ⚠️ Skipping stock movement recording (batch not found) - stock quantities already updated`);
          }

          applicationSummary.count++;
          applicationSummary.totalQuantity += newItem.quantity;
          applicationSummary.items.push({
            productId: newItem.productId,
            itemCode: product.itemcode,
            quantity: newItem.quantity,
            unitCost: newItem.unitCost
          });
        }

        console.log(`✅ [PHASE 1] Application complete: ${applicationSummary.count} items, ${applicationSummary.totalQuantity} units`);
        updateSummary.stockApplication = applicationSummary;

        // ========================================
        // � PHASE 1.5: RECALCULATE AVAILABLE QUANTITY
        // ========================================
        console.log(`\n🔧 [PHASE 1.5] Recalculating availableQuantity for affected products...`);
        const allAffectedProductIds = [
          ...reversalSummary.items.map(item => item.productId),
          ...applicationSummary.items.map(item => item.productId)
        ];
        
        // Remove duplicates
        const uniqueProductIds = [...new Set(allAffectedProductIds.map(id => id.toString()))];
        
        try {
          const recalcResult = await StockRecalculationHelper.batchRecalculate(
            allAffectedProductIds,
            `GRN_EDIT:${updatedGRN.grnNumber}`,
            session  // ✅ PASS SESSION for transaction consistency
          );
          console.log(`✅ [PHASE 1.5] ${recalcResult.corrected} of ${recalcResult.processed} corrected`);
        } catch (recalcErr) {
          console.warn(`⚠️ Recalculation warning (non-blocking): ${recalcErr.message}`);
        }

        // ========================================
        // �💳 PHASE 2: UPDATE VENDOR PAYMENTS
        // ========================================
        console.log(`\n💳 [PHASE 2] Processing VendorPayment...`);

        if (vendorPayments.length > 0) {
          for (const payment of vendorPayments) {
            console.log(`   \n   Processing payment: ${payment._id}`);
            console.log(`     Status: ${payment.paymentStatus}`);
            console.log(`     Current Amount: ${payment.initialAmount}`);

            // ✅ ONLY update if PENDING (not confirmed yet)
            if (payment.paymentStatus === 'PENDING') {
              const oldAmount = payment.initialAmount;
              const newAmount = updatedGRN.finalTotal || updatedGRN.totalAmount;
              const amountDifference = newAmount - oldAmount;

              console.log(`     ✅ PENDING - Updating amount...`);
              console.log(`        Old: ${oldAmount} → New: ${newAmount} (Diff: ${amountDifference})`);

              // Update to new corrected amount (with session for transaction)
              const updated = await VendorPayment.findByIdAndUpdate(
                payment._id,
                {
                  initialAmount: newAmount,
                  balance: Math.max(0, newAmount - (payment.amountPaid || 0)),
                  updatedDate: new Date()
                },
                { ...updateOpts }
              );

              console.log(`     ✅ Updated in database:`);
              console.log(`        initialAmount: ${updated.initialAmount}`);
              console.log(`        balance: ${updated.balance}`);
              
              updateSummary.vendorPayments.push({
                paymentId: payment._id,
                status: payment.paymentStatus,
                oldAmount,
                newAmount,
                updated: true
              });
            } else {
              console.log(`     ⚠️ NOT PENDING (${payment.paymentStatus}) - SKIPPING UPDATE`);
              
              updateSummary.vendorPayments.push({
                paymentId: payment._id,
                status: payment.paymentStatus,
                oldAmount: payment.initialAmount,
                updated: false,
                reason: `Cannot correct ${payment.paymentStatus} payment (confirmed)`
              });
            }
          }
        } else {
          console.log(`   ℹ️ No payment records found`);
        }

        console.log(`\n✅ [Collection 1] VendorPayment processing complete`);
        
      } catch (error) {
        console.error(`❌ [Collection 1] VendorPayment error: ${error.message}`);
        updateSummary.errors.push({
          collection: 'VendorPayment',
          error: error.message
        });
      }

      // ========================================
      // 📦 PHASE 3: UPDATE AUDIT FIELDS
      // ========================================
      console.log(`\n📦 [PHASE 3] Processing CurrentStock audit fields...`);

      try {
        console.log(`   Items to process: ${updatedGRN.items.length}`);

        for (const item of updatedGRN.items) {
          const product = await AddProduct.findById(item.productId);
          if (!product) {
            console.warn(`   ⚠️ Product ${item.productId} not found, skipping`);
            continue;
          }

          console.log(`   \n   Updating CurrentStock audit for: ${product.itemcode}`);

          // ========================================
          // UPDATE CURRENTSTOCK AUDIT FIELDS
          // ========================================
          const auditPayload = {
            lastGrnDate: updatedGRN.grnDate,
            lastUpdatedBy: userId,
            lastActivity: {
              timestamp: new Date(),
              type: 'GRN_EDIT',
              reference: updatedGRN.grnNumber,
              referenceId: updatedGRN._id,
              change: `GRN edit complete`
            },
            updatedAt: new Date()
          };

          const updatedStock = await CurrentStock.findOneAndUpdate(
            { productId: item.productId },
            auditPayload,
            { returnDocument: 'after', upsert: false }
          );

          if (updatedStock) {
            console.log(`     ✅ Audit fields updated:`);
            console.log(`        lastGrnDate: ${updatedStock.lastGrnDate}`);
            console.log(`        lastActivity.type: ${updatedStock.lastActivity?.type}`);
          }

          updateSummary.products.push({
            productId: item.productId,
            itemCode: product.itemcode,
            updated: updatedStock ? true : false
          });
        }

        console.log(`\n✅ [PHASE 3] CurrentStock audit processing complete (${updatedGRN.items.length} items)`);
        
      } catch (error) {
        console.error(`❌ [PHASE 3] CurrentStock audit error: ${error.message}`);
        updateSummary.errors.push({
          collection: 'CurrentStock_Audit',
          error: error.message
        });
      }

      // ========================================
      // COMPLETION SUMMARY
      // ========================================
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`📊 [CASCADE COMPLETE] Summary:`);
      
      console.log(`\n   📊 Stock Reversals (Phase 0):`);
      console.log(`      Items: ${updateSummary.stockReversal?.count || 0}`);
      console.log(`      Total Qty Reversed: ${updateSummary.stockReversal?.totalQuantity || 0}`);
      updateSummary.stockReversal?.items?.forEach((item, idx) => {
        console.log(`        ✅ [${idx+1}] ${item.itemCode}: ${item.quantity} units`);
      });

      console.log(`\n   📊 Stock Applications (Phase 1):`);
      console.log(`      Items: ${updateSummary.stockApplication?.count || 0}`);
      console.log(`      Total Qty Applied: ${updateSummary.stockApplication?.totalQuantity || 0}`);
      updateSummary.stockApplication?.items?.forEach((item, idx) => {
        console.log(`        ✅ [${idx+1}] ${item.itemCode}: ${item.quantity} units @ ${item.unitCost}`);
      });

      console.log(`\n   💳 VendorPayments (Phase 2):`);
      console.log(`      Records: ${updateSummary.vendorPayments.length}`);
      updateSummary.vendorPayments.forEach((vp, idx) => {
        const status = vp.updated ? '✅' : '⚠️';
        console.log(`        ${status} [${idx+1}] ${vp.status} - ${vp.updated ? `${vp.oldAmount} → ${vp.newAmount}` : vp.reason}`);
      });
      
      console.log(`\n   📦 CurrentStock Audit (Phase 3):`);
      console.log(`      Items: ${updateSummary.products.length}`);
      updateSummary.products.forEach((prod, idx) => {
        const status = prod.updated ? '✅' : '⚠️';
        console.log(`        ${status} [${idx+1}] ${prod.itemCode}`);
      });
      
      if (updateSummary.errors.length > 0) {
        console.warn(`\n   ❌ Errors: ${updateSummary.errors.length}`);
        updateSummary.errors.forEach((err, idx) => {
          console.warn(`        [${idx+1}] ${err.collection}: ${err.error}`);
        });
      }
      console.log(`${'─'.repeat(80)}\n`);

      return updateSummary;

    } catch (error) {
      console.error("❌ [CASCADE FAILED] Related collections update failed:", error);
      throw error;
    }
  }
}

export default GRNEditManager;
