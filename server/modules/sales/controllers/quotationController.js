import Quotation from '../../../Models/Sales/Quotation.js';
import Counter from '../../../Models/SequenceModel.js';
import Customer from '../../../Models/Customer.js';

// Auto-generate next quotation number
export const getNextQuotationNumber = async (req, res) => {
  try {
    const { financialYear } = req.query;
    if (!financialYear) {
      return res.status(400).json({ error: 'Financial year is required' });
    }
    const counter = await Counter.findOneAndUpdate(
      { module: 'quotation', financialYear },
      { $inc: { lastNumber: 1 }, $setOnInsert: { prefix: 'QT' } },
      { new: true, upsert: true }
    );
    const paddedNumber = String(counter.lastNumber).padStart(4, '0');
    const quotationNumber = `QT/${financialYear}/${paddedNumber}`;
    res.json({ quotationNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create Quotation
export const createQuotation = async (req, res) => {
  try {
    console.log("Creating Quotation:", req.body);

    const { quotationNumber, customerName, date, items, financialYear } = req.body;
    
    if (!quotationNumber || !customerName || !date || !financialYear) {
      return res.status(400).json({ 
        error: 'Missing required fields: quotationNumber, customerName, date, financialYear' 
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ 
        error: 'Quotation must contain at least one item' 
      });
    }

    const existingQuotation = await Quotation.findOne({ quotationNumber });
    if (existingQuotation) {
      return res.status(409).json({ 
        error: 'Quotation number already exists' 
      });
    }

    const quotation = new Quotation(req.body);
    await quotation.save();

    console.log("Quotation created successfully:", quotation._id);
    res.status(201).json(quotation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get All Quotations
export const getQuotations = async (req, res) => {
  try {
    const { status, customerId, startDate, endDate } = req.query;
    let filter = { isDeleted: false };

    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const quotations = await Quotation.find(filter)
      .populate('customerId', 'name customerCode')
      .sort({ date: -1 });

    res.json(quotations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Quotation by ID
export const getQuotationById = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('customerId')
      .populate('items.productId');

    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
    res.json(quotation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Quotation
export const updateQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findByIdAndUpdate(
      req.params.id, 
      { ...req.body, updatedDate: new Date() },
      { returnDocument: 'after', new: true }
    );

    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
    res.json(quotation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete Quotation (Soft Delete)
export const deleteQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date() },
      { returnDocument: 'after', new: true }
    );

    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
    res.json({ message: 'Quotation deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Change Status
export const updateQuotationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired', 'Converted'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const quotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      { status, updatedDate: new Date() },
      { returnDocument: 'after', new: true }
    );

    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
    res.json(quotation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export default {
  getNextQuotationNumber,
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
  deleteQuotation,
  updateQuotationStatus
};
