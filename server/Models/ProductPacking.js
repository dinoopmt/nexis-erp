import mongoose from 'mongoose';

const productPackingSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AddProduct',
      required: [true, 'Product ID is required'],
    },
    packingName: {
      type: String,
      required: [true, 'Packing name is required'],
      trim: true,
    },
    packingSymbol: {
      type: String,
      required: [true, 'Packing symbol is required'],
      uppercase: true,
      trim: true,
    },
    // Conversion factor: how many base units in this packing
    // Example: 1 BOX = 12 PC (factor = 12)
    packingFactor: {
      type: Number,
      required: [true, 'Packing factor is required'],
      min: [0.0001, 'Factor must be greater than 0.0001'],
    },
    // Quantity of items in this packing
    // Example: Box contains 12 items
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    // Unit type for the quantity (usually same as product's unit)
    // Example: PC (pieces)
    unitType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UnitType',
      required: [true, 'Unit type is required'],
    },
    // Price for this packing option
    packingPrice: {
      type: Number,
      min: [0, 'Price cannot be negative'],
      default: 0,
    },
    // Barcode for this specific packing
    barcode: {
      type: String,
      sparse: true,
      trim: true,
    },
    // Whether this is the default packing
    isDefault: {
      type: Boolean,
      default: false,
    },
    // Is this packing option active
    isActive: {
      type: Boolean,
      default: true,
    },
    // Additional notes about packing
    description: {
      type: String,
      trim: true,
    },
    // Stock level at this packing level (optional)
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Reorder level for this packing
    reorderLevel: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Ensure one default per product
productPackingSchema.index({ productId: 1, isDefault: 1 });
productPackingSchema.index({ productId: 1, isActive: 1 });

// Virtual: calculate base unit quantity
productPackingSchema.virtual('baseUnitQuantity').get(function () {
  return this.quantity * this.packingFactor;
});

// Virtual: calculate unit price (price per base unit)
productPackingSchema.virtual('unitPrice').get(function () {
  if (this.packingPrice && this.quantity) {
    return this.packingPrice / this.quantity;
  }
  return 0;
});

// Validation: only one default per product
productPackingSchema.pre('save', async function (next) {
  if (this.isDefault && this.isActive) {
    await this.constructor.updateMany(
      {
        productId: this.productId,
        _id: { $ne: this._id },
        isDefault: true,
      },
      { isDefault: false }
    );
  }
  next();
});

// Method: convert packing quantity to another packing
productPackingSchema.methods.convertToPacking = function (targetPacking, quantity) {
  if (!targetPacking) {
    throw new Error('Target packing is required');
  }

  // Convert to base unit first: quantity * packingFactor
  const baseUnits = quantity * this.packingFactor;

  // Then convert to target packing
  if (targetPacking.packingFactor === 0) {
    throw new Error('Cannot divide by zero factor in target packing');
  }

  return baseUnits / targetPacking.packingFactor;
};

// Method: get cost for specific packing quantity
productPackingSchema.methods.calculateCost = function (quantity) {
  return (this.packingPrice * quantity).toFixed(2);
};

const ProductPacking = mongoose.model('ProductPacking', productPackingSchema);

export default ProductPacking;
