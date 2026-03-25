/**
 * useSalesInvoiceState
 * Central state management with reducer pattern
 * Manages all invoice state in a single hook
 */

import { useReducer, useCallback, createContext, useContext } from "react";

// Action Types
export const INVOICE_ACTIONS = {
  // Invoice-level actions
  SET_INVOICE_NO: "SET_INVOICE_NO",
  SET_INVOICE_DATE: "SET_INVOICE_DATE",
  SET_PAYMENT_TYPE: "SET_PAYMENT_TYPE",
  SET_PAYMENT_TERMS: "SET_PAYMENT_TERMS",
  SET_PARTY_NAME: "SET_PARTY_NAME",
  SET_PARTY_PHONE: "SET_PARTY_PHONE",
  SET_NOTES: "SET_NOTES",
  SET_DISCOUNT: "SET_DISCOUNT",
  SET_DISCOUNT_AMOUNT: "SET_DISCOUNT_AMOUNT",

  // Item actions
  ADD_ITEM: "ADD_ITEM",
  REMOVE_ITEM: "REMOVE_ITEM",
  UPDATE_ITEM: "UPDATE_ITEM",
  UPDATE_ITEM_FIELD: "UPDATE_ITEM_FIELD",
  CLEAR_ITEMS: "CLEAR_ITEMS",

  // Customer actions
  SET_CUSTOMER: "SET_CUSTOMER",
  SET_SELECTED_CUSTOMER_ID: "SET_SELECTED_CUSTOMER_ID",
  SET_SELECTED_CUSTOMER_DETAILS: "SET_SELECTED_CUSTOMER_DETAILS",

  // Item notes
  SET_ITEM_NOTES: "SET_ITEM_NOTES",
  ADD_ITEM_NOTE: "ADD_ITEM_NOTE",
  REMOVE_ITEM_NOTE: "REMOVE_ITEM_NOTE",

  // Serial numbers
  SET_SERIAL_NUMBERS: "SET_SERIAL_NUMBERS",
  ADD_SERIAL_NUMBER: "ADD_SERIAL_NUMBER",
  REMOVE_SERIAL_NUMBER: "REMOVE_SERIAL_NUMBER",
  CLEAR_SERIAL_NUMBERS: "CLEAR_SERIAL_NUMBERS",

  // UI State
  SET_CUSTOMERS_LIST: "SET_CUSTOMERS_LIST",
  SET_INVOICES_LIST: "SET_INVOICES_LIST",
  SET_PRODUCTS_LIST: "SET_PRODUCTS_LIST",
  SET_LOADING: "SET_LOADING",
  SET_ERROR: "SET_ERROR",
  SET_EDIT_ID: "SET_EDIT_ID",

  // Modal states
  SET_SHOW_HISTORY_MODAL: "SET_SHOW_HISTORY_MODAL",
  SET_SHOW_PRODUCT_LOOKUP: "SET_SHOW_PRODUCT_LOOKUP",
  SET_SHOW_ITEM_NOTE_MODAL: "SET_SHOW_ITEM_NOTE_MODAL",
  SET_SHOW_SERIAL_MODAL: "SET_SHOW_SERIAL_MODAL",

  // Filter states
  SET_HISTORY_DATE_FILTER: "SET_HISTORY_DATE_FILTER",
  SET_HISTORY_SEARCH: "SET_HISTORY_SEARCH",
  SET_VIEWED_INVOICE: "SET_VIEWED_INVOICE",

  // Reset all
  RESET_FORM: "RESET_FORM",
};

// Initial state
const createInitialState = (nextInvoiceNo = "001") => ({
  // Invoice data
  invoiceData: {
    invoiceNo: nextInvoiceNo,
    invoiceDate: new Date().toISOString().split("T")[0],
    paymentType: "",
    paymentTerms: "",
    partyName: "",
    partyPhone: "",
    discount: 0,
    discountAmount: 0,
    items: [],
    notes: "",
  },

  // Customer
  customers: [],
  selectedCustomerId: null,
  selectedCustomerDetails: null,

  // Items metadata
  itemNotes: {},
  serialNumbers: {},

  // UI/List data
  invoices: [],
  products: [],
  loading: false,
  error: null,
  editId: null,

  // Modals
  showHistoryModal: false,
  showProductLookup: false,
  showItemNoteModal: false,
  showSerialModal: false,

  // Filters
  historyDateFilter: new Date().toISOString().split("T")[0],
  historySearch: "",
  viewedInvoice: null,
});

