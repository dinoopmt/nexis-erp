# Product Expiry Tracking - Two Levels Explained

## Example: Tracking Milk Product with Multiple Batches

Let's say you have a product: **Milk (1L)**

---

## Level 1: Simple Product-Level Tracking
*(For products with single manufacturing/expiry dates)*

**Form Fields on Product:**
```
Track Expiry: ✓ (checkbox enabled)
Mfg Date: 2024-01-01
Expiry Date: 2025-01-01
Alert Days: 30
Batch Tracking: ☐ (NOT checked)
```

**Use Case:**
- Single batch per product
- All units expire on same date
- Example: You only have ONE supplier, ONE delivery time

**Problem:** 
- What if you receive milk on different dates?
- 100L received on Jan 1 expires Jan 31
- 50L received on Jan 15 expires Feb 14
- Product form can only show ONE expiry date!

---

## Level 2: Batch-Level Tracking (FOR YOUR CASE!)
*(For products with multiple batches/different manufacturing dates)*

**Step 1: Enable Batch Tracking on Product**
```
Track Expiry: ✓ (checkbox enabled)
Mfg Date: 2024-01-01
Expiry Date: 2025-01-01
Alert Days: 30
Batch Tracking: ✓ (checkbox enabled) ← THIS IS KEY
```

**Step 2: Create Individual Batches**
Each shipment/lot gets its own batch record:

```
BATCH 1 - Milk from Supplier A
├─ Batch Number: MILK-2024-001
├─ Manufacturing Date: 2024-01-01
├─ Expiry Date: 2024-01-31
├─ Quantity: 100L
└─ Cost per Unit: $2

BATCH 2 - Milk from Supplier A
├─ Batch Number: MILK-2024-002
├─ Manufacturing Date: 2024-01-15
├─ Expiry Date: 2024-02-14
├─ Quantity: 50L
└─ Cost per Unit: $2

BATCH 3 - Milk from Supplier B
├─ Batch Number: MILK-2024-003
├─ Manufacturing Date: 2024-01-10
├─ Expiry Date: 2024-02-09
├─ Quantity: 75L
└─ Cost per Unit: $1.80
```

---

## How It Works in System

### Creating Batches
```
POST /api/v1/stock-batches
{
  "productId": "507f1f77bcf86cd799439011",
  "batchNumber": "MILK-2024-001",
  "manufacturingDate": "2024-01-01",
  "expiryDate": "2024-01-31",
  "quantity": 100,
  "costPerUnit": 2.00,
  "supplier": "Supplier A"
}
```

### Checking Expiring Batches
```
GET /api/v1/stock-batches/expiring/list?days=7

Response shows:
- Batch MILK-2024-001 expires in 5 days ⚠️
- Batch MILK-2024-003 expires in 3 days 🔴
- Batch MILK-2024-002 OK ✓
```

### Checking All Batches
```
GET /api/v1/stock-batches/product/507f1f77bcf86cd799439011

Shows all batches with their own dates:
✓ MILK-2024-001: Expires 2024-01-31 (100L, $2 each)
✓ MILK-2024-002: Expires 2024-02-14 (50L, $2 each)
✓ MILK-2024-003: Expires 2024-02-09 (75L, $1.80 each)
```

---

## Using FIFO (First In First Out)

When selling milk, use FIFO to sell oldest batch first:

```
GET /api/v1/stock-batches/fifo/507f1f77bcf86cd799439011

Returns: MILK-2024-001 (manufactured earliest)
```

**Sales Transaction:**
```
Customer buys 20L milk
→ Use FIFO batch (MILK-2024-001)
→ 20L deducted from Batch 1
→ Batch 1 now has 80L remaining
```

---

## Decision Tree: Which Level to Use?

```
Do you have DIFFERENT manufacturing dates for same product?
│
├─ YES → Use BATCH LEVEL TRACKING (enable batch tracking)
│   ├─ Create separate batch for each shipment
│   ├─ Use FIFO when selling
│   └─ Track multiple expiry dates per product
│
└─ NO → Use SIMPLE PRODUCT LEVEL (disable batch tracking)
    ├─ Set product expiry once
    └─ All units have same expiry date
```

---

## Complete Example: Milk Product

