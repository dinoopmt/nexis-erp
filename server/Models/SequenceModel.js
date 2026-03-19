import mongoose from "mongoose";


const counterSchema = new mongoose.Schema({
  module: { type: String, required: true }, // sales_invoice
  financialYear: { type: String, required: true }, // 2025-26
  prefix: { type: String }, // SI
  lastNumber: { type: Number, default: 0 }
});

export default mongoose.model("Counter", counterSchema, "sequences");
