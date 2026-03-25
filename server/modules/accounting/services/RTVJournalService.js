import JournalEntry from "../../../Models/JournalEntry.js";
import ChartOfAccounts from "../../../Models/ChartOfAccounts.js";
import CreateVendor from "../../../Models/CreateVendor.js";
import FinancialYear from "../../../Models/FinancialYear.js";

/**
 * RTVJournalService
 * Handles automatic double-entry journal posting when RTV is posted
 * ✅ REVERSE: Opposite of GRN entries
 * 
 * Journal Entry Structure (REVERSE):
 * Debit: Accounts Payable Account (reduce payable - gives credit to vendor)
 * Credit: Inventory/Stock Account (reduce inventory value)
 */

class RTVJournalService {
  /**
   * Generate Voucher Number for RTV journal entry
   * @param {string} voucherType - Type of voucher (JV, RV for return)
   * @returns {Promise<string>} - Generated voucher number like "RV-00001"
   */
  static async generateVoucherNumber(voucherType = "RV") {
    try {
      const prefix = voucherType;
      const lastEntry = await JournalEntry.findOne({ 
        voucherType, 
        isDeleted: false 
      })
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
      console.error("❌ Error generating voucher number:", err);
      return `${voucherType}-00001`;
    }
  }

  /**
   * Get inventory account for RTV reversal
   * Default: Trading Goods (140400)
   * @returns {Promise<string>} - Account ObjectId
   */
  static async getInventoryAccount() {
    try {
      const account = await ChartOfAccounts.findOne({
        accountNumber: "140400", // Trading Goods
        isActive: true,
        isDeleted: false
      });

      if (!account) {
        console.warn("⚠️ Trading Goods account (140400) not found");
        return null;
      }

      return account._id;
    } catch (err) {
      console.error("❌ Error fetching inventory account:", err);
      return null;
    }
  }

  /**
   * Get vendor's payable account
   * @param {string} vendorId - Vendor ObjectId
   * @returns {Promise<string>} - Payable account ObjectId
   */
  static async getVendorPayableAccount(vendorId) {
    try {
      const vendor = await CreateVendor.findById(vendorId).lean();

      if (!vendor) {
        console.warn(`⚠️ Vendor ${vendorId} not found`);
        return null;
      }

      if (!vendor.accountPayableId) {
        console.warn(`⚠️ Vendor ${vendor.vendorName} has no payable account linked`);
        return null;
      }

      return vendor.accountPayableId;
    } catch (err) {
      console.error("❌ Error fetching vendor payable account:", err);
      return null;
    }
  }

  /**
   * Get Financial Year for RTV date
   * @param {Date} rtvDate - Date of RTV
   * @returns {Promise<string>} - Financial Year ObjectId
   */
  static async getFinancialYear(rtvDate) {
    try {
      const date = new Date(rtvDate);
      
      // Find financial year that contains this date
      const fy = await FinancialYear.findOne({
        startDate: { $lte: date },
        endDate: { $gte: date },
        isDeleted: false
      }).lean();

      if (!fy) {
        console.warn(`⚠️ No active financial year found for date ${rtvDate}`);
        return null;
      }

      return fy._id;
    } catch (err) {
      console.error("❌ Error fetching financial year:", err);
      return null;
    }
  }

