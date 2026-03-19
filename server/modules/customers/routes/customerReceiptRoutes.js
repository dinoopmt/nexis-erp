import express from "express";
import CustomerReceipt from "../../../Models/CustomerReceipt.js";
import SalesInvoice from "../../../Models/Sales/SalesInvoice.js";
import Customer from "../../../Models/Customer.js";
import ChartOfAccounts from "../../../Models/ChartOfAccounts.js";
import AccountGroup from "../../../Models/AccountGroup.js";
import JournalEntry from "../../../Models/JournalEntry.js";
import FinancialYear from "../../../Models/FinancialYear.js";

const router = express.Router();

// ================= CREATE CUSTOMER RECEIPT =================
router.post("/addcustomer-receipt", async (req, res) => {
  try {
    const {
      customerId,
      invoiceId,
      invoiceAllocations: incomingAllocations,
      receiptType,
      amountPaid,
      paymentMode,
      receiptDate,
      financialYear,
      bankName,
      chequeNumber,
      chequeDate,
      referenceNumber,
      narration,
      appliedAdvanceId,
      advanceAmountApplied,
    } = req.body;

    // Use incoming allocations or will be built based on receipt type
    let invoiceAllocations = incomingAllocations || [];

    // Get next receipt number
    const lastReceipt = await CustomerReceipt.findOne()
      .sort({ receiptNumber: -1 });

    let newReceiptNumber = "RCP001";
    if (lastReceipt?.receiptNumber) {
      const num = parseInt(lastReceipt.receiptNumber.replace(/\D/g, ""), 10);
      newReceiptNumber = `RCP${String(num + 1).padStart(3, "0")}`;
    }

    // Get customer details
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    let invoiceData = null;
    let calculatedStatus = "Advance";
    let balanceAmount = 0;
    let invoiceNetAmount = 0;
    let previousPaidAmount = 0;
    
    // Calculate total payment including advance
    const totalPayment = amountPaid + (advanceAmountApplied || 0);

    // Validate Against Invoice receipt type
    if (receiptType === "Against Invoice") {
      // Handle multiple invoices via invoiceAllocations
      if (invoiceAllocations && invoiceAllocations.length > 0) {
        // Multiple invoice receipt
        console.log(`Creating receipt for ${invoiceAllocations.length} invoices`);
        
        // Validate allocations
        let totalAllocation = 0;
        for (const allocation of invoiceAllocations) {
          const invoice = await SalesInvoice.findById(allocation.invoiceId);
          if (!invoice) {
            return res.status(404).json({ 
              message: `Invoice ${allocation.invoiceNumber} not found` 
            });
          }
          
          if (invoice.customerId.toString() !== customerId) {
            return res.status(400).json({ 
              message: `Invoice ${allocation.invoiceNumber} does not belong to this customer` 
            });
          }
          
          totalAllocation += allocation.allocatedAmount;
        }

        // Validate total allocation equals total payment (cash + advance)
        if (Math.abs(totalAllocation - totalPayment) > 0.01) {
          return res.status(400).json({ 
            message: `Total allocation (${totalAllocation}) must equal total payment (${totalPayment})` 
          });
        }

        calculatedStatus = "Partial"; // Multi-invoice is partial by nature
      } else if (invoiceId) {
        // Single invoice receipt (backward compatibility)
        invoiceData = await SalesInvoice.findById(invoiceId);
        if (!invoiceData) {
          return res.status(404).json({ message: "Invoice not found" });
        }

        if (invoiceData.customerId.toString() !== customerId) {
          return res.status(400).json({ message: "Invoice does not belong to this customer" });
        }

        invoiceNetAmount = invoiceData.totalIncludeVat;

        // Get previous receipts for this invoice
        const previousReceipts = await CustomerReceipt.find({
          invoiceId,
          isDeleted: false,
          status: { $ne: "Cancelled" },
        });

        // Include both direct payments and advance amounts
        previousPaidAmount = previousReceipts.reduce((sum, r) => {
          return sum + r.amountPaid + (r.advanceAmountApplied || 0);
        }, 0);
        const totalPaid = previousPaidAmount + totalPayment;

        // Validate amount
        if (totalPayment <= 0) {
          return res.status(400).json({ message: "Amount paid must be greater than 0" });
        }

        if (totalPaid > invoiceNetAmount) {
          return res.status(400).json({
            message: `Total payment (${totalPaid}) cannot exceed invoice amount (${invoiceNetAmount})`,
          });
        }

        balanceAmount = invoiceNetAmount - totalPaid;

        // Determine status
        if (totalPaid === invoiceNetAmount) {
          calculatedStatus = "Full";
        } else if (totalPaid > 0) {
          calculatedStatus = "Partial";
        }
      } else {
        return res.status(400).json({ message: "Invoice ID or allocations required for Against Invoice receipts" });
      }
    } else if (receiptType === "On Account") {
      // On Account receipt - system automatically assigns outstanding invoices using FIFO
      calculatedStatus = "Advance";
      
      // Find outstanding invoices for this customer (sorted by invoiceDate - oldest first for FIFO)
      const outstandingInvoices = await SalesInvoice.find({
        customerId: customerId,
        isDeleted: false,
      }).sort({ invoiceDate: 1 });
      
      // Auto-allocate amount to invoices using FIFO
      let remainingAmount = amountPaid;
      const autoInvoiceAllocations = [];
      
      for (const invoice of outstandingInvoices) {
        if (remainingAmount <= 0) break;
        
        // Get total received for this invoice
        const previousReceipts = await CustomerReceipt.find({
          customerId: customerId,
          invoiceId: invoice._id,
          isDeleted: false,
          status: { $ne: "Cancelled" }
        });
        
        const previousPaid = previousReceipts.reduce((sum, r) => sum + r.amountPaid, 0);
        const invoiceBalance = invoice.totalIncludeVat - previousPaid;
        
        if (invoiceBalance > 0) {
          const allocatedAmount = Math.min(remainingAmount, invoiceBalance);
          autoInvoiceAllocations.push({
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            invoiceDate: invoice.invoiceDate,
            invoiceAmount: invoice.totalIncludeVat,
            allocatedAmount: parseFloat(allocatedAmount.toFixed(2))
          });
          
          remainingAmount = parseFloat((remainingAmount - allocatedAmount).toFixed(2));
        }
      }
      
      // Balance = amount not allocated (available for future use as advance)
      balanceAmount = remainingAmount;
      
      // Set the auto-allocations
      if (autoInvoiceAllocations.length > 0) {
        invoiceAllocations = autoInvoiceAllocations;
      }
    } else if (receiptType === "Advance") {
      // Advance receipt - full amount available for later application to invoices
      balanceAmount = amountPaid; // Full advance amount can be used later
      calculatedStatus = "Advance";
      console.log(`Creating Advance receipt with balance: ₹${balanceAmount}`);
    }

    // Create customer receipt
    const customerReceipt = new CustomerReceipt({
      receiptNumber: newReceiptNumber,
      financialYear,
      receiptDate: new Date(receiptDate),
      customerId,
      customerName: customer.name,
      customerCode: customer.customerCode,
      ledgerAccountId: customer.ledgerAccountId,
      receiptType,
      invoiceId: receiptType === "Against Invoice" ? invoiceId : null,
      invoiceNumber: invoiceData?.invoiceNumber,
      invoiceDate: invoiceData?.date,
      invoiceNetAmount,
      invoiceAllocations: invoiceAllocations || [],
      amountPaid,
      previousPaidAmount,
      balanceAmount,
      paymentMode,
      bankName,
      chequeNumber,
      chequeDate,
      referenceNumber,
      narration,
      status: calculatedStatus,
      appliedAdvanceId: appliedAdvanceId || null,
      advanceAmountApplied: advanceAmountApplied || 0,
    });

    await customerReceipt.save();
    console.log(`Customer receipt created: ${newReceiptNumber}`);

    // Handle advance application
    if (appliedAdvanceId && advanceAmountApplied > 0) {
      try {
        const advanceReceipt = await CustomerReceipt.findById(appliedAdvanceId);
        if (advanceReceipt) {
          const newBalance = Math.max(0, advanceReceipt.balanceAmount - advanceAmountApplied);
          await CustomerReceipt.findByIdAndUpdate(appliedAdvanceId, {
            balanceAmount: newBalance,
            updatedDate: new Date(),
          });
          console.log(`Advance ${advanceReceipt.receiptNumber} reduced by ₹${advanceAmountApplied}. New balance: ₹${newBalance}`);
        }
      } catch (advanceError) {
        console.error("Error processing advance application:", advanceError);
        // Don't fail the entire receipt creation
      }
    }    // Create double-entry ledger entries
    if (customer.ledgerAccountId) {
      try {
        console.log(`Creating ledger entries for receipt ${newReceiptNumber}`);

        // Determine debit account based on payment mode
        let debitAccountName = paymentMode === "Bank" ? "Bank Account" : "Cash Account";
        let debitAccount = await ChartOfAccounts.findOne({
          accountName: debitAccountName,
          isDeleted: false,
        });

        if (!debitAccount) {
          // Find or create the Bank/Cash account group
          let bankCashGroup = await AccountGroup.findOne({
            code: paymentMode === "Bank" ? "BAM" : "CASH",
            isActive: true
          });

          if (!bankCashGroup) {
            const groupName = paymentMode === "Bank" ? "BANK ACCOUNTS" : "CASH ACCOUNTS";
            const groupCode = paymentMode === "Bank" ? "BAM" : "CASH";
            
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

          debitAccount = new ChartOfAccounts({
            accountNumber: paymentMode === "Bank" ? "BANK-001" : "CASH-001",
            accountName: debitAccountName,
            accountGroupId: bankCashGroup._id,
            description: `Default ${paymentMode} Account`,
            allowPosting: true,
            accountCategory: "BALANCE_SHEET",
            isActive: true,
          });
          await debitAccount.save();
        }

        // Fetch FinancialYear to get its ID
        const financialYearDoc = await FinancialYear.findOne({ year: financialYear });
        if (!financialYearDoc) {
          console.error(`Financial Year ${financialYear} not found, skipping ledger entries`);
        } else {
          // Debit: Bank/Cash (receive payment)
          const debitEntry = new JournalEntry({
            voucherNumber: newReceiptNumber,
            voucherType: "RV", // Receipt Voucher
            entryDate: new Date(receiptDate),
            financialYearId: financialYearDoc._id,
            description: narration || `Receipt from ${customer.name} - ${receiptType}`,
            lineItems: [
              {
                accountId: debitAccount._id,
                debitAmount: Math.round(amountPaid * 100), // Store in cents
                creditAmount: 0,
                description: `Bank/Cash receipt - ${receiptType}`
              }
            ],
            status: "POSTED",
            postedBy: "SYSTEM",
            postedDate: new Date(),
          });

          const savedDebitEntry = await debitEntry.save();
          customerReceipt.debitEntryId = savedDebitEntry._id;
          console.log("Created debit entry:", savedDebitEntry._id);

          // Credit: Customer Ledger Account (reduce receivable)
          const creditEntry = new JournalEntry({
            voucherNumber: newReceiptNumber,
            voucherType: "RV", // Receipt Voucher
            entryDate: new Date(receiptDate),
            financialYearId: financialYearDoc._id,
            description: narration || `Receipt from ${customer.name} - ${receiptType}`,
            lineItems: [
              {
                accountId: customer.ledgerAccountId,
                debitAmount: 0,
                creditAmount: Math.round(amountPaid * 100), // Store in cents
                description: `Payment received - ${receiptType}`
              }
            ],
            status: "POSTED",
            postedBy: "SYSTEM",
            postedDate: new Date(),
          });

          const savedCreditEntry = await creditEntry.save();
          customerReceipt.creditEntryId = savedCreditEntry._id;

          await customerReceipt.save();
          console.log("Created credit entry:", savedCreditEntry._id);
        }
      } catch (ledgerError) {
        console.error("Error creating ledger entries:", ledgerError);
        // Don't fail receipt creation if ledger fails
      }
    }

    // Update invoice payment status if Against Invoice
    if (receiptType === "Against Invoice") {
      // Handle multiple invoice allocations
      if (invoiceAllocations && invoiceAllocations.length > 0) {
        for (const allocation of invoiceAllocations) {
          const invoice = await SalesInvoice.findById(allocation.invoiceId);
          if (invoice) {
            const newTotalReceived = (invoice.totalReceived || 0) + allocation.allocatedAmount;
            
            let newPaymentStatus = "Unpaid";
            if (newTotalReceived >= invoice.totalIncludeVat) {
              newPaymentStatus = "Paid";
            } else if (newTotalReceived > 0) {
              newPaymentStatus = "Partial";
            }

            await SalesInvoice.findByIdAndUpdate(allocation.invoiceId, {
              totalReceived: newTotalReceived,
              paymentStatus: newPaymentStatus,
              lastPaymentDate: new Date(receiptDate),
              updatedDate: new Date(),
            });

            console.log(`Invoice ${allocation.invoiceNumber} updated - Status: ${newPaymentStatus}, Received: ${newTotalReceived}`);
          }
        }
      } else if (invoiceData) {
        // Handle single invoice (backward compatibility)
        const updatedInvoice = await SalesInvoice.findById(invoiceId);
        const newTotalReceived = (updatedInvoice.totalReceived || 0) + amountPaid;

        let newPaymentStatus = "Unpaid";
        if (newTotalReceived >= invoiceData.totalIncludeVat) {
          newPaymentStatus = "Paid";
        } else if (newTotalReceived > 0) {
          newPaymentStatus = "Partial";
        }

        await SalesInvoice.findByIdAndUpdate(invoiceId, {
          totalReceived: newTotalReceived,
          paymentStatus: newPaymentStatus,
          lastPaymentDate: new Date(receiptDate),
          updatedDate: new Date(),
        });

        console.log(`Invoice ${invoiceData.invoiceNumber} updated - Status: ${newPaymentStatus}`);
      }
    } else if (receiptType === "On Account" && invoiceAllocations && invoiceAllocations.length > 0) {
      // Update invoice payment status for On Account receipts with auto-allocations
      for (const allocation of invoiceAllocations) {
        const invoice = await SalesInvoice.findById(allocation.invoiceId);
        if (invoice) {
          const newTotalReceived = (invoice.totalReceived || 0) + allocation.allocatedAmount;
          
          let newPaymentStatus = "Unpaid";
          if (newTotalReceived >= invoice.totalIncludeVat) {
            newPaymentStatus = "Paid";
          } else if (newTotalReceived > 0) {
            newPaymentStatus = "Partial";
          }

          await SalesInvoice.findByIdAndUpdate(allocation.invoiceId, {
            totalReceived: newTotalReceived,
            paymentStatus: newPaymentStatus,
            lastPaymentDate: new Date(receiptDate),
            updatedDate: new Date(),
          });

          console.log(`On Account: Invoice ${allocation.invoiceNumber} updated - Status: ${newPaymentStatus}, Received: ${newTotalReceived}`);
        }
      }
    }

    res.status(201).json({
      message: "Customer receipt created successfully",
      receipt: customerReceipt,
    });
  } catch (error) {
    console.error("Error creating customer receipt:", error);
    res.status(500).json({ message: error.message });
  }
});

// ================= GET ALL CUSTOMER RECEIPTS =================
router.get("/getcustomer-receipts", async (req, res) => {
  try {
    const { customerId, invoiceId, receiptType, page = 1, limit = 20 } = req.query;

    const filter = { isDeleted: false };
    if (customerId) filter.customerId = customerId;
    if (invoiceId) filter.invoiceId = invoiceId;
    if (receiptType) filter.receiptType = receiptType;

    const skip = (page - 1) * limit;

    const receipts = await CustomerReceipt.find(filter)
      .populate("customerId", "name customerCode phone")
      .populate("invoiceId", "invoiceNumber totalIncludeVat date")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ receiptDate: -1 });

    const total = await CustomerReceipt.countDocuments(filter);

    res.status(200).json({
      receipts,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching receipts:", error);
    res.status(500).json({ message: error.message });
  }
});

// ================= GET CUSTOMER RECEIPT BY ID =================
router.get("/getcustomer-receipt/:id", async (req, res) => {
  try {
    const receipt = await CustomerReceipt.findById(req.params.id)
      .populate("customerId")
      .populate("invoiceId")
      .populate("ledgerAccountId")
      .populate("debitEntryId")
      .populate("creditEntryId");

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    res.status(200).json(receipt);
  } catch (error) {
    console.error("Error fetching receipt:", error);
    res.status(500).json({ message: error.message });
  }
});

// ================= GET RECEIPTS BY INVOICE =================
router.get("/getinvoice-receipts/:invoiceId", async (req, res) => {
  try {
    const receipts = await CustomerReceipt.find({
      invoiceId: req.params.invoiceId,
      isDeleted: false,
    })
      .populate("customerId", "name customerCode")
      .sort({ receiptDate: -1 });

    const invoice = await SalesInvoice.findById(req.params.invoiceId);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const totalPaid = receipts.reduce((sum, r) => sum + r.amountPaid, 0);
    const balance = invoice.totalIncludeVat - totalPaid;

    res.status(200).json({
      invoiceNumber: invoice.invoiceNumber,
      invoiceAmount: invoice.totalIncludeVat,
      totalPaid,
      balance,
      receipts,
    });
  } catch (error) {
    console.error("Error fetching invoice receipts:", error);
    res.status(500).json({ message: error.message });
  }
});

// ================= GET CUSTOMER OUTSTANDING =================
router.get("/getcustomer-outstanding/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;

    // Get all unpaid/partial invoices
    const invoices = await SalesInvoice.find({
      customerId,
      paymentStatus: { $in: ["Unpaid", "Partial"] },
      isDeleted: false,
    }).sort({ date: -1 });

    const outstanding = invoices.map((inv) => ({
      invoiceId: inv._id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.date,
      invoiceAmount: inv.totalIncludeVat,
      paid: inv.totalReceived || 0,
      balance: inv.totalIncludeVat - (inv.totalReceived || 0),
      status: inv.paymentStatus,
    }));

    const totalOutstanding = outstanding.reduce((sum, inv) => sum + inv.balance, 0);

    res.status(200).json({
      customerId,
      outstanding,
      totalOutstanding,
      invoiceCount: invoices.length,
    });
  } catch (error) {
    console.error("Error fetching customer outstanding:", error);
    res.status(500).json({ message: error.message });
  }
});

