import mongoose from "mongoose";
import Grn from "../Models/Grn.js";
import CurrentStock from "../Models/CurrentStock.js";
import InventoryBatch from "../Models/InventoryBatch.js";
import VendorPayment from "../Models/VendorPayment.js";
import StockMovement from "../Models/StockMovement.js";
import SimpleGRNEditManager from "../modules/accounting/services/SimpleGRNEditManager.js";

// Use production database
const MONGO_URI = "mongodb://localhost:27017/NEXIS_ERP";

async function testGRNEditWithProductionData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB (PRODUCTION)");

    // Find the specific GRN from user's data
    const grn = await Grn.findOne({ grnNumber: "GRN-2025-2026-00053" }).populate(
      "items.productId vendorId"
    );
    
    if (!grn) {
      console.log("❌ GRN 'GRN-2025-2026-00053' not found");
      process.exit(0);
    }

    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║     TEST: GRN EDIT - COLLECTION UPDATE VERIFICATION      ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    console.log("📋 GRN Found:");
    console.log(`   GRN Number: ${grn.grnNumber}`);
    console.log(`   Status: ${grn.status}`);
    console.log(`   Items: ${grn.items.length}`);
    const firstItem = grn.items[0];
    console.log(`   First Item: ${firstItem.itemName}`);
    console.log(`   Current Qty: ${firstItem.quantity}`);
    console.log(`   Product ID: ${firstItem.productId._id}`);
    console.log(`   Batch Number: ${firstItem.batchNumber || '(none)'}`);

    // Get collections BEFORE edit
    console.log("\n📊 BEFORE EDIT - Collection State:");

    const stockBefore = await CurrentStock.findOne({
      productId: firstItem.productId._id
    });
    console.log(`   CurrentStock:`);
    console.log(`     - totalQuantity: ${stockBefore?.totalQuantity}`);
    console.log(`     - availableQuantity: ${stockBefore?.availableQuantity}`);
    console.log(`     - allocatedQuantity: ${stockBefore?.allocatedQuantity}`);
    console.log(`     - damageQuality: ${stockBefore?.damageQuality}`);

    const batchBefore = await InventoryBatch.findOne({
      productId: firstItem.productId._id,
      batchNumber: firstItem.batchNumber
    });
    console.log(`   InventoryBatch:`);
    console.log(`     - quantity: ${batchBefore?.quantity}`);
    console.log(`     - quantityRemaining: ${batchBefore?.quantityRemaining}`);

    const paymentBefore = await VendorPayment.findOne({
      grnId: grn._id.toString()
    });
    console.log(`   VendorPayment:`);
    console.log(`     - initialAmount: ${paymentBefore?.initialAmount}`);
    console.log(`     - balance: ${paymentBefore?.balance}`);
    console.log(`     - paymentStatus: ${paymentBefore?.paymentStatus}`);

    const movementsBefore = await StockMovement.countDocuments({
      referenceId: grn._id
    });
    console.log(`   StockMovement records: ${movementsBefore}`);

    // ═══════════════════════════════════════════════════════════
    // PERFORM EDIT: reduce quantity from 50 → 25 (difference: -25)
    // ═══════════════════════════════════════════════════════════
    const newQty = 25;
    const oldQty = firstItem.quantity;
    const expectedDifference = newQty - oldQty; // 25 - 50 = -25

    console.log("\n✏️ EDIT OPERATION:");
    console.log(`   Current qty: ${oldQty}`);
    console.log(`   New qty: ${newQty}`);
    console.log(`   Expected difference: ${expectedDifference}`);

    const editPayload = {
      items: [
        {
          productId: firstItem.productId._id,
          itemName: firstItem.itemName,
          itemCode: firstItem.itemCode,
          quantity: newQty,
          unitType: firstItem.unitType,
          foc: firstItem.foc,
          focQty: firstItem.focQty,
          unitCost: firstItem.unitCost,
          itemDiscount: firstItem.itemDiscount,
          itemDiscountPercent: firstItem.itemDiscountPercent,
          netCost: newQty * firstItem.unitCost,
          taxType: firstItem.taxType,
          taxPercent: firstItem.taxPercent,
          taxAmount: (newQty * firstItem.unitCost * firstItem.taxPercent) / 100,
          totalCost: newQty * firstItem.unitCost + (newQty * firstItem.unitCost * firstItem.taxPercent) / 100,
          batchNumber: firstItem.batchNumber || "TEST-BATCH",
          expiryDate: firstItem.expiryDate,
          notes: firstItem.notes,
          rtvReturnedQuantity: firstItem.rtvReturnedQuantity
        }
      ],
      notes: grn.notes
    };

    console.log(`\n🔄 Calling SimpleGRNEditManager.editReceivedGRN()...`);
    const editResult = await SimpleGRNEditManager.editReceivedGRN(
      grn._id.toString(),
      editPayload,
      grn.createdBy
    );

    if (!editResult.success && editResult.error) {
      console.log(`\n❌ Edit failed: ${editResult.error}`);
      process.exit(1);
    }

    console.log(`\n✅ Edit request completed`);

    // Wait a moment for any async operations
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get collections AFTER edit
    console.log("\n📊 AFTER EDIT - Collection State:");

    const stockAfter = await CurrentStock.findOne({
      productId: firstItem.productId._id
    });
    console.log(`   CurrentStock:`);
    console.log(`     - totalQuantity: ${stockAfter?.totalQuantity} (expected: ${(stockBefore?.totalQuantity || 0) + expectedDifference})`);
    console.log(`     - availableQuantity: ${stockAfter?.availableQuantity}`);
    console.log(`     - allocatedQuantity: ${stockAfter?.allocatedQuantity}`);
    console.log(`     - damageQuality: ${stockAfter?.damageQuality}`);

    const batchAfter = await InventoryBatch.findOne({
      productId: firstItem.productId._id,
      batchNumber: firstItem.batchNumber
    });
    console.log(`   InventoryBatch:`);
    console.log(`     - quantity: ${batchAfter?.quantity} (expected: ${newQty})`);
    console.log(`     - quantityRemaining: ${batchAfter?.quantityRemaining} (expected: ${newQty})`);

    const paymentAfter = await VendorPayment.findOne({
      grnId: grn._id.toString()
    });
    const newExpectedTotal = newQty * firstItem.unitCost + (newQty * firstItem.unitCost * firstItem.taxPercent) / 100;
    console.log(`   VendorPayment:`);
    console.log(`     - initialAmount: ${paymentAfter?.initialAmount} (expected: ${newExpectedTotal.toFixed(2)})`);
    console.log(`     - balance: ${paymentAfter?.balance}`);

    const movementsAfter = await StockMovement.countDocuments({
      referenceId: grn._id
    });
    console.log(`   StockMovement records: ${movementsAfter} (expected: ${movementsBefore + 1})`);

    // ═══════════════════════════════════════════════════════════
    // VERIFICATION REPORT
    // ═══════════════════════════════════════════════════════════
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║                    VERIFICATION REPORT                    ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    const results = {
      currentStockUpdated: (stockAfter?.totalQuantity || 0) === ((stockBefore?.totalQuantity || 0) + expectedDifference),
      availableQtyRecalculated: stockAfter?.availableQuantity !== undefined,
      batchQuantityUpdated: (batchAfter?.quantity || 0) === newQty,
      batchQuantityRemainingUpdated: (batchAfter?.quantityRemaining || 0) === newQty,
      paymentUpdated: Math.abs((paymentAfter?.initialAmount || 0) - newExpectedTotal) < 0.01,
      stockMovementCreated: movementsAfter > movementsBefore
    };

    console.log(`✅ CurrentStock totalQuantity updated: ${results.currentStockUpdated ? '✓' : '✗'}`);
    console.log(`✅ CurrentStock availableQuantity recalculated: ${results.availableQtyRecalculated ? '✓' : '✗'}`);
    console.log(`✅ InventoryBatch quantity updated: ${results.batchQuantityUpdated ? '✓' : '✗'}`);
    console.log(`✅ InventoryBatch quantityRemaining updated: ${results.batchQuantityRemainingUpdated ? '✓' : '✗'}`);
    console.log(`✅ VendorPayment amount updated: ${results.paymentUpdated ? '✓' : '✗'}`);
    console.log(`✅ StockMovement record created: ${results.stockMovementCreated ? '✓' : '✗'}`);

    const allPassed = Object.values(results).every(r => r);
    
    if (allPassed) {
      console.log(`\n🎉 ALL COLLECTIONS UPDATED SUCCESSFULLY!`);
    } else {
      console.log(`\n⚠️ Some collections were not updated correctly`);
      console.log(`\nFailed checks:`);
      Object.entries(results).forEach(([check, passed]) => {
        if (!passed) {
          console.log(`  - ${check}`);
        }
      });
    }

    await mongoose.disconnect();
    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error("❌ Test error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testGRNEditWithProductionData();
