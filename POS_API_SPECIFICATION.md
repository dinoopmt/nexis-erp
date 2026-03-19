# NEXIS-ERP POS System - Backend API Specification

## Overview

This document specifies all API endpoints required for the NEXIS-ERP POS system frontend to function properly. Use this as a blueprint for backend implementation.

---

## Authentication & Sessions

### Start POS Session
**Endpoint**: `POST /api/pos/sessions/start`

**Purpose**: Authenticate operator and initialize POS session

**Request Body**:
```json
{
  "terminalId": "TERM-001",
  "operatorId": "OP-123",
  "timestamp": "2024-03-05T14:30:00Z"
}
```

**Response (Success 200)**:
```json
{
  "success": true,
  "data": {
    "sessionId": "SESS-ABC123",
    "terminalId": "TERM-001",
    "operatorId": "OP-123",
    "shiftId": "SHIFT-2024-001",
    "startTime": "2024-03-05T14:30:00Z",
    "message": "Session started successfully"
  }
}
```

**Response (Error 401)**:
```json
{
  "success": false,
  "message": "Invalid terminal or operator"
}
```

**Implementation Notes**:
- Validate terminalId exists
- Validate operatorId exists and has role=cashier
- Create new POSShift document
- Store session in memory or Redis
- Return shiftId for subsequent requests

---

## Terminals Management

### List All Terminals
**Endpoint**: `GET /api/pos/terminals`

**Query Parameters**: None

**Response (Success 200)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "TERM-001",
      "terminalName": "Counter 1",
      "ipAddress": "192.168.1.100",
      "macAddress": "00:1A:2B:3C:4D:5E",
      "status": "active",
      "lastSync": "2024-03-05T14:25:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    {
      "_id": "TERM-002",
      "terminalName": "Counter 2",
      "ipAddress": "192.168.1.101",
      "macAddress": "00:1A:2B:3C:4D:5F",
      "status": "inactive",
      "lastSync": "2024-03-04T18:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Implementation Notes**:
- Return all terminals with status
- Filter by company if multi-tenant
- Include lastSync timestamp

---

### Get Terminal Status
**Endpoint**: `GET /api/pos/terminals/{terminalId}/status`

**Response (Success 200)**:
```json
{
  "success": true,
  "data": {
    "terminalId": "TERM-001",
    "terminalName": "Counter 1",
    "status": "active",
    "ipAddress": "192.168.1.100",
    "currentOperator": "OP-123",
    "shiftStatus": "open",
    "lastTransaction": "2024-03-05T14:28:30Z",
    "connectionStatus": "online",
    "syncStatus": "synced",
    "lastSync": "2024-03-05T14:30:00Z"
  }
}
```

---

### Get Terminal Settings
**Endpoint**: `GET /api/pos/terminals/{terminalId}/settings`

**Response (Success 200)**:
```json
{
  "success": true,
  "data": {
    "terminalName": "Counter 1",
    "ipAddress": "192.168.1.100",
    "macAddress": "00:1A:2B:3C:4D:5E",
    "receiptWidth": "standard",
    "printQuality": "high",
    "autoSyncInterval": 30,
    "enableBarcode": true,
    "enableSignature": false,
    "enableCustomerDisplay": true,
    "debugMode": false,
    "currency": "AED",
    "decimalPlaces": 2
  }
}
```

---

### Update Terminal Settings
**Endpoint**: `PUT /api/pos/terminals/{terminalId}/settings`

**Request Body**:
```json
{
  "terminalName": "Counter 1",
  "ipAddress": "192.168.1.100",
  "receiptWidth": "standard",
  "printQuality": "high",
  "autoSyncInterval": 30,
  "enableBarcode": true,
  "enableSignature": false,
  "enableCustomerDisplay": true,
  "currency": "AED",
  "decimalPlaces": 2,
  "debugMode": false
}
```

