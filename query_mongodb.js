const { MongoClient } = require("mongodb");

(async () => {
  const client = new MongoClient("mongodb://localhost:27017");
  try {
    await client.connect();
    const db = client.db("nexis_erp");
    const productsCollection = db.collection("products");
    
    const count = await productsCollection.countDocuments();
    console.log("\n=== MongoDB Products Collection ===");
    console.log("Total documents: " + count);
    
    console.log("\n=== Sample Product ===");
    const sample = await productsCollection.findOne({});
    console.log(JSON.stringify(sample, null, 2));
    
    if (count > 0) {
      console.log("\n=== Collection Stats ===");
      console.log("Product count: " + count + " products");
      if (count > 100) {
        console.log("Status: MANY products in collection");
      } else {
        console.log("Status: Few/test products in collection");
      }
    }
  } finally {
    await client.close();
  }
})();
