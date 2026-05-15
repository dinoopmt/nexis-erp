# Credit Customer Cashflow - API Testing Guide

## Base URL
```
http://localhost:5000/api/v1/credit-customer-cashflows
```

---

## 1. GET All Cashflows

### Request
```http
GET /getCreditCustomerCashflows?customerId=64abc123&financialYear=2025-26&status=Active
```

### Query Parameters
- `customerId` (optional) - Filter by customer
- `financialYear` (optional) - Filter by financial year
- `status` (optional) - Filter by status (Active, Settled, PartiallyPaid, Overdue)
- `sortBy` (optional, default: dueDate) - Sort field

### Response
```json
[
  {
    "_id": "664d5f2e8f1b4a3c9e8f2b1a",
    "customerId": "64abc123...",
    "customerCode": "C001",
    "customerName": "ABC Corporation",
    "invoiceNumber": "SI/2025-26/0001",
    "totalInvoiced": 10000,
    "totalReceived": 5000,
    "currentBalance": 5000,
    "status": "PartiallyPaid",
    "dueDate": "2026-05-15T00:00:00.000Z",
    "lastPaymentDate": "2026-04-20T00:00:00.000Z",
    "lastPaymentAmount": 5000
  }
]
```

---

## 2. GET Cashflow by ID

### Request
```http
GET /getCreditCustomerCashflowById/664d5f2e8f1b4a3c9e8f2b1a
```

### Response
```json
{
  "_id": "664d5f2e8f1b4a3c9e8f2b1a",
  "customerId": "64abc123...",
  "customerCode": "C001",
  "customerName": "ABC Corporation",
  "invoiceNumber": "SI/2025-26/0001",
  "invoiceDate": "2026-04-15T00:00:00.000Z",
  "salesId": "64def456...",
  "dueDate": "2026-05-15T00:00:00.000Z",
  "totalInvoiced": 10000,
  "totalReceived": 5000,
  "currentBalance": 5000,
  "totalAdvanceReceived": 0,
  "totalAdvanceApplied": 0,
  "status": "PartiallyPaid",
  "paymentTerms": "NET 30",
  "transactions": [
    {
      "transactionType": "Invoice",
      "transactionDate": "2026-04-15T00:00:00.000Z",
      "drAmount": 10000,
      "crAmount": 0,
      "balance": 10000,
      "reference": "SI/2025-26/0001",
      "narration": "Invoice created"
    },
    {
      "transactionType": "Payment",
      "transactionDate": "2026-04-20T00:00:00.000Z",
      "drAmount": 0,
      "crAmount": 5000,
      "balance": 5000,
      "reference": "RCP001",
      "paymentMode": "Bank",
      "narration": "Payment received via Bank"
    }
  ]
}
```

---

## 3. GET Cashflow by Customer and Year

### Request
```http
GET /getCashflowByCustomerAndYear/64abc123/2025-26
```

### Response
Same as #2 above.

---

## 4. Record Full Payment

### Request
```http
POST /recordReceiptPayment/664d5f2e8f1b4a3c9e8f2b1a
Content-Type: application/json

{
  "receiptNumber": "RCP002",
  "receiptId": "664e9f2e8f1b4a3c9e8f2c2a",
  "amountPaid": 5000,
  "paymentMode": "Bank",
  "narration": "Full payment received"
}
```

### Response
```json
{
  "success": true,
  "message": "Payment recorded successfully",
  "cashflow": {
    ...
    "totalReceived": 10000,
    "currentBalance": 0,
    "status": "Settled",
    "lastPaymentDate": "2026-04-25T10:30:00.000Z",
    "lastPaymentAmount": 5000
  }
}
```

---

## 5. Record Partial Payment

### Request
```http
POST /recordPartialReceiptAllocation/664d5f2e8f1b4a3c9e8f2b1a
Content-Type: application/json

{
  "receiptNumber": "RCP003",
  "receiptId": "664e9f2e8f1b4a3c9e8f2c2b",
  "invoiceAmount": 10000,
  "allocatedAmount": 3000,
  "paymentMode": "Cash"
}
```

### Response
```json
{
  "success": true,
  "message": "Partial receipt recorded successfully",
  "cashflow": {
    ...
    "totalReceived": 3000,
    "currentBalance": 7000,
    "status": "PartiallyPaid",
    "transactions": [
      ...
      {
        "transactionType": "Payment",
        "crAmount": 3000,
        "balance": 7000,
        "narration": "Partial receipt: 3000 of 10000"
      }
    ]
  }
}
```

