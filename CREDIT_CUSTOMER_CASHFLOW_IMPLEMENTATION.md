# Credit Customer Cashflow Tracking System - Complete Implementation

## Overview
This document describes the complete implementation of credit customer cashflow tracking system for managing customer receivables, partial payments, advance receipts, and invoice reconciliation.

---

## System Architecture

### Components Created

#### 1. **CreditCustomerCashflow Model** 
- **File**: `server/Models/Sales/CreditCustomerCashflow.js`
- **Collection**: `credit_customer_cashflows`
- **Purpose**: Central record for tracking customer credit transactions

**Key Fields**:
- `customerId`, `customerCode`, `customerName` - Customer identification
- `invoiceNumber`, `salesId`, `invoiceDate` - Related invoice info
- `dueDate` - Payment deadline
- `transactions[]` - Array of all debit/credit entries
- `totalInvoiced` - Sum of all invoices
- `totalReceived` - Sum of all payments received
- `currentBalance` - Outstanding amount
- `totalAdvanceReceived` / `totalAdvanceApplied` - Advance tracking
- `status` - 'Active', 'Settled', 'PartiallyPaid', 'Overdue'

---

## Process Flow

### Step 1: Invoice Creation
When a **credit customer** creates an **invoice with Credit payment type**:

```javascript
// Automatically triggered in salesInvoiceController.js
if (paymentType === "Credit" && paymentTerms === "Credit" && customerId) {
  // 1. Create/Update CreditCustomerCashflow entry
  // 2. Add "Invoice" transaction to cashflow
  // 3. Set initial balance = invoice amount
}
```

**What Happens**:
- Invoice is marked as "Unpaid"
- CreditCustomerCashflow entry created with:
  - `drAmount`: Invoice total
  - `crAmount`: 0
  - `balance`: Invoice amount (outstanding)
  - `status`: 'Active'
- Entry is recorded in transactions array

**Example**:
```json
{
  "invoiceNumber": "SI/2025-26/0001",
  "customerId": "64abc123...",
  "totalInvoiced": 10000,
  "currentBalance": 10000,
  "transactions": [
    {
      "transactionType": "Invoice",
      "drAmount": 10000,
      "crAmount": 0,
      "balance": 10000,
      "reference": "SI/2025-26/0001"
    }
  ]
}
```

---

### Step 2: Full Payment Receipt
When customer makes **full payment**:

```javascript
// POST /api/v1/customer-receipts/addcustomer-receipt
// receiptType: "Against Invoice"
// amountPaid: 10000
```

**What Happens**:
1. **CustomerReceipt** created tracking the payment
2. **Invoice** `paymentStatus` updated to 'Paid'
3. **CreditCustomerCashflow** updated:
   - `totalReceived` += amountPaid
   - `currentBalance` -= amountPaid (becomes 0)
   - New transaction: `{ transactionType: "Payment", crAmount: 10000 }`
   - `status` → 'Settled'

**Cashflow After Payment**:
```json
{
  "totalInvoiced": 10000,
  "totalReceived": 10000,
  "currentBalance": 0,
  "status": "Settled",
  "transactions": [
    { "transactionType": "Invoice", "balance": 10000 },
    { "transactionType": "Payment", "balance": 0 }
  ]
}
```

---

### Step 3: Partial Payment Receipt
When customer makes **partial payment** (e.g., 5000 of 10000):

```javascript
// receiptType: "Against Invoice"
// amountPaid: 5000
```

**What Happens**:
1. **CustomerReceipt** created with:
   - `invoiceAmount`: 10000
   - `receiptAmount`: 5000
   - `balanceAmount`: 5000
2. **Invoice** `paymentStatus` → 'Partial'
3. **CreditCustomerCashflow**:
   - `totalReceived` += 5000
   - `currentBalance` -= 5000 (now 5000)
   - New transaction: `{ transactionType: "Payment", crAmount: 5000, balance: 5000 }`
   - `status` → 'PartiallyPaid'

**Cashflow After Partial Payment**:
```json
{
  "totalInvoiced": 10000,
  "totalReceived": 5000,
  "currentBalance": 5000,
  "status": "PartiallyPaid",
  "transactions": [
    { "transactionType": "Invoice", "balance": 10000 },
    { "transactionType": "Payment", "balance": 5000 }
  ]
}
```

