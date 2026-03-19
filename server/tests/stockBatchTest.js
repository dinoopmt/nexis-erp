/**
 * Stock Batch API Test Suite
 * Tests all stock batch endpoints
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/v1';
let testProductId = '';
let testBatchId = '';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  section: (text) => console.log(`\n${colors.bright}${colors.blue}═══ ${text} ═══${colors.reset}`),
  success: (text) => console.log(`${colors.green}✓ ${text}${colors.reset}`),
  error: (text) => console.log(`${colors.red}✗ ${text}${colors.reset}`),
  info: (text) => console.log(`${colors.yellow}ℹ ${text}${colors.reset}`),
};

let testsPassed = 0;
let testsFailed = 0;

// Test helper
async function test(name, fn) {
  try {
    await fn();
    log.success(name);
    testsPassed++;
  } catch (error) {
    log.error(`${name}: ${error.message}`);
    testsFailed++;
  }
}

// API Test Suite
async function runTests() {
  log.section('STOCK BATCH API - TEST SUITE');
  console.log(`Base URL: ${BASE_URL}\n`);

  try {
    // Test 1: Get all products (to find or create one)
    log.section('SETUP: GET PRODUCTS');
    const productsResponse = await axios.get(`${BASE_URL}/products`);
    
    if (productsResponse.data?.data?.length > 0) {
      testProductId = productsResponse.data.data[0]._id;
      log.success(`Product found: ${testProductId}`);
    } else {
      log.error('No products found. Create a product first.');
      process.exit(1);
    }

    // Test 2: Create Batch
    log.section('TEST 1: CREATE BATCH');
    const batchPayload = {
      productId: testProductId,
      batchNumber: `BATCH-TEST-${Date.now()}`,
      manufacturingDate: new Date('2024-01-01'),
      expiryDate: new Date('2025-01-01'),
      quantity: 100,
      costPerUnit: 25.5,
      supplier: 'Test Supplier',
      referenceNumber: 'TEST-001',
      notes: 'Test batch for API validation',
    };

    await test('Create batch', async () => {
      const response = await axios.post(`${BASE_URL}/stock-batches`, batchPayload);
      if (!response.data.success) throw new Error('Response not successful');
      if (!response.data.data._id) throw new Error('No batch ID returned');
      testBatchId = response.data.data._id;
      console.log(`  Created batch: ${testBatchId}`);
    });

    // Test 3: Get Batches by Product
    log.section('TEST 2: GET BATCHES BY PRODUCT');
    await test('Get batches for product', async () => {
      const response = await axios.get(
        `${BASE_URL}/stock-batches/product/${testProductId}`
      );
      if (!response.data.success) throw new Error('Response not successful');
      if (!Array.isArray(response.data.data)) throw new Error('Data is not an array');
      console.log(`  Found ${response.data.count} batches`);
    });

    // Test 4: Get Batch by Number
    log.section('TEST 3: GET BATCH BY NUMBER');
    await test('Get batch by number', async () => {
      const response = await axios.get(
        `${BASE_URL}/stock-batches/${testProductId}/batch/${batchPayload.batchNumber}`
      );
      if (!response.data.success) throw new Error('Response not successful');
      if (!response.data.data._id) throw new Error('No batch data');
    });

    // Test 5: Get Batch Statistics
    log.section('TEST 4: GET BATCH STATISTICS');
    await test('Get batch statistics', async () => {
      const response = await axios.get(
        `${BASE_URL}/stock-batches/stats/${testProductId}`
      );
      if (!response.data.success) throw new Error('Response not successful');
      if (!response.data.data.totalBatches) throw new Error('No statistics data');
      console.log(`  Total batches: ${response.data.data.totalBatches}`);
      console.log(`  Total quantity: ${response.data.data.totalQuantity || 0}`);
    });

    // Test 6: Get FIFO Batch
    log.section('TEST 5: GET FIFO BATCH');
    await test('Get FIFO batch', async () => {
      const response = await axios.get(
        `${BASE_URL}/stock-batches/fifo/${testProductId}`
      );
      if (!response.data.success) throw new Error('Response not successful');
      if (!response.data.data._id) throw new Error('No batch data');
      console.log(`  FIFO batch number: ${response.data.data.batchNumber}`);
    });

    // Test 7: Consume Batch Quantity
    log.section('TEST 6: CONSUME BATCH QUANTITY');
    await test('Consume 10 units from batch', async () => {
      const response = await axios.post(
        `${BASE_URL}/stock-batches/${testBatchId}/consume`,
        { quantityToUse: 10 }
      );
      if (!response.data.success) throw new Error('Response not successful');
      if (response.data.data.usedQuantity !== 10) throw new Error('Quantity not updated');
      console.log(`  New used quantity: ${response.data.data.usedQuantity}`);
      console.log(`  Available quantity: ${response.data.data.quantity - response.data.data.usedQuantity}`);
    });

    // Test 8: Update Batch
    log.section('TEST 7: UPDATE BATCH');
    await test('Update batch information', async () => {
      const updatePayload = {
        supplier: 'Updated Supplier',
        notes: 'Batch updated via API',
      };
      const response = await axios.put(
        `${BASE_URL}/stock-batches/${testBatchId}`,
        updatePayload
      );
      if (!response.data.success) throw new Error('Response not successful');
      if (response.data.data.supplier !== updatePayload.supplier)
        throw new Error('Supplier not updated');
    });

    // Test 9: Get Expiring Batches
    log.section('TEST 8: GET EXPIRING BATCHES');
    await test('Get batches expiring within 365 days', async () => {
      const response = await axios.get(
        `${BASE_URL}/stock-batches/expiring/list?days=365`
      );
      if (!response.data.success) throw new Error('Response not successful');
      if (!Array.isArray(response.data.data)) throw new Error('Data is not an array');
      console.log(`  Found ${response.data.count} expiring batches`);
    });

    // Test 10: Get Expired Batches
    log.section('TEST 9: GET EXPIRED BATCHES');
    await test('Get expired batches', async () => {
      const response = await axios.get(`${BASE_URL}/stock-batches/expired/list`);
      if (!response.data.success) throw new Error('Response not successful');
      if (!Array.isArray(response.data.data)) throw new Error('Data is not an array');
      console.log(`  Found ${response.data.count} expired batches`);
    });

    // Test 11: Get Low Stock Batches
    log.section('TEST 10: GET LOW STOCK BATCHES');
    await test('Get batches with low stock', async () => {
      const response = await axios.get(
        `${BASE_URL}/stock-batches/low-stock/list?threshold=50`
      );
      if (!response.data.success) throw new Error('Response not successful');
      if (!Array.isArray(response.data.data)) throw new Error('Data is not an array');
      console.log(`  Found ${response.data.count} low stock batches`);
    });

    // Test 12: Delete Batch
    log.section('TEST 11: DELETE BATCH');
    await test('Delete batch', async () => {
      const response = await axios.delete(
        `${BASE_URL}/stock-batches/${testBatchId}`
      );
      if (!response.data.success) throw new Error('Response not successful');
      console.log(`  Deleted batch: ${response.data.data.deletedId}`);
    });

    // Final Report
    log.section('TEST REPORT');
    console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);
    console.log(`Total: ${testsPassed + testsFailed}`);

    if (testsFailed === 0) {
      log.success('ALL TESTS PASSED!');
      process.exit(0);
    } else {
      log.error('SOME TESTS FAILED');
      process.exit(1);
    }
  } catch (error) {
    log.error(`Setup failed: ${error.message}`);
    process.exit(1);
  }
}

// Run tests with a small delay to ensure server is ready
setTimeout(runTests, 1000);