---

## 6. Record Advance Receipt

### Request
```http
POST /recordAdvanceReceipt
Content-Type: application/json

{
  "customerId": "64abc123",
  "receiptNumber": "RCP004",
  "receiptId": "664e9f2e8f1b4a3c9e8f2c2c",
  "advanceAmount": 5000,
  "paymentMode": "Bank",
  "financialYear": "2025-26"
}
```

### Response
```json
{
  "success": true,
  "message": "Advance receipt recorded successfully",
  "cashflow": {
    "customerId": "64abc123",
    "customerName": "ABC Corporation",
    "totalAdvanceReceived": 5000,
    "currentBalance": -5000,
    "status": "Active",
    "transactions": [
      {
        "transactionType": "AdvanceReceived",
        "crAmount": 5000,
        "balance": -5000,
        "advanceAmount": 5000,
        "narration": "Advance receipt: 5000"
      }
    ]
  }
}
```

---

## 7. Apply Advance to Invoice

### Request
```http
POST /applyAdvanceToInvoice/664d5f2e8f1b4a3c9e8f2b1a
Content-Type: application/json

{
  "advanceToApply": 3000,
  "receiptNumber": "RCP005",
  "receiptId": "664e9f2e8f1b4a3c9e8f2c2d"
}
```

### Response
```json
{
  "success": true,
  "message": "Advance applied successfully",
  "cashflow": {
    ...
    "totalAdvanceApplied": 3000,
    "currentBalance": 2000,
    "status": "PartiallyPaid",
    "transactions": [
      ...
      {
        "transactionType": "AdvanceApplied",
        "crAmount": 3000,
        "balance": 2000,
        "narration": "Applied advance to invoice"
      }
    ]
  }
}
```

---

## 8. Get Customer Aging Report

### Request
```http
GET /getCustomerAgingReport?financialYear=2025-26
```

### Query Parameters
- `customerId` (optional) - Specific customer
- `financialYear` (optional) - Specific financial year

### Response
```json
{
  "totalOutstanding": 45000,
  "agingBuckets": [
    {
      "bucket": "Current",
      "count": 5,
      "totalOutstanding": 20000,
      "customers": [
        {
          "customerId": "64abc123",
          "customerName": "ABC Corp",
          "invoiceNumber": "SI/2025-26/0001",
          "daysOverdue": 5,
          "outstandingAmount": 5000,
          "status": "PartiallyPaid"
        }
      ]
    },
    {
      "bucket": "31-60 Days",
      "count": 3,
      "totalOutstanding": 15000,
      "customers": [...]
    },
    {
      "bucket": "61-90 Days",
      "count": 2,
      "totalOutstanding": 7000,
      "customers": [...]
    },
    {
      "bucket": "Over 90 Days",
      "count": 1,
      "totalOutstanding": 3000,
      "customers": [...]
    }
  ],
  "detailedReport": [...]
}
```

---

## 9. Record Invoice Reversal

### Request
```http
POST /recordInvoiceReversal/664d5f2e8f1b4a3c9e8f2b1a
Content-Type: application/json

{
  "reversalReason": "Goods returned by customer",
  "narration": "Full return - RMA #12345"
}
```

### Response
```json
{
  "success": true,
  "message": "Invoice reversal recorded successfully",
  "cashflow": {
    ...
    "totalInvoiced": 0,
    "currentBalance": 0,
    "status": "Settled",
    "transactions": [
      ...
      {
        "transactionType": "Reversal",
        "crAmount": 10000,
        "balance": 0,
        "narration": "Invoice reversal: Goods returned by customer"
      }
    ]
  }
}
```

---

## 10. Get Transaction History

### Request
```http
GET /getTransactionHistory/664d5f2e8f1b4a3c9e8f2b1a
```

