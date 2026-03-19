# GRN Double-Entry Accounting Implementation

## Overview

This document describes the complete implementation of double-entry accounting for GRN (Goods Receipt Note) posting. When a GRN is posted, the system automatically creates double-entry journal vouchers to record the goods receipt and vendor obligations.

---

## 1. Business Logic

### Double-Entry Concept

Every GRN posting creates journal entries following the fundamental accounting equation:
- **Debit = Credit** (balanced entry)
- **Debit:** Inventory/Stock Account (Assets increase)
- **Credit:** Accounts Payable Account (Liabilities increase)

### Journal Structure for GRN Receipt

```
ENTRY 1: GOODS RECEIPT (Items)
┌─────────────────────────────────────────┐
│ Debit:  Trading Goods (140400)  │ AED X  │
│ Credit: Accounts Payable        │ AED X  │
│         (Vendor Account)                │
└─────────────────────────────────────────┘
Description: GRN #GRN-001 - Items from Vendor

ENTRY 2: SHIPPING COST (If Applicable)
┌─────────────────────────────────────────┐
│ Debit:  Freight Inward (510400) │ AED Y  │
│ Credit: Accounts Payable        │ AED Y  │
│         (Vendor Account)                │
└─────────────────────────────────────────┘
Description: GRN #GRN-001 - Shipping cost
```

### Account Mappings

**Inventory Accounts (Debit):**
- 140100: Raw Materials
- 140200: Work in Progress
- 140300: Finished Goods
- 140400: Trading Goods (Default for GRN)
- 140500: Consumables & Supplies

**Payable Accounts (Credit):**
- 2210: Sundry Creditors (Vendors only)
- 2250: Related Parties - Payable (Vendors who are also customers)
- 220100: Accounts Payable (General)

**Shipping/Freight Accounts (Debit):**
- 510400: Freight Inward

---

## 2. Implementation Components

### A. GRNJournalService (`server/modules/accounting/services/GRNJournalService.js`)

**Class Methods:**

#### 1. `generateVoucherNumber(voucherType)`
- Generates unique voucher numbers (JV-00001, JV-00002, etc.)
- Vouchertype: "JV" for Journal Voucher

#### 2. `getInventoryAccount()`
- Returns the Trading Goods account (140400) ObjectId
- Used as default debit account for GRN items

#### 3. `getVendorPayableAccount(vendorId)`
- Retrieves vendor's payable account from vendor.accountPayableId
- Ensures vendor is linked to correct GL account

#### 4. `getFinancialYear(grnDate)`
- Finds the financial year containing the GRN date
- Required for journal entry posting

#### 5. `createGrnJournalEntry(grnData)`
```javascript
// Creates main journal entry for goods received
// Input:
{
  grnNumber: "GRN-001",
  grnDate: "2024-03-18",
  vendorId: "vendor_ObjectId",
  vendorName: "ABC Supplies",
  netTotal: 5000.00,           // Amount for items
  shippingCost: 0,             // Separate entry if > 0
  totalQty: 100,
  createdBy: "username"
}

// Returns: { voucherNumber, status, totalAmount, lineItems }
```

#### 6. `createShippingJournalEntry(grnData, shippingCost)`
```javascript
// Creates separate entry for shipping costs
// Uses Freight Inward (510400) as debit account
// Returns: { voucherNumber, status, totalAmount }
```

#### 7. `postJournalEntry(journalEntryId, userId)`
- Changes journal status from DRAFT to POSTED
- Updates posting date and user

---

### B. Updated GRN Controller (`server/modules/inventory/controllers/grnController.js`)

**New Imports:**
```javascript
import GRNJournalService from "../../accounting/services/GRNJournalService.js";
```

**Function Updates:**

#### 1. `updateGrn()` - Auto-Post Trigger
- Detects status change from non-Received to "Received"
- Automatically calls `GRNJournalService.createGrnJournalEntry()`
- Non-blocking: If journal creation fails, GRN update still succeeds

