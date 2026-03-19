import mongoose from "mongoose";

const groupingSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true,
    unique: true,
    uppercase: true
  },
  description: { 
    type: String, 
    trim: true 
  },
  parentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Grouping',
    default: null  // null for top-level groups (departments)
  },
  level: {
    type: String,
    enum: ["1", "2", "3"],  // 1 = Department, 2 = Sub-Department, 3 = Brand
    default: "1"
  },
  isDeleted: { 
    type: Boolean, 
    default: false 
  },
  deletedAt: { 
    type: Date, 
    default: null 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
});

// Index for queries
groupingSchema.index({ parentId: 1, isDeleted: 1 });

export default mongoose.model("Grouping", groupingSchema, 'groupings');
