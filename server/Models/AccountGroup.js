import mongoose from "mongoose";

const accountGroupSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: { type: String, default: "" },
  
  // 3-Level Hierarchy Support
  level: {
    type: Number,
    enum: [1, 2], // 1 = Main Group, 2 = Sub Group
    default: 2
  },
  parentGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AccountGroup",
    default: null // null for Level 1 (Main Groups)
  },
  
  type: {
    type: String,
    enum: ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"],
    required: true
  },
  
  // Account Classification for Reports
  accountCategory: {
    type: String,
    enum: ["BALANCE_SHEET", "PROFIT_LOSS"],
    required: true
  },
  
  nature: {
    type: String,
    enum: ["DEBIT", "CREDIT"],
    required: true
  },
  
  // Display order within parent
  sortOrder: { type: Number, default: 0 },
  
  // Posting flag - only Level 3 (ledger accounts) allow posting
  allowPosting: { type: Boolean, default: false },
  
  isActive: { type: Boolean, default: true },
  
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  
  createdDate: { type: Date, default: Date.now },
  updatedDate: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'account_groups'
});

accountGroupSchema.index({ type: 1 });
accountGroupSchema.index({ level: 1 });
accountGroupSchema.index({ parentGroupId: 1 });
accountGroupSchema.index({ isDeleted: 1 });

export default mongoose.model("AccountGroup", accountGroupSchema);
