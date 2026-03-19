import SalesReturn from '../../../Models/Sales/SalesReturn.js';
import Counter from '../../../Models/SequenceModel.js';

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
      { new: true, upsert: true }
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
    const salesReturn = new SalesReturn(req.body);
    await salesReturn.save();
    res.status(201).json(salesReturn);
  } catch (err) {
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
