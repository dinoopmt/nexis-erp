import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nexis_erp';

async function checkStoreSettings() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('storeSettings');
    
    const count = await collection.countDocuments();
    console.log(`\n📊 Total documents in storeSettings: ${count}`);
    
    if (count > 0) {
      const doc = await collection.findOne({});
      console.log('\n📄 First document:');
      console.log(JSON.stringify(doc, null, 2));
      
      console.log('\n🔍 templateMappings field:');
      console.log(JSON.stringify(doc?.templateMappings, null, 2));
      
      if (!doc.templateMappings) {
        console.log('⚠️  templateMappings field is missing or undefined!');
      }
    } else {
      console.log('⚠️  No documents found in storeSettings collection!');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkStoreSettings();
