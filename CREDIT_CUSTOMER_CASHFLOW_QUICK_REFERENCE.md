# Credit Customer Cashflow - Quick Reference Guide

## Quick Start

### 1. Create Credit Invoice
Automatically triggers cashflow creation when:
- Customer has `paymentType = 'Credit Sale'`
- Invoice has `paymentType = 'Credit'`

```javascript
POST /api/v1/sales-invoices/createSalesInvoice
{
  "customerId": "...",
  "invoiceNumber": "SI/2025-26/0001",
  "paymentType": "Credit",
  "paymentTerms": "NET 30",
  "totalIncludeVat": 10000,
  "date": "2026-04-15",
  "financialYear": "2025-26"
}

// ✅ Automatic Result:
// - CreditCustomerCashflow entry created
// - Balance set to 10000
// - Status: 'Active'
```

---

## Common Workflows

### Workflow 1: Full Payment in One Shot

```javascript
// Step 1: Customer receives invoice
// Cashflow: balance = 10000, status = Active

// Step 2: Customer pays full amount
POST /api/v1/customer-receipts/addcustomer-receipt
{
  "customerId": "...",
  "invoiceId": "...",
  "receiptType": "Against Invoice",
  "amountPaid": 10000,
  "paymentMode": "Bank",
  "receiptDate": "2026-04-20",
  "financialYear": "2025-26"
}

// ✅ Result:
// - Cashflow: balance = 0, status = Settled
// - Invoice: paymentStatus = Paid
```

---

### Workflow 2: Multiple Partial Payments

```javascript
// Payment 1: 4000
POST /api/v1/customer-receipts/addcustomer-receipt
{ "amountPaid": 4000, ... }
// → balance = 6000, status = PartiallyPaid

// Payment 2: 3000
POST /api/v1/customer-receipts/addcustomer-receipt
{ "amountPaid": 3000, ... }
// → balance = 3000, status = PartiallyPaid

// Payment 3: 3000 (final)
POST /api/v1/customer-receipts/addcustomer-receipt
{ "amountPaid": 3000, ... }
// → balance = 0, status = Settled ✅
```

---

### Workflow 3: Advance Payment

```javascript
// Step 1: Customer pays advance
POST /api/v1/customer-receipts/addcustomer-receipt
{
  "customerId": "...",
  "receiptType": "Advance",
  "amountPaid": 5000,
  "paymentMode": "Bank",
  "financialYear": "2025-26"
}
// → Cashflow created: totalAdvanceReceived = 5000

// Step 2: Invoice created later
POST /api/v1/sales-invoices/createSalesInvoice
{ "totalIncludeVat": 8000, ... }
// → Cashflow: balance = 3000 (8000 - 5000 advance)

// Step 3: Pay remaining balance
POST /api/v1/customer-receipts/addcustomer-receipt
{ "amountPaid": 3000, "invoiceId": "..." }
// → balance = 0, status = Settled ✅
```

---

### Workflow 4: On-Account Payment (FIFO)

```javascript
// Customer has multiple invoices:
// - SI-001: 5000 outstanding
// - SI-002: 3000 outstanding
// - SI-003: 4000 outstanding

// Customer makes on-account payment
POST /api/v1/customer-receipts/addcustomer-receipt
{
  "customerId": "...",
  "receiptType": "On Account",
  "amountPaid": 7000,
  "paymentMode": "Bank"
}

// ✅ System automatically allocates FIFO:
// - SI-001: 5000 (settled)
// - SI-002: 2000 of 3000 paid (partial)
// - SI-003: untouched

// Each invoice's cashflow updated accordingly
```

---

## Key API Endpoints

### Check Cashflow Status
```javascript
GET /api/v1/credit-customer-cashflows/getCashflowByCustomerAndYear/:customerId/2025-26

// Response:
{
  "totalInvoiced": 10000,
  "totalReceived": 5000,
  "currentBalance": 5000,
  "status": "PartiallyPaid",
  "dueDate": "2026-05-15",
  "lastPaymentDate": "2026-04-20",
  "transactions": [
    { "type": "Invoice", "amount": 10000, "balance": 10000 },
    { "type": "Payment", "amount": 5000, "balance": 5000 }
  ]
}
```

### Get Full Transaction History
```javascript
GET /api/v1/credit-customer-cashflows/getTransactionHistory/:cashflowId

// Shows all debits, credits, and running balance
```

### Get Aging Report
```javascript
GET /api/v1/credit-customer-cashflows/getCustomerAgingReport?financialYear=2025-26

// Shows customers grouped by days overdue:
// - Current (0-30 days)
// - 31-60 Days
// - 61-90 Days
// - Over 90 Days
```

### Apply Advance Manually
```javascript
POST /api/v1/credit-customer-cashflows/applyAdvanceToInvoice/:cashflowId
{
  "advanceToApply": 2000
}

// If advance applied automatically, no action needed
// Use this for manual adjustments only
```

---

## Understanding the Balance

### Formula
```
currentBalance = totalInvoiced - totalReceived - totalAdvanceApplied
```

