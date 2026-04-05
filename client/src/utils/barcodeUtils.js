/**
 * 🎟️ Barcode Utilities
 * Industrial-standard barcode generation and validation
 * Format: [ItemCode:4 digits] + [DepartmentCode:2 digits] + [RowIndex:2 digits] + [Padding:2 digits] = 10 digits
 */

import { debugLogger } from "./debugLogger";

const MODULE = "BarcodeUtils";

/**
 * Generate base barcode from item code and department
 * @param {string} itemCode - Product item code
 * @param {string} departmentId - Department ID
 * @param {array} departments - List of departments
 * @returns {string} Generated 10-digit barcode
 */
export const generateBarcode = (itemCode, departmentId, departments) => {
  try {
    debugLogger.time("generateBarcode");

    const itemCodeStr = itemCode || "0000";
    const deptId = departmentId || "0";

    // Extract only numbers from item code (skip alphabets) - 4 digits
    const numericItemCode = String(itemCodeStr).replace(/[^0-9]/g, "");
    const itemDigits = numericItemCode.slice(0, 4).padStart(4, "0");

    // Get department code/index - 2 digits
    const deptIndex = departments.findIndex((d) => d._id === deptId);
    const deptCode = String(Math.max(deptIndex + 1, 1)).padStart(2, "0");

    // Base unit barcode: item + dept + "00" (row 0) + "00" (padding)
    const generatedBarcode = (itemDigits + deptCode + "00" + "00")
      .slice(0, 10)
      .padEnd(10, "0")
      .replace(/[^0-9]/g, "") // Remove any non-numeric characters
      .padStart(10, "0")
      .slice(0, 10);

    debugLogger.timeEnd("generateBarcode");
    debugLogger.success(MODULE, "Base barcode generated", {
      itemCode,
      barcode: generatedBarcode,
    });

    return generatedBarcode;
  } catch (error) {
    debugLogger.error(MODULE, "Failed to generate barcode", error);
    return "0000000000";
  }
};

/**
 * Generate unit-specific variant barcode
 * @param {number} lineIndex - Line/row index
 * @param {string} itemCode - Product item code
 * @param {string} departmentId - Department ID
 * @param {array} departments - List of departments
 * @returns {string} Generated 10-digit variant barcode
 */
export const generateUnitBarcode = (
  lineIndex,
  itemCode,
  departmentId,
  departments
) => {
  try {
    debugLogger.time("generateUnitBarcode");

    const itemCodeStr = itemCode || "0000";
    const deptId = departmentId || "0";

    // Extract numeric item code - 4 digits
    const numericItemCode = String(itemCodeStr).replace(/[^0-9]/g, "");
    const itemDigits = numericItemCode.slice(0, 4).padStart(4, "0");

    // Get department code/index - 2 digits
    const deptIndex = departments.findIndex((d) => d._id === deptId);
    const deptCode = String(Math.max(deptIndex + 1, 1)).padStart(2, "0");

    // Row index for this row - 2 digits
    const rowIndex = String(lineIndex).padStart(2, "0");
    const padding = "00";

    // Create 10-digit variant barcode
    let variantBarcode = (itemDigits + deptCode + rowIndex + padding)
      .slice(0, 10)
      .padEnd(10, "0");

    // Extra safety: ensure only numbers
    variantBarcode = variantBarcode
      .replace(/[^0-9]/g, "")
      .padStart(10, "0")
      .slice(0, 10);

    debugLogger.timeEnd("generateUnitBarcode");
    debugLogger.success(MODULE, "Variant barcode generated", {
      lineIndex,
      barcode: variantBarcode,
    });

    return variantBarcode;
  } catch (error) {
    debugLogger.error(MODULE, "Failed to generate unit barcode", error);
    return "0000000000";
  }
};

/**
 * Generate unique barcode with suffix for inventory tracking
 * @param {string} baseBarcode - Base barcode
 * @param {number} lineIndex - Line index for suffix
 * @returns {string} Unique barcode with suffix
 */
export const generateUniqueBarcode = (baseBarcode, lineIndex) => {
  try {
    debugLogger.time("generateUniqueBarcode");

    const base = String(baseBarcode || "0000000000").slice(0, 10);
    const suffix = String(lineIndex).padStart(3, "0");

    // Combine keeping it within reasonable length
    const unique = (base + suffix).slice(0, 13);

    debugLogger.timeEnd("generateUniqueBarcode");
    debugLogger.success(MODULE, "Unique barcode generated", {
      baseBarcode,
      lineIndex,
      unique,
    });

    return unique;
  } catch (error) {
    debugLogger.error(MODULE, "Failed to generate unique barcode", error);
    return "0000000000";
  }
};

/**
 * Validate barcode format
 * @param {string} barcode - Barcode to validate
 * @returns {object} Validation result
 */
export const validateBarcode = (barcode) => {
  const numericBarcode = String(barcode).replace(/[^0-9]/g, "");

  const isValid = {
    isValid: numericBarcode.length >= 8 && numericBarcode.length <= 13,
    length: numericBarcode.length,
    isNumeric: numericBarcode.length === String(barcode).length,
  };

  debugLogger.info(MODULE, "Barcode validation", { barcode, ...isValid });

  return isValid;
};

/**
 * Format barcode for display
 * @param {string} barcode - Raw barcode
 * @returns {string} Formatted barcode
 */
export const formatBarcodeForDisplay = (barcode) => {
  const clean = String(barcode).replace(/[^0-9]/g, "");
  if (clean.length === 10) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}-${clean.slice(8)}`;
  }
  return clean;
};

/**
 * 🔴 NORMALIZE BARCODE FOR MATCHING
 * Production-grade normalization for POS scanning
 * - Trims whitespace
 * - Removes internal spaces (hidden scanner characters)
 * - Converts to lowercase
 * - Handles all scanner hardware formats
 */
export const normalizeBarcode = (code) => {
  if (!code) return "";
  
  return code
    .trim()
    .replace(/\s+/g, "") // Remove all spaces (including hidden newlines)
    .toLowerCase(); // Case insensitive
};

/**
 * Check if barcode is valid (minimum length)
 */
export const isValidBarcode = (code) => {
  const normalized = normalizeBarcode(code);
  return normalized.length >= 3;
};

/**
 * Debug: Show barcode byte values (for hidden characters)
 */
export const debugBarcode = (code) => {
  return code
    .split("")
    .map((char) => `${char}(${char.charCodeAt(0)})`)
    .join(" ");
};

export default {
  generateBarcode,
  generateUnitBarcode,
  generateUniqueBarcode,
  validateBarcode,
  formatBarcodeForDisplay,
  normalizeBarcode,
  isValidBarcode,
  debugBarcode,
};


