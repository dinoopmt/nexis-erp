import mongoose from "mongoose";

const receiptSchema = new mongoose.Schema({
  receiptNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  receiptDate: { 
    type: Date, 
    required: true,
    default: Date.now 
  },
  
  // Financial Year Reference
  financialYearId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FinancialYear",
    required: true
  },
  
  // Receive From (Income/Debtor Account)
  receiveFromAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChartOfAccounts",
    required: true
  },
  
  // Receive Into (Cash/Bank Account)
  receiveIntoAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChartOfAccounts",
    required: true
  },
  
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  receiptMethod: {
    type: String,
    enum: ["CASH", "BANK_TRANSFER", "CHEQUE", "CARD", "ONLINE"],
    default: "CASH"
  },
  
  referenceNumber: { type: String, default: "" }, // Cheque #, Transaction ID, etc.
  description: { type: String, default: "" },
  
  // For cheque receipts
  chequeNumber: { type: String, default: "" },
  chequeDate: { type: Date, default: null },
  bankName: { type: String, default: "" },
  
  status: {
    type: String,
    enum: ["PENDING", "APPROVED", "RECEIVED", "CANCELLED", "BOUNCED"],
    default: "PENDING"
  },
  
  // Journal Entry reference (created when receipt is posted)
  journalEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "JournalEntry",
    default: null
  },
  
  approvedBy: { type: String, default: "" },
  approvedDate: { type: Date, default: null },
  
  createdBy: { type: String, default: "" },
  
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, {
  timestamps: true,
  collection: 'receipts',
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Indexes
receiptSchema.index({ receiptDate: -1 });
receiptSchema.index({ status: 1 });
receiptSchema.index({ receiveIntoAccountId: 1 });
receiptSchema.index({ isDeleted: 1 });

// Auto-generate receipt number
receiptSchema.pre('save', async function(next) {
  if (this.isNew && !this.receiptNumber) {
    const lastReceipt = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
    const lastNum = lastReceipt ? parseInt(lastReceipt.receiptNumber.replace('RV', '')) || 0 : 0;
    this.receiptNumber = `RV${String(lastNum + 1).padStart(6, '0')}`;
  }
  next();
});

export default mongoose.model("Receipt", receiptSchema);
