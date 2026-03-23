/**
 * GRN Product Cost Update Implementation Test
 * 
 * Feature: During GRN create/edit/post, automatically update product master and pricing
 * 
 * Changes Make:
 * ✅ Update master product: cost, costIncludeVat, lastReceivedCost, marginPercent, marginAmount
 * ✅ Update all pricingLevels (Level 1-5) based on new margin%
 * ✅ Update unit variants: cost, margin%, margin amount, price
 * ✅ Add detailed audit logs with pricing changes
 * 
 * Implementation Location: server/modules/accounting/services/GRNStockUpdateService.js
 */

// ============================================================================
// SCENARIO 1: Basic GRN with cost reduction
// ============================================================================

const scenario1 = {
  name: "Scenario 1: Cost Reduction in GRN",
  description: "Product cost decreases from 10 to 8, margin% should increase",
  
  before: {
    itemcode: "1001",
    name: "iPhone 6 Plus",
    cost: 10,                    // Current cost
    price: 15,                   // Current selling price
    marginPercent: 50,           // ((15-10)/10)*100 = 50%
    marginAmount: 5,             // 10 * 50% = 5
    costIncludeVat: 10.5,
    pricingLevels: {
      "0": {
        level1: 15,              // Retail
        level2: 14,              // Wholesale A
        level3: 13,              // Wholesale B
        level4: 12,              // Corporate
        level5: 11               // Distributor
      }
    }
  },
  
  grnItem: {
    productId: "69beef0d228dfd0cc59b9fcc",
    itemCode: "1001",
    quantity: 100,
    unitCost: 8,                 // New cost from supplier
    conversionFactor: 1,
    taxPercent: 5,
    taxType: "exclusive"
  },
  
  expected_after: {
    cost: 8,                            // Updated to GRN cost
    costIncludeVat: 8.4,               // 8 + (8*5%) = 8.4
    lastReceivedCost: 10,              // Tracks previous cost
    price: 12,                         // 8 * (1 + 50/100) = 12 (using same margin% on new cost)
    marginPercent: 50,                 // Preserved from calculation: (12-8)/8*100 = 50%
    marginAmount: 4,                   // 8 * 50% = 4
    pricingLevels: {
      "0": {
        level1: 12,                    // Recalculated with new cost
        level2: 12,                    // All levels use same margin%
        level3: 12,
        level4: 12,
        level5: 12
      }
    }
  }
};

// ============================================================================
// SCENARIO 2: Cost Increase with Unit Variants
// ============================================================================

const scenario2 = {
  name: "Scenario 2: Cost Increase with Unit Variants",
  description: "Product cost increases, variants also get updated",
  
  before: {
    itemcode: "2001",
    name: "Soap - 100g",
    cost: 5,
    price: 7.5,                 // 50% margin
    marginPercent: 50,
    marginAmount: 2.5,
    costIncludeVat: 5.25,       // 5% tax
    packingUnits: [
      {
        name: "Single",
        factor: 1,
        cost: 5,
        margin: 50,
        marginAmount: 2.5,
        price: 7.5
      },
      {
        name: "Carton (12 pieces)",
        factor: 12,
        cost: 60,                // 5 * 12
        margin: 50,
        marginAmount: 30,
        price: 90                // 60 * 1.5
      }
    ]
  },
  
  grnItem: {
    productId: "69beef0d228dfd0cc59b9fcd",
    itemCode: "2001",
    quantity: 500,               // Receiving 500 singles
    unitCost: 6,                 // New cost increased
    conversionFactor: 1,
    taxPercent: 5
  },
  
  expected_after: {
    cost: 6,
    price: 9,                   // 6 * (1 + 50/100) = 9
    marginPercent: 50,          // Preserved
    marginAmount: 3,            // 6 * 50%
    packingUnits: [
      {
        name: "Single",
        factor: 1,
        cost: 6,
        margin: 50,
        marginAmount: 3,
        price: 9
      },
      {
        name: "Carton (12 pieces)",
        factor: 12,
        cost: 72,                // 6 * 12
        margin: 50,
        marginAmount: 36,        // 72 * 50%
        price: 108               // 72 * 1.5
      }
    ]
  }
};

// ============================================================================
// SCENARIO 3: Cost Update Without Price Change
// ============================================================================

