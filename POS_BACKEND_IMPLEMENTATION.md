# POS Backend Implementation Guide

## Overview
Complete backend implementation for POS system with shift management, terminal tracking, and sales transactions.

**Status**: ✅ Implementation Complete | 🔄 Testing Phase

## Database Models

### 1. POSTerminal Model
Represents physical POS checkout/register terminals

```javascript
// Key Fields:
{
  terminalId: String,              // Unique identifier (POS-001, POS-MAIN)
  terminalName: String,            // User-friendly name
  location: String,                // Physical location
  status: enum ['active', 'inactive', 'maintenance'],
  hardware: {
    printer: String,               // Printer port/IP
    scanner: String,               // Barcode scanner port
    display: String                // Display type
  },
  currentShift: ObjectId,          // Reference to active POSShift
  lastShift: ObjectId,             // Reference to previous POSShift
  settings: {
    currency: String,              // Default USD
    decimalPlaces: Number,         // Default 2
    taxIncluded: Boolean
  }
}
```

### 2. POSShift Model
Represents a shift period with opening and closing information

```javascript
// Key Fields:
{
  shiftNumber: String,             // Unique ID (SHIFT-20260305-001)
  terminal: ObjectId,              // Reference to POSTerminal
  terminalId: String,              // Terminal ID for quick lookup
  operator: ObjectId,              // Reference to User
  operatorId: String,              // Operator ID
  operatorName: String,
  
  // Opening information
  status: enum ['open', 'closed', 'paused'],
  openedAt: Date,
  openedBy: ObjectId,
  openingBalance: Number,          // Declared opening cash
  expectedOpening: Number,         // Previous shift closing (reconciliation)
  openingVariance: Number,         // Difference (expected - actual)
  openingVarianceAcknowledged: Boolean,
  
  // Activity tracking
  transactionCount: Number,
  totalSales: Number,              // Total revenue
  totalReturns: Number,            // Total refunds
  totalPaymentsMade: Number,       // Total processed
  netSales: Number,                // Sales - Returns
  
  // Closing information
  closedAt: Date,
  closedBy: ObjectId,
  closingBalance: Number,          // Declared closing cash
  expectedClosing: Number,         // Opening + Net Sales
  closingVariance: Number,         // Difference
  closingVarianceAcknowledged: Boolean,
  reconcilationNotes: String,
  
  // Payment breakdown
  paymentBreakdown: {
    cash: Number,
    card: Number,
    check: Number,
    digital: Number,
    other: Number
  },
  
  transactions: [ObjectId]         // References to POSSale documents
}
```

### 3. POSSale Model
Represents individual sales/return transactions

```javascript
// Key Fields:
{
  transactionNumber: String,       // TXN-20260305-001
  shift: ObjectId,                 // Reference to POSShift
  shiftNumber: String,
  terminal: ObjectId,
  terminalId: String,
  operator: ObjectId,
  operatorId: String,
  
  type: enum ['sale', 'return'],
  customer: {
    name: String,
    phone: String,
    email: String
  },
  
  items: [{
    productId: ObjectId,
    productCode: String,
    productName: String,
    quantity: Number,
    unitPrice: Number,
    discount: Number,
    discountType: enum ['fixed', 'percentage'],
    tax: Number,
    lineTotal: Number
  }],
  
  subtotal: Number,
  discount: Number,
  tax: Number,
  total: Number,
  
  paymentMethod: enum ['cash', 'card', 'check', 'digital', 'mixed'],
  paymentBreakdown: { cash, card, check, digital },
  amountPaid: Number,
  change: Number,
  
  status: enum ['completed', 'pending', 'voided', 'returned'],
  notes: String
}
```

## API Endpoints

### Base URL
```
http://localhost:5000/api/v1/pos
```

### Shift Management Endpoints

#### 1. GET Previous Shift Summary
```
GET /terminals/:terminalId/previous-shift-summary
```

**Description**: Retrieve previous closed shift data for balance reconciliation

**Response**:
```json
{
  "success": true,
  "data": {
    "hasPreviousShift": true,
    "shiftNumber": "SHIFT-20260305-001",
    "operatorName": "John Operator",
    "openedAt": "2026-03-05T08:00:00Z",
    "closedAt": "2026-03-05T16:00:00Z",
    "closingBalance": 5000.00,
    "openingBalance": 2000.00,
    "totalSales": 3500.00,
    "totalReturns": 500.00,
    "netSales": 3000.00,
    "transactionCount": 45,
    "closingVariance": 0.00,
    "closingVarianceAcknowledged": true
  }
}
```

