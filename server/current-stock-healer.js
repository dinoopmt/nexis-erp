#!/usr/bin/env node

/**
 * CURRENT STOCK FIELD HEALER
 * 
 * Fixes availableQuantity and grnReceivedQuantity fields
 * by recalculating from all movements
 * 
 * Run from server directory:
 * node current-stock-healer.js [option]
 * 
 * Options:
 * - "check" (default) - Show discrepancies
 * - "heal" - Fix them
 * - "product:ID" - Check specific product
 */

import mongoose from "mongoose";
import CurrentStock from "./Models/CurrentStock.js";
import StockMovement from "./Models/StockMovement.js";
import AddProduct from "./Models/AddProduct.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure models are registered
import("./Models/index.js").catch(err => {
  console.warn("⚠️ Some models might not be pre-registered, but that's okay");
});

// Connect to MongoDB
async function connectDB() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/nexis_erp";
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
    });
    console.log("✅ MongoDB connected\n");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

// ============================================================================
// CALCULATE CORRECT VALUES FROM MOVEMENTS
// ============================================================================
async function calculateCorrectStock(productId) {
  try {
    // Get all movements for this product
    const movements = await StockMovement.find({ productId })
      .sort({ documentDate: 1, createdAt: 1 })
      .lean();

    let totalQty = 0;
    let grnReceivedQty = 0;
    let lastGrnDate = null;
    let lastGrnQty = 0;

    movements.forEach(m => {
      totalQty += m.quantity;

      // Sum up all GRN inbound movements
      if (m.movementType === "INBOUND" && m.referenceType === "GRN") {
        grnReceivedQty += m.quantity;
        if (!lastGrnDate || m.documentDate > lastGrnDate) {
          lastGrnDate = m.documentDate;
          lastGrnQty = m.quantity;
        }
      }
    });

    return {
      totalQuantity: totalQty,
      availableQuantity: totalQty,  // Available = total (simplified)
      grnReceivedQuantity: grnReceivedQty,  // Sum of all GRN inbound
      lastGrnDate,
      movementCount: movements.length
    };
  } catch (error) {
    console.error(`Error calculating for ${productId}:`, error.message);
    throw error;
  }
}

// ============================================================================
// CHECK FOR DISCREPANCIES
// ============================================================================
async function checkAllProducts() {
  console.log("=".repeat(70));
  console.log("CURRENT STOCK FIELD CHECK");
  console.log("=".repeat(70));

  try {
    const currentStocks = await CurrentStock.find({});
    
    let discrepancies = 0;
    const issues = [];

    console.log(`Found ${currentStocks.length} products to check\n`);

    for (const stock of currentStocks) {
      const correct = await calculateCorrectStock(stock.productId);

      const hasIssues = 
        stock.totalQuantity !== correct.totalQuantity ||
        stock.availableQuantity !== correct.availableQuantity ||
        stock.grnReceivedQuantity !== correct.grnReceivedQuantity;

      if (hasIssues) {
        discrepancies++;
        const issue = {
          product: stock.productId.toString(),
          productId: stock.productId.toString(),
          current: {
            totalQuantity: stock.totalQuantity,
            availableQuantity: stock.availableQuantity,
            grnReceivedQuantity: stock.grnReceivedQuantity
          },
          correct: {
            totalQuantity: correct.totalQuantity,
            availableQuantity: correct.availableQuantity,
            grnReceivedQuantity: correct.grnReceivedQuantity
          }
        };
        issues.push(issue);

        console.log(`\n⚠️ Product: ${stock.productId}`);
        console.log(`   Total: ${stock.totalQuantity} → ${correct.totalQuantity}`);
        console.log(`   Available: ${stock.availableQuantity} → ${correct.availableQuantity}`);
        console.log(`   GRN Received: ${stock.grnReceivedQuantity} → ${correct.grnReceivedQuantity}`);
      }
    }

    console.log(`\n${"=".repeat(70)}`);
    console.log(`✅ SCAN COMPLETE`);
    console.log(`   Total: ${currentStocks.length}`);
    console.log(`   Discrepancies: ${discrepancies}`);
    console.log(`   OK: ${currentStocks.length - discrepancies}`);

    return { total: currentStocks.length, discrepancies, issues };
  } catch (error) {
    console.error("❌ Check failed:", error.message);
    throw error;
  }
}

