import JournalEntry from "../../../Models/JournalEntry.js";
import ChartOfAccounts from "../../../Models/ChartOfAccounts.js";

// Generate Voucher Number
const generateVoucherNumber = async (voucherType) => {
  try {
    const prefix = voucherType; // JV, PV, RV, BV
    const lastEntry = await JournalEntry.findOne({ voucherType, isDeleted: false })
      .sort({ createdDate: -1 })
      .lean();

    let nextNumber = 1;
    if (lastEntry && lastEntry.voucherNumber) {
      const numericPart = parseInt(lastEntry.voucherNumber.replace(/\D/g, ''));
      if (!isNaN(numericPart)) {
        nextNumber = numericPart + 1;
      }
    }

    return `${prefix}-${String(nextNumber).padStart(5, '0')}`;
  } catch (err) {
    console.error("Error generating voucher number:", err);
    return `${voucherType}-00001`;
  }
};

// Add Journal Entry
export const addJournalEntry = async (req, res) => {
  try {
    const { voucherType, entryDate, description, referenceNumber, lineItems } = req.body;

    if (!voucherType || !entryDate || !description || !lineItems || lineItems.length === 0) {
      return res.status(400).json({
        message: "Voucher Type, Date, Description, and Line Items are required"
      });
    }

    const validVoucherTypes = ["JV", "PV", "RV", "BV"];
    if (!validVoucherTypes.includes(voucherType)) {
      return res.status(400).json({ message: "Invalid voucher type" });
    }

    // Validate line items and calculate totals
    let totalDebit = 0;
    let totalCredit = 0;

    for (const item of lineItems) {
      if (!item.accountId || (item.debitAmount === 0 && item.creditAmount === 0)) {
        return res.status(400).json({
          message: "Each line item must have an account and either debit or credit amount"
        });
      }

      // Verify account exists
      const account = await ChartOfAccounts.findById(item.accountId);
      if (!account || account.isDeleted) {
        return res.status(400).json({ message: `Invalid account: ${item.accountId}` });
      }

      const debit = Math.round(parseFloat(item.debitAmount || 0) * 100);
      const credit = Math.round(parseFloat(item.creditAmount || 0) * 100);

      totalDebit += debit;
      totalCredit += credit;
    }

    // Check if debit equals credit (fundamental double entry rule)
    if (totalDebit !== totalCredit) {
      return res.status(400).json({
        message: `Debit (${totalDebit / 100}) must equal Credit (${totalCredit / 100}) for balanced entry`
      });
    }

    // Generate voucher number
    const voucherNumber = await generateVoucherNumber(voucherType);

    // Process line items
    const processedLineItems = lineItems.map(item => ({
      accountId: item.accountId,
      debitAmount: Math.round(parseFloat(item.debitAmount || 0) * 100),
      creditAmount: Math.round(parseFloat(item.creditAmount || 0) * 100),
      description: item.description || ""
    }));

    const journalEntry = new JournalEntry({
      voucherNumber,
      voucherType,
      entryDate,
      description,
      referenceNumber: referenceNumber || "",
      lineItems: processedLineItems,
      totalDebit,
      totalCredit,
      status: "DRAFT"
    });

    await journalEntry.save();
    await journalEntry.populate("lineItems.accountId", "accountNumber accountName");

    res.status(201).json({
      message: "Journal entry added successfully",
      journalEntry
    });
  } catch (err) {
    console.error("Error adding journal entry:", err);
    res.status(500).json({
      message: "Error adding journal entry",
      error: err.message
    });
  }
};

// Get All Journal Entries
export const getJournalEntries = async (req, res) => {
  try {
    const { voucherType, status, startDate, endDate } = req.query;

    let query = { isDeleted: false };
    if (voucherType) query.voucherType = voucherType;
    if (status) query.status = status;
    if (startDate && endDate) {
      query.entryDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const entries = await JournalEntry.find(query)
      .populate("lineItems.accountId", "accountNumber accountName")
      .sort({ entryDate: -1, createdDate: -1 });

    res.status(200).json({
      message: "Journal entries fetched successfully",
      journalEntries: entries
    });
  } catch (err) {
    console.error("Error fetching journal entries:", err);
    res.status(500).json({
      message: "Error fetching journal entries",
      error: err.message
    });
  }
};

// Get Journal Entry by ID
export const getJournalEntryById = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await JournalEntry.findById(id)
      .populate("lineItems.accountId", "accountNumber accountName");

    if (!entry || entry.isDeleted) {
      return res.status(404).json({ message: "Journal entry not found" });
    }

    res.status(200).json({
      message: "Journal entry fetched successfully",
      journalEntry: entry
    });
  } catch (err) {
    console.error("Error fetching journal entry:", err);
    res.status(500).json({
      message: "Error fetching journal entry",
      error: err.message
    });
  }
};

