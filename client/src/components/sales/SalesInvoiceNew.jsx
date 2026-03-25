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
import { useDecimalFormat } from "../../hooks/useDecimalFormat";
import { useTaxMaster } from "../../hooks/useTaxMaster";
import { useProductSearch } from "../../hooks/useProductSearch";
import { useTaxCalculation } from "../../hooks/useTaxCalculation";
import { useClickOutside } from "../../hooks/useClickOutside";
import { useCustomerSelection } from "../../hooks/useCustomerSelection";
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner";
import SalesInvoiceNewHeader from "./invoice/SalesInvoiceNewHeader";
import SalesInvoiceNewContent from "./invoice/SalesInvoiceNewContent";
import SalesInvoiceNewFooter from "./invoice/SalesInvoiceNewFooter";
import HistoryModal from "./modals/HistoryModal";
import InvoiceViewModal from "./modals/InvoiceViewModal";
import ProductLookupModal from "./modals/ProductLookupModal";
import ItemNoteModal from "./modals/ItemNoteModal";
import SerialNumberModal from "./modals/SerialNumberModal";

const SalesInvoice = () => {
  // Get decimal formatting functions based on company currency settings
  const { round, formatCurrency, formatNumber, config } = useDecimalFormat();
  // Get tax master data for customer-based tax calculations
  const { taxMaster } = useTaxMaster();
  const decimalPlaces = config?.decimalPlaces || 2;

  // Helper function to get step value for number inputs based on decimal places
  const getInputStep = () => {
    const steps = { 0: "1", 1: "0.1", 2: "0.01", 3: "0.001", 4: "0.0001" };
    return steps[decimalPlaces] || "0.01";
  };

  // Initialize tax calculation hook
  const { getCustomerTaxRate, getTaxDetails } = useTaxCalculation({
    taxMaster,
    config,
    selectedCustomerDetails: selectedCustomerDetails || null,
  });

  // Initialize customer selection hook
  const {
    selectedCustomerId,
    setSelectedCustomerId,
    selectedCustomerDetails,
    setSelectedCustomerDetails,
    customerSearch,
    setCustomerSearch,
    filteredCustomers: filteredCustomersForDropdown,
    handleSelectCustomer: handleSelectCustomerHook,
    resetCustomer,
  } = useCustomerSelection(customers, config);

  // Initialize barcode scanner hook - but we'll handle the submission ourselves
  const {
    scannerInput,
    setScannerInput,
    lastScanTime,
    setLastScanTime,
  } = useBarcodeScanner(
    (barcode) => {
      // Handled by manual call in our code
    },
    true
  );
  const [itemSearch, setItemSearch] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);
  const [productPage, setProductPage] = useState(1); // Track current page for manual pagination
  const [products, setProducts] = useState([]); // Cumulative products array (for "load more" pattern)

  // ✅ Product Search Hook - Centralized search with Meilisearch + fallback
  const { results: searchResults, loading: searchLoading, metadata: searchMetadata } = useProductSearch(
    itemSearch,
    300,  // 300ms debounce
    productPage,  // current page
    20,   // page size (20 per request)
    true  // use fallback
  );
  const scannerInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchDropdownRef = useRef(null);
  const customerDropdownRef = useRef(null);
  const barcodeBuffer = useRef("");
  const lastKeyTime = useRef(0);

  // Table cell refs for keyboard navigation
  const itemInputRefs = useRef({}); // Store refs like itemInputRefs.current["itemId_fieldName"]
  const [focusedCell, setFocusedCell] = useState(null); // Track currently focused cell: {itemId, field}

  const [invoiceData, setInvoiceData] = useState({
    invoiceNo: "001",
    invoiceDate: new Date().toISOString().split("T")[0],
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
  const [invoices, setInvoices] = useState([]);
  const [editId, setEditId] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showProductLookup, setShowProductLookup] = useState(false);
  const [viewedInvoice, setViewedInvoice] = useState(null);
  const [historyDateFilter, setHistoryDateFilter] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [historySearch, setHistorySearch] = useState("");
  const [financialYear, setFinancialYear] = useState("2025-26");
  const [customers, setCustomers] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [scannerActive, setScannerActive] = useState(true);

  // Item notes state
  const [itemNotes, setItemNotes] = useState({});
  const [showItemNoteModal, setShowItemNoteModal] = useState(false);
  const [selectedItemNote, setSelectedItemNote] = useState(null);

  // Serial numbers state
  const [serialNumbers, setSerialNumbers] = useState({});
  const [showSerialModal, setShowSerialModal] = useState(false);
  const [selectedItemSerial, setSelectedItemSerial] = useState(null);
  const [newSerialInput, setNewSerialInput] = useState("");

  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  // Show toast function
  const showToast = (message, type = "info", duration = 3000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, duration);
  };

  // Close toast by ID
  const closeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Global keyboard shortcuts (Ctrl+S, Ctrl+P, Ctrl+N, Escape)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Close toasts on any key press
      setToasts([]);

      // Ctrl+S or Cmd+S: Save invoice
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSaveInvoice();
      }

      // Ctrl+P or Cmd+P: Print invoice
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        handleSaveAndPrint();
      }

      // Ctrl+N or Cmd+N: Add new item
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        addItem();
      }

      // Escape: Return focus to search box (if in table) or close modals
      if (e.key === "Escape") {
        if (focusedCell) {
          e.preventDefault();
          setFocusedCell(null);
          searchInputRef.current?.focus();
        } else if (showItemNoteModal) {
          setShowItemNoteModal(false);
        } else if (showSerialModal) {
          setShowSerialModal(false);
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [focusedCell, showItemNoteModal, showSerialModal]);

  // ✅ Update products list when search results change
  useEffect(() => {
    if (productPage === 1) {
      // First page: replace the products list
      setProducts(searchResults || []);
    } else {
      // Load more: append to existing products
      setProducts((prev) => [...prev, ...searchResults]);
    }
  }, [searchResults, productPage]);

  // ✅ Load more products function (for "Load More" button)
  const loadMoreProducts = () => {
    if (!searchMetadata?.hasNextPage) return;
    setProductPage((prev) => prev + 1);
  };

  // clear screen after saving invoice
  const resetForm = async () => {
    const newInvoiceNumber = await axios.get(
      `${API_URL}/sales-invoices/nextInvoiceNumber?financialYear=${financialYear}`,
    );
    setInvoiceData({
      invoiceNo:
        newInvoiceNumber.data.sequence || newInvoiceNumber.data.invoiceNumber,
      invoiceDate: new Date().toISOString().split("T")[0],
      paymentType: "",
      paymentTerms: "",
      partyName: "",
      partyPhone: "",
      discount: 0,
      discountAmount: 0,
      items: [],
      notes: "",
    });
    // Clear serial numbers and notes
    setSerialNumbers({});
    setItemNotes({});
    setShowSerialModal(false);
    setShowItemNoteModal(false);
    setSelectedItemSerial(null);
    setSelectedItemNote(null);
    setNewSerialInput("");

    // Clear customer selection and input
    setSelectedCustomerId(null);
    setSelectedCustomerDetails(null);
    setCustomerSearch("");
    setShowCustomerDropdown(false);
  };

  // Fetch all invoices
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/sales-invoices/getSalesInvoices`,
      );
      setInvoices(res.data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch invoices");
    }
    setLoading(false);
  };

  // Filter invoices by date and search
  const filteredHistoryInvoices = invoices.filter((invoice) => {
    const invoiceDate = new Date(invoice.date).toISOString().split("T")[0];
    const dateMatch = invoiceDate === historyDateFilter;

    // If no search, only filter by date
    if (!historySearch.trim()) {
      return dateMatch;
    }

    // Filter by customer name or invoice number
    const searchLower = historySearch.toLowerCase();
    const customerNameMatch = invoice.customerName
      ?.toLowerCase()
      .includes(searchLower);
    const invoiceNumberMatch = invoice.invoiceNumber
      ?.toString()
      .includes(historySearch);

    return dateMatch && (customerNameMatch || invoiceNumberMatch);
  });

  // Flag to prevent duplicate API calls on component mount
  const hasFetchedInvoices = useRef(false);

  useEffect(() => {
    // Fetch invoices only once on component mount to avoid duplicate calls
    if (!hasFetchedInvoices.current) {
      hasFetchedInvoices.current = true;
      fetchInvoices();
    }
  }, []);

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      // Country isolation: Only fetch customers for company's country (NOT international sales)
      const companyCountry = config?.country || 'UAE';
      const res = await axios.get(
        `${API_URL}/customers/getcustomers?limit=100&country=${encodeURIComponent(companyCountry)}`,
      );
      setCustomers(res.data.customers || []);
    } catch (err) {
      // Silently fail - customers will be empty
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Sync serialNumbers state back to items array
  useEffect(() => {
    if (Object.keys(serialNumbers).length > 0) {
      setInvoiceData((prev) => ({
        ...prev,
        items: prev.items.map((item) => ({
          ...item,
          serialNumbers: serialNumbers[item.id] || [],
        })),
      }));
    }
  }, [serialNumbers]);

  // Handle customer selection
  const handleSelectCustomer = (customerId) => {
    const customer = customers.find((c) => c._id === customerId);
    if (customer) {
      setSelectedCustomerId(customerId);
      setSelectedCustomerDetails(customer);
      setInvoiceData((prev) => ({
        ...prev,
        partyName: customer.name || customer.vendorName,
        partyPhone: customer.phone || customer.vendorPhone,
      }));
      setShowCustomerDropdown(false);
      setCustomerSearch("");
      
      // Validation: Warn if India company and customer has no tax type set
      if (config?.country === 'India' && !customer.taxType) {
        showToast(
          `⚠️ Customer "${customer.name}" has no tax type set. India companies should specify GST tax classification.`,
          "warning",
          4000
        );
      }
    }
  };

  // Filter customers for dropdown
  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.vendorName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.vendorPhone?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.vendorTRN?.toLowerCase().includes(customerSearch.toLowerCase()),
  );

  // Apply click-outside logic for customer dropdown
  useClickOutside(customerDropdownRef, () => {
    setShowCustomerDropdown(false);
  });

  // Apply click-outside logic for search dropdown
  useClickOutside(searchDropdownRef, () => {
    setShowSearchDropdown(false);
  });

  // Unified function to add item by product object or barcode
  const addItemToInvoice = useCallback(
    (productOrBarcode) => {
      let product;

      // If string, search by barcode/itemcode; if object, use directly
      if (typeof productOrBarcode === 'string') {
        product = products.find(
          (p) => p.barcode === productOrBarcode || p.itemcode === productOrBarcode,
        );
        if (!product) {
          alert(`Product not found: ${productOrBarcode}`);
          return;
        }
      } else {
        product = productOrBarcode;
      }

      let addedItemId = null;

      setInvoiceData((prev) => {
        // Check if item already exists
        const existingIndex = prev.items.findIndex(
          (item) => item.productId === product._id,
        );

        if (existingIndex >= 0) {
          // Increment quantity
          const updatedItems = [...prev.items];
          updatedItems[existingIndex] = {
            ...updatedItems[existingIndex],
            qty: updatedItems[existingIndex].qty + 1,
          };
          addedItemId = updatedItems[existingIndex].id;
          return { ...prev, items: updatedItems };
        } else {
          // Use customer's tax rate if available, otherwise product tax, otherwise default 5%
          const customerTaxRateForItem = selectedCustomerDetails?.taxGroupId 
            ? (taxMaster?.find((tg) => tg._id === selectedCustomerDetails.taxGroupId)?.totalRate || 5)
            : (product.tax || 5);

          // Add new item
          const newItem = {
            id: Date.now(),
            itemName: product.name,
            itemcode: product.itemcode,
            cost: product.cost,
            qty: 1,
            rate: product.price,
            tax: customerTaxRateForItem,
            itemDiscount: 0,
            itemDiscountAmount: 0,
            productId: product._id,
            barcode: product.barcode,
            serialNumbers: [],
          };
          addedItemId = newItem.id;
          return { ...prev, items: [...prev.items, newItem] };
        }
      });

      setLastScanTime(Date.now());
      setScannerInput("");
      setItemSearch("");
      setShowSearchDropdown(false);
      setSelectedSearchIndex(0);

      // Focus Qty field of the newly added item
      setTimeout(() => {
        const qtyRef = itemInputRefs.current[`${addedItemId}_qty`];
        if (qtyRef) {
          qtyRef.focus();
          qtyRef.select();
          setFocusedCell({ itemId: addedItemId, field: "qty" });
        }
      }, 50);
    },
    [products, selectedCustomerDetails, taxMaster],
  );

  // Global keyboard listener for barcode scanner
  useEffect(() => {
    if (!scannerActive) return;

    const handleKeyDown = (e) => {
      const now = Date.now();
      const timeDiff = now - lastKeyTime.current;

      // Reset buffer if too much time passed (>100ms between keys = manual typing)
      if (timeDiff > 100) {
        barcodeBuffer.current = "";
      }

      lastKeyTime.current = now;

      // Ignore modifier keys and special keys (except Enter)
      if (e.key === "Enter") {
        if (barcodeBuffer.current.length >= 3) {
          e.preventDefault();
          addItemToInvoice(barcodeBuffer.current.toUpperCase());
        }
        barcodeBuffer.current = "";
        return;
      }

      // Only capture alphanumeric characters
      if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
        // Don't capture if user is typing in an input field
        const activeElement = document.activeElement;
        const isInputField =
          activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.isContentEditable;

        if (!isInputField || activeElement === scannerInputRef.current) {
          barcodeBuffer.current += e.key;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [scannerActive, addItemToInvoice]);

  // Handle manual barcode input
  const handleScannerSubmit = (e) => {
    e.preventDefault();
    if (scannerInput.trim()) {
      addItemToInvoice(scannerInput.trim().toUpperCase());
    }
  };

  // Filter products for search
  const filteredProducts = products
    .filter((p) => {
      // In lookup modal mode, show all products
      if (showProductLookup) return true;

      // In search mode, filter by search text
      if (!itemSearch.trim()) return false;
      const search = itemSearch.toLowerCase();
      return (
        p.name?.toLowerCase().includes(search) ||
        p.itemcode?.toLowerCase().includes(search) ||
        p.barcode?.toLowerCase().includes(search)
      );
    })
    .slice(0, 10); // Limit to 10 results

  // Handle table cell keyboard navigation (Tab/Enter for columns, Arrow keys for rows, Delete to remove)
  const handleTableCellKeyDown = (e, itemId, currentField, itemIndex) => {
    // Define field order for navigation
    const fieldOrder = ["qty", "rate", "itemDiscount", "itemDiscountAmount"];
    const currentFieldIndex = fieldOrder.indexOf(currentField);

    // Handle Delete/Backspace to remove item
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      removeItem(itemId);
      return;
    }

    // Handle Arrow keys for row navigation (Up/Down)
    if (e.key === "ArrowDown" && !e.shiftKey) {
      e.preventDefault();
      if (itemIndex < invoiceData.items.length - 1) {
        const nextItemId = invoiceData.items[itemIndex + 1].id;
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
        const prevItemId = invoiceData.items[itemIndex - 1].id;
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
        // Shift+Tab at first field - circle back to last field of previous item
        if (itemIndex > 0) {
          const prevItemId = invoiceData.items[itemIndex - 1].id;
          const lastField = fieldOrder[fieldOrder.length - 1];
          const prevRef = itemInputRefs.current[`${prevItemId}_${lastField}`];
          if (prevRef) {
            prevRef.focus();
            prevRef.select();
            setFocusedCell({ itemId: prevItemId, field: lastField });
          }
        }
      } else if (nextFieldIndex >= fieldOrder.length) {
        // Tab past last field - move to first field of next item or back to search
        if (itemIndex < invoiceData.items.length - 1) {
          const nextItemId = invoiceData.items[itemIndex + 1].id;
          const firstField = fieldOrder[0];
          const nextRef = itemInputRefs.current[`${nextItemId}_${firstField}`];
          if (nextRef) {
            nextRef.focus();
            nextRef.select();
            setFocusedCell({ itemId: nextItemId, field: firstField });
          }
        } else {
          // Last field of last item - go back to search
          setFocusedCell(null);
          searchInputRef.current?.focus();
        }
      } else {
        // Move to next field in current item
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

  // Handle search keyboard navigation
  const handleSearchKeyDown = (e) => {
    if (!showSearchDropdown || filteredProducts.length === 0) {
      // If Enter pressed with no dropdown, try to find exact match
      if (e.key === "Enter" && itemSearch.trim()) {
        e.preventDefault();
        const exactMatch = products.find(
          (p) =>
            p.barcode?.toLowerCase() === itemSearch.toLowerCase() ||
            p.itemcode?.toLowerCase() === itemSearch.toLowerCase(),
        );
        if (exactMatch) {
          addItemToInvoice(exactMatch);
        } else if (filteredProducts.length === 1) {
          addItemToInvoice(filteredProducts[0]);
        }
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedSearchIndex((prev) =>
          prev < filteredProducts.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedSearchIndex((prev) =>
          prev > 0 ? prev - 1 : filteredProducts.length - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (filteredProducts[selectedSearchIndex]) {
          addItemToInvoice(filteredProducts[selectedSearchIndex]);
        }
        break;
      case "Escape":
        setShowSearchDropdown(false);
        setItemSearch("");
        break;
      default:
        break;
    }
  };

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedSearchIndex(0);
  }, [itemSearch]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(e.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target)
      ) {
        setShowSearchDropdown(false);
      }
    };

    // Only attach listener when dropdown is actually visible to reduce event handler overhead
    if (showSearchDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSearchDropdown]);

  // Cleanup item input refs when items change (remove deleted items' refs)
  useEffect(() => {
    const currentItemIds = new Set(invoiceData.items.map((item) => item.id));
    const fieldOrder = ["qty", "rate", "itemDiscount", "itemDiscountAmount"];

    // Remove refs for deleted items
    Object.keys(itemInputRefs.current).forEach((key) => {
      const itemId = key.split("_")[0];
      if (!currentItemIds.has(itemId)) {
        delete itemInputRefs.current[key];
      }
    });
  }, [invoiceData.items]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInvoiceData({ ...invoiceData, [name]: value });
  };

  const handleItemChange = (id, field, value) => {
    const updated = invoiceData.items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item,
    );
    setInvoiceData({ ...invoiceData, items: updated });
  };

  const addItem = () => {
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
    setInvoiceData({ ...invoiceData, items: [...invoiceData.items, newItem] });
  };

  const removeItem = (id) => {
    setInvoiceData({
      ...invoiceData,
      items: invoiceData.items.filter((item) => item.id !== id),
    });
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let subtotalAfterItemDiscount = 0;
    let totalLineDiscount = 0;

    invoiceData.items.forEach((item) => {
      // Use dynamic decimal places based on company currency settings
      const amount = round(item.qty * item.rate);
      const percentDiscount = round((amount * (item.itemDiscount ?? 0)) / 100);
      const amountDiscount = round(item.itemDiscountAmount ?? 0);
      const discountedAmount = round(amount - percentDiscount - amountDiscount);

      subtotal += amount;
      totalLineDiscount += percentDiscount + amountDiscount;
      subtotalAfterItemDiscount += discountedAmount; // Before invoice discount
    });

    // Round subtotals with dynamic decimal places
    subtotal = round(subtotal);
    totalLineDiscount = round(totalLineDiscount);
    subtotalAfterItemDiscount = round(subtotalAfterItemDiscount);

    // Apply invoice-level discount to subtotal after item discounts
    const invoicePercentDiscount = round(
      (subtotalAfterItemDiscount * (invoiceData.discount || 0)) / 100
    );
    const invoiceAmountDiscount = round(invoiceData.discountAmount ?? 0);
    const totalInvoiceDiscount = round(invoicePercentDiscount + invoiceAmountDiscount);

    // Total after ALL discounts (before VAT)
    const totalAfterDiscount = round(subtotalAfterItemDiscount - totalInvoiceDiscount);

    // Calculate TAX based on customer's tax type and tax group (India GST or UAE VAT based on company)
    const customerTaxRate = getCustomerTaxRate();
    const totalTax = round((totalAfterDiscount * customerTaxRate) / 100);
    const taxDetails = getTaxDetails();

    // Total including TAX
    const grandTotal = round(totalAfterDiscount + totalTax);

    return {
      subtotal: formatNumber(subtotal),
      discount: formatNumber(round(totalLineDiscount + totalInvoiceDiscount)),
      totalAfterDiscount: formatNumber(totalAfterDiscount),
      tax: formatNumber(totalTax),
      taxRate: customerTaxRate,
      taxLabel: taxDetails.label,
      taxBreakdown: taxDetails.breakdown,
      total: formatNumber(grandTotal),
    };
  };

  const totals = calculateTotals();

  // Save invoice (create or update)
  const handleSaveInvoice = async () => {
    // Validation checks
    if (!invoiceData.partyName?.trim()) {
      showToast("Please select a customer", "error", 3000);
      return false;
    }
    
    // Country isolation: Prevent cross-country sales (NOT international sales)
    const companyCountry = config?.country || 'UAE';
    if (selectedCustomerDetails?.country && selectedCustomerDetails.country !== companyCountry) {
      showToast(
        `❌ Cannot create invoice: Customer is from ${selectedCustomerDetails.country}, but company is in ${companyCountry}. Not international sales allowed.`,
        "error",
        4000
      );
      return false;
    }
    
    // India-specific validation: Ensure customer has tax type set
    if (config?.country === 'India' && !selectedCustomerDetails?.taxType) {
      showToast(
        "⚠️ India company requires customer to have a GST tax classification. Please set customer tax type.",
        "error",
        4000
      );
      return false;
    }
    
    if (!invoiceData.paymentType?.trim()) {
      showToast("Please select a payment type", "error", 3000);
      return false;
    }
    if (selectedCustomerDetails?.paymentType === "Credit Sale" && !invoiceData.paymentTerms?.trim()) {
      showToast("Please select payment terms for credit sale customers", "error", 3000);
      return false;
    }
    if (invoiceData.items.length === 0) {
      showToast("Add at least one item to the invoice", "error", 3000);
      return false;
    }
    if (invoiceData.items.some((item) => !item.itemName?.trim())) {
      showToast("All items must have a name", "error", 3000);
      return false;
    }
    if (invoiceData.items.some((item) => item.qty <= 0)) {
      showToast("All items must have quantity greater than 0", "error", 3000);
      return false;
    }
    if (invoiceData.items.some((item) => item.rate <= 0)) {
      showToast("All items must have a price greater than 0", "error", 3000);
      return false;
    }

    setLoading(true);
    try {
      const now = new Date().toISOString();

      // Calculate comprehensive sales metrics with dynamic decimal precision
      const totalItemQty = invoiceData.items.reduce(
        (sum, item) => sum + item.qty,
        0,
      );
      const totalCost = round(
        invoiceData.items.reduce((sum, item) => sum + item.cost * item.qty, 0)
      );
      // Use customer's tax rate instead of averaging item tax rates
      const customerTaxRateForInvoice = getCustomerTaxRate();

      const grossProfit = round(
        parseFloat(totals.subtotal) - totalCost
      );
      const grossProfitMargin =
        parseFloat(totals.subtotal) > 0
          ? round(
              (grossProfit / parseFloat(totals.subtotal)) * 100
            )
          : 0;
      const netProfit = round(
        parseFloat(totals.total) - totalCost
      );
      const netProfitMargin =
        parseFloat(totals.total) > 0
          ? round(
              (netProfit / parseFloat(totals.total)) * 100
            )
          : 0;

      const payload = {
        // Invoice Header Information
        invoiceNumber: invoiceData.invoiceNo,
        financialYear: financialYear,
        date: invoiceData.invoiceDate,
        paymentType: invoiceData.paymentType,
        paymentTerms: invoiceData.paymentTerms,
        createdDate: now,
        updatedDate: now,

        // Customer Information
        customerId: selectedCustomerDetails?._id || "",
        customerName: invoiceData.partyName,
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

        // Item Counts and Quantities
        totalItems: invoiceData.items.length,
        totalItemQty: totalItemQty,

        // Financial Breakdown (All values use dynamic decimal places based on company currency)
        subtotal: Number(totals.subtotal),
        discountPercentage: round(invoiceData.discount || 0),
        discountAmount: round(invoiceData.discountAmount || 0),
        totalAfterDiscount: Number(totals.totalAfterDiscount),
        vatPercentage: customerTaxRateForInvoice,
        vatAmount: Number(totals.tax),
        totalIncludeVat: Number(totals.total),

        // Cost and Profitability Analysis (All with dynamic decimal precision)
        totalCost: totalCost,
        grossProfit: grossProfit,
        grossProfitMargin: grossProfitMargin,
        netProfit: netProfit,
        netProfitMargin: netProfitMargin,

        // Notes
        notes: invoiceData.notes,

        // Line Items with Full Analysis
        items: invoiceData.items.map((item) => {
          // Get customer's tax rate for this item
          const customerTaxRate = getCustomerTaxRate();
          // Calculate with dynamic decimal precision - no floating point errors
          const itemAmount = round(item.qty * item.rate);
          const itemPercentDiscount = round(
            (itemAmount * (item.itemDiscount ?? 0)) / 100
          );
          const itemAmountDiscount = round(item.itemDiscountAmount ?? 0);
          const itemDiscountedAmount = round(
            itemAmount - itemPercentDiscount - itemAmountDiscount
          );
          const itemVat = round(
            (itemDiscountedAmount * customerTaxRate) / 100
          );
          const itemTotal = round(itemDiscountedAmount + itemVat);
          const itemTotalCost = round(item.cost * item.qty);
          const itemGrossProfit = round(itemAmount - itemTotalCost);
          const itemGrossProfitMargin =
            itemAmount > 0
              ? round((itemGrossProfit / itemAmount) * 100)
              : 0;
          const itemNetProfit = round(itemTotal - itemTotalCost);
          const itemNetProfitMargin =
            itemTotal > 0
              ? round((itemNetProfit / itemTotal) * 100)
              : 0;

          return {
            // Item Details
            itemName: item.itemName,
            itemcode: item.itemcode,
            productId: item.productId,

            // Quantity and Pricing
            quantity: item.qty,
            unitPrice: round(item.rate),
            lineAmount: itemAmount,

            // Cost Information
            unitCost: round(item.cost),
            lineCost: itemTotalCost,

            // Discount Details
            discountPercentage: round(item.itemDiscount ?? 0),
            discountAmount: itemAmountDiscount,
            amountAfterDiscount: itemDiscountedAmount,

            // Profitability Metrics
            grossProfit: itemGrossProfit,
            grossProfitMargin: itemGrossProfitMargin,
            netProfit: itemNetProfit,
            netProfitMargin: itemNetProfitMargin,

            // Tax Information (based on customer's tax type and tax group)
            vatPercentage: customerTaxRate,
            vatAmount: itemVat,

            // Final Total
            total: itemTotal,

            // Additional Details
            serialNumbers: item.serialNumbers || [],
            note: itemNotes[item.id] || "",
          };
        }),
      };
      let savedInvoiceId;
      if (editId) {
        await axios.put(
          `${API_URL}/sales-invoices/updateSalesInvoice/${editId}`,
          payload,
        );
        savedInvoiceId = editId;
      } else {
        const response = await axios.post(
          `${API_URL}/sales-invoices/createSalesInvoice`,
          payload,
        );
        savedInvoiceId = response.data._id || response.data.id;
      }

      // Auto-reduce stock for all items in the invoice (FIFO)
      try {
        const stockOutPayload = {
          items: invoiceData.items.map((item) => ({
            productId: item.productId,
            quantity: item.qty,
          })),
          saleInvoiceId: savedInvoiceId,
          invoiceNumber: invoiceData.invoiceNo,
          customerName: invoiceData.partyName,
          documentDate: invoiceData.invoiceDate,
        };
        
        await axios.post(
          `${API_URL}/stock/outbound`,
          stockOutPayload,
        );
      } catch (stockError) {
        // Silently fail - don't fail invoice save if stock API has issues
      }

      fetchInvoices();
      setError(null);
      setEditId(null);
      await resetForm();
      showToast("Invoice saved successfully", "success", 3000);
      return true;
    } catch (err) {
      setError("Failed to save invoice");
      showToast("Failed to save invoice. Please try again.", "error", 3000);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Print invoice
  const handlePrint = () => {
    window.print();
  };

  // Save and Print
  const handleSaveAndPrint = async () => {
    const saved = await handleSaveInvoice();
    if (saved) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  };

  // Edit invoice
  const handleEditInvoice = (invoice) => {
    // Restore serial numbers from invoice items
    const restoredSerials = {};
    invoice.items.forEach((item, idx) => {
      if (item.serialNumbers?.length > 0) {
        restoredSerials[idx + 1] = item.serialNumbers;
      }
    });
    setSerialNumbers(restoredSerials);

    setInvoiceData({
      invoiceNo: invoice.invoiceNumber,
      invoiceDate: invoice.date.split("T")[0],
      paymentType: invoice.paymentType || "",
      paymentTerms: invoice.paymentTerms || "",
      partyName: invoice.customerName,
      partyPhone: invoice.customerPhone || "",
      discount: invoice.discountPercentage || 0,
      discountAmount: invoice.discountAmount || 0,
      items: invoice.items.map((item, idx) => {
        // Find product details from the products array
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
      notes: invoice.notes || "",
    });

    // Set customer details if available
    if (invoice.customerId) {
      setSelectedCustomerId(invoice.customerId);
      setSelectedCustomerDetails({
        vendorTRN: invoice.customerTRN || "",
        phone: invoice.customerPhone || "",
        name: invoice.customerName || "",
        address: invoice.customerAddress || "",
        vendorContactPerson: invoice.customerContact || "",
      });
    }

    setEditId(invoice._id);
  };

  // Fetch next invoice number when creating a new invoice
  useEffect(() => {
    const fetchNextInvoiceNumber = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/sales-invoices/nextInvoiceNumber?financialYear=${financialYear}`,
        );
        setInvoiceData((prev) => ({
          ...prev,
          invoiceNo: res.data.sequence || res.data.invoiceNumber,
        }));
      } catch (err) {
        // Silently fail - use default invoice number
      }
    };
    // Only fetch if not editing existing invoice
    if (!editId) {
      fetchNextInvoiceNumber();
    }
  }, [editId, financialYear]);

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-100 overflow-hidden">
      {/* HEADER - Using Separated Component */}
      <SalesInvoiceNewHeader
        invoiceData={invoiceData}
        selectedCustomerDetails={selectedCustomerDetails}
        customers={customers}
        customerSearch={customerSearch}
        showCustomerDropdown={showCustomerDropdown}
        loading={loading}
        onCustomerSearchChange={(value) => {
          if (selectedCustomerDetails) {
            setSelectedCustomerId(null);
            setSelectedCustomerDetails(null);
          }
          setCustomerSearch(value);
          setShowCustomerDropdown(true);
        }}
        onCustomerDropdownToggle={(show) => setShowCustomerDropdown(show)}
        onSelectCustomer={handleSelectCustomer}
        onHistoryClick={() => {
          setShowHistoryModal(true);
          fetchInvoices();
        }}
        onLookupClick={async () => {
          try {
            const res = await axios.get(
              `${API_URL}/products/getproducts?limit=50000`,
            );
            setProducts(res.data.products || res.data);
            setItemSearch("");
          } catch (err) {
            // Silently fail - products will be empty
          }
          setShowProductLookup(true);
        }}
        onSave={handleSaveInvoice}
        onPrint={handleSaveAndPrint}
      />

      {/* CONTENT - Using Separated Component */}
      <SalesInvoiceNewContent
        invoiceData={invoiceData}
        itemSearch={itemSearch}
        showSearchDropdown={showSearchDropdown}
        filteredProducts={filteredProducts}
        focusedCell={focusedCell}
        totals={totals}
        config={config}
        decimalPlaces={decimalPlaces}
        getInputStep={getInputStep}
        onItemSearchChange={(value) => {
          setItemSearch(value);
          setShowSearchDropdown(true);
        }}
        onAddItemFromSearch={addItemToInvoice}
        onItemChange={handleItemChange}
        onAddItem={addItem}
        onRemoveItem={removeItem}
        onSerialClick={(itemId) => {
          setSelectedItemSerial(itemId);
          setShowSerialModal(true);
        }}
        onNoteClick={(itemId) => {
          setSelectedItemNote(itemId);
          setShowItemNoteModal(true);
        }}
        onTableCellKeyDown={handleTableCellKeyDown}
        formatNumber={formatNumber}
        searchInputRef={searchInputRef}
        itemInputRefs={itemInputRefs}
        setFocusedCell={setFocusedCell}
      />

      {/* FOOTER - Using Separated Component */}
      <SalesInvoiceNewFooter
        invoiceData={invoiceData}
        totals={totals}
        config={config}
        loading={loading}
        decimalPlaces={decimalPlaces}
        getInputStep={getInputStep}
        formatNumber={formatNumber}
        onNotesChange={(value) => setInvoiceData({ ...invoiceData, notes: value })}
        onDiscountChange={(value) => setInvoiceData({ ...invoiceData, discount: value })}
        onDiscountAmountChange={(value) => setInvoiceData({ ...invoiceData, discountAmount: value })}
        onSave={handleSaveInvoice}
        onPrint={handleSaveAndPrint}
      />

      {/* MODALS AND TOASTS */}

      {/* HISTORY MODAL */}
      <HistoryModal
        show={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        invoices={invoices}
        historyDateFilter={historyDateFilter}
        onHistoryDateFilterChange={setHistoryDateFilter}
        historySearch={historySearch}
        onHistorySearchChange={setHistorySearch}
        filteredHistoryInvoices={filteredHistoryInvoices}
        onEditInvoice={handleEditInvoice}
        onViewInvoice={setViewedInvoice}
        formatNumber={formatNumber}
      />

      {/* INVOICE VIEW MODAL */}
      <InvoiceViewModal
        viewedInvoice={viewedInvoice}
        onClose={() => setViewedInvoice(null)}
        config={config}
        formatNumber={formatNumber}
      />

      {/* PRODUCT LOOKUP MODAL */}
      <ProductLookupModal
        show={showProductLookup}
        onClose={() => setShowProductLookup(false)}
        itemSearch={itemSearch}
        onSearchChange={setItemSearch}
        filteredProducts={filteredProducts}
        onAddProduct={addItemToInvoice}
        config={config}
        formatNumber={formatNumber}
      />

      {/* ITEM NOTE MODAL */}
      <ItemNoteModal
        show={showItemNoteModal}
        selectedItemNote={selectedItemNote}
        itemNotes={itemNotes}
        onNoteChange={({ itemId, value }) =>
          setItemNotes((prev) => ({
            ...prev,
            [itemId]: value,
          }))
        }
        onClose={() => {
          setShowItemNoteModal(false);
          setSelectedItemNote(null);
        }}
      />

      {/* SERIAL NUMBER MODAL */}
      <SerialNumberModal
        show={showSerialModal}
        selectedItemSerial={selectedItemSerial}
        serialNumbers={serialNumbers}
        newSerialInput={newSerialInput}
        onNewSerialInputChange={setNewSerialInput}
        onAddSerial={(itemId, serialValue) => {
          setSerialNumbers((prev) => ({
            ...prev,
            [itemId]: [
              ...(prev[itemId] || []),
              serialValue,
            ],
          }));
          setNewSerialInput("");
        }}
        onRemoveSerial={(itemId, index) => {
          setSerialNumbers((prev) => ({
            ...prev,
            [itemId]: prev[itemId].filter((_, i) => i !== index),
          }));
        }}
        onClose={() => {
          setShowSerialModal(false);
          setSelectedItemSerial(null);
          setNewSerialInput("");
        }}
      />

      {/* TOAST NOTIFICATIONS */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[999] space-y-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => closeToast(toast.id)}
            className={`px-6 py-4 rounded-lg shadow-2xl text-white text-sm font-medium transition-all duration-300 cursor-pointer pointer-events-auto hover:shadow-lg ${
              toast.type === "success"
                ? "bg-green-500 hover:bg-green-600"
                : toast.type === "error"
                  ? "bg-red-500 hover:bg-red-600"
                  : toast.type === "warning"
                    ? "bg-yellow-500 hover:bg-yellow-600"
                    : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            <div className="flex items-center gap-3">
              {toast.type === "success" && (
                <span className="text-2xl font-bold">✓</span>
              )}
              {toast.type === "error" && (
                <span className="text-2xl font-bold">✕</span>
              )}
              {toast.type === "warning" && (
                <span className="text-2xl font-bold">⚠</span>
              )}
              {toast.type === "info" && (
                <span className="text-2xl font-bold">ℹ</span>
              )}
              <div className="flex-1">
                <span>{toast.message}</span>
                <p className="text-xs opacity-75 mt-1">
                  Click to close or press any key
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SalesInvoice;


