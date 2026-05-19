import express from 'express';
import VendorCashflowService from '../services/VendorCashflowService.js';
import VendorCashflow from '../../../Models/VendorCashflow.js';

const router = express.Router();

const attachAuditNames = (entry) => {
  const record = entry?.toObject ? entry.toObject() : entry;

  return {
    ...record,
    createdByName: record?.createdBy?.fullName || record?.createdBy?.username || record?.createdByName || null,
    updatedByName: record?.updatedBy?.fullName || record?.updatedBy?.username || record?.updatedByName || null,
  };
};

// Create vendor payment entry against an existing vendor cashflow row.
router.post('/', async (req, res) => {
  try {
    const {
      vendorCashflowId,
      cashflowId,
      id,
      drAmount,
      crAmount,
      amountPaid,
      paymentDate,
      paymentMethod,
      paymentReference,
      notes,
      paymentId,
    } = req.body;

    const targetId = vendorCashflowId || cashflowId || id;
    const debitAmount = Number(drAmount ?? amountPaid ?? crAmount ?? 0);

    if (!targetId) {
      return res.status(400).json({ success: false, message: 'vendorCashflowId (or cashflowId/id) is required' });
    }

    if (!debitAmount || debitAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount paid' });
    }

    const entry = await VendorCashflowService.recordPayment(targetId, {
      paymentId,
      drAmount: debitAmount,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod,
      paymentReference,
      notes,
      updatedBy: req.user?.id || req.user?._id,
      updatedByName: req.user?.fullName || req.user?.name || req.user?.username || req.user?.userName || req.user?.email,
    });

    res.status(201).json({
      success: true,
      message: 'Vendor payment entry created successfully',
      entry: attachAuditNames(entry),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create vendor payment entry',
      error: error.message,
    });
  }
});

// Optional helper to quickly view a specific payment target row.
router.get('/:id', async (req, res) => {
  try {
    const entry = await VendorCashflow.findById(req.params.id)
      .populate('vendorId', 'vendorName email phone')
      .populate('createdBy', 'fullName username email')
      .populate('updatedBy', 'fullName username email');

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Cashflow entry not found' });
    }

    res.status(200).json({ success: true, data: attachAuditNames(entry) });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment target entry',
      error: error.message,
    });
  }
});

export default router;