#### 2. POST Open Shift
```
POST /shifts/open
```

**Description**: Open new shift with opening balance

**Request Body**:
```json
{
  "terminalId": "POS-001",
  "operatorId": "507f1f77bcf86cd799439011",
  "operatorName": "John Operator",
  "openingBalance": 2500.00
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Shift opened successfully",
  "data": {
    "shiftId": "507f1f77bcf86cd799439012",
    "shiftNumber": "SHIFT-20260305-002",
    "terminalId": "POS-001",
    "operatorName": "John Operator",
    "openedAt": "2026-03-05T16:00:00Z",
    "openingBalance": 2500.00,
    "expectedOpening": 5000.00,
    "openingVariance": -2500.00,
    "status": "open"
  }
}
```

**Error Cases**:
- 400: Missing required fields
- 404: Terminal or operator not found
- 409: Terminal already has open shift

#### 3. POST Close Shift
```
POST /shifts/:shiftId/close
```

**Description**: Close active shift with reconciliation

**Request Body**:
```json
{
  "closingBalance": 4800.00,
  "reconcilationNotes": "Variance due to refund"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Shift closed successfully",
  "data": {
    "shiftId": "507f1f77bcf86cd799439012",
    "shiftNumber": "SHIFT-20260305-002",
    "closingBalance": 4800.00,
    "expectedClosing": 5500.00,
    "closingVariance": -700.00,
    "totalSales": 3200.00,
    "totalReturns": 400.00,
    "netSales": 2800.00,
    "closedAt": "2026-03-06T00:00:00Z",
    "status": "closed"
  }
}
```

#### 4. GET Shift Details
```
GET /shifts/:shiftId
```

**Description**: Retrieve complete shift information

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "shiftNumber": "SHIFT-20260305-002",
    "terminal": { "terminalId": "POS-001", "terminalName": "Main Counter" },
    "operator": { "fullName": "John Operator" },
    "status": "open",
    "openingBalance": 2500.00,
    "transactionCount": 0,
    "totalSales": 0,
    "netSales": 0
  }
}
```

#### 5. POST Acknowledge Opening Variance
```
POST /shifts/:shiftId/acknowledge-opening
```

**Description**: Mark opening variance as acknowledged by operator

**Response**:
```json
{
  "success": true,
  "message": "Opening variance acknowledged",
  "data": {
    "shiftId": "507f1f77bcf86cd799439012",
    "openingVarianceAcknowledged": true
  }
}
```

### Terminal Information Endpoints

#### 6. GET Terminal Status
```
GET /terminals/:terminalId/status
```

**Description**: Get current terminal status and active shift info

**Response**:
```json
{
  "success": true,
  "data": {
    "terminalId": "POS-001",
    "terminalName": "Main Counter",
    "status": "active",
    "currentShift": {
      "_id": "507f1f77bcf86cd799439012",
      "shiftNumber": "SHIFT-20260305-002",
      "status": "open",
      "operatorName": "John Operator",
      "transactionCount": 42,
      "totalSales": 3500.00
    },
    "location": "Floor 1 - Counter A"
  }
}
```

#### 7. GET Current Shift
```
GET /terminals/:terminalId/current-shift
```

**Description**: Get currently open shift for terminal (lightweight)

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "shiftNumber": "SHIFT-20260305-002",
    "status": "open",
    "operatorName": "John Operator"
  }
}
```

#### 8. GET Daily Sales
```
GET /terminals/:terminalId/daily-sales
```

**Description**: Get aggregated sales data for today

**Response**:
```json
{
  "success": true,
  "data": {
    "date": "2026-03-05",
    "terminalId": "POS-001",
    "totalSales": 6700.00,
    "totalReturns": 900.00,
    "netSales": 5800.00,
    "totalTransactions": 87,
    "shiftsCount": 2,
    "shifts": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "shiftNumber": "SHIFT-20260305-001",
        "totalSales": 3500.00,
        "status": "closed"
      },
      {
        "_id": "507f1f77bcf86cd799439012",
        "shiftNumber": "SHIFT-20260305-002",
        "totalSales": 3200.00,
        "status": "open"
      }
    ]
  }
}
```

