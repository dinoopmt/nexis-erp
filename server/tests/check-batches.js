import mongoose from "mongoose";
import InventoryBatch from "../Models/InventoryBatch.js";

const MONGO_URI = "mongodb://localhost:27017/nexis-erp";

async function checkBatches() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected\n");

    const productId = mongoose.Types.ObjectId.createFromHexString("69beef0d228dfd0cc59b9fcc");

    const batches = await InventoryBatch.find({ productId });
    console.log(`Found ${batches.length} batches for product ${productId}:\n`);

    batches.forEach(b => {
      console.log(`- batchNumber: "${b.batchNumber}"`);
      console.log(`  quantity: ${b.quantity}`);
      console.log(`  _id: ${b._id}\n`);
    });

    // Try query with empty string
    const emptyBatch = await InventoryBatch.findOne({ productId, batchNumber: "" });
    console.log(`\nQuery with batchNumber="": ${emptyBatch ? 'FOUND' : 'NOT FOUND'}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkBatches();
