import { MongoClient } from "mongodb";

const MONGO_URI = "mongodb://localhost:27017";

async function cleanupTestDatabase() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db('nexis-erp');
    
    // Clear the collections we used for testing
    const collections = ['goods_receipt_notes', 'current_stock', 'inventory_batches', 'vendor_payments', 'stock_movements', 'products'];
    
    console.log("🗑️  Clearing test data from 'nexis-erp':\n");
    
    for (const collName of collections) {
      const coll = db.collection(collName);
      const result = await coll.deleteMany({});
      console.log(`   - ${collName}: ${result.deletedCount} documents deleted`);
    }

    console.log(`\n✅ Test data cleaned up from nexis-erp`);
    console.log(`\n📋 Your original database 'nexis_erp' is untouched`);

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

cleanupTestDatabase();
