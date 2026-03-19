/**
 * ✅ Product Create/Edit/Save Utilities
 * Shared functions for handling product create/edit/save operations
 * Used by both GlobalProductFormModal and Product.jsx
 * 
 * These are pure functions with NO dependencies on React contexts
 * so they can be reused in different modal patterns
 */

import { toast } from "react-hot-toast";

/**
 * Build pricing lines from product data
 * Used when loading a product for edit mode
 */
export const buildPricingLinesFromProduct = (productData) => {
  if (!productData) return { pricingLines: [], selectedLines: new Set([0]) };

  let pricingVariants = [];

  // ROW 0: Always create base unit from top-level fields
  pricingVariants.push({
    unit: productData.unitType || "",
    factor: productData.factor !== undefined && productData.factor !== null ? productData.factor : 1,
    price: productData.price || "",
    barcode: productData.barcode || "",
    cost: productData.cost || "",
    costIncludetax: productData.costIncludeVat || "",
    margin: productData.marginPercent || "",
    marginAmount: productData.marginAmount || "",
    taxAmount: productData.taxAmount || "",
  });

  // ROWS 1-3: Add packingUnits as variants
  if (
    productData.packingUnits &&
    Array.isArray(productData.packingUnits) &&
    productData.packingUnits.length > 0
  ) {
    pricingVariants = [...pricingVariants, ...productData.packingUnits];
  } else if (
    productData.unitVariants &&
    Array.isArray(productData.unitVariants) &&
    productData.unitVariants.length > 0
  ) {
    pricingVariants = [...pricingVariants, ...productData.unitVariants];
  }

  // Validate and populate all fields
  if (pricingVariants.length > 0) {
    const completeVariants = pricingVariants.map((variant, idx) => {
      let variantUnitId = "";
      if (variant.unit) {
        if (typeof variant.unit === "object" && variant.unit?._id) {
          variantUnitId = String(variant.unit._id);
        } else if (typeof variant.unit === "string") {
          variantUnitId = variant.unit;
        }
      }

      const costWithTax = variant.costIncludeVat || variant.costIncludetax || "";

      return {
        unit: variantUnitId || "",
        factor:
          variant.factor !== undefined && variant.factor !== null
            ? variant.factor
            : idx === 0
              ? 1
              : "",
        price: variant.price || "",
        barcode: variant.barcode || "",
        cost: variant.cost || "",
        costIncludetax: costWithTax,
        margin: variant.margin || "",
        marginAmount: variant.marginAmount || "",
        taxAmount: variant.taxAmount || "",
        additionalBarcodes: variant.additionalBarcodes || [],
        conversionFactor:
          variant.conversionFactor !== undefined && variant.conversionFactor !== null
            ? variant.conversionFactor
            : variant.factor !== undefined && variant.factor !== null
              ? variant.factor
              : idx === 0
                ? 1
                : "",
      };
    });

    // Ensure we have exactly 4 rows
    while (completeVariants.length < 4) {
      completeVariants.push({
        unit: "",
        factor: "",
        price: "",
        barcode: "",
        cost: "",
        costIncludetax: "",
        margin: "",
        marginAmount: "",
        taxAmount: "",
        additionalBarcodes: [],
        conversionFactor: 1,
      });
    }

    const finalPricingLines = completeVariants.slice(0, 4);

    // Mark all non-empty pricing lines as selected
    const selected = new Set();
    for (let i = 0; i < finalPricingLines.length; i++) {
      if (
        finalPricingLines[i]?.unit ||
        finalPricingLines[i]?.barcode ||
        finalPricingLines[i]?.price
      ) {
        selected.add(i);
      }
    }
    selected.add(0);

    return {
      pricingLines: finalPricingLines,
      selectedLines: selected,
    };
  }

  // Default: 4 empty rows
  return {
    pricingLines: [
      { unit: "", factor: 1, price: "", barcode: "", cost: "", costIncludetax: "", margin: "", marginAmount: "", taxAmount: "" },
      { unit: "", factor: "", price: "", barcode: "", cost: "", costIncludetax: "", margin: "", marginAmount: "", taxAmount: "" },
      { unit: "", factor: "", price: "", barcode: "", cost: "", costIncludetax: "", margin: "", marginAmount: "", taxAmount: "" },
      { unit: "", factor: "", price: "", barcode: "", cost: "", costIncludetax: "", margin: "", marginAmount: "", taxAmount: "" },
    ],
    selectedLines: new Set([0]),
  };
};

/**
 * Build product data for saving
 * Constructs the final product object with all fields properly formatted
 */
