import mongoose from 'mongoose';

const CurrentStockSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AddProduct',
      required: true,
      unique: true,
    },
    
    // ✅ NEW: Multi-Store Support - Branch/Organization Association
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
      description: "Branch/Organization this stock entry belongs to - null for global/main store"
    },
    
    // ✅ CURRENT STOCK QUANTITIES
    totalQuantity: {
      type: Number,
      default: 0,
      min: 0,
      description: "Total physical stock in inventory"
    },
    
    allocatedQuantity: {
      type: Number,
      default: 0,
      min: 0,
      description: "Quantity allocated to pending sales orders"
    },
    
    availableQuantity: {
      type: Number,
      default: 0,
      description: "Available for sale = totalQuantity - allocatedQuantity (computed)"
    },
    
    // ✅ TRANSACTION COUNTERS
    grnReceivedQuantity: {
      type: Number,
      default: 0,
      min: 0,
      description: "Total quantity received via GRN"
    },
    
    rtvReturnedQuantity: {
      type: Number,
      default: 0,
      min: 0,
      description: "Total quantity returned via RTV"
    },
    
    salesOutQuantity: {
      type: Number,
      default: 0,
      min: 0,
      description: "Total quantity sold via Sales"
    },
    
    salesReturnQuantity: {
      type: Number,
      default: 0,
      min: 0,
      description: "Total quantity returned via Sales Return"
    },
    
    adjustmentQuantity: {
      type: Number,
      default: 0,
      description: "Net adjustments from Inventory Adjustment (can be negative)"
    },
    
    // ✅ STAGING & PENDING
    grnInTransitQuantity: {
      type: Number,
      default: 0,
      min: 0,
      description: "GRN items in transit (not yet received)"
    },
    
    damageQuality: {
      type: Number,
      default: 0,
      min: 0,
      description: "Quantity marked as damaged/defective"
    },
    
    // ✅ VALUE TRACKING
    totalCost: {
      type: Number,
      default: 0,
      min: 0,
      description: "Total cost of current inventory (FIFO method)"
    },
    
    averageCost: {
      type: Number,
      default: 0,
      min: 0,
      description: "Average cost per unit"
    },
    
    // ✅ THRESHOLDS
    minStockLevel: {
      type: Number,
      default: 0,
      min: 0,
      description: "Minimum stock alert threshold"
    },
    
    maxStockLevel: {
      type: Number,
      default: 0,
      min: 0,
      description: "Maximum stock capacity"
    },
    
    reorderQuantity: {
      type: Number,
      default: 0,
      min: 0,
      description: "Quantity to order when stock is low"
    },
    
    // ✅ AUDIT TRAIL
    lastGrnDate: {
      type: Date,
      default: null,
      description: "Last GRN received date"
    },
    
    lastSaleDate: {
      type: Date,
      default: null,
      description: "Last sale date"
    },
    
    lastAdjustmentDate: {
      type: Date,
      default: null,
      description: "Last inventory adjustment date"
    },
    
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    
    // ✅ REMOVED: Unbounded updateHistory array
    // Reason: Array grows indefinitely, causes performance issues after 2-3 months
    // Solution: Use StockMovement collection for complete audit trail
    // For quick access to recent activity, use lastActivity field below
    
    lastActivity: {
      timestamp: { type: Date, default: null },
      type: { type: String },  // GRN, RTV, SALES, SALES_RETURN, ADJUSTMENT
      referenceId: { type: mongoose.Schema.Types.ObjectId },
      reference: { type: String }
    },
    
    // ✅ METADATA
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    
    notes: String,
  },
  {
    timestamps: true,
    collection: 'current_stock',
  }
);

// ✅ VIRTUAL for available quantity
CurrentStockSchema.virtual('availableQty').get(function() {
  return Math.max(0, this.totalQuantity - this.allocatedQuantity - this.damageQuality);
});

// ✅ INDEX for quick lookups
CurrentStockSchema.index({ totalQuantity: 1 });
CurrentStockSchema.index({ availableQuantity: 1 });
CurrentStockSchema.index({ lastUpdatedBy: 1, updatedAt: -1 });

// ✅ REMOVED complex pre-hook - simpler approach: set values directly in creation/update code
// Pre-hooks can cause issues with Mongoose middleware, avoiding them for better reliability

export default mongoose.model('CurrentStock', CurrentStockSchema, 'current_stock');
