import { FieldValidator, RequestValidator, rules } from './validationUtils.js';

/**
 * Inventory/Product Module Validators
 */

/**
 * Create Product Validator
 */
export const createProductValidator = () => {
  const schema = {
    barcode: new FieldValidator('barcode')
      .add('required', rules.required, 'Barcode is required')
      .add('minLength', rules.minLength(3), 'Barcode must be at least 3 characters'),

    name: new FieldValidator('name')
      .add('required', rules.required, 'Product name is required')
      .add('minLength', rules.minLength(3), 'Product name must be at least 3 characters')
      .add('maxLength', rules.maxLength(100), 'Product name cannot exceed 100 characters'),

    vendor: new FieldValidator('vendor')
      .add('required', rules.required, 'Vendor is required'),

    cost: new FieldValidator('cost')
      .add('required', rules.required, 'Cost price is required')
      .add('nonNegativeNumber', rules.min(0), 'Cost cannot be negative'),

    price: new FieldValidator('price')
      .add('required', rules.required, 'Selling price is required')
      .add('positiveNumber', rules.positiveNumber, 'Price must be a positive number'),

    stock: new FieldValidator('stock')
      .add('optional', rules.optional, '')
      .add('integer', rules.integer, 'Stock must be a whole number')
      .add('min', rules.min(0), 'Stock cannot be negative'),

    categoryId: new FieldValidator('categoryId')
      .add('required', rules.required, 'Category is required'),

    groupingId: new FieldValidator('groupingId')
      .add('required', rules.required, 'Sub-category is required'),

    hsn: new FieldValidator('hsn')
      .add('optional', rules.optional, '')
      .add('minLength', rules.minLength(2), 'HSN code must be at least 2 characters'),

    packingUnits: new FieldValidator('packingUnits')
      .add('optional', rules.optional, ''),
  };

  return new RequestValidator(schema);
};

/**
 * Update Product Validator
 */
export const createUpdateProductValidator = () => {
  const schema = {
    name: new FieldValidator('name')
      .add('optional', rules.optional, '')
      .add('minLength', rules.minLength(3), 'Product name must be at least 3 characters'),

    barcode: new FieldValidator('barcode')
      .add('optional', rules.optional, '')
      .add('minLength', rules.minLength(3), 'Barcode must be at least 3 characters'),

    vendor: new FieldValidator('vendor')
      .add('optional', rules.optional, ''),

    cost: new FieldValidator('cost')
      .add('optional', rules.optional, '')
      .add('nonNegativeNumber', rules.min(0), 'Cost cannot be negative'),

    price: new FieldValidator('price')
      .add('optional', rules.optional, '')
      .add('positiveNumber', rules.positiveNumber, 'Price must be a positive number'),

    stock: new FieldValidator('stock')
      .add('optional', rules.optional, '')
      .add('integer', rules.integer, 'Stock must be a whole number'),
  };

  return new RequestValidator(schema);
};

/**
 * Update Stock Validator
 */
export const createUpdateStockValidator = () => {
  const schema = {
    quantity: new FieldValidator('quantity')
      .add('required', rules.required, 'Quantity is required')
      .add('integer', rules.integer, 'Quantity must be a whole number'),

    reason: new FieldValidator('reason')
      .add('optional', rules.optional, '')
      .add('minLength', rules.minLength(3), 'Reason must be at least 3 characters'),
  };

  return new RequestValidator(schema);
};

/**
 * Search Products Validator
 */
export const createSearchProductsValidator = () => {
  const schema = {
    query: new FieldValidator('query')
      .add('required', rules.required, 'Search query is required')
      .add('minLength', rules.minLength(2), 'Search query must be at least 2 characters'),

    limit: new FieldValidator('limit')
      .add('optional', rules.optional, '')
      .add('integer', rules.integer, 'Limit must be a number')
      .add('between', rules.between(1, 100), 'Limit must be between 1 and 100'),
  };

  return new RequestValidator(schema);
};

export default {
  createProductValidator,
  createUpdateProductValidator,
  createUpdateStockValidator,
  createSearchProductsValidator,
};
