import mongoose from 'mongoose';

async function check() {
  try {
    // Connect to MongoDB (this connects to the admin database by default)
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nexis_erp');
    console.log('Connected to MongoDB');
    
    // Get the admin database
    const adminDb = conn.connection.db.admin();
    
    // List all databases
    const databases = await adminDb.listDatabases();
    console.log('\nAll databases in MongoDB:');
    databases.databases.forEach((db, idx) => {
      console.log(`  ${idx + 1}. ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    // Try to connect to different possible database names
    console.log('\nTrying to connect to different database names:');
    const dbNames = ['nexiserp', 'nexis_erp', 'NEXIS-ERP', 'nexis'];
    
    for (const dbName of dbNames) {
      try {
        const mongoHost = new URL(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nexis_erp').hostname;
        const mongoPort = new URL(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nexis_erp').port || 27017;
        const uri = `mongodb://${mongoHost}:${mongoPort}/${dbName}`;
        const testConn = await mongoose.connect(uri);
        const db = testConn.connection.db;
        const collections = await db.listCollections().toArray();
        console.log(`\n  ? ${dbName}: Found ${collections.length} collections`);
        if (collections.length > 0) {
          collections.slice(0, 5).forEach(col => {
            console.log(`    - ${col.name}`);
          });
        }
        await testConn.disconnect();
      } catch (err) {
        console.log(`  ? ${dbName}: Could not connect (${err.message.split('\n')[0]})`);
      }
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

check();