  /**
   * Create REVERSE double-entry journal for RTV posting
   * ✅ REVERSE: Opposite of GRN entry
   * 
   * Entry Type: RTV Return (Goods Return to Vendor)
   * Debit:  Vendor Payable Account (credit to vendor)
   * Credit: Inventory Account (reduce stock value)
   * 
   * @param {Object} rtvData - RTV data containing:
   *   - rtvNumber: RTV reference number
   *   - rtvDate: Date of RTV
   *   - vendorId: Vendor ObjectId
   *   - vendorName: Vendor name
   *   - netTotal: Total return amount
   *   - totalQty: Total quantity returned
   *   - createdBy: User creating the entry
   * 
   * @returns {Promise<Object>} - Created journal entry or null if failed
   */
  static async createRtvJournalEntry(rtvData) {
    try {
      const {
        rtvNumber,
        rtvDate,
        vendorId,
        vendorName,
        netTotal,
        totalQty,
        createdBy,
        grnNumber
      } = rtvData;

      console.log("📝 Creating RTV Reverse Journal Entry:", {
        rtvNumber,
        vendorName,
        netTotal,
        grnReference: grnNumber
      });

      // Validate required fields
      if (!rtvNumber || !rtvDate || !vendorId || !netTotal) {
        console.error("❌ Missing required fields for journal entry");
        return null;
      }

      // Get accounts
      const inventoryAccountId = await this.getInventoryAccount();
      const payableAccountId = await this.getVendorPayableAccount(vendorId);
      const financialYearId = await this.getFinancialYear(rtvDate);

      if (!inventoryAccountId || !payableAccountId || !financialYearId) {
        console.error("❌ Failed to fetch required accounts or financial year");
        return null;
      }

      // ✅ REVERSE: Amount to be credited back to vendor
      const totalReturnCredit = Math.round(netTotal * 100);

      // Validate debit = credit
      if (totalReturnCredit === 0) {
        console.warn("⚠️ Journal entry amount is zero, skipping");
        return null;
      }

      // Generate voucher number (RV for return voucher)
      const voucherNumber = await this.generateVoucherNumber("RV");

      // ✅ REVERSE: Create line items
      // Debit: Payable (reduce what we owe)
      // Credit: Inventory (reduce stock value)
      const lineItems = [
        {
          accountId: payableAccountId,
          debitAmount: totalReturnCredit,  // ✅ REVERSE: Debit payable
          creditAmount: 0,
          description: `RTV #${rtvNumber} - ${totalQty} units returned to ${vendorName}`
        },
        {
          accountId: inventoryAccountId,
          debitAmount: 0,
          creditAmount: totalReturnCredit,  // ✅ REVERSE: Credit inventory
          description: `RTV #${rtvNumber} - Inventory reduction ${vendorName}`
        }
      ];

      // Create journal entry
      const journalEntry = new JournalEntry({
        voucherNumber,
        voucherType: "RV",  // Return Voucher
        entryDate: new Date(rtvDate),
        financialYearId,
        description: `RTV Return - ${rtvNumber} to ${vendorName}${grnNumber ? ` (from GRN: ${grnNumber})` : ''}`,
        referenceNumber: rtvNumber,
        lineItems,
        totalDebit: totalReturnCredit,
        totalCredit: totalReturnCredit,
        status: "DRAFT", // Start as draft for approval
        postedBy: createdBy,
        postedDate: null
      });

      await journalEntry.save();
      await journalEntry.populate("lineItems.accountId", "accountNumber accountName");

      console.log(`✅ RTV Reverse Journal Entry created: ${voucherNumber}`);
      console.log("   Debit (Payable): AED ${(totalReturnCredit / 100).toFixed(2)}");
      console.log("   Credit (Inventory): AED ${(totalReturnCredit / 100).toFixed(2)}");

      return {
        voucherNumber: journalEntry.voucherNumber,
        status: journalEntry.status,
        totalAmount: totalReturnCredit / 100,
        lineItems: journalEntry.lineItems.map(item => ({
          account: item.accountId.accountNumber,
          accountName: item.accountId.accountName,
          debit: item.debitAmount / 100,
          credit: item.creditAmount / 100
        }))
      };

    } catch (error) {
      console.error("❌ Error creating RTV journal entry:", {
        message: error.message,
        rtvNumber: rtvData?.rtvNumber
      });
      return null;
    }
  }