**Response (Success 200)**:
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": {
    "terminalId": "TERM-001",
    "settings": {
      "terminalName": "Counter 1",
      "receiptWidth": "standard",
      "printQuality": "high",
      "enableBarcode": true
    }
  }
}
```

---

### Get Daily Sales Summary
**Endpoint**: `GET /api/pos/terminals/{terminalId}/daily-sales`

**Query Parameters**:
- `date` (optional): ISO date string, default today

**Response (Success 200)**:
```json
{
  "success": true,
  "data": {
    "terminalId": "TERM-001",
    "date": "2024-03-05",
    "totalSalesAmount": 5250.75,
    "transactionCount": 42,
    "averageTransaction": 125.02,
    "cashBalance": 5000.00,
    "shiftStatus": "open",
    "paymentMethods": {
      "cash": 2500.50,
      "card": 2250.25,
      "cheque": 500.00,
      "online": 0.00
    },
    "topProducts": [
      {
        "productId": "PROD-001",
        "productName": "Product A",
        "quantity": 15,
        "revenue": 450.00
      }
    ]
  }
}
```

---

## Shifts Management

### Open Shift (Start Day)
**Endpoint**: `POST /api/pos/shifts/open`

**Purpose**: Open a new shift for the operator with opening balance

**Request Body**:
```json
{
  "terminalId": "TERM-001",
  "operatorId": "OP-123",
  "openingBalance": 1000.00,
  "timestamp": "2024-03-05T08:00:00Z"
}
```

**Response (Success 201)**:
```json
{
  "success": true,
  "message": "Shift opened successfully",
  "data": {
    "_id": "SHIFT-2024-001",
    "terminalId": "TERM-001",
    "operatorId": "OP-123",
    "openingBalance": 1000.00,
    "openedAt": "2024-03-05T08:00:00Z",
    "status": "open",
    "message": "Shift opened - Ready to start transactions"
  }
}
```

**Implementation Notes**:
- Validate terminal/operator exist
- Check no other open shift for this terminal
- Create POSShift document with status=open
- Record opening balance
- Initialize payment methods breakdown
- Return shift ID for subsequent requests

---

### Get Previous Shift Summary
**Endpoint**: `GET /api/pos/terminals/{terminalId}/previous-shift-summary`

**Purpose**: Get closing details from previous shift for reconciliation reference

**Response (Success 200)**:
```json
{
  "success": true,
  "data": {
    "terminalId": "TERM-001",
    "openedAt": "2024-03-04T08:00:00Z",
    "closedAt": "2024-03-04T18:00:00Z",
    "openingBalance": 1000.00,
    "closingBalance": 2500.50,
    "totalSales": 5250.75,
    "transactionCount": 42,
    "declaredCashAmount": 2500.50,
    "variance": 0.00,
    "variancePercentage": 0.00,
    "status": "closed"
  }
}
```

**Response (Error 404)** - No previous shift:
```json
{
  "success": false,
  "message": "No previous shift found",
  "code": "SHIFT_NOT_FOUND"
}
```

**Implementation Notes**:
- Find most recent closed shift for terminal
- Return closing balance for reconciliation
- Include variance information
- Return 404 if no previous shift (first shift of period)

---
**Endpoint**: `GET /api/pos/shifts/current?terminalId={terminalId}`

**Response (Success 200)**:
```json
{
  "success": true,
  "data": {
    "_id": "SHIFT-2024-001",
    "terminalId": "TERM-001",
    "operatorId": "OP-123",
    "openedAt": "2024-03-05T08:00:00Z",
    "closedAt": null,
    "status": "open",
    "openingBalance": 1000.00,
    "closingBalance": null,
    "declaredCashAmount": null,
    "variance": null,
    "totalSales": 5250.75,
    "transactionCount": 42,
    "paymentMethods": [
      {
        "method": "cash",
        "amount": 2500.50,
        "count": 25
      },
      {
        "method": "card",
        "amount": 2250.25,
        "count": 15
      }
    ]
  }
}
```

---

### Get Shift Payments
**Endpoint**: `GET /api/pos/shifts/{shiftId}/payments`

**Response (Success 200)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "PAY-001",
      "method": "cash",
      "amount": 250.00,
      "transactionId": "TXN-001",
      "timestamp": "2024-03-05T14:30:00Z"
    },
    {
      "_id": "PAY-002",
      "method": "card",
      "amount": 500.00,
      "transactionId": "TXN-002",
      "timestamp": "2024-03-05T14:31:00Z"
    }
  ]
}
```

---

### Close Shift
**Endpoint**: `POST /api/pos/shifts/{shiftId}/close`

