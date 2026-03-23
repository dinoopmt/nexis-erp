#!/usr/bin/env node

/**
 * STOCK RECONCILIATION RUNNER
 * 
 * Run from server directory:
 * node reconciliation-runner.js [option]
 * 
 * Options:
 * - "check" (default) - Check all products, report discrepancies
 * - "heal" - Check and auto-heal discrepancies
 * - "quick" - Show top 10 discrepancies
 * - "csv" - Export report to CSV
 * - "product:ID" - Reconcile specific product
 */

import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import StockReconciliationService from "./modules/accounting/services/StockReconciliationService.js";

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
// OPTION 1: RECONCILE ALL PRODUCTS (REPORT ONLY)
// ============================================================================
async function reconcileAll() {
  console.log("=".repeat(70));
  console.log("STOCK RECONCILIATION - ALL PRODUCTS");
  console.log("=".repeat(70));

  try {
    const result = await StockReconciliationService.reconcileAllStock({
      products: [],
      autoHeal: false,
      verbose: true
    });

    const report = StockReconciliationService.generateReport(result);

    console.log("\n" + "=".repeat(70));
    console.log("RECONCILIATION REPORT");
    console.log("=".repeat(70));
    console.log(JSON.stringify(report, null, 2));

    // Save report
    const reportPath = path.join(process.cwd(), "reconciliation-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);

    return report;
  } catch (error) {
    console.error("❌ Reconciliation failed:", error.message);
    throw error;
  }
}

// ============================================================================
// OPTION 2: RECONCILE AND HEAL
// ============================================================================
async function reconcileAndHeal() {
  console.log("=".repeat(70));
  console.log("STOCK RECONCILIATION WITH AUTO-HEAL");
  console.log("=".repeat(70));
  console.log("⚠️  WARNING: This will fix all discrepancies!\n");

  try {
    const result = await StockReconciliationService.reconcileAllStock({
      products: [],
      autoHeal: true,
      verbose: true
    });

    const report = StockReconciliationService.generateReport(result);

    console.log("\n" + "=".repeat(70));
    console.log("RECONCILIATION REPORT WITH HEALING");
    console.log("=".repeat(70));
    console.log(JSON.stringify(report, null, 2));

    const reportPath = path.join(process.cwd(), "reconciliation-healed.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Healed report saved to: ${reportPath}`);

    return report;
  } catch (error) {
    console.error("❌ Reconciliation/Healing failed:", error.message);
    throw error;
  }
}

// ============================================================================
// OPTION 3: QUICK CHECK (TOP 10)
// ============================================================================
async function quickCheck() {
  console.log("=".repeat(70));
  console.log("QUICK STOCK CHECK - TOP 10 DISCREPANCIES");
  console.log("=".repeat(70));

  try {
    const result = await StockReconciliationService.reconcileAllStock({
      products: [],
      autoHeal: false,
      verbose: false
    });

    const topDiscrepancies = result.details
      .filter(d => d.hasDiscrepancy)
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
      .slice(0, 10);

    console.log(`\nFound ${result.discrepancies} total discrepancies\n`);
    console.log("TOP 10 BY VARIANCE:");
    console.log("─".repeat(70));

    topDiscrepancies.forEach((item, index) => {
      console.log(
        `${index + 1}. ${item.itemcode.padEnd(20)} ` +
        `Current: ${item.currentStock.totalQuantity.toString().padStart(8)} ` +
        `Calc: ${item.calculatedBalance.toString().padStart(8)} ` +
        `Variance: ${item.variance > 0 ? '+' : ''}${item.variance.toString().padStart(6)} ` +
        `(${item.discrepancyPercent}%)`
      );
    });

    return topDiscrepancies;
  } catch (error) {
    console.error("❌ Quick check failed:", error.message);
    throw error;
  }
}

// ============================================================================
// OPTION 4: SINGLE PRODUCT
// ============================================================================
async function reconcileProduct(productId) {
  console.log("=".repeat(70));
  console.log(`RECONCILING PRODUCT: ${productId}`);
  console.log("=".repeat(70));

  try {
    const result = await StockReconciliationService.reconcileProduct(
      productId,
      false,
      true
    );

    console.log("\n" + JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error("❌ Product reconciliation failed:", error.message);
    throw error;
  }
}

// ============================================================================
// OPTION 5: EXPORT CSV
// ============================================================================
async function exportCSV() {
  console.log("=".repeat(70));
  console.log("EXPORTING RECONCILIATION TO CSV");
  console.log("=".repeat(70));

  try {
    const result = await StockReconciliationService.reconcileAllStock({
      products: [],
      autoHeal: false,
      verbose: false
    });

    const report = StockReconciliationService.generateReport(result);
    const csv = StockReconciliationService.exportReport(report, 'csv');

    const csvPath = path.join(process.cwd(), "reconciliation-report.csv");
    fs.writeFileSync(csvPath, csv);

    console.log(`✅ CSV report saved to: ${csvPath}`);
    console.log(`\nTotal discrepancies: ${report.discrepancies.length}`);

    return csv;
  } catch (error) {
    console.error("❌ Export failed:", error.message);
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
      await reconcileAll();
    } else if (option === "heal") {
      await reconcileAndHeal();
    } else if (option === "quick") {
      await quickCheck();
    } else if (option === "csv") {
      await exportCSV();
    } else if (option.startsWith("product:")) {
      const productId = option.split(":")[1];
      await reconcileProduct(productId);
    } else {
      console.log(`
❌ Unknown option: ${option}

Available options:
  check      - Check all products (default)
  heal       - Check and auto-heal
  quick      - Show top 10 discrepancies
  csv        - Export to CSV
  product:ID - Check specific product

Example:
  node reconciliation-runner.js check
  node reconciliation-runner.js heal
  node reconciliation-runner.js product:69beef0d228dfd0cc59b9fcc
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
