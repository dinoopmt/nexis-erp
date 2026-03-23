/**
 * Test: Simple GRN Edit
 * 
 * Scenario:
 * 1. Create test GRN
 * 2. Edit with new items
 * 3. Verify simple validation works
 */

import mongoose from "mongoose";
import Grn from "../Models/Grn.js";
import VendorPayment from "../Models/VendorPayment.js";
import SimpleGRNEditManager from "../modules/accounting/services/SimpleGRNEditManager.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/nexis-erp";

async function testSimpleEdit() {
  try {
    console.log("\n🧪 TESTING SIMPLE GRN EDIT\n");
    
    await mongoose.connect(MONGODB_URI);

    // Find a test GRN with Received status
    const grn = await Grn.findOne({ status: "Received" })
      .select("grnNumber _id items status");

    if (!grn) {
      console.log("❌ No Received GRN found in database");
      process.exit(1);
    }

    console.log(`📝 Found test GRN: ${grn.grnNumber}`);
    console.log(`   Status: ${grn.status}`);
    console.log(`   Items: ${grn.items.length}`);
    console.log(`   Current Qty: ${grn.items[0]?.quantity || 0}\n`);

    // Prepare edit changes
    const changes = {
      items: [
        {
          productId: grn.items[0].productId,
          itemName: grn.items[0].itemName,
          itemCode: grn.items[0].itemCode,
          quantity: 5,  // Change quantity
          unitCost: 15,
          totalCost: 75
        }
      ],
      notes: "Updated via simple edit"
    };

    console.log(`📊 Editing:`);
    console.log(`   New Qty: 5`);
    console.log(`   New Unit Cost: 15`);
    console.log(`   New Total: 75\n`);

    // Test the simple edit
    const result = await SimpleGRNEditManager.editReceivedGRN(
      grn._id,
      changes,
      new mongoose.Types.ObjectId()
    );

    if (result.success) {
      console.log(`\n✅ EDIT SUCCESSFUL`);
      console.log(`   GRN: ${result.grn.grnNumber}`);
      console.log(`   New Total: ${result.grn.finalTotal}`);
      console.log(`   Items: ${result.grn.items.length}`);
    } else {
      console.log(`\n❌ EDIT FAILED`);
      console.log(`   Error: ${result.error}`);
    }

    console.log(`\n✅ Simple edit test complete\n`);

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testSimpleEdit();
