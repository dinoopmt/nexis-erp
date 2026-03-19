# Vendor Payment Tracking - Quick Implementation Guide

## Quick Start: 5-Step Payment Process

### 1️⃣ CREATE VENDOR WITH PAYMENT TERMS
```javascript
// In Vendors.jsx form
const vendor = {
  name: "ABC Supplies",
  paymentType: "Credit",           // ← Choose: Credit or Cash
  paymentTerms: "NET 30",          // ← Only if Credit
  creditDays: 30,                  // ← Days allowed to pay
  isSupplier: true,
  accountPayableId: "2210"         // ← AP GL Account auto-assigned
}
```

---

## 2️⃣ RECORD GRN & CREATE INVOICE
```javascript
// GRN Flow
GRN-001 (received) →
{
  vendorId: "VEN-123",
  items: [10 units @ 1000 = 10,000],
  total: 10,000
}
    ↓
Auto-creates Purchase Invoice:
{
  invoiceNumber: "INV-001",
  vendorId: "VEN-123",
  totalAmount: 10,000,
  amountPaid: 0,
  outstandingAmount: 10,000,
  paymentStatus: "Unpaid"
}
```

---

## 3️⃣ MAKE ADVANCE PAYMENT (Optional)

### Create Payment Record
```javascript
// In VendorPayments.jsx
const payment = {
  paymentDate: "2026-03-17",
  payFromAccountId: "1010",          // Bank account
  payToAccountId: "2210",            // Vendor AP account
  amount: 5000,                      // Advance amount
  paymentMethod: "BANK_TRANSFER",
  referenceNumber: "ADV-001",
  description: "Advance against future supplies",
  status: "PENDING"                  // ← Initial status
}

// Submit
POST /api/v1/payments {payment}
↓
Response: { paymentId, paymentNumber: "PAY-001" }
```

### Workflow: Approve → Pay → Record Advance
```javascript
// Step 1: Manager approves
PATCH /api/v1/payments/PAY-001/status?action=approve
↓ Status: PENDING → APPROVED

// Step 2: Accountant marks as paid
PATCH /api/v1/payments/PAY-001/status?action=pay
↓ Status: APPROVED → PAID

// Step 3: System auto-creates Advance record
Advance {
  voucherId: "PAY-001",
  vendorId: "VEN-123",
  advanceAmount: 5000,
  appliedAmount: 0,
  balanceAmount: 5000,              // ← Available balance
  status: "Active"
}
```

---

## 4️⃣ APPLY ADVANCE TO INVOICE

### In Invoice Detail View
```javascript
// Get available advances for vendor
GET /api/v1/advances/vendor/VEN-123

// Response:
[
  {
    advanceId: "ADV-123",
    balanceAmount: 5000,
    appliedAmount: 0,
    appliedToInvoices: []
  }
]

// User clicks: "Apply Advance" on Invoice INV-001
```

### Apply Advance Engine
```javascript
const invoice = { totalAmount: 10000, amountPaid: 0 };
const advance = { balanceAmount: 5000 };

// Calculate application
const invoiceBalance = 10000 - 0;        // = 10000
const applyAmount = Math.min(5000, 10000); // = 5000

// Apply
invoice.amountPaid = 5000;               // 0 + 5000
invoice.outstandingAmount = 5000;        // 10000 - 5000
invoice.paymentStatus = "Partial";

advance.appliedAmount = 5000;            // 0 + 5000
advance.balanceAmount = 0;               // 5000 - 5000
advance.status = "FullyUsed";

// Update DB
PUT /api/v1/purchase-invoices/INV-001 {
  amountPaid: 5000,
  outstandingAmount: 5000,
  paymentStatus: "Partial"
}

PUT /api/v1/advances/ADV-123 {
  appliedAmount: 5000,
  balanceAmount: 0,
  status: "FullyUsed",
  appliedToInvoices: [
    {
      invoiceId: "INV-001",
      invoiceNumber: "INV-001",
      appliedAmount: 5000,
      appliedDate: new Date()
    }
  ]
}

// Invoice after advance applied:
{
  invoiceNumber: "INV-001",
  totalAmount: 10,000,
  amountPaid: 5,000,          // ← From advance
  outstandingAmount: 5,000,
  paymentStatus: "Partial"
}
```

