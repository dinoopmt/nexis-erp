import CreditCustomerCashflow from '../../../Models/Sales/CreditCustomerCashflow.js';
import CustomerReceipt from '../../../Models/CustomerReceipt.js';
import Customer from '../../../Models/Customer.js';
import SalesInvoice from '../../../Models/Sales/SalesInvoice.js';

/**
 * Get all credit customer cashflow entries
 */
export const getCreditCustomerCashflows = async (req, res) => {
  try {
    const { customerId, financialYear, status, sortBy = 'dueDate' } = req.query;

    const filter = { isDeleted: false };

    if (customerId) filter.customerId = customerId;
    if (financialYear) filter.financialYear = financialYear;
    if (status) filter.status = status;

    const cashflows = await CreditCustomerCashflow.find(filter)
      .populate('customerId', 'name phone address')
      .populate('ledgerAccountId', 'accountName accountNumber')
      .sort({ [sortBy]: 1 })
      .lean();

    res.json(cashflows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get cashflow entry by ID with full transaction history
 */
export const getCreditCustomerCashflowById = async (req, res) => {
  try {
    const { id } = req.params;

    const cashflow = await CreditCustomerCashflow.findById(id)
      .populate('customerId', 'name phone address email')
      .populate('ledgerAccountId', 'accountName accountNumber')
      .populate('transactions.referenceId');

    if (!cashflow) {
      return res.status(404).json({ error: 'Cashflow entry not found' });
    }

    res.json(cashflow);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get cashflow for a specific customer and financial year
 */
export const getCashflowByCustomerAndYear = async (req, res) => {
  try {
    const { customerId, financialYear } = req.params;

    if (!customerId || !financialYear) {
      return res.status(400).json({ error: 'Customer ID and Financial Year are required' });
    }

    const cashflow = await CreditCustomerCashflow.findOne({
      customerId,
      financialYear,
      isDeleted: false
    })
      .populate('customerId', 'name phone address')
      .populate('ledgerAccountId', 'accountName accountNumber')
      .populate('transactions.referenceId');

    if (!cashflow) {
      return res.status(404).json({ error: 'No cashflow entries found for this customer' });
    }

    res.json(cashflow);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Record receipt payment in cashflow (updates balance and adds transaction)
 */
export const recordReceiptPayment = async (req, res) => {
  try {
    const { cashflowId } = req.params;
    const { receiptNumber, receiptId, amountPaid, paymentMode, advanceAmount = 0, narration } = req.body;

    if (!receiptNumber || !amountPaid || amountPaid <= 0) {
      return res.status(400).json({ error: 'Receipt number and valid amount paid are required' });
    }

    const cashflow = await CreditCustomerCashflow.findById(cashflowId);
    if (!cashflow) {
      return res.status(404).json({ error: 'Cashflow entry not found' });
    }

    const previousBalance = cashflow.currentBalance;
    let newBalance = previousBalance - amountPaid;

    // Update summary fields
    cashflow.totalReceived += amountPaid;
    if (advanceAmount > 0) {
      cashflow.totalAdvanceReceived += advanceAmount;
    }
    cashflow.currentBalance = Math.max(0, newBalance);
    cashflow.lastPaymentDate = new Date();
    cashflow.lastPaymentAmount = amountPaid;

    // Add transaction record
    const transaction = {
      transactionType: advanceAmount > 0 ? 'AdvanceReceived' : 'Payment',
      transactionDate: new Date(),
      drAmount: 0,
      crAmount: amountPaid,
      balance: cashflow.currentBalance,
      reference: receiptNumber,
      referenceId: receiptId,
      paymentMode,
      receiptNumber,
      advanceAmount,
      invoiceAmountCovered: amountPaid - advanceAmount,
      narration: narration || `Payment received via ${paymentMode}`,
      createdBy: req.user?.name || 'System'
    };

    cashflow.transactions.push(transaction);

    // Update status based on balance
    if (cashflow.currentBalance === 0) {
      cashflow.status = 'Settled';
    } else if (cashflow.currentBalance < previousBalance) {
      cashflow.status = 'PartiallyPaid';
    }

    // Check for overdue
    if (new Date() > cashflow.dueDate && cashflow.currentBalance > 0) {
      cashflow.status = 'Overdue';
    }

    // Set audit trail
    cashflow.updatedBy = req.user?.name || 'System';
    await cashflow.save();

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      cashflow
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Record partial receipt allocation
 */
export const recordPartialReceiptAllocation = async (req, res) => {
  try {
    const { cashflowId } = req.params;
    const { receiptNumber, receiptId, invoiceAmount, allocatedAmount, paymentMode } = req.body;

    if (!receiptNumber || !invoiceAmount || !allocatedAmount || allocatedAmount > invoiceAmount) {
      return res.status(400).json({ error: 'Invalid partial receipt data' });
    }

    const cashflow = await CreditCustomerCashflow.findById(cashflowId);
    if (!cashflow) {
      return res.status(404).json({ error: 'Cashflow entry not found' });
    }

    // Calculate new balance
    const partialAmount = invoiceAmount - allocatedAmount;
    const newBalance = cashflow.currentBalance - allocatedAmount;

    cashflow.totalReceived += allocatedAmount;
    cashflow.currentBalance = Math.max(0, newBalance);
    cashflow.lastPaymentDate = new Date();
    cashflow.lastPaymentAmount = allocatedAmount;

    // Add transaction for partial receipt
    const transaction = {
      transactionType: 'Payment',
      transactionDate: new Date(),
      drAmount: 0,
      crAmount: allocatedAmount,
      balance: cashflow.currentBalance,
      reference: receiptNumber,
      referenceId: receiptId,
      paymentMode,
      receiptNumber,
      invoiceAmountCovered: allocatedAmount,
      narration: `Partial receipt: ${allocatedAmount} of ${invoiceAmount}`,
      createdBy: req.user?.name || 'System'
    };

    cashflow.transactions.push(transaction);

    // Update status
    if (cashflow.currentBalance === 0) {
      cashflow.status = 'Settled';
    } else if (cashflow.currentBalance < cashflow.totalInvoiced) {
      cashflow.status = 'PartiallyPaid';
    }

    // Set audit trail
    cashflow.updatedBy = req.user?.name || 'System';
    await cashflow.save();

    res.json({
      success: true,
      message: 'Partial receipt recorded successfully',
      cashflow
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Record advance receipt
 */
export const recordAdvanceReceipt = async (req, res) => {
  try {
    const { customerId, receiptNumber, receiptId, advanceAmount, paymentMode, financialYear } = req.body;

    if (!customerId || !receiptNumber || !advanceAmount || advanceAmount <= 0) {
      return res.status(400).json({ error: 'Customer ID, receipt number, and valid advance amount are required' });
    }

    // Get or create cashflow entry for this customer
    let cashflow = await CreditCustomerCashflow.findOne({
      customerId,
      financialYear,
      isDeleted: false
    });

    if (!cashflow) {
      const customer = await Customer.findById(customerId);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      cashflow = new CreditCustomerCashflow({
        customerId,
        customerCode: customer.customerCode,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        ledgerAccountId: customer.ledgerAccountId,
        financialYear,
        totalAdvanceReceived: advanceAmount,
        currentBalance: -advanceAmount, // Negative balance = advance
        status: 'Active',
        createdBy: req.user?.name || 'System',
        updatedBy: req.user?.name || 'System'
      });
    } else {
      cashflow.totalAdvanceReceived += advanceAmount;
      cashflow.currentBalance = -cashflow.totalAdvanceReceived; // Update balance
      cashflow.updatedBy = req.user?.name || 'System';
    }

    // Add advance transaction
    const transaction = {
      transactionType: 'AdvanceReceived',
      transactionDate: new Date(),
      drAmount: 0,
      crAmount: advanceAmount,
      balance: cashflow.currentBalance,
      reference: receiptNumber,
      referenceId: receiptId,
      paymentMode,
      receiptNumber,
      advanceAmount,
      narration: `Advance receipt: ${advanceAmount}`,
      createdBy: req.user?.name || 'System'
    };

    cashflow.transactions.push(transaction);
    await cashflow.save();

    res.json({
      success: true,
      message: 'Advance receipt recorded successfully',
      cashflow
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Apply advance to invoice
 */
export const applyAdvanceToInvoice = async (req, res) => {
  try {
    const { cashflowId } = req.params;
    const { advanceToApply, receiptNumber, receiptId } = req.body;

    if (!advanceToApply || advanceToApply <= 0) {
      return res.status(400).json({ error: 'Valid advance amount is required' });
    }

    const cashflow = await CreditCustomerCashflow.findById(cashflowId);
    if (!cashflow) {
      return res.status(404).json({ error: 'Cashflow entry not found' });
    }

    if (cashflow.totalAdvanceReceived < advanceToApply) {
      return res.status(400).json({ error: 'Insufficient advance balance' });
    }

    // Apply advance to invoice
    cashflow.totalAdvanceApplied += advanceToApply;
    const newBalance = cashflow.currentBalance + advanceToApply; // Reduce outstanding

    cashflow.currentBalance = newBalance;

    // Add transaction
    const transaction = {
      transactionType: 'AdvanceApplied',
      transactionDate: new Date(),
      drAmount: 0,
      crAmount: advanceToApply,
      balance: newBalance,
      reference: receiptNumber || `Advance Application`,
      referenceId: receiptId,
      advanceAmount: -advanceToApply, // Negative = applied
      narration: `Applied advance to invoice`,
      createdBy: req.user?.name || 'System'
    };

    cashflow.transactions.push(transaction);

    // Update status
    if (cashflow.currentBalance === 0) {
      cashflow.status = 'Settled';
    } else if (cashflow.currentBalance < cashflow.totalInvoiced) {
      cashflow.status = 'PartiallyPaid';
    }

    // Set audit trail
    cashflow.updatedBy = req.user?.name || 'System';
    await cashflow.save();

    res.json({
      success: true,
      message: 'Advance applied successfully',
      cashflow
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Get customer outstanding aging report
 */
export const getCustomerAgingReport = async (req, res) => {
  try {
    const { customerId, financialYear } = req.query;

    const filter = { isDeleted: false };
    if (customerId) filter.customerId = customerId;
    if (financialYear) filter.financialYear = financialYear;

    const cashflows = await CreditCustomerCashflow.find(filter)
      .populate('customerId', 'name phone email')
      .lean();

    const today = new Date();
    const agingReport = cashflows.map(cashflow => {
      const daysOverdue = Math.floor((today - cashflow.dueDate) / (1000 * 60 * 60 * 24));

      let agingBucket = '';
      if (daysOverdue <= 30) agingBucket = 'Current';
      else if (daysOverdue <= 60) agingBucket = '31-60 Days';
      else if (daysOverdue <= 90) agingBucket = '61-90 Days';
      else agingBucket = 'Over 90 Days';

      return {
        ...cashflow,
        daysOverdue: Math.max(0, daysOverdue),
        agingBucket,
        outstandingAmount: cashflow.currentBalance
      };
    });

    // Group by aging bucket
    const groupedByAge = agingReport.reduce((acc, item) => {
      if (!acc[item.agingBucket]) {
        acc[item.agingBucket] = {
          bucket: item.agingBucket,
          count: 0,
          totalOutstanding: 0,
          customers: []
        };
      }
      acc[item.agingBucket].count += 1;
      acc[item.agingBucket].totalOutstanding += item.outstandingAmount;
      acc[item.agingBucket].customers.push(item);
      return acc;
    }, {});

    res.json({
      totalOutstanding: agingReport.reduce((sum, item) => sum + item.outstandingAmount, 0),
      agingBuckets: Object.values(groupedByAge),
      detailedReport: agingReport
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Record invoice reversal/cancellation
 */
export const recordInvoiceReversal = async (req, res) => {
  try {
    const { cashflowId } = req.params;
    const { reversalReason, narration } = req.body;

    const cashflow = await CreditCustomerCashflow.findById(cashflowId);
    if (!cashflow) {
      return res.status(404).json({ error: 'Cashflow entry not found' });
    }

    // Reverse the debit entry
    const originalInvoiceAmount = cashflow.totalInvoiced;
    const newBalance = cashflow.currentBalance - originalInvoiceAmount;

    cashflow.totalInvoiced = 0;
    cashflow.currentBalance = newBalance;

    // Add reversal transaction
    const transaction = {
      transactionType: 'Reversal',
      transactionDate: new Date(),
      drAmount: 0,
      crAmount: originalInvoiceAmount,
      balance: newBalance,
      reference: `Reversal of ${cashflow.invoiceNumber}`,
      narration: narration || `Invoice reversal: ${reversalReason}`,
      createdBy: req.user?.name || 'System'
    };

    cashflow.transactions.push(transaction);
    cashflow.status = 'Settled';

    // Set audit trail
    cashflow.updatedBy = req.user?.name || 'System';
    await cashflow.save();

    // Update associated invoice status
    if (cashflow.salesId) {
      await SalesInvoice.findByIdAndUpdate(cashflow.salesId, {
        status: 'Cancelled',
        paymentStatus: 'Cancelled'
      });
    }

    res.json({
      success: true,
      message: 'Invoice reversal recorded successfully',
      cashflow
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Get transaction history for a cashflow entry
 */
export const getTransactionHistory = async (req, res) => {
  try {
    const { cashflowId } = req.params;

    const cashflow = await CreditCustomerCashflow.findById(cashflowId)
      .populate('customerId', 'name phone')
      .lean();

    if (!cashflow) {
      return res.status(404).json({ error: 'Cashflow entry not found' });
    }

    res.json({
      customer: cashflow.customerId,
      invoiceNumber: cashflow.invoiceNumber,
      dueDate: cashflow.dueDate,
      totalInvoiced: cashflow.totalInvoiced,
      totalReceived: cashflow.totalReceived,
      currentBalance: cashflow.currentBalance,
      transactions: cashflow.transactions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
