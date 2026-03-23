import mongoose from "mongoose";
import Grn from "../Models/Grn.js";
import CurrentStock from "../Models/CurrentStock.js";
import InventoryBatch from "../Models/InventoryBatch.js";
import VendorPayment from "../Models/VendorPayment.js";
import StockMovement from "../Models/StockMovement.js";

const MONGO_URI = "mongodb://localhost:27017/NEXIS_ERP";

async function testCollectionUpdate() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to NEXIS_ERP database");

    // Find the GRN
    const grn = await Grn.findOne({ grnNumber: "GRN-2025-2026-00053" });
    
    if (!grn) {
      console.log("❌ GRN not found - checking what GRNs exist...");
      const allGrns = await Grn.find().limit(5).select("grnNumber status");
      console.log(`Found ${allGrns.length} GRNs`);
      allGrns.forEach(g => console.log(`  - ${g.grnNumber} (${g.status})`));
      process.exit(0);
    }

    console.log(`\n✅ Found GRN: ${grn.grnNumber}`);
    console.log(`   Status: ${grn.status}`);
    console.log(`   Item qty: ${grn.items[0]?.quantity}`);
    console.log(`   Product ID: ${grn.items[0]?.productId}`);
    console.log(`   Total: ${grn.finalTotal}`);

    const productId = grn.items[0]?.productId;
    const batchNumber = grn.items[0]?.batchNumber || "DEFAULT";

    // Check what collections exist for this product
    console.log(`\n🔍 Checking collections for productId ${productId}:`);

    const stock = await CurrentStock.findOne({ productId });
    console.log(`   CurrentStock: ${stock ? '✓ Found' : '✗ NOT FOUND'}`);
    if (stock) {
      console.log(`     - totalQuantity: ${stock.totalQuantity}`);
      console.log(`     - availableQuantity: ${stock.availableQuantity}`);
    }

    const batch = await InventoryBatch.findOne({ 
      productId,
      batchNumber
    });
    console.log(`   InventoryBatch: ${batch ? '✓ Found' : '✗ NOT FOUND'}`);
    if (batch) {
      console.log(`     - quantity: ${batch.quantity}`);
      console.log(`     - _id: ${batch._id}`);
    }

    const payment = await VendorPayment.findOne({
      grnId: grn._id.toString()
    });
    console.log(`   VendorPayment: ${payment ? '✓ Found' : '✗ NOT FOUND'}`);
    if (payment) {
      console.log(`     - initialAmount: ${payment.initialAmount}`);
      console.log(`     - paymentStatus: ${payment.paymentStatus}`);
    }

    const movements = await StockMovement.find({ referenceId: grn._id });
    console.log(`   StockMovement records: ${movements.length}`);

    // Now try the edit simulation
    console.log(`\n📝 SIMULATING EDIT: qty 50 → 75 (difference: +25)`);

    if (!stock || !batch || !payment) {
      console.log(`\n⚠️ WARNING: Missing required collections!`);
      console.log(`   Cannot proceed with edit test`);
      process.exit(0);
    }

    // Manually simulate what the edit should do
    console.log(`\n🔄 Manually updating collections...`);

    // 1. Update CurrentStock
    const stockUpdate = await CurrentStock.findByIdAndUpdate(
      stock._id,
      { $inc: { totalQuantity: 25 }, $set: { updatedAt: new Date() } },
      { new: true }
    );
    console.log(`   ✓ CurrentStock: ${stock.totalQuantity} → ${stockUpdate.totalQuantity}`);

    // Manually recalculate availableQuantity
    stockUpdate.availableQuantity = Math.max(0, stockUpdate.totalQuantity - (stockUpdate.allocatedQuantity || 0) - (stockUpdate.damageQuality || 0));
    await stockUpdate.save();
    console.log(`     ✓ availableQuantity recalculated: ${stockUpdate.availableQuantity}`);

    // 2. Update InventoryBatch
    const batchUpdate = await InventoryBatch.updateOne(
      { _id: batch._id },
      { $set: { quantity: 75, quantityRemaining: 75, updatedAt: new Date() } }
    );
    console.log(`   ✓ InventoryBatch: matched=${batchUpdate.matchedCount}, modified=${batchUpdate.modifiedCount}`);

    // 3. Create StockMovement
    try {
      const movement = await StockMovement.create({
        productId,
        batchId: batch._id,
        movementType: 'ADJUSTMENT',
        quantity: 25,
        unitCost: grn.items[0].unitCost,
        totalAmount: 25 * grn.items[0].unitCost,
        reference: `GRN-EDIT: ${grn.grnNumber}`,
        referenceId: grn._id,
        referenceType: 'STOCK_ADJUSTMENT',
        costingMethodUsed: 'FIFO',
        documentDate: new Date()
      });
      console.log(`   ✓ StockMovement: created ${movement._id}`);
    } catch (err) {
      console.log(`   ✗ StockMovement failed: ${err.message}`);
    }

    // 4. Update VendorPayment
    const oldTotal = payment.initialAmount;
    const newTotal = (75 * grn.items[0].unitCost) + ((75 * grn.items[0].unitCost * grn.items[0].taxPercent) / 100);
    const paymentUpdate = await VendorPayment.findByIdAndUpdate(
      payment._id,
      {
        $set: {
          initialAmount: newTotal,
          balance: newTotal,
          amountPaid: 0,
          updatedAt: new Date()
        }
      },
      { new: true }
    );
    console.log(`   ✓ VendorPayment: ${oldTotal} → ${paymentUpdate.initialAmount}`);

    // 5. Update GRN items
    await Grn.findByIdAndUpdate(
      grn._id,
      {
        $set: {
          'items.0.quantity': 75,
          'items.0.netCost': 75 * grn.items[0].unitCost,
          'items.0.totalCost': newTotal,
          totalQty: 75,
          subtotal: 75 * grn.items[0].unitCost,
          netTotal: 75 * grn.items[0].unitCost,
          taxAmount: (75 * grn.items[0].unitCost * grn.items[0].taxPercent) / 100,
          finalTotal: newTotal,
          totalAmount: newTotal,
          updatedAt: new Date()
        }
      }
    );
    console.log(`   ✓ GRN: items qty updated to 75`);

    // Verify the updates
    console.log(`\n✅ VERIFICATION - Checking if updates persisted:`);

    const stockCheck = await CurrentStock.findById(stock._id);
    console.log(`   CurrentStock.totalQuantity: ${stockCheck.totalQuantity} (expected 75)`);

    const batchCheck = await InventoryBatch.findById(batch._id);
    console.log(`   InventoryBatch.quantity: ${batchCheck.quantity} (expected 75)`);

    const paymentCheck = await VendorPayment.findById(payment._id);
    console.log(`   VendorPayment.initialAmount: ${paymentCheck.initialAmount} (expected ${newTotal.toFixed(2)})`);

    const grnCheck = await Grn.findById(grn._id);
    console.log(`   GRN.items[0].quantity: ${grnCheck.items[0].quantity} (expected 75)`);

    const movementCheck = await StockMovement.findOne({ referenceId: grn._id, referenceType: 'STOCK_ADJUSTMENT' });
    console.log(`   StockMovement created: ${movementCheck ? '✓ YES' : '✗ NO'}`);

    console.log(`\n🎉 Manual update test complete!`);

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testCollectionUpdate();
