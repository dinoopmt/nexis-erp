import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
  customerCode: {
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
  gstNumber: {
    type: String,
    uppercase: true,
    trim: true,
  },
  // Country isolation: Link customer to specific country (NOT international sales)
  country: {
    type: String,
    enum: ['AE', 'OM', 'IN'],
    required: true,
    index: true,
    description: "Country where customer operates - enforces individual country operations"
  },
  // India GST-based tax fields
  taxType: {
    type: String,
    enum: ["Registered", "Unregistered", "Non-resident", "SEZ", "Government Entity", "Other"],
    default: null,
    description: "GST tax type for India companies only (Central Goods and Services Tax Act 2017)"
  },
  taxGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TaxMaster",
    default: null,
  },
  paymentType: {
    type: String,
    enum: ["Credit Sale", "Cash Sale"],
    default: "Credit Sale",
  },
  paymentTerms: {
    type: String,
    default: "NET 30",
  },
  creditLimit: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["Active", "Inactive", "Blacklisted", "On Hold"],
    default: "Active",
  },
  ledgerAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChartOfAccounts",
    default: null,
  },
  image: {
    type: String,
    default: null,
  },
  documents: [{
    name: {
      type: String,
      required: true,
    },
    data: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  isSupplier: {
    type: Boolean,
    default: false,
    description: "Can this customer also act as a supplier/vendor (sell to us)"
  },
  // ✅ DUAL ROLE ACCOUNTING: Account for customer+supplier relationships
  linkedDualVendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    default: null,
    description: "Link to vendor with dual role when customer is also a supplier"
  },
  dualRoleAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccounts',
    default: null,
    description: "Related Parties account when customer is also a supplier"
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
  updatedDate: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  collection: 'customers'
});

customerSchema.index({ name: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ isDeleted: 1 });

export default mongoose.model("Customer", customerSchema);