// ============================================================================
// HEAL ALL DISCREPANCIES
// ============================================================================
async function healAllProducts() {
  console.log("=".repeat(70));
  console.log("CURRENT STOCK FIELD HEALING");
  console.log("=".repeat(70));
  console.log("⚠️  This will fix availableQuantity and grnReceivedQuantity fields\n");

  try {
    const currentStocks = await CurrentStock.find({});
    
    let fixed = 0;
    let skipped = 0;
    const errors = [];

    for (const stock of currentStocks) {
      try {
        const correct = await calculateCorrectStock(stock.productId);

        const hasIssues = 
          stock.totalQuantity !== correct.totalQuantity ||
          stock.availableQuantity !== correct.availableQuantity ||
          stock.grnReceivedQuantity !== correct.grnReceivedQuantity;

        if (hasIssues) {
          // Update the fields
          await CurrentStock.updateOne(
            { _id: stock._id },
            {
              totalQuantity: correct.totalQuantity,
              availableQuantity: correct.availableQuantity,
              grnReceivedQuantity: correct.grnReceivedQuantity,
              updatedAt: new Date()
            }
          );

          fixed++;
          console.log(`✅ Fixed: ${stock.productId}`);
        } else {
          skipped++;
        }
      } catch (err) {
        errors.push({
          product: stock.productId,
          error: err.message
        });
        console.log(`❌ Error fixing ${stock.productId}: ${err.message}`);
      }
    }

    console.log(`\n${"=".repeat(70)}`);
    console.log(`✅ HEALING COMPLETE`);
    console.log(`   Fixed: ${fixed}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors.length}`);

    return { fixed, skipped, errors };
  } catch (error) {
    console.error("❌ Healing failed:", error.message);
    throw error;
  }
}

// ============================================================================
// CHECK SINGLE PRODUCT
// ============================================================================
async function checkProduct(productId) {
  console.log("=".repeat(70));
  console.log(`CURRENT STOCK CHECK - PRODUCT: ${productId}`);
  console.log("=".repeat(70));

  try {
    const stock = await CurrentStock.findOne({ productId });
    
    if (!stock) {
      console.log("❌ Product not found");
      return;
    }

    const correct = await calculateCorrectStock(productId);

    console.log(`\n📦 ${productId}\n`);
    console.log("Current Fields:");
    console.log(`  totalQuantity: ${stock.totalQuantity}`);
    console.log(`  availableQuantity: ${stock.availableQuantity}`);
    console.log(`  grnReceivedQuantity: ${stock.grnReceivedQuantity}`);

    console.log("\nCorrect Values (from movements):");
    console.log(`  totalQuantity: ${correct.totalQuantity}`);
    console.log(`  availableQuantity: ${correct.availableQuantity}`);
    console.log(`  grnReceivedQuantity: ${correct.grnReceivedQuantity}`);

    const hasIssues = 
      stock.totalQuantity !== correct.totalQuantity ||
      stock.availableQuantity !== correct.availableQuantity ||
      stock.grnReceivedQuantity !== correct.grnReceivedQuantity;

    console.log(`\nStatus: ${hasIssues ? '⚠️ HAS ISSUES' : '✅ OK'}`);

    if (hasIssues) {
      console.log("\nDifferences:");
      if (stock.totalQuantity !== correct.totalQuantity) {
        console.log(`  totalQuantity: ${stock.totalQuantity} → ${correct.totalQuantity}`);
      }
      if (stock.availableQuantity !== correct.availableQuantity) {
        console.log(`  availableQuantity: ${stock.availableQuantity} → ${correct.availableQuantity}`);
      }
      if (stock.grnReceivedQuantity !== correct.grnReceivedQuantity) {
        console.log(`  grnReceivedQuantity: ${stock.grnReceivedQuantity} → ${correct.grnReceivedQuantity}`);
      }
    }
  } catch (error) {
    console.error("❌ Check failed:", error.message);
    throw error;
  }
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  await connectDB();

  try {
    const option = process.argv[2]?.toLowerCase() || "check";

    if (option === "check") {
      await checkAllProducts();
    } else if (option === "heal") {
      await healAllProducts();
    } else if (option.startsWith("product:")) {
      const productId = option.split(":")[1];
      await checkProduct(productId);
    } else {
      console.log(`
❌ Unknown option: ${option}

Available options:
  check      - Check all products for discrepancies (default)
  heal       - Fix all discrepancies
  product:ID - Check specific product

Example:
  node current-stock-healer.js check
  node current-stock-healer.js heal
  node current-stock-healer.js product:69beef0d228dfd0cc59b9fcc
      `);
      process.exit(1);
    }

    console.log("\n✅ Script completed successfully");
  } catch (error) {
    console.error("\n❌ Script failed:", error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

main();