// Reducer function
const invoiceReducer = (state, action) => {
  switch (action.type) {
    // Invoice field updates
    case INVOICE_ACTIONS.SET_INVOICE_NO:
      return {
        ...state,
        invoiceData: { ...state.invoiceData, invoiceNo: action.payload },
      };

    case INVOICE_ACTIONS.SET_INVOICE_DATE:
      return {
        ...state,
        invoiceData: { ...state.invoiceData, invoiceDate: action.payload },
      };

    case INVOICE_ACTIONS.SET_PAYMENT_TYPE:
      return {
        ...state,
        invoiceData: { ...state.invoiceData, paymentType: action.payload },
      };

    case INVOICE_ACTIONS.SET_PAYMENT_TERMS:
      return {
        ...state,
        invoiceData: { ...state.invoiceData, paymentTerms: action.payload },
      };

    case INVOICE_ACTIONS.SET_PARTY_NAME:
      return {
        ...state,
        invoiceData: { ...state.invoiceData, partyName: action.payload },
      };

    case INVOICE_ACTIONS.SET_PARTY_PHONE:
      return {
        ...state,
        invoiceData: { ...state.invoiceData, partyPhone: action.payload },
      };

    case INVOICE_ACTIONS.SET_NOTES:
      return {
        ...state,
        invoiceData: { ...state.invoiceData, notes: action.payload },
      };

    case INVOICE_ACTIONS.SET_DISCOUNT:
      return {
        ...state,
        invoiceData: { ...state.invoiceData, discount: action.payload },
      };

    case INVOICE_ACTIONS.SET_DISCOUNT_AMOUNT:
      return {
        ...state,
        invoiceData: { ...state.invoiceData, discountAmount: action.payload },
      };

    // Item actions
    case INVOICE_ACTIONS.ADD_ITEM:
      return {
        ...state,
        invoiceData: {
          ...state.invoiceData,
          items: [...state.invoiceData.items, action.payload],
        },
      };

    case INVOICE_ACTIONS.REMOVE_ITEM:
      return {
        ...state,
        invoiceData: {
          ...state.invoiceData,
          items: state.invoiceData.items.filter((item) => item.id !== action.payload),
        },
        itemNotes: {
          ...state.itemNotes,
          [action.payload]: undefined,
        },
        serialNumbers: {
          ...state.serialNumbers,
          [action.payload]: undefined,
        },
      };

    case INVOICE_ACTIONS.UPDATE_ITEM:
      return {
        ...state,
        invoiceData: {
          ...state.invoiceData,
          items: state.invoiceData.items.map((item) =>
            item.id === action.payload.id ? action.payload.item : item
          ),
        },
      };

    case INVOICE_ACTIONS.UPDATE_ITEM_FIELD:
      return {
        ...state,
        invoiceData: {
          ...state.invoiceData,
          items: state.invoiceData.items.map((item) =>
            item.id === action.payload.itemId
              ? { ...item, [action.payload.field]: action.payload.value }
              : item
          ),
        },
      };

    case INVOICE_ACTIONS.CLEAR_ITEMS:
      return {
        ...state,
        invoiceData: { ...state.invoiceData, items: [] },
        itemNotes: {},
        serialNumbers: {},
      };

    // Customer actions
    case INVOICE_ACTIONS.SET_SELECTED_CUSTOMER_ID:
      return {
        ...state,
        selectedCustomerId: action.payload,
      };

    case INVOICE_ACTIONS.SET_SELECTED_CUSTOMER_DETAILS:
      return {
        ...state,
        selectedCustomerDetails: action.payload,
      };

    // Item notes
    case INVOICE_ACTIONS.ADD_ITEM_NOTE:
      return {
        ...state,
        itemNotes: {
          ...state.itemNotes,
          [action.payload.itemId]: action.payload.note,
        },
      };

    case INVOICE_ACTIONS.REMOVE_ITEM_NOTE:
      return {
        ...state,
        itemNotes: {
          ...state.itemNotes,
          [action.payload]: undefined,
        },
      };

    // Serial numbers
    case INVOICE_ACTIONS.ADD_SERIAL_NUMBER:
      return {
        ...state,
        serialNumbers: {
          ...state.serialNumbers,
          [action.payload.itemId]: [
            ...(state.serialNumbers[action.payload.itemId] || []),
            action.payload.serial,
          ],
        },
      };

    case INVOICE_ACTIONS.REMOVE_SERIAL_NUMBER:
      return {
        ...state,
        serialNumbers: {
          ...state.serialNumbers,
          [action.payload.itemId]: state.serialNumbers[action.payload.itemId]?.filter(
            (s) => s !== action.payload.serial
          ),
        },
      };

    case INVOICE_ACTIONS.CLEAR_SERIAL_NUMBERS:
      return {
        ...state,
        serialNumbers: {},
      };

    // UI State
    case INVOICE_ACTIONS.SET_CUSTOMERS_LIST:
      return {
        ...state,
        customers: action.payload,
      };

    case INVOICE_ACTIONS.SET_INVOICES_LIST:
      return {
        ...state,
        invoices: action.payload,
      };

    case INVOICE_ACTIONS.SET_PRODUCTS_LIST:
      return {
        ...state,
        products: action.payload,
      };

    case INVOICE_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };

    case INVOICE_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
      };

    case INVOICE_ACTIONS.SET_EDIT_ID:
      return {
        ...state,
        editId: action.payload,
      };

    // Modals
    case INVOICE_ACTIONS.SET_SHOW_HISTORY_MODAL:
      return {
        ...state,
        showHistoryModal: action.payload,
      };

    case INVOICE_ACTIONS.SET_SHOW_PRODUCT_LOOKUP:
      return {
        ...state,
        showProductLookup: action.payload,
      };

    case INVOICE_ACTIONS.SET_SHOW_ITEM_NOTE_MODAL:
      return {
        ...state,
        showItemNoteModal: action.payload,
      };

    case INVOICE_ACTIONS.SET_SHOW_SERIAL_MODAL:
      return {
        ...state,
        showSerialModal: action.payload,
      };

    // Filters
    case INVOICE_ACTIONS.SET_HISTORY_DATE_FILTER:
      return {
        ...state,
        historyDateFilter: action.payload,
      };

    case INVOICE_ACTIONS.SET_HISTORY_SEARCH:
      return {
        ...state,
        historySearch: action.payload,
      };

    case INVOICE_ACTIONS.SET_VIEWED_INVOICE:
      return {
        ...state,
        viewedInvoice: action.payload,
      };

    // Reset
    case INVOICE_ACTIONS.RESET_FORM:
      return createInitialState(action.payload?.nextInvoiceNo || "001");

    default:
      return state;
  }
};

