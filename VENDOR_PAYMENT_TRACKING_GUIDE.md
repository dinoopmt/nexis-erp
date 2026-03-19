# Vendor Payment Tracking System - Complete Guide

## Overview
This guide explains how to manage vendor payments in NEXIS-ERP, including advance payments, partial invoices, and payment reconciliation against purchase invoices.

---

## Core Concepts

### 1. **Payment Types**
Vendors configured in the system with two payment types:

| Payment Type | Description | Terms |
|---|---|---|
| **Credit** | Payment after receipt | Payment Terms (NET 30, NET 60, etc.) + Credit Days |
| **Cash** | Payment on receipt | No payment terms, immediate settlement |

### 2. **Payment Statuses**
Each payment transaction goes through these statuses:

```
PENDING → APPROVED → PAID → CANCELLED (optional)
```

| Status | Meaning |
|---|---|
| **PENDING** | Payment created, awaiting approval |
| **APPROVED** | Payment approved, ready to execute |
| **PAID** | Payment processed and completed |
| **CANCELLED** | Payment cancelled (reversible) |

### 3. **Invoice Payment Statuses**
Purchase invoices track payment progress:

```
Unpaid → Partial → Paid
```

| Status | Meaning |
|---|---|
| **Unpaid** | No payment received |
| **Partial** | Some amount paid, balance outstanding |
| **Paid** | Full amount received |

---

## System Architecture

### Database Models

#### 1. **Vendor Model** (`server/Models/CreateVendor.js`)
```javascript
{
  name: String,
  email: String,
  phone: String,
  address: String,
  city: String,
  country: String,
  
  // Payment Configuration
  paymentType: "Credit" | "Cash",      // ← Payment type
  paymentTerms: "NET 30" | "NET 60",   // ← Credit conditions
  creditDays: Number,                   // ← Payment delay allowed
  
  // Tax & GL Mapping
  accountPayableId: ObjectId,          // ← GL account reference
  dualRoleAccountId: ObjectId,         // ← If also a customer (Related Parties)
  
  // Flags
  isSupplier: Boolean,
  isShipper: Boolean,
  isCustomer: Boolean,                 // ← Can be both vendor AND customer
}
```

#### 2. **Payment Model** (`server/Models/Payment.js`)
```javascript
{
  paymentNumber: String,               // ← Voucher number
  paymentDate: Date,
  
  // Accounts
  payFromAccountId: ObjectId,         // ← Bank/Cash account
  payToAccountId: ObjectId,           // ← Vendor AP account
  
  // Amount
  amount: Number,
  
  // Method
  paymentMethod: "CASH" | "BANK_TRANSFER" | "CHEQUE",
  chequeNumber: String,               // ← If cheque payment
  chequeDate: Date,
  bankName: String,
  
  // Tracking
  referenceNumber: String,            // ← PO/Invoice number
  
  // Status
  status: "PENDING" | "APPROVED" | "PAID" | "CANCELLED",
  
  // Audit
  createdAt: Date,
  createdBy: String,
}
```

#### 3. **Purchase Invoice Model** (`server/Models/PurchaseInvoice.js`)
```javascript
{
  invoiceNumber: String,
  invoiceDate: Date,
  vendorId: ObjectId,
  
  // Amounts
  subtotal: Number,
  taxAmount: Number,
  totalAmount: Number,
  
  // Payment Tracking
  amountPaid: Number,                 // ← Total paid so far
  outstandingAmount: Number,          // ← Balance due
  paymentStatus: "Unpaid" | "Partial" | "Paid",
  
  // Payment History
  invoicePaymentAllocations: [        // ← Link to actual payments
    {
      paymentVoucherId: ObjectId,
      paymentDate: Date,
      allocatedAmount: Number,
      paymentMethod: String,
      status: "Pending" | "Received"
    }
  ],
}
```

#### 4. **Advance Payment Model** (Optional)
```javascript
{
  voucherId: String,
  vendorId: ObjectId,
  vendorName: String,
  
  // Amount Details
  advanceAmount: Number,              // ← Initial advance paid
  appliedAmount: Number,              // ← Amount used towards invoices
  balanceAmount: Number,              // ← Remaining balance
  
  // Tracking
  paymentMethod: String,
  paymentDate: Date,
  
  // Usage
  appliedToInvoices: [
    {
      invoiceId: ObjectId,
      invoiceNumber: String,
      appliedAmount: Number,
      appliedDate: Date
    }
  ],
  
  status: "Active" | "PartiallyUsed" | "FullyUsed" | "Reversed"
}
```

---

## Implementation: Payment Workflow

### Step 1: Create Vendor with Payment Terms

**In Vendors Form (UI: `client/src/components/inventory/Vendors.jsx`)**

```tsx
// Select vendor
<select>
  <option>Credit</option>
  <option>Cash</option>
</select>

// If Credit selected, set terms
<input placeholder="NET 30" />
<input placeholder="Credit Days: 30" />
```

