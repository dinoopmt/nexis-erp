import mongoose from "mongoose";
const mongoURI = "mongodb://127.0.0.1:27017/nexis_erp";
const CreditCustomerCashflow = mongoose.model("CreditCustomerCashflow", new mongoose.Schema({
  invoiceNumber: String, customerId: String, balance: Number, crAmount: Number, discountAmount: Number, status: String, drAmount: Number, updatedDate: Date, narration: String
}));
async function check() {
  await mongoose.connect(mongoURI);
  const entry = await CreditCustomerCashflow.findOne({ invoiceNumber: /0115/ });
  if (entry) {
    console.log(JSON.stringify(entry, null, 2));
  } else {
    const list = await CreditCustomerCashflow.find().limit(5);
    console.log("No 0115 found. Recent entries:", list.map(e => e.invoiceNumber));
  }
  process.exit();
}
check();
