import mongoose from 'mongoose';

const printerConfigurationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      example: 'TSC_50MM_PRICE_TAG',
    },
    configTxt: {
      type: String,
      required: true,
      description: 'Raw printer command template with placeholders like {ITEM_NAME}, {BARCODE}, {PRICE}',
    },
    legends: {
      type: String,
      required: true,
      trim: true,
      description: 'Display name for UI',
    },
    description: {
      type: String,
      default: '',
      description: 'Human-readable description of this configuration',
    },
    printerModel: {
      type: String,
      enum: ['TSC', 'ZEBRA', 'BROTHER', 'DYMO', 'EPSON', 'CUSTOM'],
      default: 'TSC',
      description: 'Target printer model',
    },
    labelWidth: {
      type: Number,
      default: 38,
      description: 'Label width in MM',
    },
    labelHeight: {
      type: Number,
      default: 25,
      description: 'Label height in MM',
    },
    variables: {
      type: [String],
      description: 'Array of placeholder variables used in template',
      example: ['ITEM_NAME', 'BARCODE', 'DECIMAL_ITEM_PRICE', 'LABEL_QUANTITY'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      description: 'Company scope for this configuration',
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: String,
      default: 'System',
    },
    updatedBy: {
      type: String,
      default: 'System',
    },
  },
  {
    timestamps: true,
    collection: 'printer_configurations',
  }
);

// Index for faster queries
printerConfigurationSchema.index({ name: 1, deleted: 0 });
printerConfigurationSchema.index({ isActive: 1, deleted: 0 });
printerConfigurationSchema.index({ companyId: 1, deleted: 0 });

export default mongoose.model('PrinterConfiguration', printerConfigurationSchema);
