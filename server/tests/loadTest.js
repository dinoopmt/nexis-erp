/**
 * ============================================================================
 * CONCURRENT LOAD TEST FOR ITEM CODE GENERATION
 * ============================================================================
 * 
 * Tests multi-user concurrent product creation with atomic item code generation
 * Verifies:
 * - No duplicate item codes generated
 * - FIFO fairness (first request = first code)
 * - Performance under concurrent load
 * - Database consistency after concurrent operations
 * 
 * Usage: node tests/loadTest.js
 * ============================================================================
 */

import axios from 'axios';
import mongoose from 'mongoose';
import Counter from '../Models/SequenceModel.js';
import Product from '../Models/AddProduct.js';
import UnitType from '../Models/UnitType.js';
import Grouping from '../Models/Grouping.js';

const BASE_URL = 'http://localhost:5000';
const NUM_CONCURRENT_USERS = 10;
const PRODUCTS_PER_USER = 5;
let totalProductsToCreate = NUM_CONCURRENT_USERS * PRODUCTS_PER_USER;

// ================= TEST RESULTS TRACKING =================
const testResults = {
  totalRequests: 0,
  successfulCreations: 0,
  failedCreations: 0,
  duplicateItemCodes: new Set(),
  generatedItemCodes: [],
  responseTimings: [],
  startTime: null,
  endTime: null,
  errors: []
};

// ================= HELPER: Generate unique barcode =================
const generateUniqueBarcode = (userId, productIndex) => {
  const timestamp = Date.now().toString().slice(-6);
  return `BC${userId}${productIndex}${timestamp}`.padEnd(13, '0');
};

// ================= HELPER: Create test product =================
const createTestProduct = async (userId, productIndex) => {
  try {
    const barcode = generateUniqueBarcode(userId, productIndex);
    const timestamp = Date.now();
    
    const requestStartTime = performance.now();
    
    const response = await axios.post(`${BASE_URL}/api/products/add`, {
      barcode,
      name: `TestProduct_User${userId}_${productIndex}_${timestamp}`,
      vendor: 'Test Vendor',
      cost: 100 + Math.random() * 900,
      price: 200 + Math.random() * 1800,
      stock: Math.floor(Math.random() * 1000),
      unitType: global.testUnitTypeId,
      categoryId: global.testCategoryId,
      groupingId: global.testGroupingId,
      // itemcode intentionally omitted to trigger auto-generation
    }, {
      timeout: 10000
    });
    
    const requestEndTime = performance.now();
    const responseTime = requestEndTime - requestStartTime;
    testResults.responseTimings.push(responseTime);
    
    if (response.status === 201 && response.data.product) {
      const product = response.data.product;
      return {
        success: true,
        itemcode: product.itemcode,
        barcode: product.barcode,
        responseTime
      };
    } else {
      throw new Error(`Unexpected response status: ${response.status}`);
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      userId,
      productIndex
    };
  }
};

// ================= HELPER: Simulate concurrent user =================
const simulateConcurrentUser = async (userId) => {
  const userResults = [];
  
  // Create products sequentially for this user (simulating one user entering multiple products)
  for (let i = 0; i < PRODUCTS_PER_USER; i++) {
    const result = await createTestProduct(userId, i);
    userResults.push(result);
    testResults.totalRequests++;
    
    if (result.success) {
      testResults.successfulCreations++;
      testResults.generatedItemCodes.push({
        itemcode: result.itemcode,
        userId,
        timestamp: Date.now()
      });
      console.log(`✓ User ${userId} | Product ${i + 1}/${PRODUCTS_PER_USER} | ItemCode: ${result.itemcode} | ${result.responseTime.toFixed(2)}ms`);
    } else {
      testResults.failedCreations++;
      testResults.errors.push(result);
      console.log(`✗ User ${userId} | Product ${i + 1}/${PRODUCTS_PER_USER} | Error: ${result.error}`);
    }
  }
  
  return userResults;
};

// ================= HELPER: Detect duplicates =================
const detectDuplicateItemCodes = () => {
  const itemcodeCounts = new Map();
  
  testResults.generatedItemCodes.forEach(entry => {
    const count = itemcodeCounts.get(entry.itemcode) || 0;
    itemcodeCounts.set(entry.itemcode, count + 1);
  });
  
  let duplicatesFound = 0;
  itemcodeCounts.forEach((count, itemcode) => {
    if (count > 1) {
      testResults.duplicateItemCodes.add(itemcode);
      duplicatesFound++;
    }
  });
  
  return duplicatesFound;
};

