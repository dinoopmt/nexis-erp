/**
 * Test GRN edit directly
 */

import mongoose from "mongoose";
import Grn from "../Models/Grn.js";
import GRNEditManager from "../modules/accounting/services/GRNEditManager.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/nexis-erp";

async function testEdit() {
  try {
    console.log("\n🧪 TESTING GRN EDIT...\n");

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find test GRN
    const grn = await Grn.findOne({ grnNumber: { $regex: "GRN-TEST" } });
    
    if (!grn) {
      console.log("❌ No test GRN found. Creating one...");
      process.exit(1);
    }

    console.log(`\n📝 Found test GRN: ${grn.grnNumber}`);
    console.log(`   ID: ${grn._id}`);
    console.log(`   Status: ${grn.status}`);
    console.log(`   Items: ${grn.items.length}`);
    console.log(`   Original Total: ${grn.finalTotal}`);

    // Prepare edit changes
    const changes = {
      items: [
        {
          productId: grn.items[0].productId,
          itemName: grn.items[0].itemName,
          itemCode: grn.items[0].itemCode,
          quantity: 15, // Change from 10 to 15
          unitCost: 120, // Change from 100 to 120
          totalCost: 1800, // 15 * 120
        }
      ]
    };

    const userId = new mongoose.Types.ObjectId();

    console.log(`\n🔄 Attempting edit...`);
    console.log(`   New Quantity: 15 (from 10)`);
    console.log(`   New Unit Cost: 120 (from 100)`);
    console.log(`   User: ${userId}`);

    const result = await GRNEditManager.editPostedGRNWithTransaction(
      grn._id,
      changes,
      userId
    );

    console.log(`\n✅ EDIT SUCCESSFUL!`);
    console.log(`   Result:`);
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error("❌ Edit failed:", error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testEdit();
