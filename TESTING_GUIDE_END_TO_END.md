# NEXIS-ERP: End-to-End Testing Guide
**Date:** April 20, 2026  
**Purpose:** Complete workflow testing with validation & security hardening

---

## Prerequisites

Before starting:
- [ ] Backend server running on `http://localhost:5000`
- [ ] Frontend running on `http://localhost:5173` or `http://localhost:3000`
- [ ] MongoDB connected
- [ ] Meilisearch running (if using search)
- [ ] Postman or similar API testing tool installed

---

## Part 1: Security Validation Testing

### Test 1.1: Rate Limiting Active

**Objective:** Verify rate limiting prevents brute force attacks

**Steps:**
1. Open Postman
2. Create a request: `POST http://localhost:5000/api/v1/auth/login`
3. Send body:
```json
{
  "username": "invalid",
  "password": "wrong"
}
```
4. Click "Send" 5 times rapidly
5. **Expected:** 5th request fails with `429 Too Many Requests`

**Result:** ✅ Pass / ❌ Fail

---

### Test 1.2: CORS Protection Active

**Objective:** Verify CORS whitelist blocks unauthorized origins

**Steps (in Browser Console):**
```javascript
// From any random domain (NOT http://localhost:3000 or :5173)
fetch('http://localhost:5000/api/v1/financial-years', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer test-token' }
})
.then(r => r.json())
.catch(e => console.error('Error:', e))
```

**Expected Results:**
- ✅ From `http://localhost:3000`: Request succeeds (in whitelist)
- ✅ From `http://example.com`: CORS error (blocked)

**Result:** ✅ Pass / ❌ Fail

---

### Test 1.3: Input Validation - Financial Year

**Objective:** Verify validation rejects invalid data

**Test Case 1: Invalid ObjectId**
```
POST http://localhost:5000/api/v1/financial-years
Body: {
  "yearCode": "FY2025-26",
  "yearName": "FY 2025-26",
  "startDate": "2025-04-01",
  "endDate": "not-a-date"
}
```
**Expected:** 400 error with validation message

**Test Case 2: Invalid Year Code**
```
POST http://localhost:5000/api/v1/financial-years
Body: {
  "yearCode": "",
  "yearName": "FY 2025-26",
  "startDate": "2025-04-01",
  "endDate": "2026-03-31"
}
```
**Expected:** 400 error - "Year code required"

**Test Case 3: Start Date After End Date**
```
POST http://localhost:5000/api/v1/financial-years
Body: {
  "yearCode": "FY2025-26",
  "yearName": "FY 2025-26",
  "startDate": "2026-03-31",
  "endDate": "2025-04-01"
}
```
**Expected:** 400 error - "Start date must be before end date"

**Result:** ✅ Pass / ❌ Fail

---

## Part 2: Financial Year System Testing

### Test 2.1: Create Financial Year

**Steps:**

1. **Create via Postman:**
```
POST http://localhost:5000/api/v1/financial-years
Headers: { "Content-Type": "application/json" }
Body:
{
  "yearCode": "FY2025-26",
  "yearName": "Financial Year 2025-2026",
  "startDate": "2025-04-01",
  "endDate": "2026-03-31",
  "isCurrent": true
}
```

2. **Expected Response (201):**
```json
{
  "success": true,
  "message": "Financial year created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "yearCode": "FY2025-26",
    "yearName": "Financial Year 2025-2026",
    "startDate": "2025-04-01T00:00:00.000Z",
    "endDate": "2026-03-31T00:00:00.000Z",
    "status": "OPEN",
    "isCurrent": true,
    "isDeleted": false,
    "createdAt": "2026-04-20T10:30:00.000Z"
  }
}
```

3. **Check Logs:**
```
Check logs/combined.log for:
- HTTP_SUCCESS with POST /api/v1/financial-years status 201
- DB_OPERATION with financial year creation
```

**Result:** ✅ Pass / ❌ Fail  
**Logs Show:** ✅ Yes / ❌ No

---

### Test 2.2: Retrieve Financial Year

**Steps:**

1. **Get All FY:**
```
GET http://localhost:5000/api/v1/financial-years
```

2. **Expected:** Array of all financial years

