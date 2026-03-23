import mongoose from "mongoose";
import Grn from "../Models/Grn.js";
import CurrentStock from "../Models/CurrentStock.js";
import InventoryBatch from "../Models/InventoryBatch.js";
import SimpleGRNEditManager from "../modules/accounting/services/SimpleGRNEditManager.js";

const MONGO_URI = "mongodb://localhost:27017/NEXIS_ERP_TEST";

async function testGRNEditWithQtyChange() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find any Received GRN with items
    let grn = await Grn.findOne({ status: "Received" }).populate(
      "items.productId vendorId"
    );
    
    if (!grn) {
      console.log("⚠️  No Received GRN found in test database");
      console.log("📝 The test uses NEXIS_ERP_TEST database");
      console.log("   To test with production data, modify MONGO_URI");
      console.log("\n💡 SUMMARY OF WHAT SHOULD HAPPEN:");
      console.log("   1. Find GRN with qty = 10");
      console.log("   2. Edit qty: 10 → 5 (difference = -5)");
      console.log("   3. CurrentStock: increment by -5");
      console.log("   4. InventoryBatch: set to 5");
      console.log("   5. GRN: set items qty = 5");
      process.exit(0);
    }

    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║        TEST: GRN EDIT WITH QUANTITY CHANGE             ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");

    console.log("📋 GRN Found:");
    console.log(`   GRN Number: ${grn.grnNumber}`);
    console.log(`   Items: ${grn.items.length}`);
    console.log(`   First Item:`);
    const firstItem = grn.items[0];
    console.log(`     - Product ID: ${firstItem.productId}`);
    console.log(`     - Quantity: ${firstItem.quantity}`);
    console.log(`     - Unit Cost: ${firstItem.unitCost}`);
    console.log(`     - Total: ${grn.finalTotal}`);

    // Get current stock BEFORE edit
    const currentStockBefore = await CurrentStock.findOne({
      productId: firstItem.productId
    });

    console.log("\n📊 BEFORE EDIT:");
    console.log(`   CurrentStock qty: ${currentStockBefore?.quantityInStock || 0}`);

    // Prepare edit: change qty from 10 → 5 (difference = -5)
    const newQty = 5;
    const oldQty = firstItem.quantity;
    const expectedDifference = newQty - oldQty; // 5 - 10 = -5

    console.log("\n✏️ EDIT OPERATION:");
    console.log(`   Current qty: ${oldQty}`);
    console.log(`   New qty: ${newQty}`);
    console.log(`   Expected difference: ${expectedDifference}`);
    console.log(`   Expected new CurrentStock: ${(currentStockBefore?.quantityInStock || 0) + expectedDifference}`);

    // Execute edit
    const editPayload = {
      items: [
        {
          productId: firstItem.productId,
          productName: firstItem.productName,
          quantity: newQty,
          batchNumber: firstItem.batchNumber || "TEST-BATCH",
          unitCost: firstItem.unitCost,
          totalCost: newQty * firstItem.unitCost
        }
      ],
      notes: firstItem.notes
    };

    console.log(`\n🔄 Sending edit request...`);
    const editResult = await SimpleGRNEditManager.editReceivedGRN(
      grn._id.toString(),
      editPayload,
      grn.createdBy || "test-user"
    );

    if (!editResult.success) {
      console.log(`\n❌ Edit failed: ${editResult.error}`);
      process.exit(1);
    }

    console.log(`\n✅ Edit completed successfully`);

    // Get data AFTER edit
    const grnAfter = await Grn.findOne({ grnNumber: "GRN-2025-2026-00047" });
    const currentStockAfter = await CurrentStock.findOne({
      productId: firstItem.productId
    });

    console.log("\n📊 AFTER EDIT:");
    console.log(`   GRN qty: ${grnAfter.items[0].quantity}`);
    console.log(`   GRN total: ${grnAfter.finalTotal}`);
    console.log(`   CurrentStock qty: ${currentStockAfter?.quantityInStock || 0}`);

    // Verify results
    console.log("\n✔️ VERIFICATION:");
    const grnQtyCorrect = grnAfter.items[0].quantity === newQty;
    const currentStockCorrect =
      (currentStockAfter?.quantityInStock || 0) ===
      (currentStockBefore?.quantityInStock || 0) + expectedDifference;

    console.log(
      `   GRN qty updated: ${grnQtyCorrect ? "✅ YES" : "❌ NO"} (expected ${newQty}, got ${grnAfter.items[0].quantity})`
    );
    console.log(
      `   CurrentStock adjusted: ${currentStockCorrect ? "✅ YES" : "❌ NO"}`
    );
    console.log(
      `     Before: ${currentStockBefore?.quantityInStock || 0} + ${expectedDifference} = ${(currentStockBefore?.quantityInStock || 0) + expectedDifference}`
    );
    console.log(
      `     After: ${currentStockAfter?.quantityInStock || 0}`
    );

    if (grnQtyCorrect && currentStockCorrect) {
      console.log("\n✅ TEST PASSED - All collections updated correctly!");
    } else {
      console.log("\n❌ TEST FAILED - Collections not updated properly");
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Test error:", error);
    process.exit(1);
  }
}

testGRNEditWithQtyChange();
