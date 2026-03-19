# Complete Testing Workflow Guide

## Overview

This guide provides step-by-step instructions for testing the complete product management system with focus on multi-user concurrency, performance, and data integrity.

---

## PART 1: Environment Setup (15 minutes)

### Step 1: Start MongoDB

```bash
# PowerShell / Windows
mongod

# Or with docker
docker run -d --name mongodb -p 27017:27017 mongo:latest
```

**Verify Connection:**
```bash
mongosh
> show databases
```

### Step 2: Install Dependencies

```bash
# Server dependencies
cd D:\NEXIS-ERP\server
npm install

# Client dependencies
cd D:\NEXIS-ERP\client
npm install
```

### Step 3: Configure Environment

**File: `server/.env`**
```
MONGODB_URI=mongodb://localhost:27017/nexis_erp
PORT=5000
NODE_ENV=development
```

### Step 4: Seed Database

```bash
cd D:\NEXIS-ERP\server

# Seed all required data
npm run seed:all

# Verify seeding
mongosh
> use nexis_erp
> db.counters.findOne()
> db.unittypes.countDocuments()
```

---

## PART 2: Server Testing (10 minutes)

### Step 1: Start Express Server

```bash
cd D:\NEXIS-ERP\server
npm run dev

# Wait for output:
# ✓ MongoDB Connected
# ✓ Server running on http://localhost:5000
```

### Step 2: Test Basic Connectivity

```bash
# PowerShell
Invoke-WebRequest http://localhost:5000/health

# Or use curl
curl http://localhost:5000/health
```

### Step 3: Create Indexes

Create a test file: `server/setupIndexes.js`

```javascript
import mongoose from 'mongoose';
import { createProductIndexes } from './utils/databaseOptimization.js';

await mongoose.connect(process.env.MONGODB_URI);
const result = await createProductIndexes();
console.log('✅ Indexes created:', result);
process.exit(0);
```

Run:
```bash
node setupIndexes.js
```

**Expected Output:**
```
✓ Created index: idx_itemcode
✓ Created index: idx_barcode
✓ Created index: idx_notDeletedItemcode
✓ Created index: idx_fulltext
... (more indexes)

✅ Index creation completed (13 indexes processed)
```

---

## PART 3: Load Testing (20 minutes)

### Step 1: Run Concurrent Load Test

```bash
# Keep server running in separate terminal, then:
cd D:\NEXIS-ERP\server
node tests/loadTest.js
```

### Step 2: Analyze Results

**Check these metrics:**

```
✅ Success Rate: Should be 100%
✅ Duplicate Check: Should say "PASSED"
✅ Avg Response: Should be < 200ms
✅ P95 Response: Should be < 500ms
```

**If test fails:**

```bash
# Check server logs for errors
# Verify MongoDB is running
# Check Counter collection exists:
mongosh
> use nexis_erp
> db.counters.findOne({module: "product_code"})
# Should show: { _id: ..., module: "product_code", ... }
```

### Step 3: Validate Database Consistency

Create: `server/validateDB.js`

```javascript
import mongoose from 'mongoose';
import { validateDatabaseConsistency } from './utils/databaseOptimization.js';

await mongoose.connect(process.env.MONGODB_URI);
const result = await validateDatabaseConsistency();
console.log(JSON.stringify(result, null, 2));
process.exit(0);
```

Run:
```bash
node validateDB.js
```

**Expected Output:**
```json
{
  "success": true,
  "issuesFound": 0,
  "issues": [],
  "summary": {
    "duplicateItemcodes": 0,
    "duplicateBarcodes": 0,
    "brokenCategoryRefs": 0,
    "totalCounters": 1
  }
}
```

### Step 4: Analyze Index Usage

Create: `server/analyzeIndexes.js`

```javascript
import mongoose from 'mongoose';
import { analyzeIndexUsage } from './utils/databaseOptimization.js';

await mongoose.connect(process.env.MONGODB_URI);
const result = await analyzeIndexUsage();
console.log(JSON.stringify(result, null, 2));
process.exit(0);
```

