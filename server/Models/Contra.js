import mongoose from "mongoose";

const contraSchema = new mongoose.Schema({
  contraNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  contraDate: { 
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
  
  // Transfer From (Cash/Bank Account)
  fromAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChartOfAccounts",
    required: true
  },
  
  // Transfer To (Cash/Bank Account)
  toAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChartOfAccounts",
    required: true
  },
  
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  transferType: {
    type: String,
    enum: ["CASH_TO_BANK", "BANK_TO_CASH", "BANK_TO_BANK"],
    required: true
  },
  
  referenceNumber: { type: String, default: "" },
  description: { type: String, default: "" },
  
  // For cheque deposits/withdrawals
  chequeNumber: { type: String, default: "" },
  chequeDate: { type: Date, default: null },
  
  status: {
    type: String,
    enum: ["PENDING", "APPROVED", "COMPLETED", "CANCELLED"],
    default: "PENDING"
  },
  
  // Journal Entry reference (created when contra is posted)
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
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Indexes
contraSchema.index({ contraDate: -1 });
contraSchema.index({ status: 1 });
contraSchema.index({ fromAccountId: 1 });
contraSchema.index({ toAccountId: 1 });
contraSchema.index({ isDeleted: 1 });

// Auto-generate contra number
contraSchema.pre('save', async function(next) {
  if (this.isNew && !this.contraNumber) {
    const lastContra = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
    const lastNum = lastContra ? parseInt(lastContra.contraNumber.replace('CV', '')) || 0 : 0;
    this.contraNumber = `CV${String(lastNum + 1).padStart(6, '0')}`;
  }
  next();
});

export default mongoose.model("Contra", contraSchema, 'contra_accounts');
