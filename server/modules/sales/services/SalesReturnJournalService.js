/**
 * Sales Return Journal Service
 * Handles double-entry bookkeeping for sales returns
 * Creates accounting entries for revenue reversal, inventory adjustment, and refunds
 */

import JournalEntry from '../../../Models/JournalEntry.js';
import ChartOfAccounts from '../../../Models/ChartOfAccounts.js';
import JournalEntryService from '../../accounting/services/JournalEntryService.js';
import logger from '../../../config/logger.js';

class SalesReturnJournalService {
  /**
   * Create accounting entries for a sales return
   * Double-entry format: Debit Sales Return | Credit Sales
   *                      Debit Inventory | Credit COGS
   *
   * @param {Object} salesReturn - The sales return document
   * @returns {Promise<Array>} - Array of created journal entry IDs
   */
  async createSalesReturnEntries(salesReturn) {
    try {
      logger.info('Creating journal entries for sales return', {
        returnId: salesReturn._id,
        returnNumber: salesReturn.returnNumber,
        amount: salesReturn.totalIncludeVat,
      });

      const journalEntryService = new JournalEntryService();
      const journalEntries = [];

      // Get Chart of Accounts (caching these lookups)
      const [
        salesReturnAccount,
        salesAccount,
        cogAccount,
        inventoryAccount,
        arAccount,
        cashAccount,
      ] = await Promise.all([
        ChartOfAccounts.findOne({ code: '41000', isDeleted: false }), // Sales Return / Sales Adjustment
        ChartOfAccounts.findOne({ code: '40000', isDeleted: false }), // Sales
        ChartOfAccounts.findOne({ code: '50000', isDeleted: false }), // Cost of Goods Sold
        ChartOfAccounts.findOne({ code: '10200', isDeleted: false }), // Inventory
        ChartOfAccounts.findOne({ code: '11000', isDeleted: false }), // Accounts Receivable
        ChartOfAccounts.findOne({ code: '10100', isDeleted: false }), // Cash
      ]);

      if (!salesReturnAccount || !salesAccount || !cogAccount || !inventoryAccount) {
        throw new Error(
          'Missing required Chart of Accounts entries for sales return accounting'
        );
      }

      const voucherNumber = await journalEntryService.generateVoucherNumber('JV');
      const entryDate = new Date(salesReturn.date);

      // ========== ENTRY 1: Revenue Reversal ==========
      // Dr. Sales Return (Expense) | Cr. Sales (Revenue)
      // This reverses the original sale revenue

      const entry1 = new JournalEntry({
        voucherType: 'JV',
        voucherNumber: voucherNumber,
        date: entryDate,
        description: `Sales Return - ${salesReturn.returnNumber}`,
        reference: salesReturn._id,
        referenceType: 'SalesReturn',
        totalDebit: Number(salesReturn.totalAfterDiscount),
        totalCredit: Number(salesReturn.totalAfterDiscount),
        lineItems: [
          {
            accountId: salesReturnAccount._id,
            accountCode: salesReturnAccount.code,
            accountName: salesReturnAccount.name,
            debitAmount: Number(salesReturn.totalAfterDiscount),
            creditAmount: 0,
            description: `Return of goods - ${salesReturn.returnNumber}`,
          },
          {
            accountId: salesAccount._id,
            accountCode: salesAccount.code,
            accountName: salesAccount.name,
            debitAmount: 0,
            creditAmount: Number(salesReturn.totalAfterDiscount),
            description: `Revenue reversal - ${salesReturn.returnNumber}`,
          },
        ],
        status: 'Posted',
        postedDate: new Date(),
      });

      await entry1.save();
      journalEntries.push(entry1._id);
      logger.info('Created revenue reversal entry', { entryId: entry1._id });

      // ========== ENTRY 2: COGS Reversal & Inventory Adjustment ==========
      // Dr. Inventory (Asset) | Cr. COGS (Expense)
      // This reverses the COGS and restores inventory

      const totalReturnCost = Number(salesReturn.totalCost);

      if (totalReturnCost > 0) {
        const entry2 = new JournalEntry({
          voucherType: 'JV',
          voucherNumber: `${voucherNumber}-B`, // Related entry suffix
          date: entryDate,
          description: `Inventory Reversal - ${salesReturn.returnNumber}`,
          reference: salesReturn._id,
          referenceType: 'SalesReturn',
          totalDebit: totalReturnCost,
          totalCredit: totalReturnCost,
          lineItems: [
            {
              accountId: inventoryAccount._id,
              accountCode: inventoryAccount.code,
              accountName: inventoryAccount.name,
              debitAmount: totalReturnCost,
              creditAmount: 0,
              description: `Returned inventory restoration - ${salesReturn.returnNumber}`,
            },
            {
              accountId: cogAccount._id,
              accountCode: cogAccount.code,
              accountName: cogAccount.name,
              debitAmount: 0,
              creditAmount: totalReturnCost,
              description: `COGS reversal - ${salesReturn.returnNumber}`,
            },
          ],
          status: 'Posted',
          postedDate: new Date(),
        });

        await entry2.save();
        journalEntries.push(entry2._id);
        logger.info('Created COGS reversal entry', { entryId: entry2._id });
      }

      // ========== ENTRY 3: Refund Entry (if applicable) ==========
      // Dr. Cash/Bank or Accounts Receivable | Cr. Customer Payment
      // This handles the actual refund/credit to customer

      if (salesReturn.paymentType === 'Cash' || salesReturn.paymentType === 'Bank') {
        const refundAccount = salesReturn.paymentType === 'Cash' ? cashAccount : null;

        if (refundAccount) {
          const entry3 = new JournalEntry({
            voucherType: 'JV',
            voucherNumber: `${voucherNumber}-C`, // Related entry suffix
            date: entryDate,
            description: `${salesReturn.paymentType} Refund - ${salesReturn.returnNumber}`,
            reference: salesReturn._id,
            referenceType: 'SalesReturn',
            totalDebit: Number(salesReturn.totalIncludeVat),
            totalCredit: Number(salesReturn.totalIncludeVat),
            lineItems: [
              {
                accountId: refundAccount._id,
                accountCode: refundAccount.code,
                accountName: refundAccount.name,
                debitAmount: 0,
                creditAmount: Number(salesReturn.totalIncludeVat),
                description: `${salesReturn.paymentType} paid for return - ${salesReturn.returnNumber}`,
              },
              {
                accountId: arAccount._id,
                accountCode: arAccount.code,
                accountName: arAccount.name,
                debitAmount: Number(salesReturn.totalIncludeVat),
                creditAmount: 0,
                description: `Customer refund - ${salesReturn.returnNumber}`,
              },
            ],
            status: 'Posted',
            postedDate: new Date(),
          });

          await entry3.save();
          journalEntries.push(entry3._id);
          logger.info('Created refund entry', { entryId: entry3._id });
        }
      } else if (salesReturn.paymentType === 'Credit') {
        // For credit sales, just update AR (no cash movement)
        const entry3 = new JournalEntry({
          voucherType: 'JV',
          voucherNumber: `${voucherNumber}-C`,
          date: entryDate,
          description: `Credit Note - ${salesReturn.returnNumber}`,
          reference: salesReturn._id,
          referenceType: 'SalesReturn',
          totalDebit: Number(salesReturn.totalIncludeVat),
          totalCredit: Number(salesReturn.totalIncludeVat),
          lineItems: [
            {
              accountId: arAccount._id,
              accountCode: arAccount.code,
              accountName: arAccount.name,
              debitAmount: 0,
              creditAmount: Number(salesReturn.totalIncludeVat),
              description: `Credit issued for return - ${salesReturn.returnNumber}`,
            },
            {
              accountId: salesReturnAccount._id,
              accountCode: salesReturnAccount.code,
              accountName: salesReturnAccount.name,
              debitAmount: Number(salesReturn.totalIncludeVat),
              creditAmount: 0,
              description: `Customer credit memo - ${salesReturn.returnNumber}`,
            },
          ],
          status: 'Posted',
          postedDate: new Date(),
        });

        await entry3.save();
        journalEntries.push(entry3._id);
        logger.info('Created credit note entry', { entryId: entry3._id });
      }

      logger.info('Successfully created all sales return journal entries', {
        returnId: salesReturn._id,
        entriesCount: journalEntries.length,
        journalEntryIds: journalEntries,
      });

      return journalEntries;
    } catch (err) {
      logger.error('Failed to create sales return journal entries', {
        error: err.message,
        returnId: salesReturn._id,
      });
      throw err;
    }
  }

