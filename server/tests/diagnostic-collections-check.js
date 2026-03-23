/**
 * Diagnostic: GRN Edit - Check if All Collections Have Correct Values
 * 
 * Purpose: Verify data consistency across all 4 collections after editing
 */

import mongoose from "mongoose";
import Grn from "../Models/Grn.js";
import VendorPayment from "../Models/VendorPayment.js";
import InventoryBatch from "../Models/InventoryBatch.js";
import CurrentStock from "../Models/CurrentStock.js";
import StockMovement from "../Models/StockMovement.js";

const MONGO_URI = "mongodb://localhost:27017/NEXIS_ERP_TEST";

async function diagnosticCheckCollections() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    console.log("╔════════════════════════════════════════════════════╗");
    console.log("║  DIAGNOSTIC: GRN COLLECTIONS DATA CONSISTENCY     ║");
    console.log("╚════════════════════════════════════════════════════╝\n");

    // Find any Received GRN with 6 items
    const testGrn = await Grn.findOne({
      status: "Received",
      "items.quantity": 6
    });

    if (!testGrn) {
      console.log("❌ No GRN with 6 item units found");
      // Get any recent GRN
      const anyGrn = await Grn.findOne().sort({ createdAt: -1 });
      if (!anyGrn) {
        console.log("❌ No GRNs found at all!");
        return;
      }
      await checkGrnData(anyGrn);
    } else {
      await checkGrnData(testGrn);
    }

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB\n");
  }
}

