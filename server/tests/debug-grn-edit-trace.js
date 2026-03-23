/**
 * Debug: GRN Edit - Trace All Collection Updates
 * 
 * This test shows EXACTLY what happens when you edit a GRN
 * - What data comes in
 * - What changes are calculated
 * - What updates happen to each collection
 * - What output is returned
 */

import mongoose from "mongoose";
import Grn from "../Models/Grn.js";
import SimpleGRNEditManager from "../modules/accounting/services/SimpleGRNEditManager.js";

const MONGO_URI = "mongodb://localhost:27017/NEXIS_ERP_TEST";

async function debugGrnEdit() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    console.log("╔═════════════════════════════════════════════════════╗");
    console.log("║  DEBUG: GRN EDIT - TRACE ALL COLLECTION UPDATES    ║");
    console.log("╚═════════════════════════════════════════════════════╝\n");

    // Find a Received GRN with items
    const testGrn = await Grn.findOne({
      status: "Received"
    }).populate("items.productId");

    if (!testGrn) {
      console.log("❌ No Received GRN found");
      return;
    }

    console.log(`📋 Found GRN: ${testGrn.grnNumber}`);
    console.log(`   Status: ${testGrn.status}`);
    console.log(`   Items: ${testGrn.items.length}`);
    console.log(`   Current total: ${testGrn.finalTotal}\n`);

    // ====================================================
    // PREPARE EDIT - Change quantity of FIRST item
    // ====================================================
    console.log(`\n╔════ STEP 1: PREPARE EDIT ════╗\n`);

    const firstItem = testGrn.items[0];
    const originalQty = firstItem.quantity;
    const newQty = originalQty > 5 ? originalQty - 2 : originalQty + 2;

    console.log(`Editing first item:`);
    console.log(`  Product: ${firstItem.itemName}`);
    console.log(`  Current qty: ${originalQty}`);
    console.log(`  New qty: ${newQty}`);
    console.log(`  Change: ${newQty - originalQty > 0 ? '+' : ''}${newQty - originalQty}\n`);

    // Prepare changes exactly as would come from API
    const editChanges = {
      items: testGrn.items.map((item, idx) => ({
        _id: item._id,
        productId: item.productId._id,  // Use ObjectId
        itemName: item.itemName,
        itemCode: item.itemCode,
        quantity: idx === 0 ? newQty : item.quantity,  // Change only first item
        unitCost: item.unitCost,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        foc: item.foc,
        focQty: item.focQty,
        itemDiscount: item.itemDiscount,
        itemDiscountPercent: item.itemDiscountPercent,
        taxType: item.taxType,
        taxPercent: item.taxPercent,
        totalCost: idx === 0 ? newQty * item.unitCost : item.totalCost
      })),
      notes: testGrn.notes
    };

    console.log(`📦 Change object prepared:`, {
      itemsCount: editChanges.items.length,
      firstItemQty: editChanges.items[0].quantity,
      firstItemCost: editChanges.items[0].totalCost
    });

    // ====================================================
    // EXECUTE EDIT
    // ====================================================
    console.log(`\n╔════ STEP 2: EXECUTE EDIT ════╗\n`);

    const editResult = await SimpleGRNEditManager.editReceivedGRN(
      testGrn._id,
      editChanges,
      "debug_test_user"
    );

    // ====================================================
    // DISPLAY RESULT
    // ====================================================
    console.log(`\n╔════ STEP 3: RESULT ════╗\n`);

    if (editResult.success) {
      console.log(`✅ EDIT SUCCEEDED!\n`);
      console.log(`Collections Updated:`, editResult.collectionsUpdated);
      console.log(`\nSummary:`, editResult.summary);
      console.log(`\nValidations:`, editResult.validations);
    } else {
      console.log(`❌ EDIT FAILED!\n`);
      console.log(`Error: ${editResult.error}\n`);
      console.log(`Validations:`, editResult.validations);
    }

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB\n");
  }
}

// Run debug
debugGrnEdit();