```javascript
// When status changes to "Received"
if (oldStatus !== "Received" && status === "Received") {
  journalEntry = await GRNJournalService.createGrnJournalEntry({...});
}
```

#### 2. `postGrn()` - NEW ENDPOINT
- **Route:** `POST /api/v1/grn/:id/post`
- Explicit GRN posting with accounting entries
- Creates both items and shipping journal entries
- Updates GRN status to "Posted"
- Returns created journal voucher details

**Request Body:**
```javascript
{
  "createdBy": "username"
}
```

**Response:**
```javascript
{
  "message": "GRN posted successfully with accounting entries",
  "grn": {
    "grnNumber": "GRN-001",
    "status": "Posted",
    "netTotal": 5000,
    "shippingCost": 200
  },
  "journals": {
    "items": {
      "voucherNumber": "JV-00001",
      "status": "DRAFT",
      "totalAmount": 5000,
      "lineItems": [...]
    },
    "shipping": {
      "voucherNumber": "JV-00002",
      "status": "DRAFT",
      "totalAmount": 200
    }
  }
}
```

---

### C. GRN Routes (`server/modules/inventory/routes/grnRoutes.js`)

**New Route:**
```javascript
/**
 * @route   POST /api/v1/grn/:id/post
 * @desc    Post GRN and create double-entry accounting journals
 * @access  Public
 * @body    { "createdBy": "username" }
 */
router.post("/:id/post", postGrn);
```

---

## 3. GRN Status Workflow

```
┌──────────────┐
│    DRAFT     │  ← GRN Created
└──────┬───────┘
       │ Update status to "Received"
       ↓
┌──────────────────────────┐
│    RECEIVED (AUTO-POST)  │  ← Journal entries auto-created
└──────┬───────────────────┘
       │ OR Explicit post via /post endpoint
       ↓
┌──────────────────────────┐
│     POSTED               │  ← Accounting entries finalized
│  (Journal Status: DRAFT) │     (Ready for approval)
└──────────────────────────┘
       │ (Optional) Approve/Post journals
       ↓
┌──────────────────────────────┐
│  POSTED + JOURNAL APPROVED   │
│ (Journal Status: POSTED)     │
└──────────────────────────────┘
```

---

## 4. Amount Calculations

### For Items Entry (netTotal)
```
netTotal = (Subtotal - Discount) + Tax (if exclusive)
         Or (Subtotal - Discount) if inclusive

This amount is debited to Trading Goods (140400)
and credited to Vendor Payable account
```

### For Shipping Entry (if shippingCost > 0)
```
Separate entry created:
Debit:  Freight Inward (510400)  = shippingCost
Credit: Payable Account          = shippingCost
```

### Total GRN Commitment
```
Total Payable = netTotal + shippingCost
```

---

## 5. Usage Examples

### Example 1: Auto-Posting via Status Update

**Request:**
```bash
PUT /api/v1/grn/123456
{
  "grnNumber": "GRN-001",
  "grnDate": "2024-03-18",
  "vendorId": "vendor_id_123",
  "status": "Received",
  "netTotal": 5000,
  "shippingCost": 200,
  "totalQty": 100,
  "createdBy": "user123",
  ...
}
```

**Response:**
```json
{
  "message": "GRN updated successfully",
  "grn": { "grnNumber": "GRN-001", "status": "Received" },
  "journalEntry": {
    "voucherNumber": "JV-00001",
    "status": "DRAFT",
    "totalAmount": 5000,
    "lineItems": [...]
  }
}
```

### Example 2: Explicit GRN Posting

**Request:**
```bash
POST /api/v1/grn/123456/post
{
  "createdBy": "user123"
}
```

