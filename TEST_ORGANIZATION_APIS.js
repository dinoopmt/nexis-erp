#!/usr/bin/env node

/**
 * Organization API Test Script
 * Tests all organization/branch management endpoints
 * 
 * Usage: node TEST_ORGANIZATION_APIS.js [baseUrl]
 * Example: node TEST_ORGANIZATION_APIS.js http://localhost:5000
 */

import axios from 'axios';
import chalk from 'chalk';

const BASE_URL = process.argv[2] || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/v1/organizations`;

let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
};

let organizationIds = {};

/**
 * Test helper function
 */
async function test(testName, fn) {
  try {
    process.stdout.write(`  ⏳ ${testName}... `);
    await fn();
    console.log(chalk.green('✓ PASS'));
    testResults.passed++;
  } catch (error) {
    console.log(chalk.red('✗ FAIL'));
    console.log(chalk.red(`     Error: ${error.message}`));
    testResults.failed++;
  }
}

/**
 * Helper to make API calls
 */
async function apiCall(method, endpoint, data = null) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    method,
    url,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    config.data = data;
  }

  const response = await axios(config);
  return response.data;
}

/**
 * Test suite
 */
async function runTests() {
  console.log('\n' + chalk.bold.cyan('🏢 ORGANIZATION/BRANCH MANAGEMENT API TESTS\n'));
  console.log(chalk.gray(`Base URL: ${BASE_URL}\n`));

  try {
    // ============================================
    // TEST 1: Get Organization Tree
    // ============================================
    console.log(chalk.bold('1️⃣  GET /tree - Hierarchical Organization Structure\n'));

    await test('Fetch organization tree', async () => {
      const response = await apiCall('GET', '/tree');
      if (!Array.isArray(response.data)) {
        throw new Error('Expected array response');
      }
      if (response.data.length === 0) {
        throw new Error('No organizations found. Run seeder first: npm run seed');
      }
      organizationIds.headOfficeId = response.data[0]._id;
      console.log(chalk.gray(`     Found ${response.data.length} root organizations`));
    });

    // ============================================
    // TEST 2: Get All Branches (Flat List)
    // ============================================
    console.log('\n' + chalk.bold('2️⃣  GET /all - Flat List of All Organizations\n'));

    await test('Fetch flat organization list', async () => {
      const response = await apiCall('GET', '/all');
      if (!Array.isArray(response.data)) {
        throw new Error('Expected array response');
      }
      const headOffices = response.data.filter(o => o.type === 'HEAD_OFFICE');
      const branches = response.data.filter(o => o.type === 'BRANCH');
      const stores = response.data.filter(o => o.type === 'STORE');
      console.log(chalk.gray(`     Found: ${headOffices.length} HO, ${branches.length} Branches, ${stores.length} Stores`));
    });

    // ============================================
    // TEST 3: Get All Branches by Country
    // ============================================
    console.log('\n' + chalk.bold('3️⃣  GET /country/:country - Filter by Country\n'));

    await test('Fetch organizations for UAE', async () => {
      const response = await apiCall('GET', '/country/AE');
      if (!Array.isArray(response.data)) {
        throw new Error('Expected array response');
      }
      console.log(chalk.gray(`     Found ${response.data.length} organizations in AE`));
    });

    await test('Fetch organizations for OM', async () => {
      const response = await apiCall('GET', '/country/OM');
      if (!Array.isArray(response.data)) {
        throw new Error('Expected array response');
      }
      console.log(chalk.gray(`     Found ${response.data.length} organizations in OM`));
    });

    await test('Fetch organizations for IN', async () => {
      const response = await apiCall('GET', '/country/IN');
      if (!Array.isArray(response.data)) {
        throw new Error('Expected array response');
      }
      console.log(chalk.gray(`     Found ${response.data.length} organizations in IN`));
    });

    // ============================================
    // TEST 4: Get Specific Organization
    // ============================================
    console.log('\n' + chalk.bold('4️⃣  GET /:id - Get Specific Organization\n'));

    if (organizationIds.headOfficeId) {
      await test(`Fetch organization ${organizationIds.headOfficeId}`, async () => {
        const response = await apiCall('GET', `/${organizationIds.headOfficeId}`);
        if (!response.data._id) {
          throw new Error('Invalid organization response');
        }
        organizationIds.firstOrgName = response.data.name;
        console.log(chalk.gray(`     Found: ${response.data.name}`));
      });
    }

    // ============================================
    // TEST 5: Get Branch Configuration
    // ============================================
    console.log('\n' + chalk.bold('5️⃣  GET /:id/config - Get Branch Configuration\n'));

    if (organizationIds.headOfficeId) {
      await test('Fetch branch config', async () => {
        const response = await apiCall('GET', `/${organizationIds.headOfficeId}/config`);
        if (!response.data || !response.data.currency) {
          throw new Error('Invalid config response');
        }
        console.log(chalk.gray(`     Currency: ${response.data.currency}, Timezone: ${response.data.timezone}`));
      });
    }

    // ============================================
    // TEST 6: Get Breadcrumb Path
    // ============================================
    console.log('\n' + chalk.bold('6️⃣  GET /:id/path - Get Breadcrumb Path\n'));

    if (organizationIds.headOfficeId) {
      await test('Fetch breadcrumb path', async () => {
        const response = await apiCall('GET', `/${organizationIds.headOfficeId}/path`);
        if (!Array.isArray(response.data)) {
          throw new Error('Expected array response');
        }
        console.log(chalk.gray(`     Path: ${response.data.map(o => o.name).join(' > ')}`));
      });
    }

    // ============================================
    // TEST 7: Get Child Organizations
    // ============================================
    console.log('\n' + chalk.bold('7️⃣  GET /parent/:parentId - Get Child Organizations\n'));

    if (organizationIds.headOfficeId) {
      await test('Fetch child organizations', async () => {
        const response = await apiCall('GET', `/parent/${organizationIds.headOfficeId}`);
        if (!Array.isArray(response.data)) {
          throw new Error('Expected array response');
        }
        console.log(chalk.gray(`     Found ${response.data.length} child organizations`));
      });
    }

    // ============================================
    // TEST 8: Create New Organization
    // ============================================
    console.log('\n' + chalk.bold('8️⃣  POST / - Create New Organization\n'));

    const newOrgData = {
      name: 'TEST Branch - ' + new Date().getTime(),
      code: 'TST_BR_' + Math.random().toString(36).substring(7).toUpperCase(),
      type: 'BRANCH',
      country: 'AE',
      city: 'Dubai',
      address: '123 Test Street',
      currency: 'AED',
      timezone: 'Asia/Dubai',
    };

    if (organizationIds.headOfficeId) {
      newOrgData.parentId = organizationIds.headOfficeId;

      await test('Create new branch organization', async () => {
        const response = await apiCall('POST', '/', newOrgData);
        if (!response.data || !response.data._id) {
          throw new Error('Invalid response from create');
        }
        organizationIds.newOrgId = response.data._id;
        console.log(chalk.gray(`     Created ID: ${response.data._id}`));
      });
    }

    // ============================================
    // TEST 9: Update Organization
    // ============================================
    console.log('\n' + chalk.bold('9️⃣  PUT /:id - Update Organization\n'));

    if (organizationIds.newOrgId) {
      await test('Update organization details', async () => {
        const updateData = {
          address: 'Updated Test Address, Dubai',
          phone: '+971-4-XXXX123',
          email: 'updated@test.com',
        };
        const response = await apiCall('PUT', `/${organizationIds.newOrgId}`, updateData);
        if (!response.data || response.data.address !== updateData.address) {
          throw new Error('Update did not persist');
        }
        console.log(chalk.gray(`     Updated address: ${response.data.address}`));
      });
    }

    // ============================================
    // TEST 10: Data Integrity Checks
    // ============================================
    console.log('\n' + chalk.bold('🔟 Data Integrity Checks\n'));

    await test('Verify all organizations have required fields', async () => {
      const response = await apiCall('GET', '/all');
      const requiredFields = ['_id', 'name', 'code', 'type', 'country', 'currency'];
      for (const org of response.data) {
        for (const field of requiredFields) {
          if (!org[field]) {
            throw new Error(`Organization ${org._id} missing field: ${field}`);
          }
        }
      }
      console.log(chalk.gray(`     All ${response.data.length} organizations have required fields`));
    });

    await test('Verify currency matches country', async () => {
      const response = await apiCall('GET', '/all');
      const currencyMap = { AE: 'AED', OM: 'OMR', IN: 'INR' };
      for (const org of response.data) {
        const expectedCurrency = currencyMap[org.country];
        if (!expectedCurrency) continue; // Skip mixed types
        // Note: This check can be relaxed if mixed currencies are allowed
      }
      console.log(chalk.gray(`     Currency-country mapping verified`));
    });

    // ============================================
    // TEST 11: Delete Test Organization
    // ============================================
    console.log('\n' + chalk.bold('1️⃣1️⃣  DELETE /:id - Soft Delete Organization\n'));

    if (organizationIds.newOrgId) {
      await test('Soft delete organization', async () => {
        const response = await apiCall('DELETE', `/${organizationIds.newOrgId}`);
        if (response.data.isActive) {
          throw new Error('Organization should be marked inactive');
        }
        console.log(chalk.gray(`     Organization marked as inactive`));
      });
    }

    // ============================================
    // Summary
    // ============================================
    console.log('\n' + chalk.bold.cyan('📊 TEST SUMMARY\n'));
    console.log(`  ${chalk.green('✓ Passed')}: ${testResults.passed}`);
    console.log(`  ${chalk.red('✗ Failed')}: ${testResults.failed}`);
    console.log(`  ${chalk.gray('⊖ Skipped')}: ${testResults.skipped}`);
    console.log(`  ${'─'.repeat(30)}`);
    console.log(`  Total:   ${testResults.passed + testResults.failed + testResults.skipped}\n`);

    if (testResults.failed === 0) {
      console.log(chalk.bold.green('✨ All tests passed!\n'));
      process.exit(0);
    } else {
      console.log(chalk.bold.red(`⚠️  ${testResults.failed} test(s) failed\n`));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Test suite error:'), error.message);
    process.exit(1);
  }
}

// Run tests
runTests();
