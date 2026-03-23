/**
 * Test: GRN Edit - Verify ALL Collections Updated
 * 
 * This test verifies:
 * 1. GRN Collection - items, amounts updated
 * 2. CurrentStock Collection - qty adjusted
 * 3. InventoryBatch Collection - batch qty updated
 * 4. VendorPayment Collection - payment amount updated
 */

import mongoose from "mongoose";
import Grn from "../Models/Grn.js";
import VendorPayment from "../Models/VendorPayment.js";
import InventoryBatch from "../Models/InventoryBatch.js";
import CurrentStock from "../Models/CurrentStock.js";
import SimpleGRNEditManager from "../modules/accounting/services/SimpleGRNEditManager.js";

const MONGO_URI = "mongodb://localhost:27017/NEXIS_ERP_TEST";

async function testAllCollectionsUpdated() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get a test GRN (Received status)
    const testGrn = await Grn.findOne({
      status: "Received",
      grnNumber: { $regex: "GRN-TEST" }
    }).populate("items.productId");

    if (!testGrn) {
      console.log("❌ No test Received GRN found");
      return;
    }

    console.log("╔════════════════════════════════════════════════════════╗");
    console.log("║  TEST: GRN EDIT - ALL COLLECTIONS UPDATED             ║");
    console.log("╚════════════════════════════════════════════════════════╝");

    console.log(`\n📋 Test GRN: ${testGrn.grnNumber} (Status: ${testGrn.status})`);
    console.log(`   Items: ${testGrn.items.length}`);

    // ====================================================
    // STEP 1: READ ALL COLLECTIONS BEFORE EDIT
    // ====================================================
    console.log("\n╔════ STEP 1: BEFORE EDIT ════╗\n");

    const statesBefore = {
      grnItems: testGrn.items.map(item => ({
        productName: item.productName,
        oldQty: item.quantity,
        batchNumber: item.batchNumber
      })),
      currentStock: {},
      inventoryBatch: {},
      vendorPayment: null
    };

    // Read CurrentStock
    console.log("📊 CurrentStock (Before):");
    for (const item of testGrn.items) {
      const stock = await CurrentStock.findOne({ productId: item.productId });
      statesBefore.currentStock[item.productId] = stock?.quantityInStock || 0;
      console.log(`   ${item.productName}: ${statesBefore.currentStock[item.productId]} units`);
    }

    // Read InventoryBatch
    console.log("\n📦 InventoryBatch (Before):");
    for (const item of testGrn.items) {
      const batch = await InventoryBatch.findOne({
        grnId: testGrn.grnNumber,
        batchNumber: item.batchNumber,
        productId: item.productId
      });
      const batchQty = batch?.quantity || batch?.baseUnits || 0;
      statesBefore.inventoryBatch[item.batchNumber] = batchQty;
      console.log(`   Batch ${item.batchNumber}: ${batchQty} units`);
    }

    // Read VendorPayment
    console.log("\n💳 VendorPayment (Before):");
    const payment = await VendorPayment.findOne({ grnId: testGrn.grnNumber });
    if (payment) {
      statesBefore.vendorPayment = {
        initialAmount: payment.initialAmount,
        balance: payment.balance,
        paymentStatus: payment.paymentStatus
      };
      console.log(`   Amount: ${payment.initialAmount}`);
      console.log(`   Balance: ${payment.balance}`);
      console.log(`   Status: ${payment.paymentStatus}`);
    } else {
      console.log("   Not found");
    }

    // ====================================================
    // STEP 2: PREPARE EDIT
    // ====================================================
    console.log("\n╔════ STEP 2: PREPARE EDIT ════╗\n");

    const firstItem = testGrn.items[0];
    const oldQty = firstItem.quantity;
    const newQty = oldQty + 10;

    console.log(`📝 Editing: ${firstItem.productName}`);
    console.log(`   Old qty: ${oldQty}`);
    console.log(`   New qty: ${newQty}`);
    console.log(`   Difference: +10`);

    const editChanges = {
      items: testGrn.items.map(item =>
        item.productId?.toString() === firstItem.productId?.toString()
          ? { ...item, quantity: newQty }
          : item
      ),
      notes: testGrn.notes + " [TEST EDIT]"
    };

    // ====================================================
    // STEP 3: EXECUTE EDIT
    // ====================================================
    console.log("\n╔════ STEP 3: EXECUTE EDIT ════╗\n");

    const editResult = await SimpleGRNEditManager.editReceivedGRN(
      testGrn._id,
      editChanges,
      "test_user_collections"
    );

    if (!editResult.success) {
      console.log(`❌ Edit failed: ${editResult.error}`);
      return;
    }

    console.log("\n✅ Edit succeeded!\n");
    console.log("Collections Updated:");
    Object.entries(editResult.collectionsUpdated).forEach(([coll, updated]) => {
      console.log(`   ${updated ? '✅' : '❌'} ${coll}`);
    });

    // ====================================================
    // STEP 4: READ ALL COLLECTIONS AFTER EDIT
    // ====================================================
    console.log("\n╔════ STEP 4: AFTER EDIT ════╗\n");

    const statesAfter = {
      grnItems: editResult.grn.items.map(item => ({
        productName: item.productName,
        newQty: item.quantity,
        batchNumber: item.batchNumber
      })),
      currentStock: {},
      inventoryBatch: {},
      vendorPayment: null
    };

    // Read CurrentStock
    console.log("📊 CurrentStock (After):");
    for (const item of editResult.grn.items) {
      const stock = await CurrentStock.findOne({ productId: item.productId });
      statesAfter.currentStock[item.productId] = stock?.quantityInStock || 0;
      const change = statesAfter.currentStock[item.productId] - statesBefore.currentStock[item.productId];
      const changeStr = change > 0 ? `+${change}` : `${change}`;
      console.log(
        `   ${item.productName}: ${statesBefore.currentStock[item.productId]} → ${statesAfter.currentStock[item.productId]} (${changeStr})`
      );
    }

    // Read InventoryBatch
    console.log("\n📦 InventoryBatch (After):");
    for (const item of editResult.grn.items) {
      const batch = await InventoryBatch.findOne({
        grnId: testGrn.grnNumber,
        batchNumber: item.batchNumber,
        productId: item.productId
      });
      const batchQty = batch?.quantity || batch?.baseUnits || 0;
      statesAfter.inventoryBatch[item.batchNumber] = batchQty;
      const batchBefore = statesBefore.inventoryBatch[item.batchNumber];
      const change = batchQty - batchBefore;
      const changeStr = change > 0 ? `+${change}` : `${change}`;
      console.log(
        `   Batch ${item.batchNumber}: ${batchBefore} → ${batchQty} (${changeStr})`
      );
    }

    // Read VendorPayment
    console.log("\n💳 VendorPayment (After):");
    const paymentAfter = await VendorPayment.findOne({ grnId: testGrn.grnNumber });
    if (paymentAfter) {
      statesAfter.vendorPayment = {
        initialAmount: paymentAfter.initialAmount,
        balance: paymentAfter.balance,
        paymentStatus: paymentAfter.paymentStatus
      };
      const amountChange = paymentAfter.initialAmount - statesBefore.vendorPayment.initialAmount;
      const amountChangeStr = amountChange > 0 ? `+${amountChange}` : `${amountChange}`;
      console.log(`   Amount: ${statesBefore.vendorPayment.initialAmount} → ${paymentAfter.initialAmount} (${amountChangeStr})`);
      console.log(`   Balance: ${statesBefore.vendorPayment.balance} → ${paymentAfter.balance}`);
      console.log(`   Status: ${paymentAfter.paymentStatus}`);
    }

    // ====================================================
    // STEP 5: VERIFICATION
    // ====================================================
    console.log("\n╔════ STEP 5: VERIFICATION ════╗\n");

    let allCorrect = true;

    // Verify GRN updated
    const grnQtyMatch = editResult.grn.items[0].quantity === newQty;
    console.log(`📋 GRN items updated: ${grnQtyMatch ? '✅' : '❌'}`);
    if (!grnQtyMatch) allCorrect = false;

    // Verify CurrentStock adjusted
    const stockAdjust = statesAfter.currentStock[firstItem.productId] - statesBefore.currentStock[firstItem.productId];
    const stockCorrect = stockAdjust === 10;
    console.log(`📊 CurrentStock adjusted correctly (+10): ${stockCorrect ? '✅' : '❌'} (actual: ${stockAdjust})`);
    if (!stockCorrect) allCorrect = false;

    // Verify InventoryBatch updated
    const batchBefore = statesBefore.inventoryBatch[firstItem.batchNumber];
    const batchAfter = statesAfter.inventoryBatch[firstItem.batchNumber];
    const batchUpdated = batchAfter === newQty;
    console.log(`📦 InventoryBatch updated to new qty: ${batchUpdated ? '✅' : '❌'} (${batchBefore} → ${batchAfter})`);
    if (!batchUpdated) allCorrect = false;

    // Verify VendorPayment updated
    const paymentUpdated = statesAfter.vendorPayment.initialAmount > statesBefore.vendorPayment.initialAmount;
    console.log(`💳 VendorPayment amount updated: ${paymentUpdated ? '✅' : '❌'}`);
    if (!paymentUpdated) allCorrect = false;

    // ====================================================
    // SUMMARY
    // ====================================================
    console.log("\n" + "═".repeat(58));
    if (allCorrect) {
      console.log("✅ ALL COLLECTIONS UPDATED CORRECTLY!");
    } else {
      console.log("❌ SOME COLLECTIONS NOT UPDATED CORRECTLY");
    }
    console.log("═".repeat(58));

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB\n");
  }
}

// Run test
testAllCollectionsUpdated();