### Response
```json
{
  "customer": {
    "_id": "64abc123",
    "name": "ABC Corporation",
    "phone": "+971501234567"
  },
  "invoiceNumber": "SI/2025-26/0001",
  "dueDate": "2026-05-15T00:00:00.000Z",
  "totalInvoiced": 10000,
  "totalReceived": 7000,
  "currentBalance": 3000,
  "transactions": [
    {
      "transactionType": "Invoice",
      "transactionDate": "2026-04-15T10:00:00.000Z",
      "drAmount": 10000,
      "crAmount": 0,
      "balance": 10000,
      "reference": "SI/2025-26/0001",
      "narration": "Invoice created for ABC Corporation"
    },
    {
      "transactionType": "Payment",
      "transactionDate": "2026-04-20T14:30:00.000Z",
      "drAmount": 0,
      "crAmount": 5000,
      "balance": 5000,
      "reference": "RCP001",
      "paymentMode": "Bank",
      "receiptNumber": "RCP001",
      "narration": "Payment received via Bank"
    },
    {
      "transactionType": "Payment",
      "transactionDate": "2026-04-25T11:15:00.000Z",
      "drAmount": 0,
      "crAmount": 2000,
      "balance": 3000,
      "reference": "RCP002",
      "paymentMode": "Cash",
      "receiptNumber": "RCP002",
      "narration": "Partial payment received via Cash"
    }
  ]
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Receipt number and valid amount paid are required"
}
```

### 404 Not Found
```json
{
  "error": "Cashflow entry not found"
}
```

### 500 Server Error
```json
{
  "error": "Error message describing what went wrong"
}
```

---

## Postman Collection Template

```json
{
  "info": {
    "name": "Credit Customer Cashflow API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get All Cashflows",
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{base_url}}/api/v1/credit-customer-cashflows/getCreditCustomerCashflows?financialYear=2025-26",
          "host": ["{{base_url}}"]
        }
      }
    },
    {
      "name": "Record Payment",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"receiptNumber\":\"RCP001\",\"amountPaid\":5000,\"paymentMode\":\"Bank\"}"
        },
        "url": {
          "raw": "{{base_url}}/api/v1/credit-customer-cashflows/recordReceiptPayment/{{cashflowId}}",
          "host": ["{{base_url}}"]
        }
      }
    }
  ]
}
```

---

## Testing Workflow

### Test Case 1: Full Payment Flow
```
1. GET /getCreditCustomerCashflows → Note cashflowId
2. POST /recordReceiptPayment with full amount
3. GET /getTransactionHistory → Verify balance = 0
4. Verify status changed to "Settled"
```

### Test Case 2: Partial Payment Flow
```
1. GET /getCreditCustomerCashflows → Note cashflowId
2. POST /recordReceiptPayment with partial amount
3. GET /getTransactionHistory → Verify correct balance
4. Verify status = "PartiallyPaid"
5. Repeat step 2 for additional payments
6. Final payment → verify status = "Settled"
```

### Test Case 3: Advance Application
```
1. POST /recordAdvanceReceipt → Record advance
2. POST /applyAdvanceToInvoice → Apply to invoice
3. GET /getTransactionHistory → Verify "AdvanceApplied" entry
4. Verify balance reduced by advance amount
```

### Test Case 4: Aging Report
```
1. GET /getCustomerAgingReport?financialYear=2025-26
2. Verify customers grouped by days overdue
3. Verify totals calculated correctly
```

---

## Curl Examples

### Get All Cashflows
```bash
curl -X GET "http://localhost:5000/api/v1/credit-customer-cashflows/getCreditCustomerCashflows?financialYear=2025-26" \
  -H "Content-Type: application/json"
```

### Record Payment
```bash
curl -X POST "http://localhost:5000/api/v1/credit-customer-cashflows/recordReceiptPayment/664d5f2e8f1b4a3c9e8f2b1a" \
  -H "Content-Type: application/json" \
  -d '{
    "receiptNumber": "RCP001",
    "amountPaid": 5000,
    "paymentMode": "Bank",
    "narration": "Payment received"
  }'
```

### Get Aging Report
```bash
curl -X GET "http://localhost:5000/api/v1/credit-customer-cashflows/getCustomerAgingReport?financialYear=2025-26" \
  -H "Content-Type: application/json"
```

---

## Environment Variables for Postman

```json
{
  "base_url": "http://localhost:5000",
  "customerId": "64abc123...",
  "cashflowId": "664d5f2e8f1b4a3c9e8f2b1a",
  "invoiceId": "64def456...",
  "receiptId": "664e9f2e8f1b4a3c9e8f2c2a",
  "financialYear": "2025-26"
}
```

---

## Notes

- All monetary amounts are in the currency's base unit (e.g., AED not fils)
- Dates should be in ISO 8601 format
- Receipt and Cashflow IDs are MongoDB ObjectIds
- Ensure financial year format matches: "YYYY-YY"
- All operations are non-blocking for invoice/receipt creation
