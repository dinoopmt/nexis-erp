import SalesInvoice from '../../../Models/Sales/SalesInvoice.js';
import Counter from '../../../Models/SequenceModel.js';
import Customer from '../../../Models/Customer.js';
import ChartOfAccounts from '../../../Models/ChartOfAccounts.js';
import AccountGroup from '../../../Models/AccountGroup.js';
import JournalEntry from '../../../Models/JournalEntry.js';
import FinancialYear from '../../../Models/FinancialYear.js';
import CreditSaleReceipt from '../../../Models/Sales/CreditSaleReceipt.js';
import CustomerReceipt from '../../../Models/CustomerReceipt.js';

// Auto-generate next invoice number
export const getNextInvoiceNumber = async (req, res) => {
  try {
    const { financialYear } = req.query;
    if (!financialYear) {
      return res.status(400).json({ error: 'Financial year is required' });
    }
    
    // First, ensure the counter exists with lastNumber initialized to 0
    await Counter.findOneAndUpdate(
      { module: 'sales_invoice', financialYear },
      { 
        $setOnInsert: { 
          module: 'sales_invoice',
          financialYear,
          prefix: 'SI',
          lastNumber: 0
        }
      },
      { new: false, upsert: true }
    );
    
    // Now increment and get the new value
    const counter = await Counter.findOneAndUpdate(
      { module: 'sales_invoice', financialYear },
      { $inc: { lastNumber: 1 } },
      { new: true }
    );
    
    const paddedNumber = String(counter.lastNumber).padStart(4, '0');
    const invoiceNumber = `SI/${financialYear}/${paddedNumber}`;
    console.log(`✅ Generated invoice number: ${invoiceNumber} (counter lastNumber: ${counter.lastNumber})`);
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
            // Use findOneAndUpdate with upsert to avoid duplicate key errors
            let salesGroup = await AccountGroup.findOneAndUpdate(
              { name: "SALES REVENUE" },  // Use unique field (name)
              {
                $setOnInsert: {
                  name: "SALES REVENUE",
                  code: "SR",
                  description: "Sales Revenue Accounts",
                  level: 1,
                  type: "INCOME",
                  accountCategory: "PROFIT_LOSS",
                  nature: "CREDIT",
                  allowPosting: true,
                  isActive: true
                }
              },
              { upsert: true, new: true }
            );

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

          // Get financial year for journal entry
          let finYear = null;
          
          // Try 1: Find by yearCode with FY prefix
          finYear = await FinancialYear.findOne({ yearCode: `FY${financialYear}`, status: "OPEN" });
          console.log(`FY lookup 1 (FY${financialYear}):`, finYear ? "Found" : "Not found");
          
          // Try 2: Find by yearCode without prefix
          if (!finYear) {
            finYear = await FinancialYear.findOne({ yearCode: financialYear, status: "OPEN" });
            console.log(`FY lookup 2 (${financialYear}):`, finYear ? "Found" : "Not found");
          }
          
          // Try 3: Find any OPEN financial year
          if (!finYear) {
            finYear = await FinancialYear.findOne({ status: "OPEN" });
            console.log(`FY lookup 3 (any OPEN):`, finYear ? "Found" : "Not found");
          }
          
          // Try 4: Find current financial year
          if (!finYear) {
            finYear = await FinancialYear.findOne({ isCurrent: true });
            console.log(`FY lookup 4 (current):`, finYear ? "Found" : "Not found");
          }
          
          if (!finYear) {
            console.warn(`⚠️ Financial year not found for ${financialYear}. Journal entry creation skipped.`);
          } else {
            try {
              console.log(`✅ Using financial year: ${finYear.yearCode} (${finYear.yearName})`);
              // Generate voucher number for Journal Voucher
              const lastJV = await JournalEntry.findOne({ voucherType: "JV" })
                .sort({ createdDate: -1 }).lean();
              let voucherNum = "JV-00001";
              if (lastJV?.voucherNumber) {
                const num = parseInt(lastJV.voucherNumber.replace(/\D/g, ''));
                voucherNum = `JV-${String(num + 1).padStart(5, '0')}`;
              }

              // Create double-entry journal entry with line items
              const journalEntry = new JournalEntry({
                voucherNumber: voucherNum,
                voucherType: "JV",  // Journal Voucher
                entryDate: new Date(date),
                financialYearId: finYear._id,
                description: `Credit sale invoice ${invoiceNumber} to ${customerName}`,
                referenceNumber: invoiceNumber,
                lineItems: [
                  {
                    accountId: customer.ledgerAccountId,  // Sundry Debtors
                    debitAmount: Math.round(invoice.totalIncludeVat * 100),
                    creditAmount: 0,
                    description: `Credit sale to ${customerName}`
                  },
                  {
                    accountId: salesAccount._id,  // Sales Revenue
                    debitAmount: 0,
                    creditAmount: Math.round(invoice.totalIncludeVat * 100),
                    description: `Sales revenue for invoice ${invoiceNumber}`
                  }
                ],
                totalDebit: Math.round(invoice.totalIncludeVat * 100),
                totalCredit: Math.round(invoice.totalIncludeVat * 100),
                status: "POSTED",
                postedBy: "System",
                postedDate: new Date()
              });
              
              await journalEntry.save();
              console.log("✅ Created credit sale journal entry:", journalEntry._id);
            } catch (jeError) {
              console.warn("⚠️ Failed to create journal entry for credit sale:", jeError.message);
            }
          }

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
            // Use findOneAndUpdate with upsert to avoid duplicate key errors
            let salesGroup = await AccountGroup.findOneAndUpdate(
              { name: "SALES REVENUE" },  // Use unique field (name)
              {
                $setOnInsert: {
                  name: "SALES REVENUE",
                  code: "SR",
                  description: "Sales Revenue Accounts",
                  level: 1,
                  type: "INCOME",
                  accountCategory: "PROFIT_LOSS",
                  nature: "CREDIT",
                  allowPosting: true,
                  isActive: true
                }
              },
              { upsert: true, new: true }
            );

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
            const groupName = paymentType === "Cash" ? "CASH ACCOUNTS" : "BANK ACCOUNTS";
            const groupCode = paymentType === "Cash" ? "CASH" : "BAM";
            
            // Use findOneAndUpdate with upsert to avoid duplicate key errors
            let bankCashGroup = await AccountGroup.findOneAndUpdate(
              { name: groupName },  // Use unique field (name)
              {
                $setOnInsert: {
                  name: groupName,
                  code: groupCode,
                  description: `All ${groupName}`,
                  level: 1,
                  type: "ASSET",
                  accountCategory: "BALANCE_SHEET",
                  nature: "DEBIT",
                  allowPosting: true,
                  isActive: true
                }
              },
              { upsert: true, new: true }
            );

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

          // Get financial year for journal entry
          let finYear = null;
          
          // Try 1: Find by yearCode with FY prefix
          finYear = await FinancialYear.findOne({ yearCode: `FY${financialYear}`, status: "OPEN" });
          console.log(`FY lookup 1 (FY${financialYear}):`, finYear ? "Found" : "Not found");
          
          // Try 2: Find by yearCode without prefix
          if (!finYear) {
            finYear = await FinancialYear.findOne({ yearCode: financialYear, status: "OPEN" });
            console.log(`FY lookup 2 (${financialYear}):`, finYear ? "Found" : "Not found");
          }
          
          // Try 3: Find any OPEN financial year
          if (!finYear) {
            finYear = await FinancialYear.findOne({ status: "OPEN" });
            console.log(`FY lookup 3 (any OPEN):`, finYear ? "Found" : "Not found");
          }
          
          // Try 4: Find current financial year
          if (!finYear) {
            finYear = await FinancialYear.findOne({ isCurrent: true });
            console.log(`FY lookup 4 (current):`, finYear ? "Found" : "Not found");
          }
          
          if (!finYear) {
            console.warn(`⚠️ Financial year not found for ${financialYear}. Journal entry creation skipped.`);
          } else {
            try {
              console.log(`✅ Using financial year: ${finYear.yearCode} (${finYear.yearName})`);
              // Generate voucher number for Journal Voucher
              const lastJV = await JournalEntry.findOne({ voucherType: "JV" })
                .sort({ createdDate: -1 }).lean();
              let voucherNum = "JV-00001";
              if (lastJV?.voucherNumber) {
                const num = parseInt(lastJV.voucherNumber.replace(/\D/g, ''));
                voucherNum = `JV-${String(num + 1).padStart(5, '0')}`;
              }

              // Create double-entry journal entry with line items
              const journalEntry = new JournalEntry({
                voucherNumber: voucherNum,
                voucherType: "JV",  // Journal Voucher
                entryDate: new Date(date),
                financialYearId: finYear._id,
                description: `${paymentType} sale invoice ${invoiceNumber} to ${customerName}`,
                referenceNumber: invoiceNumber,
                lineItems: [
                  {
                    accountId: contraAccount._id,  // Cash/Bank Account
                    debitAmount: Math.round(invoice.totalIncludeVat * 100),
                    creditAmount: 0,
                    description: `${paymentType} received for invoice ${invoiceNumber}`
                  },
                  {
                    accountId: salesAccount._id,  // Sales Revenue
                    debitAmount: 0,
                    creditAmount: Math.round(invoice.totalIncludeVat * 100),
                    description: `Sales revenue for invoice ${invoiceNumber}`
                  }
                ],
                totalDebit: Math.round(invoice.totalIncludeVat * 100),
                totalCredit: Math.round(invoice.totalIncludeVat * 100),
                status: "POSTED",
                postedBy: "System",
                postedDate: new Date()
              });
              
              await journalEntry.save();
              console.log(`✅ Created ${paymentType} sale journal entry:`, journalEntry._id);

              // Update invoice payment status to Paid (immediate payment)
              invoice.paymentStatus = "Paid";
              invoice.totalReceived = invoice.totalIncludeVat;
              invoice.lastPaymentDate = new Date();
              await invoice.save();
              console.log(`✅ Invoice marked as Paid for ${paymentType} sale`);
            } catch (jeError) {
              console.warn(`⚠️ Failed to create journal entry for ${paymentType} sale:`, jeError.message);
              // Still update payment status even if journal entry fails
              invoice.paymentStatus = "Paid";
              invoice.totalReceived = invoice.totalIncludeVat;
              invoice.lastPaymentDate = new Date();
              await invoice.save();
            }
          }
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
