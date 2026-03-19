# FOC & Line-Wise Discount - Testing & Verification Guide

## What Was Fixed

### ✅ Line-Wise Discount
Already working correctly - discount applied per GRN item

### ✅ FOC (Free on Cost) Items - NOW FIXED
Free items are now properly excluded from cost calculations

---

## How It Works Now

### Frontend (grnCalculations.js)
```javascript
Step 1: Calculate Gross Cost
  gross = qty × unitCost

Step 2: Apply Line Discount
  netAfterDiscount = gross - lineDiscount

Step 3: ✅ Deduct FOC Items
  focCost = focQty × unitCost
  paidCost = netAfterDiscount - focCost

Step 4: Calculate Tax on PAID amount only
  tax = paidCost × taxPercent

Step 5: Final Cost = paidCost + tax
```

### Backend (GRNStockUpdateService.js)
```javascript
Step 1: Calculate Effective Unit Cost
  itemNetCost = paid cost (already has FOC deduction)
  effectiveUnitCost = itemNetCost / totalQty

Step 2: Apply to Costing Methods

  FIFO:  newCost = effectiveUnitCost
  LIFO:  newCost = effectiveUnitCost
  WAC:   newCost = (oldValue + paidValue) / totalQty
```

---

## 4 Test Scenarios

### Test 1: Line Discount Only (No FOC)

**Input:**
```
Item: PROD-001
Qty: 50 units
Unit Cost: AED 100
Line Discount: 500 (10% off)
FOC Qty: 0
Tax: None
```

**Frontend Calculation:**
```
Gross:        50 × 100 = 5,000
Discount:     -500
Net:          4,500
FOC:          0
Paid:         4,500
Final Cost:   4,500
```

**Backend Cost Update:**
```
Effective Unit Cost = 4,500 / 50 = 90

Old Stock: 100 @ 50 = 5,000
New Value: 4,500
WAC = (5,000 + 4,500) / 150 = 63.33

Result: newCost = 63.33 ✓
```

**Expected Response:**
```json
{
  "effectiveUnitCost": 90,
  "itemDiscount": 500,
  "focQty": 0,
  "focCost": 0,
  "paidAmount": 4500,
  "newCost": 63.33
}
```

---

### Test 2: FOC Only (No Discount)

**Input:**
```
Item: PROD-002
Qty: 50 units
Unit Cost: AED 100
Line Discount: 0
FOC Qty: 10
Tax: None
```

**Frontend Calculation:**
```
Gross:        50 × 100 = 5,000
Discount:     0
Net:          5,000
FOC Cost:     10 × 100 = 1,000
Paid:         5,000 - 1,000 = 4,000
Final Cost:   4,000
```

**Backend Cost Update:**
```
Effective Unit Cost = 4,000 / 50 = 80
(Cost spread across all 50 units, but FOC deducted from total)

Old Stock: 100 @ 50 = 5,000
New Value: 4,000
WAC = (5,000 + 4,000) / 150 = 60

Result: newCost = 60 ✓
```

**Expected Response:**
```json
{
  "effectiveUnitCost": 80,
  "itemDiscount": 0,
  "focQty": 10,
  "focCost": 1000,
  "paidAmount": 4000,
  "newCost": 60
}
```

---

### Test 3: Line Discount + FOC

**Input:**
```
Item: PROD-003
Qty: 50 units
Unit Cost: AED 100
Line Discount: 500 (10%)
FOC Qty: 10
Tax: Exclusive 5%
```

**Frontend Calculation:**
```
Gross:        50 × 100 = 5,000
Discount:     -500
Net:          4,500
FOC Cost:     10 × 100 = 1,000
Paid:         4,500 - 1,000 = 3,500
Tax (5%):     3,500 × 0.05 = 175
Final Cost:   3,500 + 175 = 3,675
```

**Backend Cost Update:**
```
Effective Unit Cost = 3,500 / 50 = 70
(Most cost-effective due to both discount and FOC)

Old Stock: 100 @ 50 = 5,000
New Value: 3,500
WAC = (5,000 + 3,500) / 150 = 56.67

Result: newCost = 56.67 ✓
```

**Expected Response:**
```json
{
  "effectiveUnitCost": 70,
  "itemDiscount": 500,
  "focQty": 10,
  "focCost": 1000,
  "paidAmount": 3500,
  "newCost": 56.67,
  "taxAmount": 175
}
```

---

### Test 4: Line Discount + FOC + Header Discount

