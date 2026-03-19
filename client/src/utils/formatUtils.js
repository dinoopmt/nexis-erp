/**
 * 📊 Data Format & Export Utilities
 * Industrial-standard formatting for CSV export, display formatting, status indicators
 */

import { debugLogger } from "./debugLogger";

const MODULE = "FormatUtils";

/**
 * Get stock status badge info
 * @param {object} product - Product object
 * @returns {object} Status object with color, label, icon
 */
export const getStockStatusInfo = (product) => {
  try {
    const stockLevel = parseInt(product.stocklevel) || 0;
    const minStock = parseInt(product.minStock) || 0;

    debugLogger.time("getStockStatusInfo");

    let status = {
      label: "Unknown",
      color: "gray",
      icon: "❓",
      isLow: false,
      isOut: false,
    };

    if (stockLevel === 0) {
      status = {
        label: "Out of Stock",
        color: "red",
        icon: "❌",
        isOut: true,
        isLow: true,
      };
    } else if (stockLevel < minStock) {
      status = {
        label: `Low (Min: ${minStock})`,
        color: "orange",
        icon: "⚠️",
        isLow: true,
      };
    } else {
      status = {
        label: `In Stock (${stockLevel})`,
        color: "green",
        icon: "✅",
      };
    }

    debugLogger.timeEnd("getStockStatusInfo");
    return status;
  } catch (error) {
    debugLogger.error(MODULE, "Failed to get stock status", error);
    return { label: "Error", color: "red", icon: "❌" };
  }
};

/**
 * Format product row data for CSV export
 * @param {object} product - Product to export
 * @param {object} options - Export options
 * @returns {object} Formatted row
 */
export const formatProductForExport = (product, options = {}) => {
  try {
    debugLogger.time("formatProductForExport");

    const {
      includeStock = true,
      includePricing = true,
      includeDates = false,
    } = options;

    const exportRow = {
      "Item Code": product.itemcode || "",
      "Product Name": product.name || "",
      Category: product.category?.name || product.categoryName || "",
      Description: product.description || "",
    };

    if (includePricing) {
      exportRow["Cost"] =
        product.cost || product.unitVariants?.[0]?.cost || "";
      exportRow["Price"] =
        product.price || product.unitVariants?.[0]?.price || "";
      exportRow["Margin %"] =
        product.margin || product.unitVariants?.[0]?.margin || "";
    }

    if (includeStock) {
      exportRow["Stock Level"] = product.stocklevel || "0";
      exportRow["Min Stock"] = product.minStock || "0";
    }

    if (includeDates) {
      exportRow["Created"] = product.createdAt
        ? new Date(product.createdAt).toLocaleDateString()
        : "";
      exportRow["Modified"] = product.updatedAt
        ? new Date(product.updatedAt).toLocaleDateString()
        : "";
    }

    debugLogger.timeEnd("formatProductForExport");
    return exportRow;
  } catch (error) {
    debugLogger.error(MODULE, "Failed to format product for export", error);
    return {};
  }
};

/**
 * Generate CSV content from products
 * @param {array} products - Products to export
 * @param {object} options - Export options
 * @returns {string} CSV content
 */
export const generateCSVContent = (products, options = {}) => {
  try {
    debugLogger.time("generateCSVContent");

    if (!products || products.length === 0) {
      debugLogger.warn(MODULE, "No products to export");
      return "";
    }

    // Format all products
    const rows = products.map((p) => formatProductForExport(p, options));

    // Get headers from first row
    const headers = Object.keys(rows[0]);

    // Create CSV header
    const csvHeader = headers.map((h) => `"${h}"`).join(",");

    // Create CSV rows
    const csvRows = rows.map((row) => {
      return headers
        .map((header) => {
          const value = row[header];
          const cleanValue = String(value || "").replace(/"/g, '""');
          return `"${cleanValue}"`;
        })
        .join(",");
    });

    const csvContent = [csvHeader, ...csvRows].join("\n");

    debugLogger.timeEnd("generateCSVContent");
    debugLogger.success(MODULE, "CSV content generated", {
      productCount: products.length,
      byteSize: csvContent.length,
    });

    return csvContent;
  } catch (error) {
    debugLogger.error(MODULE, "Failed to generate CSV content", error);
    return "";
  }
};

/**
 * Download CSV file
 * @param {string} csvContent - CSV content
 * @param {string} filename - Output filename
 */
export const downloadCSVFile = (csvContent, filename = "products.csv") => {
  try {
    debugLogger.info(MODULE, "Starting CSV download", { filename });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    debugLogger.success(MODULE, "CSV download completed", { filename });
  } catch (error) {
    debugLogger.error(MODULE, "Failed to download CSV file", error);
  }
};

/**
 * Format price for display with currency symbol
 * @param {number} price - Price value
 * @param {string} currencySymbol - Currency symbol
 * @returns {string} Formatted price
 */
export const formatPrice = (price, currencySymbol = "₹") => {
  try {
    const value = parseFloat(price) || 0;
    return `${currencySymbol} ${value.toFixed(2)}`;
  } catch (error) {
    debugLogger.error(MODULE, "Failed to format price", error);
    return "₹ 0.00";
  }
};

/**
 * Format large numbers with thousands separator
 * @param {number} value - Value to format
 * @param {string} separator - Thousands separator
 * @returns {string} Formatted number
 */
export const formatNumber = (value, separator = ",") => {
  try {
    const num = parseFloat(value) || 0;
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  } catch (error) {
    debugLogger.error(MODULE, "Failed to format number", error);
    return "0";
  }
};

/**
 * Format percentage display
 * @param {number} value - Percentage value
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted percentage
 */
export const formatPercentage = (value, decimals = 2) => {
  try {
    const num = parseFloat(value) || 0;
    return `${num.toFixed(decimals)}%`;
  } catch (error) {
    debugLogger.error(MODULE, "Failed to format percentage", error);
    return "0%";
  }
};

/**
 * Get date display string
 * @param {string|date} dateValue - Date to format
 * @param {string} format - Format type ('short', 'long', 'time')
 * @returns {string} Formatted date
 */
export const formatDate = (dateValue, format = "short") => {
  try {
    if (!dateValue) return "-";

    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return "-";

    switch (format) {
      case "long":
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      case "time":
        return date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
      case "short":
      default:
        return date.toLocaleDateString("en-US");
    }
  } catch (error) {
    debugLogger.error(MODULE, "Failed to format date", error);
    return "-";
  }
};

export default {
  getStockStatusInfo,
  formatProductForExport,
  generateCSVContent,
  downloadCSVFile,
  formatPrice,
  formatNumber,
  formatPercentage,
  formatDate,
};