// ================= UPDATE RECEIPT STATUS =================
router.put("/updatereceipt-status/:id", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Advance", "Partial", "Full", "Paid"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const receipt = await CustomerReceipt.findByIdAndUpdate(
      req.params.id,
      { status, updatedDate: new Date() },
      { returnDocument: "after" }
    );

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    res.status(200).json({
      message: "Receipt status updated",
      receipt,
    });
  } catch (error) {
    console.error("Error updating receipt:", error);
    res.status(500).json({ message: error.message });
  }
});

// ================= DELETE RECEIPT (SOFT DELETE) =================
router.delete("/deletecustomer-receipt/:id", async (req, res) => {
  try {
    const receipt = await CustomerReceipt.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        updatedDate: new Date(),
      },
      { returnDocument: "after" }
    );

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    res.status(200).json({
      message: "Receipt deleted",
      receipt,
    });
  } catch (error) {
    console.error("Error deleting receipt:", error);
    res.status(500).json({ message: error.message });
  }
});

// ================= GET CUSTOMER ADVANCES (FOR AUTO-ADJUSTMENT) =================
router.get("/getcustomer-advances/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;

    // Get all Open Account/Advance receipts that haven't been fully adjusted
    const advances = await CustomerReceipt.find({
      customerId,
      receiptType: { $in: ["On Account", "Advance"] },
      isDeleted: false,
      $expr: { $gt: ["$balanceAmount", 0] }, // Has remaining balance to apply
    })
      .populate("customerId", "name customerCode")
      .sort({ receiptDate: 1 }); // FIFO - apply oldest first

    const totalAvailableAdvance = advances.reduce((sum, adv) => sum + adv.balanceAmount, 0);

    res.status(200).json({
      customerId,
      advances,
      totalAvailableAdvance,
      advanceCount: advances.length,
    });
  } catch (error) {
    console.error("Error fetching customer advances:", error);
    res.status(500).json({ message: error.message });
  }
});

