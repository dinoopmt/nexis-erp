# Product Itemcode Counter Initialization

## Overview
The system uses a **Counter (sequences collection)** to generate unique itemcodes atomically. This prevents race conditions and ensures O(1) performance even with 300k+ products.

## Step 1: Run the Initialization Script

```bash
cd server
node scripts/initializeProductItemcodeCounter.js
```

## Expected Output
```
🔄 Initializing Product Itemcode Counter...

📊 Finding current maximum itemcode from products collection...
  ✅ Found 150 products
  ✅ Current max itemcode: 1050

💾 Initializing counter in sequences collection...
  ✅ Counter initialized:
     - Module: product_itemcode
     - Financial Year: 2025-26
     - Current lastNumber: 1050

🔐 Adding unique index to prevent duplicates...
  ✅ Unique index created

✅ Testing counter atomic increment...
  ✅ Next itemcode would be: 1051
  ✅ Reverting test increment...

✅ INITIALIZATION COMPLETE!

📝 Summary:
   - Max itemcode initialized: 1050
   - Next itemcode will be: 1051
   - Counter ready for production use ✅
```

## Step 2: Verify in MongoDB

```javascript
// Check the counter entry
db.sequences.findOne({ module: 'product_itemcode' })

// Expected result:
{
  _id: ObjectId("..."),
  module: "product_itemcode",
  financialYear: "2025-26",
  prefix: "PROD",
  lastNumber: 1050
}

// Check the index
db.sequences.getIndexes()

// Should have unique index on (module, financialYear)
```

## Step 3: Test Product Creation

Once initialized, create a new product:
- It will automatically use itemcode from counter
- Each product gets a unique, sequential itemcode
- Even with 100 concurrent requests, no conflicts

## How It Works

```
User creates product
    ↓
API calls: getNextItemCodeFromCounter()
    ↓
MongoDB atomic operation:
  Counter.findOneAndUpdate(
    { module: 'product_itemcode' },
    { $inc: { lastNumber: 1 } }
  )
    ↓
Returns: 1051
    ↓
Product saved with itemcode: 1051
    ↓
Next product gets: 1052
    ↓
No race conditions, O(1) performance ✅
```

## Benefits

✅ **Atomic:** No race conditions, even with 1000 concurrent requests
✅ **Fast:** O(1) performance - doesn't scan products collection
✅ **Sequential:** Guaranteed sequential itemcodes (1001, 1002, 1003...)
✅ **Scalable:** Same speed with 100k or 300k+ products
✅ **Reliable:** Single source of truth (counter document)

## Troubleshooting

**Problem:** Script fails with "MONGODB_URI not set"
```bash
# Solution: Set environment variable
export MONGODB_URI=mongodb://localhost:27017/nexis
node scripts/initializeProductItemcodeCounter.js
```

**Problem:** "E11000 duplicate key error" when creating counters
```bash
# Solution: Remove old counter first (if exists from previous attempt)
db.sequences.deleteOne({ module: 'product_itemcode' })
# Then run initialization again
```

**Problem:** Counter not incrementing
```bash
# Check counter value
db.sequences.findOne({ module: 'product_itemcode' })

# Manually set if needed
db.sequences.updateOne(
  { module: 'product_itemcode' },
  { $set: { lastNumber: 1000 } }
)
```

## System Architecture

```
Product Creation Flow:
┌─────────────────────────────────────┐
│   User clicks "Add Product"         │
└────────────────┬────────────────────┘
                 ↓
         ┌──────────────────┐
         │ Generate itemcode│
         └────────┬─────────┘
                  ↓
      ┌───────────────────────┐
      │ getNextItemCodeFromDB |
      └────────┬──────────────┘
               ↓
        ┌──────────────────┐
        │   ATOMIC:        │
        │ Counter.increment│
        │ (O(1) - instant) │
        └────────┬─────────┘
                 ↓
         ┌──────────────────┐
         │ Returns 1051     │
         └────────┬─────────┘
                  ↓
        ┌──────────────────┐
        │ Save Product with│
        │ itemcode: 1051   │
        └────────┬─────────┘
                 ↓
        ┌──────────────────┐
        │   Success ✅     │
        └──────────────────┘
```

---

**Next:** Run the initialization script above, then try creating a product!