**Further Partial Payments**:
- Can repeat until balance becomes 0
- Each payment reduces `currentBalance`
- When `currentBalance` = 0, status changes to 'Settled'

---

### Step 4: Advance Receipt
When customer gives **advance payment** (e.g., 3000 advance):

```javascript
// receiptType: "Advance"
// amountPaid: 3000
```

**What Happens**:
1. **CustomerReceipt** created with:
   - `receiptType`: 'Advance'
   - `status`: 'Advance'
   - `balanceAmount`: 3000 (full amount available)
2. **CreditCustomerCashflow**:
   - New entry created (if not exists for customer)
   - `totalAdvanceReceived` += 3000
   - `currentBalance` = -3000 (negative = advance balance)
   - New transaction: `{ transactionType: "AdvanceReceived", crAmount: 3000, balance: -3000 }`

**Cashflow After Advance**:
```json
{
  "totalAdvanceReceived": 3000,
  "currentBalance": -3000,
  "transactions": [
    { "transactionType": "AdvanceReceived", "balance": -3000 }
  ]
}
```

---

### Step 5: Applying Advance to Invoice

#### Scenario: Invoice created AFTER advance received

When invoice (10000) is created after advance (3000):

```json
{
  "totalInvoiced": 10000,
  "totalReceived": 0,
  "totalAdvanceReceived": 3000,
  "totalAdvanceApplied": 0,
  "currentBalance": 7000,  // 10000 - 3000
  "transactions": [
    { "transactionType": "AdvanceReceived", "balance": -3000 },
    { "transactionType": "Invoice", "balance": 10000 },
    { "transactionType": "AdvanceApplied", "balance": 7000 }
  ]
}
```

#### Scenario: Advance applied to existing invoice

When advance is applied to an invoice:

```javascript
// POST /api/v1/credit-customer-cashflows/applyAdvanceToInvoice/:cashflowId
// Body: { advanceToApply: 3000 }
```

**What Happens**:
- `totalAdvanceApplied` += 3000
- `currentBalance` += 3000 (reduces outstanding)
- New transaction: `{ transactionType: "AdvanceApplied", crAmount: 3000 }`
- If advance fully covers invoice: status → 'Settled'

**Cashflow After Advance Application**:
```json
{
  "totalInvoiced": 10000,
  "totalAdvanceReceived": 3000,
  "totalAdvanceApplied": 3000,
  "currentBalance": 7000,
  "status": "PartiallyPaid"
}
```

---

## API Endpoints

### 1. Get All Cashflows
```
GET /api/v1/credit-customer-cashflows/getCreditCustomerCashflows
Query Params:
  - customerId: filter by customer
  - financialYear: filter by FY
  - status: filter by status (Active, Settled, PartiallyPaid, Overdue)
  - sortBy: sort field (default: dueDate)
```

**Response**:
```json
[
  {
    "_id": "...",
    "customerId": "...",
    "customerName": "ABC Corp",
    "invoiceNumber": "SI/2025-26/0001",
    "totalInvoiced": 10000,
    "totalReceived": 5000,
    "currentBalance": 5000,
    "status": "PartiallyPaid",
    "dueDate": "2026-06-15"
  }
]
```

### 2. Get Cashflow by ID
```
GET /api/v1/credit-customer-cashflows/getCreditCustomerCashflowById/:id
```

Returns full cashflow entry with complete transaction history.

### 3. Get Customer Cashflow for Year
```
GET /api/v1/credit-customer-cashflows/getCashflowByCustomerAndYear/:customerId/:financialYear
```

### 4. Record Payment
```
POST /api/v1/credit-customer-cashflows/recordReceiptPayment/:cashflowId
Body:
{
  "receiptNumber": "RCP001",
  "receiptId": "...",
  "amountPaid": 5000,
  "paymentMode": "Bank",
  "narration": "Payment received"
}
```

**Response**: Updated cashflow with new balance

### 5. Record Partial Payment
```
POST /api/v1/credit-customer-cashflows/recordPartialReceiptAllocation/:cashflowId
Body:
{
  "receiptNumber": "RCP002",
  "invoiceAmount": 10000,
  "allocatedAmount": 3000,
  "paymentMode": "Cash"
}
```

### 6. Record Advance Receipt
```
POST /api/v1/credit-customer-cashflows/recordAdvanceReceipt
Body:
{
  "customerId": "...",
  "receiptNumber": "RCP003",
  "advanceAmount": 2000,
  "paymentMode": "Bank",
  "financialYear": "2025-26"
}
```

