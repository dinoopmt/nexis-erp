import JournalEntry from "../../../Models/JournalEntry.js";
import ChartOfAccounts from "../../../Models/ChartOfAccounts.js";
import CreateVendor from "../../../Models/CreateVendor.js";
import FinancialYear from "../../../Models/FinancialYear.js";

/**
 * GRNJournalService
 * Handles automatic double-entry journal posting when GRN is posted
 * 
 * Journal Entry Structure:
 * Debit: Inventory/Stock Account (Trading Goods 140400)
 * Credit: Accounts Payable Account (Vendor's payable GL account)
 */

class GRNJournalService {
  /**
   * Generate Voucher Number for a journal entry
   * @param {string} voucherType - Type of voucher (JV, PV, RV, BV)
   * @returns {Promise<string>} - Generated voucher number like "JV-00001"
   */
  static async generateVoucherNumber(voucherType = "JV") {
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
   * Get default inventory account for GRN
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
   * Get Financial Year ID for the GRN date
   * @param {Date} grnDate - Date of GRN
   * @returns {Promise<string>} - Financial Year ObjectId
   */
  static async getFinancialYear(grnDate) {
    try {
      const date = new Date(grnDate);
      
      // Find financial year that contains this date
      const fy = await FinancialYear.findOne({
        startDate: { $lte: date },
        endDate: { $gte: date },
        isDeleted: false
      }).lean();

      if (!fy) {
        console.warn(`⚠️ No active financial year found for date ${grnDate}`);
        return null;
      }

      return fy._id;
    } catch (err) {
      console.error("❌ Error fetching financial year:", err);
      return null;
    }
  }

  /**
   * Create double-entry journal for GRN posting
   * 
   * Entry Type: GRN Receipt (Goods Receipt)
   * Debit:  Inventory Account (Trading Goods 140400)
   * Credit: Vendor Payable Account
   * 
   * @param {Object} grnData - GRN data containing:
   *   - grnNumber: GRN reference number
   *   - grnDate: Date of GRN
   *   - vendorId: Vendor ObjectId
   *   - vendorName: Vendor name
   *   - netTotal: Total amount for items (after discount, with tax)
   *   - shippingCost: Shipping cost if any
   *   - totalQty: Total quantity received
   *   - createdBy: User creating the entry
   * 
   * @returns {Promise<Object>} - Created journal entry or null if failed
   */
  static async createGrnJournalEntry(grnData) {
    try {
      const {
        grnNumber,
        grnDate,
        vendorId,
        vendorName,
        netTotal,
        shippingCost,
        totalQty,
        createdBy
      } = grnData;

      console.log("📝 Creating GRN Journal Entry:", {
        grnNumber,
        vendorName,
        netTotal,
        shippingCost,
      });

      // Validate required fields
      if (!grnNumber || !grnDate || !vendorId || !netTotal) {
        console.error("❌ Missing required fields for journal entry");
        return null;
      }

      // Get accounts
      const inventoryAccountId = await this.getInventoryAccount();
      const payableAccountId = await this.getVendorPayableAccount(vendorId);
      const financialYearId = await this.getFinancialYear(grnDate);

      if (!inventoryAccountId || !payableAccountId || !financialYearId) {
        console.error("❌ Failed to fetch required accounts or financial year");
        return null;
      }

      // Calculate total debit amount (items + shipping if included in netTotal)
      // netTotal typically includes: subtotal - discount + tax (exclusive mode)
      // If shippingCost is separate, we add it
      const totalInventoryDebit = Math.round((netTotal + (shippingCost || 0)) * 100);

      // Validate debit = credit (fundamental double entry rule)
      if (totalInventoryDebit === 0) {
        console.warn("⚠️ Journal entry amount is zero, skipping");
        return null;
      }

      // Generate voucher number
      const voucherNumber = await this.generateVoucherNumber("JV");

      // Create line items for journal entry
      const lineItems = [
        {
          accountId: inventoryAccountId,
          debitAmount: totalInventoryDebit,
          creditAmount: 0,
          description: `GRN #${grnNumber} - ${totalQty} units from ${vendorName}`
        },
        {
          accountId: payableAccountId,
          debitAmount: 0,
          creditAmount: totalInventoryDebit,
          description: `GRN #${grnNumber} - Vendor Payable ${vendorName}`
        }
      ];

      // Create journal entry
      const journalEntry = new JournalEntry({
        voucherNumber,
        voucherType: "JV", // Journal Voucher for GRN
        entryDate: new Date(grnDate),
        financialYearId,
        description: `GRN Receipt - ${grnNumber} from ${vendorName}`,
        referenceNumber: grnNumber,
        lineItems,
        totalDebit: totalInventoryDebit,
        totalCredit: totalInventoryDebit,
        status: "DRAFT", // Start as draft for approval
        postedBy: createdBy,
        postedDate: null // Will be set when approved
      });

      await journalEntry.save();
      await journalEntry.populate("lineItems.accountId", "accountNumber accountName");

      console.log(`✅ GRN Journal Entry created: ${voucherNumber}`);
      console.log("   Debit (Inventory): AED ${(totalInventoryDebit / 100).toFixed(2)}");
      console.log("   Credit (Payable): AED ${(totalInventoryDebit / 100).toFixed(2)}");

      return {
        voucherNumber: journalEntry.voucherNumber,
        status: journalEntry.status,
        totalAmount: totalInventoryDebit / 100,
        lineItems: journalEntry.lineItems.map(item => ({
          account: item.accountId.accountNumber,
          accountName: item.accountId.accountName,
          debit: item.debitAmount / 100,
          credit: item.creditAmount / 100
        }))
      };

    } catch (error) {
      console.error("❌ Error creating GRN journal entry:", {
        message: error.message,
        grnNumber: grnData?.grnNumber
      });
      return null;
    }
  }

  /**
   * Create separate journal entry for shipping cost if not already included
   * @param {Object} grnData - GRN data
   * @param {number} shippingCost - Shipping cost amount
   * @returns {Promise<Object>} - Created shipping journal entry or null
   */
  static async createShippingJournalEntry(grnData, shippingCost) {
    try {
      if (!shippingCost || shippingCost <= 0) {
        return null;
      }

      const {
        grnNumber,
        grnDate,
        vendorId,
        vendorName,
        createdBy
      } = grnData;

      console.log("📦 Creating Shipping Cost Journal Entry:", {
        grnNumber,
        shippingCost
      });

      // Get Freight Inward expense account (510400)
      const freightAccount = await ChartOfAccounts.findOne({
        accountNumber: "510400", // Freight Inward
        isActive: true,
        isDeleted: false
      });

      if (!freightAccount) {
        console.warn("⚠️ Freight Inward account (510400) not found");
        return null;
      }

      const payableAccountId = await this.getVendorPayableAccount(vendorId);
      const financialYearId = await this.getFinancialYear(grnDate);

      if (!payableAccountId || !financialYearId) {
        console.error("❌ Failed to fetch payable account or financial year");
        return null;
      }

      const shippingAmount = Math.round(shippingCost * 100);
      const voucherNumber = await this.generateVoucherNumber("JV");

      const lineItems = [
        {
          accountId: freightAccount._id,
          debitAmount: shippingAmount,
          creditAmount: 0,
          description: `Shipping cost for GRN #${grnNumber}`
        },
        {
          accountId: payableAccountId,
          debitAmount: 0,
          creditAmount: shippingAmount,
          description: `Shipping payable - ${vendorName}`
        }
      ];

      const journalEntry = new JournalEntry({
        voucherNumber,
        voucherType: "JV",
        entryDate: new Date(grnDate),
        financialYearId,
        description: `GRN Shipping Cost - ${grnNumber} from ${vendorName}`,
        referenceNumber: `${grnNumber}-SHIP`,
        lineItems,
        totalDebit: shippingAmount,
        totalCredit: shippingAmount,
        status: "DRAFT",
        postedBy: createdBy,
        postedDate: null
      });

      await journalEntry.save();
      await journalEntry.populate("lineItems.accountId", "accountNumber accountName");

      console.log(`✅ Shipping Journal Entry created: ${voucherNumber}`);
      console.log("   Debit (Freight Inward): AED ${(shippingAmount / 100).toFixed(2)}");
      console.log("   Credit (Payable): AED ${(shippingAmount / 100).toFixed(2)}");

      return {
        voucherNumber: journalEntry.voucherNumber,
        status: journalEntry.status,
        totalAmount: shippingAmount / 100
      };

    } catch (error) {
      console.error("❌ Error creating shipping journal entry:", error);
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
}

export default GRNJournalService;
