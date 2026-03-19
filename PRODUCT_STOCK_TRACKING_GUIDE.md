# Product Stock Tracking System - Complete Implementation Guide

**Date:** March 4, 2026  
**Status:** Framework Ready - Implementation Available  
**Scope:** Stock In, Stock Out, Adjustments, Current Stock, Batch Tracking

---

## 1. STOCK TRACKING OVERVIEW

### What is Tracked?

```
Product Stock Movement:
├── Stock IN (Purchase/Receipt)
│   └── Add quantity from vendor purchase
├── Stock OUT (Sales/Issue)  
│   └── Reduce quantity from sales invoice
├── Stock ADJUSTMENT (Reconciliation)
│   └── Manual adjustment (damage, loss, expiry)
└── Current Stock (Real-Time)
    └── Available quantity for sale (calculated)
```

### Key Concepts

| Concept | Definition | Example |
|---------|-----------|---------|
| **Batch** | Individual purchase lot with cost | 100 units @ $10/unit from Vendor A on Dec 1 |
| **Movement** | Every stock change transaction | Sale of 5 units on Dec 5 |
| **Current Stock** | Running total available | If 100 units purchased, 5 sold, 95 remaining |
| **Costing** | How to value inventory | FIFO uses oldest batch first |

---

## 2. DATABASE MODELS (Already Exist)

### Model 1: InventoryBatch (`server/Models/InventoryBatch.js`)

**Purpose:** Track individual purchase lots

```javascript
{
  _id: ObjectId,
  productId: ObjectId,          // Which product
  batchNumber: String,          // Unique batch code (e.g., "BATCH-001")
  purchasePrice: Number,        // Cost per unit
  quantity: Number,             // Total units purchased
  quantityRemaining: Number,    // Units still available (auto-updated)
  purchaseDate: Date,           // When purchased
  vendorId: ObjectId,           // From which vendor
  expiryDate: Date,             // Expiry if applicable
  lotNumber: String,            // Manufacturing lot
  batchStatus: String,          // 'ACTIVE' | 'CLOSED' | 'EXPIRED'
  costMovements: [ObjectId],    // Links to all movements of this batch
  createdAt: Date
}
```

**Key Feature:** `quantityRemaining` auto-decreases when items are sold

### Model 2: StockMovement (`server/Models/StockMovement.js`)

**Purpose:** Track every stock change event

```javascript
{
  _id: ObjectId,
  productId: ObjectId,
  batchId: ObjectId,                    // Which batch affected
  movementType: String,                 // 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT' | 'RETURN'
  quantity: Number,                     // Units moved
  unitCost: Number,                     // Cost per unit
  totalAmount: Number,                  // quantity × unitCost
  reference: String,                    // Document number (e.g., "INV-001")
  referenceId: ObjectId,                // Link to sales invoice, PO, etc
  referenceType: String,                // 'SALES_INVOICE' | 'PURCHASE_ORDER' | 'STOCK_ADJUSTMENT'
  costingMethodUsed: String,            // 'FIFO' | 'LIFO' | 'WAC'
  documentDate: Date,                   // When transaction occurred
  reasonCode: String,                   // For adjustments: 'DAMAGE' | 'LOSS' | 'EXPIRY'
  notes: String,
  createdBy: ObjectId,                  // User who created
  createdAt: Date
}
```

**Every transaction creates a StockMovement record:**
- Sale → Creates OUTBOUND movement
- Purchase receipt → Creates INBOUND movement
- Manual count → Creates ADJUSTMENT movement

---

## 3. CALCULATING CURRENT STOCK

### Algorithm

```javascript
/**
 * Current Stock = Sum of quantityRemaining across all ACTIVE batches
 */
const getCurrentStock = async (productId) => {
  const batches = await InventoryBatch.find({
    productId: productId,
    batchStatus: 'ACTIVE'  // Only count active batches
  });
  
  const totalStock = batches.reduce(
    (sum, batch) => sum + batch.quantityRemaining,
    0
  );
  
  return totalStock;
};
```

### Example

```
Product: Laptop
Batches:
  ├── Batch A: 50 units @ $500 (purchased Jan 1)
  ├── Batch B: 30 units @ $480 (purchased Jan 15)
  └── Batch C: 20 units @ $450 (purchased Feb 1)

Total Current Stock = 50 + 30 + 20 = 100 units
```