// ================= APPLY ADVANCES TO NEW INVOICE =================
router.post("/apply-advances-to-invoice/:invoiceId", async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await SalesInvoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const customer = await Customer.findById(invoice.customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Get available advances for this customer
    const advances = await CustomerReceipt.find({
      customerId: invoice.customerId,
      receiptType: { $in: ["On Account", "Advance"] },
      isDeleted: false,
      $expr: { $gt: ["$balanceAmount", 0] },
    }).sort({ receiptDate: 1 }); // FIFO order

    let totalApplied = 0;
    const appliedAdvances = [];
    let invoiceRemainder = invoice.totalIncludeVat - (invoice.totalReceived || 0);

    // Apply advances in FIFO order
    for (const advance of advances) {
      if (invoiceRemainder <= 0) break;

      const applyAmount = Math.min(advance.balanceAmount, invoiceRemainder);

      // Create receipt entry linking advance to invoice
      const lastReceipt = await CustomerReceipt.findOne()
        .sort({ receiptNumber: -1 });

      let newReceiptNumber = "RCP001";
      if (lastReceipt?.receiptNumber) {
        const num = parseInt(lastReceipt.receiptNumber.replace(/\D/g, ""), 10);
        newReceiptNumber = `RCP${String(num + 1).padStart(3, "0")}`;
      }

      const appliedReceipt = new CustomerReceipt({
        receiptNumber: newReceiptNumber,
        financialYear: invoice.financialYear,
        receiptDate: new Date(),
        customerId: invoice.customerId,
        customerName: customer.name,
        customerCode: customer.customerCode,
        ledgerAccountId: customer.ledgerAccountId,
        receiptType: "Against Invoice",
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.date,
        invoiceNetAmount: invoice.totalIncludeVat,
        amountPaid: applyAmount,
        previousPaidAmount: invoice.totalReceived || 0,
        balanceAmount: invoiceRemainder - applyAmount,
        paymentMode: "Advance Applied",
        status: invoiceRemainder - applyAmount === 0 ? "Full" : "Partial",
        narration: `Advance auto-applied from receipt ${advance.receiptNumber}`,
      });

      await appliedReceipt.save();
      appliedAdvances.push({
        advanceReceiptId: advance._id,
        advanceReceiptNumber: advance.receiptNumber,
        appliedAmount: applyAmount,
        newReceiptId: appliedReceipt._id,
      });

      // Update original advance balance
      advance.balanceAmount -= applyAmount;
      await advance.save();

      // Accumulate totals
      totalApplied += applyAmount;
      invoiceRemainder -= applyAmount;

      console.log(`Applied ${applyAmount} from advance ${advance.receiptNumber} to invoice ${invoice.invoiceNumber}`);
    }

    // Update invoice if any advances were applied
    if (totalApplied > 0) {
      const newTotalReceived = (invoice.totalReceived || 0) + totalApplied;
      let newPaymentStatus = "Unpaid";

      if (newTotalReceived >= invoice.totalIncludeVat) {
        newPaymentStatus = "Paid";
      } else if (newTotalReceived > 0) {
        newPaymentStatus = "Partial";
      }

      await SalesInvoice.findByIdAndUpdate(invoiceId, {
        totalReceived: newTotalReceived,
        paymentStatus: newPaymentStatus,
        lastPaymentDate: new Date(),
        updatedDate: new Date(),
      });

      console.log(`Invoice ${invoice.invoiceNumber} - Advances applied: ${totalApplied}, New Status: ${newPaymentStatus}`);
    }

    res.status(200).json({
      message: totalApplied > 0 ? "Advances auto-applied successfully" : "No advances available to apply",
      invoiceId,
      totalApplied,
      appliedAdvances,
      invoiceStatus: invoice.paymentStatus,
    });
  } catch (error) {
    console.error("Error applying advances:", error);
    res.status(500).json({ message: error.message });
  }
});

