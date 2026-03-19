# Weight Scale Item Scanning in NEXIS-ERP POS System
**March 11, 2026**

## Overview
Weight scale items are products sold by weight (like vegetables, meat, grains at supermarkets). The system tracks weight-based quantities instead of fixed unit quantities.

---

## ✅ Current Implementation Status

### **1. Product Level Configuration**
**Location**: Product.jsx → BasicInfoTab.jsx (Lines 972-1020)

#### Enable Scale Item
```javascript
// Mark product as weight-based
{
  isScaleItem: true,           // Enable weight tracking
  scaleUnitType: "Weight",     // "Weight" or "Quantity"
  price: 500,                  // Price PER UNIT WEIGHT (e.g., ₹500/KG)
  unitSymbol: "KG",            // Display unit (from baseUnit)
}
```

#### Supported Weight Units (Server Side)
**Location**: server/modules/unit/services/unitTypeService.js (Lines 231-250)

| Unit | Symbol | Factor | Use Case |
|------|--------|--------|----------|
| **Kilogram** | KG | 1.0 | Vegetables, fruits, grains |
| **Gram** | G | 0.001 | Spices, chocolates |
| **Milligram** | MG | 0.000001 | Medications, powders |
| **Pound** | LB | 0.4536 | Western markets |

---

### **2. POS Checkout Flow**

#### A. Barcode Scanning
**Location**: client/src/components/pos/POSSale.jsx (Lines 40-103)

```javascript
// What happens when scale item barcode is scanned:
1. Barcode lookup → Find product with isScaleItem=true
2. Add to cart with quantity: 1 (placeholder)
3. Wait for weight input from user
```

#### B. Weight Input (Manual Entry)
**Current Implementation**:
- User manually enters weight in quantity field
- Example: Product "Tomatoes" (₹50/KG)
  - User enters quantity: **2.5** (means 2.5 KG)
  - System calculates: lineTotal = 2.5 × 50 = ₹125

#### C. Line Total Calculation
**Location**: POSSale.jsx (Lines 116-131)

```javascript
// For ANY item (scale or regular):
lineTotal = quantity × unitPrice

// Example - Tomatoes (Scale Item):
lineTotal = 2.5 KG × ₹50/KG = ₹125

// Example - Milk (Regular Item):
lineTotal = 2 × ₹100 = ₹200
```

#### D. Sale Transaction Storage
**Location**: server/Models/POS/POSSale.js (Lines 57-100)

```javascript
// POSSale document structure
{
  items: [
    {
      productId: "123abc",
      name: "Tomatoes",
      quantity: 2.5,              // ✅ Supports decimals for weight
      unitPrice: 50,              // Price per KG
      lineTotal: 125,
      isScaleItem: true,          // Flag indicating it's weight-based
      scaleUnitType: "Weight",
      unitType: "KG"              // Display unit
    },
    {
      productId: "456def",
      name: "Milk Packet",
      quantity: 2,                // Regular count
      unitPrice: 100,
      lineTotal: 200,
      isScaleItem: false
    }
  ],
  subtotal: 325,
  tax: 16.25,    // 5% VAT
  total: 341.25
}
```

---

## 🔧 How to Use Scale Items in POS

### **Step 1: Create Scale Item Product**
1. Go to Products → Add New
2. In **BasicInfoTab**:
   - ✅ Check "Scale Item"
   - Set "Unit Type" → Weight
   - Select unit: KG / G / LB
   - Set pricing: ₹500/KG (price per weight unit)
3. Save product

### **Step 2: Sell at POS**
1. Scan product barcode → Added to cart
2. **Modified Quantity Input** (for scale items):
   - Shows unit symbol (e.g., "KG")
   - User enters weight: **2.5** (means 2.5 KG)
   - System auto-calculates: 2.5 × ₹500 = ₹1250
3. Complete checkout normally

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     SUPERMARKET SCENARIO                     │
└─────────────────────────────────────────────────────────────┘

PRODUCT SETUP (Admin)
┌──────────────────────────────┐
│ Tomatoes                     │
│ ✅ isScaleItem: true         │
│ scaleUnitType: Weight        │
│ Price: ₹50/KG                │
│ Unit: KG                     │
└──────────────────────────────┘
           ↓
┌──────────────────────────────┐
│ Saved in MongoDB             │
│ Ready for POS checkout       │
└──────────────────────────────┘


POS CHECKOUT
┌────────────────────────────────────────┐
│ 1. Scan barcode → Find product        │
│    (Tomatoes, ₹50/KG, isScaleItem:✓)  │
│                                        │
│ 2. User puts on weighing scale        │
│    Weight shows: 2.5 KG                │
│                                        │
│ 3. User enters quantity: 2.5           │
│    System shows: 2.5 KG × ₹50 = ₹125  │
│                                        │
│ 4. Confirm → Cart updated             │
│    lineTotal: 125 (saved as decimal)   │
│                                        │
│ 5. Checkout → POSSale created         │
│    quantity: 2.5 (stored as number)    │
└────────────────────────────────────────┘
```

---

## 🔗 Integration with Hardware Scales

### **Optional Enhancement: Real-Time Scale Integration**

**Current State**: ❌ Manual weight entry

**Future Enhancement**: Would require:
```javascript
// 1. Scale Device Connection (Serial/USB)
// 2. Weight event listener
// 3. Auto-populate quantity field

