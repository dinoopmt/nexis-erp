import mongoose from "mongoose";

const chartOfAccountsSchema = new mongoose.Schema({
  accountNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  accountName: {
    type: String,
    required: true,
    trim: true
  },
  accountGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AccountGroup",
    required: true
  },
  description: { type: String, default: "" },
  openingBalance: {
    type: Number,
    default: 0
  },
  openingBalanceDate: { type: Date, default: Date.now },
  currentBalance: {
    type: Number,
    default: 0
  },
  isActive: { type: Boolean, default: true },
  
  // Posting flag - Level 3 ledger accounts allow posting
  allowPosting: { type: Boolean, default: true },
  
  // Account Classification for Reports (inherited from group, but can be stored for quick access)
  accountCategory: {
    type: String,
    enum: ["BALANCE_SHEET", "PROFIT_LOSS"],
    default: "BALANCE_SHEET"
  },
  
  // Financial Year for opening balance tracking
  financialYearId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FinancialYear",
    default: null
  },
  
  isBank: { type: Boolean, default: false }, // For bank/cash accounts
  bankName: { type: String, default: "" },
  accountTypeBank: { type: String, default: "" }, // e.g., Current, Savings
  
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  
  createdDate: { type: Date, default: Date.now },
  updatedDate: { type: Date, default: Date.now },
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});
chartOfAccountsSchema.index({ accountGroupId: 1 });
chartOfAccountsSchema.index({ isActive: 1 });
chartOfAccountsSchema.index({ isBank: 1 });
chartOfAccountsSchema.index({ isDeleted: 1 });

export default mongoose.model("ChartOfAccounts", chartOfAccountsSchema, 'chart_of_accounts');