---

## 4. STOCK IN (PURCHASE RECEIPT)

### When Stock Comes In?
- ✅ Goods received from vendor
- ✅ Purchase order confirmed
- ✅ GRN (Goods Receipt Note) created

### Flow: Stock In → Create Batch

```javascript
// Step 1: Receive goods from vendor
const purchaseOrder = {
  vendorId: "V001",
  items: [{
    productId: "P001",
    quantity: 100,
    unitPrice: 50
  }],
  totalAmount: 5000
};

// Step 2: Create InventoryBatch
const batch = new InventoryBatch({
  productId: "P001",
  batchNumber: `BATCH-${Date.now()}`,  // Auto-generate
  purchasePrice: 50,
  quantity: 100,
  quantityRemaining: 100,               // Initially = quantity
  purchaseDate: new Date(),
  vendorId: "V001",
  batchStatus: 'ACTIVE'
});
await batch.save();

// Step 3: Create StockMovement (record the transaction)
const movement = new StockMovement({
  productId: "P001",
  batchId: batch._id,
  movementType: 'INBOUND',              // ← Type: INBOUND
  quantity: 100,
  unitCost: 50,
  totalAmount: 5000,
  reference: "PO-001",                  // Purchase Order number
  referenceType: 'PURCHASE_ORDER',
  documentDate: new Date()
});
await movement.save();
```

### API Endpoint: POST /api/stock/inbound

```javascript
router.post('/inbound', async (req, res) => {
  try {
    const {
      productId,
      quantity,
      purchasePrice,
      vendorId,
      batchNumber,
      purchaseOrderNumber,
      expiryDate
    } = req.body;

    // Create new batch
    const batch = new InventoryBatch({
      productId,
      batchNumber,
      purchasePrice,
      quantity,
      quantityRemaining: quantity,  // Full quantity available initially
      purchaseDate: new Date(),
      vendorId,
      expiryDate,
      batchStatus: 'ACTIVE'
    });
    await batch.save();

    // Record movement
    const movement = new StockMovement({
      productId,
      batchId: batch._id,
      movementType: 'INBOUND',
      quantity,
      unitCost: purchasePrice,
      totalAmount: quantity * purchasePrice,
      reference: purchaseOrderNumber,
      referenceType: 'PURCHASE_ORDER',
      documentDate: new Date()
    });
    await movement.save();

    // Update product (optional, for quick access)
    await Product.findByIdAndUpdate(
      productId,
      { $inc: { stock: quantity } }  // Increment stock
    );

    res.json({
      message: 'Stock received successfully',
      batch,
      movement
    });
  } catch (err) {
    res.status(500).json({ message: 'Error receiving stock', error: err.message });
  }
});
```

---

## 5. STOCK OUT (SALES/ISSUANCE)

### When Stock Goes Out?
- ✅ Item sold (sales invoice)
- ✅ Item issued to department
- ✅ Item transferred to another warehouse

### Flow: Sales Invoice → Reduce Stock

```javascript
/**
 * When creating a sales invoice, for each item:
 * 1. Find available batches (using FIFO)
 * 2. Reduce quantityRemaining
 * 3. Create OUTBOUND movement
 * 4. Update product stock
 */

const processSalesItem = async (productId, quantity, saleInvoiceId) => {
  // Step 1: Find batches for this product (FIFO - oldest first)
  const batches = await InventoryBatch.find({
    productId,
    batchStatus: 'ACTIVE',
    quantityRemaining: { $gt: 0 }
  }).sort({ purchaseDate: 1 });  // Oldest first

  let remainingQty = quantity;
  const movements = [];

  // Step 2: Issue from oldest batches first (FIFO)
  for (const batch of batches) {
    if (remainingQty <= 0) break;

    const qtyFromBatch = Math.min(batch.quantityRemaining, remainingQty);

    // Update batch quantityRemaining
    batch.quantityRemaining -= qtyFromBatch;
    if (batch.quantityRemaining === 0) {
      batch.batchStatus = 'CLOSED';  // Mark closed if empty
    }
    await batch.save();

    // Record this movement
    const movement = new StockMovement({
      productId,
      batchId: batch._id,
      movementType: 'OUTBOUND',  // ← Type: OUTBOUND
      quantity: qtyFromBatch,
      unitCost: batch.purchasePrice,
      totalAmount: qtyFromBatch * batch.purchasePrice,
      reference: `INV-${saleInvoiceId}`,
      referenceId: saleInvoiceId,
      referenceType: 'SALES_INVOICE',
      costingMethodUsed: 'FIFO',
      documentDate: new Date()
    });
    await movement.save();
    movements.push(movement);

    remainingQty -= qtyFromBatch;
  }

  return movements;
};
```

