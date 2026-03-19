/**
 * ============================================================================
 * ENHANCED VALIDATION MODULE
 * ============================================================================
 * 
 * Comprehensive validation for product data with detailed error messages
 * Supports real-time validation on client side and server-side enforcement
 * 
 * Features:
 * - Field-level validation
 * - Cross-field validation
 * - Custom error messages
 * - Validation chains
 * - Async validation support
 * 
 * ============================================================================
 */

export class ValidationError extends Error {
  constructor(field, message, code = 'VALIDATION_ERROR') {
    super(message);
    this.field = field;
    this.code = code;
    this.name = 'ValidationError';
  }
}

export class ProductValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Reset validation state
   */
  reset() {
    this.errors = [];
    this.warnings = [];
    return this;
  }

  /**
   * Validate product object
   */
  validateProduct(product) {
    this.reset();
    
    // Basic field validation
    this.validateBarcode(product.barcode);
    this.validateName(product.name);
    this.validateItemcode(product.itemcode);
    this.validateVendor(product.vendor);
    this.validatePricing(product.cost, product.price);
    this.validateStock(product.stock);
    this.validateCategory(product.categoryId);
    this.validateUnitType(product.unitType);
    
    // Cross-field validation
    this.validatePricingLogic(product.cost, product.price);
    this.validatePackingUnits(product.packingUnits);
    
    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      fieldErrors: this.getFieldErrors()
    };
  }

  /**
   * Get errors grouped by field
   */
  getFieldErrors() {
    const grouped = {};
    this.errors.forEach(err => {
      if (!grouped[err.field]) {
        grouped[err.field] = [];
      }
      grouped[err.field].push(err.message);
    });
    return grouped;
  }

  /**
   * Validate barcode
   */
  validateBarcode(barcode) {
    if (!barcode) {
      this.addError('barcode', 'Barcode is required');
      return;
    }

    const barcodeStr = String(barcode).trim();

    // Check length (standard barcodes are 8, 12, 13, or 14 digits)
    if (!/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(barcodeStr)) {
      this.addWarning(
        'barcode',
        `Barcode length is ${barcodeStr.length}. Standard lengths are 8, 12, 13, or 14 digits.`
      );
    }

    // Check for special characters
    if (!/^[A-Z0-9-]+$/.test(barcodeStr.toUpperCase())) {
      this.addError('barcode', 'Barcode can only contain letters, numbers, and hyphens');
    }

    // Check minimum length
    if (barcodeStr.length < 5) {
      this.addError('barcode', 'Barcode must be at least 5 characters');
    }
  }

  /**
   * Validate item code
   */
  validateItemcode(itemcode) {
    // "Auto-generated" is a special placeholder, skip validation
    if (itemcode === "Auto-generated" || !itemcode) {
      return;
    }

    const itemcodeStr = String(itemcode).trim();

    // Item codes should be numeric or alphanumeric
    if (!/^[A-Z0-9]+$/.test(itemcodeStr.toUpperCase())) {
      this.addError('itemcode', 'Item code can only contain letters and numbers');
    }

    // Minimum length
    if (itemcodeStr.length < 3) {
      this.addError('itemcode', 'Item code must be at least 3 characters');
    }

    // Maximum length
    if (itemcodeStr.length > 50) {
      this.addError('itemcode', 'Item code cannot exceed 50 characters');
    }
  }

  /**
   * Validate product name
   */
  validateName(name) {
    if (!name) {
      this.addError('name', 'Product name is required');
      return;
    }

    const nameStr = String(name).trim();

    // Length validation
    if (nameStr.length < 3) {
      this.addError('name', 'Product name must be at least 3 characters');
    }

    if (nameStr.length > 255) {
      this.addError('name', 'Product name cannot exceed 255 characters');
    }

    // Check for meaningful content (not just numbers or special chars)
    if (!/[a-zA-Z]/.test(nameStr)) {
      this.addError('name', 'Product name must contain at least one letter');
    }
  }

  /**
   * Validate vendor
   */
  validateVendor(vendor) {
    if (!vendor) {
      this.addError('vendor', 'Vendor is required');
      return;
    }

    const vendorStr = String(vendor).trim();

    if (vendorStr.length < 2) {
      this.addError('vendor', 'Vendor name must be at least 2 characters');
    }

    if (vendorStr.length > 100) {
      this.addError('vendor', 'Vendor name cannot exceed 100 characters');
    }
  }

  /**
   * Validate pricing fields
   */
  validatePricing(cost, price) {
    // Validate cost - allow 0 cost (e.g., for donated/free items)
    if (cost === null || cost === undefined || cost === '') {
      this.addError('cost', 'Cost price is required');
      return false;
    }

    const costNum = parseFloat(cost);
    if (isNaN(costNum)) {
      this.addError('cost', 'Cost must be a valid number');
      return false;
    }

    if (costNum < 0) {
      this.addError('cost', 'Cost cannot be negative');
    }

    if (costNum > 99999999.99) {
      this.addError('cost', 'Cost value is too large');
    }

    // Validate price
    if (price === null || price === undefined || price === '') {
      this.addError('price', 'Selling price is required');
      return false;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum)) {
      this.addError('price', 'Price must be a valid number');
      return false;
    }

    if (priceNum < 0) {
      this.addError('price', 'Price cannot be negative');
    }

    if (priceNum > 99999999.99) {
      this.addError('price', 'Price value is too large');
    }

    return true;
  }

  /**
   * Validate pricing logic (price should be >= cost)
   */
  validatePricingLogic(cost, price) {
    if (cost === null || price === null) return;

    const costNum = parseFloat(cost);
    const priceNum = parseFloat(price);

    if (isNaN(costNum) || isNaN(priceNum)) return;

    if (priceNum < costNum) {
      this.addWarning(
        'price',
        `Selling price (${priceNum.toFixed(2)}) is less than cost price (${costNum.toFixed(2)}). This will result in negative margin.`
      );
    }

    const margin = ((priceNum - costNum) / costNum) * 100;
    if (margin > 1000) {
      this.addWarning(
        'price',
        `Margin is extremely high (${margin.toFixed(0)}%). Please verify the price is correct.`
      );
    }
  }

  /**
   * Validate stock quantity
   */
  validateStock(stock) {
    // Stock can be 0 or empty (defaults to 0)
    if (stock === null || stock === undefined || stock === '') {
      return; // Allow empty, will default to 0
    }

    const stockNum = parseInt(stock);
    if (isNaN(stockNum)) {
      this.addError('stock', 'Stock must be a whole number');
      return;
    }

    if (stockNum < 0) {
      this.addError('stock', 'Stock cannot be negative');
    }

    if (stockNum > 999999999) {
      this.addError('stock', 'Stock value is too large');
    }
  }

  /**
   * Validate category
   */
  validateCategory(categoryId) {
    if (!categoryId) {
      this.addWarning('categoryId', 'No category selected. Products should be categorized for better organization.');
    }
  }

  /**
   * Validate unit type
   */
  validateUnitType(unitType) {
    if (!unitType) {
      this.addError('unitType', 'Unit type is required');
    }
  }

  /**
   * Validate packing units
   */
  validatePackingUnits(packingUnits) {
    if (!packingUnits || !Array.isArray(packingUnits) || packingUnits.length === 0) {
      return; // Packing units are optional
    }

    packingUnits.forEach((unit, index) => {
      // Check for empty entries
      if (!unit.barcode || !unit.barcode.trim()) {
        this.addWarning(
          `packingUnits[${index}]`,
          `Packing unit ${index + 1} has empty barcode. It will be ignored.`
        );
        return;
      }

      // Validate barcode format
      if (!/^[A-Z0-9-]+$/.test(String(unit.barcode).toUpperCase())) {
        this.addError(
          `packingUnits[${index}].barcode`,
          `Packing unit ${index + 1} barcode contains invalid characters`
        );
      }

      // Validate price
      if (unit.price) {
        const priceNum = parseFloat(unit.price);
        if (isNaN(priceNum) || priceNum < 0) {
          this.addError(
            `packingUnits[${index}].price`,
            `Packing unit ${index + 1} has invalid price`
          );
        }
      }

      // Validate conversion factor
      if (unit.conversionFactor) {
        const factor = parseInt(unit.conversionFactor);
        if (isNaN(factor) || factor <= 0) {
          this.addError(
            `packingUnits[${index}].conversionFactor`,
            `Packing unit ${index + 1} must have a positive conversion factor`
          );
        }
      }
    });
  }

  /**
   * Add error
   */
  addError(field, message) {
    this.errors.push({
      field,
      message,
      type: 'error',
      timestamp: new Date()
    });
  }

  /**
   * Add warning
   */
  addWarning(field, message) {
    this.warnings.push({
      field,
      message,
      type: 'warning',
      timestamp: new Date()
    });
  }

  /**
   * Check if validation passed
   */
  isValid() {
    return this.errors.length === 0;
  }

  /**
   * Get all messages (errors + warnings)
   */
  getAllMessages() {
    return [...this.errors, ...this.warnings];
  }

  /**
   * Format validation result for API response
   */
  toJSON() {
    return {
      isValid: this.isValid(),
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      errors: this.errors,
      warnings: this.warnings,
      fieldErrors: this.getFieldErrors()
    };
  }
}

/**
 * Create validator instance
 */
export const createValidator = () => new ProductValidator();

/**
 * Validate and throw on first error
 */
export const validateOrThrow = (product) => {
  const validator = new ProductValidator();
  const result = validator.validateProduct(product);
  
  if (!result.isValid) {
    const firstError = result.errors[0];
    throw new ValidationError(firstError.field, firstError.message);
  }
  
  return result;
};

export default ProductValidator;


