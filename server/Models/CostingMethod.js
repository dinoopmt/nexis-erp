import mongoose from 'mongoose';

const CostingMethodSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      unique: true,
      index: true,
    },
    defaultCostingMethod: {
      type: String,
      enum: ['FIFO', 'LIFO', 'WAC'],
      required: true,
      default: 'FIFO',
    },
    allowMultipleMethods: {
      type: Boolean,
      default: false,
      description: 'If true, different products can use different methods',
    },
    productCostingMethods: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'AddProduct',
        },
        costingMethod: {
          type: String,
          enum: ['FIFO', 'LIFO', 'WAC'],
        },
      },
    ],
    wacCalculationFrequency: {
      type: String,
      enum: ['PERPETUAL', 'PERIODIC'],
      default: 'PERPETUAL',
      description:
        'PERPETUAL = after each transaction, PERIODIC = at end of period',
    },
    enableAutoCloseBatches: {
      type: Boolean,
      default: true,
      description: 'Auto-close batches when quantityRemaining = 0',
    },
    enableCostAdjustment: {
      type: Boolean,
      default: false,
      description: 'Allow adjusting batch costs for landed costs',
    },
    lastAuditDate: {
      type: Date,
    },
    auditNotes: {
      type: String,
    },
    description: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true, collection: 'costing_methods' }
);

export default mongoose.model('CostingMethod', CostingMethodSchema);
