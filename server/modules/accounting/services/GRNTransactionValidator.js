import Grn from "../../../Models/Grn.js";
import VendorPayment from "../../../Models/VendorPayment.js";
import StockBatch from "../../../Models/StockBatch.js";
import CurrentStock from "../../../Models/CurrentStock.js";
import Rtv from "../../../Models/Rtv.js";
import ActivityLog from "../../../Models/ActivityLog.js";

/**
 * GRNTransactionValidator
 * 
 * Validates whether a GRN can be edited based on downstream transactions:
 * - Vendor payments made?
 * - Stock consumed by sales?
 * - Returns made?
 * 
 * Business Rules:
 * ✅ Can edit: GRN posted but no transactions linked
 * ❌ Cannot edit: Any vendor payment made
 * ❌ Cannot edit: Any stock sold from this GRN
 * ❌ Cannot edit: Any returns committed against this GRN
 * 
 * Purpose: Prevent edits that would create accounting inconsistencies
 */

class GRNTransactionValidator {
  /**
   * Complete transaction check for GRN
   * 
   * @param {ObjectId} grnId
   * @returns {Promise<Object>} - Detailed transaction status
   */
  static async checkTransactionDependencies(grnId) {
    try {
      console.log(`\n🔍 Checking transaction dependencies for GRN ${grnId}`);

      const grn = await Grn.findById(grnId);
      if (!grn) {
        return { canEdit: false, reason: "GRN not found", status: null };
      }

      const checks = {
        grnId: grnId.toString(),
        grnNumber: grn.grnNumber,
        grnStatus: grn.status,
        vendorPayments: null,
        stockConsumption: null,
        rtvReturns: null,
        canEditDueToTransactions: true,
        reasons: []
      };

      // ✅ 1. Check Vendor Payments (UPDATED: Now uses PENDING allowance)
      console.log(`\n💳 Checking vendor payments...`);
      checks.vendorPayments = await this.checkVendorPayments(grn.grnNumber);
      // NEW LOGIC: Use blocksEdit flag instead of status check
      if (checks.vendorPayments.blocksEdit === true) {
        checks.canEditDueToTransactions = false;
        checks.reasons.push(
          `${checks.vendorPayments.reason} ` +
          `Amount: ${checks.vendorPayments.paidAmount}/${checks.vendorPayments.totalAmount}`
        );
      }

      // ✅ 2. Check Stock Consumption (Sales)
      console.log(`\n📊 Checking stock consumption...`);
      checks.stockConsumption = await this.checkStockConsumption(grnId, grn.items);
      if (checks.stockConsumption.totalConsumed > 0) {
        checks.canEditDueToTransactions = false;
        checks.reasons.push(
          `Stock consumed by sales: ${checks.stockConsumption.totalConsumed} units. ` +
          `Cannot edit if sold quantities affected.`
        );
      }

      // ✅ 3. Check RTV Returns
      console.log(`\n📦 Checking returns to vendor...`);
      checks.rtvReturns = await this.checkRtvReturns(grnId);
      if (checks.rtvReturns.totalReturned > 0) {
        checks.canEditDueToTransactions = false;
        checks.reasons.push(
          `Returns made to vendor: ${checks.rtvReturns.totalReturned} units. ` +
          `GRN modifications may conflict with return records.`
        );
      }

      checks.summary = this.generateSummary(checks);

      return checks;

    } catch (error) {
      console.error("❌ Transaction check error:", error);
      throw error;
    }
  }

