import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function inspectDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexis_erp';
    console.log(`🔌 Connecting to MongoDB: ${mongoUri}`);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📊 Collections in nexiserp database:');
    collections.forEach(col => console.log(`   - ${col.name}`));

    // Check quotations collection
    console.log('\n🔍 Checking quotations collection...');
    const quotationCount = await mongoose.connection.db.collection('quotations').countDocuments();
    console.log(`   Document count: ${quotationCount}`);

    if (quotationCount > 0) {
      const sample = await mongoose.connection.db.collection('quotations').findOne();
      console.log('\n📝 Sample quotation:');
      console.log(JSON.stringify(sample, null, 2).substring(0, 500));
    }

    // Check if it's in a different collection
    console.log('\n🔍 Searching for "QT/2025-26/0008" across all collections...');
    for (const col of collections) {
      try {
        const found = await mongoose.connection.db.collection(col.name).findOne({ 
          $or: [
            { quotationNumber: 'QT/2025-26/0008' },
            { documentNumber: 'QT/2025-26/0008' }
          ]
        });
        if (found) {
          console.log(`✅ FOUND in collection: ${col.name}`);
          console.log(JSON.stringify(found, null, 2).substring(0, 300));
        }
      } catch (e) {
        // Skip collections that don't support this query
      }
    }

    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

inspectDatabase();
