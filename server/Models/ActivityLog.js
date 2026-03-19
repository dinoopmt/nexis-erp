import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: [
        "LOGIN",
        "LOGOUT",
        "CREATE",
        "READ",
        "UPDATE",
        "DELETE",
        "EXPORT",
        "IMPORT",
      ],
      required: true,
    },
    module: {
      type: String,
      enum: [
        "Users",
        "Roles",
        "Sales",
        "Inventory",
        "Accounts",
        "Reports",
        "Settings",
      ],
      required: true,
    },
    resource: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    permission: {
      type: String,
      default: "",
    },
    ipAddress: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["success", "failed", "pending"],
      default: "success",
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false, collection: 'activity_logs' }
);

export default mongoose.model("ActivityLog", activityLogSchema);