example in POSSale.jsx:
const handleScaleWeight = (weightInKG) => {
  setScaleWeight(weightInKG);
  // Auto-fill quantity field
  handleQuantityChange(itemIndex, weightInKG);
};

// 3. COM Port listener setup
useEffect(() => {
  // Listen to serial port for weight data
  // Update quantity when weight is received
}, []);
```

---

## ✅ Features Supporting Scale Items

| Feature | Status | Details |
|---------|--------|---------|
| **Decimal Quantities** | ✅ Active | POSSale accepts 0.001+ quantities |
| **Multiple Weight Units** | ✅ Active | KG, G, MG, LB supported |
| **Price per Unit Weight** | ✅ Active | Standard formula: weight × price/unit |
| **Tax on Weight Items** | ✅ Active | Same 5% VAT applies |
| **Discount Support** | ✅ Active | Global discount % applies to weight items |
| **Scale Device API** | ❌ Not Implemented | Would require device connection code |

---

## 🚀 Complete Workflow Example

### **Scenario: Customer buys vegetables**

```
SETUP (Done once):
✅ Create products:
   - Tomatoes: ₹50/KG, isScaleItem=true
   - Onions: ₹40/KG, isScaleItem=true
   - Cucumbers: ₹30/KG, isScaleItem=true

POS CHECKOUT (Cashier):
1. Customer: "I want 2.5 KG tomatoes"
2. Cashier: Scan tomato barcode → Added to cart
3. Cashier: Change quantity from 1 → 2.5
   System: 2.5 × ₹50 = ₹125 ✓
4. Customer: "And 1 KG onions"
5. Cashier: Scan onion barcode → Added to cart
6. Cashier: Change quantity 1 → 1
   System: 1 × ₹40 = ₹40 ✓
7. Checkout: 
   Subtotal: ₹165
   Tax (5%): ₹8.25
   Total: ₹173.25 ✓

TRANSACTION SAVED:
{
  items: [
    { name: "Tomatoes", quantity: 2.5, unitPrice: 50, lineTotal: 125 },
    { name: "Onions", quantity: 1, unitPrice: 40, lineTotal: 40 }
  ],
  total: 173.25
}
```

---

## ⚠️ Important Considerations

### **1. Price per Weight Unit**
- **MUST set price as per weight unit**
- ❌ Wrong: Product "Tomatoes" price: 250 (ambiguous unit)
- ✅ Correct: Product "Tomatoes" price: 50 with unit: KG (= ₹50/KG)

### **2. Unit Consistency**
- Product must have baseUnit set to a weight unit
- Factor calculation for variants derived from base unit weight

### **3. Rounding in Calculations**
- Use system's `round()` function for weight × price calculations
- Prevents currency precision issues (e.g., 2.333 KG × ₹50 = ₹116.65)

### **4. Scale Item Display in POS**
- Show unit symbol in quantity input label
- Example: "Qty (KG)" instead of just "Qty"
- Helps cashier identify weight-based items

---

## 📂 Files Reference

| File | Purpose |
|------|---------|
| [Product.jsx](../../client/src/components/product/Product.jsx#L1747-L1749) | Validation: requires scaleUnitType for scale items |
| [BasicInfoTab.jsx](../../client/src/components/product/tabs/BasicInfoTab.jsx#L972-L1020) | UI: Scale item checkbox & unit selector |
| [POSSale.jsx](../../client/src/components/pos/POSSale.jsx#L40-L103) | POS: Barcode scanning & cart management |
| [POSInventory.jsx](../../client/src/components/pos/POSInventory.jsx#L56-L165) | POS: Product search & lookup |
| [AddProduct.js](../../server/Models/AddProduct.js#L227-L236) | DB Schema: isScaleItem & scaleUnitType fields |
| [POSSale.js](../../server/Models/POS/POSSale.js#L57-L100) | DB Schema: Decimal quantity support |
| [unitTypeService.js](../../server/modules/unit/services/unitTypeService.js#L231-L250) | Unit definitions: Weight categories |

---

## 🎯 Next Steps

### **If you want to:**

1. **Use scale items now**: Create product with isScaleItem=true, set weight unit, use manual entry in POS
2. **Add hardware scale integration**: Need to implement device listener in POSSale.jsx
3. **Improve UX for scale items**: Add dedicated weight input modal instead of generic quantity field
4. **Multi-location scale support**: Extend POSSale to support multiple weight scales per checkout

Would you like implementation details for any of these?