export const buildProductForSave = (
  productData,
  pricingLines,
  selectedPricingLines,
  { round, isEditMode = false, currentUsername = "Unknown User" }
) => {
  const selectedVariants = pricingLines.filter(
    (_, index) => index === 0 || selectedPricingLines.has(index)
  );

  const unitType = pricingLines[0]?.unit;
  const baseVariant = selectedVariants[0];
  const topLevelCost = baseVariant?.cost || "";
  const topLevelPrice = baseVariant?.price || "";
  const topLevelBarcode = baseVariant?.barcode || "";
  const topLevelFactor = baseVariant?.factor || 1;
  const topLevelCostIncludeVat = baseVariant?.costIncludetax || "";
  const topLevelMarginPercent = baseVariant?.margin || "";
  const topLevelMarginAmount = baseVariant?.marginAmount || "";
  const topLevelTaxAmount = baseVariant?.taxAmount || "";
  const basePrice = topLevelPrice;

  // Build variants for save
  let selectedVariantsForSave = [...selectedVariants];
  selectedVariantsForSave = selectedVariantsForSave.map((variant, idx) => {
    const factor = idx === 0 ? variant.factor || 1 : variant.factor;
    return {
      ...variant,
      factor: factor && factor !== "" ? parseFloat(factor) : idx === 0 ? 1 : "",
    };
  });

  // Apply tax logic
  const taxPercent = parseFloat(productData.taxPercent) || 0;
  if (!productData.taxInPrice && taxPercent > 0) {
    selectedVariantsForSave = selectedVariantsForSave.map((variant) => ({
      ...variant,
      price:
        variant.price !== undefined &&
        variant.price !== null &&
        variant.price !== ""
          ? round(parseFloat(variant.price) * (1 + taxPercent / 100)).toString()
          : variant.price,
    }));
  }

  // Build packingUnits
  const packingUnits = selectedVariantsForSave
    .slice(1)
    .map((variant, idx) => {
      const calculatedPrice = basePrice * (variant.factor || 1);
      return {
        name: variant.unit || `Unit ${variant.factor}`,
        barcode: variant.barcode || "",
        additionalBarcodes: variant.additionalBarcodes || variant.moreBarcode || [],
        unit: variant.unit,
        factor: variant.factor || 1,
        cost: parseFloat(variant.cost) || 0,
        costIncludeVat: parseFloat(variant.costIncludetax) || 0,
        margin: parseFloat(variant.margin) || 0,
        marginAmount: parseFloat(variant.marginAmount) || 0,
        price: calculatedPrice,
        taxAmount: parseFloat(variant.taxAmount) || 0,
        taxInPrice: variant.taxInPrice !== undefined ? variant.taxInPrice : productData.taxInPrice || false,
        conversionFactor: variant.factor || 1,
      };
    });

  // Build pricing levels
  const pricingLevelsToSave = {};
  selectedVariantsForSave.forEach((variant, index) => {
    const calculatedPrice = index === 0 ? basePrice : basePrice * (variant.factor || 1);
    const userDefinedLevels = productData.pricingLevels?.[index] || {};
    pricingLevelsToSave[index] = {
      level1: userDefinedLevels.level1 ? parseFloat(userDefinedLevels.level1) : calculatedPrice || null,
      level2: userDefinedLevels.level2 ? parseFloat(userDefinedLevels.level2) : null,
      level3: userDefinedLevels.level3 ? parseFloat(userDefinedLevels.level3) : null,
      level4: userDefinedLevels.level4 ? parseFloat(userDefinedLevels.level4) : null,
      level5: userDefinedLevels.level5 ? parseFloat(userDefinedLevels.level5) : null,
    };
  });

  // Final product data
  let finalProductData = {
    ...productData,
    itemcode: productData.itemcode === "Auto-generated" ? "" : productData.itemcode,
    cost: topLevelCost,
    price: topLevelPrice,
    barcode: topLevelBarcode,
    factor: topLevelFactor,
    costIncludeVat: topLevelCostIncludeVat,
    marginPercent: topLevelMarginPercent,
    marginAmount: topLevelMarginAmount,
    taxAmount: topLevelTaxAmount,
    unitType: unitType,
    packingUnits: packingUnits,
    pricingLevels: pricingLevelsToSave,
    categoryId:
      productData.categoryId && typeof productData.categoryId === "object" && productData.categoryId !== null
        ? productData.categoryId._id
        : productData.categoryId,
    groupingId:
      productData.groupingId && typeof productData.groupingId === "object" && productData.groupingId !== null
        ? productData.groupingId._id
        : productData.groupingId,
    vendor:
      productData.vendor && typeof productData.vendor === "object" && productData.vendor !== null
        ? productData.vendor._id
        : productData.vendor,
    shortName: productData.shortName || "",
    localName: productData.localName || "",
    country: productData.country || null,
    taxType: productData.taxType || "",
    taxPercent: parseFloat(productData.taxPercent) || 0,
    taxInPrice: productData.taxInPrice || false,
    minStock: parseInt(productData.minStock) || 0,
    maxStock: parseInt(productData.maxStock) || 1000,
    reorderQuantity: parseInt(productData.reorderQuantity) || 100,
    trackExpiry: productData.trackExpiry || false,
    manufacturingDate: productData.manufacturingDate || null,
    expiryDate: productData.expiryDate || null,
    shelfLifeDays: productData.shelfLifeDays ? parseInt(productData.shelfLifeDays) : null,
    expiryAlertDays: productData.expiryAlertDays ? parseInt(productData.expiryAlertDays) : 30,
    openingPrice: productData.openingPrice ? parseFloat(productData.openingPrice) : 0,
    allowOpenPrice: productData.allowOpenPrice || false,
    enablePromotion: productData.enablePromotion || false,
    fastMovingItem: productData.fastMovingItem || false,
    isScaleItem: productData.isScaleItem || false,
    scaleUnitType: productData.scaleUnitType || "",
    itemHold: productData.itemHold || false,
    brandId:
      productData.brandId && typeof productData.brandId === "object" && productData.brandId !== null
        ? productData.brandId._id
        : productData.brandId,
    image: productData.image || null,
  };

  // Add createdBy/updatedBy
  if (!isEditMode) {
    finalProductData.createdBy = currentUsername;
    finalProductData.updatedBy = currentUsername;
  } else {
    finalProductData.updatedBy = currentUsername;
    if (productData.createdBy) {
      finalProductData.createdBy = productData.createdBy;
    }
  }

  return finalProductData;
};