  /**
   * Create credit note journal entry for RTV
   * ✅ NEW: Separate entry for credit note issuance
   * 
   * @param {Object} rtvData - RTV data
   * @param {number} creditAmount - Credit note amount
   * @returns {Promise<Object>} - Created credit note journal entry
   */
  static async createCreditNoteJournalEntry(rtvData, creditAmount) {
    try {
      if (!creditAmount || creditAmount <= 0) {
        return null;
      }

      const {
        rtvNumber,
        rtvDate,
        vendorId,
        vendorName,
        createdBy,
        creditNoteNo
      } = rtvData;

      console.log("📝 Creating Credit Note Journal Entry:", {
        rtvNumber,
        creditNoteNo,
        creditAmount
      });

      // Get accounts
      const payableAccountId = await this.getVendorPayableAccount(vendorId);
      const financialYearId = await this.getFinancialYear(rtvDate);

      if (!payableAccountId || !financialYearId) {
        console.error("❌ Failed to fetch required accounts");
        return null;
      }

      const creditNoteAmount = Math.round(creditAmount * 100);
      const voucherNumber = await this.generateVoucherNumber("CN"); // Credit Note

      // Credit note records the liability (payable) to be credited
      const lineItems = [
        {
          accountId: payableAccountId,
          debitAmount: 0,
          creditAmount: creditNoteAmount,
          description: `Credit Note #${creditNoteNo} - RTV ${rtvNumber}`
        }
      ];

      const journalEntry = new JournalEntry({
        voucherNumber,
        voucherType: "CN",
        entryDate: new Date(rtvDate),
        financialYearId,
        description: `Credit Note - ${creditNoteNo} for RTV ${rtvNumber} to ${vendorName}`,
        referenceNumber: creditNoteNo,
        lineItems,
        totalDebit: 0,
        totalCredit: creditNoteAmount,
        status: "DRAFT",
        postedBy: createdBy,
        postedDate: null
      });

      await journalEntry.save();
      await journalEntry.populate("lineItems.accountId", "accountNumber accountName");

      console.log(`✅ Credit Note Journal Entry created: ${voucherNumber}`);

      return journalEntry;

    } catch (error) {
      console.error("❌ Error creating credit note journal entry:", error);
      return null;
    }
  }

  /**
   * Post/Approve journal entry to make it effective
   * @param {string} journalEntryId - Journal Entry ObjectId
   * @param {string} userId - User approving the entry
   * @returns {Promise<Object>} - Updated journal entry
   */
  static async postJournalEntry(journalEntryId, userId) {
    try {
      const journalEntry = await JournalEntry.findById(journalEntryId);

      if (!journalEntry) {
        throw new Error("Journal entry not found");
      }

      if (journalEntry.status === "POSTED") {
        console.warn("⚠️ Journal entry already posted");
        return journalEntry;
      }

      // Update status to POSTED
      journalEntry.status = "POSTED";
      journalEntry.postedBy = userId;
      journalEntry.postedDate = new Date();

      await journalEntry.save();

      console.log(`✅ Journal entry posted: ${journalEntry.voucherNumber}`);

      return journalEntry;

    } catch (error) {
      console.error("❌ Error posting journal entry:", error);
      throw error;
    }
  }

