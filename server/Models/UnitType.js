import mongoose from 'mongoose';

const UnitTypeSchema = new mongoose.Schema(
  {
    unitName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      example: 'Kilogram, Piece, Meter, Liter'
    },
    unitSymbol: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 10,
      example: 'kg, pc, m, L'
    },
    factor: {
      type: Number,
      required: true,
      min: 0.000001,
      example: '1 for base unit, 1000 for smaller unit (g = 0.001 kg)'
    },
    unitDecimal: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
      default: 2,
      example: '2 for kg, 3 for grams'
    },
    category: {
      type: String,
      enum: ['WEIGHT', 'LENGTH', 'VOLUME', 'QUANTITY', 'AREA', 'OTHER'],
      default: 'QUANTITY'
    },
    baseUnit: {
      type: Boolean,
      default: false,
      description: 'If true, this is the base unit for the category. Only one base unit per category'
    },
    description: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    conversionNote: {
      type: String,
      description: 'Notes about conversion for user reference'
    }
  },
  {
    timestamps: true
  }
);

// Index for frequent queries
UnitTypeSchema.index({ category: 1 });
UnitTypeSchema.index({ isActive: 1 });

export default mongoose.model('UnitType', UnitTypeSchema);