### API Endpoint: POST /api/stock/outbound

```javascript
router.post('/outbound', async (req, res) => {
  try {
    const {
      items,           // [{productId, quantity}, ...]
      saleInvoiceId,
      saleInvoiceNo
    } = req.body;

    const movements = [];

    for (const item of items) {
      const batchMovements = await processSalesItem(
        item.productId,
        item.quantity,
        saleInvoiceId
      );
      movements.push(...batchMovements);

      // Update product stock
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity } }  // Decrement
      );
    }

    res.json({
      message: 'Stock issued successfully',
      movements
    });
  } catch (err) {
    res.status(500).json({ message: 'Error issuing stock', error: err.message });
  }
});
```

---

## 6. STOCK ADJUSTMENT (MANUAL CORRECTION)

### When to Adjust?
- ❌ Damaged goods (reduce stock)
- ❌ Lost items (reduce stock)
- ❌ Expired items (reduce stock)
- ✅ Inventory count variance (add/reduce to match count)
- ✅ Theft/shrinkage (reduce)

### Flow: Physical Count → Adjustment

```javascript
/**
 * Physical Stock Count vs System Stock
 * System shows: 100 units
 * Count actual: 98 units
 * Variance: -2 units
 * Action: Create ADJUSTMENT movement
 */

const createStockAdjustment = async (req, res) => {
  try {
    const {
      productId,
      quantity,        // Positive = add, Negative = reduce
      reason,          // 'DAMAGE' | 'LOSS' | 'EXPIRY' | 'COUNT_VARIANCE'
      notes,
      referenceNumber
    } = req.body;

    if (quantity === 0) {
      return res.status(400).json({ message: 'Quantity cannot be zero' });
    }

    // For adjustment, adjust the most recent available batch
    if (quantity < 0) {
      // Reducing stock - find active batch to reduce from
      const batch = await InventoryBatch.findOne({
        productId,
        batchStatus: 'ACTIVE',
        quantityRemaining: { $gt: 0 }
      }).sort({ purchaseDate: -1 });  // Most recent

      if (!batch || batch.quantityRemaining < Math.abs(quantity)) {
        return res.status(400).json({
          message: 'Insufficient stock to adjust'
        });
      }

      batch.quantityRemaining += quantity;  // quantity is negative
      if (batch.quantityRemaining === 0) {
        batch.batchStatus = 'CLOSED';
      }
      await batch.save();

      // Record ADJUSTMENT movement
      const movement = new StockMovement({
        productId,
        batchId: batch._id,
        movementType: 'ADJUSTMENT',  // ← Type: ADJUSTMENT
        quantity: Math.abs(quantity),
        unitCost: batch.purchasePrice,
        totalAmount: Math.abs(quantity) * batch.purchasePrice,
        reference: referenceNumber || `ADJ-${Date.now()}`,
        referenceType: 'STOCK_ADJUSTMENT',
        reasonCode: reason,
        notes,
        documentDate: new Date()
      });
      await movement.save();

      // Update product
      await Product.findByIdAndUpdate(
        productId,
        { $inc: { stock: quantity } }  // Reduce
      );
    } else {
      // Adding stock - create small batch for adjustment
      const adjustmentBatch = new InventoryBatch({
        productId,
        batchNumber: `ADJ-BATCH-${Date.now()}`,
        purchasePrice: 0,  // Adjustment batch has no cost
        quantity,
        quantityRemaining: quantity,
        purchaseDate: new Date(),
        batchStatus: 'ACTIVE'
      });
      await adjustmentBatch.save();

      const movement = new StockMovement({
        productId,
        batchId: adjustmentBatch._id,
        movementType: 'ADJUSTMENT',
        quantity,
        unitCost: 0,
        totalAmount: 0,
        reference: referenceNumber || `ADJ-${Date.now()}`,
        referenceType: 'STOCK_ADJUSTMENT',
        reasonCode: reason,
        notes,
        documentDate: new Date()
      });
      await movement.save();

      // Update product
      await Product.findByIdAndUpdate(
        productId,
        { $inc: { stock: quantity } }  // Add
      );
    }

    res.json({
      message: 'Stock adjusted successfully'
    });
  } catch (err) {
    res.status(500).json({
      message: 'Error adjusting stock',
      error: err.message
    });
  }
};
```