---

## 5️⃣ MAKE PARTIAL CASH PAYMENT

### Create Additional Payment
```javascript
const payment = {
  paymentDate: "2026-03-18",
  payFromAccountId: "1010",
  payToAccountId: "2210",
  amount: 2500,                 // Partial payment
  paymentMethod: "CASH",
  referenceNumber: "INV-001",   // Link to invoice
  status: "PENDING"
}

// Submit
POST /api/v1/payments {payment}
↓
Response: { paymentId, paymentNumber: "PAY-002" }
```

### Approve & Execute
```javascript
// Approve
PATCH /api/v1/payments/PAY-002/status?action=approve
↓ APPROVED

// Pay
PATCH /api/v1/payments/PAY-002/status?action=pay
↓ PAID

// Invoice auto-updates:
{
  amountPaid: 7500,            // Previous 5000 + Current 2500
  outstandingAmount: 2500,     // 10000 - 7500
  paymentStatus: "Partial"
}
```

---

## Complete Example: Full Settlement

### Timeline
```
Day 1: GRN-001 received (10,000)
       Purchase Invoice created
       ├─ Status: Unpaid
       ├─ Outstanding: 10,000

Day 2: Advance payment made (5,000)
       Payment PAY-001 created → Approved → Paid
       ├─ Status: Pending → Approved → Paid
       └─ Advance record: Balance 5,000

Day 3: Apply advance to INV-001
       ├─ Invoice amountPaid: 5,000
       ├─ Invoice outstandingAmount: 5,000
       ├─ Invoice paymentStatus: Partial
       └─ Advance balanceAmount: 0 (used)

Day 4: Cash payment (2,500)
       Payment PAY-002 created → Approved → Paid
       ├─ Invoice amountPaid: 7,500
       ├─ Invoice outstandingAmount: 2,500
       └─ Invoice paymentStatus: Partial

Day 5: Check payment (2,500) - Final settlement
       Payment PAY-003 created → Approved → Paid
       ├─ Invoice amountPaid: 10,000
       ├─ Invoice outstandingAmount: 0
       ├─ Invoice paymentStatus: Paid ✅
       └─ FULLY SETTLED
```

---

## Data in VendorPayments Component

### Payment List Display

| Column | Shows |
|---|---|
| Voucher No | PAY-001, PAY-002 |
| Date | Payment date |
| Pay From | Bank/Cash account name |
| Pay To | Vendor AP account |
| Method | CASH, BANK_TRANSFER, CHEQUE |
| Amount | Payment amount |
| Status | PENDING, APPROVED, PAID |
| Actions | Edit, Approve, Pay, Cancel |

### Status Flow with Actions

```
┌─────────────┐
│   PENDING   │ (Initial)
└──────┬──────┘
       │ [Approve button]
       ↓
┌─────────────┐
│  APPROVED   │ (Review done)
└──────┬──────┘
       │ [Pay button]
       ↓
┌─────────────┐
│    PAID     │ ✅ (Settled)
└─────────────┘
       
Any → [Cancel] → CANCELLED ⛔
```

---

## Backend API Endpoints Reference

### Payment Endpoints
```bash
# Create
POST /api/v1/payments
Body: { paymentDate, payFromAccountId, payToAccountId, amount, ... }

# List
GET /api/v1/payments
GET /api/v1/payments?status=PENDING
GET /api/v1/payments?vendor=VEN-123

# Get one
GET /api/v1/payments/{paymentId}

# Update
PUT /api/v1/payments/{paymentId}

# Status change
PATCH /api/v1/payments/{paymentId}/status?action=approve
PATCH /api/v1/payments/{paymentId}/status?action=pay
PATCH /api/v1/payments/{paymentId}/status?action=cancel

# Delete
DELETE /api/v1/payments/{paymentId}
```

### Invoice Endpoints
```bash
# Get vendor's unpaid invoices
GET /api/v1/purchase-invoices/vendor/{vendorId}/outstanding

# Get one invoice
GET /api/v1/purchase-invoices/{invoiceId}

# Update payment info
PUT /api/v1/purchase-invoices/{invoiceId}
Body: { amountPaid, outstandingAmount, paymentStatus }

# Get payment history
GET /api/v1/purchase-invoices/{invoiceId}/payment-history
```

