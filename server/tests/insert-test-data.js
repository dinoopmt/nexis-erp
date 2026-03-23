import mongoose from "mongoose";
import Grn from "../Models/Grn.js";
import CurrentStock from "../Models/CurrentStock.js";
import InventoryBatch from "../Models/InventoryBatch.js";
import VendorPayment from "../Models/VendorPayment.js";
import CreateVendor from "../Models/CreateVendor.js";
import AddProduct from "../Models/AddProduct.js";

const MONGO_URI = "mongodb://localhost:27017/nexis-erp";

async function insertTestData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to nexis-erp database\n");

    // Clear existing data
    await Grn.deleteMany({});
    await CurrentStock.deleteMany({});
    await InventoryBatch.deleteMany({});
    await VendorPayment.deleteMany({});
    console.log("✅ Cleared existing test data\n");

    // Use provided ObjectIds
    const vendorId = new mongoose.Types.ObjectId("69beeef6228dfd0cc59b9fbd");
    const productId = new mongoose.Types.ObjectId("69beef0d228dfd0cc59b9fcc");
    const userId = new mongoose.Types.ObjectId("69beee6a4083203fc968ae78");
    const grnId = new mongoose.Types.ObjectId("69bfe69509638db9c685d637");

    // Insert Vendor (minimal required fields)
    const vendor = await CreateVendor.insertOne({
      _id: vendorId,
      vendorCode: "ARAB001",
      name: "al arab",
      country: "AE"
    });
    console.log(`✅ Vendor inserted: ${vendorId}`);

    // Insert Product (minimal required fields)
    const product = await AddProduct.insertOne({
      _id: productId,
      name: "I phone 6 s pluse",
      itemcode: "1001",
      barcode: "1001",
      price: 10,
      cost: 10,
      stock: 50,
      factor: 1,
      unitType: "Piece",
      categoryId: new mongoose.Types.ObjectId(),
      vendor: vendorId
    });
    console.log(`✅ Product inserted: ${productId}`);

    // Insert GRN with exact data provided
    const grn = await Grn.insertOne({
      _id: grnId,
      grnNumber: "GRN-2025-2026-00053",
      grnDate: new Date("2026-03-22"),
      vendorId: vendorId,
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
          productId: productId,
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
      createdBy: userId,
      createdDate: new Date("2026-03-22T12:54:45.082Z"),
      updatedDate: new Date("2026-03-22T12:54:45.082Z")
    });
    console.log(`✅ GRN inserted: ${grnId}`);

    // Insert CurrentStock
    const stock = await CurrentStock.insertOne({
      productId: productId,
      totalQuantity: 50,
      grnReceivedQuantity: 50,
      availableQuantity: 50,
      allocatedQuantity: 0,
      damageQuality: 0,
      lastActivity: {
        timestamp: new Date(),
        type: "GRN",
        referenceId: grnId,
        reference: "GRN-2025-2026-00053"
      }
    });
    console.log(`✅ CurrentStock inserted: totalQuantity=50`);

    // Insert InventoryBatch (with default batch number since item has empty batch)
    const batch = await InventoryBatch.insertOne({
      productId: productId,
      batchNumber: "",  // Match the empty batch number from GRN
      purchasePrice: 10,
      quantity: 50,
      quantityRemaining: 50,
      purchaseDate: new Date("2026-03-22"),
      vendorId: vendorId,
      invoiceNumber: "1",
      batchStatus: "ACTIVE"
    });
    console.log(`✅ InventoryBatch inserted: quantity=50`);

    // Insert VendorPayment
    const payment = await VendorPayment.insertOne({
      grnId: grnId.toString(),
      grnDate: new Date("2026-03-22"),
      vendorId: vendorId,
      vendorName: "al arab",
      type: "ITEMS",
      initialAmount: 525,
      amountPaid: 0,
      balance: 525,
      paymentTerms: "IMMEDIATE",
      dueDate: new Date("2026-04-21"),
      creditDays: 30,
      paymentStatus: "PENDING",
      createdBy: userId
    });
    console.log(`✅ VendorPayment inserted: initialAmount=525`);

    console.log(`\n✅ All test data inserted successfully!\n`);
    console.log(`📋 Setup complete. You can now run the edit test.`);

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

insertTestData();
