/**
 * Create test GRN data for testing the edit system
 */

import mongoose from "mongoose";
import Grn from "../Models/Grn.js";
import CurrentStock from "../Models/CurrentStock.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/nexis-erp";

async function createTestData() {
  try {
    console.log("\n📝 CREATING TEST DATA...\n");

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Create a test product
    const testProductId = new mongoose.Types.ObjectId();
    
    // Create test GRN
    const testGrn = new Grn({
      grnNumber: `GRN-TEST-${Date.now()}`,
      vendorId: new mongoose.Types.ObjectId(),
      vendorName: "Test Vendor",
      grnDate: new Date(),
      status: "Received",
      items: [
        {
          productId: testProductId,
          itemName: "Test Product",
          itemCode: "TEST-001",
          quantity: 10,
          unitCost: 100,
          totalCost: 1000,
          batchNumber: "BATCH-001",
          expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        }
      ],
      shippingCost: 50,
      totalAmount: 1050,
      discount: 0,
      finalTotal: 1050,
      notes: "Test GRN for edit testing",
      createdBy: new mongoose.Types.ObjectId(),
      postedDate: new Date(),
      postedBy: new mongoose.Types.ObjectId(),
    });

    await testGrn.save();
    console.log(`✅ Created test GRN: ${testGrn.grnNumber}`);
    console.log(`   ID: ${testGrn._id}`);
    console.log(`   Items: ${testGrn.items.length}`);

    // Create current stock for the product
    const currentStock = new CurrentStock({
      productId: testProductId,
      availableQuantity: 50,
      reservedQuantity: 0,
      location: "Warehouse-A",
      lastActivity: new Date(),
      createdBy: new mongoose.Types.ObjectId(),
    });

    await currentStock.save();
    console.log(`\n✅ Created CurrentStock`);
    console.log(`   Product ID: ${testProductId}`);
    console.log(`   Available: 50 units`);

    // List all GRNs now
    const allGrns = await Grn.find().select("grnNumber status items");
    console.log(`\n📊 Total GRNs in database: ${allGrns.length}`);
    allGrns.forEach((grn, idx) => {
      console.log(`   ${idx + 1}. ${grn.grnNumber} - ${grn.status} (${grn.items?.length || 0} items)`);
    });

    console.log(`\n✅ Test data ready for editing!\n`);
    console.log(`Try editing GRN with ID: ${testGrn._id}`);

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createTestData();
