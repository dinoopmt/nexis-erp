import { MongoClient, ObjectId } from 'mongodb';

(async () => {
  const client = new MongoClient(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nexis_erp');
  try {
    await client.connect();
    const db = client.db('nexis_erp');
    
    console.log('🔍 Direct MongoDB Test\n');
    
    // 1. Check collection
    const collections = await db.listCollections().toArray();
    const exists = collections.some(c => c.name === 'current_stock');
    console.log(`1️⃣ Collection exists: ${exists}`);
    
    // 2. Create if doesn't exist
    if (!exists) {
      await db.createCollection('current_stock');
      console.log('   Created collection');
    }
    
    // 3. Insert test document
    const col = db.collection('current_stock');
    const testInsert = await col.insertOne({
      productId: new ObjectId(),
      totalQuantity: 100,
      availableQuantity: 100,
      createdAt: new Date()
    });
    console.log(`\n2️⃣ Inserted test doc: ${testInsert.insertedId}`);
    
    // 4. Update with $inc like GRN does
    const testProdId = new ObjectId();
    const result = await col.findOneAndUpdate(
      { productId: testProdId },
      {
        $inc: { totalQuantity: 50, availableQuantity: 50 },
        $set: { lastGrnDate: new Date() }
      },
      { upsert: true, returnDocument: 'after' }
    );
    console.log(`\n3️⃣ Upserted with $inc: ${result.value._id}`);
    console.log(`   totalQuantity: ${result.value.totalQuantity}`);
    
    // 5. Count
    const count = await col.countDocuments();
    console.log(`\n4️⃣ Collection now has ${count} documents`);
    
    // 6. List all
    const all = await col.find({}).limit(5).toArray();
    console.log(`\n5️⃣ First ${all.length} documents:`);
    all.forEach((doc, i) => {
      console.log(`   [${i}] Total: ${doc.totalQuantity}, Available: ${doc.availableQuantity}`);
    });
    
    console.log(`\n✅ MongoDB test passed!`);
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
  } finally {
    await client.close();
  }
})();
