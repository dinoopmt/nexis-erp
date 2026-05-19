import Counter from "../../../Models/SequenceModel.js";
import { resolveFinancialYearCode } from '../../../utils/financialYearResolver.js';

const modulePrefixes = {
  sales_invoice: "SI",
  product_code: "PC",
  purchase_order: "PO",
  delivery_note: "DN",
  // Add more as needed
};

export const getNextSequence = async (req, res) => {
  try {
    const { module } = req.params;
    let { prefix } = req.query;
    const financialYear = await resolveFinancialYearCode(req.query.financialYear);
    if (!prefix) {
      prefix = modulePrefixes[module] || module.toUpperCase().slice(0,2);
    }

    const counter = await Counter.findOneAndUpdate(
      { module, financialYear },
      { $inc: { lastNumber: 1 }, $setOnInsert: { prefix } },
      { returnDocument: 'after', upsert: true }
    );

    const paddedNumber = String(counter.lastNumber).padStart(4, "0");
    const sequence = `${prefix}/${financialYear}/${paddedNumber}`;
    res.json({ sequence });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};
