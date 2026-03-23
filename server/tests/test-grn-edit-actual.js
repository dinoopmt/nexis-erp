import mongoose from "mongoose";
import Grn from "../Models/Grn.js";
import CurrentStock from "../Models/CurrentStock.js";
import InventoryBatch from "../Models/InventoryBatch.js";
import VendorPayment from "../Models/VendorPayment.js";
import StockMovement from "../Models/StockMovement.js";
import SimpleGRNEditManager from "../modules/accounting/services/SimpleGRNEditManager.js";

const MONGO_URI = "mongodb://localhost:27017/nexis-erp";

async function testGRNEditWithActualData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to nexis-erp database");

    // Query the exact GRN by ObjectId
    const grnId = "69bfe69509638db9c685d637";
    const grn = await Grn.findById(grnId);
    
    if (!grn) {
      console.log(`❌ GRN ${grnId} not found`);
      process.exit(1);
    }

    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║     TESTING GRN EDIT: 50 → 75 QUANTITY CHANGE             ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    console.log(`📋 GRN Found: ${grn.grnNumber}`);
    console.log(`   Status: ${grn.status}`);
    const firstItem = grn.items[0];
    console.log(`   Item: ${firstItem.itemName}`);
    console.log(`   Current qty: ${firstItem.quantity}`);
    console.log(`   Product ID: ${firstItem.productId}`);
    console.log(`   Batch: ${firstItem.batchNumber || '(empty)'}`);

    // Check collections BEFORE edit
    console.log(`\n📊 BEFORE EDIT - Checking collections:`);

    const productId = firstItem.productId;
    const batchNumber = firstItem.batchNumber;  // Use empty string if that's what's stored

    const stockBefore = await CurrentStock.findOne({ productId });
    console.log(`   CurrentStock: ${stockBefore ? `✓ qty=${stockBefore.totalQuantity}` : '✗ NOT FOUND'}`);

    const batchBefore = await InventoryBatch.findOne({ productId, batchNumber });
    console.log(`   InventoryBatch: ${batchBefore ? `✓ qty=${batchBefore.quantity}` : '✗ NOT FOUND'}`);

    const paymentBefore = await VendorPayment.findOne({ grnId: grn._id.toString() });
    console.log(`   VendorPayment: ${paymentBefore ? `✓ amount=${paymentBefore.initialAmount}` : '✗ NOT FOUND'}`);

    const movementsBefore = await StockMovement.countDocuments({ referenceId: grn._id });
    console.log(`   StockMovement records: ${movementsBefore}`);

    if (!stockBefore || !batchBefore || !paymentBefore) {
      console.log(`\n⚠️ ERROR: Missing required collections, cannot proceed`);
      process.exit(1);
    }

    // ═══════════════════════════════════════════════════════════
    // PERFORM THE EDIT: qty 50 → 75 (difference = +25)
    // ═══════════════════════════════════════════════════════════
    console.log(`\n✏️ EDIT: qty ${firstItem.quantity} → 75 (difference: +25)`);
    console.log(`\n🔄 Calling SimpleGRNEditManager.editReceivedGRN()...\n`);

    const newQty = 75;
    const newTotal = (newQty * firstItem.unitCost) + ((newQty * firstItem.unitCost * firstItem.taxPercent) / 100);

    const editPayload = {
      items: [
        {
          productId: firstItem.productId,
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
          totalCost: newTotal,
          batchNumber: firstItem.batchNumber,
          expiryDate: firstItem.expiryDate,
          notes: firstItem.notes,
          rtvReturnedQuantity: firstItem.rtvReturnedQuantity
        }
      ],
      notes: grn.notes,
      originalItems: grn.items  // Pass original items for comparison
    };

    const editResult = await SimpleGRNEditManager.editReceivedGRN(
      grnId,
      editPayload,
      grn.createdBy
    );

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 1000));

    // ═══════════════════════════════════════════════════════════
    // CHECK COLLECTIONS AFTER EDIT
    // ═══════════════════════════════════════════════════════════
    console.log(`\n📊 AFTER EDIT - Verifying collections:`);

    const stockAfter = await CurrentStock.findOne({ productId });
    const stockOK = stockAfter && stockAfter.totalQuantity === (stockBefore.totalQuantity + 25);
    console.log(`   CurrentStock: ${stockOK ? '✓' : '✗'} qty=${stockAfter?.totalQuantity} (expected ${stockBefore.totalQuantity + 25})`);

    const batchAfter = await InventoryBatch.findOne({ productId, batchNumber });
    const batchOK = batchAfter && batchAfter.quantity === newQty;
    console.log(`   InventoryBatch: ${batchOK ? '✓' : '✗'} qty=${batchAfter?.quantity} (expected ${newQty})`);

    const paymentAfter = await VendorPayment.findOne({ grnId: grn._id.toString() });
    const paymentOK = paymentAfter && Math.abs(paymentAfter.initialAmount - newTotal) < 0.01;
    console.log(`   VendorPayment: ${paymentOK ? '✓' : '✗'} amount=${paymentAfter?.initialAmount} (expected ${newTotal.toFixed(2)})`);

    const movementsAfter = await StockMovement.countDocuments({ referenceId: grn._id });
    const movementOK = movementsAfter > movementsBefore;
    console.log(`   StockMovement: ${movementOK ? '✓' : '✗'} records=${movementsAfter} (expected >${movementsBefore})`);

    const grnAfter = await Grn.findById(grnId);
    const grnOK = grnAfter.items[0].quantity === newQty;
    console.log(`   GRN: ${grnOK ? '✓' : '✗'} qty=${grnAfter.items[0].quantity} (expected ${newQty})`);

    // Summary
    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║                    RESULT SUMMARY                          ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝`);
    console.log(`\n${stockOK && batchOK && paymentOK && movementOK && grnOK ? '✅ SUCCESS' : '❌ FAILURE'}\n`);
    
    if (!stockOK) console.log(`✗ CurrentStock not updated properly`);
    if (!batchOK) console.log(`✗ InventoryBatch not updated properly`);
    if (!paymentOK) console.log(`✗ VendorPayment not updated properly`);
    if (!movementOK) console.log(`✗ StockMovement not created`);
    if (!grnOK) console.log(`✗ GRN not updated properly`);

    await mongoose.disconnect();
    process.exit((stockOK && batchOK && paymentOK && movementOK && grnOK) ? 0 : 1);

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testGRNEditWithActualData();
