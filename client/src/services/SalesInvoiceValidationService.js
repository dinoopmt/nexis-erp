/**
 * SalesInvoiceValidationService
 * All validation logic for invoice data
 */

export class SalesInvoiceValidationService {
  /**
   * Validate entire invoice before saving
   * @param {Object} invoiceData - Invoice data object
   * @param {Array} items - Invoice items
   * @param {Object} selectedCustomerDetails - Selected customer
   * @param {String} companyCountry - Company country
   * @returns {Object} - Validation result { isValid, error, code }
   */
  static validateInvoice(
    invoiceData,
    items,
    selectedCustomerDetails,
    companyCountry
  ) {
    // Check customer
    if (!invoiceData.partyName?.trim()) {
      return { isValid: false, error: "Please select a customer", code: "NO_CUSTOMER" };
    }

    // Country isolation check
    if (selectedCustomerDetails?.country && selectedCustomerDetails.country !== companyCountry) {
      return {
        isValid: false,
        error: `❌ Cannot create invoice: Customer is from ${selectedCustomerDetails.country}, but company is in ${companyCountry}. Not international sales allowed.`,
        code: "COUNTRY_MISMATCH",
      };
    }

    // India-specific: Tax type required
    if (companyCountry === "India" && !selectedCustomerDetails?.taxType) {
      return {
        isValid: false,
        error: "⚠️ India company requires customer to have a GST tax classification. Please set customer tax type.",
        code: "NO_TAX_TYPE",
      };
    }

    // Check payment type
    if (!invoiceData.paymentType?.trim()) {
      return {
        isValid: false,
        error: "Please select a payment type",
        code: "NO_PAYMENT_TYPE",
      };
    }

    // Check payment terms for credit sales
    if (
      selectedCustomerDetails?.paymentType === "Credit Sale" &&
      !invoiceData.paymentTerms?.trim()
    ) {
      return {
        isValid: false,
        error: "Please select payment terms for credit sale customers",
        code: "NO_PAYMENT_TERMS",
      };
    }

    // Check items existence
    if (items.length === 0) {
      return {
        isValid: false,
        error: "Add at least one item to the invoice",
        code: "NO_ITEMS",
      };
    }

    // Validate individual items
    const itemValidation = this.validateItems(items);
    if (!itemValidation.isValid) {
      return itemValidation;
    }

    return { isValid: true };
  }

  /**
   * Validate all items in invoice
   * @param {Array} items - Invoice items
   * @returns {Object} - Validation result
   */
  static validateItems(items) {
    // Check all items have names
    if (items.some((item) => !item.itemName?.trim())) {
      return { isValid: false, error: "All items must have a name", code: "ITEM_NO_NAME" };
    }

    // Check all quantities > 0
    if (items.some((item) => item.qty <= 0)) {
      return {
        isValid: false,
        error: "All items must have quantity greater than 0",
        code: "ITEM_ZERO_QTY",
      };
    }

    // Check all rates > 0
    if (items.some((item) => item.rate <= 0)) {
      return {
        isValid: false,
        error: "All items must have a price greater than 0",
        code: "ITEM_ZERO_RATE",
      };
    }

    return { isValid: true };
  }

  /**
   * Validate single item
   * @param {Object} item - Item to validate
   * @returns {Object} - Validation result
   */
  static validateItem(item) {
    if (!item.itemName?.trim()) {
      return { isValid: false, error: "Item must have a name" };
    }
    if (item.qty <= 0) {
      return { isValid: false, error: "Quantity must be greater than 0" };
    }
    if (item.rate <= 0) {
      return { isValid: false, error: "Price must be greater than 0" };
    }
    return { isValid: true };
  }

  /**
   * Validate customer selection
   * @param {Object} customerDetails - Customer object
   * @returns {Object} - Validation result
   */
  static validateCustomer(customerDetails) {
    if (!customerDetails) {
      return { isValid: false, error: "No customer selected" };
    }
    if (!customerDetails.name) {
      return { isValid: false, error: "Customer must have a name" };
    }
    return { isValid: true };
  }

  /**
   * Check if quantity is valid based on available stock
   * @param {Number} requestedQty - Requested quantity
   * @param {Number} availableQty - Available quantity in stock
   * @returns {Object} - Validation result
   */
  static validateQuantityAgainstStock(requestedQty, availableQty) {
    if (requestedQty > availableQty) {
      return {
        isValid: false,
        error: `Requested quantity (${requestedQty}) exceeds available stock (${availableQty})`,
      };
    }
    return { isValid: true };
  }
}

export default SalesInvoiceValidationService;
