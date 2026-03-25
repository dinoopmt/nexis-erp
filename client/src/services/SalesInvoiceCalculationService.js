/**
 * SalesInvoiceCalculationService
 * All calculations related to totals, taxes, discounts, and profitability
 */

export class SalesInvoiceCalculationService {
  /**
   * Calculate invoice totals with tax breakdown
   * @param {Array} items - Invoice line items
   * @param {Number} invoiceDiscount - Invoice-level discount percentage
   * @param {Number} invoiceDiscountAmount - Invoice-level discount fixed amount
   * @param {Number} customerTaxRate - Customer's tax rate
   * @param {Function} round - Rounding function (decimal precision)
   * @param {Function} formatNumber - Number formatting function
   * @returns {Object} - Complete totals breakdown
   */
  static calculateTotals(
    items,
    invoiceDiscount,
    invoiceDiscountAmount,
    customerTaxRate,
    round,
    formatNumber
  ) {
    let subtotal = 0;
    let subtotalAfterItemDiscount = 0;
    let totalLineDiscount = 0;

    // Calculate item-level discounts and subtotal
    items.forEach((item) => {
      const amount = round(item.qty * item.rate);
      const percentDiscount = round((amount * (item.itemDiscount ?? 0)) / 100);
      const amountDiscount = round(item.itemDiscountAmount ?? 0);
      const discountedAmount = round(amount - percentDiscount - amountDiscount);

      subtotal += amount;
      totalLineDiscount += percentDiscount + amountDiscount;
      subtotalAfterItemDiscount += discountedAmount;
    });

    // Round subtotals
    subtotal = round(subtotal);
    totalLineDiscount = round(totalLineDiscount);
    subtotalAfterItemDiscount = round(subtotalAfterItemDiscount);

    // Apply invoice-level discount
    const invoicePercentDiscount = round(
      (subtotalAfterItemDiscount * (invoiceDiscount || 0)) / 100
    );
    const invoiceAmountDiscount = round(invoiceDiscountAmount ?? 0);
    const totalInvoiceDiscount = round(invoicePercentDiscount + invoiceAmountDiscount);

    // Total after all discounts (before VAT)
    const totalAfterDiscount = round(subtotalAfterItemDiscount - totalInvoiceDiscount);

    // Calculate TAX
    const totalTax = round((totalAfterDiscount * customerTaxRate) / 100);

    // Grand total
    const grandTotal = round(totalAfterDiscount + totalTax);

    return {
      subtotal: formatNumber(subtotal),
      subtotalRaw: subtotal,
      discount: formatNumber(round(totalLineDiscount + totalInvoiceDiscount)),
      discountRaw: round(totalLineDiscount + totalInvoiceDiscount),
      totalAfterDiscount: formatNumber(totalAfterDiscount),
      totalAfterDiscountRaw: totalAfterDiscount,
      tax: formatNumber(totalTax),
      taxRaw: totalTax,
      taxRate: customerTaxRate,
      total: formatNumber(grandTotal),
      totalRaw: grandTotal,
    };
  }

  /**
   * Calculate profitability metrics
   * @param {Number} subtotal - Invoice subtotal
   * @param {Number} grandTotal - Invoice grand total
   * @param {Number} totalCost - Total cost of items
   * @param {Function} round - Rounding function
   * @returns {Object} - Profit breakdown
   */
  static calculateProfitMetrics(subtotal, grandTotal, totalCost, round) {
    const grossProfit = round(subtotal - totalCost);
    const grossProfitMargin = subtotal > 0 ? round((grossProfit / subtotal) * 100) : 0;
    const netProfit = round(grandTotal - totalCost);
    const netProfitMargin = grandTotal > 0 ? round((netProfit / grandTotal) * 100) : 0;

    return {
      grossProfit,
      grossProfitMargin,
      netProfit,
      netProfitMargin,
    };
  }

  /**
   * Calculate total item quantity
   * @param {Array} items - Invoice line items
   * @returns {Number} - Total quantity
   */
  static calculateTotalItemQuantity(items) {
    return items.reduce((sum, item) => sum + (item.qty || 0), 0);
  }

  /**
   * Calculate total cost
   * @param {Array} items - Invoice line items
   * @param {Function} round - Rounding function
   * @returns {Number} - Total cost
   */
  static calculateTotalCost(items, round) {
    return round(items.reduce((sum, item) => sum + item.cost * item.qty, 0));
  }

  /**
   * Get tax details based on country and rate
   * @param {String} country - Country code
   * @param {Number} taxRate - Tax rate percentage
   * @returns {Object} - Tax details (label, description, breakdown)
   */
  static getTaxDetails(country, taxRate) {
    const taxDetails = {
      UAE: {
        label: "VAT",
        rate: taxRate,
        breakdown: null,
        description: `VAT @ ${taxRate}%`,
      },
      Oman: {
        label: "VAT",
        rate: taxRate,
        breakdown: null,
        description: `VAT @ ${taxRate}%`,
      },
      India: {
        label: "GST",
        rate: taxRate,
        breakdown: {
          cgst: taxRate / 2,
          sgst: taxRate / 2,
        },
        description: `GST @ ${taxRate}% (CGST ${taxRate / 2}% + SGST ${taxRate / 2}%)`,
      },
    };

    return taxDetails[country] || taxDetails.UAE;
  }

  /**
   * Calculate cost for a single line item
   * @param {Object} item - Line item
   * @param {Function} round - Rounding function
   * @returns {Object} - Item cost details
   */
  static calculateItemCost(item, round) {
    const amount = round(item.qty * item.rate);
    const percentDiscount = round((amount * (item.itemDiscount ?? 0)) / 100);
    const amountDiscount = round(item.itemDiscountAmount ?? 0);
    const discountedAmount = round(amount - percentDiscount - amountDiscount);
    const taxAmount = round((discountedAmount * (item.tax ?? 0)) / 100);
    const lineTotal = round(discountedAmount + taxAmount);

    return {
      amount,
      percentDiscount,
      amountDiscount,
      totalDiscount: round(percentDiscount + amountDiscount),
      discountedAmount,
      taxAmount,
      lineTotal,
    };
  }
}

export default SalesInvoiceCalculationService;
