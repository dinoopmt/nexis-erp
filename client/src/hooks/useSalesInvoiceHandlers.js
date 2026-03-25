/**
 * useSalesInvoiceHandlers
 * All handler functions for invoice operations
 * Including save, print, item management, search, etc.
 */

import { useCallback, useRef } from "react";
import SalesInvoiceService from "../services/SalesInvoiceService";
import SalesInvoiceCalculationService from "../services/SalesInvoiceCalculationService";
import SalesInvoiceValidationService from "../services/SalesInvoiceValidationService";

export const useSalesInvoiceHandlers = (state, actions, { round, formatNumber, config, taxMaster, showToast }) => {
  const itemInputRefs = useRef({});
  const searchInputRef = useRef(null);
  const barcodeBuffer = useRef("");

  /**
   * Add a new empty item to invoice
   */
  const addItem = useCallback(() => {
    const newItem = {
      id: Date.now(),
      itemName: "",
      itemcode: "",
      cost: 0,
      qty: 1,
      rate: 0,
      tax: 5,
      itemDiscount: 0,
      itemDiscountAmount: 0,
      productId: "",
      barcode: "",
      serialNumbers: [],
    };
    actions.addItem(newItem);
  }, [actions]);

  /**
   * Remove item from invoice
   */
  const removeItem = useCallback(
    (id) => {
      actions.removeItem(id);
    },
    [actions]
  );

  /**
   * Update item field
   */
  const updateItemField = useCallback(
    (id, field, value) => {
      actions.updateItemField(id, field, value);
    },
    [actions]
  );

  /**
   * Add item from product search
   */
  const addItemFromSearch = useCallback(
    (product) => {
      const existingIndex = state.invoiceData.items.findIndex(
        (item) => item.productId === product._id
      );

      const customerTaxRate = state.selectedCustomerDetails?.taxGroupId
        ? taxMaster?.find((tg) => tg._id === state.selectedCustomerDetails.taxGroupId)?.totalRate || 5
        : 5;

      if (existingIndex >= 0) {
        // Item exists, increment quantity
        actions.updateItemField(
          state.invoiceData.items[existingIndex].id,
          "qty",
          state.invoiceData.items[existingIndex].qty + 1
        );
      } else {
        // New item
        const newItem = {
          id: Date.now(),
          itemName: product.name,
          qty: 1,
          cost: product.cost,
          rate: product.price,
          tax: customerTaxRate,
          itemDiscount: 0,
          itemDiscountAmount: 0,
          productId: product._id,
          barcode: product.barcode,
          itemcode: product.itemcode,
          serialNumbers: [],
        };
        actions.addItem(newItem);
      }
    },
    [state.invoiceData.items, state.selectedCustomerDetails, taxMaster, actions]
  );

  /**
   * Add item by barcode
   */
  const addItemByBarcode = useCallback(
    async (barcode) => {
      try {
        const product = await SalesInvoiceService.fetchProductByBarcode(barcode);
        if (product) {
          addItemFromSearch(product);
        } else {
          showToast("Product not found", "warning");
        }
      } catch (error) {
        showToast("Error scanning product", "error");
      }
    },
    [addItemFromSearch, showToast]
  );

  /**
   * Save invoice (create or update)
   */
  const handleSaveInvoice = useCallback(
    async (onSuccess) => {
      try {
        // Validation
        const validation = SalesInvoiceValidationService.validateInvoice(
          state.invoiceData,
          state.invoiceData.items,
          state.selectedCustomerDetails,
          config?.country || "UAE"
        );

        if (!validation.isValid) {
          showToast(validation.error, "error", 3000);
          return false;
        }

        actions.setLoading(true);

        // Calculate all metrics
        const totals = SalesInvoiceCalculationService.calculateTotals(
          state.invoiceData.items,
          state.invoiceData.discount,
          state.invoiceData.discountAmount,
          this.getCustomerTaxRate(),
          round,
          formatNumber
        );

        const totalItemQty = SalesInvoiceCalculationService.calculateTotalItemQuantity(state.invoiceData.items);
        const totalCost = SalesInvoiceCalculationService.calculateTotalCost(state.invoiceData.items, round);
        const profitMetrics = SalesInvoiceCalculationService.calculateProfitMetrics(
          parseFloat(totals.subtotalRaw),
          parseFloat(totals.totalRaw),
          totalCost,
          round
        );

        const payload = {
          invoiceNumber: state.invoiceData.invoiceNo,
          financialYear: "2025-26", // Should come from config
          date: state.invoiceData.invoiceDate,
          paymentType: state.invoiceData.paymentType,
          paymentTerms: state.invoiceData.paymentTerms,
          createdDate: new Date().toISOString(),
          updatedDate: new Date().toISOString(),

          customerId: state.selectedCustomerDetails?._id || "",
          customerName: state.invoiceData.partyName,
          customerPhone: state.selectedCustomerDetails?.phone || "",
          customerTRN: state.selectedCustomerDetails?.vendorTRN || "",

          totalItems: state.invoiceData.items.length,
          totalItemQty: totalItemQty,

          subtotal: Number(totals.subtotalRaw),
          discountPercentage: round(state.invoiceData.discount || 0),
          discountAmount: round(state.invoiceData.discountAmount || 0),
          totalAfterDiscount: Number(totals.totalAfterDiscountRaw),
          vatPercentage: this.getCustomerTaxRate(),
          vatAmount: Number(totals.taxRaw),
          totalIncludeVat: Number(totals.totalRaw),

          totalCost: totalCost,
          grossProfit: profitMetrics.grossProfit,
          grossProfitMargin: profitMetrics.grossProfitMargin,
          netProfit: profitMetrics.netProfit,
          netProfitMargin: profitMetrics.netProfitMargin,

          notes: state.invoiceData.notes,
          items: state.invoiceData.items,
          itemNotes: state.itemNotes,
          serialNumbers: state.serialNumbers,
        };

        let result;
        if (state.editId) {
          result = await SalesInvoiceService.updateInvoice(state.editId, payload);
          showToast("Invoice updated successfully", "success");
        } else {
          result = await SalesInvoiceService.createInvoice(payload);
          showToast("Invoice saved successfully", "success");
        }

        actions.setLoading(false);
        if (onSuccess) onSuccess(result);
        return result;
      } catch (error) {
        actions.setLoading(false);
        showToast("Error saving invoice: " + error.message, "error");
        return false;
      }
    },
    [state, actions, config, round, formatNumber, showToast]
  );

  /**
   * Print invoice
   */
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  /**
   * Save and print invoice
   */
  const handleSaveAndPrint = useCallback(async () => {
    const saved = await handleSaveInvoice(() => {
      setTimeout(() => handlePrint(), 500);
    });
    return saved;
  }, [handleSaveInvoice, handlePrint]);

  /**
   * Reset form for new invoice
   */
  const resetForm = useCallback(async () => {
    try {
      const nextNo = await SalesInvoiceService.getNextInvoiceNumber("2025-26");
      actions.resetForm(nextNo);
      showToast("Form reset for new invoice", "info");
    } catch (error) {
      showToast("Error resetting form", "error");
    }
  }, [actions, showToast]);

  /**
   * Load invoice for editing
   */
  const loadInvoiceForEdit = useCallback(
    async (invoice) => {
      try {
        actions.setLoading(true);
        const fullInvoice = await SalesInvoiceService.fetchInvoiceById(invoice._id);
        
        // Populate form with invoice data
        actions.setEditId(fullInvoice._id);
        // Additional logic to populate items, customer, etc.
        
        actions.setLoading(false);
        showToast("Invoice loaded for editing", "info");
      } catch (error) {
        actions.setLoading(false);
        showToast("Error loading invoice", "error");
      }
    },
    [actions, showToast]
  );

  /**
   * Delete invoice
   */
  const deleteInvoice = useCallback(
    async (invoiceId) => {
      try {
        if (window.confirm("Are you sure you want to delete this invoice?")) {
          actions.setLoading(true);
          await SalesInvoiceService.deleteInvoice(invoiceId);
          actions.setLoading(false);
          showToast("Invoice deleted successfully", "success");
          // Refresh list
          return true;
        }
      } catch (error) {
        actions.setLoading(false);
        showToast("Error deleting invoice", "error");
      }
    },
    [actions, showToast]
  );

  /**
   * Get customer's tax rate
   */
  const getCustomerTaxRate = useCallback(() => {
    if (state.selectedCustomerDetails?.taxGroupId && taxMaster) {
      const customerTaxGroup = taxMaster.find(
        (tg) => tg._id === state.selectedCustomerDetails.taxGroupId
      );
      if (customerTaxGroup) {
        return customerTaxGroup.totalRate || 5;
      }
    }
    return 5;
  }, [state.selectedCustomerDetails, taxMaster]);

  return {
    // Item handlers
    addItem,
    removeItem,
    updateItemField,
    addItemFromSearch,
    addItemByBarcode,

    // Invoice handlers
    handleSaveInvoice,
    handlePrint,
    handleSaveAndPrint,
    resetForm,
    loadInvoiceForEdit,
    deleteInvoice,

    // Utilities
    getCustomerTaxRate,
    itemInputRefs,
    searchInputRef,
    barcodeBuffer,
  };
};

export default useSalesInvoiceHandlers;