**Input:**
```
Item: PROD-004
Qty: 50 units, Cost: 100, Discount: 500, FOC: 10

GRN Total Items Cost: 25,000
GRN Header Discount: 2,500 (10%)
Tax: Inclusive 5%
```

**Frontend Calculation:**
```
Step 1: Item Gross = 50 × 100 = 5,000
Step 2: After Line Disc = 5,000 - 500 = 4,500
Step 3: After FOC = 4,500 - 1,000 = 3,500
        (FOC already deducted by frontend)

Step 4: Tax on 3,500:
        netCost / (1 + 0.05) = 3,500 / 1.05 = 3,333.33
        taxAmount = 3,500 - 3,333.33 = 166.67
        finalCost = 3,500 (tax inclusive)
```

**Backend Calculation:**
```
Step 1: Item Net Cost = 3,500 (from frontend with FOC)
Step 2: Proportional Header Discount:
        Item Share = (5,000 / 25,000) × 2,500 = 500
        After Header = 3,500 - 500 = 3,000

Step 3: Effective Unit Cost = 3,000 / 50 = 60

Step 4: WAC Update:
        Old Stock: 100 @ 50 = 5,000
        New Value: 3,000
        WAC = (5,000 + 3,000) / 150 = 53.33

Result: newCost = 53.33 ✓
```

**Expected Response:**
```json
{
  "effectiveUnitCost": 60,
  "itemDiscount": 500,
  "headerDiscountApplied": 500,
  "focQty": 10,
  "focCost": 1000,
  "paidAmount": 3000,
  "newCost": 53.33,
  "taxAmount": 166.67
}
```

---

## Verification Checklist

### Frontend Verification
- [ ] FOC Qty field is editable only when FOC checkbox is enabled
- [ ] When FOC Qty > 0, Final Cost reduces correctly
- [ ] Discount applied before FOC deduction
- [ ] Tax calculated on paid amount, not gross
- [ ] GRN form displays both discount and FOC in summary

**Check by opening GRN form:**
```
1. Add product with Qty: 50, Cost: 100
2. Set Discount: 500
3. Set FOC: ✓ (checkbox)
4. Set FOC Qty: 10
5. Expected in summary:
   - Gross: 5,000
   - Disc: -500
   - FOC: -1,000
   - Net: 3,500
```

### Backend Verification
- [ ] calculateEffectiveUnitCost() excludes FOC
- [ ] FIFO uses effective cost
- [ ] LIFO uses effective cost
- [ ] WAC includes FOC deduction
- [ ] Response includes FOC details

**Check by posting GRN:**
```
POST /api/v1/grn/{id}/post

Response should include:
{
  "costUpdates": [{
    "focQty": 10,
    "focCost": 1000,
    "paidAmount": 3500,
    "effectiveUnitCost": 70,
    "newCost": 56.67
  }]
}
```

### Stock Update Verification
- [ ] Product quantityInStock increased by full qty (50, not 40)
- [ ] Product cost updated to effective cost (56.67, not 100)
- [ ] Unit variants updated proportionally

**Check product after posting:**
```javascript
GET /api/v1/products/{productId}

Product should show:
- quantityInStock: 150 (100 + 50)
- cost: 56.67 (effective after discount and FOC)
- lastStockUpdate: [timestamp]
```

### Batch Creation Verification
- [ ] Batch created with correct quantity (50 units)
- [ ] Batch cost = effective cost (80, 70, 60 depending on discount/FOC)
- [ ] Batch includes FOC info if trackable

**Check batch after posting:**
```javascript
GET /api/v1/stock-batches?productId={id}

Batch should show:
- quantity: 50
- costPerUnit: 80 (or 70/60 with discounts)
- focQty: 10 (if tracked)
```

---

## Real-World Examples

### Example 1: Wholesale Purchase with Promotional FOC

**Scenario:**
```
Buy 100 bottles for AED 50 each
Get 20 free bottles (promotional FOC)
Total received: 120 bottles at AED 50 each = AED 6,000
Free cost: 20 × 50 = AED 1,000
Actual paying: AED 5,000
```

**Calculation:**
```
Effective Unit Cost = 5,000 / 120 = 41.67 per bottle
(Not AED 50! Free items reduce effective cost)

Product cost updates to: 41.67
Next sales will use this lower cost
```

### Example 2: Bulk Purchase with Volume Discount

