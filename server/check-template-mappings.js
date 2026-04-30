import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nexis_erp';

async function checkData() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('storesettings');
    
    const doc = await collection.findOne({});
    console.log('\n📊 StoreSettings document:');
    console.log(JSON.stringify(doc, null, 2));
    
    console.log('\n🔍 templateMappings field:');
    console.log(JSON.stringify(doc?.templateMappings, null, 2));
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkData();
