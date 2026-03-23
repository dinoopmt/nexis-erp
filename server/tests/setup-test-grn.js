import mongoose from "mongoose";
import Grn from "../Models/Grn.js";
import CreateVendor from "../Models/CreateVendor.js";
import AddProduct from "../Models/AddProduct.js";
import CurrentStock from "../Models/CurrentStock.js";
import InventoryBatch from "../Models/InventoryBatch.js";
import VendorPayment from "../Models/VendorPayment.js";

const MONGO_URI = "mongodb://localhost:27017/NEXIS_ERP_TEST";

async function setupTestData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to test database");

    // Clear existing data
    await Grn.deleteMany({});
    await CurrentStock.deleteMany({});
    await InventoryBatch.deleteMany({});
    await VendorPayment.deleteMany({});
    await CreateVendor.deleteMany({});
    await AddProduct.deleteMany({});

    // Create vendor
    const vendor = await CreateVendor.create({
      vendorCode: "ARAB001",
      name: "al arab",
      email: "test@arab.com",
      phone: "123456789",
      address: "Test Address",
      city: "Test City",
      country: "AE"
    });
    console.log(`✅ Created vendor: ${vendor._id}`);

    // Create product
    const product = await AddProduct.create({
      productName: "I phone 6 s pluse",
      productCode: "1001",
      description: "Apple iPhone 6s Plus"
    });
    console.log(`✅ Created product: ${product._id}`);

    // Create GRN
    const grn = await Grn.create({
      grnNumber: "GRN-2025-2026-00053",
      grnDate: new Date("2026-03-22"),
      vendorId: vendor._id,
      vendorName: "al arab",
      referenceNumber: "1",
      invoiceNo: "1",
      lpoNo: "1",
      paymentTerms: "due_on_receipt",
      taxType: "exclusive",
      deliveryDate: new Date("2026-03-22"),
      shippingCost: 0,
      totalQty: 50,
      subtotal: 500,
      discountAmount: 0,
      discountPercent: 0,
      totalExTax: 500,
      taxAmount: 25,
      netTotal: 525,
      finalTotal: 525,
      totalAmount: 525,
      status: "Received",
      items: [
        {
          productId: product._id,
          itemName: "I phone 6 s pluse",
          itemCode: "1001",
          quantity: 50,
          unitType: "Piece",
          foc: false,
          focQty: 0,
          unitCost: 10,
          itemDiscount: 0,
          itemDiscountPercent: 0,
          netCost: 500,
          taxType: "exclusive",
          taxPercent: 5,
          taxAmount: 25,
          totalCost: 525,
          batchNumber: "",
          expiryDate: null,
          notes: "",
          rtvReturnedQuantity: 0
        }
      ],
      notes: "",
      createdBy: new mongoose.Types.ObjectId()
    });
    console.log(`✅ Created GRN: ${grn._id}`);

    // Create CurrentStock
    const stock = await CurrentStock.create({
      productId: product._id,
      totalQuantity: 50,
      grnReceivedQuantity: 50,
      availableQuantity: 50,
      allocatedQuantity: 0,
      damageQuality: 0,
      lastActivity: {
        timestamp: new Date(),
        type: "GRN",
        referenceId: grn._id,
        reference: grn.grnNumber
      }
    });
    console.log(`✅ Created CurrentStock: totalQuantity=${stock.totalQuantity}`);

    // Create InventoryBatch (with batch number blank in GRN, so create with default)
    const batch = await InventoryBatch.create({
      productId: product._id,
      batchNumber: "DEFAULT",
      purchasePrice: 10,
      quantity: 50,
      quantityRemaining: 50,
      purchaseDate: new Date("2026-03-22"),
      vendorId: vendor._id,
      invoiceNumber: "1",
      batchStatus: "ACTIVE"
    });
    console.log(`✅ Created InventoryBatch: quantity=${batch.quantity}`);

    // Create VendorPayment
    const payment = await VendorPayment.create({
      grnId: grn._id.toString(),
      grnDate: new Date("2026-03-22"),
      vendorId: vendor._id,
      vendorName: "al arab",
      type: "ITEMS",
      initialAmount: 525,
      amountPaid: 0,
      balance: 525,
      paymentTerms: "IMMEDIATE",
      dueDate: new Date("2026-04-21"),
      creditDays: 30,
      paymentStatus: "PENDING",
      createdBy: grn.createdBy
    });
    console.log(`✅ Created VendorPayment: initialAmount=${payment.initialAmount}`);

    console.log("\n✅ Test data setup complete!");
    console.log(`\n📋 Test Setup Summary:`);
    console.log(`   GRN ID: ${grn._id}`);
    console.log(`   Product ID: ${product._id}`);
    console.log(`   Vendor ID: ${vendor._id}`);
    console.log(`   Initial Qty: 50`);

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Setup error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

setupTestData();
