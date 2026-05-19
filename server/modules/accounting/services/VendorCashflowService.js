import VendorCashflow from '../../../Models/VendorCashflow.js';
import User from '../../../Models/User.js';

class VendorCashflowService {
	static async resolveUserDisplayName(userId) {
		if (!userId) return '';
		if (typeof userId === 'object') {
			return userId.fullName || userId.name || userId.username || userId.userName || '';
		}
		const user = await User.findById(userId).select('fullName username').lean();
		return user?.fullName || user?.username || '';
	}

	static async createPaymentEntriesFromGrn(grnData) {
		try {
			const {
				grnId,
				grnNumber,
				grnDate,
				vendorId,
				vendorName,
				paymentTerms = 'NET_30',
				netTotal,
				shippingCost = 0,
				createdBy,
				createdByName,
			} = grnData;

			const dueDate = this.calculateDueDate(new Date(grnDate), paymentTerms);
			const grnIdAsString = String(grnId);
			const creditDays = this.getCreditDays(paymentTerms);
			const resolvedCreatedByName =
				String(createdByName || '').trim() ||
				(await this.resolveUserDisplayName(createdBy));

			const entries = [];

			const itemsAmount = netTotal;
			let itemsEntry = await VendorCashflow.findOne({
				type: 'ITEMS',
				$or: [{ grnId: grnIdAsString }, { grnNumber }],
			});

			if (!itemsEntry) {
				itemsEntry = new VendorCashflow({
					grnId: grnIdAsString,
					grnNumber,
					grnDate: new Date(grnDate),
					vendorId,
					vendorName,
					type: 'ITEMS',
					drAmount: 0,
					crAmount: Math.round(itemsAmount * 100) / 100,
					balance: Math.round(itemsAmount * 100) / 100,
					paymentTerms,
					dueDate,
					creditDays,
					paymentStatus: 'PENDING',
					createdBy,
					createdByName: resolvedCreatedByName,
					updatedBy: createdBy,
					updatedByName: resolvedCreatedByName,
				});

				await itemsEntry.save();
				console.log(`✅ Vendor cashflow entry created for items: ${grnNumber} | Amount: ${itemsAmount}`);
			}

			entries.push({
				type: 'ITEMS',
				amount: itemsEntry.balance,
				id: itemsEntry._id,
			});

			if (shippingCost && shippingCost > 0) {
				let shippingEntry = await VendorCashflow.findOne({
					type: 'SHIPPING',
					$or: [{ grnId: grnIdAsString }, { grnNumber }],
				});

				if (!shippingEntry) {
					shippingEntry = new VendorCashflow({
						grnId: grnIdAsString,
						grnNumber,
						grnDate: new Date(grnDate),
						vendorId,
						vendorName,
						type: 'SHIPPING',
						drAmount: 0,
						crAmount: Math.round(shippingCost * 100) / 100,
						balance: Math.round(shippingCost * 100) / 100,
						paymentTerms,
						dueDate,
						creditDays,
						paymentStatus: 'PENDING',
						createdBy,
						createdByName: resolvedCreatedByName,
						updatedBy: createdBy,
						updatedByName: resolvedCreatedByName,
					});

					await shippingEntry.save();
					console.log(`✅ Vendor cashflow entry created for shipping: ${grnNumber} | Amount: ${shippingCost}`);
				}

				entries.push({
					type: 'SHIPPING',
					amount: shippingEntry.balance,
					id: shippingEntry._id,
				});
			}

			return {
				success: true,
				grnNumber,
				vendorName,
				entries,
				totalPayable: entries.reduce((sum, e) => sum + e.amount, 0),
			};
		} catch (error) {
			console.error('❌ Error creating vendor cashflow entries:', error);
			throw error;
		}
	}

	static calculateDueDate(grnDate, paymentTerms) {
		const dueDate = new Date(grnDate);
		const creditDays = this.getCreditDays(paymentTerms);
		dueDate.setDate(dueDate.getDate() + creditDays);
		return dueDate;
	}

	static getCreditDays(paymentTerms) {
		const termsMap = {
			IMMEDIATE: 0,
			NET_7: 7,
			NET_14: 14,
			NET_30: 30,
			NET_60: 60,
			NET_90: 90,
			CUSTOM: 30,
		};

		return termsMap[paymentTerms] || 30;
	}

	static async getOutstandingPayments(vendorId, status = null) {
		try {
			const query = { vendorId, balance: { $gt: 0 } };

			if (status) {
				query.paymentStatus = status;
			} else {
				query.paymentStatus = { $in: ['PENDING', 'PARTIAL', 'OVERDUE'] };
			}

			const entries = await VendorCashflow.find(query)
				.populate('createdBy', 'fullName username email')
				.populate('updatedBy', 'fullName username email')
				.sort({ dueDate: 1 });

			return {
				totalOutstanding: entries.reduce((sum, p) => sum + p.balance, 0),
				itemsOutstanding: entries
					.filter(p => p.type === 'ITEMS')
					.reduce((sum, p) => sum + p.balance, 0),
				shippingOutstanding: entries
					.filter(p => p.type === 'SHIPPING')
					.reduce((sum, p) => sum + p.balance, 0),
				overdue: entries.filter(p => p.isOverdue),
				entries,
			};
		} catch (error) {
			console.error('❌ Error fetching outstanding vendor cashflow:', error);
			throw error;
		}
	}

	static async getGrnPaymentStatus(grnNumber) {
		try {
			const entries = await VendorCashflow.find({
				$or: [{ grnNumber }, { grnId: grnNumber }],
			})
				.populate('createdBy', 'fullName username email')
				.populate('updatedBy', 'fullName username email');

			return {
				grnNumber,
				totalAmount: entries.reduce((sum, e) => sum + e.crAmount, 0),
				totalPaid: entries.reduce((sum, e) => sum + e.drAmount, 0),
				totalBalance: entries.reduce((sum, e) => sum + e.balance, 0),
				itemsAmount: entries
					.filter(e => e.type === 'ITEMS')
					.reduce((sum, e) => sum + e.crAmount, 0),
				shippingAmount: entries
					.filter(e => e.type === 'SHIPPING')
					.reduce((sum, e) => sum + e.crAmount, 0),
				overallStatus:
					entries.filter(e => e.paymentStatus === 'PAID').length === entries.length
						? 'PAID'
						: entries.filter(e => e.drAmount > 0).length > 0
							? 'PARTIAL'
							: 'PENDING',
				entries,
			};
		} catch (error) {
			console.error('❌ Error fetching GRN cashflow status:', error);
			throw error;
		}
	}

	static async recordPayment(vendorCashflowId, paymentData) {
		try {
			const entry = await VendorCashflow.findById(vendorCashflowId);

			if (!entry) {
				throw new Error('Vendor cashflow entry not found');
			}

			const debitAmount = Number(paymentData.drAmount ?? paymentData.amountPaid ?? paymentData.crAmount ?? 0);
			const updatedByName =
				String(paymentData.updatedByName || '').trim() ||
				(await this.resolveUserDisplayName(paymentData.updatedBy));

			if (debitAmount > entry.balance) {
				throw new Error(`Payment amount (${debitAmount}) exceeds balance (${entry.balance})`);
			}

			entry.recordPayment({ ...paymentData, drAmount: debitAmount, updatedByName });
			await entry.save();

			return entry;
		} catch (error) {
			console.error('❌ Error recording vendor cashflow payment:', error);
			throw error;
		}
	}
}

export default VendorCashflowService;