3. **Get Current FY:**
```
GET http://localhost:5000/api/v1/financial-years/current
```

4. **Expected:** Current FY marked with `isCurrent: true`

5. **Get By ID:**
```
GET http://localhost:5000/api/v1/financial-years/507f1f77bcf86cd799439011
```

6. **Expected:** Specific FY details

**Result:** ✅ Pass / ❌ Fail

---

### Test 2.3: Update Financial Year

**Steps:**

1. **Update Request:**
```
PUT http://localhost:5000/api/v1/financial-years/507f1f77bcf86cd799439011
Body:
{
  "yearName": "Updated FY 2025-2026",
  "status": "CLOSED"
}
```

2. **Expected:** Updated FY returned with new values

**Result:** ✅ Pass / ❌ Fail

---

### Test 2.4: Set Current Financial Year

**Steps:**

1. **Create second FY:**
```
POST http://localhost:5000/api/v1/financial-years
Body:
{
  "yearCode": "FY2026-27",
  "yearName": "Financial Year 2026-2027",
  "startDate": "2026-04-01",
  "endDate": "2027-03-31",
  "isCurrent": false
}
```
Save the returned `_id`

2. **Set as Current:**
```
PATCH http://localhost:5000/api/v1/financial-years/<NEW_ID>/set-current
```

3. **Verify Previous Current Unset:**
```
GET http://localhost:5000/api/v1/financial-years
```
- New FY should have `isCurrent: true`
- Old FY should have `isCurrent: false`

**Result:** ✅ Pass / ❌ Fail

---

## Part 3: Sales Invoice System Testing

### Test 3.1: Create Sales Invoice with Validation

**Steps:**

1. **Get Customer ID** (from DB or existing customer)
   - Query: `db.customers.findOne()`
   - Or create one first

2. **Get Product IDs** (need at least 2 products)
   - Query: `db.products.find().limit(2)`
   - Or create products first

3. **Create Invoice with Valid Data:**
```
POST http://localhost:5000/api/v1/sales-invoices/createSalesInvoice
Body:
{
  "customerId": "607f1f77bcf86cd799439012",
  "invoiceDate": "2026-04-20T10:00:00Z",
  "dueDate": "2026-05-20T10:00:00Z",
  "items": [
    {
      "productId": "607f1f77bcf86cd799439013",
      "quantity": 5,
      "rate": 1000,
      "discount": 5,
      "discountType": "PERCENTAGE"
    },
    {
      "productId": "607f1f77bcf86cd799439014",
      "quantity": 10,
      "rate": 500,
      "discount": 0
    }
  ],
  "notes": "Test invoice",
  "paymentTerms": "CREDIT"
}
```

4. **Expected Response (201):**
```json
{
  "success": true,
  "invoiceId": "...",
  "total": 12250,
  "status": "DRAFT"
}
```

**Result:** ✅ Pass / ❌ Fail

---

### Test 3.2: Invalid Invoice Validation

**Test Case 1: Negative Quantity**
```
POST http://localhost:5000/api/v1/sales-invoices/createSalesInvoice
Body:
{
  "customerId": "607f1f77bcf86cd799439012",
  "invoiceDate": "2026-04-20T10:00:00Z",
  "items": [
    {
      "productId": "607f1f77bcf86cd799439013",
      "quantity": -5,
      "rate": 1000
    }
  ]
}
```
**Expected:** 400 - "Quantity must be positive"

**Test Case 2: Missing Items**
```
POST http://localhost:5000/api/v1/sales-invoices/createSalesInvoice
Body:
{
  "customerId": "607f1f77bcf86cd799439012",
  "invoiceDate": "2026-04-20T10:00:00Z",
  "items": []
}
```
**Expected:** 400 - "At least one item is required"

**Test Case 3: Invalid Customer ID**
```
POST http://localhost:5000/api/v1/sales-invoices/createSalesInvoice
Body:
{
  "customerId": "not-a-valid-id",
  "invoiceDate": "2026-04-20T10:00:00Z",
  "items": [...]
}
```
**Expected:** 400 - "Invalid MongoDB ObjectId"

**Result:** ✅ Pass / ❌ Fail

---

### Test 3.3: Invoice CRUD Operations

