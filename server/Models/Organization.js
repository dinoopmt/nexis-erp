import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['HEAD_OFFICE', 'REGIONAL', 'BRANCH', 'STORE'],
      default: 'BRANCH',
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    level: {
      type: Number,
      default: 0,
    },
    address: String,
    city: String,
    country: {
      type: String,
      enum: ['AE', 'OM', 'IN'],
      required: true,
    },
    postalCode: String,
    phone: String,
    email: String,
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    currency: {
      type: String,
      enum: ['AED', 'USD', 'INR', 'OMR'],
      default: 'AED',
    },
    timezone: {
      type: String,
      default: 'Asia/Dubai',
    },
    taxNumber: String,
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    allowInventoryTransfer: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: String,
    updatedBy: String,
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
// Note: code has unique:true which creates an index, so not adding duplicate
organizationSchema.index({ parentId: 1 });
organizationSchema.index({ type: 1 });
organizationSchema.index({ country: 1 });

export default mongoose.model('Organization', organizationSchema);
