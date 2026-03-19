/**
 * 💰 Pricing Calculation Utilities
 * Industrial-standard pricing logic with tax handling
 * Supports margin calculation, tax in/out of price, cost calculations
 */

import { debugLogger } from "./debugLogger";

const MODULE = "PricingUtils";

/**
 * Calculate pricing line values based on changed field
 * @param {object} line - Current pricing line
 * @param {string} changedField - Which field changed
 * @param {number} value - New value
 * @param {number} taxPercent - Tax percentage
 * @param {function} round - Rounding function
 * @param {boolean} includeTaxInPrice - Is price inclusive of tax
 * @returns {object} Updated pricing line
 */
export const calculatePricingLine = (
  line,
  changedField,
  value,
  taxPercent = 0,
  round = Math.round,
  includeTaxInPrice = false
) => {
  try {
    debugLogger.time("calculatePricingLine");

    const cost = parseFloat(line.cost) || 0;
    const margin = parseFloat(line.margin) || 0;
    const price = parseFloat(line.price) || 0;
    const taxPercents = parseFloat(taxPercent) || 0;
    const changeValue = parseFloat(value) || 0;

    let updatedLine = { ...line };

    // Tax multiplier
    const taxMultiplier = 1 + taxPercents / 100;

    switch (changedField) {
      case "cost": {
        const newCost = changeValue;
        const taxAmount = newCost * (taxPercents / 100);
        const costIncludeTax = newCost + taxAmount;

        // If margin is set, calculate price from margin
        if (margin > 0) {
          const marginAmount = newCost * (margin / 100);
          const newPrice = newCost + marginAmount;
          const newPriceWithTax = includeTaxInPrice ? newPrice * taxMultiplier : newPrice;

          updatedLine = {
            ...updatedLine,
            cost: newCost.toString(),
            costIncludetax: round(costIncludeTax).toString(),
            margin: margin.toString(),
            marginAmount: round(marginAmount).toString(),
            price: round(newPriceWithTax).toString(),
            taxAmount: round(taxAmount).toString(),
          };
        } else {
          updatedLine = {
            ...updatedLine,
            cost: newCost.toString(),
            costIncludetax: round(costIncludeTax).toString(),
            taxAmount: round(taxAmount).toString(),
          };
        }
        break;
      }

      case "margin": {
        const newMargin = changeValue;
        const marginAmount = cost * (newMargin / 100);
        const basePrice = cost + marginAmount;
        const finalPrice = includeTaxInPrice ? basePrice * taxMultiplier : basePrice;

        updatedLine = {
          ...updatedLine,
          margin: newMargin.toString(),
          marginAmount: round(marginAmount).toString(),
          price: round(finalPrice).toString(),
        };
        break;
      }

      case "price": {
        const newPrice = changeValue;

        if (includeTaxInPrice && taxPercents > 0) {
          const basePrice = newPrice / taxMultiplier;
          const newCost = parseFloat(line.cost) || 0;
          const newMarginAmount = basePrice - newCost;
          const newMarginPercent = newCost > 0 ? (newMarginAmount / newCost) * 100 : 0;
          const newTaxAmount = basePrice * (taxPercents / 100);

          updatedLine = {
            ...updatedLine,
            price: round(newPrice).toString(),
            margin: round(newMarginPercent).toString(),
            marginAmount: round(newMarginAmount).toString(),
            taxAmount: round(newTaxAmount).toString(),
          };
        } else {
          const newCost = parseFloat(line.cost) || 0;
          const newMarginAmount = newPrice - newCost;
          const newMarginPercent = newCost > 0 ? (newMarginAmount / newCost) * 100 : 0;
          const newTaxAmount = newCost * (taxPercents / 100);

          updatedLine = {
            ...updatedLine,
            price: round(newPrice).toString(),
            margin: round(newMarginPercent).toString(),
            marginAmount: round(newMarginAmount).toString(),
            taxAmount: round(newTaxAmount).toString(),
          };
        }
        break;
      }

      default:
        updatedLine = { ...updatedLine, [changedField]: changeValue };
    }

    debugLogger.timeEnd("calculatePricingLine");
    debugLogger.success(MODULE, "Pricing line calculated", {
      changedField,
      value,
      margin: updatedLine.margin,
    });

    return updatedLine;
  } catch (error) {
    debugLogger.error(MODULE, "Failed to calculate pricing line", error);
    return line;
  }
};

/**
 * Recalculate all pricing lines when tax percentage changes
 * @param {array} pricingLines - All pricing lines
 * @param {number} oldTaxPercent - Previous tax percentage
 * @param {number} newTaxPercent - New tax percentage
 * @param {function} round - Rounding function
 * @param {boolean} includeTaxInPrice - Is price inclusive of tax
 * @returns {array} Updated pricing lines
 */
