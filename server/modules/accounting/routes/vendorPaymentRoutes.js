import express from 'express';
import VendorPaymentService from '../services/VendorPaymentService.js';
import VendorPayment from '../../../Models/VendorPayment.js';

const router = express.Router();

/**
 * Get outstanding payments for a vendor
 * GET /api/vendor-payments/outstanding/:vendorId
 */
router.get('/outstanding/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { status } = req.query;

    const summary = await VendorPaymentService.getOutstandingPayments(vendorId, status);

    res.status(200).json({
      success: true,
      ...summary,
    });
  } catch (error) {
    console.error('❌ Error fetching outstanding payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch outstanding payments',
      error: error.message,
    });
  }
});

/**
 * Get payment status for a specific GRN
 * GET /api/vendor-payments/grn/:grnNumber
 */
router.get('/grn/:grnNumber', async (req, res) => {
  try {
    const { grnNumber } = req.params;

    const status = await VendorPaymentService.getGrnPaymentStatus(grnNumber);

    res.status(200).json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error('❌ Error fetching GRN payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch GRN payment status',
      error: error.message,
    });
  }
});

/**
 * Record a payment against a vendor payment entry
 * POST /api/vendor-payments/:id/record-payment
 */
router.post('/:id/record-payment', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      paymentId,
      amountPaid,
      paymentDate,
      paymentMethod,
      paymentReference,
      notes,
    } = req.body;

    if (!amountPaid || amountPaid <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount paid',
      });
    }

    const entry = await VendorPaymentService.recordPayment(id, {
      paymentId,
      amountPaid: parseFloat(amountPaid),
      paymentDate: new Date(paymentDate),
      paymentMethod,
      paymentReference,
      notes,
    });

    res.status(200).json({
      success: true,
      message: 'Payment recorded successfully',
      entry,
    });
  } catch (error) {
    console.error('❌ Error recording payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record payment',
      error: error.message,
    });
  }
});

/**
 * Get all vendor payments
 * GET /api/vendor-payments
 */
router.get('/', async (req, res) => {
  try {
    const { vendorId, status, grnId } = req.query;

    const query = {};
    if (vendorId) query.vendorId = vendorId;
    if (status) query.paymentStatus = status;
    if (grnId) query.grnId = grnId;

    const payments = await VendorPayment.find(query).sort({ dueDate: 1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    console.error('❌ Error fetching vendor payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor payments',
      error: error.message,
    });
  }
});

/**
 * Get single vendor payment entry
 * GET /api/vendor-payments/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await VendorPayment.findById(id)
      .populate('vendorId', 'vendorName email phone')
      .populate('payments.paymentId');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment entry not found',
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error('❌ Error fetching payment entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment entry',
      error: error.message,
    });
  }
});

/**
 * Get vendor summary (total outstanding, by status, etc.)
 * GET /api/vendor-payments/summary/:vendorId
 */
router.get('/summary/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;

    const entries = await VendorPayment.find({ vendorId });

    const summary = {
      vendorId,
      totalPayable: entries.reduce((sum, e) => sum + e.initialAmount, 0),
      totalPaid: entries.reduce((sum, e) => sum + e.amountPaid, 0),
      totalOutstanding: entries.reduce((sum, e) => sum + e.balance, 0),
      
      // By Type
      byType: {
        items: {
          amount: entries
            .filter(e => e.type === 'ITEMS')
            .reduce((sum, e) => sum + e.initialAmount, 0),
          paid: entries
            .filter(e => e.type === 'ITEMS')
            .reduce((sum, e) => sum + e.amountPaid, 0),
          outstanding: entries
            .filter(e => e.type === 'ITEMS')
            .reduce((sum, e) => sum + e.balance, 0),
        },
        shipping: {
          amount: entries
            .filter(e => e.type === 'SHIPPING')
            .reduce((sum, e) => sum + e.initialAmount, 0),
          paid: entries
            .filter(e => e.type === 'SHIPPING')
            .reduce((sum, e) => sum + e.amountPaid, 0),
          outstanding: entries
            .filter(e => e.type === 'SHIPPING')
            .reduce((sum, e) => sum + e.balance, 0),
        },
      },

      // By Status
      byStatus: {
        pending: entries.filter(e => e.paymentStatus === 'PENDING').length,
        partial: entries.filter(e => e.paymentStatus === 'PARTIAL').length,
        paid: entries.filter(e => e.paymentStatus === 'PAID').length,
        overdue: entries.filter(e => e.paymentStatus === 'OVERDUE').length,
      },

      // Overdue
      overdue: entries
        .filter(e => e.isOverdue)
        .reduce((sum, e) => sum + e.balance, 0),

      grnCount: new Set(entries.map(e => e.grnId)).size,
    };

    res.status(200).json({
      success: true,
      ...summary,
    });
  } catch (error) {
    console.error('❌ Error fetching vendor summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor summary',
      error: error.message,
    });
  }
});

export default router;
