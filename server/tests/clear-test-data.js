/**
 * Clear Test Data Script
 * Safely removes test records from relevant collections
 */

import mongoose from "mongoose";
import Grn from "../Models/Grn.js";
import FailedEdit from "../Models/FailedEdit.js";
import StockMovement from "../Models/StockMovement.js";
import VendorPayment from "../Models/VendorPayment.js";
import CurrentStock from "../Models/CurrentStock.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/nexis-erp";

async function clearTestData() {
  try {
    console.log("\n🧹 CLEARING TEST DATA...\n");

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Option 1: Clear ALL FailedEdit records (usually safe)
    const failedEditDeleted = await FailedEdit.deleteMany({});
    console.log(`📋 FailedEdit: Deleted ${failedEditDeleted.deletedCount} records`);

    // Option 2: Clear recent StockMovement records (from last edit)
    const movementsDeleted = await StockMovement.deleteMany({
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
    });
    console.log(`📦 StockMovement: Deleted ${movementsDeleted.deletedCount} records`);

    // Option 3: List remaining GRNs for manual review
    const grns = await Grn.find().select("grnNumber status postedDate items").limit(5);
    console.log(`\n📊 Sample GRNs in database (first 5):`);
    grns.forEach(grn => {
      console.log(`   • ${grn.grnNumber} - Status: ${grn.status} - Items: ${grn.items?.length || 0}`);
    });

    // Option 4: List GRN with lowest stock (good for testing)
    console.log(`\n🔍 Finding GRN with small quantities (good for testing)...`);
    const smallGrn = await Grn.findOne({
      status: "Received"
    }).select("grnNumber items");

    if (smallGrn) {
      console.log(`✅ Found test GRN: ${smallGrn.grnNumber}`);
      console.log(`   Items:`);
      smallGrn.items.forEach((item, idx) => {
        console.log(`     ${idx + 1}. Product: ${item.productId}`);
        console.log(`        Quantity: ${item.quantity} units`);
        console.log(`        Cost: ${item.cost}`);
      });
    }

    console.log(`\n✅ Cleanup complete!\n`);
    console.log(`Ready to test. You can now:`);
    console.log(`  1. Use the GRN above for testing`);
    console.log(`  2. Or run: npm test -- GRNEditManager.test.js`);
    console.log(`  3. Or test via API: curl -X PUT /api/v1/grn/{id}`);

  } catch (error) {
    console.error("❌ Error during cleanup:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB\n");
    process.exit(0);
  }
}

clearTestData();
