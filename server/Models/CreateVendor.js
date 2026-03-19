import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    vendorCode: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    taxNumber: {
      type: String,
      uppercase: true,
      trim: true,
    },
    // GST Number - India vendors (secondary GSTIN)
    gstNumber: {
      type: String,
      uppercase: true,
      trim: true,
      description: "Secondary GSTIN for India vendors (optional alternate identifier)"
    },
    // VAT ID - UAE and Oman vendors
    vatId: {
      type: String,
      uppercase: true,
      trim: true,
      description: "VAT Registration ID for UAE/Oman vendors"
    },
    // Country isolation: Link vendor to specific country (NOT international vendor)
    country: {
      type: String,
      enum: ['AE', 'OM', 'IN'],
      required: true,
      index: true,
      description: "Country where vendor operates - enforces individual country operations"
    },
    // Tax Type - India only (GST Act 2017 classification)
    taxType: {
      type: String,
      enum: ['Registered', 'Unregistered', 'Non-resident', 'SEZ', 'Government Entity', 'Other', null],
      default: null,
      description: "GST classification for India vendors only"
    },
    // Tax Group - Reference to TaxMaster for India vendors
    taxGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaxMaster',
      description: "Reference to tax group for India vendors (determines GST rate)"
    },
    paymentTerms: {
      type: String,
      enum: ["NET 30", "NET 60", "NET 90", "Immediate", "Custom", null],
      default: "NET 30",
      description: "Payment terms - null for Cash payments"
    },
    // Payment Type - Cash or Credit
    paymentType: {
      type: String,
      enum: ["Cash", "Credit"],
      default: "Credit",
      description: "Payment method: Cash (immediate) or Credit (with terms)"
    },
    // Credit Days - Only applicable when paymentType is "Credit"
    creditDays: {
      type: Number,
      enum: [0, 30, 60, 90, 120],
      default: 30,
      description: "Number of days for credit payment (30, 60, 90, 120 days)"
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Blacklisted", "On Hold"],
      default: "Active",
    },
    bankName: {
      type: String,
      trim: true,
    },
    accountNumber: {
      type: String,
      trim: true,
    },
    accountHolder: {
      type: String,
      trim: true,
    },
    // Account Mapping - Link vendor to Accounts Payable account
    accountPayableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccounts',
      description: "Reference to Accounts Payable account for this vendor"
    },
    // ✅ ADDED: Vendor Type - Can be supplier, shipper, or both
    isSupplier: {
      type: Boolean,
      default: true,
      description: "Can this vendor provide goods/services (supplier)"
    },
    isShipper: {
      type: Boolean,
      default: false,
      description: "Can this vendor provide shipping/logistics services"
    },
    isCustomer: {
      type: Boolean,
      default: false,
      description: "Can this vendor also act as a customer (buyer from us)"
    },
    // ✅ DUAL ROLE ACCOUNTING: Account for vendor+customer relationships
    dualRoleAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccounts',
      default: null,
      description: "Related Parties account when vendor is both supplier and customer"
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, collection: 'vendors' }
);

// Indexes for tax and country operations
vendorSchema.index({ country: 1, isActive: 1 }); // Filter vendors by country
vendorSchema.index({ country: 1, taxType: 1 }); // Filter India vendors by tax type
vendorSchema.index({ gstNumber: 1, sparse: true }); // Unique lookup for GST numbers
vendorSchema.index({ vatId: 1, sparse: true }); // Unique lookup for VAT IDs
vendorSchema.index({ taxGroupId: 1 }); // Lookup vendors by tax group
vendorSchema.index({ accountPayableId: 1, sparse: true }); // Lookup vendors by account mapped

export default mongoose.model("Vendor", vendorSchema);