**Request Body**:
```json
{
  "timestamp": "2024-03-05T18:00:00Z"
}
```

**Response (Success 200)**:
```json
{
  "success": true,
  "message": "Shift closed successfully",
  "data": {
    "shiftId": "SHIFT-2024-001",
    "totalSales": 5250.75,
    "closedAt": "2024-03-05T18:00:00Z",
    "status": "closed"
  }
}
```

---

### Reconcile Cash
**Endpoint**: `POST /api/pos/shifts/{shiftId}/reconcile`

**Request Body**:
```json
{
  "declaredCashAmount": 2500.50,
  "systemCashAmount": 2495.50,
  "terminalId": "TERM-001",
  "operatorId": "OP-123"
}
```

**Response (Success 200)**:
```json
{
  "success": true,
  "message": "Reconciliation completed",
  "data": {
    "shiftId": "SHIFT-2024-001",
    "systemAmount": 2495.50,
    "declaredAmount": 2500.50,
    "variance": 5.00,
    "variancePercentage": 0.20,
    "status": "reconciled"
  }
}
```

---

## Sales Transactions

### Create Sale
**Endpoint**: `POST /api/pos/sales/create`

**Request Body**:
```json
{
  "terminalId": "TERM-001",
  "operatorId": "OP-123",
  "customerId": null,
  "items": [
    {
      "productId": "PROD-001",
      "quantity": 2,
      "price": 225.00,
      "lineTotal": 450.00
    },
    {
      "productId": "PROD-002",
      "quantity": 1,
      "price": 175.00,
      "lineTotal": 175.00
    }
  ],
  "subtotal": 625.00,
  "discountAmount": 0.00,
  "taxAmount": 31.25,
  "total": 656.25,
  "paymentMethod": "cash",
  "timestamp": "2024-03-05T14:30:00Z"
}
```

**Response (Success 201)**:
```json
{
  "success": true,
  "message": "Sale created successfully",
  "data": {
    "_id": "SALE-2024-00001",
    "invoiceNumber": "INV-00001",
    "reference": "REC-2024-001",
    "terminalId": "TERM-001",
    "operatorId": "OP-123",
    "total": 656.25,
    "itemCount": 3,
    "paymentMethod": "cash",
    "status": "completed",
    "createdAt": "2024-03-05T14:30:00Z",
    "receiptData": {
      "items": [
        {
          "name": "Product A",
          "qty": 2,
          "price": 225.00,
          "total": 450.00
        }
      ],
      "subtotal": 625.00,
      "tax": 31.25,
      "total": 656.25,
      "payment": "cash"
    }
  }
}
```