/**
 * Prepare fetched product data with defaults
 * Ensures all fields are present even if backend doesn't return them
 */
export const prepareProductForEdit = (completeProduct, activeCountryCode = "AE") => {
  return {
    _id: completeProduct._id || "",
    itemcode: completeProduct.itemcode || "",
    name: completeProduct.name || "",
    shortName: completeProduct.shortName || "",
    localName: completeProduct.localName || "",
    hsn: completeProduct.hsn || "",
    categoryId: completeProduct.categoryId || "",
    groupingId: completeProduct.groupingId || "",
    brandId: completeProduct.brandId || "",
    vendor: completeProduct.vendor || "",
    unitType: completeProduct.unitType || "",
    factor: completeProduct.factor !== undefined ? completeProduct.factor : 1,
    barcode: completeProduct.barcode || "",
    stock: completeProduct.stock !== undefined ? completeProduct.stock : "",
    minStock: completeProduct.minStock || 0,
    maxStock: completeProduct.maxStock || 1000,
    reorderQuantity: completeProduct.reorderQuantity || 100,
    cost: completeProduct.cost || "",
    price: completeProduct.price || "",
    costIncludeVat: completeProduct.costIncludeVat || "",
    marginPercent: completeProduct.marginPercent || "",
    marginAmount: completeProduct.marginAmount || "",
    taxAmount: completeProduct.taxAmount || "",
    taxType: completeProduct.taxType || "",
    taxPercent: completeProduct.taxPercent || 0,
    gstRate: completeProduct.gstRate || 0,
    taxInPrice: completeProduct.taxInPrice !== undefined ? completeProduct.taxInPrice : false,
    trackExpiry: completeProduct.trackExpiry !== undefined ? completeProduct.trackExpiry : false,
    enablePromotion: completeProduct.enablePromotion !== undefined ? completeProduct.enablePromotion : false,
    fastMovingItem: completeProduct.fastMovingItem !== undefined ? completeProduct.fastMovingItem : false,
    isScaleItem: completeProduct.isScaleItem !== undefined ? completeProduct.isScaleItem : false,
    scaleUnitType: completeProduct.scaleUnitType || "",
    itemHold: completeProduct.itemHold !== undefined ? completeProduct.itemHold : false,
    manufacturingDate: completeProduct.manufacturingDate || null,
    expiryDate: completeProduct.expiryDate || null,
    shelfLifeDays: completeProduct.shelfLifeDays || null,
    expiryAlertDays: completeProduct.expiryAlertDays || 30,
    country: completeProduct.country || activeCountryCode,
    openingPrice: completeProduct.openingPrice || 0,
    allowOpenPrice: completeProduct.allowOpenPrice !== undefined ? completeProduct.allowOpenPrice : false,
    image: completeProduct.image || null,
    createdBy: completeProduct.createdBy || "",
    updatedBy: completeProduct.updatedBy || "",
    packingUnits: Array.isArray(completeProduct.packingUnits) ? completeProduct.packingUnits : [],
    unitVariants: Array.isArray(completeProduct.unitVariants) ? completeProduct.unitVariants : [],
    pricingLevels: completeProduct.pricingLevels && typeof completeProduct.pricingLevels === "object" ? completeProduct.pricingLevels : {},
  };
};