async function checkGrnData(grn) {
  console.log(`📋 GRN: ${grn.grnNumber}`);
  console.log(`   Status: ${grn.status}`);
  console.log(`   Total: ${grn.finalTotal}`);
  console.log(`   Items: ${grn.items.length}`);

  // Get total qty from GRN
  const grnTotalQty = grn.items.reduce((sum, item) => sum + item.quantity, 0);
  const grnTotalAmount = grn.finalTotal;
  
  console.log(`\n✅ EXPECTED VALUES FROM GRN:`);
  console.log(`   Total qty: ${grnTotalQty} units`);
  console.log(`   Total amount: ${grnTotalAmount}\n`);

  // ====================================================
  // CHECK 1: CurrentStock
  // ====================================================
  console.log(`╔════ CHECK 1: CurrentStock ════╗\n`);
  
  let totalCurrentStockQty = 0;
  for (const item of grn.items) {
    const stock = await CurrentStock.findOne({ productId: item.productId });
    if (stock) {
      console.log(`❌ Product: ${item.productName}`);
      console.log(`   Expected qty received from GRN: ${item.quantity}`);
      console.log(`   Actual grnReceivedQuantity: ${stock.grnReceivedQuantity}`);
      console.log(`   Total qty: ${stock.totalQuantity}`);
      console.log(`   Status: ${stock.grnReceivedQuantity === item.quantity ? '✅ CORRECT' : '❌ MISMATCH'}\n`);
      totalCurrentStockQty += stock.grnReceivedQuantity || 0;
    }
  }
  console.log(`Summary: Expected ${grnTotalQty}, Got ${totalCurrentStockQty} ${totalCurrentStockQty === grnTotalQty ? '✅' : '❌'}\n`);

  // ====================================================
  // CHECK 2: StockMovement
  // ====================================================
  console.log(`╔════ CHECK 2: StockMovement ════╗\n`);
  
  const movements = await StockMovement.find({ reference: grn.grnNumber });
  console.log(`Stock movements found: ${movements.length}`);
  
  if (movements.length === 0) {
    console.log(`❌ NO STOCK MOVEMENTS FOUND for GRN!\n`);
  } else {
    let totalMovementQty = 0;
    for (const movement of movements) {
      console.log(`Movement: ${movement._id}`);
      console.log(`  Quantity: ${movement.quantity} units`);
      console.log(`  Amount: ${movement.totalAmount}`);
      console.log(`  Type: ${movement.movementType}\n`);
      totalMovementQty += movement.quantity || 0;
    }
    console.log(`Summary: Expected ${grnTotalQty}, Got ${totalMovementQty} ${totalMovementQty === grnTotalQty ? '✅' : '❌'}\n`);
  }

  // ====================================================
  // CHECK 3: InventoryBatch
  // ====================================================
  console.log(`╔════ CHECK 3: InventoryBatch ════╗\n`);
  
  const batches = await InventoryBatch.find({ grnId: grn.grnNumber });
  console.log(`Batches found: ${batches.length}`);
  
  if (batches.length === 0) {
    console.log(`❌ NO BATCHES FOUND for GRN!\n`);
  } else {
    let totalBatchQty = 0;
    for (const batch of batches) {
      console.log(`Batch: ${batch.batchNumber}`);
      console.log(`  Quantity: ${batch.quantity || batch.baseUnits} units`);
      totalBatchQty += batch.quantity || batch.baseUnits || 0;
    }
    console.log(`\nSummary: Expected ${grnTotalQty}, Got ${totalBatchQty} ${totalBatchQty === grnTotalQty ? '✅' : '❌'}\n`);
  }

  // ====================================================
  // CHECK 4: VendorPayment
  // ====================================================
  console.log(`╔════ CHECK 4: VendorPayment ════╗\n`);
  
  const payments = await VendorPayment.find({ grnId: grn.grnNumber });
  console.log(`Payments found: ${payments.length}`);
  
  if (payments.length === 0) {
    console.log(`❌ NO PAYMENT RECORDS FOUND for GRN!\n`);
  } else {
    let totalPaymentAmount = 0;
    for (const payment of payments) {
      console.log(`Payment Record:`);
      console.log(`  Initial Amount: ${payment.initialAmount}`);
      console.log(`  Balance: ${payment.balance}`);
      console.log(`  Status: ${payment.paymentStatus}`);
      console.log(`  Type: ${payment.type}\n`);
      totalPaymentAmount += payment.initialAmount || 0;
    }
    console.log(`Summary: Expected ${grnTotalAmount}, Got ${totalPaymentAmount} ${totalPaymentAmount === grnTotalAmount ? '✅' : '❌'}\n`);
  }

  // ====================================================
  // FINAL SUMMARY
  // ====================================================
  console.log(`╔════ FINAL SUMMARY ════╗\n`);
  console.log(`GRN Total Qty: ${grnTotalQty}`);
  console.log(`GRN Total Amount: ${grnTotalAmount}\n`);
  console.log(`CurrentStock total: ${totalCurrentStockQty}  ${totalCurrentStockQty === grnTotalQty ? '✅' : '❌ MISMATCH'}`);
  console.log(`StockMovement total: ${movements.reduce((sum, m) => sum + m.quantity, 0)}  ${movements.reduce((sum, m) => sum + m.quantity, 0) === grnTotalQty ? '✅' : '❌ MISMATCH'}`);
  console.log(`Batches total: ${batches.reduce((sum, b) => sum + (b.quantity || b.baseUnits || 0), 0)}  ${batches.reduce((sum, b) => sum + (b.quantity || b.baseUnits || 0), 0) === grnTotalQty ? '✅' : '❌ MISMATCH'}`);
  console.log(`Payment amount: ${payments.reduce((sum, p) => sum + (p.initialAmount || 0), 0)}  ${payments.reduce((sum, p) => sum + (p.initialAmount || 0), 0) === grnTotalAmount ? '✅' : '❌ MISMATCH'}`);

  // ====================================================
  // ISSUES FOUND
  // ====================================================
  console.log(`\n╔════ ISSUES DETECTED ════╗\n`);
  
  const issues = [];
  if (totalCurrentStockQty !== grnTotalQty) {
    issues.push(`❌ CurrentStock qty mismatch (expected ${grnTotalQty}, got ${totalCurrentStockQty})`);
  }
  if (movements.reduce((sum, m) => sum + m.quantity, 0) !== grnTotalQty) {
    issues.push(`❌ StockMovement qty mismatch (expected ${grnTotalQty}, got ${movements.reduce((sum, m) => sum + m.quantity, 0)})`);
  }
  if (batches.reduce((sum, b) => sum + (b.quantity || b.baseUnits || 0), 0) !== grnTotalQty) {
    issues.push(`❌ Batch qty mismatch (expected ${grnTotalQty}, got ${batches.reduce((sum, b) => sum + (b.quantity || b.baseUnits || 0), 0)})`);
  }
  if (payments.reduce((sum, p) => sum + (p.initialAmount || 0), 0) !== grnTotalAmount) {
    issues.push(`❌ Payment amount mismatch (expected ${grnTotalAmount}, got ${payments.reduce((sum, p) => sum + (p.initialAmount || 0), 0)})`);
  }

  if (issues.length === 0) {
    console.log(`✅ All collections have correct values!`);
  } else {
    issues.forEach(issue => console.log(issue));
  }
  console.log();
}

// Run diagnostic
diagnosticCheckCollections();
