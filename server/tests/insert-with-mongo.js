import { MongoClient, ObjectId } from "mongodb";

const MONGO_URI = "mongodb://localhost:27017";

async function insertTestData() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db("nexis-erp");

    // Clear existing data
    await db.collection("goods_receipt_notes").deleteMany({});
    await db.collection("current_stock").deleteMany({});
    await db.collection("inventory_batches").deleteMany({});
    await db.collection("vendor_payments").deleteMany({});
    console.log("✅ Cleared existing test data\n");

    // ObjectIds
    const grnId = new ObjectId("69bfe69509638db9c685d637");
    const productId = new ObjectId("69beef0d228dfd0cc59b9fcc");
    const vendorId = new ObjectId("69beeef6228dfd0cc59b9fbd");
    const userId = new ObjectId("69beee6a4083203fc968ae78");

    // Insert GRN
    const grnResult = await db.collection("goods_receipt_notes").insertOne({
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
      updatedDate: new Date("2026-03-22T12:54:45.082Z"),
      createdDate: new Date("2026-03-22T12:54:45.082Z"),
      __v: 0
    });
    console.log(`✅ GRN inserted: ${grnId}`);

    // Insert CurrentStock
    const stockResult = await db.collection("current_stock").insertOne({
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

    // Insert InventoryBatch
    const batchResult = await db.collection("inventory_batches").insertOne({
      productId: productId,
      batchNumber: "",
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
    const paymentResult = await db.collection("vendor_payments").insertOne({
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
    console.log(`   Command: node tests/test-grn-edit-actual.js`);

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

insertTestData();