---

## 7. CURRENT STOCK (REAL-TIME VIEW)

### Get Current Stock

```javascript
router.get('/current/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    // Method 1: Sum from InventoryBatch (most accurate)
    const batches = await InventoryBatch.find({
      productId,
      batchStatus: 'ACTIVE'
    });

    const currentStock = batches.reduce(
      (sum, batch) => sum + batch.quantityRemaining,
      0
    );

    // Get stock value
    const stockValue = batches.reduce(
      (sum, batch) => sum + (batch.quantityRemaining * batch.purchasePrice),
      0
    );

    res.json({
      productId,
      currentStock,
      stockValue,
      batches: batches.map(b => ({
        batchNumber: b.batchNumber,
        quantityRemaining: b.quantityRemaining,
        purchasePrice: b.purchasePrice,
        value: b.quantityRemaining * b.purchasePrice,
        purchaseDate: b.purchaseDate,
        expiryDate: b.expiryDate
      }))
    });
  } catch (err) {
    res.status(500).json({
      message: 'Error fetching current stock',
      error: err.message
    });
  }
});
```

---

## 8. STOCK HISTORY REPORT

### Get All Movements for a Product

```javascript
router.get('/history/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { startDate, endDate, movementType } = req.query;

    let query = { productId };

    if (startDate && endDate) {
      query.documentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (movementType) {
      query.movementType = movementType;  // Filter by IN/OUT/ADJUSTMENT
    }

    const movements = await StockMovement.find(query)
      .populate('batchId', 'batchNumber')
      .populate('referenceId')
      .sort({ documentDate: -1 });

    // Calculate running balance
    let runningBalance = 0;
    const withBalance = movements.map(m => {
      if (m.movementType === 'INBOUND' || m.movementType === 'ADJUSTMENT') {
        runningBalance += m.quantity;
      } else {
        runningBalance -= m.quantity;
      }

      return {
        ...m.toObject(),
        balance: runningBalance
      };
    });

    res.json({
      productId,
      movements: withBalance,
      count: withBalance.length
    });
  } catch (err) {
    res.status(500).json({
      message: 'Error fetching stock history',
      error: err.message
    });
  }
});
```

---

## 9. FRONTEND COMPONENT - STOCK TRACKING

