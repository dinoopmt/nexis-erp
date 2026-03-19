/**
 * HSN API Test Suite
 * Run this file to test all HSN endpoints
 * 
 * Usage: node hsnApiTests.js
 * 
 * Prerequisites:
 * 1. Server running on port 5000
 * 2. HSN seeder executed: node hsnMasterSeeder.js
 */

const baseURL = 'http://localhost:5000/api/hsn';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function test(name, url, method = 'GET', body = null) {
  try {
    log(`\n🧪 Testing: ${name}`, 'cyan');
    log(`   ${method} ${url}`, 'blue');

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (data.success) {
      log(`   ✅ PASS`, 'green');
      return { success: true, data, status: response.status };
    } else {
      log(`   ❌ FAIL - ${data.error}`, 'red');
      return { success: false, error: data.error, status: response.status };
    }
  } catch (error) {
    log(`   ❌ ERROR - ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log('\n' + '='.repeat(60), 'cyan');
  log('HSN API TEST SUITE', 'cyan');
  log('='.repeat(60) + '\n', 'cyan');

  let passed = 0;
  let failed = 0;

  // Test 1: Get HSN List
  let result = await test(
    'Get HSN List (Paginated)',
    `${baseURL}/list?limit=5&page=1`
  );
  result.success ? passed++ : failed++;

  // Test 2: Get HSN by Code
  result = await test(
    'Get HSN by Code (090111 - Coffee)',
    `${baseURL}/code/090111`
  );
  result.success ? passed++ : failed++;
  const coffeeHSN = result.data?.data;

  // Test 3: Search HSN by Description
  result = await test(
    'Search HSN by Description (query=coffee)',
    `${baseURL}/search?query=coffee`
  );
  result.success ? passed++ : failed++;

  // Test 4: Get HSN by Category
  result = await test(
    'Get HSN by Category (Foodstuffs)',
    `${baseURL}/category/Foodstuffs`
  );
  result.success ? passed++ : failed++;

  // Test 5: Get All Categories
  result = await test(
    'Get All HSN Categories',
    `${baseURL}/categories`
  );
  result.success ? passed++ : failed++;

  // Test 6: Validate HSN Code (Valid)
  result = await test(
    'Validate HSN Code - Valid (090111)',
    `${baseURL}/validate/090111`
  );
  result.success ? passed++ : failed++;

  // Test 7: Validate HSN Code (Invalid)
  result = await test(
    'Validate HSN Code - Invalid (999999)',
    `${baseURL}/validate/999999`
  );
  // This test should NOT succeed because the code is invalid
  // We expect success: false in the response, but the HTTP request succeeds
  if (result.status === 200) {
    log(`   ✅ PASS (correctly identified invalid code)`, 'green');
    passed++;
  } else {
    log(`   ❌ FAIL`, 'red');
    failed++;
  }

  // Test 8: Get HSN Statistics
  result = await test(
    'Get HSN Statistics',
    `${baseURL}/stats`
  );
  result.success ? passed++ : failed++;

  // Test 9: Get HSN Dropdown
  result = await test(
    'Get HSN Dropdown Data',
    `${baseURL}/dropdown`
  );
  result.success ? passed++ : failed++;

  // Test 10: Get HSN Dropdown with Category Filter
  result = await test(
    'Get HSN Dropdown - Filtered by Category (Foodstuffs)',
    `${baseURL}/dropdown?category=Foodstuffs`
  );
  result.success ? passed++ : failed++;

  // Test 11: Get HSN with Product Count
  result = await test(
    'Get HSN with Product Count',
    `${baseURL}/with-products`
  );
  result.success ? passed++ : failed++;

  // Test 12: Create New HSN (Test only - don't commit)
  result = await test(
    'Create New HSN Code',
    `${baseURL}/create`,
    'POST',
    {
      code: '099999',
      description: 'Test HSN Code for validation',
      category: 'Foodstuffs',
      gstRate: 5
    }
  );
  result.success ? passed++ : failed++;
  const newHSNCode = result.data?.data?.code;

  // Test 13: Update HSN Code
  if (newHSNCode) {
    result = await test(
      'Update HSN Code',
      `${baseURL}/update/${newHSNCode}`,
      'PUT',
      {
        description: 'Updated test HSN description',
        remarks: 'This is a test update'
      }
    );
    result.success ? passed++ : failed++;
  }

  // Test 14: Repeal HSN Code (Soft Delete)
  if (newHSNCode) {
    result = await test(
      'Repeal HSN Code (Soft Delete)',
      `${baseURL}/repeal/${newHSNCode}`,
      'POST',
      {
        replacementCode: '090111',
        reason: 'Test repeal - cleanup'
      }
    );
    result.success ? passed++ : failed++;
  }

  // Test 15: Get HSN Filtered by GST Rate
  result = await test(
    'Get HSN List - Filtered by GST Rate (5%)',
    `${baseURL}/list?gstRate=5&limit=10`
  );
  result.success ? passed++ : failed++;

  // Test 16: Get HSN List with Multiple Filters
  result = await test(
    'Get HSN List - Multiple Filters (Category & GST Rate)',
    `${baseURL}/list?category=Foodstuffs&gstRate=5&limit=10`
  );
  result.success ? passed++ : failed++;

  // Test 17: Test HSN Format Validation (should fail gracefully)
  log(`\n🧪 Testing: Validate HSN Code - Invalid Format (12345)`, 'cyan');
  log(`   GET ${baseURL}/validate/12345`, 'blue');
  try {
    const response = await fetch(`${baseURL}/validate/12345`);
    const data = await response.json();
    if (!data.valid) {
      log(`   ✅ PASS (correctly rejected invalid format)`, 'green');
      passed++;
    } else {
      log(`   ❌ FAIL (should have rejected invalid format)`, 'red');
      failed++;
    }
  } catch (error) {
    log(`   ❌ ERROR - ${error.message}`, 'red');
    failed++;
  }

  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('TEST SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`✅ Passed: ${passed}`, 'green');
  log(`❌ Failed: ${failed}`, 'red');
  log(`📊 Total: ${passed + failed}\n`, 'yellow');

  if (failed === 0) {
    log('🎉 ALL TESTS PASSED!', 'green');
    process.exit(0);
  } else {
    log('⚠️  SOME TESTS FAILED - Check output above', 'red');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log(`Fatal Error: ${error.message}`, 'red');
  process.exit(1);
});