  /**
   * Check vendor payment status for GRN
   * 
   * EDIT RULES:
   * ✅ Allow edit: NO_PAYMENT or PENDING (payment not confirmed yet)
   * ❌ Block edit: PARTIAL_PAID or PAID (actual money transferred)
   * ❌ Block edit: OVERDUE (payment issue)
   * ✅ Allow edit: CANCELLED (payment reversed)
   * 
   * @private
   * @param {string} grnNumber
   * @returns {Promise<Object>} - Payment status with blockStatus
   */
  static async checkVendorPayments(grnNumber) {
    try {
      const payments = await VendorPayment.find({
        grnId: grnNumber
      });

      if (payments.length === 0) {
        return {
          status: 'NO_PAYMENT',
          paidAmount: 0,
          totalAmount: 0,
          paymentCount: 0,
          blocksEdit: false,  // ✅ Allow edit
          reason: 'No payment created yet',
          details: []
        };
      }

      let totalPaid = 0;
      let totalAmount = 0;
      let allPending = true;  // Track if ALL payments are PENDING
      const details = [];

      for (const payment of payments) {
        totalAmount += payment.initialAmount || 0;
        totalPaid += payment.amountPaid || 0;

        details.push({
          type: payment.type,  // ITEMS, SHIPPING
          status: payment.paymentStatus,  // PENDING, PARTIAL, PAID, OVERDUE
          initialAmount: payment.initialAmount,
          amountPaid: payment.amountPaid,
          balance: payment.balance,
          paymentHistory: payment.paymentHistory?.length || 0
        });

        // Check if any payment is not PENDING (and not CANCELLED)
        if (payment.paymentStatus !== 'PENDING' && payment.paymentStatus !== 'CANCELLED') {
          allPending = false;
        }
      }

      // Determine overall status and whether it blocks edit
      let overallStatus;
      let blocksEdit;
      let reason;

      if (totalPaid === 0 && allPending) {
        overallStatus = 'PENDING';
        blocksEdit = false;  // ✅ Allow - Payment not confirmed yet
        reason = 'Payment status PENDING - not confirmed by vendor yet';
      } else if (totalPaid === totalAmount) {
        overallStatus = 'FULLY_PAID';
        blocksEdit = true;  // ❌ Block - All paid
        reason = 'Payment fully made - GRN locked to invoice';
      } else if (totalPaid > 0 && totalPaid < totalAmount) {
        overallStatus = 'PARTIALLY_PAID';
        blocksEdit = true;  // ❌ Block - Partial payment received
        reason = 'Partial payment made - Cannot edit';
      } else if (payments.some(p => p.paymentStatus === 'OVERDUE')) {
        overallStatus = 'OVERDUE';
        blocksEdit = true;  // ❌ Block - Payment overdue
        reason = 'Payment overdue - GRN locked';
      } else {
        overallStatus = 'UNKNOWN';
        blocksEdit = true;  // ❌ Block - Unknown status, err on side of caution
        reason = 'Unknown payment status';
      }

      console.log(`  💳 Vendor Payment Status: ${overallStatus}`);
      console.log(`     Blocks Edit: ${blocksEdit ? '❌' : '✅'}`);
      if (totalPaid > 0) {
        console.log(`     Paid: $${totalPaid} / $${totalAmount}`);
      }

      return {
        status: overallStatus,
        totalAmount,
        paidAmount: totalPaid,
        balance: totalAmount - totalPaid,
        paymentCount: payments.length,
        blocksEdit,  // ✅ NEW: Explicitly states if edit allowed
        reason,      // ✅ NEW: Reason for allow/block
        details
      };

    } catch (error) {
      console.warn(`⚠️ Payment check error:`, error.message);
      return { 
        status: 'ERROR', 
        blocksEdit: true,  // Block on error
        reason: error.message,
        error: error.message 
      };
    }
  }

  /**
   * Check if stock from this GRN has been consumed by sales
   * 
   * @private
   * @param {ObjectId} grnId
   * @param {Array} grnItems
   * @returns {Promise<Object>} - Consumption details
   */
  static async checkStockConsumption(grnId, grnItems) {
    try {
      let totalConsumed = 0;
      const consumptionDetails = [];

      for (const item of grnItems) {
        // Get batch for this GRN item
        const batches = await StockBatch.find({
          productId: item.productId,
          grnId: grnId.toString()
        });

        for (const batch of batches) {
          const consumed = batch.usedQuantity || 0;
          if (consumed > 0) {
            totalConsumed += consumed;
            consumptionDetails.push({
              productId: item.productId.toString(),
              batchId: batch._id.toString(),
              batchNumber: batch.batchNumber,
              originalQuantity: batch.quantity,
              consumed: consumed,
              available: batch.availableQuantity || 0
            });
          }
        }
      }

      console.log(`  📊 Stock Consumed: ${totalConsumed} units`);

      return {
        totalConsumed,
        batchesAffected: consumptionDetails.length,
        details: consumptionDetails
      };

    } catch (error) {
      console.warn(`⚠️ Consumption check error:`, error.message);
      return { totalConsumed: 0, error: error.message };
    }
  }

  /**
   * Check if RTV returns exist for this GRN
   * 
   * @private
   * @param {ObjectId} grnId
   * @returns {Promise<Object>} - RTV details
   */
  static async checkRtvReturns(grnId) {
    try {
      const grn = await Grn.findById(grnId);
      const rtvReturnedQty = grn?.rtvReturnedQuantity || 0;

      if (rtvReturnedQty === 0) {
        return {
          totalReturned: 0,
          status: 'NO_RETURNS',
          details: []
        };
      }

      // Get RTV records for this GRN
      const rtvRecords = await Rtv.find({
        grnId: grnId
      }).select('rtvNumber grnId items rtvDate status');

      const details = [];
      for (const rtv of rtvRecords) {
        let rtvQty = 0;
        for (const item of rtv.items) {
          rtvQty += item.returnQuantity || item.quantity || 0;
        }

        details.push({
          rtvId: rtv._id.toString(),
          rtvNumber: rtv.rtvNumber,
          quantity: rtvQty,
          date: rtv.rtvDate,
          status: rtv.status
        });
      }

      console.log(`  📦 RTV Returns: ${rtvReturnedQty} units in ${rtvRecords.length} returns`);

      return {
        totalReturned: rtvReturnedQty,
        status: 'HAS_RETURNS',
        rtvCount: rtvRecords.length,
        details
      };

    } catch (error) {
      console.warn(`⚠️ RTV check error:`, error.message);
      return { totalReturned: 0, error: error.message };
    }
  }