```jsx
// client/src/components/inventory/StockTracking.jsx

import React, { useState, useEffect } from 'react';
import { Plus, Minus, Settings } from 'lucide-react';
import axios from 'axios';

export default function StockTracking() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentStock, setCurrentStock] = useState(0);
  const [batches, setBatches] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('current');  // current | history
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('in');  // in | out | adjust

  // Form states
  const [inboundForm, setInboundForm] = useState({
    productId: '',
    quantity: 0,
    purchasePrice: 0,
    vendorId: '',
    batchNumber: '',
    purchaseOrderNo: ''
  });

  const [adjustmentForm, setAdjustmentForm] = useState({
    productId: '',
    quantity: 0,
    reason: 'COUNT_VARIANCE',
    notes: ''
  });

  // Fetch current stock
  const fetchCurrentStock = async (productId) => {
    try {
      const res = await axios.get(`/api/stock/current/${productId}`);
      setCurrentStock(res.data.currentStock);
      setBatches(res.data.batches);
    } catch (err) {
      console.error('Error fetching stock:', err);
    }
  };

  // Fetch history
  const fetchHistory = async (productId) => {
    try {
      const res = await axios.get(`/api/stock/history/${productId}`);
      setHistory(res.data.movements);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  // Handle stock in
  const handleStockIn = async () => {
    try {
      await axios.post('/api/stock/inbound', inboundForm);
      alert('Stock received successfully');
      fetchCurrentStock(inboundForm.productId);
      setShowModal(false);
    } catch (err) {
      alert('Error: ' + err.response?.data?.message);
    }
  };

  // Handle stock out
  const handleStockOut = async () => {
    // Usually triggered from sales invoice, but can be manual
    const outboundData = {
      items: [{ productId: selectedProduct._id, quantity: 10 }],
      saleInvoiceNo: 'INV-001'
    };
    try {
      await axios.post('/api/stock/outbound', outboundData);
      alert('Stock issued successfully');
      fetchCurrentStock(selectedProduct._id);
      setShowModal(false);
    } catch (err) {
      alert('Error: ' + err.response?.data?.message);
    }
  };

  // Handle adjustment
  const handleAdjustment = async () => {
    try {
      await axios.post('/api/stock/adjustment', adjustmentForm);
      alert('Stock adjusted successfully');
      fetchCurrentStock(adjustmentForm.productId);
      setShowModal(false);
    } catch (err) {
      alert('Error: ' + err.response?.data?.message);
    }
  };

  if (!selectedProduct) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Product Stock Tracking</h1>
        <p className="text-gray-600">Select a product to view and manage stock</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {selectedProduct.name}
        </h1>
        <p className="text-gray-600">Item Code: {selectedProduct.itemcode}</p>
      </div>

      {/* Current Stock Card */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <p className="text-green-600 text-sm font-semibold mb-2">Current Stock</p>
          <p className="text-3xl font-bold text-green-900">{currentStock}</p>
          <p className="text-xs text-green-600 mt-1">units available</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-blue-600 text-sm font-semibold mb-2">Stock Value</p>
          <p className="text-3xl font-bold text-blue-900">
            ${(batches.reduce((sum, b) => sum + b.value, 0)).toFixed(2)}
          </p>
          <p className="text-xs text-blue-600 mt-1">total inventory value</p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <p className="text-purple-600 text-sm font-semibold mb-2">Active Batches</p>
          <p className="text-3xl font-bold text-purple-900">{batches.length}</p>
          <p className="text-xs text-purple-600 mt-1">purchase lots</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => { setModalType('in'); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus size={18} /> Stock In
        </button>
        <button
          onClick={() => { setModalType('out'); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <Minus size={18} /> Stock Out
        </button>
        <button
          onClick={() => { setModalType('adjust'); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
        >
          <Settings size={18} /> Adjustment
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b mb-6">
        <button
          onClick={() => setActiveTab('current')}
          className={`px-4 py-2 font-semibold ${
            activeTab === 'current'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Current Batches
        </button>
        <button
          onClick={() => { setActiveTab('history'); fetchHistory(selectedProduct._id); }}
          className={`px-4 py-2 font-semibold ${
            activeTab === 'history'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Movement History
        </button>
      </div>

      {/* Current Batches Tab */}
      {activeTab === 'current' && (
        <div className="space-y-3">
          {batches.length === 0 ? (
            <p className="text-gray-600">No active batches. Add stock to begin.</p>
          ) : (
            batches.map((batch, idx) => (
              <div key={idx} className="border rounded-lg p-4 bg-white hover:shadow-md transition">
                <div className="grid grid-cols-5 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Batch Number</p>
                    <p className="font-semibold text-gray-900">{batch.batchNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Quantity Remaining</p>
                    <p className="text-2xl font-bold text-green-600">{batch.quantityRemaining}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Unit Cost</p>
                    <p className="font-semibold">${batch.purchasePrice}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Batch Value</p>
                    <p className="font-bold text-blue-600">
                      ${(batch.quantityRemaining * batch.purchasePrice).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Date</p>
                    <p className="font-semibold">
                      {new Date(batch.purchaseDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Movement History Tab */}
      {activeTab === 'history' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Date</th>
                <th className="px-4 py-2 text-left font-semibold">Type</th>
                <th className="px-4 py-2 text-right font-semibold">Qty</th>
                <th className="px-4 py-2 text-right font-semibold">Unit Cost</th>
                <th className="px-4 py-2 text-right font-semibold">Total</th>
                <th className="px-4 py-2 text-left font-semibold">Reference</th>
                <th className="px-4 py-2 text-right font-semibold">Balance</th>
              </tr>
            </thead>
            <tbody>
              {history.map((mov, idx) => (
                <tr key={idx} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">
                    {new Date(mov.documentDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      mov.movementType === 'INBOUND' ? 'bg-green-100 text-green-800' :
                      mov.movementType === 'OUTBOUND' ? 'bg-red-100 text-red-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {mov.movementType}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-semibold">{mov.quantity}</td>
                  <td className="px-4 py-2 text-right">${mov.unitCost}</td>
                  <td className="px-4 py-2 text-right">${mov.totalAmount}</td>
                  <td className="px-4 py-2">{mov.reference}</td>
                  <td className="px-4 py-2 text-right font-bold text-blue-600">{mov.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

---

## 10. IMPLEMENTATION CHECKLIST

### Backend Setup
- [ ] Ensure `InventoryBatch.js` model exists
- [ ] Ensure `StockMovement.js` model exists
- [ ] Ensure `AddProduct.js` has `stock` field
- [ ] Create API routes:
  - [ ] `POST /api/stock/inbound` - Stock in
  - [ ] `POST /api/stock/outbound` - Stock out
  - [ ] `POST /api/stock/adjustment` - Manual adjustment
  - [ ] `GET /api/stock/current/:productId` - Current stock
  - [ ] `GET /api/stock/history/:productId` - History

### Frontend Setup
- [ ] Create `StockTracking.jsx` component
- [ ] Create "Stock Tracking" menu item
- [ ] Display current stock in product list
- [ ] Display stock warnings (low stock)
- [ ] Add stock adjustment form

### Integration Points
- [ ] When saving sales invoice → Call `/api/stock/outbound`
- [ ] When purchasing goods → Call `/api/stock/inbound`
- [ ] When creating physical count → Call `/api/stock/adjustment`
- [ ] Show current stock in sales invoice item selection

### Testing
- [ ] Purchase 100 units → Stock = 100
- [ ] Sell 30 units → Stock = 70
- [ ] Adjust -5 (damage) → Stock = 65
- [ ] Check FIFO batch selection
- [ ] Verify stock movements recorded

---

## 11. STOCK LEVELS & WARNINGS

### Add Min/Max Stock Fields to Product

```javascript
// In AddProduct.js model
minStock: {
  type: Number,
  default: 0,
  description: "Reorder point - alert when below this"
},
maxStock: {
  type: Number,
  default: 1000,
  description: "Maximum stock to maintain"
},
reorderQuantity: {
  type: Number,
  default: 100,
  description: "Standard quantity to order"
}
```

### Stock Status Logic

```javascript
const getStockStatus = (currentStock, product) => {
  if (currentStock <= product.minStock) {
    return { status: 'CRITICAL', color: 'red', message: 'REORDER NOW' };
  }
  if (currentStock <= product.minStock * 1.5) {
    return { status: 'LOW', color: 'orange', message: 'Low stock' };
  }
  if (currentStock >= product.maxStock) {
    return { status: 'OVERSTOCKED', color: 'yellow', message: 'Reduce stock' };
  }
  return { status: 'HEALTHY', color: 'green', message: 'OK' };
};
```

---

## 12. SUMMARY

**Stock Tracking System Flow:**

```
Purchase Order
    ↓
Stock IN (Create Batch + Movement)
    ↓
Current Stock Increases
    ↓
Sales Invoice
    ↓
Stock OUT (Find Batch via FIFO + Movement)
    ↓
Current Stock Decreases
    ↓
Physical Count Variance
    ↓
Stock ADJUSTMENT (Manual + Movement)
    ↓
Current Stock Corrected
    ↓
Reports & History (All Movements Tracked)
```

**Key Benefits:**
✅ Accurate inventory tracking  
✅ FIFO cost calculation  
✅ Batch-level traceability  
✅ Complete audit trail  
✅ Real-time stock levels  
✅ Damage/loss accounting  