// Update Journal Entry (only draft entries)
export const updateJournalEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, referenceNumber, lineItems } = req.body;

    const entry = await JournalEntry.findById(id);

    if (!entry || entry.isDeleted) {
      return res.status(404).json({ message: "Journal entry not found" });
    }

    if (entry.status !== "DRAFT") {
      return res.status(400).json({ message: "Only draft entries can be modified" });
    }

    if (description) entry.description = description;
    if (referenceNumber) entry.referenceNumber = referenceNumber;

    if (lineItems && lineItems.length > 0) {
      // Validate and process new line items
      let totalDebit = 0;
      let totalCredit = 0;

      for (const item of lineItems) {
        if (!item.accountId || (item.debitAmount === 0 && item.creditAmount === 0)) {
          return res.status(400).json({
            message: "Each line item must have an account and either debit or credit amount"
          });
        }

        const account = await ChartOfAccounts.findById(item.accountId);
        if (!account || account.isDeleted) {
          return res.status(400).json({ message: `Invalid account: ${item.accountId}` });
        }

        const debit = Math.round(parseFloat(item.debitAmount || 0) * 100);
        const credit = Math.round(parseFloat(item.creditAmount || 0) * 100);

        totalDebit += debit;
        totalCredit += credit;
      }

      if (totalDebit !== totalCredit) {
        return res.status(400).json({
          message: `Debit (${totalDebit / 100}) must equal Credit (${totalCredit / 100})`
        });
      }

      entry.lineItems = lineItems.map(item => ({
        accountId: item.accountId,
        debitAmount: Math.round(parseFloat(item.debitAmount || 0) * 100),
        creditAmount: Math.round(parseFloat(item.creditAmount || 0) * 100),
        description: item.description || ""
      }));
      entry.totalDebit = totalDebit;
      entry.totalCredit = totalCredit;
    }

    entry.updatedDate = Date.now();
    await entry.save();
    await entry.populate("lineItems.accountId", "accountNumber accountName");

    res.status(200).json({
      message: "Journal entry updated successfully",
      journalEntry: entry
    });
  } catch (err) {
    console.error("Error updating journal entry:", err);
    res.status(500).json({
      message: "Error updating journal entry",
      error: err.message
    });
  }
};

// Post Journal Entry (change status from DRAFT to POSTED)
export const postJournalEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { postedBy } = req.body;

    const entry = await JournalEntry.findById(id);

    if (!entry || entry.isDeleted) {
      return res.status(404).json({ message: "Journal entry not found" });
    }

    if (entry.status === "POSTED") {
      return res.status(400).json({ message: "Entry is already posted" });
    }

    entry.status = "POSTED";
    entry.postedBy = postedBy || "System";
    entry.postedDate = Date.now();

    // Update account balances
    for (const item of entry.lineItems) {
      const account = await ChartOfAccounts.findById(item.accountId);
      if (account) {
        const debitAmount = item.debitAmount || 0;
        const creditAmount = item.creditAmount || 0;

        // Get account group to determine debit/credit nature
        const accountGroup = await (await ChartOfAccounts.findById(item.accountId).populate("accountGroupId")).accountGroupId;
        
        if (accountGroup.nature === "DEBIT") {
          account.currentBalance = (account.currentBalance || 0) + (debitAmount - creditAmount);
        } else {
          account.currentBalance = (account.currentBalance || 0) + (creditAmount - debitAmount);
        }
        
        account.updatedDate = Date.now();
        await account.save();
      }
    }

    await entry.save();
    await entry.populate("lineItems.accountId", "accountNumber accountName");

    res.status(200).json({
      message: "Journal entry posted successfully",
      journalEntry: entry
    });
  } catch (err) {
    console.error("Error posting journal entry:", err);
    res.status(500).json({
      message: "Error posting journal entry",
      error: err.message
    });
  }
};

