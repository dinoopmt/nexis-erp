# GRN Edit Manager - Comprehensive Testing Guide

## 🧪 Quick Start

### Prerequisites
- Node.js server running: `npm start` from `/server` directory
- MongoDB running and accessible
- Test data: At least one Posted GRN in database
- Postman or curl for HTTP testing

---

## 📋 Test Levels

### LEVEL 1: Unit Tests (Jest)
```bash
# Run all unit tests
npm test -- GRNEditManager.test.js

# Run specific test
npm test -- GRNEditManager.test.js -t "Should acquire lock"

# Run with coverage
npm test -- GRNEditManager.test.js --coverage
```

**What it tests:**
- ✅ Lock acquisition & release
- ✅ Pre-validation checks
- ✅ Failure logging
- ✅ Concurrent lock blocking
- ✅ Version increments

**Expected time:** 10-15 seconds

---

### LEVEL 2: Manual Script (Node.js)
```bash
# Run demonstration script
node server/tests/manual-test.js

# This SIMULATES all scenarios (no real API calls)
# Shows expected behavior step-by-step
```

**What it shows:**
- 📊 Single user edit flow
- 🔄 Concurrent edit blocking
- 🔀 Automatic rollback on failure
- ⏱️ Lock expiration
- 📋 Manual recovery process

**Expected time:** 5-10 seconds

---

### LEVEL 3: HTTP Integration Tests (curl/Postman)
```bash
# Run curl test suite
bash server/tests/curl-tests.sh

# Or use Postman collection (see below)
```

**What it tests:**
- 🌐 Real API endpoints
- 📨 HTTP request/response cycle
- 🗄️ Real database reads
- 🔐 Lock persistence
- 📊 Version tracking

**Expected time:** 5-20 seconds per operation

---

## 🎯 Step-by-Step Manual Testing Guide

### SETUP: Get Test Data Ready

1. **Find a Posted GRN:**
   ```mongodb
   // In MongoDB Compass or mongosh
   db.goods_receipt_notes.findOne({ status: "Received" })
   ```
   
   Copy the `_id` - this is your **GRN_ID**

2. **Create a test user (or use existing):**
   ```mongodb
   db.users.findOne({})
   ```
   
   Copy an ObjectId - this is your **USER_ID**

---

### TEST 1️⃣: Single User Edit (Successful)

**Goal:** Verify edit lock + transaction flow works

**Steps:**

1. **Open Terminal 1 - Watch the logs:**
   ```bash
   cd server
   npm start
   # Watch for lock messages and transaction logs
   ```

2. **Open Terminal 2 - Make the edit request:**
   ```bash
   curl -X PUT http://localhost:5000/api/grn/YOUR_GRN_ID \
     -H "Content-Type: application/json" \
     -d '{
       "items": [
         {
           "productId": "YOUR_PRODUCT_ID",
           "quantity": 50,
           "unitCost": 15
         }
       ],
       "notes": "Test edit",
       "createdBy": "YOUR_USER_ID"
     }'
   ```

3. **Verify in logs:**
   - ✅ `🔍 Pre-edit validation for GRN ...`
   - ✅ `🔒 Acquiring edit lock ...`
   - ✅ `✅ Lock acquired for GRN ...`
   - ✅ `🔄 [updateRelatedCollections] Starting cascade updates`
   - ✅ `📊 [PHASE 0] Reversing old stock movements...`
   - ✅ `✅ COMMIT: All phases succeeded`
   - ✅ `✅ Lock released for GRN ...`

4. **Check database:**
   ```mongodb
   // Lock should be cleared
   db.goods_receipt_notes.findOne(
     { _id: ObjectId("YOUR_GRN_ID") },
     { editLock: 1, __v: 1 }
   )
   ```
   
   **Expected:**
   ```json
   {
     "_id": ObjectId("..."),
     "editLock": null,
     "__v": 1  // or higher (incremented version)
   }
   ```