const scenario3 = {
  name: "Scenario 3: Cost Change - Price Preserved Initially",
  description: "Cost reduces but old selling price is preserved (margin% increases)",
  
  before: {
    itemcode: "3001",
    name: "Tablet Stand",
    cost: 20,
    price: 30,                  // 50% margin
    marginPercent: 50,
    marginAmount: 10,
    pricingLevels: {
      "0": {
        level1: 30,
        level2: 28,
        level3: 26,
        level4: 24,
        level5: 22
      }
    }
  },
  
  grnItem: {
    productId: "69beef0d228dfd0cc59b9fce",
    itemCode: "3001",
    quantity: 50,
    unitCost: 12,                // Significant cost reduction
    conversionFactor: 1
  },
  
  expected_after: {
    cost: 12,
    price: 30,                   // Original price preserved in calculation
    marginPercent: 150,          // (30-12)/12 * 100 = 150% (profitability increased!)
    marginAmount: 18,            // 12 * 150%
    pricingLevels: {
      "0": {
        level1: 30,              // Same as original (cost * (1 + margin%/100))
        level2: 30,              // All levels recalculated with new ratio
        level3: 30,
        level4: 30,
        level5: 30
      }
    }
  }
};

// ============================================================================
// IMPLEMENTATION FLOW (processGrnStockUpdate)
// ============================================================================

const implementationFlow = `
When GRN is posted:

1️⃣  updateProductStock()
    - Update quantityInStock
    - Handle unit variants (conversion factors)

2️⃣  createOrUpdateBatch()
    - Create StockBatch or InventoryBatch
    - Track batch/expiry info

3️⃣  updateProductCost()
    - Calculate new cost using FIFO/LIFO/WAC
    - Apply discounts and FOC
    - Update product.cost and variant costs

4️⃣  updateUnitVariantCosts()
    - Update variant costs: base cost × factor
    - Calculate margin amount based on existing margin%

✨ 4.5️⃣ updateProductPricingAfterCostChange() [NEW]
    - Update lastReceivedCost (track history)
    - Update costIncludeVat (with tax)
    - Recalculate marginPercent based on price: (price - cost) / cost * 100
    - Recalculate marginAmount: cost * (margin% / 100)
    - Recalculate all pricingLevels[0-4] using margin%
    - Update base price

✨ 4.6️⃣ updateVariantPricingAfterCostChange() [NEW]
    - For each packing unit:
      - Update cost: base cost × factor
      - Recalculate margin% and margin amount
      - Update variant price
      - Update costIncludeVat

5️⃣  createStockMovement()
    - Create movement record for audit

6️⃣  createAuditLog() [ENHANCED]
    - Log all changes including pricing updates
    - Include margin%, price, levels in audit trail
`;

// ============================================================================
// EXPECTED AUDIT LOG OUTPUT
// ============================================================================

const auditLogExample = {
  action: "CREATE",
  module: "Inventory",
  resource: "Stock - GRN Receipt",
  description: "Stock received for 1001: +100 units from GRN GRN-20260321-001; Pricing updated: margin 50.00%, price 15 → 12",
  changes: {
    action: "GRN_STOCK_RECEIVED",
    grnNumber: "GRN-20260321-001",
    vendor: "Apple Supplier",
    
    // Stock update
    quantityReceivedInBaseUnits: 100,
    quantityBefore: 200,
    quantityAfter: 300,
    
    // Cost update
    costingMethod: "FIFO",
    oldCost: 10,
    newCost: 8,
    effectiveUnitCost: 8,
    
    // ✨ NEW: Pricing update
    productPricingUpdate: {
      productId: "69beef0d228dfd0cc59b9fcc",
      itemCode: "1001",
      costUpdate: {
        oldCost: 10,
        newCost: 8,
        lastReceivedCost: 10,
        costIncludeVat: 8.4
      },
      pricingUpdate: {
        previousPrice: 15,
        newPrice: 12,
        marginPercent: 50,
        marginAmount: 4,
        pricingLevels: {
          level1: 12,
          level2: 12,
          level3: 12,
          level4: 12,
          level5: 12
        }
      }
    },
    
    // ✨ NEW: Variant pricing update
    variantPricingUpdate: {
      productId: "69beef0d228dfd0cc59b9fcc",
      itemCode: "1001",
      variantsUpdated: 2,
      updates: [
        {
          unitName: "Single",
          conversionFactor: 1,
          costUpdate: { oldCost: 10, newCost: 8 },
          pricingUpdate: {
            marginPercent: 50,
            marginAmount: 4,
            newPrice: 12
          }
        },
        {
          unitName: "Carton (12 pieces)",
          conversionFactor: 12,
          costUpdate: { oldCost: 120, newCost: 96 },
          pricingUpdate: {
            marginPercent: 50,
            marginAmount: 48,
            newPrice: 144
          }
        }
      ]
    }
  }
};

