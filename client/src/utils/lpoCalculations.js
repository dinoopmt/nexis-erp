/**
 * LPO Calculation Utilities
 * Centralized calculation logic for LPO items and totals
 * Similar to GRN but simplified without FOC and batch tracking
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
 * ✅ Updates item object directly AND returns the calculated values
 * @param {Object} item - Item to calculate (MUTATES this object)
 */
export const calculateItemCost = (item) => {
  const qty = parseFloat(item.qty) || 0;
  const cost = parseFloat(item.cost) || 0;
  const discount = parseFloat(item.discount) || 0;
  const taxPercent = parseFloat(item.taxPercent) || 0;
  const taxType = item.taxType || "exclusive";

  let netCost = qty * cost;

  // Apply discount (on gross amount)
  if (item.discountType === "percentage") {
    item.discount = (netCost * discount) / 100;
  }
  netCost = netCost - item.discount;

  // Calculate tax
  let taxAmount = 0;
  if (taxType === "exclusive") {
    taxAmount = (netCost * taxPercent) / 100;
  } else if (taxType === "inclusive") {
    taxAmount = (netCost * taxPercent) / (100 + taxPercent);
  }

  const finalCost = taxType === "notax" ? netCost : netCost + taxAmount;

  // ✅ ASSIGN calculated values back to item object
  item.netCost = Math.max(0, netCost);
  item.taxAmount = Math.max(0, taxAmount);
  item.finalCost = Math.max(0, finalCost);

  return {
    netCost: item.netCost,
    taxAmount: item.taxAmount,
    finalCost: item.finalCost,
  };
};

/**
 * Calculate LPO totals (quantity, subtotal, discount, tax, net total)
 * ✅ Main export: Used by PurchaseOrder.jsx for summary calculations
 * ✅ SIMPLIFIED: No stored taxAmount field - calculates dynamically
 */
export const calculateLpoTotals = (items, shippingCost = 0) => {
  const totalQty = items.reduce(
    (sum, item) => sum + (parseInt(item.qty) || 0),
    0
  );

  // ✅ For simplified LPO: totalSubtotal = qty × cost (no discount field)
  const totalSubtotal = items.reduce((sum, item) => {
    const qty = parseFloat(item.qty) || 0;
    const cost = parseFloat(item.cost) || 0;
    return sum + (qty * cost);
  }, 0);

  // ✅ Calculate total tax dynamically based on taxPercent and taxType
  const totalTaxAmount = items.reduce((sum, item) => {
    const qty = parseFloat(item.qty) || 0;
    const cost = parseFloat(item.cost) || 0;
    const taxPercent = parseFloat(item.taxPercent) || 0;
    const taxType = item.taxType || "exclusive";
    
    const netCost = qty * cost;
    let itemTax = 0;
    
    if (taxType === "exclusive") {
      itemTax = (netCost * taxPercent) / 100;
    } else if (taxType === "inclusive") {
      itemTax = (netCost * taxPercent) / (100 + taxPercent);
    }
    // taxType === "notax" → itemTax stays 0
    
    return sum + itemTax;
  }, 0);

  const netTotal = totalSubtotal + totalTaxAmount + parseFloat(shippingCost || 0);

  return {
    totalQty,
    totalSubtotal,
    totalDiscount: 0,  // ✅ LPO has no discount field
    totalTaxAmount,
    shippingCost: parseFloat(shippingCost || 0),
    netTotal,
  };
};

/**
 * Alias for backward compatibility with GRN calculations
 * ✅ Can be used interchangeably with calculateLpoTotals
 */
export const calculateGrnTotals = calculateLpoTotals;

/**
 * Parse unit type from product data (handles multiple formats)
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
    console.log("💰 Tax extracted from taxPercent:", taxPercent);
  } 
  // Priority 2: tax object with percent/rate properties
  else if (product.tax) {
    if (typeof product.tax === "object") {
      taxPercent = product.tax.percent || product.tax.rate || 0;
      console.log("💰 Tax extracted from tax object:", taxPercent);
    } else {
      taxPercent = product.tax;
      console.log("💰 Tax extracted from tax field:", taxPercent);
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
    console.log("💰 Tax extracted from rate field:", taxPercent);
  } else {
    console.log("⚠️ No tax found - using 0");
  }

  return parseFloat(taxPercent) || 0;
};

/**
 * Map product to LPO item with all required fields
 * @param {Object} product - Product object
 * @param {string} formDataTaxType - Tax type from form
 * @param {Object} selectedUnit - Optional selected unit variant
 * @param {Object} unitTypesMap - Map of unit type IDs to unit data
 */
export const mapProductToLpoItem = (product, formDataTaxType, selectedUnit = null, unitTypesMap = null) => {
  console.log("📝 mapProductToLpoItem - Product tax fields:", {
    productName: product?.name,
    taxPercent: product?.taxPercent,
    taxType: product?.taxType,
    tax: product?.tax,
  });

  let unitName, unitSymbol, unitDecimal, cost, price;
  let conversionFactor = 1;

  if (selectedUnit) {
    // User selected a specific unit variant
    unitName = selectedUnit.unit || selectedUnit.unitSymbol || "PC";
    unitSymbol = selectedUnit.unit || selectedUnit.unitSymbol || "PC";
    unitDecimal = selectedUnit.unitDecimal || 0;
    cost = parseFloat(selectedUnit.cost || product.cost || product.price || product.rate || 0) || 0;
    price = parseFloat(selectedUnit.price || product.price || product.rate || 0) || 0;
    
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
    cost: cost,
    discount: 0,
    discountType: "amount",
    taxType: formDataTaxType,
    taxPercent: taxPercent,
    taxAmount: 0,
    netCost: 0,
    netCostWithoutTax: 0,
    finalCost: 0,
    conversionFactor: conversionFactor,
  };

  // Calculate initial cost
  calculateItemCost(newItem);
  return newItem;
};
