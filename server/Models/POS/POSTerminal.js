import mongoose from 'mongoose';

const posTerminalSchema = new mongoose.Schema(
  {
    terminalId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      description: 'Unique terminal identifier (e.g., POS-001, POS-MAIN)',
    },
    terminalName: {
      type: String,
      required: true,
      trim: true,
      description: 'User-friendly name for the terminal',
    },
    location: {
      type: String,
      trim: true,
      description: 'Physical location of the terminal',
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'active',
    },
    hardware: {
      printer: {
        type: String,
        default: '',
        description: 'Printer model/port (e.g., COM1, IP:192.168.1.100)',
      },
      scanner: {
        type: String,
        default: '',
        description: 'Barcode scanner model/port',
      },
      display: {
        type: String,
        default: 'Built-in',
      },
    },
    currentShift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'POSShift',
      default: null,
      description: 'Reference to currently active shift',
    },
    lastShift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'POSShift',
      default: null,
      description: 'Reference to last closed shift',
    },
    settings: {
      currency: {
        type: String,
        default: 'USD',
      },
      decimalPlaces: {
        type: Number,
        default: 2,
      },
      taxIncluded: {
        type: Boolean,
        default: false,
      },
    },
    isDeleted: {
      type: Boolean,
      default: false,
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
  { timestamps: true, collection: 'pos_terminals' }
);

export default mongoose.model('POSTerminal', posTerminalSchema);