// ============================================================================
// RETURN FROM processGrnStockUpdate
// ============================================================================

const processGrnResponse = {
  grnNumber: "GRN-20260321-001",
  processedItems: [
    {
      productId: "69beef0d228dfd0cc59b9fcc",
      itemCode: "1001",
      quantityReceivedInBaseUnits: 100,
      quantityAfter: 300
    }
  ],
  updatedProducts: ["69beef0d228dfd0cc59b9fcc"],
  createdBatches: [ /* batch record */ ],
  
  // ✨ Cost updates
  costUpdates: [
    {
      productId: "69beef0d228dfd0cc59b9fcc",
      oldCost: 10,
      newCost: 8,
      difference: -2
    }
  ],
  
  // ✨ Variant cost updates
  variantUpdates: [
    {
      productId: "69beef0d228dfd0cc59b9fcc",
      variantsUpdated: 2
    }
  ],
  
  // ✨ NEW: Product pricing updates
  pricingUpdates: [
    {
      productId: "69beef0d228dfd0cc59b9fcc",
      itemCode: "1001",
      costUpdate: {
        oldCost: 10,
        newCost: 8,
        costIncludeVat: 8.4
      },
      pricingUpdate: {
        previousPrice: 15,
        newPrice: 12,
        marginPercent: 50,
        marginAmount: 4,
        pricingLevels: {
          level1: 12,
          level2: 12,
          level3: 12,
          level4: 12,
          level5: 12
        }
      }
    }
  ],
  
  // ✨ NEW: Variant pricing updates
  variantPricingUpdates: [
    {
      productId: "69beef0d228dfd0cc59b9fcc",
      itemCode: "1001",
      variantsUpdated: 2,
      updates: [ /* variant pricing details */ ]
    }
  ],
  
  logs: [ /* audit logs */ ]
};

// ============================================================================
// TESTING INSTRUCTIONS
// ============================================================================

const testingInstructions = `
To test this implementation:

1. Create a test product with:
   - cost: 10
   - price: 15
   - marginPercent: 50
   - pricingLevels: {0: {level1: 15, level2: 14, ...}}
   - packingUnits: [Single, Carton]

2. Create a GRN with:
   - Item: productId, quantity: 100
   - unitCost: 8 (different from current cost)

3. Post the GRN

4. Verify in database:
   - product.cost = 8 ✅
   - product.costIncludeVat = 8.4 ✅
   - product.lastReceivedCost = 10 ✅
   - product.price = 12 ✅
   - product.marginPercent = 50 ✅
   - product.marginAmount = 4 ✅
   - product.pricingLevels["0"].level1 = 12 ✅
   - variant costs and prices updated ✅
   - ActivityLog includes pricing updates ✅

5. Check audit log:
   - ActivityLog.changes.productPricingUpdate populated ✅
   - ActivityLog.changes.variantPricingUpdate populated ✅
   - Description includes pricing changes ✅
`;

console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                  GRN PRODUCT COST UPDATE Implementation                    ║
║                                TEST GUIDE                                  ║
╚════════════════════════════════════════════════════════════════════════════╝

${scenario1.name}
${scenario1.description}

Before: cost=${scenario1.before.cost}, price=${scenario1.before.price}, margin%=${scenario1.before.marginPercent}
After:  cost=${scenario1.expected_after.cost}, price=${scenario1.expected_after.price}, margin%=${scenario1.expected_after.marginPercent}

${testingInstructions}
`);

export { scenario1, scenario2, scenario3, auditLogExample, processGrnResponse };