**Implementation Notes**:
- Validate all items exist in inventory
- Check stock availability
- Calculate totals on backend (don't trust frontend)
- Deduct inventory quantities
- Create GL entries for revenue recognition
- Create journal entry: DR Cash/Payment Method, CR Revenue
- Update inventory tables (Stock, StockMovement)
- Generate unique invoice number
- Store receipt data for printing
- Return full receipt payload for printing

---

## Returns Processing

### Create Return
**Endpoint**: `POST /api/sales/returns/create`

**Request Body**:
```json
{
  "terminalId": "TERM-001",
  "operatorId": "OP-123",
  "originalSaleId": "SALE-2024-00001",
  "customerId": null,
  "items": [
    {
      "productId": "PROD-001",
      "quantity": 1,
      "price": 225.00,
      "lineTotal": 225.00
    }
  ],
  "reason": "defective",
  "subtotal": 225.00,
  "taxAmount": 11.25,
  "total": 236.25,
  "timestamp": "2024-03-05T14:35:00Z"
}
```

**Response (Success 201)**:
```json
{
  "success": true,
  "message": "Return processed successfully",
  "data": {
    "_id": "RET-2024-00001",
    "returnId": "RET-2024-00001",
    "referenceId": "REC-2024-001",
    "originalSaleId": "SALE-2024-00001",
    "terminalId": "TERM-001",
    "total": 236.25,
    "reason": "defective",
    "status": "completed",
    "createdAt": "2024-03-05T14:35:00Z"
  }
}
```

**Implementation Notes**:
- Validate original sale exists
- Add inventory back (reverse stock deduction)
- Create return GL entry
- Update customer credit/balance if applicable
- Create stock movement record

---

## Payments

### Register Payment
**Endpoint**: `POST /api/pos/payments/register`

**Request Body**:
```json
{
  "shiftId": "SHIFT-2024-001",
  "method": "cash",
  "amount": 250.00,
  "timestamp": "2024-03-05T14:30:00Z",
  "operatorId": "OP-123"
}
```

**Response (Success 201)**:
```json
{
  "success": true,
  "message": "Payment recorded",
  "data": {
    "_id": "PAY-001",
    "shiftId": "SHIFT-2024-001",
    "method": "cash",
    "amount": 250.00,
    "timestamp": "2024-03-05T14:30:00Z"
  }
}
```

---

## Reports

### Sales Summary
**Endpoint**: `GET /api/pos/reports/sales?terminalId={id}&startDate={date}&endDate={date}`

**Response (Success 200)**:
```json
{
  "success": true,
  "data": {
    "terminalId": "TERM-001",
    "startDate": "2024-03-05",
    "endDate": "2024-03-05",
    "totalSales": 5250.75,
    "transactionCount": 42,
    "averageTransaction": 125.02,
    "totalTax": 262.54,
    "totalDiscount": 50.00
  }
}
```

---

### Top Products
**Endpoint**: `GET /api/pos/reports/top-products?terminalId={id}&startDate={date}&endDate={date}&limit=5`

**Response (Success 200)**:
```json
{
  "success": true,
  "data": [
    {
      "productId": "PROD-001",
      "productName": "Product A",
      "quantity": 45,
      "revenue": 2025.00,
      "avgPrice": 45.00
    },
    {
      "productId": "PROD-002",
      "productName": "Product B",
      "quantity": 38,
      "revenue": 1900.00,
      "avgPrice": 50.00
    }
  ]
}
```

---

### Payment Breakdown
**Endpoint**: `GET /api/pos/reports/payment-breakdown?terminalId={id}&startDate={date}&endDate={date}`

**Response (Success 200)**:
```json
{
  "success": true,
  "data": [
    {
      "method": "cash",
      "amount": 2500.50,
      "count": 25,
      "percentage": 47.6
    },
    {
      "method": "card",
      "amount": 2250.25,
      "count": 15,
      "percentage": 42.9
    },
    {
      "method": "cheque",
      "amount": 500.00,
      "count": 2,
      "percentage": 9.5
    }
  ]
}
```

---

### Customer Metrics
**Endpoint**: `GET /api/pos/reports/customer-metrics?terminalId={id}&startDate={date}&endDate={date}`

**Response (Success 200)**:
```json
{
  "success": true,
  "data": {
    "uniqueCustomers": 145,
    "walkinCustomers": 120,
    "registeredCustomers": 25,
    "totalCustomerSpend": 5250.75,
    "averageCustomerSpend": 36.21,
    "repeatingCustomers": 32
  }
}
```

---

### Hourly Trends
**Endpoint**: `GET /api/pos/reports/hourly-trends?terminalId={id}&startDate={date}&endDate={date}`

**Response (Success 200)**:
```json
{
  "success": true,
  "data": [
    {
      "hour": 9,
      "amount": 125.50,
      "count": 3,
      "avgTransaction": 41.83
    },
    {
      "hour": 10,
      "amount": 425.75,
      "count": 10,
      "avgTransaction": 42.58
    },
    {
      "hour": 11,
      "amount": 850.25,
      "count": 18,
      "avgTransaction": 47.24
    }
  ]
}
```

---

## Inventory

### Product Search
**Endpoint**: `GET /api/inventory/products/search?query={term}&limit=10`

**Response (Success 200)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "PROD-001",
      "name": "Product A",
      "sku": "SKU-001",
      "barcode": "123456789",
      "price": 225.00,
      "stock": {
        "available": 150,
        "reserved": 10,
        "inTransit": 5
      },
      "category": "Electronics",
      "image": "url-to-image"
    }
  ]
}
```

---

### Get Inventory Products
**Endpoint**: `GET /api/inventory/products?terminal={terminalId}&includeStock=true`

**Response (Success 200)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "PROD-001",
      "name": "Product A",
      "sku": "SKU-001",
      "price": 225.00,
      "stock": {
        "available": 150,
        "reserved": 10,
        "inTransit": 5,
        "minimum": 10
      },
      "category": "Electronics",
      "image": "url"
    }
  ]
}
```