Run:
```bash
node analyzeIndexes.js
```

**Expected Output Shows:**
- ✓ idx_itemcode: XXXX operations
- ✓ idx_barcode: XXXX operations
- ✓ idx_notDeletedItemcode: XXXX operations
- (More indexes with operation counts)

---

## PART 4: Functionality Testing (30 minutes)

### Start React Client

```bash
cd D:\NEXIS-ERP\client
npm run dev

# Open browser: http://localhost:5173
```

### Test 1: Create Product with Auto-Generation

**Steps:**
1. Click "Add Product"
2. Verify itemcode field shows "Auto-generated"
3. Fill in:
   - Barcode: BC123456789012
   - Name: Test Product 1
   - Vendor: Test Vendor
   - Cost: 100.00
   - Price: 199.99
   - Stock: 50
   - Unit Type: PIECES
   - Category: Any
4. Click Save
5. Modal reopens in edit mode
6. Verify:
   - ✓ Product saved
   - ✓ itemcode shows assigned number (e.g., 1001)
   - ✓ Product appears in list
   - ✓ No errors in console

### Test 2: Fill Code Gaps

**Steps:**
1. Create 3 products (will get codes 1001, 1002, 1003)
2. Now manually create product with code "1005"
3. Later want to create "1004" (fill gap)
4. Click Add Product
5. Clear "Auto-generated" in itemcode field
6. Type "1004"
7. Fill other fields
8. Save
9. Verify: ✓ Saved with custom code 1004

### Test 3: Barcode Uniqueness

**Steps:**
1. Create product 1 with barcode BC999
2. Create product 2 with same barcode BC999
3. Expected: Error "Product with this barcode already exists"
4. Verify: ✓ Validation prevents duplicate

### Test 4: Editing Products

**Steps:**
1. Edit existing product
2. Change some fields (name, price)
3. Keep itemcode the same
4. Save
5. Verify: ✓ Update successful without validation error on itemcode

**Then:**
1. Edit same product again
2. Change itemcode to different available code
3. Save
4. Verify: ✓ Update successful with new code

### Test 5: Form Progress

**Steps:**
1. Open Add Product modal
2. Fill only barcode
3. Observe progress bar (should be ~14%)
4. Add name, vendor, cost, price, stock
5. Observe progress bar updates
6. Verify: ✓ Progress reflects completed fields

### Test 6: Auto-Save Draft

