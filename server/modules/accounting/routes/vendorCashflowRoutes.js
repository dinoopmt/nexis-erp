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

router.get('/outstanding/:vendorId', async (req, res) => {
	try {
		const { vendorId } = req.params;
		const { status } = req.query;

		const summary = await VendorCashflowService.getOutstandingPayments(vendorId, status);
		if (Array.isArray(summary?.entries)) {
			summary.entries = summary.entries.map(attachAuditNames);
		}

		res.status(200).json({ success: true, ...summary });
	} catch (error) {
		res.status(500).json({ success: false, message: 'Failed to fetch outstanding cashflow', error: error.message });
	}
});

router.get('/grn/:grnNumber', async (req, res) => {
	try {
		const { grnNumber } = req.params;
		const status = await VendorCashflowService.getGrnPaymentStatus(grnNumber);

		if (Array.isArray(status?.entries)) {
			status.entries = status.entries.map(attachAuditNames);
		}

		res.status(200).json({ success: true, ...status });
	} catch (error) {
		res.status(500).json({ success: false, message: 'Failed to fetch GRN cashflow status', error: error.message });
	}
});

router.post('/:id/record-payment', async (req, res) => {
	try {
		const { id } = req.params;
		const { paymentId, drAmount, crAmount, amountPaid, paymentDate, paymentMethod, paymentReference, notes } = req.body;

		const debitAmount = parseFloat(drAmount ?? amountPaid ?? crAmount);
		if (!debitAmount || debitAmount <= 0) {
			return res.status(400).json({ success: false, message: 'Invalid amount paid' });
		}

		const entry = await VendorCashflowService.recordPayment(id, {
			paymentId,
			drAmount: debitAmount,
			updatedBy: req.user?.id || req.user?._id,
			updatedByName: req.user?.fullName || req.user?.name || req.user?.username || req.user?.userName || req.user?.email,
			paymentDate: new Date(paymentDate),
			paymentMethod,
			paymentReference,
			notes,
		});

		res.status(200).json({ success: true, message: 'Payment recorded successfully', entry: attachAuditNames(entry) });
	} catch (error) {
		res.status(500).json({ success: false, message: 'Failed to record payment', error: error.message });
	}
});

router.get('/', async (req, res) => {
	try {
		const { vendorId, status, grnId } = req.query;
		const query = {};
		if (vendorId) query.vendorId = vendorId;
		if (status) query.paymentStatus = status;
		if (grnId) query.grnId = grnId;

		const entries = await VendorCashflow.find(query)
			.populate('createdBy', 'fullName username email')
			.populate('updatedBy', 'fullName username email')
			.sort({ dueDate: 1 });

		res.status(200).json({ success: true, count: entries.length, data: entries.map(attachAuditNames) });
	} catch (error) {
		res.status(500).json({ success: false, message: 'Failed to fetch vendor cashflow', error: error.message });
	}
});

router.get('/:id', async (req, res) => {
	try {
		const { id } = req.params;
		const entry = await VendorCashflow.findById(id)
			.populate('vendorId', 'vendorName email phone')
			.populate('createdBy', 'fullName username email')
			.populate('updatedBy', 'fullName username email');

		if (!entry) {
			return res.status(404).json({ success: false, message: 'Cashflow entry not found' });
		}

		res.status(200).json({ success: true, data: attachAuditNames(entry) });
	} catch (error) {
		res.status(500).json({ success: false, message: 'Failed to fetch cashflow entry', error: error.message });
	}
});

router.get('/summary/:vendorId', async (req, res) => {
	try {
		const { vendorId } = req.params;
		const entries = await VendorCashflow.find({ vendorId })
			.populate('createdBy', 'fullName username email')
			.populate('updatedBy', 'fullName username email');

		const summary = {
			vendorId,
			totalPayable: entries.reduce((sum, e) => sum + e.crAmount, 0),
			totalPaid: entries.reduce((sum, e) => sum + e.drAmount, 0),
			totalOutstanding: entries.reduce((sum, e) => sum + e.balance, 0),
			byType: {
				items: {
					amount: entries.filter(e => e.type === 'ITEMS').reduce((sum, e) => sum + e.crAmount, 0),
					paid: entries.filter(e => e.type === 'ITEMS').reduce((sum, e) => sum + e.drAmount, 0),
					outstanding: entries.filter(e => e.type === 'ITEMS').reduce((sum, e) => sum + e.balance, 0),
				},
				shipping: {
					amount: entries.filter(e => e.type === 'SHIPPING').reduce((sum, e) => sum + e.crAmount, 0),
					paid: entries.filter(e => e.type === 'SHIPPING').reduce((sum, e) => sum + e.drAmount, 0),
					outstanding: entries.filter(e => e.type === 'SHIPPING').reduce((sum, e) => sum + e.balance, 0),
				},
			},
			byStatus: {
				pending: entries.filter(e => e.paymentStatus === 'PENDING').length,
				partial: entries.filter(e => e.paymentStatus === 'PARTIAL').length,
				paid: entries.filter(e => e.paymentStatus === 'PAID').length,
				overdue: entries.filter(e => e.paymentStatus === 'OVERDUE').length,
			},
			overdue: entries.filter(e => e.isOverdue).reduce((sum, e) => sum + e.balance, 0),
			grnCount: new Set(entries.map(e => e.grnId)).size,
		};

		res.status(200).json({ success: true, ...summary });
	} catch (error) {
		res.status(500).json({ success: false, message: 'Failed to fetch vendor cashflow summary', error: error.message });
	}
});

export default router;
