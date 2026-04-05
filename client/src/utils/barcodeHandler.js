/**
 * 🚀 BARCODE HANDLER FACTORY
 * Production-grade barcode processing with:
 * - Variant-first matching
 * - Auto quantity increment
 * - Duplicate scan protection
 * - No re-render lag
 */

import { normalizeBarcode } from "./barcodeUtils";

let isProcessing = false;
let lastScanCode = null;
const DUPLICATE_SCAN_TIMEOUT = 500; // ms

const getVariantBarcodeCandidates = (variant) => {
  const barcodeCandidates = [
    variant?.barcode,
    ...(Array.isArray(variant?.additionalBarcodes) ? variant.additionalBarcodes : []),
    ...(Array.isArray(variant?.moreBarcode) ? variant.moreBarcode : []),
  ];

  return barcodeCandidates
    .map((code) => normalizeBarcode(code))
    .filter(Boolean);
};

const findMatchingVariant = (packingUnits = [], barcode) => {
  for (const variant of packingUnits) {
    const barcodeCandidates = getVariantBarcodeCandidates(variant);

    if (barcodeCandidates.includes(barcode)) {
      return {
        variant,
        matchedBarcode: barcode,
      };
    }
  }

  return null;
};

/**
 * Create optimized barcode handler with all search logic
 */
export const createBarcodeHandler = ({
  products,
  apiSearch,
  onVariantFound,
  onDuplicateScan,
  onProductFound,
  onNotFound,
  currentItems = [], // ✅ NEW: Pass current formData.items to verify item exists
}) => {
  return async (rawCode, meta = {}) => {
    // 🔴 Prevent double-scan race conditions
    if (isProcessing) {
      console.log("⏳ [HANDLER] Already processing, ignoring duplicate");
      return;
    }

    const barcode = normalizeBarcode(rawCode);
    if (!barcode) return;

    // ✅ FIXED: Check if identical scan AND item still exists in formData
    if (lastScanCode === barcode) {
      // Check if the item is still in the table
      const matchingItem = currentItems.find((item) => {
        const itemBarcode = normalizeBarcode(item.barcode);
        const itemUnitBarcode = normalizeBarcode(item.unitBarcode);
        return itemBarcode === barcode || itemUnitBarcode === barcode;
      });

      if (matchingItem) {
        if (onDuplicateScan) {
          console.log("🚫 [HANDLER] Identical scan detected - blocking duplicate add");
          onDuplicateScan(barcode, matchingItem, meta);
          return;
        }
      } else {
        console.log("⚠️  [HANDLER] Identical scan BUT item NOT in table - treating as new scan");
        // Fall through to treat as new scan instead of increment
      }
    }

    lastScanCode = barcode;
    isProcessing = true;

    console.log(`📦 [HANDLER] Processing: "${barcode}"`);

    try {
      // ========================================
      // 1️⃣ LOCAL VARIANT MATCH (FASTEST)
      // ========================================
      console.log("🔍 [HANDLER] Checking local variants...");
      for (const product of products) {
        if (!product?.packingUnits || !Array.isArray(product.packingUnits)) {
          continue;
        }

        const matchedVariant = findMatchingVariant(product.packingUnits, barcode);

        if (matchedVariant) {
          console.log(`✅ [HANDLER] VARIANT MATCH (local): ${matchedVariant.variant.unit?.unitName}`);
          return onVariantFound(product, matchedVariant.variant, matchedVariant.matchedBarcode, meta);
        }
      }

      // ========================================
      // 2️⃣ LOCAL PRODUCT MATCH
      // ========================================
      console.log("🔍 [HANDLER] Checking local products...");
      const localProduct = products.find((product) => {
        const prodCode = normalizeBarcode(product.barcode);
        const skuCode = normalizeBarcode(product.sku);
        return prodCode === barcode || skuCode === barcode;
      });

      if (localProduct) {
        console.log(`✅ [HANDLER] PRODUCT MATCH (local): ${localProduct.name}`);
        return onProductFound(localProduct, meta);
      }

      // ========================================
      // 3️⃣ API SEARCH (FALLBACK)
      // ========================================
      console.log(`🌐 [HANDLER] Searching API for: "${barcode}"`);
      const apiResults = await apiSearch(barcode);

      if (!apiResults) {
        console.warn(`❌ [HANDLER] API returned no results`);
        return onNotFound(barcode, meta);
      }

      // API Variant check
      if (apiResults.packingUnits && Array.isArray(apiResults.packingUnits)) {
        const apiVariant = findMatchingVariant(apiResults.packingUnits, barcode);

        if (apiVariant) {
          console.log(`🌐 [HANDLER] VARIANT MATCH (API): ${apiVariant.variant.unit?.unitName}`);
          return onVariantFound(apiResults, apiVariant.variant, apiVariant.matchedBarcode, meta);
        }
      }

      // API Product check
      const prodCode = normalizeBarcode(apiResults.barcode);
      const skuCode = normalizeBarcode(apiResults.sku);
      if (prodCode === barcode || skuCode === barcode) {
        console.log(`🌐 [HANDLER] PRODUCT MATCH (API): ${apiResults.name}`);
        return onProductFound(apiResults, meta);
      }

      console.warn(`❌ [HANDLER] No match found in API results`);
      onNotFound(barcode, meta);
    } catch (err) {
      console.error(`❌ [HANDLER] Error processing barcode:`, err.message);
      onNotFound(barcode, meta);
    } finally {
      // 🔴 Release processing lock with delay
      setTimeout(() => {
        isProcessing = false;
      }, 100);
    }
  };
};
