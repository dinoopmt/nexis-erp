# 🔌 Phase 6: API Endpoint Compatibility

**Status:** Ready for verification  
**Created:** March 23, 2026  
**Purpose:** Ensure backend supports both old and new API endpoint formats

---

## ⚠️ Endpoint Format Mismatch Detected

**Issue:** API endpoints changed between old and new components:

```javascript
// Old Component (SalesInvoice.jsx)
GET /api/v1/sales-invoices/getSalesInvoices
POST /api/v1/sales-invoices/create

// New Service (SalesInvoiceService.js)
GET /sales-invoices
POST /sales-invoices
```

**Action Required:** Backend must support BOTH formats or we need to standardize

---

## 🔍 API Compatibility Checklist

### Current Endpoints (Old Component)

```javascript
// From SalesInvoice.jsx (grep results)
GET   /api/v1/sales-invoices/getSalesInvoices      ← Fetch all invoices
POST  /api/v1/sales-invoices/create                ← Save new invoice
PUT   /api/v1/sales-invoices/:id                   ← Update invoice
DELETE /api/v1/sales-invoices/:id                  ← Delete invoice
GET   /api/v1/sales-invoices/:id                   ← Get specific invoice
GET   /api/v1/products/search?q=...                ← Search products
GET   /api/v1/products/barcode/:code               ← Find by barcode
GET   /api/v1/customers                            ← Fetch customers
GET   /api/v1/invoice-number/next?branch=...       ← Get next invoice #
```

### New Endpoints (New Service)

```javascript
// From SalesInvoiceService.js
GET   /sales-invoices                              ← Fetch all invoices
POST  /sales-invoices                              ← Save new invoice
PUT   /sales-invoices/:id                          ← Update invoice
DELETE /sales-invoices/:id                         ← Delete invoice
GET   /sales-invoices/:id                          ← Get specific invoice
GET   /products/search?q=...                       ← Search products
GET   /products/barcode/:code                      ← Find by barcode
GET   /customers                                   ← Fetch customers
GET   /invoice-number/next?branch=...              ← Get next invoice #
```

---

## ✅ Verification Steps

### Test 1: Old Endpoints Still Work

**Objective:** Ensure backend still supports `/api/v1/` endpoints

```bash
# Test each old endpoint
curl -X GET "http://localhost:3001/api/v1/sales-invoices/getSalesInvoices" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: HTTP 200 with invoice array
# If: HTTP 404 → Endpoint removed (PROBLEM)
# If: HTTP 401 → Auth issue (not a problem)
```

**Results:**
- [ ] GET /api/v1/sales-invoices/getSalesInvoices → HTTP 200
- [ ] GET /api/v1/products/search?q=test → HTTP 200
- [ ] GET /api/v1/customers → HTTP 200
- [ ] POST /api/v1/sales-invoices/create → HTTP 200/400

**Status:** ✅ WORKING / ❌ BROKEN

---

### Test 2: New Endpoints Work

**Objective:** Ensure backend supports simplified `/sales-invoices` endpoints

```bash
# Test each new endpoint
curl -X GET "http://localhost:3001/sales-invoices" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: HTTP 200 with invoice array
```

**Results:**
- [ ] GET /sales-invoices → HTTP 200
- [ ] GET /products/search?q=test → HTTP 200
- [ ] GET /customers → HTTP 200
- [ ] POST /sales-invoices → HTTP 200/400

**Status:** ✅ WORKING / ❌ BROKEN

---

### Test 3: Choose Compatibility Strategy

Based on endpoint availability, choose one:

#### **Option A: Dual Support** (Recommended)
Backend supports BOTH versions simultaneously
```
✅ Old component (v1 endpoints): Still works
✅ New component (simplified endpoints): Now works
✅ Gradual migration possible
✅ No cutover risk
```

**Implementation:**
1. Keep `/api/v1/` routes as-is
2. Add `/sales-invoices` aliases or proxy routes
3. Both components work independently
4. Can migrate old component later

---

#### **Option B: Update Old Component** (Medium Risk)
Change old component to use new endpoints
```
⚠️ Must update SalesInvoice.jsx to use /sales-invoices
⚠️ Same endpoints, potentially breaking if not tested
✅ Single endpoint format
✅ Simpler backend
```

**Implementation:**
1. Edit SalesInvoice.jsx API calls
2. Change `/api/v1/sales-invoices/` to `/sales-invoices/`
3. Test old component still works
4. Both components use same endpoints