**Response:**
```json
{
  "message": "GRN posted successfully with accounting entries",
  "grn": {
    "grnNumber": "GRN-001",
    "status": "Posted",
    "netTotal": 5000,
    "shippingCost": 200
  },
  "journals": {
    "items": {
      "voucherNumber": "JV-00001",
      "status": "DRAFT",
      "totalAmount": 5000
    },
    "shipping": {
      "voucherNumber": "JV-00002",
      "status": "DRAFT",
      "totalAmount": 200
    }
  }
}
```

---

## 6. Data Flow Diagram

```
GRN CREATION
    ↓
[GrnForm.jsx] → POST /api/v1/grn
    ↓
[grnController.createGrn()]
    ├─ Saves GRN document (status: "Draft")
    ├─ Creates VendorPaymentService entries (payment tracking)
    └─ Returns GRN details
    
    
GRN POSTING (Auto or Manual)
    ↓
METHOD 1: Auto-trigger on status change
  PUT /api/v1/grn/:id (status: "Received")
    ↓
  [grnController.updateGrn()]
  └─ Detects status change
     ↓
METHOD 2: Explicit posting
  POST /api/v1/grn/:id/post
    ↓
  [grnController.postGrn()]
    ↓
[GRNJournalService.createGrnJournalEntry()]
    ├─ Gets Inventory Account (140400)
    ├─ Gets Vendor Payable Account
    ├─ Gets Financial Year
    ├─ Creates debit/credit line items
    ├─ Generates Voucher Number
    └─ Saves JournalEntry (status: "DRAFT")
        ↓
        Optional: [GRNJournalService.createShippingJournalEntry()]
        └─ If shipping > 0: Creates separate entry
    ↓
Returns journal details with voucher numbers
```

---

## 7. Accounting Entries - Detailed Example

**GRN Details:**
- GRN Number: GRN-2024-001
- Vendor: ABC Supplies Ltd
- Items:
  - 100 units @ AED 40 = 4,000
  - Discount: 10% = -400
  - Subtotal: 3,600
  - Tax (5%, exclusive): 180
  - **Net Total: 3,780**
- Shipping: 220

**Journal Entry 1: Items**
```
┌─────────────────────────────────────────┐
│ Voucher: JV-00001                       │
│ Date: 18-Mar-2024                       │
│ Description: GRN Receipt - GRN-2024-001 │
│ Financial Year: 2024-2025               │
├─────────────────────────────────────────┤
│ Line Items:                             │
│                                         │
│ Account         │ Debit    │ Credit     │
│ ────────────────┼──────────┼────────────│
│ 140400:Trading  │ 3780.00  │            │
│ 2210:Payable    │          │ 3780.00    │
│                                         │
│ Total Debit:  3780.00                   │
│ Total Credit: 3780.00                   │
│ Status: DRAFT                           │
└─────────────────────────────────────────┘
```

**Journal Entry 2: Shipping**
```
┌─────────────────────────────────────────┐
│ Voucher: JV-00002                       │
│ Date: 18-Mar-2024                       │
│ Description: GRN Shipping - GRN-2024-001│
│ Reference: GRN-2024-001-SHIP            │
├─────────────────────────────────────────┤
│ Line Items:                             │
│                                         │
│ Account         │ Debit    │ Credit     │
│ ────────────────┼──────────┼────────────│
│ 510400:Freight  │ 220.00   │            │
│ 2210:Payable    │          │ 220.00     │
│                                         │
│ Total Debit:  220.00                    │
│ Total Credit: 220.00                    │
│ Status: DRAFT                           │
└─────────────────────────────────────────┘
```

**GL Impact:**
```
Trading Goods (140400):     +3,780 (Debit)
Freight Inward (510400):    +220   (Debit)
Accounts Payable (2210):    -4,000 (Credit)

Total Assets increase:      4,000
Total Liabilities increase: 4,000
(Balanced!)
```

---

## 8. Error Handling

### Missing Inventory Account
```
❌ Trading Goods account (140400) not found
→ Journal creation fails safely
→ GRN posting continues (non-blocking)
```

### Missing Vendor Payable Account
```
❌ Vendor ABC has no payable account linked
→ Journal creation fails safely
→ User prompted to link vendor to GL account
```

