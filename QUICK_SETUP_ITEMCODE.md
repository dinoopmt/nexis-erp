# 🚀 Quick Setup: Initialize Product Itemcode Counter

Your sequences collection already exists! Now just initialize the product_itemcode counter.

## One Command to Run

```bash
cd d:\NEXIS-ERP\server
node scripts/initializeProductItemcodeCounter.js
```

## What It Will Do

✅ Scan your products collection to find the current max itemcode
✅ Create (or update) the `product_itemcode` counter in sequences
✅ Set it to your current max so next product gets max+1
✅ Test that atomic increment works
✅ Add unique index for safety

## Expected Output

```
🔄 Initializing Product Itemcode Counter...

✅ Connected to MongoDB

📊 Finding current maximum itemcode from products collection...
  ✅ Found 150 products
  ✅ Current max itemcode: 1050

🔍 Checking for existing counter...

💾 Initializing counter in sequences collection...
  ✅ Counter initialized:
     - Module: product_itemcode
     - Financial Year: 2026-2027
     - Prefix: PROD
     - Current lastNumber: 1050

🔐 Adding unique index to prevent duplicates...
  ✅ Unique index created

✅ Testing counter atomic increment...
  ✅ Next itemcode would be: 1051
  ✅ Reverting test increment...

✅ INITIALIZATION COMPLETE!

📝 Summary:
   - Module: product_itemcode
   - Financial Year: 2026-2027
   - Current max itemcode: 1050
   - Next itemcode will be: 1051
   - Counter ready for production use ✅

📋 Database entry:
   db.sequences.findOne({ module: 'product_itemcode', financialYear: '2026-2027' })
```

## After Running

### Verify in MongoDB Compass

```javascript
// Check new counter
db.sequences.findOne({ module: 'product_itemcode' })

// Should see something like:
{
  _id: ObjectId(...),
  module: "product_itemcode",
  financialYear: "2026-2027",
  prefix: "PROD",
  lastNumber: 1050
}
```

### Test Product Creation

1. Restart your Node server (Ctrl+C, then start again)
2. Try creating a new product via the API/UI
3. Check that itemcode increments correctly (1051, 1052, etc.)

## Troubleshooting

**"Cannot find module"**
```bash
# Make sure you're in the server directory
cd d:\NEXIS-ERP\server
# Check .env file exists
cat .env | findstr MONGODB_URI
```

**"MONGODB_URI not found"**
```bash
# Verify .env has MongoDB connection
# Should have:  MONGODB_URI=mongodb://localhost:27017/nexis
# (or your actual MongoDB URL)
```

**"E11000 duplicate key error"**
```bash
# This means the counter already exists and can't create another
# Just run it again - it will update the existing one ✅
```

## System Ready ✅

Once initialized:
- Every product gets a unique, sequential itemcode
- Even with 1000 concurrent requests, NO conflicts
- Fast O(1) performance (doesn't scan products)
- Works perfectly with 300k+ products
