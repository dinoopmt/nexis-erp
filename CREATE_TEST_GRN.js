/**
 * Quick GRN Test Data Creator
 * This script creates a sample GRN with items for testing RTV functionality
 * Run: node CREATE_TEST_GRN.js (from project root)
 */

import mongoose from "mongoose";
import Grn from "./server/Models/Grn.js";
import CreateVendor from "./server/Models/CreateVendor.js";
import AddProduct from "./server/Models/AddProduct.js";

const DB_URL = process.env.MONGO_URL || "mongodb://localhost:27017/nexis-erp";

async function createTestGrn() {
  try {
    // Connect to database
    await mongoose.connect(DB_URL);
    console.log("✅ Connected to MongoDB");

    // Get or create a vendor
    let vendor = await CreateVendor.findOne();
    if (!vendor) {
      vendor = await CreateVendor.create({
        vendorName: "Test Vendor",
        vendorCode: "TEST-001",
        category: "Raw Materials",
        accountsPayableAccount: "2000",
        contactPerson: "Test Contact",
        email: "test@vendor.com",
        mobileNo: "9999999999",
        address: "123 Test Street",
        creditLimit: 100000,
        paymentTerms: "Net 30",
        isActive: true,
      });
      console.log("✅ Created test vendor:", vendor.vendorName);
    } else {
      console.log("✅ Using existing vendor:", vendor.vendorName);
    }

    // Get or create a product
    let product = await AddProduct.findOne();
    if (!product) {
      product = await AddProduct.create({
        productName: "Test Product",
        productCode: "PROD-001",
        barcode: "1234567890123",
        uom: "PC",
        hsn: "1234",
        category: "Raw Materials",
        subCategory: "Materials",
        quantity: 0,
        reorderPoint: 10,
        reorderQty: 50,
        costingMethod: "FIFO",
        trackExpiry: false,
        price: 100,
        sellingPrice: 150,
        isActive: true,
      });
      console.log("✅ Created test product:", product.productName);
    } else {
      console.log("✅ Using existing product:", product.productName);
    }

    // Create GRN
    const grn = await Grn.create({
      grnNumber: `GRN-TEST-${Date.now()}`,
      grnDate: new Date(),
      vendorId: vendor._id,
      vendorName: vendor.vendorName,
      vendorCode: vendor.vendorCode,
      referenceNo: "PO-" + Date.now(),
      taxType: "exclusive",
      items: [
        {
          productId: product._id,
          itemName: product.productName,
          itemCode: product.productCode,
          quantity: 50,
          unitType: "PC",
          foc: false,
          focQty: 0,
          unitCost: 100,
          itemDiscount: 0,
          itemDiscountPercent: 0,
          netCost: 5000,
          taxType: "exclusive",
          taxPercent: 0,
          taxAmount: 0,
          totalCost: 5000,
          batchNumber: "BATCH-001",
        },
      ],
      subTotal: 5000,
      itemDiscount: 0,
      itemDiscountPercent: 0,
      shippingCost: 0,
      totalSubtotal: 5000,
      taxAmount: 0,
      finalTotal: 5000,
      totalAmount: 5000,
      status: "Verified", // ✅ Changed from Draft to Verified so it shows in RTV selection
      notes: "Test GRN for RTV functionality",
      createdBy: "admin",
      createdDate: new Date(),
    });

    console.log("\n✅ Test GRN Created Successfully:");
    console.log("   GRN #:", grn.grnNumber);
    console.log("   Vendor:", grn.vendorName);
    console.log("   Items:", grn.items.length);
    console.log("   Status:", grn.status);
    console.log("   Total:", grn.totalAmount);
    console.log("\n📝 Now you can:");
    console.log("   1. Go to RTV module");
    console.log("   2. Click '+ New RTV'");
    console.log("   3. Click 'Add Items from GRN'");
    console.log("   4. You should see this GRN in the list!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating test GRN:", error.message);
    process.exit(1);
  }
}

createTestGrn();
