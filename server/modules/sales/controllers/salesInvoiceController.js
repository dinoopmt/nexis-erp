import SalesInvoice from '../../../Models/Sales/SalesInvoice.js';
import Counter from '../../../Models/SequenceModel.js';
import Customer from '../../../Models/Customer.js';
import ChartOfAccounts from '../../../Models/ChartOfAccounts.js';
import AccountGroup from '../../../Models/AccountGroup.js';
import JournalEntry from '../../../Models/JournalEntry.js';
import CreditSaleReceipt from '../../../Models/Sales/CreditSaleReceipt.js';
import CustomerReceipt from '../../../Models/CustomerReceipt.js';

// Auto-generate next invoice number
export const getNextInvoiceNumber = async (req, res) => {
  try {
    const { financialYear } = req.query;
    if (!financialYear) {
      return res.status(400).json({ error: 'Financial year is required' });
    }
    const counter = await Counter.findOneAndUpdate(
      { module: 'sales_invoice', financialYear },
      { $inc: { lastNumber: 1 }, $setOnInsert: { prefix: 'SI' } },
      { new: true, upsert: true }
    );
    const paddedNumber = String(counter.lastNumber).padStart(4, '0');
    const invoiceNumber = `SI/${financialYear}/${paddedNumber}`;
    res.json({ invoiceNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create Sales Invoice
export const createSalesInvoice = async (req, res) => {
  try {
    console.log("Creating Sales Invoice:", req.body);

    // Validate required fields
    const { invoiceNumber, customerName, date, items, financialYear, paymentType, paymentTerms, customerId } = req.body;
    
    if (!invoiceNumber || !customerName || !date || !financialYear) {
      return res.status(400).json({ 
        error: 'Missing required fields: invoiceNumber, customerName, date, financialYear' 
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ 
        error: 'Invoice must contain at least one item' 
      });
    }

    // Check if invoice number already exists
    const existingInvoice = await SalesInvoice.findOne({ invoiceNumber });
    if (existingInvoice) {
      return res.status(409).json({ 
        error: 'Invoice number already exists' 
      });
    }

    // Create new invoice with all payload data
    const invoice = new SalesInvoice(req.body);
    await invoice.save();

    console.log("Invoice created successfully:", invoice._id);

    // If Credit Sale with paymentTerms = "Credit", create double-entry ledger
    if (paymentType === "Credit" && paymentTerms === "Credit" && customerId) {
      try {
        const customer = await Customer.findById(customerId);
        if (customer && customer.ledgerAccountId) {
          console.log(`Creating double-entry ledger for credit sale invoice ${invoiceNumber}`);

          // Get or create Sales Revenue account
          let salesAccount = await ChartOfAccounts.findOne({
            accountName: "Sales Revenue",
            isDeleted: false,
          });

          if (!salesAccount) {
            let salesGroup = await AccountGroup.findOne({
              code: "SR",
              isActive: true
            });

            if (!salesGroup) {
              salesGroup = new AccountGroup({
                name: "SALES REVENUE",
                code: "SR",
                description: "Sales Revenue Accounts",
                level: 1,
                type: "INCOME",
                accountCategory: "PROFIT_LOSS",
                nature: "CREDIT",
                allowPosting: true,
                isActive: true
              });
              await salesGroup.save();
            }

            salesAccount = new ChartOfAccounts({
              accountNumber: "SALES-001",
              accountName: "Sales Revenue",
              accountGroupId: salesGroup._id,
              description: "Sales Revenue Account",
              allowPosting: true,
              accountCategory: "PROFIT_LOSS",
              isActive: true,
            });
            await salesAccount.save();
            console.log("Created Sales Revenue account:", salesAccount._id);
          }

          // Debit: Sundry Debtors/Customer Account (increase receivable)
          const debitEntry = new JournalEntry({
            voucherType: "Sales Invoice",
            voucherNumber: invoiceNumber,
            voucherDate: new Date(date),
            financialYear,
            narration: `Credit sale to ${customerName} - Invoice ${invoiceNumber}`,
            accountId: customer.ledgerAccountId,
            accountName: `${customer.name} (${customer.customerCode})`,
            debitAmount: invoice.totalIncludeVat,
            creditAmount: 0,
            isPosted: true,
            createdDate: new Date(),
          });

          const savedDebitEntry = await debitEntry.save();
          console.log("Created debit entry (Sundry Debtors):", savedDebitEntry._id);

          // Credit: Sales Revenue (record sale)
          const creditEntry = new JournalEntry({
            voucherType: "Sales Invoice",
            voucherNumber: invoiceNumber,
            voucherDate: new Date(date),
            financialYear,
            narration: `Credit sale to ${customerName} - Invoice ${invoiceNumber}`,
            accountId: salesAccount._id,
            accountName: salesAccount.accountName,
            debitAmount: 0,
            creditAmount: invoice.totalIncludeVat,
            isPosted: true,
            createdDate: new Date(),
          });

          const savedCreditEntry = await creditEntry.save();
          console.log("Created credit entry (Sales Revenue):", savedCreditEntry._id);

          // Create initial credit sale receipt (Unpaid status)
          const lastReceipt = await CreditSaleReceipt.findOne()
            .sort({ receiptNumber: -1 });

          let receiptNumber = "CSR001";
          if (lastReceipt?.receiptNumber) {
            const num = parseInt(lastReceipt.receiptNumber.replace(/\D/g, ""), 10);
            receiptNumber = `CSR${String(num + 1).padStart(3, "0")}`;
          }

          const creditSaleReceipt = new CreditSaleReceipt({
            receiptNumber,
            financialYear,
            receiptDate: new Date(date),
            customerId,
            customerName: customer.name,
            customerCode: customer.customerCode,
            ledgerAccountId: customer.ledgerAccountId,
            receiptType: "Full",
            invoiceId: invoice._id,
            invoiceNumber,
            invoiceDate: invoice.date,
            invoiceAmount: invoice.totalIncludeVat,
            receiptAmount: 0,
            paymentMode: "Pending",
            status: "Pending",
            notes: `Pending receipt for credit sale invoice ${invoiceNumber}`,
          });

          await creditSaleReceipt.save();
          console.log("Created credit sale receipt tracking:", receiptNumber);

          // Create CustomerReceipt entry for tracking (Unpaid status)
          const lastCustomerRcp = await CustomerReceipt.findOne()
            .sort({ receiptNumber: -1 });

          let customerReceiptNumber = "RCP001";
          if (lastCustomerRcp?.receiptNumber) {
            const num = parseInt(lastCustomerRcp.receiptNumber.replace(/\D/g, ""), 10);
            customerReceiptNumber = `RCP${String(num + 1).padStart(3, "0")}`;
          }

          const customerReceipt = new CustomerReceipt({
            receiptNumber: customerReceiptNumber,
            financialYear,
            receiptDate: new Date(date),
            customerId,
            customerName: customer.name,
            customerCode: customer.customerCode,
            ledgerAccountId: customer.ledgerAccountId,
            receiptType: "Against Invoice",
            invoiceId: invoice._id,
            invoiceNumber,
            invoiceDate: invoice.date,
            invoiceNetAmount: invoice.totalIncludeVat,
            amountPaid: 0,
            previousPaidAmount: 0,
            balanceAmount: invoice.totalIncludeVat,
            paymentMode: "Pending",
            status: "Unpaid",
            narration: `Credit sale invoice ${invoiceNumber}`,
          });

          await customerReceipt.save();
          console.log("Created customer receipt entry:", customerReceiptNumber);

          // Update invoice payment status
          invoice.paymentStatus = "Unpaid";
          await invoice.save();
        }
      } catch (ledgerError) {
        console.error("Error creating ledger entries:", ledgerError);
        // Don't fail invoice creation if ledger creation fails
        // Just log the error for manual reconciliation
      }
    } else if ((paymentType === "Cash" || paymentType === "Bank") && customerId) {
      // Handle Cash Sale with Cash or Bank payment
      try {
        const customer = await Customer.findById(customerId);
        if (customer) {
          console.log(`Creating double-entry ledger for ${paymentType} sale invoice ${invoiceNumber}`);

          // Get or create Sales Revenue account
          let salesAccount = await ChartOfAccounts.findOne({
            accountName: "Sales Revenue",
            isDeleted: false,
          });

          if (!salesAccount) {
            let salesGroup = await AccountGroup.findOne({
              code: "SR",
              isActive: true
            });

            if (!salesGroup) {
              salesGroup = new AccountGroup({
                name: "SALES REVENUE",
                code: "SR",
                description: "Sales Revenue Accounts",
                level: 1,
                type: "INCOME",
                accountCategory: "PROFIT_LOSS",
                nature: "CREDIT",
                allowPosting: true,
                isActive: true
              });
              await salesGroup.save();
            }

            salesAccount = new ChartOfAccounts({
              accountNumber: "SALES-001",
              accountName: "Sales Revenue",
              accountGroupId: salesGroup._id,
              description: "Sales Revenue Account",
              allowPosting: true,
              accountCategory: "PROFIT_LOSS",
              isActive: true,
            });
            await salesAccount.save();
            console.log("Created Sales Revenue account:", salesAccount._id);
          }

          // Get or create Cash/Bank Account based on payment type
          let contraAccountName = paymentType === "Cash" ? "Cash Account" : "Bank Account";
          let contraAccount = await ChartOfAccounts.findOne({
            accountName: contraAccountName,
            isDeleted: false,
          });

          if (!contraAccount) {
            let bankCashGroup = await AccountGroup.findOne({
              code: paymentType === "Cash" ? "CASH" : "BAM",
              isActive: true
            });

            if (!bankCashGroup) {
              const groupName = paymentType === "Cash" ? "CASH ACCOUNTS" : "BANK ACCOUNTS";
              const groupCode = paymentType === "Cash" ? "CASH" : "BAM";
              bankCashGroup = new AccountGroup({
                name: groupName,
                code: groupCode,
                description: `All ${groupName}`,
                level: 1,
                type: "ASSET",
                accountCategory: "BALANCE_SHEET",
                nature: "DEBIT",
                allowPosting: true,
                isActive: true
              });
              await bankCashGroup.save();
            }

            contraAccount = new ChartOfAccounts({
              accountNumber: paymentType === "Cash" ? "CASH-001" : "BANK-001",
              accountName: contraAccountName,
              accountGroupId: bankCashGroup._id,
              description: `Default ${paymentType} Account for Sales`,
              allowPosting: true,
              accountCategory: "BALANCE_SHEET",
              isActive: true,
            });
            await contraAccount.save();
            console.log(`Created ${contraAccountName}:`, contraAccount._id);
          }

          // Debit: Cash/Bank Account (receive payment)
          const debitEntry = new JournalEntry({
            voucherType: "Sales Invoice",
            voucherNumber: invoiceNumber,
            voucherDate: new Date(date),
            financialYear,
            narration: `${paymentType} sale to ${customerName} - Invoice ${invoiceNumber}`,
            accountId: contraAccount._id,
            accountName: contraAccount.accountName,
            debitAmount: invoice.totalIncludeVat,
            creditAmount: 0,
            isPosted: true,
            createdDate: new Date(),
          });

          const savedDebitEntry = await debitEntry.save();
          console.log(`Created debit entry (${contraAccountName}):`, savedDebitEntry._id);

          // Credit: Sales Revenue (record sale)
          const creditEntry = new JournalEntry({
            voucherType: "Sales Invoice",
            voucherNumber: invoiceNumber,
            voucherDate: new Date(date),
            financialYear,
            narration: `${paymentType} sale to ${customerName} - Invoice ${invoiceNumber}`,
            accountId: salesAccount._id,
            accountName: salesAccount.accountName,
            debitAmount: 0,
            creditAmount: invoice.totalIncludeVat,
            isPosted: true,
            createdDate: new Date(),
          });

          const savedCreditEntry = await creditEntry.save();
          console.log("Created credit entry (Sales Revenue):", savedCreditEntry._id);

          // Update invoice payment status to Paid (immediate payment)
          invoice.paymentStatus = "Paid";
          invoice.totalReceived = invoice.totalIncludeVat;
          invoice.lastPaymentDate = new Date();
          await invoice.save();
          console.log(`Invoice marked as Paid for ${paymentType} sale`);
        }
      } catch (ledgerError) {
        console.error("Error creating ledger entries:", ledgerError);
        // Don't fail invoice creation if ledger creation fails
        // Just log the error for manual reconciliation
      }
    }

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      invoice
    });
  } catch (err) {
    console.error('Error creating invoice:', err);
    res.status(400).json({ error: err.message });
  }
};

// Get all Sales Invoices
export const getSalesInvoices = async (req, res) => {
  try {
    const invoices = await SalesInvoice.find()
      .populate('customerId', 'name phone email')
      .sort({ createdDate: -1 });
    
    res.json(invoices);
  } catch (err) {
    console.error('Error fetching invoices:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get Sales Invoice by ID
export const getSalesInvoiceById = async (req, res) => {
  try {
    const invoice = await SalesInvoice.findById(req.params.id)
      .populate('customerId', 'name phone email')
      .populate('items.productId', 'name itemcode barcode price cost');
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (err) {
    console.error('Error fetching invoice:', err);
    res.status(500).json({ error: err.message });
  }
};

// Update Sales Invoice
export const updateSalesInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate required fields
    const { customerName, date, items, financialYear } = req.body;
    
    if (!customerName || !date || !items || items.length === 0 || !financialYear) {
      return res.status(400).json({ 
        error: 'Missing required fields: customerName, date, items, financialYear' 
      });
    }

    // Update with new timestamp
    const updateData = {
      ...req.body,
      updatedDate: new Date().toISOString()
    };

    const invoice = await SalesInvoice.findByIdAndUpdate(
      id,
      updateData,
      { returnDocument: 'after', runValidators: true }
    ).populate('customerId', 'name phone email');

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    console.log("Invoice updated successfully:", id);
    res.json({
      success: true,
      message: 'Invoice updated successfully',
      invoice
    });
  } catch (err) {
    console.error('Error updating invoice:', err);
    res.status(400).json({ error: err.message });
  }
};

// Delete Sales Invoice
export const deleteSalesInvoice = async (req, res) => {
  try {
    const invoice = await SalesInvoice.findByIdAndDelete(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    console.log("Invoice deleted successfully:", req.params.id);
    res.json({ 
      success: true,
      message: 'Invoice deleted successfully' 
    });
  } catch (err) {
    console.error('Error deleting invoice:', err);
    res.status(500).json({ error: err.message });
  }
};
