# INVENTORY COSTING METHODS - COMPLETE IMPLEMENTATION GUIDE

## Overview

This guide provides complete step-by-step implementation of **FIFO (First In First Out)**, **LIFO (Last In First Out)**, and **WAC (Weighted Average Cost)** inventory costing methods in your ERP system.

---

## Table of Contents

1. [Costing Methods Explained](#costing-methods-explained)
2. [Database Models](#database-models)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [API Endpoints](#api-endpoints)
6. [Usage Examples](#usage-examples)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Costing Methods Explained

### 1. FIFO (First In First Out)

**How It Works:**
- The first items purchased are the first items issued/sold
- Assumes oldest inventory is used first
- Batches are sorted by purchase date (oldest first)
- Issues inventory from the oldest batch until depleted, then moves to next

**Cost Formula:**
```
Total Cost = Σ (Units from each batch × Batch Purchase Price)
Average Cost = Total Cost / Quantity Issued
```

**Example:**
```
Batch 1: 100 units @ $10 = $1,000 (Purchase Date: Jan 1)
Batch 2: 100 units @ $12 = $1,200 (Purchase Date: Jan 15)
Batch 3: 100 units @ $15 = $1,500 (Purchase Date: Feb 1)

Issue 150 units using FIFO:
- Take 100 units from Batch 1 @ $10 = $1,000
- Take 50 units from Batch 2 @ $12 = $600
- Total Cost: $1,600
- Average Cost per Unit: $1,600 / 150 = $10.67
```

**Best For:**
- ✅ Perishable goods (dairy, food, medicine)
- ✅ Seasonal products
- ✅ Technology items that depreciate
- ✅ Inflation periods

**Advantages:**
- Matches physical inventory flow for perishables
- GAAP acceptable
- Lower COGS in inflation periods
- Higher profits shown

**Disadvantages:**
- Not accurate for non-perishables
- Can inflate profits in inflationary periods

---

### 2. LIFO (Last In First Out)

**How It Works:**
- The last items purchased are the first items issued/sold
- Assumes newest inventory is used first
- Batches are sorted by purchase date (newest first)
- Issues inventory from the newest batch until depleted, then moves to next

**Cost Formula:**
```
Total Cost = Σ (Units from each batch × Batch Purchase Price)
Average Cost = Total Cost / Quantity Issued
```

**Example:**
```
Same batches as FIFO:
Batch 1: 100 units @ $10 = $1,000 (Purchase Date: Jan 1)
Batch 2: 100 units @ $12 = $1,200 (Purchase Date: Jan 15)
Batch 3: 100 units @ $15 = $1,500 (Purchase Date: Feb 1)

Issue 150 units using LIFO:
- Take 100 units from Batch 3 @ $15 = $1,500
- Take 50 units from Batch 2 @ $12 = $600
- Total Cost: $2,100
- Average Cost per Unit: $2,100 / 150 = $14.00
```

**Best For:**
- ✅ Non-perishable commodities
- ✅ Raw materials
- ✅ Deflation periods
- ✅ Tax benefits in inflation (LIFO reserve)

**Advantages:**
- Reflects current replacement costs
- Better COGS matching in inflation
- Tax benefits (not allowed in IFRS)
- Lower taxable income in inflation

**Disadvantages:**
- Not allowed under IFRS
- Doesn't match actual physical flow for most items
- Older inventory on balance sheet (outdated values)
- Only allowed in some countries (USA, Canada)

---

### 3. WAC (Weighted Average Cost)

**How It Works:**
- Calculates the average cost of all available units
- All units have the same average cost regardless of batch
- Most suitable for standardized products

**Cost Formula:**
```
Total Cost Available = Σ (Quantity in each batch × Batch Purchase Price)
Total Quantity Available = Σ Quantity in all batches
Weighted Average Cost = Total Cost Available / Total Quantity Available
Cost of Quantity Issued = Quantity Issued × Weighted Average Cost
```

**Example:**
```
Same batches as FIFO/LIFO:
Batch 1: 100 units @ $10 = $1,000
Batch 2: 100 units @ $12 = $1,200
Batch 3: 100 units @ $15 = $1,500

Total Available Cost: $3,700
Total Available Quantity: 300 units
Weighted Average Cost: $3,700 / 300 = $12.33 per unit

Issue 150 units using WAC:
- Cost: 150 units × $12.33 = $1,850
- Average Cost per Unit: $12.33
```

**Best For:**
- ✅ Standardized products
- ✅ Homogeneous inventory
- ✅ Production/manufacturing (standard costing)
- ✅ Liquid materials

**Advantages:**
- Smooths cost volatility
- Accepted under Both GAAP and IFRS
- Easy to apply and understand
- Realistic average cost
- Used worldwide

**Disadvantages:**
- Doesn't reflect actual batch costs
- Requires all batches to be identical quality
- Can be misleading for very different purchase prices

---

## Database Models

### 1. InventoryBatch Model

Tracks individual purchase batches:

```javascript
{
  _id: ObjectId,
  productId: ObjectId (reference to Product),
  batchNumber: String,          // Unique batch identifier
  purchasePrice: Number,         // Cost per unit
  quantity: Number,              // Total units in batch
  quantityRemaining: Number,     // Units still available
  purchaseDate: Date,            // When batch was purchased
  vendorId: ObjectId,            // Which vendor supplied
  expiryDate: Date,              // For perishable goods
  lotNumber: String,             // Manufacturing lot number
  invoiceNumber: String,         // Purchase invoice reference
  batchStatus: String,           // ACTIVE | CLOSED | EXPIRED
  costMovements: [ObjectId],     // References to StockMovement
  createdAt: Date,
  updatedAt: Date
}
```

**Key Fields:**
- `quantityRemaining` - Automatically updated when inventory is issued
- `batchStatus` - Auto-closed when quantityRemaining = 0
- `costMovements` - Audit trail of all transactions using this batch

### 2. StockMovement Model

Records every inventory transaction:

```javascript
{
  _id: ObjectId,
  productId: ObjectId,
  batchId: ObjectId,             // Which batch was used
  movementType: String,          // INBOUND | OUTBOUND | ADJUSTMENT | RETURN
  quantity: Number,              // Units moved
  unitCost: Number,              // Cost per unit (calculated)
  totalAmount: Number,           // quantity × unitCost
  reference: String,             // Document reference
  referenceId: ObjectId,         // Link to sales order, etc
  referenceType: String,         // SALES_INVOICE | PURCHASE_ORDER | etc
  costingMethodUsed: String,     // FIFO | LIFO | WAC (method used)
  documentDate: Date,            // When transaction occurred
  notes: String,
  reasonCode: String,            // For adjustments: DAMAGE, LOSS, EXPIRY
  createdBy: ObjectId,           // User who recorded movement
  createdAt: Date,
  updatedAt: Date
}
```

**Key Purpose:**
- Complete audit trail of how inventory cost was calculated
- Allows reconciliation of costing method impact
- Links transactions to business documents

### 3. CostingMethod Model

Company-wide configuration:

```javascript
{
  _id: ObjectId,
  companyId: ObjectId,
  defaultCostingMethod: String,  // FIFO | LIFO | WAC
  allowMultipleMethods: Boolean, // Different products can use different methods
  productCostingMethods: [       // Per-product overrides
    {
      productId: ObjectId,
      costingMethod: String
    }
  ],
  wacCalculationFrequency: String, // PERPETUAL | PERIODIC
  enableAutoCloseBatches: Boolean,  // Auto-close empty batches
  enableCostAdjustment: Boolean,    // Allow landed cost adjustment
  lastAuditDate: Date,
  description: String,
  isActive: Boolean
}
```

---

## Backend Implementation

### Service: CostingService

The `server/services/CostingService.js` file contains core logic:

#### Method 1: FIFO Calculation

```javascript
const result = CostingService.calculateFIFO(batches, quantityNeeded);
// Returns: { method, quantityNeeded, batches[], totalCost, averageCost, quantityIssued, shortfall }
```

#### Method 2: LIFO Calculation

```javascript
const result = CostingService.calculateLIFO(batches, quantityNeeded);
// Returns: { method, quantityNeeded, batches[], totalCost, averageCost, quantityIssued, shortfall }
```

#### Method 3: WAC Calculation

```javascript
const result = CostingService.calculateWAC(batches, quantityNeeded);
// Returns: { method, quantityNeeded, batches[], totalCost, averageCost, quantityIssued, shortfall }
```

#### Compare All Methods

```javascript
const comparison = CostingService.compareCostingMethods(batches, quantityNeeded);
// Returns: { fifo: {...}, lifo: {...}, wac: {...}, comparison: { highestCost, lowestCost, difference } }
```

#### Other Utilities

```javascript
// Validate stock availability
const validation = CostingService.validateAvailableStock(batches, quantityNeeded);
// Returns: { isAvailable, available, needed, shortfall }

// Get only active batches
const activeBatches = CostingService.getActiveBatches(batches);

// ABC Analysis (inventory classification)
const analysis = CostingService.calculateABCAnalysis(batches);
// Returns: Batches classified as A/B/C based on value

// Format for display
const formatted = CostingService.formatResult(result);
// Returns: Result with currency formatting
```

---

## Frontend Implementation

### CostingContext

Global state provider for inventory costing:

**Location:** `client/src/context/CostingContext.jsx`

**Features:**
- Manages selected costing method
- Fetches/updates company costing configuration
- Provides all calculation methods
- Handles loading and error states

**Initialization:**
```jsx
// In main.jsx (already done):
<AuthContext>
  <CompanyProvider>
    <CostingProvider>
      <App />
    </CostingProvider>
  </CompanyProvider>
</AuthContext>
```

### Custom Hook: useCostingMaster

**Location:** `client/src/hooks/useCostingMaster.js`

**Usage:**
```jsx
import { useCostingMaster } from '../hooks/useCostingMaster';

export function MyComponent() {
  const {
    costingMethod,                    // Current method: FIFO | LIFO | WAC
    costingConfig,                    // Full config object
    loading,                          // Loading state
    error,                            // Error message
    switchCostingMethod,              // (method) => void
    calculateCost,                    // (productId, qty, method) => Promise
    compareCostingMethods,            // (productId, qty) => Promise
    updateCostingConfig,              // (updates) => Promise
    getABCAnalysis,                   // (productId?) => Promise
    getInventoryValuation,            // (productId?, method?) => Promise
    fetchCostingConfig,               // () => Promise
  } = useCostingMaster();

  // Use in component...
}
```

---

## API Endpoints

### Batch Management

#### Get All Batches
```
GET /api/costing/batches?productId=xxx&limit=50&skip=0
Response: { success, total, count, data: [...] }
```

#### Get Single Batch
```
GET /api/costing/batches/:id
Response: { success, data: {...} }
```

#### Create Batch
```
POST /api/costing/batches
Body: {
  productId, batchNumber, purchasePrice, quantity,
  purchaseDate, vendorId, expiryDate, lotNumber, invoiceNumber
}
Response: { success, message, data: {...} }
```

#### Update Batch
```
PUT /api/costing/batches/:id
Body: { any updateable fields }
Response: { success, message, data: {...} }
```

#### Delete Batch
```
DELETE /api/costing/batches/:id
Response: { success, message, data: {...} }
```

### Costing Calculations

#### Calculate Cost (Single Method)
```
POST /api/costing/calculate
Body: {
  productId: "xxx",
  quantityNeeded: 100,
  method: "FIFO"    // FIFO | LIFO | WAC
}
Response: { success, data: { method, batches[], totalCost, averageCost, ... } }
```

#### Compare All Methods
```
POST /api/costing/compare
Body: {
  productId: "xxx",
  quantityNeeded: 100
}
Response: { success, data: { fifo: {...}, lifo: {...}, wac: {...}, comparison: {...} } }
```

### Configuration

#### Get Costing Method Config
```
GET /api/costing/config/:companyId
Response: { success, data: {...} }
```

#### Update Costing Method Config
```
PUT /api/costing/config/:companyId
Body: {
  defaultCostingMethod: "LIFO",
  allowMultipleMethods: true,
  wacCalculationFrequency: "PERPETUAL",
  ...
}
Response: { success, message, data: {...} }
```

### Analysis

#### ABC Analysis
```
GET /api/costing/analysis/abc?productId=xxx
Response: { success, data: [{ batchNumber, quantity, totalValue, classification, ... }, ...] }
```

#### Inventory Valuation
```
GET /api/costing/analysis/valuation?productId=xxx&costingMethod=FIFO
Response: {
  success,
  totalInventoryValue: 50000,
  totalQuantity: 1000,
  data: [{ productId, productName, quantity, totalValue, ... }, ...]
}
```

---

## Usage Examples

### Example 1: Calculate Cost for Sales Invoice

```jsx
import { useCostingMaster } from '../hooks/useCostingMaster';

export function SalesInvoice() {
  const { calculateCost } = useCostingMaster();
  const [lineItems, setLineItems] = useState([]);

  const handleAddLineItem = async (productId, quantity) => {
    try {
      const costInfo = await calculateCost(productId, quantity);
      
      // Add to line items with cost breakdown
      setLineItems([
        ...lineItems,
        {
          productId,
          quantity,
          unitCost: costInfo.averageCost,
          totalCost: costInfo.totalCost,
          batchesUsed: costInfo.batches,
          costingMethod: costInfo.method
        }
      ]);
    } catch (error) {
      console.error('Error calculating cost:', error);
    }
  };

  return (
    <div>
      {/* Invoice form with line items */}
    </div>
  );
}
```

### Example 2: Compare Methods Before Purchase Decision

```jsx
export function PurchaseAnalysis() {
  const { compareCostingMethods } = useCostingMaster();
  const [comparison, setComparison] = useState(null);

  const handleAnalyze = async (productId, quantity) => {
    const result = await compareCostingMethods(productId, quantity);
    setComparison(result);
    
    console.log(`Using FIFO: $${result.fifo.totalCost}`);
    console.log(`Using LIFO: $${result.lifo.totalCost}`);
    console.log(`Using WAC: $${result.wac.totalCost}`);
    console.log(`Savings with best method: $${result.comparison.difference}`);
  };

  return (
    // Display comparison and recommendation
  );
}
```

### Example 3: Inventory Valuation Report

```jsx
export function InventoryValuationReport() {
  const { getInventoryValuation, costingMethod } = useCostingMaster();
  const [valuation, setValuation] = useState(null);

  useEffect(() => {
    const fetchValuation = async () => {
      const data = await getInventoryValuation(null, costingMethod);
      setValuation(data);
    };
    fetchValuation();
  }, [costingMethod]);

  return (
    <div>
      <h2>Inventory Valuation ({costingMethod})</h2>
      <p>Total Value: ${valuation?.totalInventoryValue}</p>
      <p>Total Quantity: {valuation?.totalQuantity} units</p>
      
      <table>
        {/* Display products and their valuations */}
      </table>
    </div>
  );
}
```

### Example 4: ABC Analysis for Inventory Control

```jsx
export function ABCAnalysisReport() {
  const { getABCAnalysis } = useCostingMaster();
  const [analysis, setAnalysis] = useState([]);

  useEffect(() => {
    const fetchAnalysis = async () => {
      const data = await getABCAnalysis();
      setAnalysis(data);
    };
    fetchAnalysis();
  }, []);

  const itemsByClass = {
    A: analysis.filter(item => item.classification === 'A'),  // 80% value
    B: analysis.filter(item => item.classification === 'B'),  // 15% value
    C: analysis.filter(item => item.classification === 'C'),  // 5% value
  };

  return (
    <div>
      <h2>Inventory Classification (ABC Analysis)</h2>
      
      <section>
        <h3>Class A Items (High Value - Tight Control)</h3>
        {/* Display A items with tight controls */}
      </section>

      <section>
        <h3>Class B Items (Medium Value - Regular Control)</h3>
        {/* Display B items with regular review */}
      </section>

      <section>
        <h3>Class C Items (Low Value - Loose Control)</h3>
        {/* Display C items with minimal tracking */}
      </section>
    </div>
  );
}
```

### Example 5: Real-time Cost Comparison

```jsx
export function CostingDecisionHelper() {
  const { compareCostingMethods, imageMethod, switchCostingMethod } = useCostingMaster();
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [comparison, setComparison] = useState(null);

  const handleCompare = async (e) => {
    e.preventDefault();
    const result = await compareCostingMethods(productId, parseInt(quantity));
    setComparison(result);
  };

  if (!comparison) return <form onSubmit={handleCompare}>...</form>;

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* FIFO Card */}
      <div className={comparison.fifo.totalCost === comparison.comparison.lowestCost ? 'bg-green-100' : ''}>
        <h3>FIFO (Oldest First)</h3>
        <p>Cost: ${comparison.fifo.totalCostFormatted}</p>
        <p>Avg: ${comparison.fifo.averageCostFormatted}</p>
        <button onClick={() => switchCostingMethod('FIFO')}>Use FIFO</button>
      </div>

      {/* LIFO Card */}
      <div className={comparison.lifo.totalCost === comparison.comparison.lowestCost ? 'bg-green-100' : ''}>
        <h3>LIFO (Newest First)</h3>
        <p>Cost: ${comparison.lifo.totalCostFormatted}</p>
        <p>Avg: ${comparison.lifo.averageCostFormatted}</p>
        <button onClick={() => switchCostingMethod('LIFO')}>Use LIFO</button>
      </div>

      {/* WAC Card */}
      <div className={comparison.wac.totalCost === comparison.comparison.lowestCost ? 'bg-green-100' : ''}>
        <h3>WAC (Average)</h3>
        <p>Cost: ${comparison.wac.totalCostFormatted}</p>
        <p>Avg: ${comparison.wac.averageCostFormatted}</p>
        <button onClick={() => switchCostingMethod('WAC')}>Use WAC</button>
      </div>
    </div>
  );
}
```

---

## Best Practices

### 1. Choose the Right Method

**Use FIFO if:**
- Your products are perishable (food, pharma, cosmetics)
- You have high inventory turnover
- You want to minimize obsolete inventory
- You're in an inflationary economy

**Use LIFO if:**
- You're in the USA (IFRS doesn't allow it)
- You have non-perishable commodities
- You want tax benefits in inflation
- Actual flow doesn't match LIFO

**Use WAC if:**
- Your products are standardized/homogeneous
- You're in manufacturing/production
- You use standard costing
- You follow IFRS

### 2. Batch Management

```jsx
// Always create detailed batches
const batch = {
  batchNumber: 'PROD-2024-001',      // Meaningful identifier
  purchaseDate: new Date(),            // Precise date
  lotNumber: 'LOT-ABC123',             // Manufacturing lot
  expiryDate: new Date('2025-12-31'), // For perishables
  invoiceNumber: 'INV-2024-567',      // Audit trail
  vendorId: vendorId,                  // Supplier info
};

// Track quantity remaining accurately
// Don't delete batches, set status to CLOSED when empty
```

### 3. Stock Movement Recording

```jsx
// Always record how cost was calculated
const movement = {
  batchId: batchId,
  costingMethodUsed: 'FIFO',  // Important for audit
  reference: 'INV-2024-100',   // Link to business doc
  referenceType: 'SALES_INVOICE',
  documentDate: transactionDate
};
```

### 4. Configuration Management

```jsx
// Update method only after careful consideration
const { updateCostingConfig } = useCostingMaster();

// This is a significant accounting change
// Document the reason for switching methods
const updateConfig = async () => {
  await updateCostingConfig({
    defaultCostingMethod: 'WAC',
    description: 'Changed to WAC for consistency with manufacturing standard costing (Effective Date: 2024-04-01)'
  });
};
```

### 5. Reconciliation

```jsx
// Monthly/quarterly reconciliation
const { getInventoryValuation, compareCostingMethods } = useCostingMaster();

// Get current valuation
const valuation = await getInventoryValuation();

// For each product, verify:
// 1. Batch quantities match physical inventory
// 2. Cost calculations are correct
// 3. No gaps in stock movements
```

---

## Troubleshooting

### Issue: Insufficient Stock Available

```
Error: "Insufficient stock available"
```

**Causes:**
- Requesting more units than available
- Batch quantities not updated properly
- Using expired batches

**Solution:**
```jsx
// Check available stock first
const validation = CostingService.validateAvailableStock(batches, quantityNeeded);

if (!validation.isAvailable) {
  console.log(`Available: ${validation.available}, Need: ${validation.needed}`);
  console.log(`Backorder: ${validation.shortfall} units`);
  
  // Handle backorder or adjust quantity
  const adjustedQty = validation.available;
  const result = await calculateCost(productId, adjustedQty);
}
```

### Issue: Cost Calculation Mismatch

```
Expected: $1000, Got: $950
```

**Causes:**
- Different costing method used
- Batch prices changed
- Wrong batch selected

**Solution:**
```jsx
// Always verify which method is being used
const result = await calculateCost(productId, quantity, 'FIFO');
console.log(`Method: ${result.method}`);
console.log(`Batches used:`, result.batches);

// Compare all methods to understand variance
const comparison = await compareCostingMethods(productId, quantity);
```

### Issue: Batch Not Found

```
Error: "No active batches found"
```

**Causes:**
- Product has no batches
- All batches are expired
- All batches set to CLOSED status

**Solution:**
```jsx
// Check batch status
const batches = await InventoryBatch.find({
  productId,
  batchStatus: 'ACTIVE'
});

// If no ACTIVE batches, you need to:
// 1. Create new batch from purchase order
// 2. Reopen CLOSED batches if still valid
// 3. Verify product has inventory
```

### Issue: WAC Calculation Incorrect

```
Expected Average Cost: $12.50, Got: $13.00
```

**Cause:** Not all batches included in calculation

**Solution:**
```jsx
// WAC includes ALL batches with quantityRemaining > 0
const result = CostingService.calculateWAC(batches, quantity);

// Check allBatchesApplied in result
console.log(result.allBatchesApplied);
// Should show total cost and quantity across ALL batches

// Verify calculation manually:
const totalCost = batches.reduce((sum, b) => sum + (b.purchasePrice * b.quantityRemaining), 0);
const totalQty = batches.reduce((sum, b) => sum + b.quantityRemaining, 0);
const wac = totalCost / totalQty;  // Should match result.averageCost
```

### Issue: Performance Issues with Large Batches

```
Slow calculation on products with 1000+ batches
```

**Solution:**
```jsx
// Add database indexes
// In InventoryBatch schema:
InventoryBatchSchema.index({ productId: 1, batchStatus: 1, quantityRemaining: 1 });

// Filter before calculation
const activeBatches = CostingService.getActiveBatches(batches);

// Use pagination
const batches = await InventoryBatch.find({
  productId,
  batchStatus: 'ACTIVE',
  quantityRemaining: { $gt: 0 }
}).limit(500).sort({ purchaseDate: 1 });
```

---

## Integration Checklist

- [ ] Database models created (InventoryBatch, StockMovement, CostingMethod)
- [ ] CostingService implemented with FIFO/LIFO/WAC logic
- [ ] API routes registered in server.js
- [ ] CostingContext created and provider added to main.jsx
- [ ] useCostingMaster hook implemented
- [ ] Example component created and tested
- [ ] Batch creation form added to inventory module
- [ ] Sales/Invoice integration with cost calculations
- [ ] Reconciliation reports implemented
- [ ] Staff training on costing method selection
- [ ] Accounting policy documentation updated

---

## Next Steps

1. **Create inventory batches** for existing stock
2. **Integrate with sales invoices** to automatically calculate costs
3. **Build reconciliation reports** to verify accuracy
4. **Implement cost adjustments** for landed costs
5. **Create audit reports** for accounting compliance
6. **Setup alerts** for low stock or expired batches

---

## Support & Questions

For implementation help:
- Review InventoryCostingExample.jsx component
- Check API endpoints using Postman
- Verify batch quantities match physical inventory
- Run ABC analysis to identify high-value items

---

**Last Updated:** March 2024
**Version:** 1.0
