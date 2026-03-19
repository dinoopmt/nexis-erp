import mongoose from "mongoose";

const journalEntrySchema = new mongoose.Schema({
  voucherNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  voucherType: {
    type: String,
    enum: ["JV", "PV", "RV", "BV"], // Journal, Payment, Receipt, Bank
    required: true
  },
  entryDate: { type: Date, required: true },
  
  // Financial Year Reference
  financialYearId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FinancialYear",
    required: true
  },
  
  description: { type: String, required: true },
  referenceNumber: { type: String, default: "" },
  
  lineItems: [{
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccounts",
      required: true
    },
    debitAmount: {
      type: Number,
      default: 0
    },
    creditAmount: {
      type: Number,
      default: 0
    },
    description: { type: String, default: "" }
  }],
  
  totalDebit: {
    type: Number,
    default: 0
  },
  totalCredit: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ["DRAFT", "POSTED", "REVERSE"],
    default: "DRAFT"
  },
  
  postedBy: { type: String, default: "" },
  postedDate: { type: Date, default: null },
  
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  
  createdDate: { type: Date, default: Date.now },
  updatedDate: { type: Date, default: Date.now },
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});
journalEntrySchema.index({ voucherType: 1 });
journalEntrySchema.index({ entryDate: 1 });
journalEntrySchema.index({ status: 1 });
journalEntrySchema.index({ financialYearId: 1 });
journalEntrySchema.index({ "lineItems.accountId": 1 });
journalEntrySchema.index({ isDeleted: 1 });

export default mongoose.model("JournalEntry", journalEntrySchema, 'journal_entries');
