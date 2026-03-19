# Product Packing Management System

## Overview

The Product Packing system allows you to define multiple packing options for a single product with different quantities, factors, and prices. This is essential for ERP systems where products can be sold in different packaging units (loose, boxes, cases, pallets, etc.).

## Architecture

### Three-Layer System:

1. **UnitType** (Predefined Global Units)
   - Standard measurement units (KG, G, PC, L, ML, M, CM, etc.)
   - Used for universal conversions
   - Example: 1 KG = 1000 G

2. **Product** (Base Product)
   - Primary unit type (e.g., PC for pieces, KG for weight)
   - Base unit decimal places
   - Selling price

3. **ProductPacking** (Product-Specific Packings)
   - Various packing options for the product
   - Custom quantities and factors
   - Packing-specific pricing
   - Stock management per packing

## Data Model

```javascript
{
  _id: ObjectId,
  productId: ObjectId,           // Reference to product
  packingName: "Box",            // User-friendly name
  packingSymbol: "BOX",          // Short code (uppercase)
  packingFactor: 12,             // 1 BOX = 12 base units
  quantity: 12,                  // Items in this packing
  unitType: ObjectId,            // Reference to UnitType
  packingPrice: 600,             // Price for this packing
  barcode: "SKU-001-BOX",        // Unique barcode
  isDefault: true,               // Default packing for product
  isActive: true,                // Is this option available
  description: "Box of 12",      // Additional info
  stock: 150,                    // Stock at packing level
  reorderLevel: 50,              // Reorder trigger point
  createdAt: Date,
  updatedAt: Date
}
```

## Virtual Fields

```javascript
baseUnitQuantity  // quantity × packingFactor
unitPrice         // packingPrice ÷ quantity
```

## API Endpoints

### Create Packing
```
POST /api/v1/product-packing/create
Body: {
  productId: "product-id",
  packingName: "Box",
  packingSymbol: "BOX",
  packingFactor: 12,              // 1 BOX = 12 pieces
  quantity: 12,
  unitType: "unit-id",
  packingPrice: 600,
  barcode: "SKU-001-BOX",
  isDefault: false,
  description: "Box of 12 pieces"
}
```

### Get All Packings for Product
```
GET /api/v1/product-packing/product/:productId?isActive=true
Returns: Array of packings with full unit details
```

### Get Single Packing
```
GET /api/v1/product-packing/:id
Returns: Single packing with populated references
```

### Get Default Packing
```
GET /api/v1/product-packing/default/:productId
Returns: The default packing for this product
```

### Update Packing
```
PUT /api/v1/product-packing/update/:id
Body: { any updateable fields }
- packingName, packingPrice, stock, reorderLevel, description, etc.
```

### Delete Packing
```
DELETE /api/v1/product-packing/delete/:id
- Auto-sets first remaining packing as default if deleted packing was default
```

### Convert Between Packings
```
POST /api/v1/product-packing/convert
Body: {
  productId: "product-id",
  fromPackingId: "packing-1",
  toPackingId: "packing-2",
  quantity: 5
}

Response: {
  fromPacking: { name, symbol, quantity: 5 },
  toPacking: { name, symbol, quantity: 60 },
  baseUnitQuantity: 60,
  conversionFormula: "5 BOX × 12 ÷ 1 = 60 PC"
}
```

### Calculate Packing Cost
```
POST /api/v1/product-packing/calculate-cost
Body: {
  packingId: "packing-id",
  quantity: 10
}

Response: {
  packing: { name, symbol, packingPrice },
  quantity: 10,
  totalCost: "6000.00",
  unitCost: "50.00",
  baseUnitCost: "50.00"
}
```

### Get Packing Statistics
```
GET /api/v1/product-packing/stats/:productId
Returns: {
  totalPackings: 4,
  activePackings: 4,
  defaultPacking: { ... },
  packings: [ {...}, {...} ]
}
```

### Create from Template
```
POST /api/v1/product-packing/create-from-template
Body: {
  productId: "product-id",
  template: [
    { name: "Loose", symbol: "PC", factor: 1, quantity: 1, price: 75 },
    { name: "Box", symbol: "BOX", factor: 12, quantity: 12, price: 750 },
    { name: "Case", symbol: "CASE", factor: 60, quantity: 60, price: 3600 }
  ]
}
```

### Stock Management

#### Update Stock
```
PUT /api/v1/product-packing/stock/:id
Body: { quantity: 500 }
- Sets exact stock level
```

#### Adjust Stock
```
POST /api/v1/product-packing/adjust-stock/:id
Body: { adjustment: 50 }
- Increment/decrement by value (can be negative)
```

