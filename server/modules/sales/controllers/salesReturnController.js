import SalesReturn from '../../../Models/Sales/SalesReturn.js';
import Counter from '../../../Models/SequenceModel.js';
import SalesReturnJournalService from '../services/SalesReturnJournalService.js';
import logger from '../../../config/logger.js';

// Auto-generate next return number
export const getNextReturnNumber = async (req, res) => {
  try {
    const { financialYear } = req.query;
    if (!financialYear) {
      return res.status(400).json({ error: 'Financial year is required' });
    }
    const counter = await Counter.findOneAndUpdate(
      { module: 'sales_return', financialYear },
      { $inc: { lastNumber: 1 }, $setOnInsert: { prefix: 'SR' } },
      { returnDocument: 'after', upsert: true }
    );
    const paddedNumber = String(counter.lastNumber).padStart(4, '0');
    const returnNumber = `SR/${financialYear}/${paddedNumber}`;
    res.json({ returnNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createSalesReturn = async (req, res) => {
  try {
    logger.info('Creating sales return', { payload: req.body });

    // ✅ Validate required fields
    const { invoiceId, invoiceNumber, invoiceDate, returnReason, items } = req.body;

    if (!invoiceId || !invoiceNumber || !invoiceDate) {
      return res.status(400).json({
        error: 'Invoice information is required (invoiceId, invoiceNumber, invoiceDate)',
      });
    }

    if (!returnReason || returnReason.trim().length < 5) {
      return res.status(400).json({
        error: 'Return reason is required (minimum 5 characters)',
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        error: 'At least one item is required for sales return',
      });
    }

    // Create sales return document
    const salesReturn = new SalesReturn(req.body);
    await salesReturn.save();
    logger.info('Sales return created', { returnId: salesReturn._id });

    // ✅ NEW: Create accounting entries (Double-Entry System)
    try {
      const journalEntryIds = await SalesReturnJournalService.createSalesReturnEntries(
        salesReturn
      );

      // Update sales return with journal entry IDs
      salesReturn.journalEntryIds = journalEntryIds;
      if (journalEntryIds.length > 0) {
        salesReturn.mainJournalEntryId = journalEntryIds[0];
        salesReturn.accountingStatus = 'posted';
        salesReturn.postedDate = new Date();
      }

      await salesReturn.save();
      logger.info('Accounting entries created for sales return', {
        returnId: salesReturn._id,
        entriesCount: journalEntryIds.length,
      });
    } catch (accountingErr) {
      logger.error('Failed to create accounting entries', {
        error: accountingErr.message,
        returnId: salesReturn._id,
      });
      // Note: We save the return even if accounting fails, but log the error
      salesReturn.accountingStatus = 'pending';
      await salesReturn.save();
    }

    res.status(201).json({
      success: true,
      message: 'Sales return created successfully',
      data: salesReturn,
    });
  } catch (err) {
    logger.error('Error creating sales return', { error: err.message });
    res.status(400).json({ error: err.message });
  }
};

export const getSalesReturns = async (req, res) => {
  try {
    const returns = await SalesReturn.find();
    res.json(returns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getSalesReturnById = async (req, res) => {
  try {
    const salesReturn = await SalesReturn.findById(req.params.id);
    if (!salesReturn) return res.status(404).json({ error: 'Sales return not found' });
    res.json(salesReturn);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateSalesReturn = async (req, res) => {
  try {
    const salesReturn = await SalesReturn.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!salesReturn) return res.status(404).json({ error: 'Sales return not found' });
    res.json(salesReturn);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteSalesReturn = async (req, res) => {
  try {
    const salesReturn = await SalesReturn.findByIdAndDelete(req.params.id);
    if (!salesReturn) return res.status(404).json({ error: 'Sales return not found' });
    res.json({ message: 'Sales return deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
