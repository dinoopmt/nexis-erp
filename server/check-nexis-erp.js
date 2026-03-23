#!/usr/bin/env node

/**
 * Direct Check - nexis_erp database
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function checkDB() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexis_erp';
  console.log(`🔍 Checking: ${mongoUri}\n`);
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    const db = client.db('nexis_erp');
    
    console.log('✅ Connected to nexis_erp\n');

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`📊 Total Collections: ${collections.length}`);
    collections.forEach(c => console.log(`   - ${c.name}`));

    // Check key collections
    console.log('\n📈 Key Collection Counts:');
    
    const checks = {
      'current_stock': '💰 Current Stock',
      'stock_movements': '📊 Stock Movements',
      'grns': '📋 GRN',
      'granitestocks': '📦 Products'
    };

    for (const [collName, label] of Object.entries(checks)) {
      try {
        const count = await db.collection(collName).countDocuments();
        console.log(`   ${label} (${collName}): ${count} records`);
        
        if (count > 0 && collName === 'current_stock') {
          const samples = await db.collection(collName).find({}).limit(2).toArray();
          console.log(`      Samples:`);
          samples.forEach((s, i) => {
            console.log(`        [${i+1}] productId=${s.productId}, total=${s.totalQuantity}, available=${s.availableQuantity}`);
          });
        }
      } catch (e) {
        console.log(`   ${label} (${collName}): ❌ Not found`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

checkDB();
