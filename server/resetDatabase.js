import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Database Reset Script
 * Drops all collections and recreates them with seeders
 * Usage: node resetDatabase.js
 */

const dbUri = process.env.MONGO_URI || 'mongodb://localhost:27017/nexis-erp';

async function resetDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(dbUri);
    console.log('✅ Connected to MongoDB');

    console.log('\n🗑️  Dropping all collections...');
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    for (const col of collections) {
      await db.dropCollection(col.name);
      console.log(`   ✅ Dropped: ${col.name}`);
    }

    console.log('\n📋 Database reset complete!\n');
    console.log('Now run the seeders in this order:\n');
    console.log('  1. node seeders/userSeed.js              (Create users & roles)');
    console.log('  2. node seeders/countryConfigSeeder.js   (Country configuration)');
    console.log('  3. node seeders/chartOfAccountsSeeder.js (Chart of Accounts)');
    console.log('  4. node seeders/sequenceSeeder.js        (Sequence/Counter setup)');
    console.log('  5. node seeders/taxMasterSeeder.js       (Tax rates)');
    console.log('  6. node seeders/hsnMasterSeeder.js       (HSN codes)\n');
    
    console.log('Or run them all with: npm run seed:all\n');

    await mongoose.connection.close();
    console.log('✅ Database reset script completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting database:', error.message);
    process.exit(1);
  }
}

resetDatabase();