  /**
   * ✅ RULE 3: Create GL Adjustment Entry when product cost shifts
   * Used when latest GRN fully returned and cost shifts to previous GRN
   * 
   * Example: Product cost shifts from 12 to 10
   * - Debit: Inventory Adjustment Account (increase future cost base)
   * - Credit: Cost of Goods Sold (reduce COGS)
   * 
   * @param {Object} costShiftData - Cost shift information:
   *   - rtvNumber: RTV number
   *   - rtvDate: Date of RTV
   *   - itemCode: Product code
   *   - itemName: Product name
   *   - oldCost: Previous product cost
   *   - newCost: New product cost
   *   - costDifference: newCost - oldCost (usually negative)
   *   - quantityAffected: Stock quantity affected
   *   - grnId: GRN that was fully returned
   *   - createdBy: User creating entry
   * 
   * @returns {Promise<Object>} - Created adjustment journal entry
   */
  static async createCostShiftJournalEntry(costShiftData) {
    try {
      const {
        rtvNumber,
        rtvDate,
        itemCode,
        itemName,
        oldCost,
        newCost,
        costDifference,
        quantityAffected,
        grnId,
        createdBy
      } = costShiftData;

      console.log("📝 Creating Cost Shift Adjustment Journal Entry:", {
        rtvNumber,
        itemCode,
        oldCost,
        newCost,
        costDifference,
        quantityAffected
      });

      // Validate required fields
      if (!rtvNumber || !rtvDate || !itemCode || costDifference === undefined) {
        console.error("❌ Missing required fields for cost shift journal entry");
        return null;
      }

      // Skip if cost difference is zero (no adjustment needed)
      if (costDifference === 0) {
        console.warn("⚠️ Cost difference is zero, skipping adjustment entry");
        return null;
      }

      // Get accounts
      const inventoryAdjustmentAccount = await ChartOfAccounts.findOne({
        accountNumber: "140410", // Inventory Adjustment (or similar)
        isActive: true,
        isDeleted: false
      }).lean();

      const cogsAccount = await ChartOfAccounts.findOne({
        accountNumber: "510100", // Cost of Goods Sold (or similar)
        isActive: true,
        isDeleted: false
      }).lean();

      const financialYearId = await this.getFinancialYear(rtvDate);

      if (!financialYearId) {
        console.error("❌ Failed to fetch financial year");
        return null;
      }

      // If specific accounts don't exist, use trading goods fallback
      const adjustmentAccountId = inventoryAdjustmentAccount?._id || 
                                   (await this.getInventoryAccount());
      const expenseAccountId = cogsAccount?._id || (await this.getInventoryAccount());

      if (!adjustmentAccountId || !expenseAccountId) {
        console.error("❌ Failed to fetch required accounts");
        return null;
      }

      // Calculate adjustment amount (in cents)
      const adjustmentAmount = Math.round(Math.abs(costDifference) * quantityAffected * 100);

      if (adjustmentAmount === 0) {
        console.warn("⚠️ Adjustment amount is zero");
        return null;
      }

      // ✅ RULE 3: Determine debit/credit based on cost direction
      let debitAccountId, creditAccountId, debitAmount, creditAmount;

      if (costDifference < 0) {
        // Cost decreased (e.g., 12 → 10)
        // Debit: Inventory Adjustment (increase asset)
        // Credit: COGS (reduce expense)
        debitAccountId = adjustmentAccountId;
        creditAccountId = expenseAccountId;
        debitAmount = adjustmentAmount;
        creditAmount = 0;
      } else {
        // Cost increased (e.g., 10 → 12)
        // Debit: COGS (increase expense)
        // Credit: Inventory Adjustment (decrease asset)
        debitAccountId = expenseAccountId;
        creditAccountId = adjustmentAccountId;
        debitAmount = 0;
        creditAmount = adjustmentAmount;
      }

      // Generate voucher number
      const voucherNumber = await this.generateVoucherNumber("IA"); // Inventory Adjustment

      // Create line items
      const lineItems = [
        {
          accountId: debitAccountId,
          debitAmount,
          creditAmount: costDifference < 0 ? 0 : adjustmentAmount,
          description: `Cost Shift: RTV #${rtvNumber} - ${itemCode} (${itemName}) cost changed ${oldCost} → ${newCost}`
        },
        {
          accountId: creditAccountId,
          debitAmount: costDifference < 0 ? 0 : adjustmentAmount,
          creditAmount: costDifference < 0 ? adjustmentAmount : 0,
          description: `Cost Shift: RTV #${rtvNumber} - ${itemCode} adjustment (qty: ${quantityAffected})`
        }
      ];

      // Create journal entry
      const journalEntry = new JournalEntry({
        voucherNumber,
        voucherType: "IA", // Inventory Adjustment
        entryDate: new Date(rtvDate),
        financialYearId,
        description: `Cost Shift Adjustment - RTV #${rtvNumber}: ${itemCode} (${oldCost} → ${newCost})`,
        referenceNumber: rtvNumber,
        lineItems,
        totalDebit: costDifference < 0 ? adjustmentAmount : adjustmentAmount,
        totalCredit: costDifference < 0 ? adjustmentAmount : adjustmentAmount,
        status: "DRAFT", // Start as draft for review
        postedBy: createdBy,
        postedDate: null,
        relatedRtvNumber: rtvNumber,
        relatedGrnId: grnId
      });

      await journalEntry.save();
      await journalEntry.populate("lineItems.accountId", "accountNumber accountName");

      console.log(`✅ Cost Shift Journal Entry created: ${voucherNumber}`);
      console.log(`   Amount: AED ${(adjustmentAmount / 100).toFixed(2)} (${Math.abs(costDifference).toFixed(2)} per unit × ${quantityAffected})`);

      return {
        voucherNumber: journalEntry.voucherNumber,
        status: journalEntry.status,
        adjustmentAmount: adjustmentAmount / 100,
        costChange: `${oldCost} → ${newCost}`,
        lineItems: journalEntry.lineItems.map(item => ({
          account: item.accountId.accountNumber,
          accountName: item.accountId.accountName,
          debit: item.debitAmount / 100,
          credit: item.creditAmount / 100
        }))
      };

    } catch (error) {
      console.error("❌ Error creating cost shift journal entry:", {
        message: error.message,
        rtvNumber: costShiftData?.rtvNumber
      });
      return null;
    }
  }

