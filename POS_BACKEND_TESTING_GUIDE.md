# POS Backend Testing Quick Reference

## Prerequisites

1. **Start the backend server**
   ```bash
   cd d:\NEXIS-ERP\server
   npm start
   # Server runs on http://localhost:5000
   ```

2. **Seed test data** (in another terminal)
   ```bash
   node d:\NEXIS-ERP\server\seeders\posSeedData.js
   # Creates test operators and terminals
   ```

3. **Get MongoDB ready**
   Make sure MongoDB is running on your system

## Test Data Created

### Terminals
- **POS-001** - Main Counter
- **POS-002** - Express Lane  
- **POS-003** - Service Counter

### Operators (after seeding)
- **operator1** - John Operator
- **operator2** - Jane Cashier

### Important
You'll need the actual MongoDB ObjectId of an operator to test shift opens. After running the seeder, check the database or the seeder output.

## API Endpoints

### Base URL
```
http://localhost:5000/api/v1/pos
```

---

## 1. Get Previous Shift Summary
**Purpose**: Load previous day/shift closing balance for comparison

```bash
curl -X GET "http://localhost:5000/api/v1/pos/terminals/POS-001/previous-shift-summary" \
  -H "Accept: application/json"
```

**Expected Response** (First shift - no previous):
```json
{
  "success": true,
  "data": {
    "hasPreviousShift": false,
    "message": "No previous shift found - this is the first shift"
  }
}
```

**Expected Response** (Subsequent shift):
```json
{
  "success": true,
  "data": {
    "hasPreviousShift": true,
    "shiftNumber": "SHIFT-20260305-001",
    "operatorName": "John Operator",
    "closingBalance": 4500.00,
    "totalSales": 2500.00,
    "netSales": 2000.00,
    "transactionCount": 25
  }
}
```

---

## 2. Open New Shift
**Purpose**: Start a new shift with opening balance

```bash
curl -X POST "http://localhost:5000/api/v1/pos/shifts/open" \
  -H "Content-Type: application/json" \
  -d '{
    "terminalId": "POS-001",
    "operatorId": "OPERATOR_ID_FROM_DB",
    "operatorName": "John Operator",
    "openingBalance": 2500.00
  }'
```

**Replace `OPERATOR_ID_FROM_DB`** with actual MongoDB ObjectId from database

**Expected Response** (201 Created):
```json
{
  "success": true,
  "message": "Shift opened successfully",
  "data": {
    "shiftId": "507f1f77bcf86cd799439012",
    "shiftNumber": "SHIFT-20260305-001",
    "terminalId": "POS-001",
    "operatorName": "John Operator",
    "openedAt": "2026-03-05T08:00:00.000Z",
    "openingBalance": 2500.00,
    "expectedOpening": 0,
    "openingVariance": 2500.00,
    "status": "open"
  }
}
```

**Save the `shiftId`** for closing the shift later

**Error Cases**:
```bash
# Missing required field
curl -X POST "http://localhost:5000/api/v1/pos/shifts/open" \
  -H "Content-Type: application/json" \
  -d '{"terminalId": "POS-001"}'
# Response: 400 Bad Request

# Terminal doesn't exist
curl -X POST "http://localhost:5000/api/v1/pos/shifts/open" \
  -H "Content-Type: application/json" \
  -d '{
    "terminalId": "INVALID",
    "operatorId": "507f...",
    "operatorName": "Test",
    "openingBalance": 1000
  }'
# Response: 404 Not Found

# Terminal already has open shift
# Response: 409 Conflict
```

---

## 3. Get Current Shift
**Purpose**: Check if a terminal has an active shift

```bash
curl -X GET "http://localhost:5000/api/v1/pos/terminals/POS-001/current-shift" \
  -H "Accept: application/json"
```

**Expected Response** (With active shift):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "shiftNumber": "SHIFT-20260305-001",
    "status": "open",
    "operatorName": "John Operator"
  }
}
```

**Expected Response** (No active shift):
```json
{
  "success": true,
  "data": null,
  "message": "No active shift for this terminal"
}
```

---

## 4. Get Terminal Status
**Purpose**: Get terminal details including active shift and sales

```bash
curl -X GET "http://localhost:5000/api/v1/pos/terminals/POS-001/status" \
  -H "Accept: application/json"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "terminalId": "POS-001",
    "terminalName": "Main Counter",
    "status": "active",
    "currentShift": {
      "_id": "507f1f77bcf86cd799439012",
      "shiftNumber": "SHIFT-20260305-001",
      "status": "open",
      "openedAt": "2026-03-05T08:00:00Z",
      "operatorName": "John Operator",
      "transactionCount": 0,
      "totalSales": 0
    },
    "location": "Floor 1 - Counter A"
  }
}
```

---

## 5. Get Daily Sales
**Purpose**: Aggregate sales data for the terminal today

```bash
curl -X GET "http://localhost:5000/api/v1/pos/terminals/POS-001/daily-sales" \
  -H "Accept: application/json"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "date": "2026-03-05",
    "terminalId": "POS-001",
    "totalSales": 2500.00,
    "totalReturns": 200.00,
    "netSales": 2300.00,
    "totalTransactions": 23,
    "shiftsCount": 1,
    "shifts": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "shiftNumber": "SHIFT-20260305-001",
        "totalSales": 2500.00,
        "totalReturns": 200.00,
        "netSales": 2300.00,
        "transactionCount": 23,
        "status": "open"
      }
    ]
  }
}
```

---

## 6. Get Shift Details
**Purpose**: Retrieve complete shift information

```bash
curl -X GET "http://localhost:5000/api/v1/pos/shifts/SHIFT_ID" \
  -H "Accept: application/json"