**1. List Invoices:**
```
GET http://localhost:5000/api/v1/sales-invoices/getSalesInvoices
```

**2. Get By ID:**
```
GET http://localhost:5000/api/v1/sales-invoices/getSalesInvoiceById/<INVOICE_ID>
```

**3. Update Invoice:**
```
PUT http://localhost:5000/api/v1/sales-invoices/updateSalesInvoice/<INVOICE_ID>
Body:
{
  "notes": "Updated notes",
  "paymentTerms": "CASH"
}
```

**4. Delete Invoice:**
```
DELETE http://localhost:5000/api/v1/sales-invoices/deleteSalesInvoice/<INVOICE_ID>
```

**Result:** ✅ Pass / ❌ Fail

---

## Part 4: Frontend Integration Testing

### Test 4.1: Financial Year UI

**Steps:**

1. **Navigate to:** Dashboard → Company Settings → Financial Year Management

2. **Test Create:**
   - Click "New Financial Year" button
   - Fill form:
     - Year Code: `FY2025-26`
     - Year Name: `Financial Year 2025-2026`
     - Start Date: `2025-04-01`
     - End Date: `2026-03-31`
     - Check "Set as current financial year"
   - Click "Create"
   - **Expected:** Success toast, FY appears in list

3. **Test Set Current:**
   - Create second FY (without setting current)
   - Click "Set Current" on new FY
   - **Expected:** Badge moves to new FY

4. **Check Validation (Browser DevTools):**
   - Try submitting empty form
   - **Expected:** Form validation error

**Result:** ✅ Pass / ❌ Fail

---

### Test 4.2: Sales Invoice UI

**Steps:**

1. **Navigate to:** Sales → Sales Invoice

2. **Test Create:**
   - Click "New Invoice"
   - Fill form with:
     - Customer: Select from dropdown
     - Items: Add 2-3 products with quantities
     - Apply discount on one item
   - Click "Save"
   - **Expected:** Invoice created, preview modal shows

3. **Test Print:**
   - Click "Print" button
   - **Expected:** Print preview opens

4. **Test Validation:**
   - Try adding item with negative quantity
   - **Expected:** Frontend validation prevents submission

**Result:** ✅ Pass / ❌ Fail

---

## Part 5: Logging & Monitoring

### Test 5.1: Check Request Logs

**Steps:**

1. **Open Terminal:**
```bash
# Windows
type logs\combined.log | tail -50

# Or use PowerShell
Get-Content logs\combined.log -Tail 50

# Or real-time
Get-Content logs\combined.log -Wait
```

2. **Verify Logs Contain:**
   - Request ID (X-Request-ID)
   - HTTP method and path
   - Status code
   - Response duration
   - User (if authenticated)
   - Timestamp

3. **Example Log Entry:**
```
2026-04-20 10:30:45 [INFO] HTTP_SUCCESS {
  "requestId": "req_1713607200000_a1b2c3d4e5",
  "method": "POST",
  "path": "/api/v1/financial-years",
  "status": 201,
  "duration": "45ms",
  "user": "507f1f77bcf86cd799439001"
}
```

**Result:** ✅ Pass / ❌ Fail

---

### Test 5.2: Check Error Logs

**Steps:**

1. **Trigger an Error:**
   - Make invalid request
   - Or manually cause error

2. **Check logs:**
```bash
type logs\error.log
```

3. **Verify Error Contains:**
   - Full error message
   - Stack trace
   - Request details
   - Timestamp

**Result:** ✅ Pass / ❌ Fail

---

## Part 6: Performance & Security Metrics

### Test 6.1: Request Duration

**Objective:** Measure API response times

**Steps:**
1. Create invoice (simple: 2 items)
   - Note duration from logs
   - **Expected:** < 200ms

2. Create invoice (complex: 50 items)
   - Note duration from logs
   - **Expected:** < 500ms

3. List 1000 invoices
   - Note duration
   - **Expected:** < 1000ms

**Result:** ✅ Pass / ❌ Fail

---

### Test 6.2: Rate Limiting Verification

**Objective:** Confirm rate limits protect system

**Steps:**
1. Send 100 requests rapidly
   - **Expected:** Requests 1-100 succeed, 101+ get 429