### 7. Apply Advance to Invoice
```
POST /api/v1/credit-customer-cashflows/applyAdvanceToInvoice/:cashflowId
Body:
{
  "advanceToApply": 1500
}
```

### 8. Get Customer Aging Report
```
GET /api/v1/credit-customer-cashflows/getCustomerAgingReport
Query Params:
  - customerId: (optional)
  - financialYear: (optional)
```

**Response**:
```json
{
  "totalOutstanding": 50000,
  "agingBuckets": [
    {
      "bucket": "Current",
      "count": 5,
      "totalOutstanding": 25000,
      "customers": [...]
    },
    {
      "bucket": "31-60 Days",
      "count": 3,
      "totalOutstanding": 15000
    },
    {
      "bucket": "Over 90 Days",
      "count": 2,
      "totalOutstanding": 10000
    }
  ]
}
```

### 9. Record Invoice Reversal
```
POST /api/v1/credit-customer-cashflows/recordInvoiceReversal/:cashflowId
Body:
{
  "reversalReason": "Invoice cancelled",
  "narration": "Customer requested cancellation"
}
```

### 10. Get Transaction History
```
GET /api/v1/credit-customer-cashflows/getTransactionHistory/:cashflowId
```

Returns detailed transaction log for the cashflow entry.

---

## Usage Examples

### Example 1: Full Purchase-to-Payment Cycle

**1. Create Invoice**
```javascript
POST /api/v1/sales-invoices/createSalesInvoice
{
  "customerId": "64abc123...",
  "invoiceNumber": "SI/2025-26/0001",
  "date": "2026-04-15",
  "paymentType": "Credit",
  "paymentTerms": "NET 30",
  "items": [...],
  "totalIncludeVat": 10000,
  "financialYear": "2025-26"
}
```

**Result**: 
- Cashflow created with balance 10000

**2. Customer Pays Full Amount**
```javascript
POST /api/v1/customer-receipts/addcustomer-receipt
{
  "customerId": "64abc123...",
  "invoiceId": "...",
  "receiptType": "Against Invoice",
  "amountPaid": 10000,
  "paymentMode": "Bank",
  "receiptDate": "2026-04-20",
  "financialYear": "2025-26"
}
```

**Result**:
- Cashflow balance becomes 0
- Status changes to 'Settled'
- Invoice marked 'Paid'

---

### Example 2: Partial Payments Over Time

**1. Create Invoice for 10000**
- Cashflow created: balance = 10000, status = 'Active'

**2. Customer pays 4000**
```javascript
POST /api/v1/customer-receipts/addcustomer-receipt
{
  "invoiceId": "...",
  "amountPaid": 4000,
  "receiptType": "Against Invoice",
  ...
}
```
- Cashflow: balance = 6000, status = 'PartiallyPaid'
- Invoice: paymentStatus = 'Partial'

**3. Customer pays another 3000**
- Cashflow: balance = 3000, status = 'PartiallyPaid'

**4. Customer pays final 3000**
- Cashflow: balance = 0, status = 'Settled'
- Invoice: paymentStatus = 'Paid'

---

### Example 3: Advance Receipt Workflow

**1. Customer gives advance of 5000**
```javascript
POST /api/v1/customer-receipts/addcustomer-receipt
{
  "customerId": "64abc123...",
  "receiptType": "Advance",
  "amountPaid": 5000,
  "paymentMode": "Bank",
  ...
}
```
- Cashflow created: totalAdvanceReceived = 5000, balance = -5000

**2. Invoice created for 8000**
```javascript
POST /api/v1/sales-invoices/createSalesInvoice
{
  "customerId": "64abc123...",
  "totalIncludeVat": 8000,
  ...
}
```
- Cashflow updated: balance = 3000 (8000 - 5000 advance)

**3. Customer pays remaining 3000**
```javascript
POST /api/v1/customer-receipts/addcustomer-receipt
{
  "invoiceId": "...",
  "amountPaid": 3000,
  "receiptType": "Against Invoice",
  ...
}
```
- Cashflow: balance = 0, status = 'Settled'

---

## Service Layer

### `creditCustomerCashflowService.js`

Provides utility functions:

1. **updateCashflowOnPaymentReceipt** - Called when receipt is created
2. **updateCashflowOnPartialPayment** - For partial allocations
3. **updateCashflowOnAdvanceApplication** - When advance is applied
4. **updateCashflowAging** - Update aging buckets
5. **getCashflowSummary** - Get quick summary

**Usage**:
```javascript
import { updateCashflowOnPaymentReceipt } from '../services/creditCustomerCashflowService.js';

await updateCashflowOnPaymentReceipt(customerId, financialYear, {
  receiptNumber: 'RCP001',
  amountPaid: 5000,
  paymentMode: 'Bank',
  receiptType: 'Against Invoice'
});
```

---

## Database Indexes

For performance optimization, the following indexes are created:

```javascript
CreditCustomerCashflowSchema.index({ customerId: 1, financialYear: 1 });
CreditCustomerCashflowSchema.index({ invoiceNumber: 1 });
CreditCustomerCashflowSchema.index({ customerCode: 1 });
CreditCustomerCashflowSchema.index({ dueDate: 1, status: 1 });
CreditCustomerCashflowSchema.index({ 'transactions.transactionDate': 1 });
```

---

## Status Flow

```
Invoice Created
    ↓
    [Active] ← Initial status
    ↓
    Full Payment Received → [Settled]
    OR
    Partial Payment Received → [PartiallyPaid]
    ↓
    More Partial Payments → [PartiallyPaid]
    ↓
    Final Payment → [Settled]
    
    If Due Date Passed & Balance > 0 → [Overdue]
    If Cancelled → [Cancelled]
```

---

## Reports

### 1. Aging Report
Shows outstanding amount categorized by:
- Current (0-30 days)
- 31-60 Days
- 61-90 Days
- Over 90 Days

### 2. Customer Cashflow Summary
For each customer:
- Total invoiced
- Total received
- Current balance
- Last payment date
- Due date status

### 3. Transaction History
Complete audit trail with:
- Transaction date/time
- Type (Invoice, Payment, Advance, etc.)
- Debit/Credit amounts
- Running balance
- Reference documents

---

## Integration Points

### 1. Sales Invoice Module
- `salesInvoiceController.js`: Calls cashflow creation on new credit invoice
- Passes invoice ID, amount, terms, due date

### 2. Customer Receipt Module
- `customerReceiptRoutes.js`: Updates cashflow on receipt creation
- Handles full, partial, and advance receipts
- Links receipts to invoices

### 3. Chart of Accounts
- Links customer ledger accounts for accounting integration
- Double-entry ledger maintained per transaction

---

## Error Handling

The system is designed to be non-blocking:
- If cashflow update fails, receipt/invoice creation still succeeds
- Errors are logged for manual reconciliation
- API returns partial success status with error details

---

## Future Enhancements

1. **Automated Dunning Notices** - Automatic overdue reminders
2. **Payment Plans** - Support for installment payments
3. **Credit Limits** - Enforce maximum credit exposure
4. **Settlement Rules** - Configure payment allocation rules (FIFO/LIFO)
5. **Forecasting** - Predict cash collection patterns
6. **Write-offs** - Handle bad debts
7. **Credit Notes** - Handle returns and adjustments

---

## Files Modified/Created

### New Files Created:
1. `server/Models/Sales/CreditCustomerCashflow.js` - Cashflow model
2. `server/modules/sales/controllers/creditCustomerCashflowController.js` - Cashflow controller
3. `server/modules/sales/routes/creditCustomerCashflowRoutes.js` - Cashflow routes
4. `server/services/creditCustomerCashflowService.js` - Utility service

### Files Modified:
1. `server/modules/sales/controllers/salesInvoiceController.js` - Added cashflow creation
2. `server/modules/customers/routes/customerReceiptRoutes.js` - Added cashflow updates
3. `server/modules/sales/routes/index.js` - Added cashflow routes export
4. `server/server.js` - Mounted cashflow routes

---

## Troubleshooting

### Issue: Cashflow balance not updating
**Solution**: Verify cashflow entry exists for customer in that financial year.

### Issue: Partial payments not allocating correctly
**Solution**: Ensure invoiceAllocations array in receipt request is properly formatted.

### Issue: Advance not applying to invoice
**Solution**: Use dedicated API endpoint `/applyAdvanceToInvoice` instead of regular payment.

---

## Contact & Support

For issues or enhancements, refer to repo memory files for latest implementation status.