### Advance Endpoints
```bash
# Get advances for vendor
GET /api/v1/advances/vendor/{vendorId}

# Apply advance to invoice
POST /api/v1/advances/{advanceId}/apply-to-invoice
Body: { invoiceId, amount }

# Get advance details
GET /api/v1/advances/{advanceId}
```

---

## Form Fields in VendorPayments

### Basic Payment Form
```
Payment Date            [date picker]
Pay From Account        [dropdown: Bank/Cash accounts]
Pay To Account          [dropdown: Vendor AP account]
Amount                  [number input]
Payment Method          [Cash / Bank Transfer / Cheque]
Reference Number        [text: Invoice/PO number]
Description             [textarea]
```

### Conditional Fields
```
If Payment Method = CHEQUE:
  ├─ Cheque Number      [text input]
  ├─ Cheque Date        [date picker]
  └─ Bank Name          [text input]

If Payment Method = BANK_TRANSFER:
  └─ Bank Name          [text input]
```

---

## Common Scenarios

### Scenario 1: Full Advance Payment
```
Vendor ABC supplies in batches
Want to pay 10,000 upfront for future delivery

1. Create Advance Payment: 10,000
2. Apply batches:
   - GRN-001: 2,000 → Apply 2,000 advance
   - GRN-002: 3,000 → Apply 3,000 advance
   - GRN-003: 5,000 → Apply 5,000 advance
3. Balance: 0 (fully used)
```

### Scenario 2: Partial Invoice Settlement
```
Invoice INV-001: 15,000
Available advance: 5,000
Want to settle today

1. Apply advance: 5,000 → Outstanding: 10,000
2. Pay cash: 5,000 → Outstanding: 5,000
3. Pay cheque: 5,000 → Outstanding: 0 ✅
```

### Scenario 3: Multiple Partial Payments
```
Invoice INV-001: 10,000

Week 1: Payment 25% (2,500 cash)    → Outstanding: 7,500
Week 2: Payment 25% (2,500 cheque)  → Outstanding: 5,000
Week 3: Payment 50% (5,000 advance) → Outstanding: 0 ✅
```

---

## Validation Rules

✅ **DO:**
- ✅ Create payment before approving
- ✅ Approve before marking paid
- ✅ Link payment to invoice/PO
- ✅ Keep advance balance positive
- ✅ Apply advance before additional payment

❌ **DON'T:**
- ❌ Pay without approval
- ❌ Pay more than outstanding
- ❌ Apply advance > invoice balance
- ❌ Create duplicate payments
- ❌ Overpay invoices

---

## Key Differences: Advance vs Direct Payment

| Aspect | Advance | Direct Payment |
|---|---|---|
| **When** | Before invoice | Against invoice |
| **Status** | Active → PartiallyUsed → FullyUsed | PENDING → APPROVED → PAID |
| **Balance** | Tracks unused | N/A |
| **Application** | Manual to invoice | Automatic update |
| **Reusable** | Yes (multiple invoices) | No (single invoice) |
| **Duration** | May stay for months | Immediate settlement |

---

## Troubleshooting

### "Cannot apply advance - amount exceeds balance"
- Check advance balanceAmount
- Reduce application amount
- Request additional advance if needed

### "Invoice shows Partial but should be Paid"
- Verify all payments are marked PAID status
- Sum all allocations = invoice total?
- Check for credit memos/adjustments

### "Advance shows Active but used"
- Apply advance to all outstanding invoices
- Mark manually as FullyUsed
- Or reverse unused portion

### "Payment won't approve"
- Check user has approval permission
- Verify payment is in PENDING status
- Check for GL account errors

---

## Summary

**Vendor Payment Tracking allows:**
1. ✅ Create advance payments before invoices
2. ✅ Apply advances to multiple invoices
3. ✅ Make partial cash/check payments
4. ✅ Track invoice settlement status
5. ✅ Generate payment schedules
6. ✅ Reconcile GL accounts

**Use VendorPayments Component for all operations.**

Need help? See: `VENDOR_PAYMENT_TRACKING_GUIDE.md` for detailed explanation.
