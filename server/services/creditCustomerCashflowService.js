import CreditCustomerCashflow from '../Models/Sales/CreditCustomerCashflow.js';

/**
 * Update cashflow when payment is received
 * This function should be called after a receipt is created
 */
export const updateCashflowOnPaymentReceipt = async (customerId, financialYear, paymentData) => {
  try {
    const {
      receiptNumber,
      receiptId,
      amountPaid,
      paymentMode,
      receiptType,
      invoiceAllocations,
      advanceAmount = 0
    } = paymentData;

    // Find or create cashflow entry
    let cashflow = await CreditCustomerCashflow.findOne({
      customerId,
      financialYear,
      isDeleted: false
    });

    if (!cashflow) {
      console.warn(`⚠️ No cashflow entry found for customer ${customerId} in FY ${financialYear}`);
      return null;
    }

    // Calculate payment details
    let transactionType = 'Payment';
    let newBalance = cashflow.currentBalance;

    if (receiptType === 'Advance') {
      // Advance receipt
      transactionType = 'AdvanceReceived';
      cashflow.totalAdvanceReceived += amountPaid;
      newBalance = newBalance - amountPaid; // Reduce outstanding
    } else if (receiptType === 'Against Invoice' || receiptType === 'On Account') {
      // Regular payment
      cashflow.totalReceived += amountPaid;
      newBalance = newBalance - amountPaid;
    }

    // Add transaction record
    const transaction = {
      transactionType,
      transactionDate: new Date(),
      drAmount: 0,
      crAmount: amountPaid,
      balance: Math.max(0, newBalance),
      reference: receiptNumber,
      referenceId: receiptId,
      paymentMode,
      receiptNumber,
      advanceAmount: receiptType === 'Advance' ? amountPaid : 0,
      invoiceAmountCovered: receiptType !== 'Advance' ? amountPaid : 0,
      narration: `Payment received via ${paymentMode} - ${receiptType}`,
      createdBy: 'System'
    };

    // If multiple invoices allocated (On Account or multi-invoice payment)
    if (invoiceAllocations && invoiceAllocations.length > 0) {
      transaction.narration = `Payment allocated to ${invoiceAllocations.length} invoice(s)`;
    }

    cashflow.transactions.push(transaction);

    // Update summary fields
    cashflow.currentBalance = Math.max(0, newBalance);
    cashflow.lastPaymentDate = new Date();
    cashflow.lastPaymentAmount = amountPaid;

    // Update status based on balance
    if (cashflow.currentBalance === 0 && cashflow.totalAdvanceApplied === cashflow.totalAdvanceReceived) {
      cashflow.status = 'Settled';
    } else if (cashflow.currentBalance < cashflow.totalInvoiced && cashflow.currentBalance > 0) {
      cashflow.status = 'PartiallyPaid';
    } else if (new Date() > cashflow.dueDate && cashflow.currentBalance > 0) {
      cashflow.status = 'Overdue';
    }

    await cashflow.save();

    console.log(`✅ Updated cashflow for receipt ${receiptNumber}: new balance = ${cashflow.currentBalance}`);
    return cashflow;
  } catch (error) {
    console.error('⚠️ Error updating cashflow on payment receipt:', error.message);
    // Don't throw - allow receipt to be created even if cashflow update fails
    return null;
  }
};

/**
 * Update cashflow for partial payment allocation
 */
export const updateCashflowOnPartialPayment = async (
  customerId,
  financialYear,
  receiptNumber,
  receiptId,
  allocatedAmount,
  paymentMode,
  invoiceAllocations
) => {
  try {
    let cashflow = await CreditCustomerCashflow.findOne({
      customerId,
      financialYear,
      isDeleted: false
    });

    if (!cashflow) {
      return null;
    }

    // Update totals
    cashflow.totalReceived += allocatedAmount;
    const newBalance = cashflow.currentBalance - allocatedAmount;

    // Add transaction
    const transaction = {
      transactionType: 'Payment',
      transactionDate: new Date(),
      drAmount: 0,
      crAmount: allocatedAmount,
      balance: Math.max(0, newBalance),
      reference: receiptNumber,
      referenceId: receiptId,
      paymentMode,
      receiptNumber,
      invoiceAmountCovered: allocatedAmount,
      narration: `Partial payment allocated to ${invoiceAllocations?.length || 1} invoice(s)`,
      createdBy: 'System'
    };

    cashflow.transactions.push(transaction);
    cashflow.currentBalance = Math.max(0, newBalance);
    cashflow.lastPaymentDate = new Date();
    cashflow.lastPaymentAmount = allocatedAmount;

    // Update status
    if (cashflow.currentBalance === 0) {
      cashflow.status = 'Settled';
    } else if (cashflow.currentBalance < cashflow.totalInvoiced) {
      cashflow.status = 'PartiallyPaid';
    }

    await cashflow.save();

    console.log(`✅ Updated cashflow for partial payment ${receiptNumber}`);
    return cashflow;
  } catch (error) {
    console.error('⚠️ Error updating cashflow on partial payment:', error.message);
    return null;
  }
};

