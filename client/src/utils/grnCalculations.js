/**
 * GRN Calculation Utilities
 * Centralized calculation logic for GRN items and totals
 */

/**
 * Calculate item totals (net cost, tax amount, final cost)
 */
export const calculateItemTotals = (item) => {
  const netCost = item.qty * item.cost - item.discount;
  let taxAmount = 0;
  if (item.taxType === "exclusive") {
    taxAmount = (netCost * item.taxPercent) / 100;
  } else if (item.taxType === "inclusive") {
    taxAmount = (netCost * item.taxPercent) / (100 + item.taxPercent);
  }
  const finalCost = item.taxType === "notax" ? netCost : netCost + taxAmount;
  return {
    netCost: Math.max(0, netCost),
    taxAmount,
    finalCost: Math.max(0, finalCost),
  };
};

/**
 * Calculate complete item cost with tax and discount
 * ✅ UPDATED: Now handles FOC (Free on Cost) items correctly
 * 
 * @param {Object} item - Item to calculate
 * @param {boolean} skipFocCalculation - If true, skip FOC deduction during entry (default: false)
 *                                       FOC will be calculated only during posting
 */
export const calculateItemCost = (item, skipFocCalculation = false) => {
  const qty = parseFloat(item.qty) || 0;
  const cost = parseFloat(item.cost) || 0;
  const discount = parseFloat(item.discount) || 0;
  const focQty = parseFloat(item.focQty) || 0;  // FOC quantity
  const taxPercent = parseFloat(item.taxPercent) || 0;

  let netCost = qty * cost;

  // Apply discount (on gross amount)
  if (item.discountType === "percentage") {
    item.discount = (netCost * discount) / 100;
  }
  netCost = netCost - discount;

  // ✅ KEY CHANGE: During entry (skipFocCalculation=true), don't deduct FOC
  // Only deduct FOC during posting (skipFocCalculation=false)
  let focCost = 0;
  let paidCost = netCost;

  if (!skipFocCalculation && (item.foc || focQty > 0)) {
    // Calculate FOC amounts (during posting)
    focCost = focQty * cost;  // Cost of free items
    paidCost = netCost - focCost;  // What actually has to be paid
  } else if (skipFocCalculation) {
    // During entry: Store raw netCost as is, don't apply FOC reduction
    // This keeps UI values unchanged until posting
    focCost = focQty * cost;  // Still calculate focCost for reference
    paidCost = netCost;  // Don't deduct FOC during entry
  }

  // Calculate tax on PAID amount
  if (item.taxType === "exclusive") {
    item.taxAmount = (paidCost * taxPercent) / 100;
    item.finalCost = paidCost + item.taxAmount;
    item.netCostWithoutTax = paidCost;
  } else if (item.taxType === "inclusive") {
    item.netCostWithoutTax = paidCost / (1 + taxPercent / 100);
    item.taxAmount = paidCost - item.netCostWithoutTax;
    item.finalCost = paidCost;
  } else {
    item.taxAmount = 0;
    item.finalCost = paidCost;
    item.netCostWithoutTax = paidCost;
  }

  // Store costs appropriately
  item.netCost = paidCost;  // Amount that will be charged (after FOC deduction if applicable)
  item.focCost = focCost;   // Track FOC cost separately (for display)
};

/**
 * ✅ NEW: Calculate FOC amounts during GRN posting
 * This function applies FOC calculations to transform items from entry state to post state
 * 
 * @param {Object} item - Item to process
 * @returns {Object} Item with FOC calculations applied
 */
export const calculateFocOnPost = (item) => {
  // Create a copy to avoid mutating original
  const processedItem = { ...item };
  
  // Call calculateItemCost with skipFocCalculation=false to apply FOC deduction
  calculateItemCost(processedItem, false);
  
  return processedItem;
};

/**
 * Calculate GRN totals (quantity, subtotal, discount, tax, net total)
 */
export const calculateGrnTotals = (items, shippingCost = 0) => {
  const totalQty = items.reduce(
    (sum, item) => sum + (parseInt(item.qty) || 0),
    0,
  );
  const totalSubtotal = items.reduce(
    (sum, item) => sum + (parseFloat(item.qty) || 0) * (parseFloat(item.cost) || 0),
    0,
  );
  const totalDiscount = items.reduce(
    (sum, item) => sum + (parseFloat(item.discount) || 0),
    0,
  );
  const totalTaxAmount = items.reduce(
    (sum, item) => sum + (parseFloat(item.taxAmount) || 0),
    0,
  );
  const netTotal =
    items.reduce((sum, item) => sum + (parseFloat(item.finalCost) || 0), 0) +
    parseFloat(shippingCost || 0);

  return {
    totalQty,
    totalSubtotal,
    totalDiscount,
    totalTaxAmount,
    shippingCost: parseFloat(shippingCost || 0),  // ✅ ADDED - Include shipping cost in returned totals
    netTotal,
  };
};