---

### Get Categories
**Endpoint**: `GET /api/inventory/categories`

**Response (Success 200)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "CAT-001",
      "name": "Electronics",
      "description": "Electronic items"
    },
    {
      "_id": "CAT-002",
      "name": "Clothing",
      "description": "Apparel items"
    }
  ]
}
```

---

## Users (Operators)

### Get Users by Role
**Endpoint**: `GET /api/auth/users?role=cashier`

**Response (Success 200)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "OP-123",
      "name": "John Cashier",
      "email": "john@pos.local",
      "role": "cashier",
      "status": "active"
    },
    {
      "_id": "OP-124",
      "name": "Jane Operator",
      "email": "jane@pos.local",
      "role": "cashier",
      "status": "active"
    }
  ]
}
```

---

## Error Handling

### Standard Error Response (400/500)
```json
{
  "success": false,
  "message": "Descriptive error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "fieldName",
    "issue": "Specific validation error"
  }
}
```

### Common Error Codes
- `INVALID_CREDENTIALS`: Login failed
- `TERMINAL_NOT_FOUND`: Terminal doesn't exist
- `PRODUCT_NOT_FOUND`: Product not found
- `INSUFFICIENT_STOCK`: Not enough stock
- `INVALID_AMOUNT`: Sales total mismatch
- `SHIFT_ALREADY_OPEN`: Can't open duplicate shift
- `SHIFT_NOT_FOUND`: Shift doesn't exist
- `UNAUTHORIZED`: Insufficient permissions
- `VALIDATION_ERROR`: Input validation failed

---

## Authentication Header

For secure endpoints, include:
```
Authorization: Bearer TOKEN
```

---

## Implementation Priority

### Phase 1 (MVP - Required)
- [ ] POST /api/pos/sessions/start
- [ ] POST /api/pos/shifts/open ← NEW
- [ ] GET /api/pos/terminals/{id}/previous-shift-summary ← NEW
- [ ] GET /api/pos/terminals
- [ ] GET /api/auth/users?role=cashier
- [ ] POST /api/pos/sales/create
- [ ] GET /api/inventory/products/search
- [ ] GET /api/pos/shifts/current
- [ ] POST /api/pos/shifts/{id}/close
- [ ] POST /api/sales/returns/create

### Phase 2 (Enhanced)
- [ ] GET /api/pos/terminals/{id}/status
- [ ] GET /api/pos/terminals/{id}/daily-sales
- [ ] GET /api/pos/terminals/{id}/settings
- [ ] PUT /api/pos/terminals/{id}/settings
- [ ] POST /api/pos/payments/register
- [ ] GET /api/pos/shifts/{id}/payments
- [ ] POST /api/pos/shifts/{id}/reconcile

### Phase 3 (Analytics)
- [ ] GET /api/pos/reports/sales
- [ ] GET /api/pos/reports/top-products
- [ ] GET /api/pos/reports/payment-breakdown
- [ ] GET /api/pos/reports/customer-metrics
- [ ] GET /api/pos/reports/hourly-trends

---

## Testing Endpoints

### Create Test Data
```bash
curl -X POST http://localhost:5000/api/pos/sessions/start \
  -H "Content-Type: application/json" \
  -d '{
    "terminalId": "TERM-001",
    "operatorId": "OP-123",
    "timestamp": "2024-03-05T14:30:00Z"
  }'
```

### Test Sale Creation
```bash
curl -X POST http://localhost:5000/api/pos/sales/create \
  -H "Content-Type: application/json" \
  -d '{
    "terminalId": "TERM-001",
    "operatorId": "OP-123",
    "items": [{
      "productId": "PROD-001",
      "quantity": 1,
      "price": 100,
      "lineTotal": 100
    }],
    "subtotal": 100,
    "taxAmount": 5,
    "total": 105,
    "paymentMethod": "cash"
  }'
```

---

**Document Version**: 1.0  
**Last Updated**: March 5, 2026  
**Status**: Ready for Implementation
