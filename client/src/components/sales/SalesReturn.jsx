import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  Trash2,
  Printer,
  Save,
  X,
  ChevronDown,
  ScanBarcode,
  Search,
  User,
  Phone,
  FileText,
  Calendar,
  ShoppingCart,
  Receipt,
  Clock,
  Package,
  Copy,
  Eye,
  Edit2,
  Hash,
} from "lucide-react";
import axios from "axios";
import { API_URL } from "../../config/config";
import { useProductSearch } from "../../hooks/useProductSearch";
import { useTaxMaster } from "../../hooks/useTaxMaster";
import { useDecimalFormat } from "../../hooks/useDecimalFormat";
import GlobalDocumentPrintingComponent from "../shared/printing/GlobalDocumentPrintingComponent";

const SalesReturn = () => {
  // Get company data for country-based filtering
  const { company } = useTaxMaster();
  const { round, formatNumber, sum } = useDecimalFormat(); // ✅ NEW: Use global decimal formatting
  const [openDropdown, setOpenDropdown] = useState(null);

  const itemInputRefs = useRef({});
  const customerDropdownRef = useRef(null);
  const [focusedCell, setFocusedCell] = useState(null);

  const [returnData, setReturnData] = useState({
    returnNo: "001",
    returnDate: new Date().toISOString().split("T")[0],
    paymentType: "",
    paymentTerms: "",
    partyName: "",
    partyPhone: "",
    discount: 0,
    discountAmount: 0,
    items: [],
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [returns, setReturns] = useState([]);
  const [editId, setEditId] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [viewedReturn, setViewedReturn] = useState(null);
  const [historyDateFilter, setHistoryDateFilter] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [historySearch, setHistorySearch] = useState("");
  const [financialYear, setFinancialYear] = useState("2025-26");

  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null);
  const [hoveredCustomer, setHoveredCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // ✅ NEW: Invoice Selection (MANDATORY)
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);
  const [invoiceError, setInvoiceError] = useState(null);
  const [returnWindowStatus, setReturnWindowStatus] = useState(null); // {isWithin, daysLeft, message}
  const [storeSettings, setStoreSettings] = useState(null);

  // ✅ NEW: Item Selection Modal (opens after invoice selection)
  const [showItemSelectionModal, setShowItemSelectionModal] = useState(false);
  const [invoiceItemsForSelection, setInvoiceItemsForSelection] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());
  const [currentInvoiceId, setCurrentInvoiceId] = useState(null); // ✅ Track invoice used in return

  // ✅ NEW: Invoice Selection Modal
  const [showInvoiceSelectionModal, setShowInvoiceSelectionModal] =
    useState(false);
  const [invoiceSearchModal, setInvoiceSearchModal] = useState("");

  // ✅ NEW: Return Reason (MANDATORY)
  const [returnReason, setReturnReason] = useState("");
  const [returnReasonError, setReturnReasonError] = useState("");

  const [itemNotes, setItemNotes] = useState({});
  const [showItemNoteModal, setShowItemNoteModal] = useState(false);
  const [selectedItemNote, setSelectedItemNote] = useState(null);

  const [serialNumbers, setSerialNumbers] = useState({});
  const [showSerialModal, setShowSerialModal] = useState(false);
  const [selectedItemSerial, setSelectedItemSerial] = useState(null);
  const [newSerialInput, setNewSerialInput] = useState("");

  const [showPrintingModal, setShowPrintingModal] = useState(false);
  const [savedReturnId, setSavedReturnId] = useState(null); // For Save & Print flow

  const [toasts, setToasts] = useState([]);

  const showToast = (type = "info", message = "", duration = 3000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, duration);
  };

  const closeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      setToasts([]);

      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSaveReturn();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        handleSaveAndPrint();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        addItem();
      }

      if (e.key === "Escape") {
        if (focusedCell) {
          e.preventDefault();
          setFocusedCell(null);
        } else if (showItemNoteModal) {
          setShowItemNoteModal(false);
        } else if (showSerialModal) {
          setShowSerialModal(false);
        } else if (showItemSelectionModal) {
          handleCancelItemSelection();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [focusedCell, showItemNoteModal, showSerialModal, showItemSelectionModal]);

  const resetForm = async () => {
    const newReturnNumber = await axios.get(
      `${API_URL}/sales-returns/nextReturnNumber?financialYear=${financialYear}`,
    );
    setReturnData({
      returnNo:
        newReturnNumber.data.sequence || newReturnNumber.data.returnNumber,
      returnDate: new Date().toISOString().split("T")[0],
      paymentType: "",
      paymentTerms: "",
      partyName: "",
      partyPhone: "",
      discount: 0,
      discountAmount: 0,
      items: [],
      notes: "",
    });
    setSerialNumbers({});
    setItemNotes({});
    setShowSerialModal(false);
    setShowItemNoteModal(false);
    setSelectedItemSerial(null);
    setSelectedItemNote(null);
    setNewSerialInput("");

    setSelectedCustomerId(null);
    setSelectedCustomerDetails(null);
    setHoveredCustomer(null);
    setCustomerSearch("");
    setShowCustomerDropdown(false);

    setCurrentInvoiceId(null); // ✅ Reset invoice tracking
    setSelectedInvoice(null);

    // ✅ Reset invoice/return reason fields
    setInvoiceSearch("");
    setShowInvoiceDropdown(false);
    setInvoiceError("");
    setReturnReason("");
    setReturnReasonError("");
    setReturnWindowStatus(null);
    setShowInvoiceSelectionModal(false);
    setInvoiceSearchModal("");
    setShowItemSelectionModal(false);
    setSelectedItemIds(new Set());
    setInvoiceItemsForSelection([]);

    // ✅ Close printing modal
    setShowPrintingModal(false);
    setViewedReturn(null);
    setSavedReturnId(null);
  };

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/sales-returns/getSalesReturns`);
      setReturns(res.data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch returns");
    }
    setLoading(false);
  };

  const filteredHistoryReturns = returns.filter((returnItem) => {
    const returnDate = new Date(returnItem.date).toISOString().split("T")[0];
    const dateMatch = returnDate === historyDateFilter;

    if (!historySearch.trim()) {
      return dateMatch;
    }

    const searchLower = historySearch.toLowerCase();
    const customerNameMatch = returnItem.customerName
      ?.toLowerCase()
      .includes(searchLower);
    const returnNumberMatch = returnItem.returnNumber
      ?.toString()
      .includes(historySearch);

    return dateMatch && (customerNameMatch || returnNumberMatch);
  });

  const hasFetchedReturns = useRef(false);

  useEffect(() => {
    if (!hasFetchedReturns.current) {
      hasFetchedReturns.current = true;
      fetchReturns();
    }
  }, []);

  const fetchCustomers = async () => {
    try {
      // Country isolation: Always filter by company's country
      const countryCode = company?.countryCode || "AE";
      const res = await axios.get(
        `${API_URL}/customers/getcustomers?limit=100&country=${countryCode}`,
      );
      setCustomers(res.data.customers || []);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [company]);

  // ✅ NEW: Fetch store settings (for return window validation)
  const fetchStoreSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/settings/store`);
      if (res.data?.data) {
        // Extract storeControlSettings if it exists, otherwise use entire data
        const controlSettings =
          res.data.data.storeControlSettings || res.data.data;
        setStoreSettings({
          salesReturnAllowedDays: controlSettings.salesReturnAllowedDays || 30,
          // ✅ ENFORCED: Invoice mandatory + Strict return window (no exceptions)
        });
      }
    } catch (err) {
      console.error("Failed to fetch store settings:", err);
      // ✅ Fallback: Use default return window if endpoint fails
      setStoreSettings({
        salesReturnAllowedDays: 30,
      });
    }
  };

  // ✅ NEW: Fetch invoices for the selected customer with store settings date filtering
  const fetchInvoicesForCustomer = async (customerId) => {
    if (!customerId) return;
    try {
      console.log(`🔍 Fetching invoices for customer: ${customerId}`);
      const res = await axios.get(
        `${API_URL}/sales-invoices/getInvoicesByCustomer/${customerId}`,
      );
      let allInvoices = res.data?.data || res.data || [];

      console.log(`📊 Backend returned ${allInvoices.length} total invoices`);
      console.log(
        `📋 All invoices:`,
        allInvoices.map((inv) => ({
          number: inv.invoiceNumber,
          date: inv.date,
          parsedDate: new Date(inv.date).toLocaleDateString(),
        })),
      );

      // ✅ IMPORTANT: Show ALL invoices, don't filter on frontend
      // The dropdown will color-code them as in/out of window
      // Backend validation will reject out-of-window returns

      setInvoices(allInvoices);
      setInvoiceError(null);
    } catch (err) {
      console.error("❌ Failed to fetch invoices:", err);
      setInvoices([]);
      setInvoiceError(`Failed to fetch invoices: ${err.message}`);
    }
  };

  // ✅ NEW: Validate if return is within allowed window (STRICT - no exceptions)
  const validateReturnWindow = (invoiceDate) => {
    if (!storeSettings || !invoiceDate) return null;
    const invoice = new Date(invoiceDate);
    const today = new Date();
    const daysDiff = Math.floor((today - invoice) / (1000 * 60 * 60 * 24));
    const allowedDays = storeSettings.salesReturnAllowedDays || 30;
    const daysLeft = allowedDays - daysDiff;
    const isWithin = daysDiff <= allowedDays;
    return {
      isWithin,
      daysDiff,
      daysLeft,
      allowedDays,
      message: isWithin
        ? `✅ Within return window (${daysLeft} days left)`
        : `❌ Return window expired (${daysDiff} days ago) - No returns permitted`,
    };
  };

  // ✅ NEW: Handle invoice selection - Open item selection modal
  const handleSelectInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setCurrentInvoiceId(invoice._id); // ✅ Track which invoice is being used
    setInvoiceSearch("");
    setShowInvoiceDropdown(false);
    const windowStatus = validateReturnWindow(invoice.date);
    setReturnWindowStatus(windowStatus);

    // ✅ NEW: Auto-populate customer from invoice
    setSelectedCustomerId(invoice.customerId);
    setSelectedCustomerDetails({
      _id: invoice.customerId,
      name: invoice.customerName,
      phone: invoice.customerPhone,
      vendorTRN: invoice.customerTRN,
      address: invoice.customerAddress,
    });

    // ✅ UPDATED: Open item selection modal instead of directly adding items
    const itemsForModal = (invoice.items || []).map((item, idx) => ({
      id: `${invoice._id}_${item._id || idx}`,
      itemName: item.itemName,
      itemcode: item.itemcode,
      originalQty: item.quantity || item.qty || 0,
      rate: item.unitPrice || item.rate || 0,
      productId: item.productId,
      discount: item.discount || item.itemDiscount || 0,
      taxRate: item.taxRate || item.tax || item.vatRate || 5,
      unit: item.unit || item.unitName || "PC",
      invoiceItemId: item._id || idx,
    }));

    setInvoiceItemsForSelection(itemsForModal);
    setSelectedItemIds(new Set()); // Clear previous selections
    setShowItemSelectionModal(true); // Open modal for item selection

    setReturnData((prev) => ({
      ...prev,
      partyName: invoice.customerName,
      partyPhone: invoice.customerPhone,
    }));
  };

  // ✅ Initialize on mount
  useEffect(() => {
    fetchStoreSettings();
  }, []);

  // ✅ NEW: Toggle item selection in modal
  const handleSelectItemForReturn = (itemId) => {
    const newSelected = new Set(selectedItemIds);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItemIds(newSelected);
  };

  // ✅ NEW: Select/Deselect all items
  const handleSelectAllItems = (selectAll) => {
    if (selectAll) {
      setSelectedItemIds(
        new Set(invoiceItemsForSelection.map((item) => item.id)),
      );
    } else {
      setSelectedItemIds(new Set());
    }
  };

  // ✅ NEW: Add selected items to return table
  const handleAddSelectedItems = () => {
    if (selectedItemIds.size === 0) {
      showToast("error", "Please select at least one item");
      return;
    }

    // ✅ VALIDATE: Check if return table already has items from a DIFFERENT invoice
    if (returnData.items.length > 0 && currentInvoiceId) {
      const existingInvoiceId = returnData.items[0].invoiceId;
      if (existingInvoiceId && existingInvoiceId !== currentInvoiceId) {
        showToast(
          "error",
          "❌ Cannot mix items from different invoices. Return must contain items from only ONE invoice.",
        );
        return;
      }
    }

    // ✅ VALIDATE: Check for duplicate items already in return table
    const selectedItemsToAdd = invoiceItemsForSelection.filter((item) =>
      selectedItemIds.has(item.id),
    );

    const duplicateItems = [];
    const newItems = [];

    selectedItemsToAdd.forEach((item) => {
      // Check if item already exists in return table
      const itemExists = returnData.items.some(
        (tableItem) =>
          tableItem.itemcode === item.itemcode &&
          tableItem.productId === item.productId,
      );

      if (itemExists) {
        duplicateItems.push(item.itemName);
      } else {
        newItems.push(item);
      }
    });

    // ✅ Show validation error if duplicates found
    if (duplicateItems.length > 0) {
      const duplicateList =
        duplicateItems.length <= 2
          ? duplicateItems.join(", ")
          : `${duplicateItems.slice(0, 2).join(", ")} +${duplicateItems.length - 2} more`;
      showToast(
        "error",
        `❌ Cannot add: ${duplicateList} - already in return table`,
      );

      // If some items are duplicates but others are new, still add the new ones
      if (newItems.length === 0) {
        // All items are duplicates - close modal without adding
        setShowItemSelectionModal(false);
        setSelectedItemIds(new Set());
        return;
      }
    }

    // ✅ Add only new items
    if (newItems.length > 0) {
      const timestamp = Date.now();
      const baseId = Math.random().toString(36).substring(2, 9);

      const itemsToAdd = newItems.map((item, idx) => ({
        // ✅ UNIQUE ID: Combination of timestamp + random + index
        id: `${timestamp}_${baseId}_${idx}`,
        itemName: item.itemName,
        itemcode: item.itemcode,
        qty: 0, // User will enter qty
        rate: item.rate,
        productId: item.productId,
        originalQty: item.originalQty,
        alreadyReturnedQty: 0,
        itemDiscount: item.discount,
        taxRate: item.taxRate,
        unit: item.unit,
        invoiceItemId: item.invoiceItemId,
        invoiceId: currentInvoiceId, // ✅ Store which invoice this item came from
      }));

      // Add to return data
      setReturnData((prev) => ({
        ...prev,
        items: [...prev.items, ...itemsToAdd],
      }));

      showToast(
        "success",
        `✅ Added ${itemsToAdd.length} item(s) to return${
          duplicateItems.length > 0
            ? ` (${duplicateItems.length} duplicate(s) skipped)`
            : ""
        }`,
      );
    }

    // Close modal and reset selection
    setShowItemSelectionModal(false);
    setSelectedItemIds(new Set());
    setInvoiceItemsForSelection([]);
  };

  // ✅ NEW: Cancel item selection
  const handleCancelItemSelection = () => {
    setShowItemSelectionModal(false);
    setSelectedItemIds(new Set());
    setInvoiceItemsForSelection([]);
  };

  useEffect(() => {
    if (Object.keys(serialNumbers).length > 0) {
      setReturnData((prev) => ({
        ...prev,
        items: prev.items.map((item) => ({
          ...item,
          serialNumbers: serialNumbers[item.id] || [],
        })),
      }));
    }
  }, [serialNumbers]);

  const handleSelectCustomer = (customerId) => {
    const customer = customers.find((c) => c._id === customerId);
    if (customer) {
      setSelectedCustomerId(customerId);
      setSelectedCustomerDetails(customer);
      setReturnData((prev) => ({
        ...prev,
        partyName: customer.name || customer.vendorName,
        partyPhone: customer.phone || customer.vendorPhone,
      }));
      setShowCustomerDropdown(false);
      setHoveredCustomer(null);
      setCustomerSearch("");

      // ✅ NEW: Fetch invoices for this customer
      fetchInvoicesForCustomer(customerId);

      // ✅ Reset invoice selection when customer changes
      setSelectedInvoice(null);
      setInvoices([]);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.vendorName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.vendorPhone?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.vendorTRN?.toLowerCase().includes(customerSearch.toLowerCase()),
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(event.target)
      ) {
        setShowCustomerDropdown(false);
        setHoveredCustomer(null);
      }
    };

    if (showCustomerDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showCustomerDropdown]);

  const handleTableCellKeyDown = (e, itemId, currentField, itemIndex) => {
    const fieldOrder = ["qty", "rate", "itemDiscount", "itemDiscountAmount"];
    const currentFieldIndex = fieldOrder.indexOf(currentField);

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      removeItem(itemId);
      return;
    }

    if (e.key === "ArrowDown" && !e.shiftKey) {
      e.preventDefault();
      if (itemIndex < returnData.items.length - 1) {
        const nextItemId = returnData.items[itemIndex + 1].id;
        const nextRef = itemInputRefs.current[`${nextItemId}_${currentField}`];
        if (nextRef) {
          nextRef.focus();
          nextRef.select();
          setFocusedCell({ itemId: nextItemId, field: currentField });
        }
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (itemIndex > 0) {
        const prevItemId = returnData.items[itemIndex - 1].id;
        const prevRef = itemInputRefs.current[`${prevItemId}_${currentField}`];
        if (prevRef) {
          prevRef.focus();
          prevRef.select();
          setFocusedCell({ itemId: prevItemId, field: currentField });
        }
      }
      return;
    }

    if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();

      const nextFieldIndex = e.shiftKey
        ? currentFieldIndex - 1
        : currentFieldIndex + 1;

      if (nextFieldIndex < 0) {
        if (itemIndex > 0) {
          const prevItemId = returnData.items[itemIndex - 1].id;
          const lastField = fieldOrder[fieldOrder.length - 1];
          const prevRef = itemInputRefs.current[`${prevItemId}_${lastField}`];
          if (prevRef) {
            prevRef.focus();
            prevRef.select();
            setFocusedCell({ itemId: prevItemId, field: lastField });
          }
        }
      } else if (nextFieldIndex >= fieldOrder.length) {
        if (itemIndex < returnData.items.length - 1) {
          const nextItemId = returnData.items[itemIndex + 1].id;
          const firstField = fieldOrder[0];
          const nextRef = itemInputRefs.current[`${nextItemId}_${firstField}`];
          if (nextRef) {
            nextRef.focus();
            nextRef.select();
            setFocusedCell({ itemId: nextItemId, field: firstField });
          }
        } else {
          setFocusedCell(null);
        }
      } else {
        const nextField = fieldOrder[nextFieldIndex];
        const nextRef = itemInputRefs.current[`${itemId}_${nextField}`];
        if (nextRef) {
          nextRef.focus();
          nextRef.select();
          setFocusedCell({ itemId: itemId, field: nextField });
        }
      }
    }
  };

  useEffect(() => {
    const currentItemIds = new Set(returnData.items.map((item) => item.id));
    const fieldOrder = ["qty", "rate", "itemDiscount", "itemDiscountAmount"];

    Object.keys(itemInputRefs.current).forEach((key) => {
      const itemId = key.split("_")[0];
      if (!currentItemIds.has(itemId)) {
        delete itemInputRefs.current[key];
      }
    });
  }, [returnData.items]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setReturnData({ ...returnData, [name]: value });
  };

  const handleItemChange = (id, field, value) => {
    // ✅ REAL-TIME VALIDATION with Toast Notifications
    const item = returnData.items.find((i) => i.id === id);
    if (!item) return;

    let validationError = null;
    let successMessage = null;

    // ✅ RETURN QUANTITY VALIDATION
    if (field === "qty") {
      const newQty = parseFloat(value) || 0;
      const maxAllowedQty = item.originalQty - (item.alreadyReturnedQty || 0);

      // Validate: Cannot be negative
      if (newQty < 0) {
        validationError = `Return quantity cannot be negative`;
        showToast("error", validationError);
        return; // Don't update state
      }

      // Validate: Cannot exceed max allowed
      if (newQty > maxAllowedQty) {
        validationError = `⚠️ Item "${item.itemName}": Max qty is ${maxAllowedQty} (Inv Qty: ${item.originalQty} - Already Returned: ${item.alreadyReturnedQty || 0})`;
        showToast("error", validationError);
        return; // Don't update state
      }

      // Success: Valid quantity entered
      if (newQty > 0 && newQty <= maxAllowedQty) {
        successMessage = `✅ Item qty: ${newQty}/${maxAllowedQty}`;
        showToast("success", successMessage);
      }
    }

    // ✅ UNIT PRICE VALIDATION
    if (field === "rate") {
      const newRate = parseFloat(value) || 0;
      const itemQty = item.qty || 0;

      // Validate: If qty > 0, price must be > 0
      if (itemQty > 0 && newRate <= 0) {
        validationError = `💰 Item "${item.itemName}": Price must be greater than 0 when returning items`;
        showToast("error", validationError);
        return; // Don't update state
      }

      // Validate: Negative prices not allowed
      if (newRate < 0) {
        validationError = `💰 Price cannot be negative`;
        showToast("error", validationError);
        return; // Don't update state
      }

      // Success: Valid price
      if (newRate > 0) {
        successMessage = `✅ Price updated: AED ${formatNumber(newRate)}`;
        showToast("success", successMessage);
      }
    }

    // ✅ DISCOUNT VALIDATION
    if (field === "itemDiscount") {
      const newDiscount = parseFloat(value) || 0;

      // Validate: Discount cannot be negative
      if (newDiscount < 0) {
        validationError = `🏷️ Discount cannot be negative`;
        showToast("error", validationError);
        return; // Don't update state
      }

      // Validate: Discount cannot exceed 100%
      if (newDiscount > 100) {
        validationError = `🏷️ Discount cannot exceed 100%`;
        showToast("error", validationError);
        return; // Don't update state
      }

      // Success: Valid discount
      if (newDiscount >= 0 && newDiscount <= 100) {
        successMessage = `✅ Discount: ${newDiscount}%`;
        showToast("success", successMessage);
      }
    }

    // ✅ VAT PERCENTAGE VALIDATION
    if (field === "taxRate") {
      const newTaxRate = parseFloat(value) || 0;

      // Validate: VAT cannot be negative
      if (newTaxRate < 0) {
        validationError = `💸 VAT % cannot be negative`;
        showToast("error", validationError);
        return; // Don't update state
      }

      // Validate: VAT cannot exceed 100%
      if (newTaxRate > 100) {
        validationError = `💸 VAT % cannot exceed 100%`;
        showToast("error", validationError);
        return; // Don't update state
      }

      // Success: Valid VAT
      if (newTaxRate >= 0 && newTaxRate <= 100) {
        successMessage = `✅ VAT: ${newTaxRate}%`;
        showToast("success", successMessage);
      }
    }

    // ✅ UPDATE STATE ONLY IF NO VALIDATION ERROR
    const updated = returnData.items.map((i) =>
      i.id === id ? { ...i, [field]: value } : i,
    );
    setReturnData({ ...returnData, items: updated });
  };

  const addItem = () => {
    // ✅ ENFORCED: Items can only be added from invoice selection
    showToast(
      "error",
      "Items can only be added from the selected invoice. Please select an invoice first.",
    );
    return;
  };

  const removeItem = (id) => {
    setReturnData({
      ...returnData,
      items: returnData.items.filter((item) => item.id !== id),
    });
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let subtotalAfterItemDiscount = 0;
    let totalLineDiscount = 0;

    returnData.items.forEach((item) => {
      const amount = Number(round(item.qty * item.rate));
      const percentDiscount = Number(
        round((amount * (item.itemDiscount ?? 0)) / 100),
      );
      const amountDiscount = Number(round(item.itemDiscountAmount ?? 0)) || 0;
      const discountedAmount = Number(
        round(amount - percentDiscount - amountDiscount),
      );

      subtotal += amount;
      totalLineDiscount += percentDiscount + amountDiscount;
      subtotalAfterItemDiscount += discountedAmount;
    });

    subtotal = round(subtotal);
    totalLineDiscount = round(totalLineDiscount);
    subtotalAfterItemDiscount = round(subtotalAfterItemDiscount);

    const invoicePercentDiscount = round(
      (subtotalAfterItemDiscount * (returnData.discount || 0)) / 100,
    );
    const invoiceAmountDiscount = round(returnData.discountAmount ?? 0) || 0;
    const totalInvoiceDiscount = round(
      invoicePercentDiscount + invoiceAmountDiscount,
    );

    const totalAfterDiscount = round(
      subtotalAfterItemDiscount - totalInvoiceDiscount,
    );

    const avgVatRate =
      returnData.items.length > 0
        ? round(
            returnData.items.reduce((sum, item) => sum + (item.tax || 5), 0) /
              returnData.items.length,
          )
        : 0;
    const totalTax = round((totalAfterDiscount * avgVatRate) / 100);

    const grandTotal = round(totalAfterDiscount + totalTax);

    return {
      subtotal: String(subtotal),
      discount: String(totalLineDiscount + totalInvoiceDiscount),
      totalAfterDiscount: String(totalAfterDiscount),
      tax: String(totalTax),
      total: String(grandTotal),
    };
  };

  const totals = calculateTotals();

  const handleSaveReturn = async () => {
    // ✅ NEW: Validate invoice is selected (MANDATORY)
    if (!selectedInvoice) {
      setInvoiceError("Invoice selection is MANDATORY for sales returns");
      showToast("error", "Please select an invoice");
      return false;
    }

    // ✅ NEW: Validate return reason (MANDATORY, min 5 chars)
    if (!returnReason.trim() || returnReason.trim().length < 5) {
      setReturnReasonError("Return reason is required (minimum 5 characters)");
      showToast("error", "Please provide a return reason (min 5 characters)");
      return false;
    }

    // ✅ STRICT: Validate return window (NO EXCEPTIONS - must be within allowed days)
    if (returnWindowStatus && !returnWindowStatus.isWithin) {
      showToast(
        "error",
        `Return window expired. Returns must be within ${returnWindowStatus.allowedDays} days of invoice date.`,
      );
      return false;
    }

    // ✅ ENHANCED: Validate all items are from invoice with strict qty checks
    let totalReturnQty = 0;
    for (const item of returnData.items) {
      if (item.qty <= 0) continue; // Skip items with 0 qty

      // Find corresponding invoice item
      const invoiceItem = selectedInvoice.items?.find(
        (ii) =>
          ii._id === item.productId ||
          ii.productId === item.productId ||
          ii.itemName === item.itemName,
      );

      if (!invoiceItem) {
        showToast(
          "error",
          `Item ${item.itemName} (${item.itemcode}) is not from the selected invoice`,
        );
        return false;
      }

      // Calculate max allowed return qty (invoice qty - already returned)
      const maxAllowedQty =
        (invoiceItem.quantity || invoiceItem.qty || 0) -
        (item.alreadyReturnedQty || 0);

      if (item.qty > maxAllowedQty) {
        showToast(
          "error",
          `Item "${item.itemName}": Return qty (${item.qty}) exceeds allowed (${maxAllowedQty}). Already returned: ${item.alreadyReturnedQty || 0}`,
        );
        return false;
      }

      totalReturnQty += item.qty;
    }

    // Validate at least one item has qty > 0
    if (totalReturnQty === 0) {
      showToast("error", "Please enter return quantity for at least one item");
      return false;
    }

    // ✅ UPDATED: Customer is auto-populated from invoice, so invoice selection guarantees customer
    if (!selectedCustomerDetails?.name) {
      showToast(
        "error",
        "Customer not found (should be auto-populated from invoice)",
      );
      return false;
    }
    if (!returnData.paymentType?.trim()) {
      showToast("error", "Please select a payment type");
      return false;
    }
    if (
      selectedCustomerDetails?.paymentType === "Credit Sale" &&
      !returnData.paymentTerms?.trim()
    ) {
      showToast(
        "error",
        "Please select payment terms for credit sale customers",
      );
      return false;
    }
    if (returnData.items.length === 0) {
      showToast("error", "Add at least one item to the return");
      return false;
    }
    if (returnData.items.some((item) => !item.itemName?.trim())) {
      showToast("error", "All items must have a name");
      return false;
    }
    // ✅ UPDATED: Allow items with 0 qty (user selects which items to return)
    // The totalReturnQty check above ensures at least one item has qty > 0
    if (returnData.items.some((item) => item.qty > 0 && item.rate <= 0)) {
      showToast("error", "All returned items must have a price greater than 0");
      return false;
    }

    setLoading(true);
    try {
      const now = new Date().toISOString();

      const totalItemQty = returnData.items.reduce(
        (sum, item) => sum + item.qty,
        0,
      );
      const totalCost = round(
        returnData.items.reduce((sum, item) => sum + item.cost * item.qty, 0),
      );
      const avgVatPercentage =
        returnData.items.length > 0
          ? round(
              returnData.items.reduce((sum, item) => sum + (item.tax || 5), 0) /
                returnData.items.length,
            )
          : 0;

      const grossProfit = round(parseFloat(totals.subtotal) - totalCost);
      const grossProfitMargin =
        parseFloat(totals.subtotal) > 0
          ? round((grossProfit / parseFloat(totals.subtotal)) * 100)
          : 0;
      const netProfit = round(parseFloat(totals.total) - totalCost);
      const netProfitMargin =
        parseFloat(totals.total) > 0
          ? round((netProfit / parseFloat(totals.total)) * 100)
          : 0;

      const payload = {
        returnNumber: returnData.returnNo,
        financialYear: financialYear,
        date: returnData.returnDate,
        paymentType: returnData.paymentType,
        paymentTerms: returnData.paymentTerms,
        createdDate: now,
        updatedDate: now,

        // ✅ Invoice Reference (MANDATORY)
        invoiceId: selectedInvoice?._id || "",
        invoiceNumber: selectedInvoice?.invoiceNumber || "",
        invoiceDate: selectedInvoice?.date || "",

        // ✅ Return Reason (MANDATORY)
        returnReason: returnReason,

        customerId: selectedCustomerDetails?._id || "",
        customerName: returnData.partyName,
        customerPhone:
          selectedCustomerDetails?.phone ||
          selectedCustomerDetails?.vendorPhone ||
          "",
        customerTRN:
          selectedCustomerDetails?.vendorTRN ||
          selectedCustomerDetails?.gstNumber ||
          "",
        customerAddress:
          selectedCustomerDetails?.address ||
          selectedCustomerDetails?.vendorAddress ||
          "",
        customerContact: selectedCustomerDetails?.vendorContactPerson || "",

        totalItems: returnData.items.length,
        totalItemQty: totalItemQty,

        subtotal: Number(totals.subtotal),
        discountPercentage: round(returnData.discount || 0),
        discountAmount: round(returnData.discountAmount || 0),
        totalAfterDiscount: Number(totals.totalAfterDiscount),
        vatPercentage: Number(avgVatPercentage),
        vatAmount: Number(totals.tax),
        totalIncludeVat: Number(totals.total),

        totalCost: Number(totalCost),
        grossProfit: Number(grossProfit),
        grossProfitMargin: Number(grossProfitMargin),
        netProfit: Number(netProfit),
        netProfitMargin: Number(netProfitMargin),

        notes: returnData.notes,

        items: returnData.items.map((item) => {
          const itemAmount = round(item.qty * item.rate);
          const itemPercentDiscount = round(
            (itemAmount * (item.itemDiscount ?? 0)) / 100,
          );
          const itemAmountDiscount = round(item.itemDiscountAmount ?? 0) || 0;
          const itemDiscountedAmount = round(
            itemAmount - itemPercentDiscount - itemAmountDiscount,
          );
          const itemVat = round((itemDiscountedAmount * (item.tax || 0)) / 100);
          const itemTotal = round(itemDiscountedAmount + itemVat);
          const itemTotalCost = round(item.cost * item.qty);
          const itemGrossProfit = round(itemAmount - itemTotalCost);
          const itemGrossProfitMargin =
            itemAmount > 0 ? round((itemGrossProfit / itemAmount) * 100) : 0;
          const itemNetProfit = round(itemTotal - itemTotalCost);
          const itemNetProfitMargin =
            itemTotal > 0 ? round((itemNetProfit / itemTotal) * 100) : 0;

          return {
            itemName: item.itemName,
            itemcode: item.itemcode,
            productId: item.productId,

            quantity: item.qty,
            unitPrice: round(item.rate),
            lineAmount: itemAmount,

            unitCost: round(item.cost),
            lineCost: itemTotalCost,

            discountPercentage: round(item.itemDiscount ?? 0),
            discountAmount: itemAmountDiscount,
            amountAfterDiscount: itemDiscountedAmount,

            grossProfit: itemGrossProfit,
            grossProfitMargin: itemGrossProfitMargin,
            netProfit: itemNetProfit,
            netProfitMargin: itemNetProfitMargin,

            vatPercentage: round(item.tax || 5),
            vatAmount: itemVat,

            total: itemTotal,

            serialNumbers: item.serialNumbers || [],
            note: itemNotes[item.id] || "",
          };
        }),
      };
      console.log("📤 Payload being sent to server:", {
        returnNo: payload.returnNumber,
        invoiceId: payload.invoiceId,
        invoiceNumber: payload.invoiceNumber,
        returnReason: payload.returnReason,
        itemCount: payload.items.length,
        total: payload.totalIncludeVat,
        fullPayload: payload,
      });
      let responseData;
      if (editId) {
        const res = await axios.put(
          `${API_URL}/sales-returns/updateSalesReturn/${editId}`,
          payload,
        );
        responseData = res.data?.data || res.data;
      } else {
        const res = await axios.post(
          `${API_URL}/sales-returns/createSalesReturn`,
          payload,
        );
        responseData = res.data?.data || res.data;
      }

      console.log("📥 Response from server:", responseData);

      fetchReturns();
      setError(null);
      setEditId(null);
      await resetForm();
      showToast("success", "Return saved successfully");

      // ✅ Return response data for Save & Print flow
      return { success: true, returnId: responseData?._id, data: responseData };
    } catch (err) {
      // ✅ IMPROVED: Show actual error details
      const errorMsg =
        err.response?.data?.error || err.message || "Failed to save return";
      const fullError = {
        message: errorMsg,
        status: err.response?.status,
        details: err.response?.data,
      };

      console.error("❌ Save Return Error:", fullError);
      setError(errorMsg);
      showToast("error", errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ✅ Save and Print - opens printing modal with terminal template
  const handleSaveAndPrint = async () => {
    const result = await handleSaveReturn();
    if (result?.success) {
      setSavedReturnId(result.returnId);
      setViewedReturn({ _id: result.returnId });
      setShowPrintingModal(true);
      console.log(
        "✅ Sales return saved and print modal opened:",
        result.returnId,
      );
    }
  };

  const handleEditReturn = (returnItem) => {
    // ✅ DISABLED: Cannot edit existing returns - invoice-based workflow only allows new returns
    showToast(
      "error",
      "Cannot edit existing returns. Please create a new return.",
    );
    return;
  };

  // ❌ OLD EDIT FUNCTIONALITY (DISABLED)
  /* 
  const handleEditReturn_OLD = (returnItem) => {
    const restoredSerials = {};
    returnItem.items.forEach((item, idx) => {
      if (item.serialNumbers?.length > 0) {
        restoredSerials[idx + 1] = item.serialNumbers;
      }
    });
    setSerialNumbers(restoredSerials);

    setReturnData({
      returnNo: returnItem.returnNumber,
      returnDate: returnItem.date.split("T")[0],
      paymentType: returnItem.paymentType || "",
      paymentTerms: returnItem.paymentTerms || "",
      partyName: returnItem.customerName,
      partyPhone: returnItem.customerPhone || "",
      discount: returnItem.discountPercentage || 0,
      discountAmount: returnItem.discountAmount || 0,
      items: returnItem.items.map((item, idx) => {
        const product = products.find((p) => p._id === item.productId);
        return {
          id: idx + 1,
          itemName: item.itemName || "",
          itemcode: item.itemcode || "",
          cost: Number(item.unitCost) || Number(product?.cost) || 0,
          qty: Number(item.quantity) || 0,
          rate: Number(item.unitPrice) || 0,
          tax: Number(item.vatPercentage) || Number(product?.tax) || 5,
          itemDiscount: Number(item.discountPercentage) || 0,
          itemDiscountAmount: Number(item.discountAmount) || 0,
          productId: item.productId,
          barcode: product?.barcode || item.barcode || "",
          serialNumbers: item.serialNumbers || [],
        };
      }),
      notes: returnItem.notes || "",
    });

    if (returnItem.customerId) {
      setSelectedCustomerId(returnItem.customerId);
      setSelectedCustomerDetails({
        vendorTRN: returnItem.customerTRN || "",
        phone: returnItem.customerPhone || "",
        name: returnItem.customerName || "",
        address: returnItem.customerAddress || "",
        vendorContactPerson: returnItem.customerContact || "",
      });
    }

    setEditId(returnItem._id);
  };
  */

  useEffect(() => {
    const fetchNextReturnNumber = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/sales-returns/nextReturnNumber?financialYear=${financialYear}`,
        );
        setReturnData((prev) => ({
          ...prev,
          returnNo: res.data.sequence || res.data.returnNumber,
        }));
      } catch (err) {
        console.error("Failed to fetch return number", err);
      }
    };
    if (!editId) {
      fetchNextReturnNumber();
    }
  }, [editId, financialYear]);

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-100 overflow-hidden">
      {/* ✅ NEW: Invoice Selection Modal */}
      {showInvoiceSelectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold">Select Sales Invoice</h2>
                <p className="text-sm text-blue-200 mt-1">
                  Total Invoices:{" "}
                  <span className="font-semibold">{invoices.length}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setShowInvoiceSelectionModal(false);
                  setInvoiceSearchModal("");
                }}
                className="hover:bg-white/20 p-2 rounded transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="bg-gray-50 px-6 py-3 border-b flex items-center gap-2">
              <Search size={16} className="text-gray-500" />
              <input
                type="text"
                placeholder="Search by invoice number or customer name..."
                value={invoiceSearchModal}
                onChange={(e) => setInvoiceSearchModal(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>

            {/* Modal Body - Invoices List */}
            <div className="overflow-y-auto flex-1">
              {invoices.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>No invoices found for this customer</p>
                </div>
              ) : (
                <div className="divide-y">
                  {invoices
                    .filter(
                      (inv) =>
                        inv.invoiceNumber
                          ?.toLowerCase()
                          .includes(invoiceSearchModal.toLowerCase()) ||
                        inv.customerName
                          ?.toLowerCase()
                          .includes(invoiceSearchModal.toLowerCase()),
                    )
                    .map((invoice) => {
                      const invoiceDate = new Date(invoice.date);
                      const today = new Date();
                      const daysDiff = Math.floor(
                        (today - invoiceDate) / (1000 * 60 * 60 * 24),
                      );
                      const allowedDays =
                        storeSettings?.salesReturnAllowedDays || 30;
                      const isWithinWindow = daysDiff <= allowedDays;

                      return (
                        <div
                          key={invoice._id}
                          onClick={() => {
                            handleSelectInvoice(invoice);
                            setShowInvoiceSelectionModal(false);
                            setInvoiceSearchModal("");
                          }}
                          className={`px-6 py-4 cursor-pointer hover:bg-blue-50 transition border-l-4 ${
                            isWithinWindow
                              ? "border-l-green-500"
                              : "border-l-red-500"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className="font-bold text-gray-900">
                                  {invoice.invoiceNumber}
                                </div>
                                <div
                                  className={`text-xs px-2 py-1 rounded font-bold ${
                                    isWithinWindow
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {isWithinWindow ? "✅ " : "❌ "}
                                  {daysDiff} days ago
                                </div>
                              </div>
                              <div className="text-sm text-gray-600 mt-2">
                                <span className="font-semibold">
                                  {invoice.customerName}
                                </span>{" "}
                                • {new Date(invoice.date).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Items: {invoice.items?.length || 0} | Total: AED{" "}
                                {formatNumber(invoice.totalIncludeVat)}
                                {!isWithinWindow && (
                                  <span className="ml-2 text-red-600 font-semibold">
                                    Outside {allowedDays}-day window
                                  </span>
                                )}
                              </div>
                            </div>
                            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition">
                              Select
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEW: Item Selection Modal */}
      {showItemSelectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold">Select Items for Return</h2>
                <p className="text-sm text-blue-200 mt-1">
                  Invoice:{" "}
                  <span className="font-semibold">
                    {selectedInvoice?.invoiceNumber}
                  </span>{" "}
                  | Total Items:{" "}
                  <span className="font-semibold">
                    {invoiceItemsForSelection.length}
                  </span>{" "}
                  | Selected:{" "}
                  <span className="font-semibold text-yellow-300">
                    {selectedItemIds.size}
                  </span>
                </p>
              </div>
              <button
                onClick={handleCancelItemSelection}
                className="hover:bg-white/20 p-2 rounded transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body - Items List */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-xs">
                <thead className="bg-gray-100 sticky top-0 border-b-2 border-blue-300">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">
                      <input
                        type="checkbox"
                        checked={
                          selectedItemIds.size ===
                            invoiceItemsForSelection.length &&
                          invoiceItemsForSelection.length > 0
                        }
                        onChange={(e) => handleSelectAllItems(e.target.checked)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-2 text-left">Code</th>
                    <th className="px-4 py-2 text-left">Item Name</th>
                    <th className="px-4 py-2 text-center">Unit</th>
                    <th className="px-4 py-2 text-center">Available Qty</th>
                    <th className="px-4 py-2 text-right">Unit Price</th>
                    <th className="px-4 py-2 text-right">Discount</th>
                    <th className="px-4 py-2 text-center">VAT %</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoiceItemsForSelection.map((item) => {
                    // ✅ Check if item already exists in return table (disabled indicator)
                    const itemExistsInTable = returnData.items.some(
                      (tableItem) =>
                        tableItem.itemcode === item.itemcode &&
                        tableItem.productId === item.productId,
                    );

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-blue-50 cursor-pointer ${
                          selectedItemIds.has(item.id) ? "bg-blue-100/50" : ""
                        } ${itemExistsInTable ? "opacity-60 bg-gray-50" : ""}`}
                        onClick={() => {
                          if (!itemExistsInTable) {
                            handleSelectItemForReturn(item.id);
                          }
                        }}
                      >
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedItemIds.has(item.id)}
                            onChange={() => {
                              if (!itemExistsInTable) {
                                handleSelectItemForReturn(item.id);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            disabled={itemExistsInTable}
                            className={`w-4 h-4 ${
                              itemExistsInTable
                                ? "cursor-not-allowed opacity-50"
                                : "cursor-pointer"
                            }`}
                          />
                        </td>
                        <td className="px-4 py-2 font-mono text-gray-700">
                          {item.itemcode}
                        </td>
                        <td className="px-4 py-2 font-medium flex items-center gap-2">
                          {item.itemName}
                          {itemExistsInTable && (
                            <span className="inline-block bg-red-200 text-red-900 text-[10px] px-2 py-0.5 rounded font-bold">
                              ❌ In table
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">{item.unit}</td>
                        <td className="px-4 py-2 text-center">
                          <span className="bg-blue-100 text-blue-900 px-2 py-1 rounded font-bold">
                            {item.originalQty}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-semibold">
                          AED {formatNumber(item.rate)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatNumber(item.discount)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {item.taxRate}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t flex items-center justify-between gap-3 flex-shrink-0">
              <div className="text-sm text-gray-600 flex-1">
                {selectedItemIds.size > 0 ? (
                  <div className="space-y-1">
                    <p className="font-semibold">
                      ✅ {selectedItemIds.size} item(s) selected for return
                    </p>
                    <p className="text-[11px] text-red-700">
                      ⚠️ Return must contain items from only ONE invoice. Items
                      already in table cannot be added again.
                    </p>
                  </div>
                ) : (
                  <p>⚠️ Select items to add to return (single invoice only)</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelItemSelection}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded font-medium text-sm transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSelectedItems}
                  disabled={selectedItemIds.size === 0}
                  className={`px-6 py-2 rounded font-medium text-sm transition flex items-center gap-2 ${
                    selectedItemIds.size === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  <Plus size={16} />
                  Add Selected ({selectedItemIds.size})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER - Fixed at top */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 shadow-lg z-10">
        {/* Header Content */}
        <div className="flex justify-between gap-6">
          {/* Left Column */}
          <div className="flex items-start gap-3">
            <div>
              <h1 className="text-lg font-bold text-red-300">Sales Return</h1>
              <div className="bg-white/20 px-3 py-1.5 rounded-lg mt-2 inline-block">
                <span className="text-xs text-blue-200">Return #</span>
                <p className="font-bold text-xs">{returnData.returnNo}</p>
                <p className="font-bold text-xs text-blue-100">
                  {returnData.returnDate}
                </p>
              </div>
            </div>
          </div>

          {/* Middle Column */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowHistoryModal(true);
                fetchReturns();
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 border border-blue-400/50 rounded-lg text-white font-medium text-xs transition"
            >
              <Clock size={16} />
              History
            </button>
          </div>

          {/* Right Column */}
          <div className="flex items-start gap-4 flex-1 justify-end">
            {/* ✅ Customer Selection (REQUIRED FIRST) */}
            <div className="flex flex-col gap-2 w-80" ref={customerDropdownRef}>
              <label className="text-xs text-blue-200">
                Customer <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search customer..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="w-full px-3 py-2 bg-white/10 border border-blue-400/50 rounded-lg text-sm text-white placeholder-blue-300 focus:ring-2 focus:ring-white/30 outline-none"
                />

                {selectedCustomerDetails && (
                  <p className="text-xs text-green-300 mt-1">
                    ✅ {selectedCustomerDetails.name}
                  </p>
                )}

                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer._id}
                        onClick={() => handleSelectCustomer(customer._id)}
                        className="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b last:border-b-0 text-xs text-gray-800 transition"
                      >
                        <p className="font-semibold">
                          {customer.name || customer.vendorName}
                        </p>
                        <p className="text-gray-600">
                          {customer.phone || customer.vendorPhone}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ✅ Customer Display (Read-Only, Auto-populated from Invoice) */}
            <div className="flex flex-col gap-2 w-72">
              <div className="bg-white/20 rounded-lg px-3 py-2 border border-blue-400/50">
                <p className="text-xs text-blue-200 mb-1">
                  Customer (from Invoice)
                </p>
                {selectedCustomerDetails ? (
                  <div className="text-xs">
                    <p className="text-white font-semibold">
                      {selectedCustomerDetails.name}
                    </p>
                    <div className="flex gap-4 mt-1.5">
                      <div>
                        <span className="text-blue-200 font-semibold block text-[10px]">
                          Phone
                        </span>
                        <span className="text-white text-[11px]">
                          {selectedCustomerDetails.phone || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-blue-200 font-semibold block text-[10px]">
                          TRN
                        </span>
                        <span className="text-white text-[11px]">
                          {selectedCustomerDetails.vendorTRN || "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-blue-300 italic">
                    Select an invoice to populate customer
                  </p>
                )}
              </div>
            </div>

            {/* ✅ NEW: Invoice Selection & Return Reason */}

            <div className="flex flex-col gap-2 min-w-40">
              <select
                disabled={!selectedCustomerDetails}
                value={returnData.paymentType}
                onChange={(e) =>
                  setReturnData({ ...returnData, paymentType: e.target.value })
                }
                className={`px-3 py-2 rounded-lg text-sm outline-none transition ${
                  !selectedCustomerDetails
                    ? "bg-gray-600/30 border border-gray-500/30 text-gray-400 cursor-not-allowed opacity-60"
                    : "bg-white/10 border border-blue-400/50 text-white focus:ring-2 focus:ring-white/30"
                }`}
              >
                <option value="" disabled className="text-gray-500">
                  Select Type
                </option>
                {selectedCustomerDetails &&
                  (selectedCustomerDetails?.paymentType === "Credit Sale" ? (
                    <>
                      <option value="Cash" className="text-gray-900">
                        Cash
                      </option>
                      <option value="Credit" className="text-gray-900">
                        Credit
                      </option>
                      <option value="Bank" className="text-gray-900">
                        Bank
                      </option>
                    </>
                  ) : (
                    <>
                      <option value="Cash" className="text-gray-900">
                        Cash
                      </option>
                      <option value="Bank" className="text-gray-900">
                        Bank
                      </option>
                    </>
                  ))}
              </select>

              {selectedCustomerDetails?.paymentType === "Credit Sale" && (
                <select
                  value={returnData.paymentTerms}
                  onChange={(e) =>
                    setReturnData({
                      ...returnData,
                      paymentTerms: e.target.value,
                    })
                  }
                  className="px-3 py-2 bg-white/10 border border-blue-400/50 rounded-lg text-sm text-white focus:ring-2 focus:ring-white/30 outline-none"
                >
                  <option value="" disabled className="text-gray-500">
                    Payment Terms
                  </option>
                  <option value="NET 30" className="text-gray-900">
                    NET 30
                  </option>
                  <option value="NET 60" className="text-gray-900">
                    NET 60
                  </option>
                  <option value="NET 90" className="text-gray-900">
                    NET 90
                  </option>
                  <option value="COD" className="text-gray-900">
                    COD
                  </option>
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Invoice & Return Reason Section */}
      <div className="bg-gray-100 px-6 py-3 border-t border-blue-200 ">
        <div className="grid grid-cols-2 gap-6 max-h-28">
          {/* Left Column: Invoice Selection */}
          <div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between mb-1">
                {storeSettings?.salesReturnAllowedDays && (
                  <span className="text-xs text-gray-700 font-semibold">
                    📅 Last {storeSettings.salesReturnAllowedDays} days only
                  </span>
                )}
              </div>

              {selectedInvoice ? (
                <div className="w-1/2 bg-green-100 border-2 border-red-500 rounded-lg px-3 py-2 ">
                  <p className="text-xs font-semibold text-green-900">
                    ✅ Invoice Selected
                  </p>
                  <p className="text-sm font-bold text-green-900">
                    {selectedInvoice.invoiceNumber}
                  </p>
                  <p className="text-xs text-green-800 truncate">
                    {new Date(selectedInvoice.date).toLocaleDateString()} |{" "}
                    {selectedInvoice.items?.length || 0} items
                  </p>
                  <button
                    onClick={() => {
                      // ✅ Check if items already added from different invoice
                      if (
                        returnData.items.length > 0 &&
                        currentInvoiceId !== selectedInvoice._id
                      ) {
                        showToast(
                          "error",
                          "⚠️ Cannot change invoice while items are in the return table. This return is locked to invoice " +
                            selectedInvoice.invoiceNumber,
                        );
                        return;
                      }
                      setShowInvoiceSelectionModal(true);
                      setInvoiceSearchModal("");
                    }}
                    className="mt-1.5 w-full px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition"
                  >
                    Change Invoice
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (!selectedCustomerId) {
                      showToast("error", "Please select a customer first");
                      return;
                    }
                    setShowInvoiceSelectionModal(true);
                    setInvoiceSearchModal("");
                  }}
                  className="w-1/2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2"
                >
                  <FileText size={14} />
                  Select Invoice
                </button>
              )}

              {invoiceError && (
                <p className="text-red-600 text-xs font-semibold mt-1">
                  {invoiceError}
                </p>
              )}
              {returnWindowStatus && (
                <p
                  className={`text-xs font-semibold mt-1 ${returnWindowStatus.isWithin ? "text-green-700" : "text-red-600"}`}
                >
                  {returnWindowStatus.message}
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Return Reason */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-end">
              <div className="w-1/2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700">
                    Return Reason <span className="text-red-600">*</span> (min 5 chars)
                  </label>
                  <p className="text-xs text-gray-500">{returnReason.length}/500</p>
                </div>

                <textarea
                  value={returnReason}
                  onChange={(e) => {
                    setReturnReason(e.target.value);
                    setReturnReasonError("");
                  }}
                  placeholder="Enter reason..."
                  className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none flex-1"
                />
                {returnReasonError && (
                  <p className="text-red-600 text-xs font-semibold mt-1">
                    {returnReasonError}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Items Section - Scrollable */}
      <div className="flex-1 flex flex-col p-4 min-h-0 overflow-hidden">
        {/* Items Table */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-gradient-to-r from-blue-50 to-blue-100 sticky top-0 border-b-2 border-blue-300">
              <tr>
                <th className="px-2 py-2 text-center w-8">#</th>
                <th className="px-2 py-2 text-center w-20">Code</th>
                <th className="px-2 py-2 text-left">Item Name</th>
                <th className="px-2 py-2 text-center w-12">UOM</th>
                <th className="px-2 py-2 text-center w-16">Inv Qty</th>
                <th className="px-2 py-2 text-center w-16">Ret Qty</th>
                <th className="px-2 py-2 text-center w-20">Unit Price</th>
                <th className="px-2 py-2 text-center w-16">Discount</th>
                <th className="px-2 py-2 text-center w-14">VAT %</th>
                <th className="px-2 py-2 text-right w-24">Total</th>
                <th className="px-2 py-2 text-center w-12">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {returnData.items.length === 0 ? (
                <tr>
                  <td colSpan="11" className="text-center py-8 text-gray-400">
                    Select an invoice to view items
                  </td>
                </tr>
              ) : (
                returnData.items.map((item, idx) => {
                  const total = round(item.qty * item.rate);
                  const maxAllowedQty =
                    item.originalQty - (item.alreadyReturnedQty || 0);
                  const qtyExceedsLimit = item.qty > maxAllowedQty;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-blue-50/40 ${qtyExceedsLimit ? "bg-red-50/30" : ""}`}
                    >
                      <td className="px-2 py-2 text-center font-semibold">
                        {idx + 1}
                      </td>
                      <td className="px-2 py-2 text-center text-xs bg-gray-50 rounded font-mono">
                        {item.itemcode}
                      </td>
                      <td className="px-2 py-2 font-medium text-gray-800">
                        {item.itemName}
                      </td>

                      {/* UOM */}
                      <td className="px-2 py-2 text-center text-xs font-semibold text-gray-700 bg-amber-50 rounded">
                        {item.unit || "PC"}
                      </td>

                      {/* Invoice Quantity */}
                      <td className="px-2 py-2 text-center">
                        <div className="bg-blue-100 text-blue-900 px-2 py-1 rounded font-semibold">
                          {item.originalQty}
                        </div>
                        {item.alreadyReturnedQty > 0 && (
                          <div className="text-[10px] text-gray-600 mt-0.5">
                            -{item.alreadyReturnedQty} returned
                          </div>
                        )}
                      </td>

                      {/* Return Quantity with Validation */}
                      <td className="px-2 py-2">
                        <div
                          className={`border-2 rounded px-1 ${qtyExceedsLimit ? "border-red-500 bg-red-50" : "border-blue-300"}`}
                        >
                          <input
                            ref={(el) => {
                              if (el)
                                itemInputRefs.current[`${item.id}_qty`] = el;
                            }}
                            type="number"
                            min="0"
                            max={maxAllowedQty}
                            value={item.qty}
                            onChange={(e) =>
                              handleItemChange(
                                item.id,
                                "qty",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-full text-center border-0 bg-transparent focus:outline-none text-sm font-semibold"
                          />
                        </div>
                        {qtyExceedsLimit && (
                          <div className="text-red-500 text-[10px] mt-1 font-semibold">
                            ⚠️ Exceeds limit
                          </div>
                        )}
                      </td>

                      {/* Unit Price */}
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "rate",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="w-full text-center border rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-400"
                        />
                      </td>

                      {/* Discount */}
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          value={item.itemDiscount || 0}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "itemDiscount",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          placeholder="0"
                          className="w-full text-center border rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-400"
                        />
                      </td>

                      {/* VAT % */}
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.taxRate || 0}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "taxRate",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          placeholder="0"
                          className="w-full text-center border rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-400"
                        />
                      </td>

                      {/* Total */}
                      <td className="px-2 py-2 text-right font-bold text-green-700 bg-green-50 rounded">
                        {formatNumber(total)}
                      </td>

                      {/* Delete Action */}
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:bg-red-100 p-1.5 rounded transition"
                          title="Delete item (or press Delete key)"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Summary */}
      <div className="flex-shrink-0 bg-white border-t shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-sm">
            <textarea
              rows="2"
              name="notes"
              value={returnData.notes}
              onChange={handleInputChange}
              placeholder="Notes..."
              className="w-full border rounded px-3 py-2 text-xs"
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-gray-500 text-xs">Items</p>
              <p className="font-bold">{returnData.items.length}</p>
            </div>
            <div className="border-l"></div>
            <div className="text-center">
              <p className="text-gray-500 text-xs">Subtotal</p>
              <p className="font-bold">
                {company?.currency || "AED"} {formatNumber(parseFloat(totals.subtotal))}
              </p>
            </div>
            <div className="border-l"></div>
            <div className="text-center">
              <p className="text-gray-500 text-xs">VAT</p>
              <p className="font-bold">
                {company?.currency || "AED"} {formatNumber(parseFloat(totals.tax))}
              </p>
            </div>
            <div className="bg-gray-900 text-white px-4 py-2 rounded">
              <p className="text-gray-400 text-[10px]">Total</p>
              <p className="text-base font-bold text-green-400">
                {company?.currency || "AED"} {formatNumber(parseFloat(totals.total))}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded text-xs font-semibold hover:bg-green-700"
                onClick={handleSaveReturn}
                disabled={loading}
              >
                <Save size={14} /> {loading ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleSaveAndPrint}
                disabled={loading}
                className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-2 rounded text-xs font-medium hover:bg-purple-700"
              >
                <Printer size={14} /> {loading ? "Saving..." : "Save & Print"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SALES RETURN PRINTING & PDF MODAL - Terminal Template Mapped */}
      {showPrintingModal && viewedReturn && (
        <GlobalDocumentPrintingComponent
          documentType="SALES_RETURN"
          documentId={viewedReturn._id}
          onClose={() => {
            setShowPrintingModal(false);
            setViewedReturn(null);
            setSavedReturnId(null);
          }}
        />
      )}

      {/* HISTORY MODAL */}
      {showHistoryModal && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50 flex-shrink-0">
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Clock size={16} className="text-blue-600" />
                Sales Return History
              </h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filters Grid */}
            <div className="px-4 py-2 border-b bg-white flex-shrink-0">
              <div className="grid grid-cols-3 gap-2">
                {/* Date Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={historyDateFilter}
                    onChange={(e) => setHistoryDateFilter(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Search Filter */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Customer or Return #"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredHistoryReturns.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {returns.length === 0
                    ? "No returns found"
                    : historySearch.trim()
                      ? `No returns found for "${historySearch}" on ${historyDateFilter}`
                      : `No returns found for ${historyDateFilter}`}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 border-b border-gray-300 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-center font-semibold text-gray-800">
                          SL
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-800">
                          Return No
                        </th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-800">
                          Return Date
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-800">
                          Customer
                        </th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-800">
                          Invoice Ref
                        </th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-800">
                          Items
                        </th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-800">
                          Qty
                        </th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-800">
                          Subtotal
                        </th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-800">
                          VAT
                        </th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-800">
                          Total
                        </th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-800 w-48">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistoryReturns.map((returnItem, idx) => (
                        <tr
                          key={returnItem._id}
                          className="border-b border-gray-200 hover:bg-blue-50 transition"
                        >
                          <td className="px-3 py-2 text-center text-gray-700 font-semibold">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2 font-semibold text-blue-600">
                            #{returnItem.returnNumber}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-600">
                            {new Date(returnItem.date).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            {returnItem.customerName}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-700">
                            {returnItem.invoiceNumber}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-700">
                            {returnItem.totalItems ||
                              returnItem.items?.length ||
                              0}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-gray-800">
                            {returnItem.totalItemQty ||
                              returnItem.items?.reduce(
                                (sum, item) => sum + (item.quantity || 0),
                                0,
                              ) ||
                              0}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700">
                            {formatNumber(returnItem.subtotal || 0)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700">
                            {formatNumber(returnItem.vatAmount || 0)}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-green-600">
                            {formatNumber(
                              returnItem.totalIncludeVat ||
                                returnItem.totalAmount ||
                                0,
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setViewedReturn(returnItem);
                                  setShowPrintingModal(true);
                                }}
                                title="Print"
                                className="flex items-center justify-center gap-1 px-1.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-xs font-medium transition"
                              >
                                <Printer size={11} />
                                Print
                              </button>
                              <button
                                onClick={() => {
                                  // Edit return logic
                                  setShowHistoryModal(false);
                                }}
                                title="View"
                                className="flex items-center justify-center gap-1 px-1.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded text-xs font-medium transition"
                              >
                                <Eye size={11} />
                                View
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATIONS */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[999] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => closeToast(toast.id)}
            className={`px-6 py-4 rounded-lg shadow-2xl text-white text-sm font-medium cursor-pointer ${
              toast.type === "success"
                ? "bg-green-500"
                : toast.type === "error"
                  ? "bg-red-500"
                  : "bg-blue-500"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SalesReturn;
