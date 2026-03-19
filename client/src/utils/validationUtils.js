/**
 * ✅ Validation Utilities
 * Industrial-standard validation for products, pricing, barcodes
 * Centralized validation rules for easy debugging and maintenance
 */

import { debugLogger } from "./debugLogger";

const MODULE = "ValidationUtils";

/**
 * Validate product basic information
 * @param {object} product - Product object to validate
 * @param {object} options - Validation options
 * @returns {object} Validation result with errors
 */
export const validateProductBasicInfo = (product, options = {}) => {
  try {
    debugLogger.time("validateProductBasicInfo");

    const errors = {};
    const { requireHSN = false, requireVendor = false } = options;

    // Item Code validation
    if (!product.itemcode || String(product.itemcode).trim() === "") {
      errors.itemcode = "Item Code is required";
    }

    // Product Name validation
    if (!product.name || String(product.name).trim() === "") {
      errors.name = "Product Name is required";
    } else if (product.name.length < 3) {
      errors.name = "Product Name must be at least 3 characters";
    } else if (product.name.length > 100) {
      errors.name = "Product Name cannot exceed 100 characters";
    }

    // Category validation
    if (!product.categoryId) {
      errors.category = "Category/Department is required";
    }

    // HSN Code validation (if required and India)
    if (requireHSN && !product.hsnCode) {
      errors.hsnCode = "HSN Code is required for India";
    }

    // Vendor validation (if required)
    if (requireVendor && !product.vendorId) {
      errors.vendorId = "Vendor is required";
    }

    // Description validation
    if (product.description && product.description.length > 500) {
      errors.description = "Description cannot exceed 500 characters";
    }

    debugLogger.timeEnd("validateProductBasicInfo");

    if (Object.keys(errors).length > 0) {
      debugLogger.warn(MODULE, "Product validation failed", errors);
    } else {
      debugLogger.success(MODULE, "Product basic info validated");
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  } catch (error) {
    debugLogger.error(MODULE, "Failed to validate product basic info", error);
    return { isValid: false, errors: { general: "Validation error" } };
  }
};

/**
 * Validate pricing lines
 * @param {array} pricingLines - Pricing lines to validate
 * @returns {object} Validation result
 */
export const validatePricingLines = (pricingLines) => {
  try {
    debugLogger.time("validatePricingLines");

    const errors = [];

    if (!pricingLines || pricingLines.length === 0) {
      return {
        isValid: false,
        errors: [{ general: "At least one pricing line is required" }],
      };
    }

    pricingLines.forEach((line, index) => {
      const lineErrors = {};

      // Unit validation
      if (!line.unit) {
        lineErrors.unit = "Unit is required";
      }

      // Factor validation
      const factor = parseFloat(line.factor);
      if (isNaN(factor) || factor <= 0) {
        lineErrors.factor = "Factor must be greater than 0";
      }

      // Cost validation
      const cost = parseFloat(line.cost);
      if (isNaN(cost) || cost < 0) {
        lineErrors.cost = "Cost must be 0 or greater";
      }

      // Price validation
      const price = parseFloat(line.price);
      if (isNaN(price) || price < 0) {
        lineErrors.price = "Price must be 0 or greater";
      }

      // Price > Cost validation
      if (!isNaN(cost) && !isNaN(price) && cost > 0 && price < cost) {
        lineErrors.price = "Price should be greater than cost";
      }

      if (Object.keys(lineErrors).length > 0) {
        errors.push({ lineIndex: index, ...lineErrors });
      }
    });

    debugLogger.timeEnd("validatePricingLines");

    if (errors.length > 0) {
      debugLogger.warn(MODULE, "Pricing validation failed", { lineCount: pricingLines.length, errorCount: errors.length });
    } else {
      debugLogger.success(MODULE, "Pricing lines validated", {
        lineCount: pricingLines.length,
      });
    }

    return { isValid: errors.length === 0, errors };
  } catch (error) {
    debugLogger.error(MODULE, "Failed to validate pricing lines", error);
    return {
      isValid: false,
      errors: [{ general: "Pricing validation error" }],
    };
  }
};

/**
 * Validate barcode variants
 * @param {array} barcodeVariants - Barcode variants to validate
 * @returns {object} Validation result
 */
export const validateBarcodeVariants = (barcodeVariants) => {
  try {
    debugLogger.time("validateBarcodeVariants");

    const errors = {
      duplicate: [],
      invalid: [],
    };

    const barcodes = new Set();

    barcodeVariants.forEach((variant, index) => {
      const barcode = String(variant.barcode || "").trim();

      // Check for empty barcode
      if (!barcode) {
        errors.invalid.push({
          index,
          unit: variant.unit,
          reason: "Barcode is empty",
        });
        return;
      }

      // Check for non-numeric barcode
      if (!/^\d+$/.test(barcode)) {
        errors.invalid.push({
          index,
          barcode,
          reason: "Barcode must contain only numbers",
        });
        return;
      }

      // Check for duplicate barcode
      if (barcodes.has(barcode)) {
        errors.duplicate.push({ index, barcode });
      }

      barcodes.add(barcode);
    });

    debugLogger.timeEnd("validateBarcodeVariants");

    const isValid =
      errors.duplicate.length === 0 && errors.invalid.length === 0;

    if (!isValid) {
      debugLogger.warn(MODULE, "Barcode validation failed", errors);
    } else {
      debugLogger.success(MODULE, "Barcode variants validated", {
        variantCount: barcodeVariants.length,
      });
    }

    return { isValid, errors };
  } catch (error) {
    debugLogger.error(MODULE, "Failed to validate barcode variants", error);
    return { isValid: false, errors: { general: "Barcode validation error" } };
  }
};

/**
 * Get validation summary message
 * @param {object} validationResult - Result from validation functions
 * @returns {string} Readable error message
 */
export const getValidationErrorMessage = (validationResult) => {
  const { errors } = validationResult;

  if (typeof errors === "string") {
    return errors;
  }

  if (Array.isArray(errors)) {
    return errors
      .map((e) => {
        if (typeof e === "string") return e;
        if (e.general) return e.general;
        if (e.message) return e.message;
        return JSON.stringify(e);
      })
      .join("; ");
  }

  if (typeof errors === "object") {
    return Object.entries(errors)
      .map(([key, value]) => {
        if (typeof value === "string") return value;
        if (Array.isArray(value)) return value.join(", ");
        return JSON.stringify(value);
      })
      .join("; ");
  }

  return "Validation failed";
};

export default {
  validateProductBasicInfo,
  validatePricingLines,
  validateBarcodeVariants,
  getValidationErrorMessage,
};