**Steps:**
1. Open Add Product modal
2. Fill some fields (but don't save)
3. Wait 5+ seconds (auto-save triggers)
4. Refresh page
5. Open Add Product modal again
6. Verify: ✓ Form data is restored from draft

### Test 7: Validation Messages

**Steps:**
1. Open Add Product modal
2. Enter:
   - Barcode: "BC" (too short)
   - Name: "XY" (too short)
   - Cost: "abc" (invalid)
   - Price: "50" (less than cost)
3. Observe:
   - ✓ Error messages appear red
   - ✓ Warning messages appear orange
   - ✓ Save button disabled

### Test 8: Search and Cache

**Steps:**
1. List page shows products
2. Wait 30 seconds for cache to populate
3. Search for product by name (should be fast)
4. Open product list again
5. Search again
6. Verify:
   - ✓ First search hits database
   - ✓ Subsequent searches use cache (instant)

---

## PART 5: Multi-User Simulation (15 minutes)

### Setup Multiple Browser Tabs/Sessions

**Terminal 1: Server (running)**
```bash
npm run dev
```

**Terminal 2: Monitor Performance**
```bash
node -e "
import { getPerformanceSummary } from './middleware/performanceMonitoring.js';
setInterval(async () => {
  const stats = getPerformanceSummary();
  console.clear();
  console.log(JSON.stringify(stats, null, 2));
}, 5000);
"
```

### Concurrent User Test

**Browser Tab 1:**
1. Open http://localhost:5173
2. Click Add Product
3. Fill form for "Product A"
4. **DON'T CLICK SAVE YET**

**Browser Tab 2:**
1. Open http://localhost:5173 (new session)
2. Click Add Product
3. Fill form for "Product B"
4. **DON'T CLICK SAVE YET**

**Browser Tab 3:**
1. Open http://localhost:5173 (new session)
2. Click Add Product
3. Fill form for "Product C"
4. **DON'T CLICK SAVE YET**

**Now Execute:**
1. Tab 1: Click Save (Product A)
2. At same time: Tab 2: Click Save (Product B)
3. At same time: Tab 3: Click Save (Product C)

**Verify:**
- ✓ All 3 products created successfully
- ✓ 3 different item codes assigned
- ✓ No duplicates (check in product list)
- ✓ FIFO order followed (first save gets first code)

---

## PART 6: Performance Profiling (10 minutes)

### Memory and CPU Usage

**Monitor Server Performance:**

```bash
# Open Performance Monitor (Windows)
perfmon

# Or use Node.js diagnostic
node --inspect server.js
# Then open: chrome://inspect
```

### Response Time Analysis

Check Terminal 2 output from Part 5:

```javascript
{
  "totalRequests": 50,
  "averageResponseTime": "142.35",
  "minResponseTime": "12.04",
  "maxResponseTime": "1823.45",
  "p95ResponseTime": "345.67",
  "p99ResponseTime": "890.23",
  "slowOperationCount": 1
}
```

**Target Metrics:**
| Metric | Target | Actual |
|--------|--------|--------|
| Avg Response | < 200ms | _____ |
| P95 Response | < 500ms | _____ |
| P99 Response | < 1000ms | _____ |
| Slow Ops | < 5% | _____ |

---

## PART 7: Edge Cases & Error Handling (15 minutes)

### Test 1: Network Error Handling

**Steps:**
1. Start product creation form
2. Data entry for 2 minutes
3. Disconnect network (unplug cable or disable WiFi)
4. Try to save
5. Verify:
   - ✓ Error message "Failed to connect"
   - ✓ Draft is still in localStorage
6. Reconnect network
7. Verify:
   - ✓ Draft can be recovered
   - ✓ Can save successfully

### Test 2: Large Form Data

**Steps:**
1. Import 100+ products from CSV
2. Monitor memory usage
3. Verify:
   - ✓ Page remains responsive
   - ✓ No memory leaks
   - ✓ All products created with unique codes

### Test 3: Rapid Submissions (Double Click)

**Steps:**
1. Fill Add Product form
2. Click Save button multiple times rapidly
3. Verify:
   - ✓ Only 1 product created
   - ✓ No duplicate item codes
   - ✓ Deduplication working

### Test 4: Concurrent Same-Barcode

**Steps:**
1. Tab A: Create product with barcode BC123
2. Tab B: Create product with barcode BC123
3. Tab A: Click Save
4. Tab B: Click Save (simultaneously)
5. Verify:
   - ✓ One succeeds
   - ✓ Other fails with "barcode already exists"
   - ✓ No corrupted data

---

## PART 8: Database Maintenance (10 minutes)

### Run Maintenance Routine

Create: `server/runMaintenance.js`

```javascript
import mongoose from 'mongoose';
import { runDatabaseMaintenance } from './utils/databaseOptimization.js';

await mongoose.connect(process.env.MONGODB_URI);
const result = await runDatabaseMaintenance();
console.log('Maintenance completed:', result);
process.exit(0);
```

Run:
```bash
node runMaintenance.js
```

### Generate Recommendations

Create: `server/getRecommendations.js`

```javascript
import mongoose from 'mongoose';
import { generateOptimizationRecommendations } from './utils/databaseOptimization.js';

await mongoose.connect(process.env.MONGODB_URI);
const recommendations = await generateOptimizationRecommendations();
console.log(JSON.stringify(recommendations, null, 2));
process.exit(0);
```

Run:
```bash
node getRecommendations.js
```

---

## PART 9: Production Readiness Checklist

### Code Quality
- [ ] No console.errors in browser
- [ ] No unhandled promise rejections
- [ ] All validation working
- [ ] No memory leaks detected

### Performance
- [ ] Avg response < 200ms ✓
- [ ] P95 response < 500ms ✓
- [ ] P99 response < 1000ms ✓
- [ ] Throughput > 40 req/sec ✓
- [ ] Cache hit rate > 70% ✓

### Data Integrity
- [ ] Zero duplicate item codes ✓
- [ ] Zero duplicate barcodes ✓
- [ ] No broken references ✓
- [ ] Database consistency verified ✓

### Functionality
- [ ] Auto-generation working ✓
- [ ] Custom codes supported ✓
- [ ] Validation enforced ✓
- [ ] Error messages clear ✓
- [ ] Drafts auto-save ✓
- [ ] FIFO order respected ✓

### Multi-User
- [ ] 10 concurrent users OK ✓
- [ ] 50 concurrent users OK ✓
- [ ] 100 concurrent users OK ✓
- [ ] No race conditions observed ✓

### Documentation
- [ ] Performance guide created ✓
- [ ] Testing guide created ✓
- [ ] Code comments added ✓
- [ ] API documentation updated ✓

---

## Troubleshooting During Testing

### Problem: Load test shows failures

**Check:**
```bash
# 1. Server is running
curl http://localhost:5000/health

# 2. MongoDB is running
mongosh

# 3. Test data is seeded
mongosh
> db.unittypes.countDocuments()  # Should be > 0
> db.groupings.countDocuments()  # Should be > 0
```

### Problem: Slow response times

**Investigate:**
```bash
# Check indexes
node analyzeIndexes.js

# Check slow queries
# Look for "⚠️ SLOW DATABASE QUERY" in server logs
```

### Problem: Duplicate item codes found

**Emergency fix:**
```bash
mongosh
> use nexis_erp
> db.counters.deleteOne({module: "product_code"})
> # Restart server to recreate counter
```

### Problem: Form not saving

**Check:**
1. Browser console for errors (F12)
2. Server terminal for errors
3. MongoDB connection
4. Network tab for failed requests

---

## Test Results Template

Use this to document your test run:

```markdown
# Testing Results - [DATE]

## Environment
- MongoDB: [version]
- Node.js: [version]
- React: 19.2.0
- Browser: [name and version]

## Load Test Results
- Concurrent Users: 10
- Products per User: 5
- Success Rate: 100%
- Avg Response: ___ ms
- Duplicate Codes: 0
- FIFO Order: ✓ PASSED

## Functionality Tests
- [ ] Auto-generation: ✓ PASS / ✗ FAIL
- [ ] Custom codes: ✓ PASS / ✗ FAIL
- [ ] Validation: ✓ PASS / ✗ FAIL
- [ ] Multi-user: ✓ PASS / ✗ FAIL
- [ ] Caching: ✓ PASS / ✗ FAIL
- [ ] Error handling: ✓ PASS / ✗ FAIL

## Performance
- Avg response time: ___ ms
- P95 response time: ___ ms
- Cache hit rate: ___%
- Throughput: ___ req/sec

## Issues Found
1. [Issue description]
   - Impact: [High/Medium/Low]
   - Fix: [Solution]

## Sign-Off
- Tester: [Name]
- Date: [Date]
- Status: ✓ READY FOR PRODUCTION / ⚠️ NEEDS FIXES
```

---

## Next Steps

1. ✅ Run full testing cycle
2. ✅ Document all results
3. ✅ Fix any issues found
4. ✅ Deploy to staging
5. ✅ Run acceptance testing
6. ✅ Deploy to production
7. ✅ Monitor for 24 hours
8. ✅ Celebrate! 🎉

---

## Questions? Issues?

Refer to:
- [PERFORMANCE_OPTIMIZATION_GUIDE.md](PERFORMANCE_OPTIMIZATION_GUIDE.md)
- [QUICK_REFERENCE_HIGH_VOLUME_DATA_ENTRY.md](QUICK_REFERENCE_HIGH_VOLUME_DATA_ENTRY.md)
- Load Test: [server/tests/loadTest.js](server/tests/loadTest.js)
- Database Utils: [server/utils/databaseOptimization.js](server/utils/databaseOptimization.js)
