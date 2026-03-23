import VendorPayment from '../../../Models/VendorPayment.js';

/**
 * Vendor Payment Service
 * Handles payment tracking creation and management
 */
class VendorPaymentService {
  /**
   * Create vendor payment entries when GRN is posted
   * Creates separate entries for items and shipping (if applicable)
   *
   * @param {Object} grnData - GRN data from controller
   * @returns {Object} - Created payment entries
   */
  static async createPaymentEntriesFromGrn(grnData) {
    try {
      const {
        grnId,  // ✅ MongoDB ObjectId for referential integrity
        grnNumber,
        grnDate,
        vendorId,
        vendorName,
        paymentTerms = 'NET_30',
        subtotal,
        discountAmount,
        taxAmount,
        netTotal,
        shippingCost = 0,
        createdBy,
      } = grnData;

      // Calculate due date based on payment terms
      const dueDate = this.calculateDueDate(new Date(grnDate), paymentTerms);

      // ✅ Convert payment terms format
      const creditDays = this.getCreditDays(paymentTerms);

      const entries = [];

      // ✅ ENTRY 1: Items (subtotal - discount + tax)
      const itemsAmount = netTotal; // Already includes tax calculation
      const itemsEntry = new VendorPayment({
        grnId,  // ✅ MongoDB ObjectId
        grnNumber,  // ✅ Keep grnNumber for human-readable reference
        grnDate: new Date(grnDate),
        vendorId,
        vendorName,
        type: 'ITEMS',
        initialAmount: Math.round(itemsAmount * 100) / 100, // Round to 2 decimals
        amountPaid: 0,
        balance: Math.round(itemsAmount * 100) / 100,
        paymentTerms,
        dueDate,
        creditDays,
        paymentStatus: 'PENDING',
        createdBy,
      });

      await itemsEntry.save();
      entries.push({
        type: 'ITEMS',
        amount: itemsAmount,
        id: itemsEntry._id,
      });

      console.log(`✅ Vendor payment entry created for items: ${grnNumber} | Amount: ${itemsAmount}`);

      // ✅ ENTRY 2: Shipping (if applicable)
      if (shippingCost && shippingCost > 0) {
        const shippingEntry = new VendorPayment({
          grnId,  // ✅ MongoDB ObjectId
          grnNumber,  // ✅ Keep grnNumber for human-readable reference
          grnDate: new Date(grnDate),
          vendorId,
          vendorName,
          type: 'SHIPPING',
          initialAmount: Math.round(shippingCost * 100) / 100,
          amountPaid: 0,
          balance: Math.round(shippingCost * 100) / 100,
          paymentTerms,
          dueDate,
          creditDays,
          paymentStatus: 'PENDING',
          createdBy,
        });

        await shippingEntry.save();
        entries.push({
          type: 'SHIPPING',
          amount: shippingCost,
          id: shippingEntry._id,
        });

        console.log(`✅ Vendor payment entry created for shipping: ${grnNumber} | Amount: ${shippingCost}`);
      }

      return {
        success: true,
        grnNumber,
        vendorName,
        entries,
        totalPayable: entries.reduce((sum, e) => sum + e.amount, 0),
      };
    } catch (error) {
      console.error('❌ Error creating vendor payment entries:', error);
      throw error;
    }
  }

  /**
   * Calculate due date based on payment terms
   */
  static calculateDueDate(grnDate, paymentTerms) {
    const dueDate = new Date(grnDate);
    const creditDays = this.getCreditDays(paymentTerms);

    dueDate.setDate(dueDate.getDate() + creditDays);
    return dueDate;
  }

  /**
   * Get credit days from payment terms
   */
  static getCreditDays(paymentTerms) {
    const termsMap = {
      IMMEDIATE: 0,
      NET_7: 7,
      NET_14: 14,
      NET_30: 30,
      NET_60: 60,
      NET_90: 90,
      CUSTOM: 30, // default
    };

    return termsMap[paymentTerms] || 30;
  }

  /**
   * Get outstanding payment for a vendor
   */
  static async getOutstandingPayments(vendorId, status = null) {
    try {
      const query = {
        vendorId,
        balance: { $gt: 0 },
      };

      if (status) {
        query.paymentStatus = status;
      } else {
        query.paymentStatus = { $in: ['PENDING', 'PARTIAL', 'OVERDUE'] };
      }

      const payments = await VendorPayment.find(query).sort({ dueDate: 1 });

      const summary = {
        totalOutstanding: payments.reduce((sum, p) => sum + p.balance, 0),
        itemsOutstanding: payments
          .filter(p => p.type === 'ITEMS')
          .reduce((sum, p) => sum + p.balance, 0),
        shippingOutstanding: payments
          .filter(p => p.type === 'SHIPPING')
          .reduce((sum, p) => sum + p.balance, 0),
        overdue: payments.filter(p => p.isOverdue),
        entries: payments,
      };

      return summary;
    } catch (error) {
      console.error('❌ Error fetching outstanding payments:', error);
      throw error;
    }
  }

  /**
   * Get GRN payment status
   */
  static async getGrnPaymentStatus(grnNumber) {
    try {
      const entries = await VendorPayment.find({ grnId: grnNumber });

      const summary = {
        grnNumber,
        totalAmount: entries.reduce((sum, e) => sum + e.initialAmount, 0),
        totalPaid: entries.reduce((sum, e) => sum + e.amountPaid, 0),
        totalBalance: entries.reduce((sum, e) => sum + e.balance, 0),
        itemsAmount: entries
          .filter(e => e.type === 'ITEMS')
          .reduce((sum, e) => sum + e.initialAmount, 0),
        shippingAmount: entries
          .filter(e => e.type === 'SHIPPING')
          .reduce((sum, e) => sum + e.initialAmount, 0),
        overallStatus:
          entries.filter(e => e.paymentStatus === 'PAID').length === entries.length
            ? 'PAID'
            : entries.filter(e => e.amountPaid > 0).length > 0
              ? 'PARTIAL'
              : 'PENDING',
        entries,
      };

      return summary;
    } catch (error) {
      console.error('❌ Error fetching GRN payment status:', error);
      throw error;
    }
  }

  /**
   * Record a payment against vendor payment entry
   */
  static async recordPayment(vendorPaymentId, paymentData) {
    try {
      const entry = await VendorPayment.findById(vendorPaymentId);

      if (!entry) {
        throw new Error('Vendor payment entry not found');
      }

      if (paymentData.amountPaid > entry.balance) {
        throw new Error(
          `Payment amount (${paymentData.amountPaid}) exceeds balance (${entry.balance})`
        );
      }

      entry.recordPayment(paymentData);
      await entry.save();

      console.log(
        `✅ Payment recorded | Type: ${entry.type} | Paid: ${paymentData.amountPaid} | Balance: ${entry.balance}`
      );

      return entry;
    } catch (error) {
      console.error('❌ Error recording payment:', error);
      throw error;
    }
  }
}

export default VendorPaymentService;
