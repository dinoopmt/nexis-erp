import mongoose from 'mongoose';
import User from './User.js';

const vendorCashflowSchema = new mongoose.Schema(
	{
		grnId: {
			type: String,
			required: true,
			index: true,
			comment: 'GRN document id (stored as string)',
		},
		grnNumber: {
			type: String,
			required: true,
			index: true,
			comment: 'Human-readable GRN number (GRN-2025-26-00001)',
		},
		grnDate: {
			type: Date,
			required: true,
		},
		vendorId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Vendor',
			required: true,
			index: true,
		},
		vendorName: {
			type: String,
			required: true,
			index: true,
		},
		type: {
			type: String,
			enum: ['ITEMS', 'SHIPPING'],
			default: 'ITEMS',
			comment: 'ITEMS = line items total, SHIPPING = shipping cost',
		},
		drAmount: {
			type: Number,
			required: true,
			min: 0,
			alias: 'amountPaid',
			comment: 'Total debits against payable (vendor payments made)',
		},
		crAmount: {
			type: Number,
			default: 0,
			min: 0,
			alias: 'initialAmount',
			comment: 'Total credits posted to payable (liability created at GRN)',
		},
		balance: {
			type: Number,
			required: true,
			min: 0,
			comment: 'Outstanding payable balance = crAmount - drAmount',
		},
		paymentTerms: {
			type: String,
			enum: ['IMMEDIATE', 'NET_7', 'NET_14', 'NET_30', 'NET_60', 'NET_90', 'CUSTOM'],
			default: 'NET_30',
		},
		dueDate: {
			type: Date,
			required: true,
			index: true,
			comment: 'Payment due date calculated from payment terms',
		},
		creditDays: {
			type: Number,
			default: 30,
			comment: 'Number of days allowed for payment',
		},
		paymentStatus: {
			type: String,
			enum: ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'],
			default: 'PENDING',
			index: true,
		},
		remarks: String,
		createdBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
		},
		createdByName: {
			type: String,
			default: '',
			trim: true,
		},
		createdDate: {
			type: Date,
			default: Date.now,
		},
		updatedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
		},
		updatedByName: {
			type: String,
			default: '',
			trim: true,
		},
		updatedDate: {
			type: Date,
			default: Date.now,
		},
	},
	{
		timestamps: true,
		collection: 'vendor_cash_flow',
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

vendorCashflowSchema.index({ grnId: 1, vendorId: 1 });
vendorCashflowSchema.index({ vendorId: 1, paymentStatus: 1 });
vendorCashflowSchema.index({ dueDate: 1, paymentStatus: 1 });
vendorCashflowSchema.index({ createdByName: 1 });
vendorCashflowSchema.index({ updatedByName: 1 });

vendorCashflowSchema.virtual('isOverdue').get(function () {
	return this.paymentStatus !== 'PAID' && new Date() > this.dueDate;
});

vendorCashflowSchema.virtual('daysOverdue').get(function () {
	if (!this.isOverdue) return 0;
	return Math.floor((new Date() - this.dueDate) / (1000 * 60 * 60 * 24));
});

vendorCashflowSchema.virtual('percentPaid').get(function () {
	return this.crAmount > 0 ? (this.drAmount / this.crAmount) * 100 : 0;
});

vendorCashflowSchema.pre('init', function (data) {
	if ((data.crAmount === undefined || data.crAmount === null) && data.initialAmount !== undefined) {
		data.crAmount = data.initialAmount;
	}
	if ((data.drAmount === undefined || data.drAmount === null) && data.amountPaid !== undefined) {
		data.drAmount = data.amountPaid;
	}
});

vendorCashflowSchema.pre('save', async function () {
	if ((!this.createdByName || !this.createdByName.trim()) && this.createdBy) {
		const createdByUser = await User.findById(this.createdBy).select('fullName username').lean();
		if (createdByUser) {
			this.createdByName = createdByUser.fullName || createdByUser.username || '';
		}
	}

	if ((!this.updatedByName || !this.updatedByName.trim()) && this.updatedBy) {
		const updatedByUser = await User.findById(this.updatedBy).select('fullName username').lean();
		if (updatedByUser) {
			this.updatedByName = updatedByUser.fullName || updatedByUser.username || '';
		}
	}
});

vendorCashflowSchema.methods.calculateBalance = function () {
	this.balance = this.crAmount - this.drAmount;
	if (this.balance <= 0) {
		this.paymentStatus = 'PAID';
		this.balance = 0;
	} else if (this.drAmount > 0) {
		this.paymentStatus = 'PARTIAL';
	}
	return this.balance;
};

vendorCashflowSchema.methods.recordPayment = function (paymentData) {
	const { amountPaid, drAmount, updatedBy, updatedByName } = paymentData;

	const debitAmount = Number(drAmount ?? amountPaid ?? 0);

	this.drAmount += debitAmount;
	this.calculateBalance();
	if (updatedBy) {
		this.updatedBy = updatedBy;
	}
	if (updatedByName) {
		this.updatedByName = updatedByName;
	}
	this.updatedDate = new Date();

	return this;
};

vendorCashflowSchema.statics.getOutstanding = function (vendorId) {
	return this.find({
		vendorId,
		paymentStatus: { $in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
		balance: { $gt: 0 },
	});
};

vendorCashflowSchema.statics.getGrnTotalPayable = function (grnId) {
	return this.find({ grnId });
};

export default mongoose.model('VendorCashflow', vendorCashflowSchema);