### Examples

**Example 1: Simple Invoice**
```
totalInvoiced:      10000
totalReceived:      0
totalAdvanceApplied: 0
─────────────────────────
currentBalance:     10000 ← Outstanding
```

**Example 2: After Payment**
```
totalInvoiced:      10000
totalReceived:      5000
totalAdvanceApplied: 0
─────────────────────────
currentBalance:     5000 ← Still outstanding
```

**Example 3: With Advance**
```
totalInvoiced:      10000
totalReceived:      0
totalAdvanceApplied: 3000
─────────────────────────
currentBalance:     7000 ← Reduced by advance
```

---

## Transaction Types

| Type | When Used | Effect |
|------|-----------|--------|
| **Invoice** | Invoice created | Debit (+) to balance |
| **Payment** | Receipt received | Credit (-) to balance |
| **AdvanceReceived** | Advance payment | Recorded separately |
| **AdvanceApplied** | Advance used for invoice | Reduces balance |
| **Reversal** | Invoice cancelled | Returns to zero |
| **WriteOff** | Bad debt adjustment | Special handling |

---

## Status Meanings

| Status | Meaning | Next Action |
|--------|---------|-------------|
| **Active** | Outstanding invoice | Wait or collect payment |
| **PartiallyPaid** | Some payment received | Collect remaining balance |
| **Settled** | Fully paid | No action needed |
| **Overdue** | Past due date & unpaid | Send reminder/escalate |
| **Suspended** | Payment on hold | Manager review |

---

## Common Scenarios

### ❓ Customer pays more than outstanding?
**Not allowed** - System validates that payment ≤ outstanding. Will return error.

### ❓ What if invoice is cancelled?
**Solution**: Use endpoint:
```javascript
POST /api/v1/credit-customer-cashflows/recordInvoiceReversal/:cashflowId
{
  "reversalReason": "Customer returned goods"
}
```
This creates reversal transaction and settles the account.

### ❓ Customer gives partial advance?
**Handled automatically** - Record as "Advance" receipt. Can apply later to any invoice.

### ❓ Multiple invoices, how to track separately?
**Via transactions array** - Each invoice/payment creates separate transaction entry with running balance.

### ❓ How to get overdue invoices?
```javascript
GET /api/v1/credit-customer-cashflows/getCustomerAgingReport
// Filter for status = "Overdue" and daysOverdue > 0
```

---

## Data Flow Diagram

```
┌─────────────────┐
│ Credit Invoice  │
│ Created         │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ CreditCustomerCashflow Entry        │
│ - balance = invoice amount          │
│ - status = Active                   │
│ - transaction: Invoice (debit)      │
└────────┬────────────────────────────┘
         │
         ├─────────────────────────┐
         │                         │
         ▼                         ▼
    ┌─────────────────┐    ┌──────────────────┐
    │ Receipt         │    │ Advance Receipt  │
    │ Created         │    │ Created          │
    └────────┬────────┘    └────────┬─────────┘
             │                      │
             ▼                      ▼
    ┌─────────────────┐    ┌──────────────────┐
    │ Cashflow:       │    │ Cashflow:        │
    │ balance -= amt  │    │ advance recorded │
    │ status updated  │    │ totalAdv += amt  │
    └─────────────────┘    └────────┬─────────┘
                                    │
                                    ▼
                           ┌──────────────────┐
                           │ Apply Advance    │
                           │ (if needed)      │
                           └────────┬─────────┘
                                    │
                                    ▼
                           ┌──────────────────┐
                           │ Cashflow:        │
                           │ balance -= adv   │
                           └──────────────────┘
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Payment amount > outstanding | Invalid input | Reduce payment to balance |
| Cashflow not created | Non-credit customer | Verify customer paymentType |
| Balance incorrect | Transaction not synced | Clear cache, check DB |
| Advance not applying | Not linked to invoice | Use applyAdvanceToInvoice |
| Status showing "Active" after payment | Stale cache | Refresh endpoint |

---

## Important Notes

⚠️ **Non-Blocking Updates**: Cashflow updates won't block invoice/receipt creation. If cashflow fails, receipt still creates successfully.

⚠️ **Financial Year Requirement**: Always pass `financialYear` in requests for proper organization.

⚠️ **Automatic Status Updates**: Don't manually set status - it updates automatically based on balance calculations.

✅ **Advance Handling**: Automatic when invoice created after advance. Manual application available via endpoint.

---

## Testing Checklist

- [ ] Create credit invoice → Cashflow created
- [ ] Record full payment → Balance = 0, Status = Settled
- [ ] Record partial payment → Balance updated correctly
- [ ] Record advance → Separate entry created
- [ ] Check aging report → Customers categorized by days overdue
- [ ] Get transaction history → All transactions visible with running balance
- [ ] Apply advance → Balance reduces by advance amount
- [ ] Reverse invoice → Status = Settled, balance = 0

---

## Support

For detailed documentation, see: `CREDIT_CUSTOMER_CASHFLOW_IMPLEMENTATION.md`
