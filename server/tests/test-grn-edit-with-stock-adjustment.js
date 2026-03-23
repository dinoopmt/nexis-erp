/**
 * Test: GRN Edit with Current Stock Adjustment
 * 
 * Scenario:
 * 1. Create GRN with 50 units → Status: Draft
 * 2. Post GRN → Status: Received, Current Stock: +50
 * 3. Edit GRN to 60 units → Current Stock should adjust: -50 +60 = +10 net
 * 4. Verify current stock is correct: original + 10
 */

import mongoose from "mongoose";
import Grn from "../Models/Grn.js";
import VendorPayment from "../Models/VendorPayment.js";
import InventoryBatch from "../Models/InventoryBatch.js";
import CurrentStock from "../Models/CurrentStock.js";
import SimpleGRNEditManager from "../modules/accounting/services/SimpleGRNEditManager.js";

const MONGO_URI = "mongodb://localhost:27017/NEXIS_ERP_TEST";

async function testGRNEditWithStockAdjustment() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get a test GRN (Received status with PENDING payment)
    const testGrnQuery = {
      status: "Received",
      grnNumber: { $regex: "GRN-TEST" }
    };

    const testGrn = await Grn.findOne(testGrnQuery).populate("items.productId");

    if (!testGrn) {
      console.log("❌ No test Received GRN found");
      return;
    }

    console.log(`📦 Found test GRN: ${testGrn.grnNumber} (Status: ${testGrn.status})`);
    console.log(`   Items: ${testGrn.items.length}`);
    testGrn.items.forEach(item => {
      console.log(`     - ${item.productName || item.productId}: ${item.quantity} units`);
    });

    // Check payment status
    const payment = await VendorPayment.findOne({ grnId: testGrn.grnNumber });
    console.log(`\n💳 Payment Status: ${payment?.paymentStatus || "NOT FOUND"}`);

    if (payment && payment.paymentStatus !== "PENDING") {
      console.log(`❌ Cannot edit - payment status must be PENDING`);
      return;
    }

    // Check current stock BEFORE edit
    console.log(`\n📊 CURRENT STOCK BEFORE EDIT:`);
    const stockBefore = {};
    for (const item of testGrn.items) {
      const stock = await CurrentStock.findOne({ productId: item.productId });
      stockBefore[item.productId] = stock?.quantityInStock || 0;
      console.log(`   ${item.productName}: ${stockBefore[item.productId]} units`);
    }

    // Prepare edit changes - INCREASE qty of first item by 10
    console.log(`\n✏️ PREPARING EDIT:`);
    const firstItem = testGrn.items[0];
    const originalQty = firstItem.quantity;
    const newQty = originalQty + 10;

    console.log(`   ${firstItem.productName}:`);
    console.log(`     Original qty: ${originalQty}`);
    console.log(`     New qty: ${newQty}`);
    console.log(`     Difference: +10`);

    const editChanges = {
      items: testGrn.items.map(item => 
        item.productId?.toString() === firstItem.productId?.toString()
          ? { ...item, quantity: newQty }
          : item
      ),
      notes: testGrn.notes + " [EDITED]"
    };

    // Execute edit
    console.log(`\n🔧 EXECUTING EDIT...`);
    const editResult = await SimpleGRNEditManager.editReceivedGRN(
      testGrn._id,
      editChanges,
      "test_user_edit"
    );

    if (!editResult.success) {
      console.log(`❌ Edit failed: ${editResult.error}`);
      console.log("\n📋 Validations:");
      Object.entries(editResult.validations).forEach(([key, value]) => {
        console.log(`   ${key}: ${value ? '✅' : '❌'}`);
      });
      return;
    }

    console.log(`✅ Edit successful!\n`);

    // Check current stock AFTER edit
    console.log(`📊 CURRENT STOCK AFTER EDIT:`);
    for (const item of editResult.grn.items) {
      const stock = await CurrentStock.findOne({ productId: item.productId });
      const stockAfter = stock?.quantityInStock || 0;
      const difference = stockAfter - stockBefore[item.productId];

      console.log(`   ${item.productName}:`);
      console.log(`     Before: ${stockBefore[item.productId]}`);
      console.log(`     After: ${stockAfter}`);
      console.log(`     Change: ${difference > 0 ? '+' : ''}${difference}`);

      if (item.productId?.toString() === firstItem.productId?.toString() && difference === 10) {
        console.log(`     ✅ CORRECT (expected +10)`);
      } else if (item.productId?.toString() === firstItem.productId?.toString()) {
        console.log(`     ❌ WRONG (expected +10, got ${difference})`);
      }
    }

    console.log(`\n✅ TEST COMPLETED`);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run test
testGRNEditWithStockAdjustment();