export const recalculateAllLinesOnTaxChange = (
  pricingLines,
  oldTaxPercent = 0,
  newTaxPercent = 0,
  round = Math.round,
  includeTaxInPrice = false
) => {
  try {
    debugLogger.time("recalculateAllLinesOnTaxChange");
    const oldTaxMult = 1 + oldTaxPercent / 100;
    const newTaxMult = 1 + newTaxPercent / 100;
    const taxDiff = newTaxPercent - oldTaxPercent;

    const recalculatedLines = pricingLines.map((line) => {
      const cost = parseFloat(line.cost) || 0;
      const price = parseFloat(line.price) || 0;
      const margin = parseFloat(line.margin) || 0;

      let basePrice = price;

      // If previously included tax, extract base price
      if (includeTaxInPrice && oldTaxPercent > 0) {
        basePrice = price / oldTaxMult;
      }

      // Apply new tax treatment
      let newPrice = basePrice;
      if (includeTaxInPrice && newTaxPercent > 0) {
        newPrice = basePrice * newTaxMult;
      }

      const newTaxAmount = cost * (newTaxPercent / 100);
      const newCostIncludeTax = cost + newTaxAmount;
      const newMarginAmount = basePrice - cost;
      const newMarginPercent = cost > 0 ? (newMarginAmount / cost) * 100 : 0;

      return {
        ...line,
        price: round(newPrice).toString(),
        margin: round(newMarginPercent).toString(),
        marginAmount: round(newMarginAmount).toString(),
        taxAmount: round(newTaxAmount).toString(),
        costIncludetax: round(newCostIncludeTax).toString(),
      };
    });

    debugLogger.success(MODULE, "All pricing lines recalculated on tax change", {
      lineCount: pricingLines.length,
    });
    debugLogger.timeEnd("recalculateAllLinesOnTaxChange");
    return recalculatedLines;
  } catch (err) {
    debugLogger.error(MODULE, "Failed to recalculate lines on tax change", err);
    debugLogger.timeEnd("recalculateAllLinesOnTaxChange");
    return pricingLines;
  }
};

/**
 * Recalculate margins when tax-in-price toggle changes
 * @param {array} pricingLines - All pricing lines
 * @param {boolean} wasIncludingTax - Was price including tax before
 * @param {number} taxPercent - Tax percentage
 * @param {function} round - Rounding function
 * @returns {array} Updated pricing lines
 */
export const recalculateMarginOnTaxToggle = (
  pricingLines,
  wasIncludingTax,
  taxPercent = 0,
  round = Math.round
) => {
  try {
    debugLogger.time("recalculateMarginOnTaxToggle");

    const taxPercents = parseFloat(taxPercent) || 0;
    const taxMultiplier = 1 + taxPercents / 100;

    const recalculatedLines = pricingLines.map((line) => {
      const cost = parseFloat(line.cost) || 0;
      const price = parseFloat(line.price) || 0;

      let basePrice = price;

      if (wasIncludingTax && taxPercents > 0) {
        // Was TRUE (price included tax), now FALSE (price excludes tax)
        basePrice = price;
      } else if (!wasIncludingTax && taxPercents > 0) {
        // Was FALSE (price excluded tax), now TRUE (price includes tax)
        basePrice = price / taxMultiplier;
      }

      const calculatedMarginAmount = basePrice - cost;
      const calculatedMarginPercent =
        cost > 0 ? (calculatedMarginAmount / cost) * 100 : 0;
      const taxAmount = cost * (taxPercents / 100);
      const costIncludeTax = cost + taxAmount;

      return {
        ...line,
        price: price.toString(), // Keep original price
        margin: round(calculatedMarginPercent).toString(),
        marginAmount: round(calculatedMarginAmount).toString(),
        taxAmount: round(taxAmount).toString(),
        costIncludetax: round(costIncludeTax).toString(),
      };
    });

    debugLogger.timeEnd("recalculateMarginOnTaxToggle");
    debugLogger.success(MODULE, "Margins recalculated on tax toggle", {
      lineCount: pricingLines.length,
      wasIncludingTax,
    });

    return recalculatedLines;
  } catch (error) {
    debugLogger.error(MODULE, "Failed to recalculate margin on tax toggle", error);
    return pricingLines;
  }
};

/**
 * Add padding/empty pricing line template
 * @returns {object} Empty pricing line
 */
export const createEmptyPricingLine = () => {
  return {
    unit: "",
    factor: "",
    cost: "",
    costIncludetax: "",
    margin: "",
    marginAmount: "",
    taxAmount: "",
    price: "",
    barcode: "",
    action: "",
  };
};

export default {
  calculatePricingLine,
  recalculateAllLinesOnTaxChange,
  recalculateMarginOnTaxToggle,
  createEmptyPricingLine,
};