  /**
   * Reverse/Cancel journal entries for a sales return
   * Used when a sales return is cancelled or deleted
   *
   * @param {Array<ObjectId>} journalEntryIds - Array of journal entry IDs to reverse
   * @returns {Promise<Array>} - Array of reversed entry IDs
   */
  async reverseSalesReturnEntries(journalEntryIds) {
    try {
      logger.info('Reversing sales return journal entries', {
        entriesToReverse: journalEntryIds.length,
      });

      const reversedEntries = [];

      for (const entryId of journalEntryIds) {
        const originalEntry = await JournalEntry.findById(entryId);
        if (!originalEntry) {
          logger.warn('Original entry not found for reversal', { entryId });
          continue;
        }

        // Create reverse entry (swap debits and credits)
        const reversalEntry = new JournalEntry({
          voucherType: originalEntry.voucherType,
          voucherNumber: `${originalEntry.voucherNumber}-REV`,
          date: new Date(),
          description: `Reversal of ${originalEntry.description}`,
          reference: originalEntry.reference,
          referenceType: originalEntry.referenceType,
          totalDebit: originalEntry.totalCredit,
          totalCredit: originalEntry.totalDebit,
          lineItems: originalEntry.lineItems.map((item) => ({
            ...item,
            debitAmount: item.creditAmount,
            creditAmount: item.debitAmount,
          })),
          status: 'Posted',
          postedDate: new Date(),
        });

        await reversalEntry.save();
        reversedEntries.push(reversalEntry._id);
        logger.info('Created reversal entry', { reversalEntryId: reversalEntry._id });
      }

      return reversedEntries;
    } catch (err) {
      logger.error('Failed to reverse sales return entries', {
        error: err.message,
        entriesCount: journalEntryIds.length,
      });
      throw err;
    }
  }
}

export default new SalesReturnJournalService();