#### Get Low Stock Items
```
GET /api/v1/product-packing/low-stock/:productId
Returns: Packings where stock ≤ reorderLevel
```

## Usage Examples

### Example 1: Creating Packings for Apple

```javascript
// Product already exists: Apple (unitType: PC)

// Create packings
const packings = [
  {
    productId: "apple-001",
    packingName: "Individual Piece",
    packingSymbol: "PC",
    packingFactor: 1,
    quantity: 1,
    unitType: "pc-unit-id",
    packingPrice: 50,
    isDefault: true
  },
  {
    productId: "apple-001",
    packingName: "Box",
    packingSymbol: "BOX",
    packingFactor: 12,
    quantity: 12,
    unitType: "pc-unit-id",
    packingPrice: 500
  },
  {
    productId: "apple-001",
    packingName: "Carton",
    packingSymbol: "CTN",
    packingFactor: 60,
    quantity: 60,
    unitType: "pc-unit-id",
    packingPrice: 2500
  }
];

// POST to /api/v1/product-packing/create-from-template
```

### Example 2: Converting Between Packings

```javascript
// Customer wants 5 boxes as individual pieces

POST /api/v1/product-packing/convert
{
  productId: "apple-001",
  fromPackingId: "box-packing-id",
  toPackingId: "pc-packing-id",
  quantity: 5
}

// Response:
{
  fromPacking: { name: "Box", symbol: "BOX", quantity: 5 },
  toPacking: { name: "Individual Piece", symbol: "PC", quantity: 60 },
  baseUnitQuantity: 60,
  conversionFormula: "5 BOX × 12 ÷ 1 = 60 PC"
}
```

### Example 3: Calculating Cost for Order

```javascript
// Order 10 boxes of apples, need total cost

POST /api/v1/product-packing/calculate-cost
{
  packingId: "box-packing-id",
  quantity: 10
}

// Response:
{
  packing: { 
    name: "Box", 
    symbol: "BOX", 
    packingPrice: 500 
  },
  quantity: 10,
  totalCost: "5000.00",
  unitCost: "50.00",      // Price per piece
  baseUnitCost: "50.00"   // Price per base unit
}
```

### Example 4: Stock Management

```javascript
// Check stock for fruit (PC packing)
GET /api/v1/product-packing/default/apple-001

// Receive 500 boxes via purchase order
PUT /api/v1/product-packing/stock/box-packing-id
{ quantity: 500 }

// Sell 50 boxes
POST /api/v1/product-packing/adjust-stock/box-packing-id
{ adjustment: -50 }
// Now: 450 boxes remaining

// Check items below reorder level
GET /api/v1/product-packing/low-stock/apple-001
// Returns packings where stock ≤ reorderLevel
```

## Key Features

1. **Flexible Packing Options**
   - Support unlimited packing variations per product
   - Custom factors for each packing
   - Independent pricing per packing

2. **Automatic Conversions**
   - Convert quantities between packings
   - Formula-based calculations
   - Decimal precision handling

3. **Cost Calculations**
   - Total cost, unit cost, base unit cost
   - Different price levels per packing

4. **Stock Management**
   - Track stock per packing level
   - Reorder level alerts
   - Quick low-stock reporting

5. **Data Integrity**
   - One default packing per product
   - Auto-fallback if default is deleted
   - Validation of product and unit existence

6. **Convenience Methods**
   - `baseUnitQuantity` virtual: Auto-calculate total base units
   - `unitPrice` virtual: Price per individual item
   - `convertToPacking()`: Convert quantities
   - `calculateCost()`: Quick cost calculation

## Seeding Data

```bash
# Seed product packings for existing products
node @/seeders/productPackingSeed.js
```

This will:
- Find first available product (or create sample product)
- Create 4 packing options based on product unit type
- Display conversion examples
- Show stock levels

## Integration with Products

Products now have optional packing selection:

```javascript
// Product form can show:
// 1. Default packing with conversion
// 2. All available packings as dropdown
// 3. Quick cost calculation
// 4. Stock per packing
```

## Recommendations

1. **Always set one default packing** for each product
2. **Use predefined UnitType factors** for base conversions
3. **Track stock at most granular packing level** (loose/individual)
4. **Set reorder levels per packing** based on sales velocity
5. **Use barcode field** for integration with warehouse systems

## Error Handling

- Product not found: 404
- Unit type not found: 400
- Duplicate packing symbol: 400
- Cannot divide by zero factor: 400
- Insufficient stock: 400
- Invalid input: 400

All errors return detailed messages for debugging.
