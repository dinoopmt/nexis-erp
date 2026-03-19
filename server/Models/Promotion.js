import mongoose from "mongoose";

const promotionSchema = new mongoose.Schema(
  {
    promotionName: {
      type: String,
      required: true,
      trim: true,
    },
    promotionType: {
      type: String,
      enum: ["BOGO", "PERCENTAGE", "PERIOD_WISE"],
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
    description: {
      type: String,
      default: "",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    // Buy One Get One Details
    bogoDetails: {
      buyQuantity: {
        type: Number,
        default: 1,
      },
      getQuantity: {
        type: Number,
        default: 1,
      },
      applicableToAll: {
        type: Boolean,
        default: false,
      },
    },
    // Percentage Discount Details
    percentageDetails: {
      discountPercent: {
        type: Number,
        default: 0,
      },
      minPurchaseQuantity: {
        type: Number,
        default: 1,
      },
    },
    // Period-Wise Details
    periodWiseDetails: {
      periods: [
        {
          periodName: String,
          discountPercent: Number,
          startDate: Date,
          endDate: Date,
        },
      ],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
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
  { timestamps: true, collection: "promotions" }
);

export default mongoose.model("Promotion", promotionSchema);