/**
 * Parse unit type from product data (handles object and string formats)
 * Now also handles resolving unit IDs using a unitTypesMap
 * @param {*} unitType - Unit type object, string ID, or string
 * @param {Object} unitTypesMap - Optional map of unitId -> unitData for resolving IDs
 */
export const parseUnitType = (unitType, unitTypesMap = null) => {
  let unitName = "PC";
  let unitSymbol = "PC";
  let unitDecimal = 0;

  if (unitType) {
    if (typeof unitType === "object") {
      unitName = unitType.unitName || unitType.name || "PC";
      unitSymbol = unitType.unitSymbol || unitType.symbol || "PC";
      unitDecimal = unitType.unitDecimal || unitType.decimal || 0;
    } else if (typeof unitType === "string") {
      // Check if it's an ID that can be resolved in unitTypesMap
      if (unitTypesMap && unitTypesMap[unitType]) {
        const resolved = unitTypesMap[unitType];
        unitName = resolved.unitName || resolved.name || unitType;
        unitSymbol = resolved.unitSymbol || resolved.symbol || unitType;
        unitDecimal = resolved.unitDecimal || resolved.decimal || 0;
      } else {
        unitName = unitType;
        unitSymbol = unitType;
      }
    }
  }

  return { unitName, unitSymbol, unitDecimal };
};

/**
 * Parse tax percentage from product data (handles multiple formats)
 */
export const parseTaxPercent = (product) => {
  let taxPercent = 0;

  // ✅ Priority 1: Direct taxPercent field (preferred)
  if (product.taxPercent) {
    taxPercent = product.taxPercent;
  } 
  // Priority 2: tax object with percent/rate properties
  else if (product.tax) {
    if (typeof product.tax === "object") {
      taxPercent = product.tax.percent || product.tax.rate || 0;
    } else {
      taxPercent = product.tax;
    }
  } 
  // Priority 3: rate field (as fallback, only if 0-100)
  else if (
    product.rate &&
    typeof product.rate === "number" &&
    product.rate > 0 &&
    product.rate < 100
  ) {
    taxPercent = product.rate;
  }

  return parseFloat(taxPercent) || 0;
};

/**
 * Map product to GRN item with all required fields
 * @param {Object} product - Product object
 * @param {string} formDataTaxType - Tax type from form
 * @param {Object} selectedUnit - Optional selected unit variant
 * @param {Object} unitTypesMap - Optional map of unitId -> unitData for resolving unit type IDs
 */
export const mapProductToGrnItem = (product, formDataTaxType, selectedUnit = null, unitTypesMap = null) => {
  let unitName, unitSymbol, unitDecimal, cost, price;
  let conversionFactor = 1;  // ✅ ADD: Default conversion factor (for stock quantity conversion)

  if (selectedUnit) {
    // User selected a specific unit variant
    unitName = selectedUnit.unit || selectedUnit.unitSymbol || "PC";
    unitSymbol = selectedUnit.unit || selectedUnit.unitSymbol || "PC";
    unitDecimal = selectedUnit.unitDecimal || 0;
    cost = parseFloat(selectedUnit.cost || product.cost || product.price || product.rate || 0) || 0;
    price = parseFloat(selectedUnit.price || product.price || product.rate || 0) || 0;
    
    // ✅ ADD: Extract conversion factor from selected unit variant
    // This indicates how many base units = 1 variant unit
    // Example: Outer Box has factor 10, so 1 Outer Box = 10 base units
    conversionFactor = selectedUnit.factor || selectedUnit.conversionFactor || 1;
  } else {
    // Use base unit with unitTypesMap for ID resolution
    const unitData = parseUnitType(product.unitType, unitTypesMap);
    unitName = unitData.unitName;
    unitSymbol = unitData.unitSymbol;
    unitDecimal = unitData.unitDecimal;
    cost = parseFloat(product.cost || product.price || product.rate || 0) || 0;
    price = parseFloat(product.price || product.rate || 0) || 0;
  }

  const taxPercent = parseTaxPercent(product);

  const newItem = {
    id: Math.random().toString(36),
    productId: product._id || product.id,
    productName: product.name || product.productName || "",
    itemCode: product.itemcode || product.sku || product.code || "",
    barcode: selectedUnit?.barcode || product.barcode || "",
    unitType: unitName,
    unitSymbol: unitSymbol,
    unitDecimal: unitDecimal,
    qty: 1,
    foc: false,
    focQty: 0,
    cost: cost,
    discount: 0,
    discountType: "amount",
    taxType: formDataTaxType,
    taxPercent: taxPercent,
    taxAmount: 0,
    netCost: 0,
    netCostWithoutTax: 0,
    finalCost: 0,
    conversionFactor: conversionFactor,  // ✅ ADD: Store conversion factor for backend stock calculation
    // ✅ Track expiry handling
    trackExpiry: product.trackExpiry || false,
    batchNumber: "",
    expiryDate: null,
  };

  // ✅ Skip FOC calculation during entry (will be calculated at posting)
  calculateItemCost(newItem, true);
  return newItem;
};