**Backend stores:**
```javascript
vendor = {
  paymentType: "Credit",
  paymentTerms: "NET 30",
  creditDays: 30,
  accountPayableId: "2210" // AP GL Account
}
```

---

### Step 2: Record Purchase Invoice (GRN → Invoice)

**GRN Form** (`client/src/components/inventory/GrnForm.jsx`)
- Enter supplier, items, quantities
- System generates GRN document
- Mark as "Received"

**Triggers:** 
- Create GRN → Create corresponding Purchase Invoice
- Invoice status: **Unpaid**
- Outstanding amount = Total Invoice Amount

---

### Step 3: Make Advance Payment (Optional)

**VendorPayments Component** (`client/src/components/accounts/VendorPayments.jsx`)

#### Create Advance Payment:
```javascript
{
  paymentDate: "2026-03-17",
  payFromAccountId: "1010",      // Bank account
  payToAccountId: "2210",        // Vendor AP account
  amount: 10000,                 // Advance paid
  paymentMethod: "BANK_TRANSFER",
  referenceNumber: "ADV-VEN-001",
  description: "Advance against future supplies",
  status: "PENDING"              // Awaits approval
}
```

**Flow:**
1. Create → Status: PENDING
2. Approve → Status: APPROVED
3. Execute → Status: PAID
4. Create Advance record with balanceAmount: 10000

---

### Step 4: Apply Partial Payment Against Invoice

**Option A: Direct Payment**
```javascript
{
  paymentDate: "2026-03-18",
  payFromAccountId: "1010",      // Bank
  payToAccountId: "2210",        // Vendor AP
  amount: 5000,                  // Partial payment
  referenceNumber: "INV-001",    // Link to invoice
  status: "PENDING"
}
```

**Execution:**
1. Approve payment
2. Mark as PAID
3. Update Invoice:
   - amountPaid: 5000
   - outstandingAmount: (Total - 5000)
   - paymentStatus: "Partial"

---

### Step 5: Apply Advance Against Invoice

**Customer Receipts pattern adapted for Vendors:**

```javascript
// When paying invoice with advance available:
const applyAdvanceToInvoice = async (invoiceId, advanceId) => {
  const invoice = await PurchaseInvoice.findById(invoiceId);
  const advance = await AdvancePayment.findById(advanceId);
  
  // Calculate application amount
  const balanceOnInvoice = invoice.totalAmount - invoice.amountPaid;
  const applyAmount = Math.min(
    advance.balanceAmount,           // Available advance
    balanceOnInvoice                 // Invoice balance
  );
  
  // Create payment allocation record
  const allocation = {
    invoiceId,
    paymentType: "ADVANCE_APPLICATION",
    allocatedAmount: applyAmount,
    advanceId,
    appliedDate: new Date()
  };
  
  // Update invoice
  invoice.amountPaid += applyAmount;
  invoice.outstandingAmount = invoice.totalAmount - invoice.amountPaid;
  invoice.paymentStatus = 
    invoice.outstandingAmount === 0 ? "Paid" : "Partial";
  
  // Update advance
  advance.appliedAmount += applyAmount;
  advance.balanceAmount -= applyAmount;
  advance.status = 
    advance.balanceAmount === 0 ? "FullyUsed" : "PartiallyUsed";
  
  // Record allocation in advance history
  advance.appliedToInvoices.push({
    invoiceId,
    invoiceNumber: invoice.invoiceNumber,
    appliedAmount: applyAmount,
    appliedDate: new Date()
  });
  
  await invoice.save();
  await advance.save();
};
```

---

## UI Components

### 1. **VendorPayments Component** 
**Location:** `client/src/components/accounts/VendorPayments.jsx`

**Features:**
- ✅ Create new payments
- ✅ Approve/reject payments
- ✅ Mark as paid
- ✅ Track payment status
- ✅ Filter by status
- ✅ Search by reference

**Data shown:**
```
┌─ Payment Record
├─ Voucher Number (auto-generated)
├─ Date
├─ Pay From Account
├─ Pay To Account (Vendor AP)
├─ Amount
├─ Payment Method (Cash/Bank/Cheque)
├─ Reference Number (Invoice/PO)
├─ Status (PENDING→APPROVED→PAID)
└─ Actions (Edit, Approve, Pay, Cancel)
```

### 2. **Payment Approval Workflow**
```
User creates payment [PENDING]
           ↓
Manager approves [APPROVED]
           ↓
Accountant executes [PAID]
           ↓
System updates:
  - Payment status
  - Invoice amountPaid
  - Invoice outstandingAmount
  - GL entries (Debit AP, Credit Bank)
```

---

## Complete Workflow Example

### Scenario: Vendor XYZ Invoice Process

**Step 1: GRN Received**
```
GRN-001: 10 units @ 1000 each = 10,000
↓
Purchase Invoice created:
  Invoice: INV-001
  Total: 10,000
  Status: Unpaid
  Outstanding: 10,000
```

