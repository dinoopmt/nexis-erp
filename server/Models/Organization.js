import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['HEAD_OFFICE', 'BRANCH'],
      default: 'BRANCH',
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
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
organizationSchema.index({ parentId: 1 });
organizationSchema.index({ type: 1 });

export default mongoose.model('Organization', organizationSchema);
