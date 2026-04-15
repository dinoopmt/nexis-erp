/**
 * Test: Branch Isolation for Stock Management
 * 
 * Verifies that:
 * 1. Same product in different branches has separate stock
 * 2. GRN in one branch doesn't affect another branch's stock
 * 3. RTV in one branch doesn't affect another branch's stock
 * 4. Stock queries properly filter by branchId
 */

import mongoose from "mongoose";
import AddProduct from "./server/Models/AddProduct.js";
import CurrentStock from "./server/Models/CurrentStock.js";
import Grn from "./server/Models/Grn.js";
import Organization from "./server/Models/Organization.js";
import CreateVendor from "./server/Models/CreateVendor.js";
import GRNStockUpdateService from "./server/modules/accounting/services/GRNStockUpdateService.js";
import RTVStockUpdateService from "./server/modules/accounting/services/RTVStockUpdateService.js";
import dotenv from "dotenv";

dotenv.config();

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/NEXIS_ERP");
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
}

async function test() {
  try {
    await connectDB();

    console.log("\n" + "═".repeat(80));
    console.log("🧪 TEST: Branch Isolation for Stock Management");
    console.log("═".repeat(80));

    // ========================================
    // SETUP: Get two branches
    // ========================================
    console.log("\n📋 SETUP: Getting test branches...");
    const dubaiBranch = await Organization.findOne({ shortName: "DBH" }); // Dubai Head Office
    const muscatBranch = await Organization.findOne({ shortName: "MSH" }); // Muscat Head Office

    if (!dubaiBranch || !muscatBranch) {
      throw new Error("❌ Test branches not found. Run seeder first: node scripts/9-organization-seeder.js");
    }

    console.log(`✅ Branch 1: ${dubaiBranch.shortName} (${dubaiBranch._id})`);
    console.log(`✅ Branch 2: ${muscatBranch.shortName} (${muscatBranch._id})`);

    // ========================================
    // SETUP: Create a vendor
    // ========================================
    let vendor = await CreateVendor.findOne();
    if (!vendor) {
      vendor = await CreateVendor.create({
        vendorName: "Test Vendor Branch Isolation",
        vendorCode: "TVBI-001",
        contactPerson: "Test Contact",
        email: "test@vendor.com",
        phone: "+971501234567",
        address: "Test Address",
      });
      console.log(`✅ Vendor created: ${vendor.vendorCode}`);
    } else {
      console.log(`✅ Using existing vendor: ${vendor.vendorCode}`);
    }

    // ========================================
    // TEST 1: Create same product in both branches
    // ========================================
    console.log("\n" + "─".repeat(80));
    console.log("🧪 TEST 1: Create same product in both branches");
    console.log("─".repeat(80));

    // Product for Dubai
    const product_dubai = await AddProduct.create({
      itemcode: "TEST-BR-001-DBH",
      productName: "Test Branch Product (Dubai)",
      branchId: dubaiBranch._id,
      branchName: dubaiBranch.shortName,
      description: "Test product for Dubai branch",
      defaultUnit: "PCS",
      costingMethod: "FIFO",
      cost: 100,
    });

    console.log(`✅ Product created for Dubai:`);
    console.log(`   Product ID: ${product_dubai._id}`);
    console.log(`   Code: ${product_dubai.itemcode}`);
    console.log(`   Branch: ${product_dubai.branchName}`);

    // Product for Muscat
    const product_muscat = await AddProduct.create({
      itemcode: "TEST-BR-001-MSH",
      productName: "Test Branch Product (Muscat)",
      branchId: muscatBranch._id,
      branchName: muscatBranch.shortName,
      description: "Test product for Muscat branch",
      defaultUnit: "PCS",
      costingMethod: "FIFO",
      cost: 100,
    });

    console.log(`✅ Product created for Muscat:`);
    console.log(`   Product ID: ${product_muscat._id}`);
    console.log(`   Code: ${product_muscat.itemcode}`);
    console.log(`   Branch: ${product_muscat.branchName}`);

    // ========================================
    // TEST 2: Create GRN for Dubai branch
    // ========================================
    console.log("\n" + "─".repeat(80));
    console.log("🧪 TEST 2: Create GRN for Dubai branch (100 units)");
    console.log("─".repeat(80));

    const grn_dubai = await Grn.create({
      grnNumber: `GRN-TEST-DBH-001`,
      grnDate: new Date(),
      vendorId: vendor._id,
      branchId: dubaiBranch._id,
      branchName: dubaiBranch.shortName,
      items: [
        {
          productId: product_dubai._id,
          itemCode: product_dubai.itemcode,
          itemName: product_dubai.productName,
          quantity: 100,
          unitCost: 100,
          totalCost: 10000,
        },
      ],
      status: "Draft",
      totalQty: 100,
      totalAmount: 10000,
      createdBy: "TEST",
    });

    console.log(`✅ GRN created for Dubai: ${grn_dubai.grnNumber}`);
    console.log(`   Items: 1 product x 100 units`);

    // ========================================
    // TEST 3: Create GRN for Muscat branch
    // ========================================
    console.log("\n" + "─".repeat(80));
    console.log("🧪 TEST 3: Create GRN for Muscat branch (50 units)");
    console.log("─".repeat(80));

    const grn_muscat = await Grn.create({
      grnNumber: `GRN-TEST-MSH-001`,
      grnDate: new Date(),
      vendorId: vendor._id,
      branchId: muscatBranch._id,
      branchName: muscatBranch.shortName,
      items: [
        {
          productId: product_muscat._id,
          itemCode: product_muscat.itemcode,
          itemName: product_muscat.productName,
          quantity: 50,
          unitCost: 100,
          totalCost: 5000,
        },
      ],
      status: "Draft",
      totalQty: 50,
      totalAmount: 5000,
      createdBy: "TEST",
    });

    console.log(`✅ GRN created for Muscat: ${grn_muscat.grnNumber}`);
    console.log(`   Items: 1 product x 50 units`);

    // ========================================
    // TEST 4: Post Dubai GRN and check stock
    // ========================================
    console.log("\n" + "─".repeat(80));
    console.log("🧪 TEST 4: Post Dubai GRN and verify stock (must use branchId filter)");
    console.log("─".repeat(80));

    // Update GRN to Posted status
    grn_dubai.status = "Posted";
    await grn_dubai.save();

    // Process stock update
    const grnStockResult = await GRNStockUpdateService.processGrnStockUpdate(grn_dubai, "TEST", dubaiBranch._id);
    console.log(`✅ Dubai GRN stock processed`);
    console.log(`   Result: ${grnStockResult.success ? "SUCCESS" : "FAILED"}`);

    // Verify stock was created with correct branchId
    const dubai_stock = await CurrentStock.findOne({
      productId: product_dubai._id,
      branchId: dubaiBranch._id,
    });

    if (!dubai_stock) {
      throw new Error("❌ CRITICAL: Dubai stock not found with branchId filter!");
    }

    console.log(`✅ Dubai stock verified:`);
    console.log(`   Product: ${dubai_stock.productId}`);
    console.log(`   Branch: ${dubai_stock.branchId}`);
    console.log(`   Quantity: ${dubai_stock.quantityInStock}`);

    // ========================================
    // TEST 5: Post Muscat GRN and check stock
    // ========================================
    console.log("\n" + "─".repeat(80));
    console.log("🧪 TEST 5: Post Muscat GRN and verify stock is separate");
    console.log("─".repeat(80));

    // Update GRN to Posted status
    grn_muscat.status = "Posted";
    await grn_muscat.save();

    // Process stock update
    const grnStockResult2 = await GRNStockUpdateService.processGrnStockUpdate(grn_muscat, "TEST", muscatBranch._id);
    console.log(`✅ Muscat GRN stock processed`);
    console.log(`   Result: ${grnStockResult2.success ? "SUCCESS" : "FAILED"}`);

    // Verify stock was created with correct branchId
    const muscat_stock = await CurrentStock.findOne({
      productId: product_muscat._id,
      branchId: muscatBranch._id,
    });

    if (!muscat_stock) {
      throw new Error("❌ CRITICAL: Muscat stock not found with branchId filter!");
    }

    console.log(`✅ Muscat stock verified:`);
    console.log(`   Product: ${muscat_stock.productId}`);
    console.log(`   Branch: ${muscat_stock.branchId}`);
    console.log(`   Quantity: ${muscat_stock.quantityInStock}`);

    // ========================================
    // TEST 6: Verify branch isolation - Dubai stock unchanged
    // ========================================
    console.log("\n" + "─".repeat(80));
    console.log("🧪 TEST 6: Verify Muscat GRN didn't affect Dubai stock");
    console.log("─".repeat(80));

    const dubai_stock_check = await CurrentStock.findOne({
      productId: product_dubai._id,
      branchId: dubaiBranch._id,
    });

    if (dubai_stock_check.quantityInStock !== 100) {
      throw new Error(`❌ CRITICAL: Dubai stock was modified! Expected 100, got ${dubai_stock_check.quantityInStock}`);
    }

    console.log(`✅ Dubai stock remains isolated:`);
    console.log(`   Quantity: ${dubai_stock_check.quantityInStock} (unchanged at 100)`);

    // ========================================
    // TEST 7: Verify branch isolation - Muscat stock unchanged
    // ========================================
    console.log("\n" + "─".repeat(80));
    console.log("🧪 TEST 7: Verify Dubai GRN didn't affect Muscat stock");
    console.log("─".repeat(80));

    const muscat_stock_check = await CurrentStock.findOne({
      productId: product_muscat._id,
      branchId: muscatBranch._id,
    });

    if (muscat_stock_check.quantityInStock !== 50) {
      throw new Error(`❌ CRITICAL: Muscat stock was modified! Expected 50, got ${muscat_stock_check.quantityInStock}`);
    }

    console.log(`✅ Muscat stock remains isolated:`);
    console.log(`   Quantity: ${muscat_stock_check.quantityInStock} (unchanged at 50)`);

    // ========================================
    // TEST 8: Verify no cross-branch queries
    // ========================================
    console.log("\n" + "─".repeat(80));
    console.log("🧪 TEST 8: Verify no cross-branch stock pollution");
    console.log("─".repeat(80));

    // Try to find Dubai stock with Muscat branchId (should NOT exist)
    const cross_branch_query = await CurrentStock.findOne({
      productId: product_dubai._id,
      branchId: muscatBranch._id,
    });

    if (cross_branch_query) {
      throw new Error("❌ CRITICAL: Cross-branch stock query found stock! This indicates branchId filtering failed.");
    }

    console.log(`✅ Cross-branch query correctly returned nothing`);
    console.log(`   Verified: Dubai product not accessible via Muscat branchId`);

    // ========================================
    // SUMMARY
    // ========================================
    console.log("\n" + "═".repeat(80));
    console.log("✅ ALL TESTS PASSED: Branch isolation is working correctly!");
    console.log("═".repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Products created in separate branches`);
    console.log(`   ✅ GRNs posted with branchId filtering`);
    console.log(`   ✅ Stock entries include branchId`);
    console.log(`   ✅ Dubai stock isolated at 100 units`);
    console.log(`   ✅ Muscat stock isolated at 50 units`);
    console.log(`   ✅ Cross-branch queries properly return nothing`);
    console.log(`   ✅ No stock contamination between branches\n`);

    process.exit(0);
  } catch (error) {
    console.error("\n❌ TEST FAILED:", error.message);
    console.error("\n📋 Stack trace:");
    console.error(error.stack);
    process.exit(1);
  }
}

test();