2. Send 5 login attempts rapidly
   - **Expected:** Requests 1-5 get rejection, 6th gets 429

3. Check logs for rate limit events

**Result:** ✅ Pass / ❌ Fail

---

## Part 7: Validation Error Responses

### Test 7.1: Error Format Consistency

**Objective:** Verify all validation errors follow same format

**Create Invalid FY:**
```
POST http://localhost:5000/api/v1/financial-years
Body:
{
  "yearCode": "",
  "yearName": "",
  "startDate": "invalid"
}
```

**Expected Response Format:**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "yearCode",
      "message": "Year code required"
    },
    {
      "field": "yearName",
      "message": "Year name required"
    },
    {
      "field": "startDate",
      "message": "Invalid datetime"
    }
  ]
}
```

**Result:** ✅ Pass / ❌ Fail

---

## Test Summary Template

```
Date: ________________
Tester: ________________
Build Version: ________________

SECURITY TESTS:
☐ Test 1.1: Rate Limiting - ✅ / ❌
☐ Test 1.2: CORS Protection - ✅ / ❌
☐ Test 1.3: Input Validation - ✅ / ❌

FINANCIAL YEAR TESTS:
☐ Test 2.1: Create - ✅ / ❌
☐ Test 2.2: Retrieve - ✅ / ❌
☐ Test 2.3: Update - ✅ / ❌
☐ Test 2.4: Set Current - ✅ / ❌

SALES INVOICE TESTS:
☐ Test 3.1: Create Valid - ✅ / ❌
☐ Test 3.2: Validation Errors - ✅ / ❌
☐ Test 3.3: CRUD Operations - ✅ / ❌

FRONTEND TESTS:
☐ Test 4.1: FY UI - ✅ / ❌
☐ Test 4.2: Invoice UI - ✅ / ❌

LOGGING TESTS:
☐ Test 5.1: Request Logs - ✅ / ❌
☐ Test 5.2: Error Logs - ✅ / ❌

PERFORMANCE TESTS:
☐ Test 6.1: Request Duration - ✅ / ❌
☐ Test 6.2: Rate Limiting - ✅ / ❌

VALIDATION FORMAT TESTS:
☐ Test 7.1: Error Format - ✅ / ❌

OVERALL RESULT: ✅ PASS / ❌ FAIL

Issues Found:
_________________________________________
_________________________________________
_________________________________________

Notes:
_________________________________________
_________________________________________
```

---

## Troubleshooting

### Issue: Rate Limiting Not Working

**Solution:**
```bash
# Check middleware is imported
grep "globalLimiter" server/server.js

# Check order - rate limiting BEFORE routes
# Verify in server.js: rate limiting applied BEFORE app.use('/api/v1/...')
```

### Issue: Validation Not Triggering

**Solution:**
```bash
# Check validator imported in routes
grep "validate" server/modules/masters/routes/financialYearRoutes.js

# Check validator middleware order
# Must be BEFORE controller function

# Check schema exists
grep "createFinancialYearSchema" server/middleware/validators/schemaValidator.js
```

### Issue: Logs Not Creating

**Solution:**
```bash
# Create logs directory
mkdir logs

# Check permissions
dir logs

# Check logger configured
grep "winston.transports.File" server/middleware/structuredLogger.js
```

### Issue: CORS Blocking Requests

**Solution:**
```bash
# Check origin in response headers
# Browser DevTools → Network → Response Headers → Access-Control-Allow-Origin

# Check environment.js config
cat server/config/environment.js | grep CORS_ORIGIN

# Add origin to whitelist if needed
```

---

## Test Checklist Before Deployment

- [ ] All 13 tests passing
- [ ] No validation errors in logs
- [ ] Rate limiting active (verified)
- [ ] CORS whitelist correct
- [ ] Request IDs in all logs
- [ ] Error logs for failed requests
- [ ] Frontend validation working
- [ ] Performance metrics acceptable
- [ ] No security vulnerabilities detected
- [ ] Documentation updated

---

## Next Steps

1. ✅ Run all tests above
2. ✅ Document any failures
3. ✅ Fix issues
4. ✅ Re-run failed tests
5. ✅ Get sign-off from team
6. ✅ Deploy to staging
7. ✅ Run in staging environment
8. ✅ Deploy to production
