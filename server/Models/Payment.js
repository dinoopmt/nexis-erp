import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  paymentNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  paymentDate: { 
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
  
  // Payment From (Cash/Bank Account)
  payFromAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChartOfAccounts",
    required: true
  },
  
  // Payment To (Expense Account)
  payToAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChartOfAccounts",
    required: true
  },
  
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  paymentMethod: {
    type: String,
    enum: ["CASH", "BANK_TRANSFER", "CHEQUE", "CARD", "ONLINE"],
    default: "CASH"
  },
  
  referenceNumber: { type: String, default: "" }, // Cheque #, Transaction ID, etc.
  description: { type: String, default: "" },
  
  // For cheque payments
  chequeNumber: { type: String, default: "" },
  chequeDate: { type: Date, default: null },
  bankName: { type: String, default: "" },
  
  status: {
    type: String,
    enum: ["PENDING", "APPROVED", "PAID", "CANCELLED", "BOUNCED"],
    default: "PENDING"
  },
  
  // Journal Entry reference (created when payment is posted)
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
  toObject: { getters: true },
  collection: 'payments'
});

// Indexes
paymentSchema.index({ paymentDate: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ vendorId: 1 });
paymentSchema.index({ payFromAccountId: 1 });
paymentSchema.index({ isDeleted: 1 });

// Auto-generate payment number
paymentSchema.pre('save', async function(next) {
  if (this.isNew && !this.paymentNumber) {
    const lastPayment = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
    const lastNum = lastPayment ? parseInt(lastPayment.paymentNumber.replace('PV', '')) || 0 : 0;
    this.paymentNumber = `PV${String(lastNum + 1).padStart(6, '0')}`;
  }
  next();
});

export default mongoose.model("Payment", paymentSchema);