5. **Verify stock movements:**
   ```mongodb
   // Should have new OUTBOUND and INBOUND movements
   db.stock_movements.find({ grnId: ObjectId("YOUR_GRN_ID") })
     .sort({ createdDate: -1 }).limit(5)
   ```

---

### TEST 2️⃣: Concurrent Edit Blocking

**Goal:** Verify second user can't edit while first is editing

**Steps:**

1. **Terminal 1 - Start first user's edit:**
   ```bash
   # Use a GRN that exists but keep this request hanging
   # (Or modify network to be slow)
   curl -X PUT http://localhost:5000/api/grn/YOUR_GRN_ID \
     -H "Content-Type: application/json" \
     -d '{"items": [], "createdBy": "USER_1_ID"}' \
     --max-time 60  # Keep for 60 seconds
   ```
   
   **In logs:** `✅ Lock acquired for GRN ... (USER_1_ID)`

2. **Terminal 2 - Try to edit same GRN (during User 1's lock):**
   ```bash
   curl -X PUT http://localhost:5000/api/grn/YOUR_GRN_ID \
     -H "Content-Type: application/json" \
     -d '{"items": [], "createdBy": "USER_2_ID"}'
   ```
   
   **Expected response:**
   ```json
   {
     "success": false,
     "error": "GRN is locked by another user until 2026-03-22T14:35:22Z"
   }
   ```

3. **Terminal 1 - Let first request finish:**
   - Wait for response (lock should release automatically)

4. **Terminal 2 - Retry:**
   ```bash
   curl -X PUT http://localhost:5000/api/grn/YOUR_GRN_ID \
     -H "Content-Type: application/json" \
     -d '{"items": [], "createdBy": "USER_2_ID"}'
   ```
   
   **Expected:** ✅ Should succeed now (lock is free)

---

### TEST 3️⃣: Transaction Rollback on Failure

**Goal:** Verify automatic rollback when phase fails

**Steps:**

1. **Simulate failure scenario:**
   - Edit GRN to DECREASE quantities (Phase 0 reversal will succeed)
   - But stock consumed between reversal and re-apply (Phase 1 fails)

2. **Terminal 1 - Monitor logs:**
   ```bash
   npm start | grep -i "phase\|rollback\|commit"
   ```

3. **Terminal 2 - Trigger edit (this might fail naturally):**
   ```bash
   curl -X PUT http://localhost:5000/api/grn/YOUR_GRN_ID \
     -H "Content-Type: application/json" \
     -d '{
       "items": [{
         "productId": "YOUR_PRODUCT_ID",
         "quantity": 1,
         "unitCost": 100
       }],
       "createdBy": "USER_ID"
     }'
   ```

4. **Watch for rollback in logs:**
   ```
   ❌ TRANSACTION FAILED: [error message]
   🔄 ROLLBACK executed - all changes reverted
   📋 Failure logged: [FailedEdit._id]
   ```

5. **Check FailedEdit collection:**
   ```mongodb
   db.failed_edits.findOne({ recovered: false })
   ```
   
   **Expected:**
   ```json
   {
     "grnNumber": "GRN-...",
     "phase": "application",
     "error": "...",
     "originalState": { /* snapshot */ },
     "proposedChanges": { /* what user tried */ },
     "recovered": false
   }
   ```

---

### TEST 4️⃣: Pre-Validation Fast Fail

**Goal:** Verify invalid edits fail BEFORE lock/transaction

**Steps:**

1. **Terminal 2 - Send invalid request (negative quantity):**
   ```bash
   curl -X PUT http://localhost:5000/api/grn/YOUR_GRN_ID \
     -H "Content-Type: application/json" \
     -d '{
       "items": [{
         "productId": "YOUR_PRODUCT_ID",
         "quantity": -50,
         "unitCost": 10
       }],
       "createdBy": "USER_ID"
     }'
   ```

2. **Expected response (FAST - before lock):**
   ```json
   {
     "safe": false,
     "error": "Invalid quantity for product: -50",
     "checks": {
       "quantityValid": false
     }
   }
   ```

3. **Verify in logs:**
   - ✅ `🔍 Pre-edit validation for GRN ...`
   - ❌ Quantities INVALID: quantity=-50
   - ❌ Edit REJECTED before acquiring lock
   - **NO** `🔒 Acquiring edit lock` (never reached)

---

### TEST 5️⃣: Manual Recovery from Failure

**Goal:** Test admin recovery endpoint

**Steps:**

1. **Find failed edit:**
   ```bash
   curl -X GET http://localhost:5000/api/failed-edits
   ```
   
   Get a `_id` where `recovered: false`

2. **Attempt recovery (retry):**
   ```bash
   curl -X PUT http://localhost:5000/api/failed-edits/FAILURE_ID/recover?action=retry \
     -H "Content-Type: application/json"
   ```

3. **Expected response:**
   ```json
   {
     "success": true,
     "recovered": true,
     "message": "Recovery successful"
   }
   ```

4. **Verify in logs:**
   - ✅ Recovery log updated
   - ✅ Attempt count incremented

5. **Verify in DB:**
   ```mongodb
   db.failed_edits.findOne({ _id: ObjectId("FAILURE_ID") })
   ```
   
   **Check:**
   - `recovered`: now `true`
   - `recoveryLog`: has new entry with success

---

### TEST 6️⃣: Lock Expiration

**Goal:** Verify lock auto-releases after 30 minutes

**Steps:**

1. **Create a quick lock with SHORT timeout (for testing):**
   
   Edit GRNEditManager.js temporarily:
   ```javascript
   // Change this line temporarily:
   // await this.acquireEditLock(grnId, userId, 30 * 60 * 1000); // 30 min
   
   // To test with 5 seconds:
   static async testLockExpiration(grnId, userId) {
     return await this.acquireEditLock(grnId, userId, 5000); // 5 seconds
   }
   ```

2. **Acquire lock:**
   ```bash
   curl -X POST http://localhost:5000/api/grn/YOUR_GRN_ID/test-lock \
     -d '{"userId": "USER_1_ID"}'
   ```

3. **Check lock immediately (should exist):**
   ```mongodb
   db.goods_receipt_notes.findOne(
     { _id: ObjectId("YOUR_GRN_ID") },
     { editLock: 1 }
   )
   ```
   
   **Result:** `editLock: { lockedBy: ..., expiresAt: ... }`

4. **Wait 6 seconds, try to acquire:**
   ```bash
   sleep 6
   curl -X POST http://localhost:5000/api/grn/YOUR_GRN_ID/test-lock \
     -d '{"userId": "USER_2_ID"}'
   ```
   
   **Expected:** ✅ Should succeed (lock expired)

---

## 📊 Verification Queries

Run these in MongoDB to verify state:

### Check Current Locks
```mongodb
// All active locks
db.goods_receipt_notes.find({ 
  "editLock": { $ne: null },
  "editLock.expiresAt": { $gt: new Date() }
})

// Show lock details
db.goods_receipt_notes.findOne(
  { "editLock": { $ne: null } },
  { grnNumber: 1, "editLock.lockedBy": 1, "editLock.expiresAt": 1 }
)
```

### Check Failed Edits
```mongodb
// All unrecovered failures
db.failed_edits.find({ recovered: false })

// Failures by phase
db.failed_edits.find({ phase: "application" })

// Show recovery history
db.failed_edits.findOne({ recovered: true }, { recoveryLog: 1 })
```

### Check Version/Atomicity
```mongodb
// GRN version tracking
db.goods_receipt_notes.findOne(
  { grnNumber: "GRN-XXX" },
  { __v: 1, grnNumber: 1 }
)

// Stock movements (should show atomicity - paired OUTBOUND/INBOUND)
db.stock_movements.find(
  { reference: /GRN-XXX/, grnId: ObjectId("...") }
).sort({ createdDate: 1 })

// Should see: OUTBOUND (phase 0) then INBOUND (phase 1) together
```

---

## 🐛 Troubleshooting

### Problem: Tests hang/timeout

**Solution:**
- Check if server is running: `curl http://localhost:5000/health`
- Check MongoDB connection: `mongosh` command
- Check if port 5000 is in use: `lsof -i :5000`

### Problem: Lock not releasing

**Solution:**
- Check logs for rollback errors
- Manually clear lock:
  ```javascript
  db.goods_receipt_notes.updateOne(
    { _id: ObjectId("GRN_ID") },
    { $set: { editLock: null } }
  )
  ```

### Problem: Validation failing but shouldn't

**Solution:**
- Check GRN status is "Received" or "Posted"
- Verify stock exists in CurrentStock collection
- Check no confirmed payments exist:
  ```mongodb
  db.vendor_payments.find({ grnId: ObjectId("GRN_ID"), paymentStatus: "PENDING" })
  ```

### Problem: Transaction appears to not rollback

**Solution:**
- Verify MongoDB has transactions enabled (replica set required)
- Check session is being passed to all operations
- Check error message in logs - might be pre-validation failure

---

## ✅ Success Criteria

| Feature | Success Indicator |
|---------|-------------------|
| **Edit Lock** | Second user gets "locked by" error |
| **Pre-validation** | Invalid data fails in <100ms without lock |
| **Transaction** | "COMMIT" or "ROLLBACK" appears in logs |
| **Recovery Logging** | FailedEdit document created on failure |
| **Manual Recovery** | Failure marked `recovered: true` after retry |
| **Version Control** | `__v` increments after each edit |
| **Atomicity** | Stock movements always paired (OUTBOUND+INBOUND) |
| **Concurrency** | Only ONE user can edit same GRN simultaneously |

---

## 📈 Performance Benchmarks

Expected timings:

| Operation | Duration | Notes |
|-----------|----------|-------|
| Pre-validation | 50-100ms | Should fail fast |
| Lock acquire (free) | 5-10ms | Atomic operation |
| Transaction commit | 100-500ms | Depends on collection size |
| Phase 0 (reversal) | 50-200ms | Per item loop |
| Phase 1 (application) | 50-200ms | Per item loop |
| Full edit (success) | 500-1000ms | Total E2E |
| Lock release | 5-10ms | Atomic operation |

---

## 📝 Logging to Monitor

Watch server logs for these patterns:

**Successful edit:**
```
🔍 Pre-edit validation for GRN ...
🔒 Acquiring edit lock ...
✅ Lock acquired for GRN ...
🔄 [updateRelatedCollections] Starting cascade ...
📊 [PHASE 0] Reversing old stock ...
📊 [PHASE 1] Applying new changes ...
📊 [PHASE 2] Processing VendorPayment ...
📊 [PHASE 3] Processing CurrentStock ...
✅ COMMIT: All phases succeeded ...
✅ Lock released for GRN ...
```

**Failed edit with rollback:**
```
🔍 Pre-edit validation for GRN ...
🔒 Acquiring edit lock ...
✅ Lock acquired for GRN ...
📊 [PHASE 0] Reversing old stock ...
❌ TRANSACTION FAILED: [error]
🔄 ROLLBACK executed - all changes reverted
✅ Lock released for GRN ...
📋 Failure logged: [FailedEdit._id]
```

**Concurrent edit blocked:**
```
🔒 Acquiring edit lock ...
❌ Failed to acquire lock: GRN is locked by ...
```

---

## 🎓 What Was Tested

✅ Pessimistic locking (edit locks)
✅ Pre-validation safety checks
✅ MongoDB transactions with atomicity
✅ Automatic rollback on any phase failure
✅ Failure logging and recovery
✅ Version control for optimistic locking
✅ Concurrent edit prevention
✅ Lock expiration
✅ Stock movement atomicity (paired movements)
✅ Vendor payment updates

---

## 📞 Getting Help

If tests fail:

1. **Check logs first:** `npm start | grep -i error`
2. **Verify database:** `mongosh` and check collections
3. **Check MongoDB:** Is it running? `mongosh --eval "db.adminCommand('ping')"`
4. **Review test output:** Look for specific phase that failed
5. **Check error recovery:** Query `failed_edits` collection for details
