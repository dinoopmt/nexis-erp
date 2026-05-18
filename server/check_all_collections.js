import mongoose from 'mongoose';

const mongoURI = 'mongodb://127.0.0.1:27017/nexis_erp';

async function checkDatabase() {
  try {
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    console.log('📊 Collections in nexis_erp database:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`${col.name.padEnd(35)} ${count} documents`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check specific collections for our data
    console.log('🔍 Checking for customer receipt and cashflow data...\n');

    // Check customer receipts
    const customerReceipts = db.collection('customerreceipts');
    const receiptCount = await customerReceipts.countDocuments();
    console.log(`Customer Receipts: ${receiptCount} documents`);
    
    if (receiptCount > 0) {
      const latestReceipt = await customerReceipts.findOne({}, { sort: { _id: -1 } });
      console.log(`  Latest: ${latestReceipt.receiptNumber} - ${latestReceipt.customerName}`);
    }

    // Check credit customer cashflows
    const cashflows = db.collection('credit_customer_cashflows');
    const cashflowCount = await cashflows.countDocuments();
    console.log(`\nCredit Customer Cashflows: ${cashflowCount} documents`);

    if (cashflowCount > 0) {
      const latestCashflow = await cashflows.findOne({}, { sort: { _id: -1 } });
      console.log(`  Latest: ${latestCashflow.invoiceNumber} - Balance: ₹${latestCashflow.balance}`);
    }

    // Check sales invoices
    const salesInvoices = db.collection('salesinvoices');
    const invoiceCount = await salesInvoices.countDocuments();
    console.log(`\nSales Invoices: ${invoiceCount} documents`);

    if (invoiceCount > 0) {
      const latestInvoice = await salesInvoices.findOne({}, { sort: { _id: -1 } });
      console.log(`  Latest: ${latestInvoice.invoiceNumber} - Amount: ₹${latestInvoice.netAmount}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();
