import React, { useState, useEffect, useRef, useCallback, useMemo, useContext } from "react";
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
  Edit2,
  Hash,
} from "lucide-react";
import axios from "axios";
import { API_URL } from "../../config/config";
import { useDecimalFormat } from "../../hooks/useDecimalFormat";
import { useTaxMaster } from "../../hooks/useTaxMaster";
import { useProductSearch } from "../../hooks/useProductSearch";
import { useGlobalBarcodeScanner } from "../../hooks/useGlobalBarcodeScanner";
import { createBarcodeHandler } from "../../utils/barcodeHandler";
import { normalizeBarcode } from "../../utils/barcodeUtils";
import { CompanyContext } from "../../context/CompanyContext";
import { useTerminalFeature } from "../../context/TerminalContext";
import ProductLookupModal from "./modals/ProductLookupModal";
import InvoicePrintingComponent from "./salesInvoice/InvoicePrintingComponent";

const SalesInvoice = () => {
  // Get full company data from context
  const { company } = useContext(CompanyContext);
  
  // ✅ Terminal Feature Controls
  const allowReturns = useTerminalFeature('allowReturns');
  const allowDiscounts = useTerminalFeature('allowDiscounts');
  const allowExchanges = useTerminalFeature('allowExchanges');
  const allowPromotions = useTerminalFeature('allowPromotions');
  
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

  // Helper function to format decimal places for display in input fields
  const formatInputValue = (value) => {
    if (!value && value !== 0) return "";
    return parseFloat(value).toFixed(decimalPlaces);
  };

  // Helper function to get tax rate based on customer's tax type and tax group
  const getCustomerTaxRate = () => {
    // If customer has taxGroupId, use that for the tax rate
    if (selectedCustomerDetails?.taxGroupId && taxMaster) {
      const customerTaxGroup = taxMaster.find(
        (tg) => tg._id === selectedCustomerDetails.taxGroupId
      );
      if (customerTaxGroup) {
        return customerTaxGroup.totalRate || 5; // Default to 5% if not found
      }
    }
    // Fallback: return default tax rate (5%)
    return 5;
  };

  // Helper function to get country-based tax details (UAE VAT, Oman VAT, India GST)
  const getTaxDetails = () => {
    const country = config?.country || 'AE';
    const taxRate = getCustomerTaxRate();
    
    const taxDetails = {
      UAE: {
        label: 'VAT',
        rate: taxRate,
        breakdown: null, // UAE uses single rate
        description: `VAT @ ${taxRate}%`
      },
      Oman: {
        label: 'VAT',
        rate: taxRate,
        breakdown: null, // Oman uses single rate
        description: `VAT @ ${taxRate}%`
      },
      India: {
        label: 'GST',
        rate: taxRate,
        breakdown: {
          cgst: taxRate / 2, // CGST = half of total
          sgst: taxRate / 2, // SGST = half of total
        },
        description: `GST @ ${taxRate}% (CGST ${taxRate / 2}% + SGST ${taxRate / 2}%)`
      }
    };
    
    return taxDetails[country] || taxDetails['UAE'];
  };
  const [openDropdown, setOpenDropdown] = useState(null);
  const [scannerInput, setScannerInput] = useState(""); // Keep for manual input field
  const [lastScanTime, setLastScanTime] = useState(0);
  const scanQueueRef = useRef(Promise.resolve()); // 🔬 Queue for sequential barcode processing
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
  const [showPrintingModal, setShowPrintingModal] = useState(false);
  const [invoiceToView, setInvoiceToView] = useState(null);
  const [savedInvoiceId, setSavedInvoiceId] = useState(null); // For Save & Print flow
  const [historyDateFilter, setHistoryDateFilter] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [historySearch, setHistorySearch] = useState("");
  const [financialYear, setFinancialYear] = useState("2025-26"); // Set dynamically as needed

  // Customer related states
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null);
  const [hoveredCustomer, setHoveredCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

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
  const [activeErrorId, setActiveErrorId] = useState(null); // Track active error toast
  const [activeValidationId, setActiveValidationId] = useState(null); // Track active "not found" validation (also blocks scanning)
  const [lastErrorBarcode, setLastErrorBarcode] = useState(null); // Track last error barcode
  const [errorTimestamp, setErrorTimestamp] = useState(0); // Track when last error occurred
  const errorDebounceTimeMs = 1000; // Prevent duplicate errors within 1 second

  // Show toast function
  // Parameters: message, type ("info","warning","error"), duration, blockingMode ("error"|"validation"|null)
  const showToast = useCallback((message, type = "info", duration = 3000, blockingMode = null) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Track blocking states (both prevent scanning)
    if (blockingMode === "error") {
      setActiveErrorId(id);
    } else if (blockingMode === "validation") {
      setActiveValidationId(id);
    }
    
    if (duration !== Infinity) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
        if (blockingMode === "error") {
          setActiveErrorId(null);
        } else if (blockingMode === "validation") {
          setActiveValidationId(null);
        }
      }, duration);
    }
  }, []);

  // Close toast by ID
  const closeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    // Clear active error if this was the error toast
    if (activeErrorId === id) {
      setActiveErrorId(null);
      setLastErrorBarcode(null);
      console.log("✅ Error cleared - scanning resumed");
    }
    // Clear active validation if this was the validation toast
    if (activeValidationId === id) {
      setActiveValidationId(null);
      setLastErrorBarcode(null);
      console.log("✅ Validation cleared - scanning resumed");
    }
  }, [activeErrorId, activeValidationId]);

  // Global keyboard shortcuts (Ctrl+S, Ctrl+P, Ctrl+N, Escape)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
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

      // Escape: Close toasts and return focus to search box (if in table) or close modals
      if (e.key === "Escape") {
        setToasts([]);
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
    if (!searchResults || searchResults.length === 0) return;
    
    // ✅ MERGE STOCK DATA - Extract stock from embedded currentStock object
    const productsWithStock = searchResults.map(product => ({
      ...product,
      // Use embedded currentStock.availableQuantity if available, otherwise fallback
      stock: product.currentStock?.availableQuantity ?? product.currentStock?.totalQuantity ?? 0
    }));
    
    if (productPage === 1) {
      // First page: replace the products list
      setProducts(productsWithStock || []);
    } else {
      // Load more: append to existing products
      setProducts((prev) => [...prev, ...productsWithStock]);
    }
  }, [searchResults, productPage]);

  // ✅ Load more products function (for "Load More" button)
  const loadMoreProducts = () => {
    if (!searchMetadata?.hasNextPage) return;
    setProductPage((prev) => prev + 1);
  };

  // clear screen after saving invoice
  const resetForm = async () => {
    try {
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
      setHoveredCustomer(null);
      setCustomerSearch("");
      setShowCustomerDropdown(false);
      
      // Clear all error and validation states
      setError(null);
      setActiveErrorId(null);
      setActiveValidationId(null);
      setLastErrorBarcode(null);
      setEditId(null);
    } catch (err) {
      console.error('Error resetting form:', err);
      // Still reset the form data even if fetching next invoice number fails
      setInvoiceData({
        invoiceNo: 'SI/ERROR',
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
      setSerialNumbers({});
      setItemNotes({});
      setSelectedCustomerId(null);
      setSelectedCustomerDetails(null);
      setCustomerSearch("");
      setError(null);
      setActiveErrorId(null);
      setActiveValidationId(null);
    }
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

  /**
   * ✅ LOAD ALL PRODUCTS ON MOUNT
   * Populates products array for barcode scanner fallback search
   * Global scanner needs this to match barcodes locally
   */
  useEffect(() => {
    const loadAllProducts = async () => {
      try {
        console.log("📦 Loading all products for barcode scanner...");
        const response = await axios.get(`${API_URL}/products/getproducts?limit=50000`);
        
        if (response.data && Array.isArray(response.data)) {
          const allProducts = response.data.map(product => ({
            ...product,
            stock: product.stock?.availableQuantity ?? product.stock?.totalQuantity ?? 0
          }));
          setProducts(allProducts);
          console.log(`✅ Loaded ${allProducts.length} products for barcode matching`);
        }
      } catch (err) {
        console.error("❌ Failed to load products:", err);
      }
    };

    // Load products once on mount
    loadAllProducts();
  }, []); // Empty array = run only once on mount
  // Fetch customers
  const fetchCustomers = async () => {
    try {
      // Country isolation: Only fetch customers for company's country (NOT international sales)
      const companyCountry = config?.country || 'AE';
      const res = await axios.get(
        `${API_URL}/customers/getcustomers?limit=100&country=${encodeURIComponent(companyCountry)}`,
      );
      setCustomers(res.data.customers || []);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
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
      setHoveredCustomer(null);
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

  // Close customer dropdown when clicking outside
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

  /**
   * 🔬 HANDLER CALLBACKS FOR BARCODE SCANNER
   */
  
  // Handle variant barcode scans (auto-add with unit)
  const handleVariantFound = useCallback((product, variant, matchedBarcode) => {
    console.log(`✅ [VARIANT] Adding ${product.name} as ${variant.unit?.unitName}`);
    
    setInvoiceData((prev) => {
      // Check if item already exists
      const existingIndex = prev.items.findIndex(
        (item) => item.productId === product._id
      );

      if (existingIndex >= 0) {
        // Increment quantity
        const updatedItems = [...prev.items];
        updatedItems[existingIndex].qty += 1;
        console.log(`🔄 [VARIANT] Incremented qty to ${updatedItems[existingIndex].qty}`);
        return { ...prev, items: updatedItems };
      } else {
        // Add new item with variant unit
        const newItem = {
          id: Date.now(),
          itemName: product.name,
          itemcode: product.itemcode,
          cost: product.cost || 0,
          qty: 1,
          rate: product.price || 0,
          tax: product.tax || 5,
          itemDiscount: 0,
          itemDiscountAmount: 0,
          productId: product._id,
          barcode: matchedBarcode,
          serialNumbers: [],
        };
        console.log(`➕ [VARIANT] Added new item:`, newItem.itemName);
        return { ...prev, items: [...prev.items, newItem] };
      }
    });

    // ✅ Silent success - no toast, item appears in table
    // Play success sound if available
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj==');
      audio.play().catch(() => {});
    } catch (e) {}
  }, []);

  // Handle product barcode scans
  const handleProductFound = useCallback((product) => {
    console.log(`✅ [PRODUCT] Adding ${product.name}`);
    
    setInvoiceData((prev) => {
      const existingIndex = prev.items.findIndex(
        (item) => item.productId === product._id
      );

      if (existingIndex >= 0) {
        const updatedItems = [...prev.items];
        updatedItems[existingIndex].qty += 1;
        console.log(`🔄 [PRODUCT] Incremented qty to ${updatedItems[existingIndex].qty}`);
        return { ...prev, items: updatedItems };
      } else {
        const newItem = {
          id: Date.now(),
          itemName: product.name,
          itemcode: product.itemcode,
          cost: product.cost || 0,
          qty: 1,
          rate: product.price || 0,
          tax: product.tax || 5,
          itemDiscount: 0,
          itemDiscountAmount: 0,
          productId: product._id,
          barcode: product.barcode,
          serialNumbers: [],
        };
        console.log(`➕ [PRODUCT] Added new item:`, newItem.itemName);
        return { ...prev, items: [...prev.items, newItem] };
      }
    });

    // ✅ Silent success - no toast, no sound
  }, []);

  // Handle duplicate scans (same barcode scanned again)
  const handleDuplicateScan = useCallback((barcode, existingItem) => {
    console.log(`🔄 [QTY] Incrementing quantity for repeat scan: "${barcode}"`);
    
    setInvoiceData((prev) => {
      const updatedItems = prev.items.map((item) => {
        if (item.id === existingItem.id || item.barcode === barcode) {
          return { ...item, qty: item.qty + 1 };
        }
        return item;
      });
      return { ...prev, items: updatedItems };
    });

    // ✅ Silent increment - no toast, qty updates automatically
  }, []);

  // Handle barcode not found
  const handleBarcodeNotFound = useCallback((barcode) => {
    const now = Date.now();
    
    // ⛔ Prevent duplicate validations for same barcode within debounce window
    if (lastErrorBarcode === barcode && (now - errorTimestamp) < errorDebounceTimeMs) {
      console.warn(`⏱️ [VALIDATION] Duplicate blocked for barcode: ${barcode}`);
      return;
    }
    
    // 📝 Systematic validation logging (NOT an error - just product not in database)
    console.group(`⚠️ VALIDATION - Product Not In Database`);
    console.log(`Barcode: ${barcode}`);
    console.log(`Timestamp: ${new Date(now).toISOString()}`);
    console.log(`Status: This is normal - product simply doesn't exist`);
    console.groupEnd();
    
    // Track this validation
    setLastErrorBarcode(barcode);
    setErrorTimestamp(now);
    
    // Show validation message - NO AUTO CLOSE (user must dismiss manually)
    // ⛔ VALIDATION also blocks scanning until dismissed (like errors)
    showToast(` Product not found: ${barcode}`, "error", Infinity, "validation");
    
    // Play alert sound (informational, not error)
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Single beep for "not found" (less aggressive than error beep)
      const oscill = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      oscill.connect(gain);
      gain.connect(audioContext.destination);
      
      oscill.frequency.value = 600; // Single frequency
      oscill.type = 'sine';
      
      gain.gain.setValueAtTime(0.6, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscill.start(audioContext.currentTime);
      oscill.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      console.error("🔊 [SOUND] Failed to play validation sound:", e.message);
    }
  }, [showToast, lastErrorBarcode, errorTimestamp, errorDebounceTimeMs]);

  /**
   * 🌐 API SEARCH FOR BARCODE
   * Uses dedicated /barcode/:code endpoint for fast exact match
   */
  const apiSearchProduct = useCallback(async (barcode) => {
    const normalized = normalizeBarcode(barcode);
    console.log(`🌐 [API] Searching barcode: GET /products/barcode/${normalized}`);
    
    try {
      // ✅ PRIMARY: Use dedicated barcode endpoint (fast exact match)
      const response = await axios.get(
        `${API_URL}/products/barcode/${encodeURIComponent(normalized)}`
      );
      
      // ✅ SUCCESS: Product found
      if (response.data?.success && response.data?.product) {
        console.log(`✅ [BUSINESS] Product found:`, response.data.product.name);
        return response.data.product;
      }
      
      // ⚠️ BUSINESS CASE: Product not found (valid state, not an error)
      if (response.data?.success === false && response.data?.type === "PRODUCT_NOT_FOUND") {
        console.log(`⚠️  [BUSINESS] Product not in database: ${barcode}`);
        return null;
      }
      
      // Unexpected response format
      console.log(`ℹ️ [API] Unexpected response format`, response.data);
      return null;
      
    } catch (err) {
      // ❌ REAL ERROR: Server problems (5xx, network issues, etc.)
      if (err.response?.status >= 500) {
        console.group(`❌ [ERROR] Server Error`);
        console.error(`Status: ${err.response.status}`);
        console.error(`Barcode: ${barcode}`);
        console.error(`Message: ${err.message}`);
        console.groupEnd();
        // Show blocking error toast for real server errors
        showToast("Server error - try again", "error", Infinity, "error");
        return null;
      }
      
      // Network connectivity issues
      if (!err.response) {
        console.group(`❌ [ERROR] Network Error`);
        console.error(`Barcode: ${barcode}`);
        console.error(`Message: ${err.message}`);
        console.groupEnd();
        // Show blocking error toast for network failures
        showToast("Network error - check connection", "error", Infinity, "error");
        return null;
      }
      
      // Other unexpected errors
      console.log(`⚠️  [API] Unexpected error status ${err.response.status}`);
      return null;
    }
  }, []);

  /**
   * 📦 CREATE BARCODE HANDLER
   * Factory pattern handler with all search logic
   */
  const barcodeHandler = useMemo(
    () => createBarcodeHandler({
      products, // All products loaded in memory
      apiSearch: apiSearchProduct, // API fallback search
      onVariantFound: handleVariantFound,
      onProductFound: handleProductFound,
      onDuplicateScan: handleDuplicateScan,
      onNotFound: handleBarcodeNotFound,
      currentItems: invoiceData.items, // Pass current items for duplicate detection
    }),
    [products, apiSearchProduct, handleVariantFound, handleProductFound, handleDuplicateScan, handleBarcodeNotFound, invoiceData.items]
  );

  /**
   * 🔬 GLOBAL BARCODE HANDLER
   * Delegates to optimized handler
   */
  const handleBarcodeScanned = useCallback(
    async (barcode, meta = {}) => {
      // ⛔ Prevent scanning if ANY blocking validation is active (error or "not found")
      if (activeErrorId || activeValidationId) {
        const reason = activeErrorId ? "Error" : "Product not found";
        console.warn(`⛔ Cannot scan: ${reason} validation must be dismissed first`);
        return;
      }
      
      if (!barcode || barcode.trim().length === 0) {
        console.warn("⚠️ Empty barcode provided, ignoring");
        return;
      }

      console.log(`\n📱 [SCAN] Global scan triggered: "${barcode.trim()}"\n`);

      scanQueueRef.current = scanQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          try {
            await barcodeHandler(barcode, meta);
          } catch (error) {
            console.error("❌ [SCAN] Handler error:", error);
            showToast("Failed to process barcode", "error", Infinity, "error");
          }
        });

      await scanQueueRef.current;
    },
    [barcodeHandler, activeErrorId, activeValidationId]
  );

  /**
   * 🔬 GLOBAL BARCODE LISTENER
   * Captures barcode scans from scanner even without input focus
   */
  const barcodeScannerControls = useGlobalBarcodeScanner(handleBarcodeScanned, {
    minLength: 3,
    maxTypingSpeed: 100, // Scanner detection threshold (fast = scanner, slow = typing)
    debounceTime: 500,
    enableSound: false,
    ignoreInputFields: true, // ✅ FIXED: Should be TRUE to work globally (ignore INPUT fields)
    debugMode: true, // ✅ ENABLED: Debug console logs for troubleshooting
    allowDuplicateScan: true,
    preventDefaultOnScan: true,
    enabled: true,
  });

  /**
   * 🔍 CONTEXT-AWARE SCANNING
   * Pause scanner when modals are open
   * ⚠️ DO NOT include barcodeScannerControls in dependency array!
   * It changes on every render, causing buffer to reset after each character
   */
  useEffect(() => {
    if (showProductLookup || showItemNoteModal || showSerialModal) {
      barcodeScannerControls?.pause();
    } else {
      barcodeScannerControls?.resume();
    }
  }, [showProductLookup, showItemNoteModal, showSerialModal]);

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
          addItemFromSearch(exactMatch);
        } else if (filteredProducts.length === 1) {
          addItemFromSearch(filteredProducts[0]);
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
          addItemFromSearch(filteredProducts[selectedSearchIndex]);
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

  // Add item from search selection
  const addItemFromSearch = (product) => {
    let addedItemId = null;

    setInvoiceData((prev) => {
      const existingIndex = prev.items.findIndex(
        (item) => item.productId === product._id,
      );

      if (existingIndex >= 0) {
        const updatedItems = [...prev.items];
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          qty: updatedItems[existingIndex].qty + 1,
        };
        addedItemId = updatedItems[existingIndex].id;
        return { ...prev, items: updatedItems };
      } else {
        // Use customer's tax rate if customer selected, otherwise use default 5%
        const customerTaxRateForItem = selectedCustomerDetails?.taxGroupId 
          ? (taxMaster?.find((tg) => tg._id === selectedCustomerDetails.taxGroupId)?.totalRate || 5)
          : 5;
        
        const newItem = {
          id: Date.now(),
          itemName: product.name,
          qty: 1,
          cost: product.cost,
          rate: product.price,
          tax: customerTaxRateForItem, // Use customer tax rate instead of product tax
          itemDiscount: 0,
          itemDiscountAmount: 0,
          productId: product._id,
          barcode: product.barcode,
          itemcode: product.itemcode,
          serialNumbers: [],
        };
        addedItemId = newItem.id;
        return { ...prev, items: [...prev.items, newItem] };
      }
    });

    setItemSearch("");
    setShowSearchDropdown(false);
    setLastScanTime(Date.now());
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
  };

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

  // ✅ GLOBAL VALIDATION HELPER - Centralized invoice validation
  const validateInvoice = () => {
    // Collect all validation errors
    const errors = [];

    // 1. Customer validation
    if (!invoiceData.partyName?.trim()) {
      errors.push("Please select a customer");
    }

    // 2. Country isolation validation
    const companyCountry = config?.country || 'AE';
    if (selectedCustomerDetails?.country && selectedCustomerDetails.country !== companyCountry) {
      errors.push(
        `Cannot create invoice: Customer is from ${selectedCustomerDetails.country}, but company is in ${companyCountry}`
      );
    }

    // 3. India-specific tax validation
    if (config?.country === 'India' && !selectedCustomerDetails?.taxType) {
      errors.push(
        "India company requires customer to have a GST tax classification"
      );
    }

    // 4. Payment type validation
    if (!invoiceData.paymentType?.trim()) {
      errors.push("Please select a payment type");
    }

    // 5. Payment terms validation (for credit sales)
    if (
      selectedCustomerDetails?.paymentType === "Credit Sale" &&
      !invoiceData.paymentTerms?.trim()
    ) {
      errors.push("Please select payment terms for credit sale customers");
    }

    // 6. Items validation
    if (invoiceData.items.length === 0) {
      errors.push("Add at least one item to the invoice");
    }

    // 7. Item name validation
    if (invoiceData.items.some((item) => !item.itemName?.trim())) {
      errors.push("All items must have a name");
    }

    // 8. Item quantity validation
    if (invoiceData.items.some((item) => item.qty <= 0)) {
      errors.push("All items must have quantity greater than 0");
    }

    // 9. Item price validation
    if (invoiceData.items.some((item) => item.rate <= 0)) {
      errors.push("All items must have a price greater than 0");
    }

    return errors;
  };

  // Save invoice (create or update)
  const handleSaveInvoice = async () => {
    // ✅ USE GLOBAL VALIDATION - Get all validation errors
    const validationErrors = validateInvoice();

    // ✅ SHOW FIRST ERROR if any validation fails
    if (validationErrors.length > 0) {
      showToast(validationErrors[0], "error", 4000);
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
      console.log("Saving invoice with payload:", payload);
      let savedInvoiceId;
      if (editId) {
        await axios.put(
          `${API_URL}/sales-invoices/updateSalesInvoice/${editId}`,
          payload,
        );
        savedInvoiceId = editId;
        console.log('✅ Invoice updated:', savedInvoiceId);
      } else {
        const response = await axios.post(
          `${API_URL}/sales-invoices/createSalesInvoice`,
          payload,
        );
        console.log('📡 API Response:', response.data);
        // Try multiple paths to get the ID - handle both wrapped and unwrapped responses
        savedInvoiceId = response.data?.invoice?._id || response.data?._id || response.data?.id || response.data?.invoiceId;
        console.log('✅ Invoice created:', savedInvoiceId);
      }

      if (!savedInvoiceId) {
        console.error('Response structure:', response.data);
        throw new Error('Failed to get saved invoice ID from API response');
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
        console.log("Stock reduced successfully for invoice:", savedInvoiceId);
      } catch (stockError) {
        console.warn("Stock reduction warning:", stockError.message);
        // Don't fail invoice save if stock API has issues - log and continue
        // This allows invoices to be saved even if stock tracking is temporarily unavailable
      }

      fetchInvoices();
      setError(null);
      setEditId(null);
      setActiveErrorId(null);
      setActiveValidationId(null);
      await resetForm();
      showToast("Invoice saved successfully", "success", 3000);
      return { success: true, invoiceId: savedInvoiceId };
    } catch (err) {
      setError("Failed to save invoice");
      showToast("Failed to save invoice. Please try again.", "error", 3000);
      return { success: false, invoiceId: null };
    } finally {
      setLoading(false);
    }
  };

  // Print invoice
  const handlePrint = () => {
    window.print();
  };

  // Save and Print - Use existing InvoicePrintingComponent with terminal template
  const handleSaveAndPrint = async () => {
    const result = await handleSaveInvoice();
    if (result.success) {
      // Use existing component which handles terminal template mapping
      setSavedInvoiceId(result.invoiceId);
      setInvoiceToView({ _id: result.invoiceId });
      setShowPrintingModal(true);
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
        console.error("Failed to fetch invoice number", err);
      }
    };
    // Only fetch if not editing existing invoice
    if (!editId) {
      fetchNextInvoiceNumber();
    }
  }, [editId, financialYear]);

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-100 overflow-hidden">
      {/* HEADER - Fixed at top */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 shadow-lg z-10">
        {/* Header Content - Two Columns */}
        <div className="flex justify-between gap-6">
          {/* Left Column - Sales Invoice Info */}
          <div className="flex items-start gap-3">
            <div>
              <h1 className="text-lg font-bold">Sales Invoice</h1>
              {/* Invoice Number Badge */}
              <div className="bg-white/20 px-3 py-1.5 rounded-lg mt-2 inline-block">
                <span className="text-xs text-blue-200">Invoice #</span>
                <p className="font-bold text-xs">{invoiceData.invoiceNo}</p>
                <p className="font-bold text-xs text-blue-100 text-xs">
                  {invoiceData.invoiceDate}
                </p>
              </div>
            </div>
          </div>

          {/* Middle Column - Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowHistoryModal(true);
                fetchInvoices();
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 border border-blue-400/50 rounded-lg text-white font-medium text-xs transition"
            >
              <Clock size={16} />
              History
            </button>
            <button
              onClick={async () => {
                // Fetch all products with embedded stock data
                try {
                  const productsRes = await axios.get(
                    `${API_URL}/products/getproducts?limit=50000`,
                  );
                  let productsData = productsRes.data.products || productsRes.data;
                  
                  // Log actual fields in first product for debugging
                  if (productsData.length > 0) {
                    const firstProduct = productsData[0];
                    console.log("First product fields:", Object.keys(firstProduct).sort());
                    console.log("First product taxPercent:", firstProduct.taxPercent);
                  }
                  
                  // Extract stock from embedded currentStock object instead of fetching separately
                  productsData = productsData.map(product => ({
                    ...product,
                    // Use embedded currentStock.availableQuantity if available, otherwise fallback
                    stock: product.currentStock?.availableQuantity ?? product.currentStock?.totalQuantity ?? 0
                  }));
                  
                  setProducts(productsData);
                  setItemSearch(""); // Clear search to show all products
                } catch (err) {
                  console.error("Error fetching products:", err);
                }
                setShowProductLookup(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-blue-400/50 rounded-lg text-white font-medium text-xs transition"
            >
              <Package size={16} />
              Lookup Product
            </button>
          </div>

          {/* Right Column - Customer Selection & Payment Type */}
          <div className="flex items-start gap-6 flex-1 justify-end">
            {/* Customer Selection */}
            <div className="flex flex-col gap-2 w-72">
              {/* Customer Select Dropdown */}
              <div ref={customerDropdownRef} className="relative w-full h-10">
                <User
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 z-10"
                />
                <input
                  type="text"
                  placeholder="Select Party"
                  value={
                    selectedCustomerDetails
                      ? selectedCustomerDetails.name
                      : customerSearch
                  }
                  onChange={(e) => {
                    if (selectedCustomerDetails) {
                      setSelectedCustomerId(null);
                      setSelectedCustomerDetails(null);
                      setHoveredCustomer(null);
                    }
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => {
                    if (!selectedCustomerDetails) {
                      setShowCustomerDropdown(true);
                    }
                  }}
                  className="w-full h-10 pl-9 pr-3 bg-white/10 border border-blue-400/50 rounded-lg text-sm text-white placeholder-blue-300 focus:ring-2 focus:ring-white/30 outline-none"
                />

                {/* Customer Dropdown */}
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-56 overflow-y-auto">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer._id}
                        onMouseEnter={() => setHoveredCustomer(customer)}
                        onMouseLeave={() => setHoveredCustomer(null)}
                        onClick={() => handleSelectCustomer(customer._id)}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 text-xs text-gray-800"
                      >
                        <div className="font-semibold text-gray-900">
                          {customer.name || customer.vendorName}
                        </div>
                        {customer.vendorContactPerson && (
                          <div className="text-xs text-gray-600">
                            Contact: {customer.vendorContactPerson}
                          </div>
                        )}
                        {customer.phone && (
                          <div className="text-xs text-gray-600">
                            Phone: {customer.phone || customer.vendorPhone}
                          </div>
                        )}
                        {customer.vendorTRN && (
                          <div className="text-xs text-gray-600">
                            TRN: {customer.vendorTRN}
                          </div>
                        )}
                        {customer.address && (
                          <div className="text-xs text-gray-500">
                            Address: {customer.address || customer.vendorAddress}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer Details Card */}
              <div className="bg-white/20 rounded-lg px-3 py-1.5 border border-blue-400/50 h-12 overflow-hidden">
                {selectedCustomerDetails || hoveredCustomer ? (
                  <>
                    {hoveredCustomer && !selectedCustomerDetails && (
                      <p className="text-xs text-blue-300 mb-1 italic">Preview</p>
                    )}
                    <div className="flex gap-4 text-xs flex-wrap">
                      <div>
                        <span className="text-blue-200 font-semibold block">
                          TRN
                        </span>
                        <span className="text-white font-semibold">
                          {(selectedCustomerDetails || hoveredCustomer)
                            ?.vendorTRN ||
                            (selectedCustomerDetails || hoveredCustomer)
                              ?.gstNumber ||
                            "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-blue-200 font-semibold block">
                          Mobile
                        </span>
                        <span className="text-white font-semibold">
                          {(selectedCustomerDetails || hoveredCustomer)?.phone ||
                            (selectedCustomerDetails || hoveredCustomer)
                              ?.vendorPhone ||
                            "-"}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-blue-300 italic">
                    Select a customer to view details
                  </p>
                )}
              </div>
            </div>

            {/* Payment Type Dropdown */}
            <div className="flex flex-col gap-2 min-w-40">
              <select
                disabled={!selectedCustomerDetails}
                value={invoiceData.paymentType ?? ""}
                onChange={(e) => setInvoiceData({ ...invoiceData, paymentType: e.target.value })}
                className={`px-3 py-2 rounded-lg text-sm outline-none transition ${
                  !selectedCustomerDetails
                    ? "bg-gray-600/30 border border-gray-500/30 text-gray-400 cursor-not-allowed opacity-60"
                    : "bg-white/10 border border-blue-400/50 text-white focus:ring-2 focus:ring-white/30"
                }`}
              >
                <option value="" disabled className="text-gray-500">Select Type</option>
                {selectedCustomerDetails && (selectedCustomerDetails?.paymentType === "Cash Sale" ? (
                  <>
                    <option value="Cash" className="text-gray-900">Cash</option>
                    <option value="Bank" className="text-gray-900">Bank</option>
                  </>
                ) : (
                  <>
                    <option value="Cash" className="text-gray-900">Cash</option>
                    <option value="Credit" className="text-gray-900">Credit</option>
                    <option value="Bank" className="text-gray-900">Bank</option>
                  </>
                ))}
              </select>
              
              {/* Payment Terms - Show for Credit Sale Customers */}
              {selectedCustomerDetails?.paymentType === "Credit Sale" && (
                <select
                  value={invoiceData.paymentTerms ?? ""}
                  onChange={(e) => setInvoiceData({ ...invoiceData, paymentTerms: e.target.value })}
                  className="px-3 py-2 bg-white/10 border border-blue-400/50 rounded-lg text-sm text-white focus:ring-2 focus:ring-white/30 outline-none"
                >
                  <option value="" disabled className="text-gray-500">Payment Terms</option>
                  <option value="NET 30" className="text-gray-900">NET 30</option>
                  <option value="NET 60" className="text-gray-900">NET 60</option>
                  <option value="NET 90" className="text-gray-900">NET 90</option>
                  <option value="COD" className="text-gray-900">COD</option>
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DETAILS - Items Section - Scrollable */}
      <div className="flex-1 flex flex-col p-4 min-h-0 overflow-hidden">
        {/* Search Bar - Fixed */}
        <div className="flex-shrink-0 bg-white rounded-xl shadow-sm border p-3 mb-3">
          <div className="flex items-center gap-3">
            {/* Barcode Scanner Input */}
            <div className="relative w-56">
              <ScanBarcode
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                ref={scannerInputRef}
                type="text"
                placeholder="Scan barcode..."
                value={scannerInput}
                onChange={(e) => setScannerInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && scannerInput.trim()) {
                    handleBarcodeScanned(scannerInput.trim());
                    setScannerInput("");
                  }
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by item name, code, or barcode... (Enter to add, Tab to fields)"
                value={itemSearch}
                onChange={(e) => {
                  setItemSearch(e.target.value);
                  setShowSearchDropdown(e.target.value.trim().length > 0);
                }}
                onFocus={() => itemSearch.trim() && setShowSearchDropdown(true)}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              {/* Search Dropdown */}
              {showSearchDropdown && filteredProducts.length > 0 && (
                <div
                  ref={searchDropdownRef}
                  className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto"
                >
                  <div className="text-[10px] text-gray-400 px-4 py-2 border-b bg-gray-50 sticky top-0 flex justify-between items-center">
                    <span>↑↓ Navigate • Enter to add • Esc to close</span>
                    <span className="text-[9px]">
                      {products.length} of {searchMetadata?.totalCount || 0}
                    </span>
                  </div>
                  {filteredProducts.map((product, index) => (
                    <div
                      key={product._id}
                      onClick={() => addItemFromSearch(product)}
                      onMouseEnter={() => setSelectedSearchIndex(index)}
                      className={`px-4 py-3 cursor-pointer border-b border-gray-50 last:border-b-0 transition ${
                        index === selectedSearchIndex
                          ? "bg-blue-50 border-l-4 border-l-blue-500"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-800">
                              {product.name}
                            </p>
                            {invoiceData.items.some(
                              (i) => i.productId === product._id,
                            ) && (
                              <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full">
                                ×
                                {
                                  invoiceData.items.find(
                                    (i) => i.productId === product._id,
                                  )?.qty
                                }
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            <span className="font-mono bg-gray-100 px-1 rounded">
                              {product.itemcode}
                            </span>
                            <span className="mx-2">•</span>
                            <span className="font-mono">{product.barcode}</span>
                          </p>
                        </div>
                        <div className="text-right mr-3">
                          <p className="font-bold text-green-600">
                            {config.currency} {formatNumber(product.price)}
                          </p>
                          <p className="text-xs text-gray-600 font-semibold">
                            Final: {config.currency} {formatNumber(product.finalPrice || product.price)}
                          </p>
                          <p className="text-xs text-gray-400">
                            Stock: {product.stock}
                          </p>
                        </div>
                        
                      </div>
                    </div>
                  ))}

                  {/* Load More Button - shown when more products available */}
                  {searchMetadata?.hasNextPage && (
                    <div className="sticky bottom-0 px-4 py-3 border-t bg-gray-50 flex justify-center">
                      <button
                        onClick={loadMoreProducts}
                        className="text-xs px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                      >
                        Load More Products ({products.length}/{searchMetadata?.totalCount || 0})
                      </button>
                    </div>
                  )}
                </div>
              )}
              {showSearchDropdown &&
                itemSearch.trim() &&
                filteredProducts.length === 0 && (
                  <div
                    ref={searchDropdownRef}
                    className="absolute top-full left-0 mt-1 w-full bg-white border rounded-xl shadow-lg z-50 px-4 py-6 text-center text-gray-400"
                  >
                    <Search size={24} className="mx-auto mb-2 opacity-50" />
                    No products found
                  </div>
                )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <ShoppingCart size={18} />
              <span className="font-semibold text-gray-700">
                {invoiceData.items.length}
              </span>{" "}
              items
            </div>
            {lastScanTime > 0 && Date.now() - lastScanTime < 2000 && (
              <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full animate-pulse font-medium">
                ✓ Added
              </span>
            )}
          </div>
        </div>

        {/* Items Table - Scrollable */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto min-h-0">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs sticky top-0 z-10">
                <tr>
                  <th className="text-center px-2 py-3 w-12">#</th>
                  <th className="text-center px-2 py-3 w-28">Code</th>
                  <th className="text-left px-2 py-3">Item Name</th>
                  <th className="text-center px-2 py-3 w-20">Qty</th>
                  <th className="text-center px-2 py-3 w-24">Price</th>
                  <th className="text-center px-2 py-3 w-20">Disc%</th>
                  <th className="text-center px-2 py-3 w-20">Disc Amt</th>
                  <th className="text-center px-1 py-3 w-12">VAT%</th>
                  <th className="text-right px-2 py-3 w-28">Total</th>
                  <th className="text-center px-2 py-3 w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoiceData.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan="12"
                      className="text-center py-16 text-gray-400"
                    >
                      
                      
                      <p className="text-xs mt-1">
                        Scan barcode or search for items to add
                      </p>
                    </td>
                  </tr>
                ) : (
                  invoiceData.items.map((item, idx) => {
                    // Use dynamic decimal precision for display calculations based on company currency
                    const customerTaxRateForDisplay = getCustomerTaxRate();
                    const amount = round(item.qty * item.rate);
                    const percentDiscount = round(
                      (amount * (item.itemDiscount ?? 0)) / 100
                    );
                    const amountDiscount = round(item.itemDiscountAmount ?? 0);
                    const discountedAmount = round(
                      amount - percentDiscount - amountDiscount
                    );
                    const vat = round(
                      (discountedAmount * customerTaxRateForDisplay) / 100
                    );
                    const total = round(discountedAmount + vat);

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-blue-50/40 transition-colors"
                      >
                        {/* Serial No */}
                        <td className="px-2 py-2 text-center text-gray-500 font-medium w-10">
                          {idx + 1}
                        </td>

                        {/* Barcode / Item Code */}
                        <td className="px-2 py-2 text-center w-32">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                            {item.itemcode || item.barcode || "-"}
                          </span>
                        </td>

                        {/* Item Name */}
                        <td className="px-3 py-2 text-left font-medium text-gray-800 min-w-[220px]">
                          <div>
                            <p className="font-medium text-gray-800">
                              {item.itemName}
                            </p>
                            {itemNotes[item.id] && (
                              <p className="text-xs italic text-gray-500 mt-1">
                                Note: {itemNotes[item.id]}
                              </p>
                            )}
                            {item.serialNumbers?.length > 0 && (
                              <p className="text-xs italic text-gray-500 mt-1">
                                Serial: {item.serialNumbers.join(", ")}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="px-2 py-2 text-center w-20">
                          <input
                            ref={(el) => {
                              if (el)
                                itemInputRefs.current[`${item.id}_qty`] = el;
                            }}
                            type="number"
                            inputMode="numeric"
                            step="1"
                            min="0"
                            value={parseInt(item.qty) || ""}
                            onChange={(e) =>
                              handleItemChange(
                                item.id,
                                "qty",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            onFocus={() =>
                              setFocusedCell({ itemId: item.id, field: "qty" })
                            }
                            onKeyDown={(e) =>
                              handleTableCellKeyDown(e, item.id, "qty", idx)
                            }
                            className="w-full text-center border border-gray-200 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </td>

                        {/* Rate (Price) */}
                        <td className="px-2 py-2 text-center w-24">
                          <input
                            ref={(el) => {
                              if (el)
                                itemInputRefs.current[`${item.id}_rate`] = el;
                            }}
                            type="number"
                            inputMode="decimal"
                            step={getInputStep()}
                            min="0"
                            value={item.rate || ""}
                            onChange={(e) =>
                              handleItemChange(
                                item.id,
                                "rate",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            onFocus={() =>
                              setFocusedCell({ itemId: item.id, field: "rate" })
                            }
                            onKeyDown={(e) =>
                              handleTableCellKeyDown(e, item.id, "rate", idx)
                            }
                            className="w-full text-center border border-gray-200 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </td>

                        {/* Discount % */}
                        <td className="px-2 py-2 text-center w-20">
                          <input
                            ref={(el) => {
                              if (el)
                                itemInputRefs.current[
                                  `${item.id}_itemDiscount`
                                ] = el;
                            }}
                            type="number"
                            inputMode="decimal"
                            step={getInputStep()}
                            min="0"
                            value={item.itemDiscount ?? 0}
                            onChange={(e) =>
                              handleItemChange(
                                item.id,
                                "itemDiscount",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            onFocus={() =>
                              setFocusedCell({
                                itemId: item.id,
                                field: "itemDiscount",
                              })
                            }
                            onKeyDown={(e) =>
                              handleTableCellKeyDown(
                                e,
                                item.id,
                                "itemDiscount",
                                idx,
                              )
                            }
                            className="w-full text-center border border-gray-200 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </td>

                        {/* Discount Amount */}
                        <td className="px-2 py-2 text-center w-20">
                          <input
                            ref={(el) => {
                              if (el)
                                itemInputRefs.current[
                                  `${item.id}_itemDiscountAmount`
                                ] = el;
                            }}
                            type="number"
                            inputMode="decimal"
                            step={getInputStep()}
                            min="0"
                            value={item.itemDiscountAmount ?? 0}
                            onChange={(e) =>
                              handleItemChange(
                                item.id,
                                "itemDiscountAmount",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            onFocus={() =>
                              setFocusedCell({
                                itemId: item.id,
                                field: "itemDiscountAmount",
                              })
                            }
                            onKeyDown={(e) =>
                              handleTableCellKeyDown(
                                e,
                                item.id,
                                "itemDiscountAmount",
                                idx,
                              )
                            }
                            className="w-full text-center border border-gray-200 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </td>

                        {/* Tax */}
                        <td className="px-1 py-2 text-center w-12 font-medium text-gray-800">
                          {item.tax || 0}%
                        </td>

                        {/* Total */}
                        <td className="px-2 py-2 text-right font-bold text-gray-900 w-28">
                          {formatNumber(total)}
                        </td>

                        {/* Remove Button */}
                        <td className="px-2 py-2 text-center w-20">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedItemSerial(item.id);
                                setShowSerialModal(true);
                              }}
                              className="text-blue-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-md transition"
                              title="Manage serial numbers"
                            >
                              <Hash size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedItemNote(item.id);
                                setShowItemNoteModal(true);
                              }}
                              className="text-blue-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-md transition"
                              title="Add item note"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition"
                              title="Remove item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      

      {/* FOOTER - Order Summary & Actions - Fixed at bottom */}
      <div className="flex-shrink-0 bg-white border-t shadow-lg z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-6">
            {/* Notes */}
            <div className="flex-1 max-w-md">
              <textarea
                rows="2"
                name="notes"
                value={invoiceData.notes ?? ""}
                onChange={handleInputChange}
                placeholder="Notes / Remarks..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            {/* Summary Row */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4 text-xs">
                <div className="text-center">
                  <p className="text-gray-400 text-xs">Items</p>
                  <p className="font-bold text-gray-800">
                    {invoiceData.items.length}
                  </p>
                </div>
                <div className="h-8 w-px bg-gray-200"></div>
                <div className="text-center">
                  <p className="text-gray-400 text-xs">Subtotal</p>
                  <p className="font-semibold text-gray-700">
                    {config.currency || 'AED'} {totals.subtotal}
                  </p>
                </div>
                <div className="h-8 w-px bg-gray-200"></div>
                {allowDiscounts && (
                  <>
                    <div className="text-center">
                      <p className="text-gray-400 text-xs">Discount</p>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          inputMode="decimal"
                          step={getInputStep()}
                          min="0"
                          name="discount"
                          value={invoiceData.discount ?? 0}
                          onChange={handleInputChange}
                          className="w-12 text-center border border-gray-200 rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                        <span className="text-gray-400 text-xs">%</span>
                      </div>
                    </div>
                    <div className="h-8 w-px bg-gray-200"></div>
                    <div className="text-center">
                      <p className="text-gray-400 text-xs">Disc Amt</p>
                      <input
                        type="number"
                        inputMode="decimal"
                        step={getInputStep()}
                        min="0"
                        name="discountAmount"
                        value={invoiceData.discountAmount ?? 0}
                        onChange={handleInputChange}
                        className="w-12 text-center border border-gray-200 rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </>
                )}
                <div className="h-8 w-px bg-gray-200"></div>
                <div className="text-center group relative">
                  <p className="text-gray-400 text-xs">{totals.taxLabel}</p>
                  <p className="font-semibold text-gray-700">
                    {config.currency || 'AED'} {totals.tax}
                  </p>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
                    {totals.taxLabel} @ {totals.taxRate}%
                    {totals.taxBreakdown && (
                      <>
                        <br />
                        CGST @ {formatNumber(totals.taxBreakdown.cgst)}%
                        <br />
                        SGST @ {formatNumber(totals.taxBreakdown.sgst)}%
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Grand Total */}
              <div className="bg-gray-900 text-white px-4 py-2 rounded-lg">
                <p className="text-gray-400 text-[10px]">Grand Total</p>
                <p className="text-base font-bold text-green-400">
                  {config.currency || 'AED'} {totals.total}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2.5 rounded text-xs font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSaveInvoice}
                  disabled={loading}
                >
                  <Save size={14} /> {loading ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={handleSaveAndPrint}
                  disabled={loading}
                  className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-2.5 rounded text-xs font-medium hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer size={14} />
                  {loading ? "Saving..." : "Save & Print"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HISTORY MODAL */}
      {showHistoryModal && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50 flex-shrink-0">
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Clock size={16} className="text-blue-600" />
                Invoice History
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
                    placeholder="Customer or Invoice #"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredHistoryInvoices.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {invoices.length === 0
                    ? "No invoices found"
                    : historySearch.trim()
                      ? `No invoices found for "${historySearch}" on ${historyDateFilter}`
                      : `No invoices found for ${historyDateFilter}`}
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
                          Invoice No
                        </th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-800">
                          Invoice Date
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-800">
                          Customer
                        </th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-800">
                          Item
                        </th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-800">
                          Qty
                        </th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-800">
                          Total
                        </th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-800">
                          VAT
                        </th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-800">
                          Net Total
                        </th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-800 w-48">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistoryInvoices.map((invoice, idx) => (
                        <tr
                          key={invoice._id}
                          className="border-b border-gray-200 hover:bg-blue-50 transition"
                        >
                          <td className="px-3 py-2 text-center text-gray-700 font-semibold">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2 font-semibold text-blue-600">
                            #{invoice.invoiceNumber}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-600">
                            {new Date(invoice.date).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            {invoice.customerName}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-700">
                            {invoice.totalItems || invoice.items?.length || 0}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-gray-800">
                            {invoice.totalItemQty ||
                              invoice.items?.reduce(
                                (sum, item) => sum + (item.quantity || 0),
                                0,
                              ) ||
                              0}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700">
                            {formatNumber(invoice.subtotal || 0)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700">
                            {formatNumber(invoice.vatAmount || 0)}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-green-600">
                            {formatNumber(
                              invoice.totalIncludeVat ||
                                invoice.totalAmount ||
                                0,
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  window.print();
                                }}
                                title="Print"
                                className="flex items-center justify-center gap-1 px-1.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-xs font-medium transition"
                              >
                                <Printer size={11} />
                                Print
                              </button>
                              <button
                                onClick={() => {
                                  handleEditInvoice(invoice);
                                  setShowHistoryModal(false);
                                }}
                                title="Update"
                                className="flex items-center justify-center gap-1 px-1.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded text-xs font-medium transition"
                              >
                                <Edit2 size={11} />
                                Update
                              </button>
                              <button
                                onClick={() => {
                                  setInvoiceToView(invoice);
                                  setShowPrintingModal(true);
                                  setShowHistoryModal(false);
                                }}
                                title="Print/Download PDF"
                                className="flex items-center justify-center gap-1 px-1.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded text-xs font-medium transition"
                              >
                                <Printer size={11} />
                                Print
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



      {/* INVOICE PRINTING & PDF MODAL - Terminal Template Mapped */}
      {showPrintingModal && invoiceToView && (
        <InvoicePrintingComponent
          invoiceId={invoiceToView._id}
          onClose={() => {
            setShowPrintingModal(false);
            setInvoiceToView(null);
            setSavedInvoiceId(null);
          }}
        />
      )}

      {/* PRODUCT LOOKUP MODAL */}
      <ProductLookupModal
        show={showProductLookup}
        onClose={() => setShowProductLookup(false)}
        itemSearch={itemSearch}
        onSearchChange={setItemSearch}
        filteredProducts={filteredProducts}
        onAddProduct={addItemFromSearch}
        config={config}
        formatNumber={formatNumber}
      />

      {/* ITEM NOTE MODAL */}
      {showItemNoteModal && selectedItemNote && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Edit2 size={18} className="text-blue-600" />
                Item Note
              </h2>
              <button
                onClick={() => {
                  setShowItemNoteModal(false);
                  setSelectedItemNote(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 flex-1">
              <textarea
                value={itemNotes[selectedItemNote] || ""}
                onChange={(e) =>
                  setItemNotes((prev) => ({
                    ...prev,
                    [selectedItemNote]: e.target.value,
                  }))
                }
                placeholder="Enter note for this item..."
                className="w-full h-32 p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>
            <div className="px-6 py-3 border-t bg-gray-50 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowItemNoteModal(false);
                  setSelectedItemNote(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowItemNoteModal(false);
                  setSelectedItemNote(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SERIAL NUMBER MODAL */}
      {showSerialModal && selectedItemSerial && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Hash size={18} className="text-blue-600" />
                Manage Serial Numbers
              </h2>
              <button
                onClick={() => {
                  setShowSerialModal(false);
                  setSelectedItemSerial(null);
                  setNewSerialInput("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 flex-1 overflow-y-auto max-h-64">
              {/* Current Serial Numbers List */}
              {serialNumbers[selectedItemSerial]?.length > 0 ? (
                <div className="space-y-2">
                  {serialNumbers[selectedItemSerial].map((serial, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {serial}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSerialNumbers((prev) => ({
                            ...prev,
                            [selectedItemSerial]: prev[
                              selectedItemSerial
                            ].filter((_, i) => i !== idx),
                          }));
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-100 p-1 rounded transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No serial numbers added yet
                </p>
              )}
            </div>

            {/* Add New Serial Number */}
            <div className="px-6 py-4 border-t bg-gray-50">
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newSerialInput}
                  onChange={(e) => setNewSerialInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && newSerialInput.trim()) {
                      setSerialNumbers((prev) => ({
                        ...prev,
                        [selectedItemSerial]: [
                          ...(prev[selectedItemSerial] || []),
                          newSerialInput.trim(),
                        ],
                      }));
                      setNewSerialInput("");
                    }
                  }}
                  placeholder="Enter serial number..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newSerialInput.trim()) {
                      setSerialNumbers((prev) => ({
                        ...prev,
                        [selectedItemSerial]: [
                          ...(prev[selectedItemSerial] || []),
                          newSerialInput.trim(),
                        ],
                      }));
                      setNewSerialInput("");
                    }
                  }}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t bg-gray-50 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowSerialModal(false);
                  setSelectedItemSerial(null);
                  setNewSerialInput("");
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowSerialModal(false);
                  setSelectedItemSerial(null);
                  setNewSerialInput("");
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

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
                
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* Reusable Components */

const Input = ({ label, icon: Icon, ...props }) => (
  <div className="relative">
    {Icon && (
      <Icon
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
    )}
    <input
      {...props}
      className={`w-full ${Icon ? "pl-9" : "pl-3"} pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none`}
    />
  </div>
);

export default SalesInvoice;


