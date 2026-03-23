/**
 * STOCK RECONCILIATION SCRIPT
 * 
 * IMPORTANT: Run from server directory!
 * cd server && node ../scripts/reconciliation-script.js
 * 
 * Usage examples:
 * 1. Reconcile all products (find discrepancies)
 * 2. Reconcile and auto-heal all products
 * 3. Reconcile specific products
 * 4. Export report
 */

import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import from server modules (supports running from scripts or server dir)
import StockReconciliationService from "../server/modules/accounting/services/StockReconciliationService.js";
import StockMovement from "../server/Models/StockMovement.js";

// Connect to MongoDB
async function connectDB() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/nexis-erp";
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
    });
    console.log("✅ MongoDB connected\n");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    console.error("⚠️ Make sure MongoDB is running at:", process.env.MONGO_URI || "mongodb://localhost:27017");
    process.exit(1);
  }
}

// ============================================================================
// OPTION 1: RECONCILE ALL PRODUCTS (REPORT ONLY - NO HEALING)
// ============================================================================
async function reconcileAllProducts() {
  console.log("=".repeat(70));
  console.log("STOCK RECONCILIATION - ALL PRODUCTS");
  console.log("=".repeat(70));

  try {
    const reconciliationData = await StockReconciliationService.reconcileAllStock({
      products: [],        // Empty = all products
      autoHeal: false,     // Just report, don't heal
      verbose: true        // Detailed output
    });

    // Generate formatted report
    const report = StockReconciliationService.generateReport(reconciliationData);

    console.log("\n" + "=".repeat(70));
    console.log("RECONCILIATION REPORT");
    console.log("=".repeat(70));
    console.log(JSON.stringify(report, null, 2));

    // Export to JSON file
    const fs = (await import("fs")).default;
    const path = (await import("path")).default;
    const reportPath = path.join(process.cwd(), "reconciliation-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);

    return report;
  } catch (error) {
    console.error("❌ Reconciliation failed:", error.message);
    process.exit(1);
  }
}

// ============================================================================
// OPTION 2: RECONCILE AND AUTO-HEAL ALL PRODUCTS
// ============================================================================
async function reconcileAndHealAll() {
  console.log("=".repeat(70));
  console.log("STOCK RECONCILIATION WITH AUTO-HEAL - ALL PRODUCTS");
  console.log("=".repeat(70));

  try {
    const reconciliationData = await StockReconciliationService.reconcileAllStock({
      products: [],        // All products
      autoHeal: true,      // ⚠️ HEAL DISCREPANCIES
      verbose: true
    });

    const report = StockReconciliationService.generateReport(reconciliationData);

    console.log("\n" + "=".repeat(70));
    console.log("RECONCILIATION REPORT WITH HEALING");
    console.log("=".repeat(70));
    console.log(JSON.stringify(report, null, 2));

    // Export
    const fs = (await import("fs")).default;
    const path = (await import("path")).default;
    const reportPath = path.join(process.cwd(), "reconciliation-healed.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Healed report saved to: ${reportPath}`);

    return report;
  } catch (error) {
    console.error("❌ Reconciliation/Healing failed:", error.message);
    process.exit(1);
  }
}

// ============================================================================
// OPTION 3: RECONCILE SPECIFIC PRODUCTS
// ============================================================================
async function reconcileSpecificProducts(productIds) {
  console.log("=".repeat(70));
  console.log(`RECONCILING ${productIds.length} SPECIFIC PRODUCTS`);
  console.log("=".repeat(70));

  try {
    // Convert to ObjectId if needed
    const ids = productIds.map(id => 
      typeof id === 'string' ? id : id.toString()
    );

    const reconciliationData = await StockReconciliationService.reconcileAllStock({
      products: ids,
      autoHeal: false,
      verbose: true
    });

    const report = StockReconciliationService.generateReport(reconciliationData);
    console.log("\n" + "=".repeat(70));
    console.log("RECONCILIATION REPORT - SPECIFIC PRODUCTS");
    console.log("=".repeat(70));
    console.log(JSON.stringify(report, null, 2));

    return report;
  } catch (error) {
    console.error("❌ Reconciliation failed:", error.message);
    process.exit(1);
  }
}

// ============================================================================
// OPTION 4: QUICK CHECK (TOP 10 DISCREPANCIES)
// ============================================================================
async function quickCheck() {
  console.log("=".repeat(70));
  console.log("QUICK STOCK CHECK - TOP 10 DISCREPANCIES");
  console.log("=".repeat(70));

  try {
    const reconciliationData = await StockReconciliationService.reconcileAllStock({
      products: [],
      autoHeal: false,
      verbose: false  // Silent mode
    });

    const topDiscrepancies = reconciliationData.details
      .filter(d => d.hasDiscrepancy)
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
      .slice(0, 10);

    console.log(`\nFound ${reconciliationData.discrepancies} total discrepancies\n`);
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
    process.exit(1);
  }
}

// ============================================================================
// OPTION 5: EXPORT TO CSV
// ============================================================================
async function exportReconciliationCSV() {
  console.log("=".repeat(70));
  console.log("EXPORTING RECONCILIATION TO CSV");
  console.log("=".repeat(70));

  try {
    const reconciliationData = await StockReconciliationService.reconcileAllStock({
      products: [],
      autoHeal: false,
      verbose: false
    });

    const report = StockReconciliationService.generateReport(reconciliationData);
    const csv = StockReconciliationService.exportReport(report, 'csv');

    // Save CSV
    const fs = (await import("fs")).default;
    const path = (await import("path")).default;
    const csvPath = path.join(process.cwd(), "reconciliation-report.csv");
    fs.writeFileSync(csvPath, csv);

    console.log(`✅ CSV report saved to: ${csvPath}`);
    console.log(`\nTotal lines: ${csv.split('\n').length - 1}`);

    return csv;
  } catch (error) {
    console.error("❌ Export failed:", error.message);
    process.exit(1);
  }
}

// ============================================================================
// CHOOSE YOUR OPTION
// ============================================================================
// Run one of these:
// await reconcileAllProducts();        // Just check
// await reconcileAndHealAll();         // Check + heal
// await reconcileSpecificProducts([...productIds]);  // Specific products
// await quickCheck();                  // Top discrepancies
// await exportReconciliationCSV();     // Export CSV

// Default: Run full reconciliation
(async () => {
  await connectDB();
  
  try {
    await reconcileAllProducts();
    console.log("\n✅ Script completed");
  } catch (err) {
    console.error("❌ Script failed:", err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
})();