// Delete Journal Entry (Soft Delete)
export const deleteJournalEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await JournalEntry.findById(id);

    if (!entry || entry.isDeleted) {
      return res.status(404).json({ message: "Journal entry not found" });
    }

    if (entry.status === "POSTED") {
      return res.status(400).json({ message: "Cannot delete posted entries. Reverse them instead." });
    }

    entry.isDeleted = true;
    entry.deletedAt = Date.now();
    await entry.save();

    res.status(200).json({
      message: "Journal entry deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting journal entry:", err);
    res.status(500).json({
      message: "Error deleting journal entry",
      error: err.message
    });
  }
};

// Reverse Journal Entry (for posted entries)
export const reverseJournalEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const originalEntry = await JournalEntry.findById(id);

    if (!originalEntry || originalEntry.isDeleted) {
      return res.status(404).json({ message: "Journal entry not found" });
    }

    if (originalEntry.status !== "POSTED") {
      return res.status(400).json({ message: "Only posted entries can be reversed" });
    }

    // Create reversing entry
    const reversingLineItems = originalEntry.lineItems.map(item => ({
      accountId: item.accountId,
      debitAmount: item.creditAmount,
      creditAmount: item.debitAmount,
      description: `Reversal of ${item.description || originalEntry.voucherNumber}`
    }));

    const voucherNumber = await generateVoucherNumber(originalEntry.voucherType);

    const reversingEntry = new JournalEntry({
      voucherNumber,
      voucherType: originalEntry.voucherType,
      entryDate: Date.now(),
      description: `Reversal of ${originalEntry.voucherNumber} - ${reason || 'No reason provided'}`,
      referenceNumber: originalEntry.voucherNumber,
      lineItems: reversingLineItems,
      totalDebit: originalEntry.totalCredit,
      totalCredit: originalEntry.totalDebit,
      status: "POSTED",
      postedBy: "System",
      postedDate: Date.now()
    });

    await reversingEntry.save();

    // Update original entry status
    originalEntry.status = "REVERSE";
    await originalEntry.save();

    // Reverse account balances
    for (const item of reversingLineItems) {
      const account = await ChartOfAccounts.findById(item.accountId);
      if (account) {
        const debitAmount = item.debitAmount || 0;
        const creditAmount = item.creditAmount || 0;
        
        const accountGroup = await (await ChartOfAccounts.findById(item.accountId).populate("accountGroupId")).accountGroupId;
        
        if (accountGroup.nature === "DEBIT") {
          account.currentBalance = (account.currentBalance || 0) + (debitAmount - creditAmount);
        } else {
          account.currentBalance = (account.currentBalance || 0) + (creditAmount - debitAmount);
        }
        
        account.updatedDate = Date.now();
        await account.save();
      }
    }

    await reversingEntry.populate("lineItems.accountId", "accountNumber accountName");

    res.status(201).json({
      message: "Journal entry reversed successfully",
      reversingEntry
    });
  } catch (err) {
    console.error("Error reversing journal entry:", err);
    res.status(500).json({
      message: "Error reversing journal entry",
      error: err.message
    });
  }
};

// Get Account Ledger
export const getAccountLedger = async (req, res) => {
  try {
    const { accountId, startDate, endDate } = req.query;

    if (!accountId) {
      return res.status(400).json({ message: "Account ID is required" });
    }

    const account = await ChartOfAccounts.findById(accountId);
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    let query = {
      isDeleted: false,
      status: "POSTED",
      "lineItems.accountId": accountId
    };

    if (startDate && endDate) {
      query.entryDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const entries = await JournalEntry.find(query)
      .populate("lineItems.accountId", "accountNumber accountName")
      .sort({ entryDate: 1 });

    let balance = account.openingBalance || 0;
    const ledgerEntries = [];

    for (const entry of entries) {
      for (const item of entry.lineItems) {
        if (item.accountId._id.toString() === accountId) {
          const debit = item.debitAmount || 0;
          const credit = item.creditAmount || 0;

          const accountGroup = await (await ChartOfAccounts.findById(item.accountId).populate("accountGroupId")).accountGroupId;
          
          if (accountGroup.nature === "DEBIT") {
            balance += (debit - credit);
          } else {
            balance += (credit - debit);
          }

          ledgerEntries.push({
            date: entry.entryDate,
            voucherNumber: entry.voucherNumber,
            description: entry.description,
            debit,
            credit,
            balance
          });
        }
      }
    }

    res.status(200).json({
      message: "Account ledger fetched successfully",
      account: {
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        openingBalance: account.openingBalance,
        currentBalance: balance
      },
      ledgerEntries
    });
  } catch (err) {
    console.error("Error fetching account ledger:", err);
    res.status(500).json({
      message: "Error fetching account ledger",
      error: err.message
    });
  }
};