  /**
   * Reverse a posted journal entry (for RTV cancellation)
   * @param {string} journalEntryId - Journal Entry ID
   * @param {string} userId - User reversing the entry
   * @param {string} reason - Reason for reversal
   * @returns {Promise<Object>} - Reversal journal entry
   */
  static async reverseJournalEntry(journalEntryId, userId, reason) {
    try {
      const originalEntry = await JournalEntry.findById(journalEntryId);

      if (!originalEntry) {
        throw new Error("Journal entry not found");
      }

      if (originalEntry.status !== "POSTED") {
        throw new Error("Only posted entries can be reversed");
      }

      // Create reversal entry (same accounts, opposite amounts)
      const voucherNumber = await this.generateVoucherNumber(originalEntry.voucherType);

      const reversalLineItems = originalEntry.lineItems.map(item => ({
        accountId: item.accountId,
        debitAmount: item.creditAmount,   // ✅ REVERSE: Swap debit/credit
        creditAmount: item.debitAmount,
        description: `[REVERSAL] ${item.description}`
      }));

      const reversalEntry = new JournalEntry({
        voucherNumber,
        voucherType: originalEntry.voucherType,
        entryDate: new Date(),
        financialYearId: originalEntry.financialYearId,
        description: `[REVERSAL] ${originalEntry.description} - Reason: ${reason}`,
        referenceNumber: originalEntry.referenceNumber,
        lineItems: reversalLineItems,
        totalDebit: originalEntry.totalCredit,
        totalCredit: originalEntry.totalDebit,
        status: "POSTED",  // Auto-post reversal
        postedBy: userId,
        postedDate: new Date(),
        reversesEntryId: journalEntryId,
        reversalReason: reason
      });

      await reversalEntry.save();

      // Mark original as reversed
      originalEntry.reversedBy = userId;
      originalEntry.reversedDate = new Date();
      originalEntry.reversalEntryId = reversalEntry._id;
      await originalEntry.save();

      console.log(`✅ Journal entry reversed: ${voucherNumber}`);

      return reversalEntry;

    } catch (error) {
      console.error("❌ Error reversing journal entry:", error);
      throw error;
    }
  }
}

export default RTVJournalService;
