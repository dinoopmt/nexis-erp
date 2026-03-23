import { MongoClient } from "mongodb";

const MONGO_URI = "mongodb://localhost:27017";

async function deleteTestDatabase() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const admin = client.db().admin();
    
    // Drop the test database
    const testDb = client.db('nexis-erp-test');
    await testDb.dropDatabase();
    console.log("✅ Database 'nexis-erp-test' deleted successfully");

    // List remaining databases
    const databases = await admin.listDatabases();
    console.log(`\n📋 Remaining databases:`);
    databases.databases.forEach(db => {
      console.log(`   - ${db.name}`);
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

deleteTestDatabase();
