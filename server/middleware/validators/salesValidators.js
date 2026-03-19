import { FieldValidator, RequestValidator, rules } from './validationUtils.js';

/**
 * Sales Module Validators
 */

/**
 * Create Sales Invoice Validator
 */
export const createSalesInvoiceValidator = () => {
  const schema = {
    customerId: new FieldValidator('customerId')
      .add('required', rules.required, 'Customer is required'),

    invoiceDate: new FieldValidator('invoiceDate')
      .add('required', rules.required, 'Invoice date is required')
      .add('date', rules.date, 'Invoice date must be a valid date'),

    dueDate: new FieldValidator('dueDate')
      .add('required', rules.required, 'Due date is required')
      .add('date', rules.date, 'Due date must be a valid date'),

    items: new FieldValidator('items')
      .add('required', rules.nonEmptyArray, 'Invoice must have at least one item')
      .add('array', rules.array, 'Items must be an array'),

    tax: new FieldValidator('tax')
      .add('optional', rules.optional, '')
      .add('percentage', rules.percentage, 'Tax must be between 0 and 100'),

    discount: new FieldValidator('discount')
      .add('optional', rules.optional, '')
      .add('percentage', rules.percentage, 'Discount must be between 0 and 100'),

    notes: new FieldValidator('notes')
      .add('optional', rules.optional, '')
      .add('maxLength', rules.maxLength(500), 'Notes cannot exceed 500 characters'),
  };

  return new RequestValidator(schema);
};

/**
 * Create Sales Order Validator
 */
export const createSalesOrderValidator = () => {
  const schema = {
    customerId: new FieldValidator('customerId')
      .add('required', rules.required, 'Customer is required'),

    orderDate: new FieldValidator('orderDate')
      .add('required', rules.required, 'Order date is required')
      .add('date', rules.date, 'Order date must be a valid date'),

    deliveryDate: new FieldValidator('deliveryDate')
      .add('required', rules.required, 'Delivery date is required')
      .add('date', rules.date, 'Delivery date must be a valid date')
      .add('futureDate', rules.futureDate, 'Delivery date must be in the future'),

    items: new FieldValidator('items')
      .add('required', rules.nonEmptyArray, 'Order must have at least one item'),

    shippingAddress: new FieldValidator('shippingAddress')
      .add('required', rules.required, 'Shipping address is required'),
  };

  return new RequestValidator(schema);
};

/**
 * Create Sales Return Validator
 */
export const createSalesReturnValidator = () => {
  const schema = {
    invoiceId: new FieldValidator('invoiceId')
      .add('required', rules.required, 'Invoice ID is required'),

    items: new FieldValidator('items')
      .add('required', rules.nonEmptyArray, 'Return must have at least one item'),

    reason: new FieldValidator('reason')
      .add('required', rules.required, 'Reason for return is required')
      .add('minLength', rules.minLength(5), 'Reason must be at least 5 characters'),

    notes: new FieldValidator('notes')
      .add('optional', rules.optional, '')
      .add('maxLength', rules.maxLength(500), 'Notes cannot exceed 500 characters'),
  };

  return new RequestValidator(schema);
};

/**
 * Create Delivery Note Validator
 */
export const createDeliveryNoteValidator = () => {
  const schema = {
    invoiceId: new FieldValidator('invoiceId')
      .add('required', rules.required, 'Invoice ID is required'),

    deliveryDate: new FieldValidator('deliveryDate')
      .add('required', rules.required, 'Delivery date is required')
      .add('date', rules.date, 'Delivery date must be a valid date'),

    items: new FieldValidator('items')
      .add('required', rules.nonEmptyArray, 'Delivery must have at least one item'),

    driverId: new FieldValidator('driverId')
      .add('optional', rules.optional, ''),

    trackingNumber: new FieldValidator('trackingNumber')
      .add('optional', rules.optional, '')
      .add('minLength', rules.minLength(3), 'Tracking number must be at least 3 characters'),
  };

  return new RequestValidator(schema);
};

/**
 * Create Quotation Validator
 */
export const createQuotationValidator = () => {
  const schema = {
    customerId: new FieldValidator('customerId')
      .add('required', rules.required, 'Customer is required'),

    quotationDate: new FieldValidator('quotationDate')
      .add('required', rules.required, 'Quotation date is required')
      .add('date', rules.date, 'Quotation date must be a valid date'),

    validUntil: new FieldValidator('validUntil')
      .add('required', rules.required, 'Valid until date is required')
      .add('date', rules.date, 'Valid until date must be a valid date')
      .add('futureDate', rules.futureDate, 'Valid until date must be in the future'),

    items: new FieldValidator('items')
      .add('required', rules.nonEmptyArray, 'Quotation must have at least one item'),

    terms: new FieldValidator('terms')
      .add('optional', rules.optional, '')
      .add('maxLength', rules.maxLength(1000), 'Terms cannot exceed 1000 characters'),
  };

  return new RequestValidator(schema);
};

export default {
  createSalesInvoiceValidator,
  createSalesOrderValidator,
  createSalesReturnValidator,
  createDeliveryNoteValidator,
  createQuotationValidator,
};