/**
 * Update cashflow on advance application to invoice
 */
export const updateCashflowOnAdvanceApplication = async (
  customerId,
  financialYear,
  receiptNumber,
  advanceAppliedAmount
) => {
  try {
    let cashflow = await CreditCustomerCashflow.findOne({
      customerId,
      financialYear,
      isDeleted: false
    });

    if (!cashflow) {
      return null;
    }

    // Update advance tracking
    cashflow.totalAdvanceApplied += advanceAppliedAmount;
    const newBalance = cashflow.currentBalance + advanceAppliedAmount;

    // Add transaction
    const transaction = {
      transactionType: 'AdvanceApplied',
      transactionDate: new Date(),
      drAmount: 0,
      crAmount: advanceAppliedAmount,
      balance: newBalance,
      reference: `Advance applied via ${receiptNumber}`,
      narration: `Applied advance to invoice`,
      createdBy: 'System'
    };

    cashflow.transactions.push(transaction);
    cashflow.currentBalance = newBalance;

    // Update status
    if (cashflow.currentBalance === 0 && cashflow.totalAdvanceApplied === cashflow.totalAdvanceReceived) {
      cashflow.status = 'Settled';
    } else if (cashflow.currentBalance < cashflow.totalInvoiced) {
      cashflow.status = 'PartiallyPaid';
    }

    await cashflow.save();

    console.log(`✅ Updated cashflow for advance application: ${advanceAppliedAmount}`);
    return cashflow;
  } catch (error) {
    console.error('⚠️ Error updating cashflow on advance application:', error.message);
    return null;
  }
};

/**
 * Update cashflow aging information
 * Should be called periodically or when generating reports
 */
export const updateCashflowAging = async (cashflow) => {
  try {
    const today = new Date();
    const daysOverdue = Math.floor((today - cashflow.dueDate) / (1000 * 60 * 60 * 24));
    const balance = cashflow.currentBalance;

    // Reset aging buckets
    cashflow.outstandingUpTo30Days = 0;
    cashflow.outstandingUpTo60Days = 0;
    cashflow.outstandingUpTo90Days = 0;
    cashflow.outstandingOver90Days = 0;

    // Categorize balance
    if (daysOverdue <= 30) {
      cashflow.outstandingUpTo30Days = balance;
    } else if (daysOverdue <= 60) {
      cashflow.outstandingUpTo60Days = balance;
    } else if (daysOverdue <= 90) {
      cashflow.outstandingUpTo90Days = balance;
    } else {
      cashflow.outstandingOver90Days = balance;
    }

    // Update status if overdue
    if (daysOverdue > 0 && cashflow.currentBalance > 0) {
      cashflow.status = 'Overdue';
    }

    await cashflow.save();
    return cashflow;
  } catch (error) {
    console.error('⚠️ Error updating cashflow aging:', error.message);
    return null;
  }
};

/**
 * Get cashflow summary for customer
 */
export const getCashflowSummary = async (customerId, financialYear) => {
  try {
    const cashflow = await CreditCustomerCashflow.findOne({
      customerId,
      financialYear,
      isDeleted: false
    }).lean();

    if (!cashflow) {
      return null;
    }

    return {
      customerId,
      financialYear,
      totalInvoiced: cashflow.totalInvoiced,
      totalReceived: cashflow.totalReceived,
      currentBalance: cashflow.currentBalance,
      totalAdvanceReceived: cashflow.totalAdvanceReceived,
      totalAdvanceApplied: cashflow.totalAdvanceApplied,
      lastPaymentDate: cashflow.lastPaymentDate,
      lastPaymentAmount: cashflow.lastPaymentAmount,
      dueDate: cashflow.dueDate,
      status: cashflow.status,
      transactionCount: cashflow.transactions?.length || 0
    };
  } catch (error) {
    console.error('⚠️ Error getting cashflow summary:', error.message);
    return null;
  }
};
