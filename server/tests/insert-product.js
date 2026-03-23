import { MongoClient, ObjectId } from "mongodb";

const MONGO_URI = "mongodb://localhost:27017";

async function insertProduct() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db("nexis-erp");
    const productId = new ObjectId("69beef0d228dfd0cc59b9fcc");

    // Insert minimal product document
    const result = await db.collection("products").insertOne({
      _id: productId,
      itemcode: "1001",
      name: "I phone 6 s pluse",
      barcode: "1001"
    });

    console.log(`✅ Product inserted: ${productId}`);

  } catch (error) {
    if (error.code === 11000) {
      console.log(`⚠️ Product already exists (duplicate key)`);
    } else {
      console.error("❌ Error:", error.message);
      process.exit(1);
    }
  } finally {
    await client.close();
  }
}

insertProduct();