/**
 * Main hook for managing sales invoice state
 * @param {String} initialInvoiceNo - Initial invoice number
 * @returns {Object} - State and dispatch
 */
export const useSalesInvoiceState = (initialInvoiceNo = "001") => {
  const [state, dispatch] = useReducer(invoiceReducer, createInitialState(initialInvoiceNo));

  // Convenience methods for common actions
  const actions = {
    setInvoiceNo: useCallback(
      (no) => dispatch({ type: INVOICE_ACTIONS.SET_INVOICE_NO, payload: no }),
      []
    ),
    setInvoiceDate: useCallback(
      (date) => dispatch({ type: INVOICE_ACTIONS.SET_INVOICE_DATE, payload: date }),
      []
    ),
    setPaymentType: useCallback(
      (type) => dispatch({ type: INVOICE_ACTIONS.SET_PAYMENT_TYPE, payload: type }),
      []
    ),
    setPaymentTerms: useCallback(
      (terms) => dispatch({ type: INVOICE_ACTIONS.SET_PAYMENT_TERMS, payload: terms }),
      []
    ),
    setPartyName: useCallback(
      (name) => dispatch({ type: INVOICE_ACTIONS.SET_PARTY_NAME, payload: name }),
      []
    ),
    setPartyPhone: useCallback(
      (phone) => dispatch({ type: INVOICE_ACTIONS.SET_PARTY_PHONE, payload: phone }),
      []
    ),
    setNotes: useCallback(
      (notes) => dispatch({ type: INVOICE_ACTIONS.SET_NOTES, payload: notes }),
      []
    ),
    setDiscount: useCallback(
      (discount) => dispatch({ type: INVOICE_ACTIONS.SET_DISCOUNT, payload: discount }),
      []
    ),
    setDiscountAmount: useCallback(
      (amount) => dispatch({ type: INVOICE_ACTIONS.SET_DISCOUNT_AMOUNT, payload: amount }),
      []
    ),
    addItem: useCallback(
      (item) => dispatch({ type: INVOICE_ACTIONS.ADD_ITEM, payload: item }),
      []
    ),
    removeItem: useCallback(
      (itemId) => dispatch({ type: INVOICE_ACTIONS.REMOVE_ITEM, payload: itemId }),
      []
    ),
    updateItem: useCallback(
      (itemId, item) => dispatch({ type: INVOICE_ACTIONS.UPDATE_ITEM, payload: { id: itemId, item } }),
      []
    ),
    updateItemField: useCallback(
      (itemId, field, value) => 
        dispatch({ type: INVOICE_ACTIONS.UPDATE_ITEM_FIELD, payload: { itemId, field, value } }),
      []
    ),
    clearItems: useCallback(
      () => dispatch({ type: INVOICE_ACTIONS.CLEAR_ITEMS }),
      []
    ),
    setSelectedCustomerId: useCallback(
      (id) => dispatch({ type: INVOICE_ACTIONS.SET_SELECTED_CUSTOMER_ID, payload: id }),
      []
    ),
    setSelectedCustomerDetails: useCallback(
      (details) => dispatch({ type: INVOICE_ACTIONS.SET_SELECTED_CUSTOMER_DETAILS, payload: details }),
      []
    ),
    addItemNote: useCallback(
      (itemId, note) => dispatch({ type: INVOICE_ACTIONS.ADD_ITEM_NOTE, payload: { itemId, note } }),
      []
    ),
    removeItemNote: useCallback(
      (itemId) => dispatch({ type: INVOICE_ACTIONS.REMOVE_ITEM_NOTE, payload: itemId }),
      []
    ),
    addSerialNumber: useCallback(
      (itemId, serial) => dispatch({ type: INVOICE_ACTIONS.ADD_SERIAL_NUMBER, payload: { itemId, serial } }),
      []
    ),
    removeSerialNumber: useCallback(
      (itemId, serial) => dispatch({ type: INVOICE_ACTIONS.REMOVE_SERIAL_NUMBER, payload: { itemId, serial } }),
      []
    ),
    clearSerialNumbers: useCallback(
      () => dispatch({ type: INVOICE_ACTIONS.CLEAR_SERIAL_NUMBERS }),
      []
    ),
    setCustomersList: useCallback(
      (customers) => dispatch({ type: INVOICE_ACTIONS.SET_CUSTOMERS_LIST, payload: customers }),
      []
    ),
    setInvoicesList: useCallback(
      (invoices) => dispatch({ type: INVOICE_ACTIONS.SET_INVOICES_LIST, payload: invoices }),
      []
    ),
    setProductsList: useCallback(
      (products) => dispatch({ type: INVOICE_ACTIONS.SET_PRODUCTS_LIST, payload: products }),
      []
    ),
    setLoading: useCallback(
      (loading) => dispatch({ type: INVOICE_ACTIONS.SET_LOADING, payload: loading }),
      []
    ),
    setError: useCallback(
      (error) => dispatch({ type: INVOICE_ACTIONS.SET_ERROR, payload: error }),
      []
    ),
    setEditId: useCallback(
      (id) => dispatch({ type: INVOICE_ACTIONS.SET_EDIT_ID, payload: id }),
      []
    ),
    setShowHistoryModal: useCallback(
      (show) => dispatch({ type: INVOICE_ACTIONS.SET_SHOW_HISTORY_MODAL, payload: show }),
      []
    ),
    setShowProductLookup: useCallback(
      (show) => dispatch({ type: INVOICE_ACTIONS.SET_SHOW_PRODUCT_LOOKUP, payload: show }),
      []
    ),
    setShowItemNoteModal: useCallback(
      (show) => dispatch({ type: INVOICE_ACTIONS.SET_SHOW_ITEM_NOTE_MODAL, payload: show }),
      []
    ),
    setShowSerialModal: useCallback(
      (show) => dispatch({ type: INVOICE_ACTIONS.SET_SHOW_SERIAL_MODAL, payload: show }),
      []
    ),
    setHistoryDateFilter: useCallback(
      (date) => dispatch({ type: INVOICE_ACTIONS.SET_HISTORY_DATE_FILTER, payload: date }),
      []
    ),
    setHistorySearch: useCallback(
      (search) => dispatch({ type: INVOICE_ACTIONS.SET_HISTORY_SEARCH, payload: search }),
      []
    ),
    setViewedInvoice: useCallback(
      (invoice) => dispatch({ type: INVOICE_ACTIONS.SET_VIEWED_INVOICE, payload: invoice }),
      []
    ),
    resetForm: useCallback(
      (nextInvoiceNo) => dispatch({ type: INVOICE_ACTIONS.RESET_FORM, payload: { nextInvoiceNo } }),
      []
    ),
  };

  return { state, dispatch, ...actions };
};

// Export initial state creator for testing
export { createInitialState };