## Implementation Checklist

### Core Endpoints (Completed)
- [x] GET /terminals/:terminalId/previous-shift-summary
- [x] POST /shifts/open
- [x] POST /shifts/:shiftId/close
- [x] GET /shifts/:shiftId
- [x] POST /shifts/:shiftId/acknowledge-opening
- [x] GET /terminals/:terminalId/status
- [x] GET /terminals/:terminalId/current-shift
- [x] GET /terminals/:terminalId/daily-sales

### Database Models (Completed)
- [x] POSTerminal
- [x] POSShift
- [x] POSSale
- [x] Proper indexing for performance
- [x] Reference relationships

### Route Registration (Completed)
- [x] Module routes registered in server.js
- [x] v1 API versioning applied
- [x] All endpoints mounted at /api/v1/pos

### Pending Implementation
- [ ] Sale transaction endpoints (POST /sales/create)
- [ ] Return transaction endpoints (POST /returns/create)
- [ ] Payment processing endpoints
- [ ] Shift reports and analytics
- [ ] Transaction void/cancel endpoints
- [ ] Hardware integration (printer, scanner)
- [ ] Offline mode support

## Testing the Endpoints

### 1. Seed Test Data
```bash
node server/seeders/posSeedData.js
```

This creates:
- 2 test operators (operator1, operator2)
- 3 test terminals (POS-001, POS-002, POS-003)

### 2. Test Shift Opening
```bash
curl -X POST http://localhost:5000/api/v1/pos/shifts/open \
  -H "Content-Type: application/json" \
  -d '{
    "terminalId": "POS-001",
    "operatorId": "USER_ID_HERE",
    "operatorName": "John Operator",
    "openingBalance": 2500.00
  }'
```

### 3. Test Previous Shift Summary
```bash
curl -X GET http://localhost:5000/api/v1/pos/terminals/POS-001/previous-shift-summary
```

### 4. Test Shift Closing
```bash
curl -X POST http://localhost:5000/api/v1/pos/shifts/SHIFT_ID_HERE/close \
  -H "Content-Type: application/json" \
  -d '{
    "closingBalance": 4500.00,
    "reconcilationNotes": "All clear"
  }'
```

## Database Indexes

All models include proper indexing for performance:

**POSShift Indexes**:
- terminalId + status (for finding open shifts)
- operatorId + status (for operator tracking)
- openedAt (for date-based queries)
- shiftNumber (unique index)

**POSSale Indexes**:
- shiftNumber (for transaction lookup)
- terminalId + createdAt (for daily reports)
- operatorId + createdAt (for operator reports)

## Error Handling

All endpoints implement consistent error handling with proper HTTP status codes:

| Code | Meaning | Examples |
|------|---------|----------|
| 200 | Success | Shift details fetched |
| 201 | Created | Shift opened |
| 400 | Bad Request | Missing fields, invalid data |
| 404 | Not Found | Terminal, shift, or operator |
| 409 | Conflict | Terminal already has open shift |
| 500 | Server Error | Database connection, validation |

## Frontend Integration

The POS frontend uses these endpoints automatically through:

1. **POSLogin.jsx**
   - Gets available terminals: `GET /pos/terminals`
   - Gets operators: `GET /auth/users?role=cashier`

2. **POSShiftStart.jsx**
   - Loads previous shift: `GET /pos/terminals/:id/previous-shift-summary`
   - Opens new shift: `POST /pos/shifts/open`

3. **POSMainMenu.jsx**
   - Gets terminal status: `GET /pos/terminals/:id/status`
   - Gets daily sales: `GET /pos/terminals/:id/daily-sales`
   - Gets current shift: `GET /pos/terminals/:id/current-shift`
   - Closes shift: `POST /pos/shifts/:id/close`

## Next Steps

1. **Implement Sales Endpoints**: Handle transaction creation and recording
2. **Add Transaction Posting**: Update shift totals when transactions are created
3. **Implement Reports**: Sales analytics, operator performance, payment breakdown
4. **Hardware Integration**: Printer and scanner support
5. **Offline Mode**: LocalStorage sync when connection lost

## Development Notes

- All endpoints include proper validation
- Database relationships are properly normalized
- Variance calculations for reconciliation accuracy
- Transaction counts for audit trail
- Payment method breakdown for financial analysis
- Proper status management (open/closed/paused shifts)