**Scenario:**
```
Buy 200 cartons @ AED 100 each
10% bulk discount
No FOC
Total: 200 × 100 = 20,000 - 2,000 = 18,000
```

**Calculation:**
```
Effective Unit Cost = 18,000 / 200 = 90 per carton
(Down from 100 due to 10% discount)

Product cost updates to: 90
```

### Example 3: Complex Deal - Discount + FOC

**Scenario:**
```
Buy 200 units @ AED 50 each
5% line discount = 500
Plus 30 units free (promotional)
Total selling: 200 units, Cost: 9,500

Breakdown:
- Gross: 200 × 50 = 10,000
- Discount: -500
- After Disc: 9,500
- FOC Value: 30 × 50 = 1,500
- Paid: 9,500 - 1,500 = 8,000
```

**Calculation:**
```
Effective Unit Cost = 8,000 / 200 = 40 per unit
(Cheapest option - benefits from both discount and FOC)

Product cost updates to: 40
Inventory shows: 200 units
GL shows: 8,000 cost
```

---

## Response Format Examples

### FIFO with FOC
```json
{
  "costingMethod": "FIFO",
  "oldCost": 50,
  "newCost": 80,
  "itemOriginalUnitCost": 100,
  "effectiveUnitCost": 80,
  "itemDiscount": 0,
  "headerDiscountApplied": 0,
  "focQty": 10,
  "focCost": 1000,
  "paidAmount": 4000,
  "difference": 30
}
```

### WAC with Line Discount + FOC
```json
{
  "costingMethod": "WAC",
  "oldCost": 50,
  "newCost": 56.67,
  "itemOriginalUnitCost": 100,
  "effectiveUnitCost": 70,
  "itemDiscount": 500,
  "headerDiscountApplied": 0,
  "focQty": 10,
  "focCost": 1000,
  "paidAmount": 3500,
  "difference": 6.67
}
```

---

## Debugging Tips

**If cost is still too high:**
- [ ] Check if FOC quantity is being sent from frontend
- [ ] Verify item.netCost includes FOC deduction
- [ ] Check if effective unit cost calculation fails

**If cost is negative or zero:**
- [ ] Check if FOC quantity > total quantity
- [ ] Verify discount isn't > gross cost
- [ ] Check header discount distribution

**If stock is wrong:**
- [ ] Stock should be += full quantity (including FOC)
- [ ] Cost should be lower due to FOC
- [ ] Both are correct if different

---

## Database Field Validation

After posting GRN, verify these fields in products collection:

```javascript
{
  _id: ObjectId,
  quantityInStock: 150,           // Includes FOC qty
  cost: 56.67,                    // After discount & FOC
  costingMethod: "WAC",
  lastStockUpdate: ISODate,
  lastStockUpdateBy: "userId",
  packingUnits: [
    {
      cost: 567,                  // Updated proportionally
      marginAmount: 142           // Recalculated
    }
  ]
}
```

Verify in stock_batches collection:

```javascript
{
  productId: ObjectId,
  batchNumber: "GRN-2024-001-BATCH",
  quantity: 50,                   // Full qty
  costPerUnit: 70,                // After discount & FOC
  focQty: 10,                     // Tracked separately
  batchStatus: "ACTIVE"
}
```

---

## Summary of Changes

| Component | Change | Impact |
|-----------|--------|--------|
| **Frontend** | FOC cost deducted before tax | More accurate payment calculation |
| **Backend** | FOC excluded from cost calc | Product cost reflects actual value |
| **Stock Update** | Qty = full (with FOC) | Correct inventory |
| **Cost Update** | Cost = paid / total qty | Fair cost allocation |
| **WAC** | FOC deducted from new value | Accurate weighted average |
| **Response** | FOC fields included | Full transparency |

---

## Testing Commands

```bash
# 1. Create GRN with FOC + Discount
POST /api/v1/grn
{
  "items": [{
    "productId": "prod1",
    "quantity": 50,
    "unitCost": 100,
    "itemDiscount": 500,
    "foc": true,
    "focQty": 10,
    "taxType": "exclusive",
    "taxPercent": 5
  }]
}

# 2. Post GRN (triggers cost update)
POST /api/v1/grn/{grnId}/post

# 3. Verify product cost
GET /api/v1/products/{productId}
# Should show: cost = 70, quantityInStock = 150

# 4. Check cost update details
GET /api/v1/grn/{grnId}
# Response should include:
# effectiveUnitCost: 70
# focQty: 10
# focCost: 1000
# paidAmount: 3500
```