// ================= HELPER: Verify FIFO order =================
const verifyFIFOOrder = () => {
  const sortedByCode = [...testResults.generatedItemCodes].sort((a, b) => {
    return parseInt(a.itemcode) - parseInt(b.itemcode);
  });
  
  const sortedByTime = [...testResults.generatedItemCodes].sort((a, b) => {
    return a.timestamp - b.timestamp;
  });
  
  // Check if codes match request order (FIFO)
  let isFIFO = true;
  for (let i = 0; i < sortedByCode.length; i++) {
    if (sortedByCode[i].itemcode !== sortedByTime[i].itemcode) {
      isFIFO = false;
      break;
    }
  }
  
  return { isFIFO, sortedByCode, sortedByTime };
};

// ================= HELPER: Calculate statistics =================
const calculateStats = () => {
  if (testResults.responseTimings.length === 0) {
    return { avgTime: 0, minTime: 0, maxTime: 0, p95Time: 0, p99Time: 0 };
  }
  
  const sorted = [...testResults.responseTimings].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p95Index = Math.floor(sorted.length * 0.95);
  const p99Index = Math.floor(sorted.length * 0.99);
  
  return {
    avgTime: avg,
    minTime: min,
    maxTime: max,
    p95Time: sorted[p95Index],
    p99Time: sorted[p99Index],
    totalRequests: sorted.length
  };
};

// ================= MAIN TEST EXECUTION =================
export const runLoadTest = async () => {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   CONCURRENT LOAD TEST FOR ITEM CODE GENERATION              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`\nTest Configuration:`);
  console.log(`  • Concurrent Users: ${NUM_CONCURRENT_USERS}`);
  console.log(`  • Products per User: ${PRODUCTS_PER_USER}`);
  console.log(`  • Total Requests: ${totalProductsToCreate}`);
  console.log(`  • API Base URL: ${BASE_URL}`);
  
  testResults.startTime = Date.now();
  const performanceStart = performance.now();
  
  console.log(`\n📍 Starting concurrent requests at ${new Date().toISOString()}`);
  console.log('─'.repeat(70));
  
  try {
    // Create all user tasks concurrently
    const userPromises = [];
    for (let userId = 1; userId <= NUM_CONCURRENT_USERS; userId++) {
      userPromises.push(simulateConcurrentUser(userId));
    }
    
    // Wait for all concurrent operations to complete
    await Promise.all(userPromises);
    
    const performanceEnd = performance.now();
    testResults.endTime = Date.now();
    
    console.log('\n' + '─'.repeat(70));
    console.log(`\n📊 LOAD TEST RESULTS`);
    console.log('═'.repeat(70));
    
    // Summary statistics
    console.log(`\n✓ Total Requests: ${testResults.totalRequests}`);
    console.log(`✓ Successful: ${testResults.successfulCreations}`);
    console.log(`✗ Failed: ${testResults.failedCreations}`);
    console.log(`  Success Rate: ${((testResults.successfulCreations / testResults.totalRequests) * 100).toFixed(2)}%`);
    
    // Duplicate check
    const duplicateCount = detectDuplicateItemCodes();
    if (duplicateCount === 0) {
      console.log(`\n✅ DUPLICATE CHECK: PASSED - No duplicate item codes found`);
    } else {
      console.log(`\n❌ DUPLICATE CHECK: FAILED - Found ${duplicateCount} duplicate item codes:`);
      testResults.duplicateItemCodes.forEach(code => {
        console.log(`   • ItemCode ${code}`);
      });
    }
    
    // FIFO verification
    const fifoCheck = verifyFIFOOrder();
    if (fifoCheck.isFIFO) {
      console.log(`✅ FIFO ORDER: PASSED - Codes assigned in request order`);
    } else {
      console.log(`⚠️  FIFO ORDER: VARIANCE DETECTED - Codes not strictly in request order`);
      console.log(`   (This is expected in high-concurrency scenarios with network latency)`);
    }
    
    // Performance metrics
    const stats = calculateStats();
    console.log(`\n⏱️  RESPONSE TIME METRICS:`);
    console.log(`   • Average Response: ${stats.avgTime.toFixed(2)}ms`);
    console.log(`   • Min Response: ${stats.minTime.toFixed(2)}ms`);
    console.log(`   • Max Response: ${stats.maxTime.toFixed(2)}ms`);
    console.log(`   • P95 Response: ${stats.p95Time.toFixed(2)}ms`);
    console.log(`   • P99 Response: ${stats.p99Time.toFixed(2)}ms`);
    console.log(`   • Total Time: ${(performanceEnd - performanceStart).toFixed(2)}ms`);
    console.log(`   • Throughput: ${(testResults.successfulCreations / ((performanceEnd - performanceStart) / 1000)).toFixed(2)} requests/sec`);
    
    // Verify database consistency
    console.log(`\n🔍 VERIFYING DATABASE CONSISTENCY...`);
    const dbProducts = await Product.find({ 
      isDeleted: false,
      name: { $regex: /^TestProduct_User/ }
    }).select('itemcode barcode');
    
    if (dbProducts.length === testResults.successfulCreations) {
      console.log(`✅ DATABASE CONSISTENCY: PASSED`);
      console.log(`   • Created products in database: ${dbProducts.length}`);
      console.log(`   • Expected: ${testResults.successfulCreations}`);
    } else {
      console.log(`⚠️  DATABASE CONSISTENCY: VARIANCE`);
      console.log(`   • Created products in database: ${dbProducts.length}`);
      console.log(`   • Expected: ${testResults.successfulCreations}`);
    }
    
    // Item code sequence check
    const itemCodesFromDB = dbProducts.map(p => parseInt(p.itemcode)).sort((a, b) => a - b);
    const expectedCodes = testResults.generatedItemCodes.map(e => parseInt(e.itemcode)).sort((a, b) => a - b);
    
    console.log(`\n📋 ITEM CODE SEQUENCE:`);
    console.log(`   • First ItemCode: ${itemCodesFromDB[0]}`);
    console.log(`   • Last ItemCode: ${itemCodesFromDB[itemCodesFromDB.length - 1]}`);
    console.log(`   • Total Unique Codes: ${new Set(itemCodesFromDB).size}`);
    
    // Final summary
    console.log(`\n${'═'.repeat(70)}`);
    const testStatus = duplicateCount === 0 && testResults.failedCreations === 0 ? '✅ PASSED' : '⚠️  CHECK RESULTS';
    console.log(`TEST STATUS: ${testStatus}`);
    console.log(`Completed at: ${new Date().toISOString()}`);
    console.log('═'.repeat(70) + '\n');
    
    return {
      success: duplicateCount === 0 && testResults.failedCreations === 0,
      results: testResults,
      statistics: stats
    };
    
  } catch (error) {
    console.error('\n❌ LOAD TEST ERROR:', error.message);
    return {
      success: false,
      error: error.message,
      results: testResults
    };
  }
};

