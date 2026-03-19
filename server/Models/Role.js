import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      default: "",
    },
    activityLevel: {
      type: String,
      enum: ["Basic", "Intermediate", "Advanced", "Full Admin"],
      default: "Basic",
    },
    permissions: [
      {
        type: String,
        enum: [
          // User Management
          "MANAGE_USERS",
          "MANAGE_ROLES",
          // Sales Module
          "VIEW_SALES",
          "CREATE_SALES_INVOICE",
          "MANAGE_SALES_RETURN",
          // Inventory Module
          "VIEW_INVENTORY",
          "MANAGE_PRODUCTS",
          "MANAGE_WAREHOUSE",
          // Accounts Module
          "VIEW_ACCOUNTS",
          "CREATE_JOURNAL_ENTRY",
          "MANAGE_CHART_ACCOUNTS",
          // Reports & Settings
          "VIEW_REPORTS",
          "MANAGE_COMPANY_SETTINGS",
          "MANAGE_SYSTEM_SETTINGS",
        ],
      },
    ],
    userCount: {
      type: Number,
      default: 0,
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
  { timestamps: true, collection: 'roles' }
);

export default mongoose.model("Role", roleSchema);
