/**
 * FIX SCRIPT: Update Collections to Match GRN Values
 * 
 * This script finds GRNs with data inconsistencies and fixes them:
 * - Updates CurrentStock to match GRN qty
 * - Updates/Creates StockMovement with correct qty
 * - Updates InventoryBatch with correct qty
 * - Updates VendorPayment with correct amount
 */

import mongoose from "mongoose";
import Grn from "../Models/Grn.js";
import VendorPayment from "../Models/VendorPayment.js";
import InventoryBatch from "../Models/InventoryBatch.js";
import CurrentStock from "../Models/CurrentStock.js";
import StockMovement from "../Models/StockMovement.js";

const MONGO_URI = "mongodb://localhost:27017/NEXIS_ERP_TEST";

async function fixGrnCollectionsData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    console.log("╔══════════════════════════════════════════════════════╗");
    console.log("║  FIX SCRIPT: Update Collections to Match GRN Data   ║");
    console.log("╚══════════════════════════════════════════════════════╝\n");

    // Find all Received GRNs
    const grns = await Grn.find({ status: "Received" }).populate("items.productId");
    console.log(`Found ${grns.length} Received GRNs to check\n`);

    for (const grn of grns) {
      console.log(`\n📋 Processing GRN: ${grn.grnNumber}`);
      console.log(`   Items: ${grn.items.length}`);

      const grnTotalQty = grn.items.reduce((sum, item) => sum + item.quantity, 0);
      const grnTotalAmount = grn.finalTotal || grn.totalAmount || 0;

      console.log(`   Total qty: ${grnTotalQty}`);
      console.log(`   Total amount: ${grnTotalAmount}`);

      // ====================================================
      // FIX 1: Update CurrentStock
      // ====================================================
      console.log(`\n   1️⃣ Fixing CurrentStock...`);
      for (const item of grn.items) {
        const updated = await CurrentStock.findOneAndUpdate(
          { productId: item.productId },
          {
            $set: {
              grnReceivedQuantity: item.quantity,
              totalQuantity: item.quantity,
              updatedAt: new Date()
            }
          },
          { new: true }
        );
        console.log(`      ✅ Updated ${item.itemName}: qty=${item.quantity}`);
      }

      // ====================================================
      // FIX 2: Update/Create StockMovement
      // ====================================================
      console.log(`   2️⃣ Fixing StockMovement...`);
      
      const existingMovements = await StockMovement.find({ reference: grn.grnNumber });
      
      if (existingMovements.length === 0) {
        // No movements exist - create them
        for (const item of grn.items) {
          const movement = new StockMovement({
            productId: item.productId,
            movementType: "INBOUND",
            quantity: item.quantity,  // ← FIX: Use full quantity
            unitCost: item.unitCost,
            totalAmount: item.totalCost || (item.quantity * item.unitCost),
            reference: grn.grnNumber,
            referenceId: grn._id,
            referenceType: "PURCHASE_ORDER",
            costingMethodUsed: "FIFO",
            documentDate: grn.grnDate,
            notes: `GRN Receipt - ${grn.grnNumber} from ${grn.vendorName}`,
            createdBy: grn.createdBy
          });
          await movement.save();
          console.log(`      ✅ Created StockMovement: qty=${item.quantity}`);
        }
      } else {
        // Movements exist - fix them
        for (const movement of existingMovements) {
          const item = grn.items.find(i => i.productId?.toString() === movement.productId?.toString());
          if (item) {
            await StockMovement.findByIdAndUpdate(
              movement._id,
              {
                $set: {
                  quantity: item.quantity,  // ← FIX: Update to correct quantity
                  totalAmount: item.totalCost || (item.quantity * item.unitCost)
                }
              }
            );
            console.log(`      ✅ Updated StockMovement: qty=${item.quantity}`);
          }
        }
      }

      // ====================================================
      // FIX 3: Update InventoryBatch
      // ====================================================
      console.log(`   3️⃣ Fixing InventoryBatch...`);
      
      for (const item of grn.items) {
        if (item.batchNumber) {
          const updated = await InventoryBatch.findOneAndUpdate(
            {
              grnId: grn.grnNumber,
              batchNumber: item.batchNumber,
              productId: item.productId
            },
            {
              $set: {
                quantity: item.quantity,  // ← FIX: Set to full qty
                baseUnits: item.quantity,
                updatedAt: new Date()
              }
            },
            { new: true }
          );
          console.log(`      ✅ Updated Batch ${item.batchNumber}: qty=${item.quantity}`);
        }
      }

      // ====================================================
      // FIX 4: Update VendorPayment
      // ====================================================
      console.log(`   4️⃣ Fixing VendorPayment...`);
      
      const payments = await VendorPayment.find({ grnId: grn.grnNumber });
      
      if (payments.length === 0) {
        console.log(`      ⚠️  No payment records found`);
      } else {
        for (const payment of payments) {
          await VendorPayment.findByIdAndUpdate(
            payment._id,
            {
              $set: {
                initialAmount: grnTotalAmount,  // ← FIX: Use correct total
                balance: grnTotalAmount,
                amountPaid: 0,
                updatedAt: new Date()
              }
            }
          );
          console.log(`      ✅ Updated VendorPayment: amount=${grnTotalAmount}`);
        }
      }

      console.log(`   ✅ GRN ${grn.grnNumber} FIXED!\n`);
    }

    console.log("\n╔══════════════════════════════════════════════════════╗");
    console.log("║  ✅ ALL GRNs FIXED!                                 ║");
    console.log("╚══════════════════════════════════════════════════════╝");

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB\n");
  }
}

// Run fix
fixGrnCollectionsData();
