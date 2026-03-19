import express from "express";
import CreditSaleReceipt from "../../../Models/Sales/CreditSaleReceipt.js";
import SalesInvoice from "../../../Models/Sales/SalesInvoice.js";
import Customer from "../../../Models/Customer.js";
import ChartOfAccounts from "../../../Models/ChartOfAccounts.js";
import JournalEntry from "../../../Models/JournalEntry.js";

const router = express.Router();

// ================= CREATE CREDIT SALE RECEIPT =================
router.post("/addcredit-sale-receipt", async (req, res) => {
  try {
    const {
      customerId,
      invoiceId,
      receiptType,
      receiptAmount,
      paymentMode,
      receiptDate,
      financialYear,
      bankName,
      chequeNumber,
      chequeDate,
      referenceNumber,
      notes,
    } = req.body;

    // Get next receipt number
    const lastReceipt = await CreditSaleReceipt.findOne()
      .sort({ receiptNumber: -1 });

    let newReceiptNumber = "CSR001";
    if (lastReceipt?.receiptNumber) {
      const num = parseInt(lastReceipt.receiptNumber.replace(/\D/g, ""), 10);
      newReceiptNumber = `CSR${String(num + 1).padStart(3, "0")}`;
    }

    // Get customer details
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Validate credit sale receipt
    if (receiptType !== "OnAccount") {
      if (!invoiceId) {
        return res.status(400).json({ message: "Invoice ID required for Full/Partial receipts" });
      }

      const invoice = await SalesInvoice.findById(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (invoice.customerId.toString() !== customerId) {
        return res.status(400).json({ message: "Invoice does not belong to this customer" });
      }

      // For Partial receipts, check if amount doesn't exceed outstanding
      if (receiptType === "Partial") {
        const previousReceipts = await CreditSaleReceipt.find({
          invoiceId,
          isDeleted: false,
          status: { $ne: "Cancelled" },
        });

        const previousTotal = previousReceipts.reduce((sum, r) => sum + r.receiptAmount, 0);
        const invoiceTotal = invoice.totalIncludeVat;
        const outstanding = invoiceTotal - previousTotal;

        if (receiptAmount > outstanding) {
          return res.status(400).json({
            message: `Receipt amount cannot exceed outstanding amount of ${outstanding}`,
          });
        }
      } else if (receiptType === "Full") {
        const invoiceTotal = invoice.totalIncludeVat;
        const previousReceipts = await CreditSaleReceipt.find({
          invoiceId,
          isDeleted: false,
          status: { $ne: "Cancelled" },
        });

        const previousTotal = previousReceipts.reduce((sum, r) => sum + r.receiptAmount, 0);

        if (previousTotal > 0) {
          return res.status(400).json({
            message: "Cannot create Full receipt - invoice already has partial payments",
          });
        }

        if (receiptAmount !== invoiceTotal) {
          return res.status(400).json({
            message: `Full receipt amount must equal invoice total of ${invoiceTotal}`,
          });
        }
      }
    }

    // Create credit sale receipt
    const creditSaleReceipt = new CreditSaleReceipt({
      receiptNumber: newReceiptNumber,
      financialYear,
      receiptDate: new Date(receiptDate),
      customerId,
      customerName: customer.name,
      customerCode: customer.customerCode,
      ledgerAccountId: customer.ledgerAccountId,
      receiptType,
      invoiceId: receiptType !== "OnAccount" ? invoiceId : null,
      invoiceNumber: receiptType !== "OnAccount" ? (await SalesInvoice.findById(invoiceId))?.invoiceNumber : null,
      invoiceDate: receiptType !== "OnAccount" ? (await SalesInvoice.findById(invoiceId))?.date : null,
      invoiceAmount: receiptType !== "OnAccount" ? (await SalesInvoice.findById(invoiceId))?.totalIncludeVat : 0,
      receiptAmount,
      paymentMode,
      bankName,
      chequeNumber,
      chequeDate,
      referenceNumber,
      notes,
      status: paymentMode === "Cheque" ? "Pending" : "Cleared",
    });

    await creditSaleReceipt.save();

    // Create double-entry journal entries for the receipt
    if (customer.ledgerAccountId) {
      console.log(`Creating ledger entries for credit sale receipt ${newReceiptNumber}`);

      // Determine the contra account based on payment mode
      let contraAccountName = paymentMode === "Bank" ? "Bank Account" : "Cash Account";
      let contraAccount = await ChartOfAccounts.findOne({
        accountName: contraAccountName,
        isDeleted: false,
      });

      if (!contraAccount) {
        // Create a default Bank/Cash Account if not exists
        const accountGroup = await (
          paymentMode === "Bank"
            ? ChartOfAccounts.findOne({ accountName: "Bank Accounts" })
            : ChartOfAccounts.findOne({ accountName: "Cash Accounts" })
        );

        contraAccount = new ChartOfAccounts({
          accountNumber: paymentMode === "Bank" ? "BANK-001" : "CASH-001",
          accountName: contraAccountName,
          accountGroupId: accountGroup?._id,
          description: `Default ${paymentMode} Account for Receipts`,
          allowPosting: true,
          accountCategory: "BALANCE_SHEET",
          isActive: true,
        });
        await contraAccount.save();
      }

      // Debit: Bank/Cash (receive payment)
      const debitEntry = new JournalEntry({
        voucherType: "Credit Sale Receipt",
        voucherNumber: newReceiptNumber,
        voucherDate: new Date(receiptDate),
        financialYear,
        narration: `Receipt from ${customer.name} - Invoice ${invoiceId ? (await SalesInvoice.findById(invoiceId))?.invoiceNumber : "On Account"}`,
        accountId: contraAccount._id,
        accountName: contraAccount.accountName,
        debitAmount: receiptAmount,
        creditAmount: 0,
        isPosted: true,
        createdDate: new Date(),
      });

      const savedDebitEntry = await debitEntry.save();
      creditSaleReceipt.debitEntryId = savedDebitEntry._id;

      // Credit: Sundry Debtors/Customer Account (reduce receivable)
      const creditEntry = new JournalEntry({
        voucherType: "Credit Sale Receipt",
        voucherNumber: newReceiptNumber,
        voucherDate: new Date(receiptDate),
        financialYear,
        narration: `Receipt from ${customer.name} - Invoice ${invoiceId ? (await SalesInvoice.findById(invoiceId))?.invoiceNumber : "On Account"}`,
        accountId: customer.ledgerAccountId,
        accountName: `${customer.name} (${customer.customerCode})`,
        debitAmount: 0,
        creditAmount: receiptAmount,
        isPosted: true,
        createdDate: new Date(),
      });

      const savedCreditEntry = await creditEntry.save();
      creditSaleReceipt.creditEntryId = savedCreditEntry._id;

      await creditSaleReceipt.save();
      console.log(`Ledger entries created - Debit: ${savedDebitEntry._id}, Credit: ${savedCreditEntry._id}`);
    }

    // Update invoice status if Full receipt
    if (receiptType === "Full" && invoiceId) {
      await SalesInvoice.findByIdAndUpdate(invoiceId, {
        paymentStatus: "Paid",
        updatedDate: new Date(),
      });
    }

    res.status(201).json({
      message: "Credit sale receipt created successfully",
      receipt: creditSaleReceipt,
    });
  } catch (error) {
    console.error("Error creating credit sale receipt:", error);
    res.status(500).json({ message: error.message });
  }
});

// ================= GET ALL CREDIT SALE RECEIPTS =================
router.get("/getcredit-sale-receipts", async (req, res) => {
  try {
    const { customerId, invoiceId, receiptType, page = 1, limit = 10 } = req.query;

    const filter = { isDeleted: false };
    if (customerId) filter.customerId = customerId;
    if (invoiceId) filter.invoiceId = invoiceId;
    if (receiptType) filter.receiptType = receiptType;

    const skip = (page - 1) * limit;

    const receipts = await CreditSaleReceipt.find(filter)
      .populate("customerId", "name customerCode")
      .populate("invoiceId", "invoiceNumber totalIncludeVat")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ receiptDate: -1 });

    const total = await CreditSaleReceipt.countDocuments(filter);

    res.status(200).json({
      receipts,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching credit sale receipts:", error);
    res.status(500).json({ message: error.message });
  }
});

// ================= GET SINGLE CREDIT SALE RECEIPT =================
router.get("/getcredit-sale-receipt/:id", async (req, res) => {
  try {
    const receipt = await CreditSaleReceipt.findById(req.params.id)
      .populate("customerId")
      .populate("invoiceId")
      .populate("debitEntryId")
      .populate("creditEntryId");

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    res.status(200).json(receipt);
  } catch (error) {
    console.error("Error fetching credit sale receipt:", error);
    res.status(500).json({ message: error.message });
  }
});

// ================= UPDATE CREDIT SALE RECEIPT STATUS =================
router.put("/updatecredit-sale-receipt-status/:id", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Pending", "Cleared", "Bounced", "Cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const receipt = await CreditSaleReceipt.findByIdAndUpdate(
      req.params.id,
      { status, updatedDate: new Date() },
      { returnDocument: "after" }
    );

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    res.status(200).json({
      message: "Receipt status updated successfully",
      receipt,
    });
  } catch (error) {
    console.error("Error updating receipt status:", error);
    res.status(500).json({ message: error.message });
  }
});

// ================= DELETE CREDIT SALE RECEIPT (SOFT DELETE) =================
router.delete("/deletecredit-sale-receipt/:id", async (req, res) => {
  try {
    const receipt = await CreditSaleReceipt.findByIdAndUpdate(
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
      message: "Receipt deleted successfully",
      receipt,
    });
  } catch (error) {
    console.error("Error deleting receipt:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
