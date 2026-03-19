import Counter from "../../../Models/SequenceModel.js";

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
    let { financialYear, prefix } = req.query;
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    if (!financialYear) {
      financialYear = month > 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    }
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
    res.status(500).json({ message: error.message });
  }
};
