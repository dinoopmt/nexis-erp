const mongoose = require("mongoose");
require("dotenv").config();

const mongoUri = process.env.MONGODB_URI;
console.log("Connecting to MongoDB...");

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("Connected to MongoDB");
    const db = mongoose.connection.db;
    
    db.collection("quotations")
      .findOne(
        { quotationNumber: "QT/2025-26/0008" },
        { projection: { _id: 1, "items.itemName": 1, "items.note": 1, "items.image": 1 } }
      )
      .then((result) => {
        console.log("Query Result:");
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
      })
      .catch((err) => {
        console.error("Query Error:", err);
        process.exit(1);
      });
  })
  .catch((err) => {
    console.error("Connection Error:", err);
    process.exit(1);
  });