---

#### **Option C: Revert New Endpoints** (Safest)
Update new service to use old endpoints
```
✅ Zero risk to old component
✅ Backend unchanged
✅ New component works immediately
❌ No endpoint simplification benefit
```

**Implementation:**
1. Edit SalesInvoiceService.js
2. Change `/sales-invoices/` back to `/api/v1/sales-invoices/`
3. Both components use v1 endpoints
4. Refactoring captured in code structure, not endpoints

---

## 🔧 Endpoint Update Script

**If choosing Option B or C:**

### Update SalesInvoiceService.js to use /api/v1/

```javascript
// Before
const BASE_URL = `${process.env.REACT_APP_API_URL}/sales-invoices`;

// After
const BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1/sales-invoices`;
```

**Test After Update:**
```bash
npm test -- SalesInvoiceService.test.js
```

---

## 📋 Backend Verification Checklist

**Ask your backend team to verify:**

- [ ] **GET /sales-invoices**
  - [ ] Returns invoice list with correct structure
  - [ ] Respects pagination parameters
  - [ ] Properly filtered/sorted
  - [ ] HTTP 200 on success

- [ ] **POST /sales-invoices**
  - [ ] Creates new invoice
  - [ ] Returns created invoice with ID
  - [ ] Validates input (no missing fields)
  - [ ] Returns HTTP 400 on invalid data

- [ ] **PUT /sales-invoices/:id**
  - [ ] Updates existing invoice
  - [ ] Returns updated invoice
  - [ ] Validates ID exists
  - [ ] Returns HTTP 404 if not found

- [ ] **DELETE /sales-invoices/:id**
  - [ ] Deletes invoice
  - [ ] Returns HTTP 204 (No Content)
  - [ ] Returns HTTP 404 if not found

- [ ] **GET /products/search?q=...**
  - [ ] Searches products by name
  - [ ] Returns matching products
  - [ ] Supports pagination
  - [ ] Returns empty array if no matches

- [ ] **GET /products/barcode/:code**
  - [ ] Finds product by barcode
  - [ ] Returns product details
  - [ ] Returns HTTP 404 if not found

- [ ] **GET /customers**
  - [ ] Returns customer list
  - [ ] Includes customer ID, name, phone, tax rate
  - [ ] Returns HTTP 200

- [ ] **GET /invoice-number/next?branch=...**
  - [ ] Returns next invoice number
  - [ ] Incremental (not duplicate)
  - [ ] Respects branch parameter
  - [ ] Returns HTTP 200

---

## 📊 Compatibility Decision Matrix

| Scenario | Old Works | New Works | Recommendation | Risk |
|----------|-----------|-----------|---|---|
| Both endpoints working | ✅ | ✅ | **Option A:** Dual support | 🟢 Low |
| Only old endpoints | ✅ | ❌ | **Option C:** Revert new | 🟡 Medium |
| Only new endpoints | ❌ | ✅ | **Option B:** Update old | 🟡 Medium |
| Neither working | ❌ | ❌ | Debug backend issues | 🔴 High |

---

## 🚀 Recommended Action

**For safest cutover (Option B + Option C Hybrid):**

1. **Immediate:** Update `SalesInvoiceService.js` to use `/api/v1/` endpoints
   - Reason: Proven, tested, no backend changes needed
   - Risk: None - just updating URL format
   
2. **Verify:** Test new component with old endpoints
   - Run `npm test`
   - Test via `/sales-invoice-refactored` route
   - Confirm same behavior as `/sales-invoice`

3. **Proceed:** Continue to Phase 7 (UAT)
   - Both components use same proven endpoints
   - Zero compatibility risk

---

## ✅ Sign-Off

- [ ] API endpoint compatibility verified
- [ ] Chosen compatibility strategy: **Option ___**
- [ ] Backend changes (if any) implemented
- [ ] Both components tested with endpoints
- [ ] No HTTP 404 errors
- [ ] Ready for Phase 7 (UAT)

**Backend Lead:** ________________  
**Date:** ________________  
**Status:** ✅ APPROVED / ❌ BLOCKED

---

## 📝 Implementation Notes

**If updating endpoints, document here:**

```
Changes made:
- [File] [Line] [Old] → [New]

Testing performed:
- [ ] Test 1: [RESULT]
- [ ] Test 2: [RESULT]

Issues found:
- [Issue] [Resolution]
```