// ================= REVERSE RECEIPT =================
router.post("/reverse-receipt/:id", async (req, res) => {
  try {
    const { reversalReason } = req.body;

    const receipt = await CustomerReceipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    if (receipt.isDeleted) {
      return res.status(400).json({ message: "Cannot reverse a deleted receipt" });
    }

    if (receipt.status === "Reversed") {
      return res.status(400).json({ message: "Receipt is already reversed" });
    }

    console.log(`Reversing receipt ${receipt.receiptNumber}`);

    // Create reversal journal entries (opposite of original)
    if (receipt.debitEntryId && receipt.creditEntryId) {
      try {
        // Create reversal debit entry (reverse the credit)
        const reversalDebitEntry = new JournalEntry({
          voucherType: "Receipt Reversal",
          voucherNumber: `${receipt.receiptNumber}-REV`,
          voucherDate: new Date(),
          financialYear: receipt.financialYear,
          narration: `Reversal of receipt ${receipt.receiptNumber} - ${receipt.customerName}${reversalReason ? ` - Reason: ${reversalReason}` : ""}`,
          accountId: receipt.creditEntryId ? (
            await JournalEntry.findById(receipt.creditEntryId)
          ).accountId : null,
          accountName: receipt.customerName,
          debitAmount: receipt.amountPaid,
          creditAmount: 0,
          isPosted: true,
          createdDate: new Date(),
        });

        const savedReversalDebit = await reversalDebitEntry.save();

        // Create reversal credit entry (reverse the debit)
        const reversalCreditEntry = new JournalEntry({
          voucherType: "Receipt Reversal",
          voucherNumber: `${receipt.receiptNumber}-REV`,
          voucherDate: new Date(),
          financialYear: receipt.financialYear,
          narration: `Reversal of receipt ${receipt.receiptNumber} - ${receipt.customerName}${reversalReason ? ` - Reason: ${reversalReason}` : ""}`,
          accountId: receipt.debitEntryId ? (
            await JournalEntry.findById(receipt.debitEntryId)
          ).accountId : null,
          accountName: `Reversal ${receipt.paymentMode}`,
          debitAmount: 0,
          creditAmount: receipt.amountPaid,
          isPosted: true,
          createdDate: new Date(),
        });

        const savedReversalCredit = await reversalCreditEntry.save();

        console.log(`Created reversal journal entries: ${savedReversalDebit._id}, ${savedReversalCredit._id}`);

        // Update receipt status
        receipt.status = "Reversed";
        receipt.reversalReason = reversalReason || null;
        receipt.reversalDate = new Date();
        receipt.reversalDebitEntryId = savedReversalDebit._id;
        receipt.reversalCreditEntryId = savedReversalCredit._id;
        receipt.updatedDate = new Date();
        await receipt.save();

        // Update invoice payment status if this was against an invoice
        if (receipt.invoiceId) {
          const invoice = await SalesInvoice.findById(receipt.invoiceId);
          if (invoice) {
            // Recalculate total received from all non-reversed receipts
            const receipts = await CustomerReceipt.find({
              invoiceId: receipt.invoiceId,
              isDeleted: false,
              status: { $ne: "Reversed" },
            });

            const newTotalReceived = receipts.reduce((sum, r) => sum + r.amountPaid, 0);
            let newPaymentStatus = "Unpaid";

            if (newTotalReceived >= invoice.totalIncludeVat) {
              newPaymentStatus = "Paid";
            } else if (newTotalReceived > 0) {
              newPaymentStatus = "Partial";
            }

            await SalesInvoice.findByIdAndUpdate(receipt.invoiceId, {
              totalReceived: newTotalReceived,
              paymentStatus: newPaymentStatus,
              updatedDate: new Date(),
            });

            console.log(`Invoice ${invoice.invoiceNumber} updated - New Status: ${newPaymentStatus}, Total Received: ${newTotalReceived}`);
          }
        }

        res.status(200).json({
          message: "Receipt reversed successfully",
          receipt,
          reversalEntries: {
            debitId: savedReversalDebit._id,
            creditId: savedReversalCredit._id,
          },
        });
      } catch (journalError) {
        console.error("Error creating reversal journal entries:", journalError);
        res.status(500).json({ message: "Failed to create reversal journal entries" });
      }
    } else {
      // No journal entries linked, just mark as reversed
      receipt.status = "Reversed";
      receipt.reversalReason = reversalReason || null;
      receipt.reversalDate = new Date();
      receipt.updatedDate = new Date();
      await receipt.save();

      res.status(200).json({
        message: "Receipt marked as reversed (no journal entries to reverse)",
        receipt,
      });
    }
  } catch (error) {
    console.error("Error reversing receipt:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