### Product Setup
```javascript
{
  name: "Milk 1L",
  itemcode: "MILK-001",
  trackExpiry: true,           // Enable expiry tracking
  manufacturingDate: "2024-01-01",
  expiryDate: "2024-01-31",    // This is just default/reference
  expiryAlertDays: 7,          // Alert 7 days before expiry
  batchTrackingEnabled: true   // ENABLE BATCH TRACKING!
}
```

### Create Batch 1 (Arrived Jan 1)
```
POST /api/v1/stock-batches
{
  productId: "MILK-001-ID",
  batchNumber: "BATCH-001",
  manufacturingDate: "2024-01-01",
  expiryDate: "2024-01-31",
  quantity: 100,
  costPerUnit: 2.00
}
```

### Create Batch 2 (Arrived Jan 15)
```
POST /api/v1/stock-batches
{
  productId: "MILK-001-ID",
  batchNumber: "BATCH-002",
  manufacturingDate: "2024-01-15",
  expiryDate: "2024-02-14",
  quantity: 50,
  costPerUnit: 2.00
}
```

### Check Status
```
GET /api/v1/stock-batches/product/MILK-001-ID

Total batches: 2
Total quantity: 150L
├─ BATCH-001: 100L, expires 2024-01-31 (EXPIRING SOON! ⚠️)
└─ BATCH-002: 50L, expires 2024-02-14 (Fresh ✓)
```

### Make Sale (20L)
```
1. Get FIFO batch: BATCH-001 (oldest)
2. Consume 20L from BATCH-001
3. POST /api/v1/stock-batches/BATCH-001-ID/consume
   { quantityToUse: 20 }
4. BATCH-001 now has 80L remaining
```

---

## API Flow for Batch Tracking

```
1. Enable on Product
   ├─ Set trackExpiry: true
   └─ Set batchTrackingEnabled: true

2. Create Batches (one per shipment)
   ├─ POST /stock-batches (batch 1)
   ├─ POST /stock-batches (batch 2)
   └─ POST /stock-batches (batch 3)

3. Monitor Expiry
   ├─ GET /stock-batches/expiring/list (next 7 days)
   ├─ GET /stock-batches/expired/list (already expired)
   └─ GET /stock-batches/stats/:productId (overall stats)

4. Sell Using FIFO
   ├─ GET /stock-batches/fifo/:productId (get oldest)
   └─ POST /stock-batches/:batchId/consume (use quantity)

5. Track Consumption
   ├─ Monitor availableQuantity per batch
   └─ Move to EXPIRED when fully consumed
```

---

## Summary

| Feature | Product Level | Batch Level |
|---------|---------------|------------|
| **Use Case** | Same mfg date | Different mfg dates |
| **Setup** | Simple form | Product + Batches |
| **Track** | 1 expiry date | Multiple dates |
| **FIFO** | N/A | Automatic |
| **Examples** | Fresh juice | Milk, vaccines, food |
| **Complexity** | Low | Medium |

---

## Video Example: Two Milk Deliveries

**Scenario:**
- Jan 1: Receive 100L milk (expires Jan 31)
- Jan 15: Receive 50L milk (expires Feb 14)
- Jan 25: Customer wants 30L milk

**Process:**
```
1. Create Batch 1 → MILK-2024-001 (100L, expires Jan 31)
2. Create Batch 2 → MILK-2024-002 (50L, expires Feb 14)
3. Check /stock-batches/expiring/list?days=7
   → Batch 1 expiring in 6 days! ⚠️
4. Customer order: 30L
5. Get FIFO batch → Batch 1 (oldest/expires sooner)
6. Consume 30L from Batch 1
7. Batch 1 now: 70L remaining (expires Jan 31)
8. Next customer gets Batch 1 again (70L) then Batch 2 (50L)
9. Jan 31: Batch 1 expires → mark as EXPIRED
10. Feb 14: Batch 2 expires → mark as EXPIRED
```

---

## Which Should I Use?

**Use BATCH TRACKING if:**
- ✓ You receive same product on different dates
- ✓ Different batches have different expiry dates
- ✓ You want FIFO selling
- ✓ You need to track which batch was used
- ✓ Food, pharmaceuticals, perishables

**Use SIMPLE TRACKING if:**
- ✓ All units of product expire same date
- ✓ Non-perishable items
- ✓ No need to track individual batches
- ✓ Just want basic expiry warning

---

**TL;DR:** For Milk with different shipments → Enable Batch Tracking and create a batch for each delivery!
