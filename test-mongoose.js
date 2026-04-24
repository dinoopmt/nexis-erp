import mongoose from 'mongoose';
import CurrentStock from './server/Models/CurrentStock.js';

(async () => {
  try {
    console.log('📦 Testing MongoDB and Mongoose CurrentStock...\n');
    
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nexis_erp');
    const db = mongoose.connection.db;
    
    // Step 1: Check collection exists
    const collections = await db.listCollections().toArray();
    const hasCurrentStock = collections.some(c => c.name === 'current_stock');
    console.log(`1️⃣ Collection 'current_stock' exists: ${hasCurrentStock}`);
    if (!hasCurrentStock) {
      console.log(`   Creating collection...`);
      await db.createCollection('current_stock');
    }
    
    // Step 2: Check Mongoose model
    console.log(`\n2️⃣ Mongoose Model:`, {
      modelName: CurrentStock.modelName,
      collection: CurrentStock.collection.name,
      loaded: !!CurrentStock
    });
    
    // Step 3: Try inserting via Mongoose
    console.log(`\n3️⃣ Testing Mongoose insert...`);
    const testDoc = new CurrentStock({
      productId: new mongoose.Types.ObjectId(),
      totalQuantity: 100,
      availableQuantity: 100
    });
    const saved = await testDoc.save();
    console.log(`   ✅ Inserted:`, saved._id);
    
    // Step 4: Check MongoDB collection directly
    console.log(`\n4️⃣ MongoDB collection content:`);
    const count = await db.collection('current_stock').countDocuments();
    console.log(`   Documents: ${count}`);
    
    // Step 5: Try update operation like GRN does
    console.log(`\n5️⃣ Testing atomic update (like GRN):`)
    const productId = new mongoose.Types.ObjectId();
    const result = await CurrentStock.findOneAndUpdate(
      { productId },
      {
        $inc: { totalQuantity: 50, availableQuantity: 50 },
        $set: { lastGrnDate: new Date() }
      },
      { upsert: true, new: true }
    );
    console.log(`   ✅ Update result:`, {
      id: result._id.toString(),
      totalQuantity: result.totalQuantity,
      availableQuantity: result.availableQuantity
    });
    
    // Step 6: Final count
    console.log(`\n6️⃣ Final collection count:`);
    const finalCount = await db.collection('current_stock').countDocuments();
    console.log(`   Documents: ${finalCount}`);
    
    console.log(`\n✅ All tests passed!`);
    await mongoose.connection.close();
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
  }
})();
