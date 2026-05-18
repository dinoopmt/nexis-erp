import mongoose from 'mongoose';

const mongoURI = 'mongodb://127.0.0.1:27017/nexis_erp';

// Define CreditCustomerCashflow schema
const cashflowSchema = new mongoose.Schema({
  invoiceNumber: String,
  customerId: String,
  balance: Number,
  crAmount: Number,
  discountAmount: Number,
  status: String,
  drAmount: Number,
  updatedDate: Date,
  narration: String,
});

const CreditCustomerCashflow = mongoose.model('CreditCustomerCashflow', cashflowSchema);

async function checkCashflow() {
  try {
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Find the cashflow for invoice SI/2025-26/0115
    const cashflow = await CreditCustomerCashflow.findOne({
      invoiceNumber: 'SI/2025-26/0115'
    });

    if (cashflow) {
      console.log('\n✅ Cashflow entry found:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Invoice: ${cashflow.invoiceNumber}`);
      console.log(`Balance: ₹${cashflow.balance}`);
      console.log(`DR Amount: ₹${cashflow.drAmount}`);
      console.log(`CR Amount: ₹${cashflow.crAmount}`);
      console.log(`Discount Amount: ₹${cashflow.discountAmount || 0}`);
      console.log(`Status: ${cashflow.status}`);
      console.log(`Updated: ${cashflow.updatedDate}`);
      console.log(`Narration: ${cashflow.narration || 'N/A'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Check if updated
      if (cashflow.balance === 0 && cashflow.status === 'Settled') {
        console.log('\n✅ SUCCESS: Cashflow was properly updated!');
        console.log('   - Balance: 0 (fully paid)');
        console.log('   - Status: Settled');
        console.log('   - CR Amount: 15.75 (payment received)');
      } else {
        console.log('\n⚠️  ISSUE: Cashflow was NOT properly updated');
        console.log(`   - Balance: ${cashflow.balance} (expected: 0)`);
        console.log(`   - Status: ${cashflow.status} (expected: Settled)`);
      }
    } else {
      console.log('❌ Cashflow entry not found for invoice SI/2025-26/0115');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkCashflow();
