import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nexis_erp';

async function checkCollections() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log('\n📚 Collections in database:');
    collections.forEach(col => {
      console.log('  -', col.name);
    });
    
    // Check specific collection names
    console.log('\n🔍 Checking for storesettings (case-insensitive):');
    const allCollections = await db.listCollections().toArray();
    const storeSettingsCol = allCollections.find(c => c.name.toLowerCase() === 'storesettings');
    console.log('  Found:', storeSettingsCol ? storeSettingsCol.name : 'NOT FOUND');
    
    // List all collection names
    console.log('\n📋 All collection names:');
    console.log(allCollections.map(c => c.name).sort());
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkCollections();