**Step 2: Advance Payment**
```
Payment 1: Advance 5,000 (PENDING)
↓
Manager Approves → APPROVED
↓
Accountant Pays → PAID
↓
Advance Record Created:
  Amount: 5,000
  Balance: 5,000
  Status: Active
```

**Step 3: Apply Advance to Invoice**
```
Invoice INV-001 is due:
  Total: 10,000
  Apply Advance: 5,000
  ↓
  amountPaid: 5,000
  outstandingAmount: 5,000
  paymentStatus: Partial
  ↓
  Advance Updated:
    appliedAmount: 5,000
    balanceAmount: 0
    status: FullyUsed
```

**Step 4: Partial Cash Payment**
```
Payment 2: Cash 2,500 (PENDING)
↓
Approve → APPROVED
↓
Pay → PAID
↓
Update Invoice:
  amountPaid: 7,500 (5,000 advance + 2,500 cash)
  outstandingAmount: 2,500
  paymentStatus: Partial
```

**Step 5: Final Settlement**
```
Payment 3: Check 2,500 (PENDING)
↓
Approve → APPROVED
↓
Pay → PAID
↓
Update Invoice:
  amountPaid: 10,000
  outstandingAmount: 0
  paymentStatus: Paid
  ✅ Invoice fully settled
```

---

## API Endpoints

### Payment Management
```bash
# Create payment
POST /api/v1/payments
{
  paymentDate, payFromAccountId, payToAccountId, 
  amount, paymentMethod, referenceNumber
}

# List payments
GET /api/v1/payments
GET /api/v1/payments?status=PENDING&vendor=VEN-001

# Update payment
PUT /api/v1/payments/{id}

# Change status
PATCH /api/v1/payments/{id}/status?action=approve|pay|cancel
```

### Invoice Payment Tracking
```bash
# Get vendor outstanding invoices
GET /api/v1/purchase-invoices/vendor/{vendorId}/outstanding

# Get invoice payment history
GET /api/v1/purchase-invoices/{invoiceId}/payment-history

# Apply advance to invoice
POST /api/v1/purchase-invoices/{invoiceId}/apply-advance
{
  advanceId, amount
}
```

---

## Best Practices

### 1. **Payment Approval Matrix**
- Small payments (< 5000): Supervisor approval
- Medium payments (5000-50000): Manager approval
- Large payments (> 50000): Director approval

### 2. **Advance Payment Management**
- Keep balance below 30% of annual spend
- Require justification for large advances
- Review quarterly usage
- Reverse unused advances

### 3. **Partial Invoice Handling**
- Never make overpayment
- Track balance carefully
- Apply advances in FIFO order
- Generate payment schedule for large invoices

### 4. **Reconciliation**
- Monthly: Compare GL AP account vs. outstanding invoices
- Quarterly: Reconcile advances vs. applied amounts
- Annually: Vendor statement reconciliation

---

## Error Handling

| Error | Cause | Solution |
|---|---|---|
| Payment > Outstanding Invoice | Overpayment attempted | Validate invoice balance |
| Advance Insufficient | Not enough advance balance | Request additional advance or cash |
| Duplicate Payment | Same invoice paid twice | Check payment history |
| Unapproved Payment | Trying to pay without approval | Complete approval workflow |

---

## Reporting

### 1. **Payment Status Report**
- Pending approvals
- Approved but not paid
- Recently paid
- Cancelled payments

### 2. **Invoice Aging Report**
- 0-30 days
- 30-60 days
- 60-90 days
- 90+ days (overdue)

### 3. **Vendor Reconciliation**
- Advances outstanding
- Used advances
- Invoice balances
- Total payable per vendor

---

## Configuration

### Vendor Setup (`Vendors.jsx`)
```javascript
newVendor = {
  paymentType: "Credit",        // Or "Cash"
  creditDays: 30,               // Number of days to pay
  paymentTerms: "NET 30",       // Payment terms
  accountPayableId: "AP_ACC",   // GL account
  isSupplier: true,
  isCustomer: false             // Can be true if dual-role
}
```

### System Settings
- Auto-approval threshold: 10,000
- Payment posting delay: Same day
- Advance expiry: 12 months
- Invoice aging buckets: 30/60/90 days

---

## FAQ

**Q: Can an advance be partially used?**
A: Yes. Advance stays active with remaining balance until fully used.

**Q: What if invoice amount changes after payment?**
A: Adjust outstanding amount, issue credit/debit memo.

**Q: Can we reverse a paid payment?**
A: Yes, through reversal journal entry in GL.

**Q: How to handle multi-currency payments?**
A: Track in original currency, convert at settlement date.

**Q: Can payment be split across invoices?**
A: Yes, system supports allocating single payment to multiple invoices.

---

## Summary

Payment tracking in NEXIS-ERP is designed to:
1. ✅ Manage vendor advance and partial payments
2. ✅ Track invoice-level payment status
3. ✅ Auto-reconcile GL accounts
4. ✅ Support flexible payment methods
5. ✅ Provide audit trail for compliance

Use the VendorPayments component for all vendor payment operations.
