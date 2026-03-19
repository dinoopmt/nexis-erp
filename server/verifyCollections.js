import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function verifyCollections() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    console.log('\n📋 Collections in Database:');
    console.log('─'.repeat(50));
    collections.forEach((col, idx) => {
      console.log(`${idx + 1}. ${col.name}`);
    });
    
    console.log(`\n✅ Total Collections: ${collections.length}`);
    console.log('\n🎯 Collections with new snake_case naming:');
    
    const snakeCaseCollections = [
      'users', 'roles', 'activity_logs',
      'journal_entries', 'chart_of_accounts', 'account_groups',
      'contra_accounts', 'payments', 'receipts',
      'sales_invoices', 'sales_orders', 'sales_returns',
      'delivery_notes', 'quotations', 'credit_sale_receipts',
      'products', 'inventory_batches', 'goods_receipt_notes',
      'stock_movements', 'customers', 'vendors',
      'customer_receipts', 'financial_years', 'groupings',
      'country_configs', 'costing_methods', 'tax_masters',
      'sequences', 'companies', 'licenses', 'hsn_master',
      'system_settings'
    ];
    
    const found = collections.filter(col => snakeCaseCollections.includes(col.name));
    console.log(`✅ ${found.length} collections with snake_case naming:`);
    found.forEach(col => console.log(`   ✓ ${col.name}`));
    
    if (collections.length > found.length) {
      console.log(`\n⚠️  ${collections.length - found.length} other collections found`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error verifying collections:', error.message);
    process.exit(1);
  }
}

verifyCollections();