### Missing Financial Year
```
❌ No active financial year found for date 2024-03-18
→ Journal creation fails
→ Error returned to user
```

### Duplicate Posting Prevention
```
GRN Status = "Posted" already
→ postGrn() endpoint returns 400 error
→ Prevents duplicate journal entries
```

---

## 9. Integration Points

### 1. GRN Frontend (GrnForm.jsx)
- Existing form unchanged
- Status dropdown can change to "Received" to trigger auto-posting
- OR user clicks "Post & Create Journals" button to explicitly call `/post` endpoint

### 2. Vendor Management (CreateVendor.js)
- `accountPayableId` field must be populated
- GL account is set during vendor creation/update
- Links vendor to correct payable account

### 3. Chart of Accounts (ChartOfAccounts.js)
- Inventory accounts must exist (140400 minimum)
- Payable accounts must exist (2210 or 2250)
- Freight account must exist (510400 for shipping)

### 4. Financial Year (FinancialYear.js)
- Must have active financial year for GRN date
- Used for journal entry categorization

---

## 10. Configuration

### Required Setup (One-time)

**1. Ensure COA Exists:**
```
✓ 140400 - Trading Goods (Asset > Inventory)
✓ 2210 - Sundry Creditors (Liability > Payables)
✓ 510400 - Freight Inward (Expense > Direct Expenses)
```

**2. Link Vendors to GL Accounts:**
```
Vendors must have accountPayableId set to a LIABILITY account
(Usually 2210 or 2250)
```

**3. Create Financial Year:**
```
Start Date: First day of FY
End Date: Last day of FY
Active: Yes
```

---

## 11. Testing Checklist

- [ ] Create GRN with items and shipping
- [ ] Change GRN status to "Received" → Verify journals auto-created
- [ ] Call POST /api/v1/grn/:id/post → Verify explicit posting works
- [ ] Check Journal Entry created with correct debit/credit
- [ ] Verify Debit = Credit (balanced)
- [ ] Confirm voucher numbers are unique and sequential
- [ ] Test without shipping cost (Entry 1 only)
- [ ] Test with shipping cost (Entry 1 + Entry 2)
- [ ] Attempt to post already-posted GRN → Should fail
- [ ] Verify GL accounts exist and are correct
- [ ] Check financial year is correctly assigned

---

## 12. Future Enhancements

1. **Approval Workflow:** Journal entries in DRAFT status, require approval before posting
2. **Reverse Entries:** Create reversal entry if GRN is cancelled
3. **Tax Handling:** Separate tax entries when applicable (HSN-based tax)
4. **Multi-Currency:** Handle FX entries for foreign vendor purchases
5. **Journal Templates:** User-defined account mapping per vendor
6. **Batch Posting:** Post multiple GRNs with single command
7. **Reconciliation:** Auto-reconcile GRN with invoice journals

---

## 13. Technical References

**File Locations:**
- Service: `d:\NEXIS-ERP\server\modules\accounting\services\GRNJournalService.js`
- Controller: `d:\NEXIS-ERP\server\modules\inventory\controllers\grnController.js`
- Routes: `d:\NEXIS-ERP\server\modules\inventory\routes\grnRoutes.js`
- Models: `d:\NEXIS-ERP\server\Models\JournalEntry.js`, `ChartOfAccounts.js`

**API Endpoints:**
- Create GRN: `POST /api/v1/grn`
- Update GRN: `PUT /api/v1/grn/:id`
- Post GRN: `POST /api/v1/grn/:id/post` ← NEW
- Get GRN: `GET /api/v1/grn/:id`

---

## 14. Support

For issues or questions:
1. Check journal entries created in `journal_entries` collection
2. Verify GL accounts in `chart_of_accounts` collection
3. Check GRN status in `grn` collection
4. Review console logs for "GRNJournalService" entries
5. Verify financial year is active and covers GRN date