  /**
   * Check if GRN can be edited considering transactions
   * 
   * @param {ObjectId} grnId
   * @returns {Promise<Object>} - { canEdit: boolean, reason: string, transactionSummary: object }
   */
  static async validateEditPermission(grnId) {
    try {
      const check = await this.checkTransactionDependencies(grnId);

      return {
        canEdit: check.canEditDueToTransactions,
        reason: check.canEditDueToTransactions 
          ? "GRN can be edited - no transactions committed"
          : `Cannot edit GRN - ${check.reasons.join("; ")}`,
        transactionSummary: {
          hasVendorPayments: check.vendorPayments.status !== 'NO_PAYMENT',
          hasStockConsumption: check.stockConsumption.totalConsumed > 0,
          hasRtvReturns: check.rtvReturns.totalReturned > 0,
          details: {
            payments: check.vendorPayments,
            consumption: check.stockConsumption,
            returns: check.rtvReturns
          }
        }
      };

    } catch (error) {
      console.error("❌ Permission validation error:", error);
      throw error;
    }
  }

  /**
   * Generate human-readable summary
   * @private
   */
  static generateSummary(checks) {
    const items = [];

    if (checks.vendorPayments.status === 'NO_PAYMENT') {
      items.push("✅ No vendor payments");
    } else {
      items.push(`❌ Vendor payments: ${checks.vendorPayments.status} (Paid: $${checks.vendorPayments.paidAmount})`);
    }

    if (checks.stockConsumption.totalConsumed === 0) {
      items.push("✅ No stock consumed");
    } else {
      items.push(`❌ Stock consumed: ${checks.stockConsumption.totalConsumed} units sold`);
    }

    if (checks.rtvReturns.totalReturned === 0) {
      items.push("✅ No returns made");
    } else {
      items.push(`❌ Returns made: ${checks.rtvReturns.totalReturned} units returned`);
    }

    return {
      allClear: checks.canEditDueToTransactions,
      items
    };
  }

  /**
   * Log edit permission denial with full audit trail
   * 
   * @param {ObjectId} grnId
   * @param {ObjectId} userId
   * @param {string} attemptedAction
   * @param {Object} reason
   */
  static async logEditDenial(grnId, userId, attemptedAction, reason) {
    try {
      const log = new ActivityLog({
        entityId: grnId,
        entityType: 'GRN',
        userId,
        action: 'EDIT_DENIED',
        severity: 'INFO',
        details: {
          attemptedAction,
          reason,
          timestamp: new Date()
        }
      });

      await log.save();
      console.log(`📝 Edit denial logged for user ${userId}`);

    } catch (error) {
      console.warn(`⚠️ Failed to log edit denial:`, error.message);
    }
  }

  /**
   * Get transaction summary for UI display
   * 
   * @param {ObjectId} grnId
   * @returns {Promise<Object>} - Summary for display
   */
  static async getTransactionSummary(grnId) {
    try {
      const check = await this.checkTransactionDependencies(grnId);

      return {
        grnNumber: check.grnNumber,
        status: check.grnStatus,
        canEdit: check.canEditDueToTransactions,
        transactions: {
          vendorPayment: {
            exists: check.vendorPayments.status !== 'NO_PAYMENT',
            status: check.vendorPayments.status,
            amount: `$${check.vendorPayments.paidAmount}/$${check.vendorPayments.totalAmount}`,
            count: check.vendorPayments.paymentCount
          },
          salesConsumption: {
            exists: check.stockConsumption.totalConsumed > 0,
            unitsConsumed: check.stockConsumption.totalConsumed,
            batchesAffected: check.stockConsumption.batchesAffected
          },
          returns: {
            exists: check.rtvReturns.totalReturned > 0,
            unitsReturned: check.rtvReturns.totalReturned,
            count: check.rtvReturns.rtvCount
          }
        },
        message: check.canEditDueToTransactions 
          ? "GRN can be edited"
          : `Cannot edit - Active transactions exist`
      };

    } catch (error) {
      console.error("❌ Summary error:", error);
      throw error;
    }
  }
}

export default GRNTransactionValidator;