```

**Replace `SHIFT_ID`** with the shiftId from shift opening response

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "shiftNumber": "SHIFT-20260305-001",
    "terminalId": "POS-001",
    "operatorName": "John Operator",
    "status": "open",
    "openingBalance": 2500.00,
    "expectedOpening": 0,
    "openingVariance": 2500.00,
    "openingVarianceAcknowledged": false,
    "transactionCount": 0,
    "totalSales": 0,
    "totalReturns": 0,
    "netSales": 0,
    "openedAt": "2026-03-05T08:00:00Z",
    "closedAt": null,
    "status": "open"
  }
}
```

**Error**:
```bash
# Invalid shift ID format
# Response: 500 (MongoDB validation error)

# Non-existent shift ID
# Response: 404 Not Found
```

---

## 7. Acknowledge Opening Variance
**Purpose**: Operator confirms they've acknowledged the opening variance

```bash
curl -X POST "http://localhost:5000/api/v1/pos/shifts/SHIFT_ID/acknowledge-opening" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response**:
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

---

## 8. Close Shift
**Purpose**: End shift and reconcile balance

```bash
curl -X POST "http://localhost:5000/api/v1/pos/shifts/SHIFT_ID/close" \
  -H "Content-Type: application/json" \
  -d '{
    "closingBalance": 4200.00,
    "reconcilationNotes": "All looks good"
  }'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "Shift closed successfully",
  "data": {
    "shiftId": "507f1f77bcf86cd799439012",
    "shiftNumber": "SHIFT-20260305-001",
    "closingBalance": 4200.00,
    "expectedClosing": 2500.00,
    "closingVariance": 1700.00,
    "totalSales": 2500.00,
    "totalReturns": 200.00,
    "netSales": 2300.00,
    "closedAt": "2026-03-05T16:00:00Z",
    "status": "closed"
  }
}
```

**Note**: `closingVariance` is calculated as `closingBalance - expectedClosing`

**Error Cases**:
```bash
# Already closed shift
# Response: 409 Conflict

# Missing closingBalance
# Response: 400 Bad Request

# Non-existent shift
# Response: 404 Not Found
```

---

## Complete Test Workflow

### Step 1: Get Previous Shift (Check for variance)
```bash
curl -X GET "http://localhost:5000/api/v1/pos/terminals/POS-001/previous-shift-summary"
```

### Step 2: Open Shift
```bash
SHIFT_RESPONSE=$(curl -X POST "http://localhost:5000/api/v1/pos/shifts/open" \
  -H "Content-Type: application/json" \
  -d '{
    "terminalId": "POS-001",
    "operatorId": "OPERATOR_ID",
    "operatorName": "John Operator",
    "openingBalance": 2500.00
  }')

# Extract shiftId from response
SHIFT_ID=$(echo $SHIFT_RESPONSE | grep -o '"shiftId":"[^"]*"' | cut -d'"' -f4)
```

### Step 3: Check Current Shift
```bash
curl -X GET "http://localhost:5000/api/v1/pos/terminals/POS-001/current-shift"
```

### Step 4: Acknowledge Opening Variance (if needed)
```bash
curl -X POST "http://localhost:5000/api/v1/pos/shifts/$SHIFT_ID/acknowledge-opening" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Step 5: Check Daily Sales
```bash
curl -X GET "http://localhost:5000/api/v1/pos/terminals/POS-001/daily-sales"
```

### Step 6: Close Shift
```bash
curl -X POST "http://localhost:5000/api/v1/pos/shifts/$SHIFT_ID/close" \
  -H "Content-Type: application/json" \
  -d '{
    "closingBalance": 4200.00,
    "reconcilationNotes": "End of shift"
  }'
```

### Step 7: Verify Shift is Closed
```bash
curl -X GET "http://localhost:5000/api/v1/pos/shifts/$SHIFT_ID"
```

---

## Troubleshooting

### Server Not Running
```bash
cd d:\NEXIS-ERP\server
npm start
# Check port 5000 is available
```

### MongoDB Connection Error
- Ensure MongoDB is running
- Check connection string in `.env` file
- Default: `mongodb://localhost:27017/nexis-erp`

### Invalid Request Format
- Ensure JSON is valid (use https://jsonformatter.org)
- Check required fields are included
- Verify terminalId matches seeded data

### CORS Errors
- Backend CORS is configured for `http://localhost:5173`
- If frontend is on different port, update `.env`:
  ```
  CORS_ORIGIN=http://localhost:YOUR_PORT
  ```

### Operator ID Not Found
- After seeding, query database for operator IDs:
  ```javascript
  db.users.findOne({ username: "operator1" })._id
  ```
- Copy the returned ObjectId

---

## Quick Integration Test

Use this to verify backend works with frontend:

1. Start servers
2. Open http://localhost:5173
3. Select terminal POS-001 and operator operator1
4. POSShiftStart should load previous shift summary ✅
5. Enter opening balance (2500) and click "Open Shift"
6. Should see POSMainMenu with active shift ✅
7. Check shift status on dashboard
8. In POSPayments, click "Close Shift" ✅
9. Verify reconciliation

---

**All endpoints tested and ready for integration!**
