import mongoose from "mongoose";

const financialYearSchema = new mongoose.Schema({
  // Financial Year Code (e.g., "FY2025-26", "FY2026-27")
  yearCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  
  // Display name (e.g., "Financial Year 2025-2026")
  yearName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Start and End dates
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  
  // Financial Year Status
  status: {
    type: String,
    enum: ["OPEN", "CLOSED", "LOCKED"],
    default: "OPEN"
  },
  
  // Is this the current active financial year?
  isCurrent: {
    type: Boolean,
    default: false
  },
  
  // Allow posting to this year
  allowPosting: {
    type: Boolean,
    default: true
  },
  
  // Year-end closing details
  closingDate: {
    type: Date,
    default: null
  },
  closedBy: {
    type: String,
    default: ""
  },
  
  // Opening balances carried forward from previous year
  openingBalancesPosted: {
    type: Boolean,
    default: false
  },
  openingBalancesDate: {
    type: Date,
    default: null
  },
  
  // Previous financial year reference (for carry forward)
  previousYearId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FinancialYear",
    default: null
  },
  
  // Notes/remarks
  remarks: {
    type: String,
    default: ""
  },
  
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, {
  timestamps: true
});

// Indexes
financialYearSchema.index({ status: 1 });
financialYearSchema.index({ isCurrent: 1 });
financialYearSchema.index({ startDate: 1, endDate: 1 });
financialYearSchema.index({ isDeleted: 1 });

// Ensure only one financial year is marked as current
financialYearSchema.pre('save', async function(next) {
  if (this.isCurrent && this.isModified('isCurrent')) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, isCurrent: true },
      { isCurrent: false }
    );
  }
  next();
});

// Virtual to check if year is active (open and within date range)
financialYearSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'OPEN' && 
         this.allowPosting && 
         now >= this.startDate && 
         now <= this.endDate;
});

// Method to check if a date falls within this financial year
financialYearSchema.methods.containsDate = function(date) {
  const checkDate = new Date(date);
  return checkDate >= this.startDate && checkDate <= this.endDate;
};

// Static method to get current financial year
financialYearSchema.statics.getCurrentYear = async function() {
  return this.findOne({ isCurrent: true, isDeleted: false });
};

// Static method to get financial year for a specific date
financialYearSchema.statics.getYearForDate = async function(date) {
  const checkDate = new Date(date);
  return this.findOne({
    startDate: { $lte: checkDate },
    endDate: { $gte: checkDate },
    isDeleted: false
  });
};

export default mongoose.model("FinancialYear", financialYearSchema, 'financial_years');