// ================= DATABASE SETUP FOR TESTING =================
export const setupTestDatabase = async () => {
  try {
    console.log('Setting up test data...');
    
    // Create test unit type
    let unitType = await UnitType.findOne({ unitName: 'PIECES' });
    if (!unitType) {
      unitType = await UnitType.create({
        unitName: 'PIECES',
        unitSymbol: 'PCS',
        unitDecimal: 0,
        category: 'STANDARD'
      });
    }
    global.testUnitTypeId = unitType._id;
    
    // Create test category
    let category = await Grouping.findOne({ name: 'Test Category', level: '1' });
    if (!category) {
      category = await Grouping.create({
        name: 'Test Category',
        level: '1',
        isDeleted: false
      });
    }
    global.testCategoryId = category._id;
    
    // Create test subcategory
    let subcategory = await Grouping.findOne({ name: 'Test SubCategory', level: '2' });
    if (!subcategory) {
      subcategory = await Grouping.create({
        name: 'Test SubCategory',
        level: '2',
        parentId: category._id,
        isDeleted: false
      });
    }
    global.testGroupingId = subcategory._id;
    
    console.log('✓ Test data setup complete');
  } catch (error) {
    console.error('Error setting up test data:', error);
    throw error;
  }
};

// ================= CLEANUP TEST DATA =================
export const cleanupTestData = async () => {
  try {
    console.log('\nCleaning up test data...');
    
    // Delete test products
    const result = await Product.deleteMany({
      name: { $regex: /^TestProduct_User/ }
    });
    
    console.log(`✓ Deleted ${result.deletedCount} test products`);
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
};

// ================= ENTRY POINT =================
if (import.meta.url === `file://${process.argv[1]}`) {
  const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexis_erp';
  
  console.log(`Connecting to MongoDB: ${dbUri}`);
  
  mongoose.connect(dbUri)
    .then(async () => {
      console.log('✓ MongoDB Connected');
      await setupTestDatabase();
      const result = await runLoadTest();
      await cleanupTestData();
      
      // Exit with appropriate code
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('❌ Connection error:', err);
      process.exit(1);
    });
}

export default runLoadTest;
