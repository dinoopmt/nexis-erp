import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
  useMemo,
} from "react";
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
  Clock,
  Package,
  Copy,
  Eye,
  Edit2,
  Hash,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import axios from "axios";
import { API_URL } from "../../config/config";
import { useProductSearch } from "../../hooks/useProductSearch";
import { useDecimalFormat } from "../../hooks/useDecimalFormat";
import { CompanyContext } from "../../context/CompanyContext";
import { showToast } from "../shared/AnimatedCenteredToast";
import { clearAllCache } from "../../utils/searchCache";
import GlobalDocumentPrintingComponent from "../shared/printing/GlobalDocumentPrintingComponent";
import SalesInvoiceUnitVariantSelector from "./modals/SalesInvoiceUnitVariantSelector";

const SalesOrder = () => {
  const { company } = useContext(CompanyContext);
  const { formatNumber } = useDecimalFormat(); // Country-based decimal formatting

  const statusColors = {
    Draft: "bg-gray-200 text-gray-800",
    Confirmed: "bg-blue-200 text-blue-800",
    Processing: "bg-yellow-200 text-yellow-800",
    Shipped: "bg-purple-200 text-purple-800",
    Delivered: "bg-green-200 text-green-800",
    Cancelled: "bg-red-200 text-red-800",
  };

  const [products, setProducts] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [scannerInput, setScannerInput] = useState("");
  const [scannerActive, setScannerActive] = useState(true);
  const [lastScanTime, setLastScanTime] = useState(0);
  const [itemSearch, setItemSearch] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);
  const [productPage, setProductPage] = useState(1);
  const searchInputRef = useRef(null);
  const searchDropdownRef = useRef(null);

  // ✅ Product Search Hook - MeiliSearch with fallback (same as SalesInvoice)
  const {
    results: searchResults,
    loading: searchLoading,
    metadata: searchMetadata,
  } = useProductSearch(
    itemSearch,
    300, // 300ms debounce (match SalesInvoice)
    productPage,
    20, // 20 items per page
    true, // use fallback
  );

  // ✅ Update products list when search results change
  useEffect(() => {
    if (!searchResults || searchResults.length === 0) return;

    console.log("✅ Search results received:", {
      count: searchResults.length,
      searchPath: searchMetadata?.searchPath,
      searchSource: searchMetadata?.searchSource,
      sample: searchResults[0] ? { 
        name: searchResults[0].name, 
        imagePath: searchResults[0].imagePath, 
        image: searchResults[0].image ? 'present' : 'null',
        _id: searchResults[0]._id 
      } : 'N/A'
    });

    // Merge stock data
    const productsWithStock = searchResults.map((product) => ({
      ...product,
      stock:
        product.currentStock?.availableQuantity ??
        product.currentStock?.totalQuantity ??
        0,
    }));

    if (productPage === 1) {
      setProducts(productsWithStock || []);
    } else {
      setProducts((prev) => [...prev, ...productsWithStock]);
    }
  }, [searchResults, productPage]);

  // ✅ Load more products function
  const loadMoreProducts = () => {
    if (!searchMetadata?.hasNextPage) return;
    setProductPage((prev) => prev + 1);
  };
  const customerDropdownRef = useRef(null);
  const customerSearchInputRef = useRef(null);
  const barcodeBuffer = useRef("");
  const lastKeyTime = useRef(0);
  const scannerInputRef = useRef(null);

  const itemInputRefs = useRef({});
  const [focusedCell, setFocusedCell] = useState(null);

  const [orderData, setOrderData] = useState({
    orderNo: "", // ✅ EMPTY - Generated on save (like GRN)
    orderDate: new Date().toISOString().split("T")[0],
    deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    paymentType: "",
    paymentTerms: "",
    customerType: "EXISTING", // "EXISTING" | "QUICK"
    customerId: null, // Only for EXISTING customers
    partyName: "",
    partyPhone: "",
    partyTRN: "",
    partyAddress: "",
    partyContact: "",
    discount: 0,
    discountAmount: 0,
    items: [],
    notes: "",
    terms: "",
    status: "Draft",
    vatAmount: 0, // ✅ Add VAT amount to state
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [editId, setEditId] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showProductLookup, setShowProductLookup] = useState(false);
  const [viewedOrder, setViewedOrder] = useState(null);
  const [showPrintingModal, setShowPrintingModal] = useState(false);
  const [savedOrderId, setSavedOrderId] = useState(null); // For Save & Print flow
  const [historyDateFilter, setHistoryDateFilter] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [historySearch, setHistorySearch] = useState("");
  const [filteredHistoryStatus, setFilteredHistoryStatus] = useState("Draft");
  const [historyOrderIdPreview, setHistoryOrderIdPreview] = useState(null); // For history preview
  const [financialYear, setFinancialYear] = useState("2025-26");

  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null);
  const [hoveredCustomer, setHoveredCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerDropdownPos, setCustomerDropdownPos] = useState({
    top: 0,
    left: 0,
  });
  const [customerType, setCustomerType] = useState("EXISTING"); // "EXISTING" | "QUICK"
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
  const [quickCustomerData, setQuickCustomerData] = useState({
    name: "",
    phone: "",
    address: "",
  });

  const [itemNotes, setItemNotes] = useState({});
  const [showItemNoteModal, setShowItemNoteModal] = useState(false);
  const [selectedItemNote, setSelectedItemNote] = useState(null);

  // ✅ Unit variant selection states (same as SalesInvoice)
  const [showUnitSelector, setShowUnitSelector] = useState(false);
  const [productForUnitSelection, setProductForUnitSelection] = useState(null);

  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertToType, setConvertToType] = useState("SalesOrder");

  // ✅ CLEAR SEARCH CACHE ON MOUNT to force fresh data from backend
  useEffect(() => {
    console.log('🧹 SalesOrder component mounted - clearing search cache');
    clearAllCache();
  }, []);

  // ✅ PERFORMANCE: Memoize product lookup Map for O(1) search in dropdown
  const existingProductsMap = useMemo(() => {
    const map = new Map();
    orderData.items.forEach((item) => {
      map.set(item.productId, item);
    });
    return map;
  }, [orderData.items]);

  // ✅ PERFORMANCE: Memoize products collection as Map for O(1) lookups during edit
  const productsMap = useMemo(() => {
    const map = new Map();
    products.forEach((product) => {
      map.set(product._id, product);
    });
    return map;
  }, [products]);

  // ✅ REMOVED: No pre-generation on page load (like GRN)
  // Number is generated ONLY when saving, preventing gaps from cancellations

  // Calculate customer dropdown position
  useEffect(() => {
    if (!showCustomerDropdown || !customerSearchInputRef.current) return;

    const calculatePosition = () => {
      const inputRect = customerSearchInputRef.current.getBoundingClientRect();
      setCustomerDropdownPos({
        top: inputRect.bottom + 8,
        left: inputRect.left,
      });
    };

    // Calculate immediately
    calculatePosition();

    // Recalculate only on window resize, NOT on search changes
    window.addEventListener("resize", calculatePosition);
    return () => window.removeEventListener("resize", calculatePosition);
  }, [showCustomerDropdown]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Don't close if clicking on the dropdown itself
      const dropdownElement = document.querySelector(
        "[data-customer-dropdown]",
      );
      const inputElement = customerSearchInputRef.current;

      if (dropdownElement && dropdownElement.contains(e.target)) {
        return; // Allow clicks within dropdown
      }

      if (inputElement && inputElement.contains(e.target)) {
        return; // Allow clicks on input
      }

      setShowCustomerDropdown(false);
    };

    if (showCustomerDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showCustomerDropdown]);

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const companyCountry = company?.country || "AE";
        const response = await axios.get(
          `${API_URL}/customers/getcustomers?limit=100&country=${encodeURIComponent(companyCountry)}`,
        );
        setCustomers(response.data.customers || response.data || []);
      } catch (err) {
        console.error("Error fetching customers:", err);
        setCustomers([]);
        if (err.response?.status === 500) {
          showToast("error", "Server error loading customers. Please refresh.");
        }
      }
    };
    fetchCustomers();
  }, [company]);

  // Fetch orders
  useEffect(() => {
    const fetchorders = async () => {
      try {
        const response = await axios.get(`${API_URL}/sales-orders/getSalesOrders`);
        setOrders(response.data || []);
      } catch (err) {
        console.error("Error fetching orders:", err);
        showToast("error", "Failed to load orders");
      }
    };
    fetchorders();
  }, []);

  // Barcode Scanner Handler
  const handleScannerInput = useCallback(
    (e) => {
      if (!scannerActive) return;

      const now = Date.now();
      if (now - lastKeyTime.current > 50) {
        barcodeBuffer.current = "";
      }
      lastKeyTime.current = now;

      barcodeBuffer.current += e.key;
      setScannerInput(barcodeBuffer.current);

      if (e.key === "Enter" && barcodeBuffer.current) {
        handleBarcodeScanned();
        barcodeBuffer.current = "";
      }
    },
    [scannerActive, orderData.items],
  );

  useEffect(() => {
    if (scannerActive) {
      window.addEventListener("keydown", handleScannerInput);
      return () => window.removeEventListener("keydown", handleScannerInput);
    }
  }, [scannerActive, handleScannerInput]);

  const handleBarcodeScanned = () => {
    const product = products.find((p) => p.itemcode === scannerInput);
    if (product) {
      addItemFromSearch(product);
      setScannerInput("");
    } else {
      showToast("error", "Product not found: " + scannerInput);
    }
  };

  // Filter products for search (like SalesInvoice) - client-side filtering
  const filteredProducts = products
    .filter((p) => {
      if (!itemSearch.trim()) return false;
      const search = itemSearch.toLowerCase();
      return (
        p.name?.toLowerCase().includes(search) ||
        p.itemcode?.toLowerCase().includes(search) ||
        p.barcode?.toLowerCase().includes(search)
      );
    })
    .slice(0, 10); // Limit to 10 results like SalesInvoice

  // Keyboard navigation for search dropdown (like SalesInvoice)
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

  // Add item from search selection (takes product parameter like SalesInvoice)
  // ✅ Add item to order with unit information (called after unit selection or directly if no variants)
  const addItemToOrderWithUnit = useCallback((product, selectedUnit = null) => {
    const existingItem = orderData.items.find(
      (item) => item.productId === product._id,
    );

    if (existingItem) {
      // Increment quantity if item already exists
      const newItems = orderData.items.map((item) => {
        if (item.productId === product._id) {
          const newQty = item.quantity + 1;
          const newLineAmount = newQty * item.unitPrice;
          const newVatAmount = (newLineAmount * item.taxPercent) / 100;
          return {
            ...item,
            quantity: newQty,
            lineAmount: newLineAmount,
            amountAfterDiscount: newLineAmount - item.discountAmount,
            vatAmount: newVatAmount,
          };
        }
        return item;
      });
      setOrderData((prev) => ({ ...prev, items: newItems }));
      calculateTotals(newItems);
    } else {
      // Create new item with selected unit info or product defaults
      const imageToUse = product.imagePath || null;
      const salesprice = selectedUnit?.price || product.salesprice || product.price || 0;
      const unitCost = selectedUnit?.cost || product.cost || 0;
      const taxPercent = product.taxPercent || 0;
      const vatAmount = (salesprice * taxPercent) / 100;
      const unit = selectedUnit?.unit || product.unitType?.unitSymbol || product.unitSymbol || 'Pcs';
      const barcode = selectedUnit?.barcode || product.barcode || '';
      
      const newItem = {
        productId: product._id,
        itemName: product.itemname || product.name,
        itemcode: product.itemcode,
        quantity: 1,
        unitPrice: salesprice,
        lineAmount: salesprice,
        unitCost: unitCost,
        lineCost: unitCost,
        discountPercentage: 0,
        discountAmount: 0,
        amountAfterDiscount: salesprice,
        taxPercent: taxPercent,
        taxType: product.taxType || "",
        vatPercentage: taxPercent,
        vatAmount: vatAmount,
        total: salesprice + vatAmount,
        note: "",
        image: imageToUse,
        unit: unit,
        barcode: barcode,
      };
      
      const newItems = [...orderData.items, newItem];
      setOrderData((prev) => ({ ...prev, items: newItems }));
      calculateTotals(newItems);
    }

    setItemSearch("");
    setShowSearchDropdown(false);
    setLastScanTime(Date.now());
    setSelectedSearchIndex(0);
  }, [orderData.items]);

  // ✅ Add item from search - checks for unit variants before adding
  const addItemFromSearch = (product) => {
    // Check if product has packing units (multiple unit variants like pack/dozen/piece)
    if (product?.packingUnits && product.packingUnits.length > 0) {
      // Show unit selector modal
      setProductForUnitSelection(product);
      setShowUnitSelector(true);
    } else {
      // Add directly with base unit
      addItemToOrderWithUnit(product);
    }
  };

  // ✅ Handle unit variant selection from modal
  const handleUnitVariantSelected = useCallback((selectedUnit) => {
    if (productForUnitSelection) {
      addItemToOrderWithUnit(productForUnitSelection, selectedUnit);
      setShowUnitSelector(false);
      setProductForUnitSelection(null);
    }
  }, [productForUnitSelection, addItemToOrderWithUnit]);

  // ✅ Reset form (like GRN - clears everything including orderNo)
  const resetForm = () => {
    try {
      setEditId(null);
      setOrderData({
        orderNo: "", // ✅ Reset to empty - will be generated on next save
        orderDate: new Date().toISOString().split("T")[0],
        deliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        partyName: "",
        partyPhone: "",
        partyTRN: "",
        partyAddress: "",
        partyContact: "",
        discount: 0,
        discountAmount: 0,
        items: [],
        notes: "",
        terms: "",
        status: "Draft",
        vatAmount: 0,
      });
      setSelectedCustomerId(null);
      setCustomerSearch("");
      setShowCustomerDropdown(false);
      showToast("success", "Form reset");
    } catch (err) {
      console.error("Error resetting form:", err);
      showToast("error", "Error resetting form");
    }
  };

  const handleCustomerSelect = (customer) => {
    console.log("🎯 Customer selected:", customer);
    setSelectedCustomerId(customer._id);
    setSelectedCustomerDetails(customer);
    setOrderData((prev) => {
      const updated = {
        ...prev,
        customerType: "EXISTING",
        customerId: customer._id,
        partyName: customer.name || "",
        partyPhone: customer.phone || "",
        partyTRN: customer.customerTRN || "",
        partyAddress: customer.address || "",
        partyContact: customer.contactPerson || "",
      };
      console.log("✅ Updated SalesOrder data:", updated);
      return updated;
    });
    // Close dropdown and clear search
    setShowCustomerDropdown(false);
    setCustomerSearch("");
  };

  const filteredCustomers = customerSearch
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()),
      )
    : customers;

  const addItem = () => {
    const newItem = {
      productId: "",
      itemName: "",
      itemcode: "",
      quantity: 1,
      unitPrice: 0,
      lineAmount: 0,
      unitCost: 0,
      lineCost: 0,
      discountPercentage: 0,
      discountAmount: 0,
      amountAfterDiscount: 0,
      taxPercent: 0,
      taxType: "",
      vatPercentage: 0,
      vatAmount: 0,
      total: 0,
      note: "",
    };
    const newItems = [...orderData.items, newItem];
    setOrderData((prev) => ({ ...prev, items: newItems }));
  };

  const removeItem = (index) => {
    const newItems = orderData.items.filter((_, i) => i !== index);
    setOrderData((prev) => ({ ...prev, items: newItems }));
    calculateTotals(newItems);
    
    // Clear note for deleted item and reindex remaining notes
    setItemNotes((prev) => {
      const newNotes = {};
      let newIndex = 0;
      Object.entries(prev).forEach(([key, value]) => {
        const keyNum = parseInt(key);
        if (keyNum < index) {
          newNotes[newIndex] = value;
          newIndex++;
        } else if (keyNum > index) {
          newNotes[newIndex] = value;
          newIndex++;
        }
        // Skip the deleted item's note (keyNum === index)
      });
      return newNotes;
    });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...orderData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "quantity" || field === "unitPrice") {
      newItems[index].lineAmount =
        newItems[index].quantity * newItems[index].unitPrice;
      newItems[index].lineCost =
        newItems[index].quantity * newItems[index].unitCost;
      newItems[index].amountAfterDiscount =
        newItems[index].lineAmount - newItems[index].discountAmount;
      // ✅ Recalculate VAT based on product tax percentage
      newItems[index].vatAmount =
        (newItems[index].amountAfterDiscount * newItems[index].taxPercent) / 100;
    }

    if (field === "discountPercentage") {
      newItems[index].discountAmount =
        (newItems[index].lineAmount * value) / 100;
      newItems[index].amountAfterDiscount =
        newItems[index].lineAmount - newItems[index].discountAmount;
      // ✅ Recalculate VAT based on product tax percentage
      newItems[index].vatAmount =
        (newItems[index].amountAfterDiscount * newItems[index].taxPercent) / 100;
    }

    if (field === "discountAmount") {
      newItems[index].discountPercentage =
        (value / newItems[index].lineAmount) * 100;
      newItems[index].amountAfterDiscount = newItems[index].lineAmount - value;
      // ✅ Recalculate VAT based on product tax percentage
      newItems[index].vatAmount =
        (newItems[index].amountAfterDiscount * newItems[index].taxPercent) / 100;
    }

    if (field === "productId") {
      const product = products.find((p) => p._id === value);
      if (product) {
        newItems[index].itemName = product.itemname;
        newItems[index].itemcode = product.itemcode;
        newItems[index].unitPrice = product.salesprice || 0;
        newItems[index].unitCost = product.cost || 0;
        newItems[index].lineAmount =
          newItems[index].quantity * (product.salesprice || 0);
        newItems[index].lineCost =
          newItems[index].quantity * (product.cost || 0);
        // ✅ Extract tax percentage from product
        newItems[index].taxPercent = product.taxPercent || 0;
        newItems[index].taxType = product.taxType || "";
        // ✅ Initial VAT calculation for new product
        newItems[index].vatAmount =
          (newItems[index].lineAmount * (product.taxPercent || 0)) / 100;
      }
    }

    setOrderData((prev) => ({ ...prev, items: newItems }));
    if (
      field === "quantity" ||
      field === "unitPrice" ||
      field === "discountPercentage" ||
      field === "discountAmount"
    ) {
      calculateTotals(newItems);
    }
  };

  const calculateTotals = (items) => {
    let subtotal = 0;
    let totalCost = 0;
    let totalItemQty = 0;
    let totalVat = 0;

    items.forEach((item) => {
      subtotal += item.lineAmount || 0;
      totalCost += item.lineCost || 0;
      totalItemQty += item.quantity || 0;
      totalVat += item.vatAmount || 0;
    });

    const discountAmount = orderData.discountAmount;
    const totalAfterDiscount = subtotal - discountAmount;
    // ✅ Total includes VAT calculated from each product's tax percentage
    const totalIncludeVat = totalAfterDiscount + totalVat;

    // ✅ REMOVED: Profit calculations (grossProfit, netProfit, etc.) - not required for SalesOrder

    setOrderData((prev) => ({
      ...prev,
      subtotal,
      totalAfterDiscount,
      totalIncludeVat,
      totalItemQty,
      totalItems: items.length,
      vatAmount: totalVat, // ✅ Set the header-level VAT amount
    }));
  };

  const handleSaveSalesOrder = async (mode = "save") => {
    if (!orderData.partyName || orderData.items.length === 0) {
      showToast("error", "Please enter customer and add items");
      return;
    }

    try {
      setLoading(true);

      console.log("📝 ItemNotes before save:", itemNotes);
      console.log("📝 SalesOrder items:", orderData.items.map((item, idx) => ({
        itemName: item.itemName,
        note_from_state: itemNotes[idx],
        note_from_item: item.note
      })));
      let SalesOrderNumber = orderData.orderNo;
      if (!SalesOrderNumber && !editId) {
        try {
          const nextNumberResponse = await axios.get(
            `${API_URL}/sales-orders/nextSalesOrderNumber?financialYear=${financialYear}`,
          );
          SalesOrderNumber = nextNumberResponse.data.sequence || nextNumberResponse.data.orderNumber;
          console.log("✅ Generated SalesOrder number:", SalesOrderNumber);
        } catch (err) {
          console.error("Error generating SalesOrder number:", err);
          showToast("error", "Failed to generate SalesOrder number");
          return;
        }
      }
      
      // ✅ Calculate average tax percentage from items
      let avgTaxPercent = 0;
      if (orderData.items.length > 0) {
        const totalTax = orderData.items.reduce((sum, item) => sum + (item.taxPercent || 0), 0);
        avgTaxPercent = totalTax / orderData.items.length;
      }
      
      // ✅ Set status based on mode
      let status = orderData.status;
      if (mode === "draft") {
        status = "Draft";
      }
      
      const payload = {
        orderNumber: SalesOrderNumber, // ✅ Use generated number (matches backend model)
        financialYear,
        date: new Date(orderData.orderDate), // ✅ Backend expects 'date' not 'orderDate'
        deliveryDate: new Date(orderData.deliveryDate),
        paymentType: orderData.paymentType,
        paymentTerms: orderData.paymentTerms,
        customerId: selectedCustomerId,
        customerName: orderData.partyName,
        customerPhone: orderData.partyPhone,
        customerTRN: orderData.partyTRN,
        customerAddress: orderData.partyAddress,
        customerContact: orderData.partyContact,
        subtotal: orderData.subtotal,
        discountPercentage: orderData.discount,
        discountAmount: orderData.discountAmount,
        totalAfterDiscount: orderData.totalAfterDiscount,
        vatPercentage: avgTaxPercent,
        vatAmount: orderData.vatAmount || 0,
        totalIncludeVat: orderData.totalIncludeVat,
        totalItems: orderData.totalItems,
        totalItemQty: orderData.totalItemQty,
        notes: orderData.notes,
        terms: orderData.terms,
        status: status,
        items: orderData.items.map((item, idx) => ({
          productId: item.productId,
          itemName: item.itemName,
          itemcode: item.itemcode,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineAmount: item.lineAmount,
          unitCost: item.unitCost,
          lineCost: item.lineCost,
          discountPercentage: item.discountPercentage,
          discountAmount: item.discountAmount,
          amountAfterDiscount: item.amountAfterDiscount,
          vatPercentage: item.taxPercent || 0,
          vatAmount: item.vatAmount || 0,
          total: (item.amountAfterDiscount || 0) + (item.vatAmount || 0),
          grossProfit: item.grossProfit || 0,
          grossProfitMargin: item.grossProfitMargin || 0,
          netProfit: item.netProfit || 0,
          netProfitMargin: item.netProfitMargin || 0,
          serialNumbers: item.serialNumbers || [],
          note: itemNotes[idx] || item.note || "",
          unit: item.unit || 'Pcs', // ✅ Include unit of measure
          // ✅ REMOVED: image (not in backend model)
        })),
      };

      const url = editId
        ? `${API_URL}/sales-orders/updateSalesOrder/${editId}`
        : `${API_URL}/sales-orders/createSalesOrder`;

      const response = await axios[editId ? "put" : "post"](url, payload);

      showToast(
        "success",
        editId
          ? "SalesOrder updated successfully"
          : "SalesOrder created successfully",
      );

      // ✅ Handle print mode - Open printing modal instead of browser print
      if (mode === "print" && response.data._id) {
        setSavedOrderId(response.data._id);
        setViewedOrder(response.data);
        setShowPrintingModal(true);
        console.log('✅ SalesOrder saved and print modal opened:', response.data._id);
      }

      // ✅ Update orders list correctly for both create and update
      if (editId) {
        // UPDATE: Replace the existing SalesOrder in the array
        setOrders(
          orders.map((q) => (q._id === editId ? response.data : q))
        );
      } else {
        // CREATE: Add new SalesOrder to the array
        setOrders([...orders, response.data]);
      }

      // ✅ ALWAYS reset form after save (edit or create) - ready for new SalesOrder
      setOrderData({
        orderNo: "", // ✅ Empty - will be generated on next save - like GRN
        orderDate: new Date().toISOString().split("T")[0],
        deliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        partyName: "",
        partyPhone: "",
        partyTRN: "",
        partyAddress: "",
        partyContact: "",
        discount: 0,
        discountAmount: 0,
        items: [],
        notes: "",
        terms: "",
        status: "Draft",
        vatAmount: 0,
      });
      setSelectedCustomerId(null);

      setEditId(null);
      setItemNotes({}); // ✅ Clear item notes after save
    } catch (err) {
      console.error("💥 SalesOrder save error:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error message:", err.message);
      
      // ✅ Check if order was actually created despite error
      if (err.response?.status === 201 || err.response?.status === 200) {
        console.log("⚠️  Order may have been created despite error - checking database");
        showToast("success", "SalesOrder created successfully (with minor warning)");
      } else {
        showToast(
          "error", 
          err.response?.data?.error || err.message || "Error saving SalesOrder"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch all orders from database for history modal
  const fetchorders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/sales-orders/getSalesOrders`,
      );
      setOrders(res.data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch orders");
      console.error("Error fetching orders:", err);
    }
    setLoading(false);
  };

  // ✅ Filter orders by date, search, and status
  const filteredHistoryorders = orders.filter((SalesOrder) => {
    const SalesOrderDate = new Date(SalesOrder.date).toISOString().split("T")[0];
    const dateMatch = SalesOrderDate === historyDateFilter;

    // If no search, only filter by date and status
    if (!historySearch.trim()) {
      if (filteredHistoryStatus === "All") return dateMatch;
      return dateMatch && SalesOrder.status === filteredHistoryStatus;
    }

    // Filter by customer name or SalesOrder number
    const searchLower = historySearch.toLowerCase();
    const customerNameMatch = SalesOrder.customerName
      ?.toLowerCase()
      .includes(searchLower);
    const SalesOrderNumberMatch = SalesOrder.SalesOrderNumber
      ?.toString()
      .includes(historySearch);

    const statusMatch = filteredHistoryStatus === "All" || SalesOrder.status === filteredHistoryStatus;
    return dateMatch && statusMatch && (customerNameMatch || SalesOrderNumberMatch);
  });

  const handleEditSalesOrder = (SalesOrder) => {
    setEditId(SalesOrder._id);
    
    // ✅ PERFORMANCE: Use O(1) map lookup instead of O(n) find()
    const enrichedItems = SalesOrder.items.map((item) => {
      const product = productsMap.get(item.productId);
      // ✅ Preserve stored image, fallback to product image if not stored
      const imageToUse = item.image || product?.imagePath || product?.image || (product?.images && product.images[0]) || null;
      return {
        ...item,
        image: imageToUse, // ✅ Add image for display/print
      };
    });
    
    setOrderData({
      orderNo: SalesOrder.orderNumber, // ✅ Backend field is 'orderNumber'
      orderDate: SalesOrder.date?.split("T")[0] ?? new Date().toISOString().split("T")[0], // ✅ Backend field is 'date'
      deliveryDate: SalesOrder.deliveryDate?.split("T")[0] ?? "", // ✅ Always ensure string value
      paymentType: SalesOrder.paymentType || "",
      paymentTerms: SalesOrder.paymentTerms || "",
      partyName: SalesOrder.customerName,
      partyPhone: SalesOrder.customerPhone || "",
      partyTRN: SalesOrder.customerTRN || "",
      partyAddress: SalesOrder.customerAddress || "",
      partyContact: SalesOrder.customerContact || "",
      discount: SalesOrder.discountPercentage,
      discountAmount: SalesOrder.discountAmount,
      items: enrichedItems, // ✅ Use enriched items with images
      notes: SalesOrder.notes || "",
      terms: SalesOrder.terms || "",
      status: SalesOrder.status,
      subtotal: SalesOrder.subtotal,
      totalAfterDiscount: SalesOrder.totalAfterDiscount,
      totalIncludeVat: SalesOrder.totalIncludeVat,
      totalItemQty: SalesOrder.totalItemQty,
      totalItems: SalesOrder.totalItems,
      vatAmount: SalesOrder.vatAmount || 0, // ✅ Include VAT amount
    });
    
    // ✅ Populate itemNotes state from existing item notes
    const notesMap = {};
    SalesOrder.items.forEach((item, idx) => {
      if (item.note) {
        notesMap[idx] = item.note;
      }
    });
    setItemNotes(notesMap);
    
    setSelectedCustomerId(SalesOrder.customerId);
    window.scrollTo(0, 0);
  };

  const handleDeleteSalesOrder = async (id) => {
    if (window.confirm("Are you sure you want to delete this SalesOrder?")) {
      try {
        await axios.delete(`${API_URL}/sales-orders/deleteSalesOrder/${id}`);
        setOrders(orders.filter((q) => q._id !== id));
        showToast("success", "SalesOrder deleted successfully");
      } catch (err) {
        showToast("error", "Error deleting SalesOrder");
      }
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(`${API_URL}/sales-orders/updateStatus/${id}`, {
        status: newStatus,
      });
      setOrders(
        orders.map((q) => (q._id === id ? { ...q, status: newStatus } : q)),
      );
      showToast("success", "Status updated successfully");
    } catch (err) {
      showToast("error", "Error updating status");
    }
  };

  // ✅ Handle history SalesOrder preview - open GlobalDocumentPrintingComponent
  const handleHistoryPreview = (SalesOrder) => {
    setViewedOrder({ _id: SalesOrder._id });
    setShowPrintingModal(true);
    // Keep history modal open - printing modal will layer on top
  };

  const handleTableCellKeyDown = (e, index, field) => {
    const itemCount = orderData.items.length;
    let nextRow = index;
    let nextField = field;

    if (e.key === "Tab") {
      e.preventDefault();
      const fields = [
        "productId",
        "quantity",
        "unitPrice",
        "discountPercentage",
      ];
      const currentFieldIndex = fields.indexOf(field);

      if (currentFieldIndex < fields.length - 1) {
        nextField = fields[currentFieldIndex + 1];
      } else {
        nextRow = Math.min(index + 1, itemCount - 1);
        nextField = fields[0];
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      nextRow = Math.min(index + 1, itemCount - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      nextRow = Math.max(index - 1, 0);
    } else if (e.key === "Escape") {
      e.target.blur();
      return;
    }

    const refKey = `item_${nextRow}_${nextField}`;
    itemInputRefs.current[refKey]?.focus();
  };

  const filteredorders = orders.filter((q) => {
    const matchesDate =
      !historyDateFilter || q.date.split("T")[0] === historyDateFilter;
    const matchesSearch =
      !historySearch ||
      q.orderNumber.includes(historySearch) ||
      q.customerName.toLowerCase().includes(historySearch.toLowerCase());
    const matchesStatus =
      filteredHistoryStatus === "All" || q.status === filteredHistoryStatus;

    return matchesDate && matchesSearch && matchesStatus;
  });

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-100 overflow-hidden">
      {/* HEADER - Fixed at top */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 shadow-lg z-10">
        <div className="flex justify-between gap-6 items-center">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold">SalesOrder</h1>
              <div className={`px-3 py-1.5 rounded-lg mt-2 inline-block ${ orderData.orderNo
                  ? "bg-white/20"
                  : "bg-blue-300/40"
              }`}>
                <p className={`font-bold text-xs ${
                  orderData.orderNo
                    ? "text-white"
                    : "text-blue-100 italic"
                }`}>
                  {orderData.orderNo || "Generated on Save"}
                </p>
              </div>
            </div>

            <div className="border-l border-white/30 pl-4">
              <label className="block text-xs font-medium text-white/80 mb-1">
                SalesOrder Date
              </label>
              <input
                type="date"
                value={orderData.orderDate}
                onChange={(e) =>
                  setOrderData((prev) => ({
                    ...prev,
                    orderDate: e.target.value,
                  }))
                }
                className="px-2 py-1 text-xs text-black border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50"
              />
            </div>

            {/* Customer Search */}
            <div
              className="border-l border-white/30 pl-4"
              ref={customerDropdownRef}
            >
              <label className="block text-xs font-medium text-white/80 mb-1">
                Party Details
              </label>
              <div
                className="flex items-center gap-2 relative"
                style={{ zIndex: 50 }}
              >
                <input
                  ref={customerSearchInputRef}
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="Search customer..."
                  className="px-2 py-1 text-xs text-black border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 w-80"
                />
                <button
                  type="button"
                  onClick={() => {
                    // Batch all state updates together to prevent re-render flickering
                    setOrderData((prev) => ({
                      ...prev,
                      partyName: "",
                      partyPhone: "",
                      partyAddress: "",
                      partyTRN: "",
                      partyContact: "",
                      customerType: "EXISTING",
                      customerId: null,
                    }));
                    setSelectedCustomerId(null);
                    setSelectedCustomerDetails(null);
                    // Keep search input empty and dropdown closed
                    setCustomerSearch("");
                    setShowCustomerDropdown(false);
                  }}
                  className={`px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded font-medium transition whitespace-nowrap ${
                    orderData.partyName ? 'visible' : 'invisible'
                  }`}
                  title="Change customer"
                >
                  ↻ Clear
                </button>
              </div>
            </div>

            
          </div>

          

          <div className="flex items-center gap-2">

            
            <button
              onClick={() => {
                setShowHistoryModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-black/10 hover:bg-white/20 border border-white-400/50 rounded-lg text-white font-medium text-xs transition"
            >
              <Clock size={16} />
              History
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await axios.get(
                    `${API_URL}/products/getproducts?limit=50000`,
                  ); // ✅ Fetch up to 50k products
                  const productsData = res.data.products || res.data;
                  console.log("✅ Products fetched for lookup:", { 
                    count: productsData.length,
                    sample: productsData[0] ? { name: productsData[0].name, imagePath: productsData[0].imagePath, image: productsData[0].image ? 'present' : 'null' } : 'N/A'
                  });
                  setProducts(productsData);
                  setItemSearch("");
                } catch (err) {
                  console.error("Error fetching products:", err);
                }
                setShowProductLookup(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-black/10 hover:bg-white/20 border border-white-400/50 rounded-lg text-white font-medium text-xs transition"
            >
              <Package size={16} />
              Lookup Product
            </button>
          </div>
        </div>
      </div>

      {/* Customer Dropdown - Root Level */}
      {showCustomerDropdown && (
        <div
          data-customer-dropdown
          className="fixed bg-white border border-blue-300 rounded shadow-lg max-h-72 overflow-y-auto w-56"
          style={{
            top: `${customerDropdownPos.top}px`,
            left: `${customerDropdownPos.left}px`,
            zIndex: 9999,
          }}
        >
          {/* Existing Customers */}
          {filteredCustomers.length > 0 ? (
            <>
              {filteredCustomers.map((customer) => (
                <button
                  key={customer._id}
                  type="button"
                  onClick={() => handleCustomerSelect(customer)}
                  className="w-full px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs border-b transition text-left"
                >
                  <p className="font-semibold text-gray-800">{customer.name}</p>
                  <p className="text-gray-500 text-[10px]">
                    {customer.phone || "-"}
                  </p>
                </button>
              ))}
              <div className=" p-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickCustomerModal(true);
                    setShowCustomerDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 rounded flex items-center gap-2 transition"
                >
                  <Plus size={14} /> Quick Customer (No Save)
                </button>
              </div>
            </>
          ) : (
            <>
              {/* No customers found - Show options */}
              <div className="p-3 space-y-2">
                <p className="text-xs text-gray-600 font-medium">
                  No customers found
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickCustomerModal(true);
                    setShowCustomerDropdown(false);
                  }}
                  className="w-full px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 rounded border border-blue-200 flex items-center justify-center gap-2 transition"
                >
                  <Plus size={14} /> Quick Customer (No Save)
                </button>
              </div>
            </>
          )}
        </div>
      )}

  
      <div className="flex-1 flex flex-col overflow-hidden overflow-y-scroll">
        <div className="w-full flex flex-col h-full">
          
          <div className="bg-white rounded-lg shadow flex flex-col flex-1 min-h-0 mx-4 mt-4 mb-4 overflow-visible">
            {/* ==================== HEADER SECTION ==================== */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 flex-shrink-0 sticky top-0 z-40 overflow-hidden">
              <div className="p-4 bg-gray-50    flex-shrink-0 sticky  z-30 overflow-hidden">
                <div className="grid grid-cols-2  gap-4 min-h-30 ">
                  {/* ==================== PRODUCT SEARCH SECTION ==================== */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      <Search className="inline w-3 h-3 mr-1" />
                      Search & Add Products
                    </label>
                    <div
                      className="relative overflow-visible"
                      ref={searchDropdownRef}
                    >
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={itemSearch}
                        onChange={(e) => {
                          setItemSearch(e.target.value);
                          setShowSearchDropdown(
                            e.target.value.trim().length > 0,
                          );
                          setSelectedSearchIndex(0);
                          setProductPage(1);
                        }}
                        onFocus={() =>
                          itemSearch.trim() && setShowSearchDropdown(true)
                        }
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Search product by name, code, or barcode..."
                        className="w-full px-2 h-10 py-1 text-xs border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* ==================== CUSTOMER DETAILS SECTION (RIGHT SIDE) ==================== */}

                  <div className="flex justify-end">
                    <div className="w-[400px] h-20 overflow-hidden">
                      {orderData.partyName &&
                      orderData.partyName.trim() ? (
                        <div className="bg-white border-2 border-green-300 rounded-lg p-2 shadow-sm h-20 flex flex-col">
                          <div className="space-y-0.5 flex-1 min-h-0 overflow-hidden">
                            <div>
                              <p className=" text-xs pl-4 text-gray-900 line-clamp-1">
                                Name -{orderData.partyName}
                              </p>
                            </div>
                            <div>
                              <p className=" text-xs pl-4  text-gray-900">
                                Contact -  {orderData.partyPhone || "-"}
                              </p>
                            </div>
                            <div>
                              <p className=" text-xs pl-4 text-gray-900 line-clamp-1">
                                Address -{orderData.partyAddress || "-"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-2 flex items-center justify-center h-20 text-center">
                          <div>
                            <p className="text-[10px] text-gray-600 font-medium">
                              No customer
                            </p>
                            <p className="text-[9px] text-gray-500 mt-0.5">
                              Search customer
                            </p>
                            <p className="text-[9px] text-gray-400 mt-0.5">
                              or Quick Add
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ==================== DELIVERY DATE & PAYMENT SECTION ==================== */}
              <div className="px-4 py-3 grid grid-cols-3 gap-3 border-t border-blue-200 bg-gray-50">
                {/* Delivery Date */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    <Calendar size={12} className="inline mr-1" />
                    Delivery Date
                  </label>
                  <input
                    type="date"
                    value={orderData.deliveryDate}
                    onChange={(e) =>
                      setOrderData((prev) => ({
                        ...prev,
                        deliveryDate: e.target.value,
                      }))
                    }
                    className="w-full h-9 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Payment Type */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    <FileText size={12} className="inline mr-1" />
                    Payment Type
                  </label>
                  <select
                    value={orderData.paymentType}
                    onChange={(e) =>
                      setOrderData((prev) => ({
                        ...prev,
                        paymentType: e.target.value,
                      }))
                    }
                    className="w-full h-9 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select...</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Online">Online</option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>

                {/* Payment Terms */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    <FileText size={12} className="inline mr-1" />
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={orderData.paymentTerms}
                    onChange={(e) =>
                      setOrderData((prev) => ({
                        ...prev,
                        paymentTerms: e.target.value,
                      }))
                    }
                    placeholder="NET 30"
                    className="w-full h-9 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* ==================== ITEMS SECTION ==================== */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-blue-200 flex flex-col min-h-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-blue-200 bg-blue-50">
                <h3 className="text-sm font-bold text-gray-900">
                  SalesOrder Items
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-gray-50 text-gray-600 uppercase text-xs sticky top-0 z-10">
                    <tr>
                      <th className="text-center px-2 py-3 w-12">#</th>
                      <th className="text-center px-2 py-3 w-28">Code</th>
                      <th className="text-left px-2 py-3">Item Name</th>
                      <th className="text-center px-2 py-3 w-28">UOM</th>
                      <th className="text-center px-2 py-3 w-20">Qty</th>
                      <th className="text-center px-2 py-3 w-24">Price</th>
                      <th className="text-right px-2 py-3 w-28">Total</th>
                      <th className="text-center px-2 py-3 w-16">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orderData.items.length === 0 ? (
                      <tr>
                        <td
                          colSpan="8"
                          className="text-center py-16 text-gray-400"
                        >
                          <p className="text-xs">
                            No items added. Search above to add items
                          </p>
                        </td>
                      </tr>
                    ) : (
                      orderData.items.map((item, idx) => {
                        const amount =
                          (item.quantity || 0) * (item.unitPrice || 0);
                        const discountPercent = item.discountPercent || 0;
                        const discountAmount = item.discountAmount || 0;
                        const percentDiscount =
                          (amount * discountPercent) / 100;
                        const totalDiscount = percentDiscount + discountAmount;
                        const netAmount = amount - totalDiscount;

                        return (
                          <tr
                            key={idx}
                            className="hover:bg-blue-50/40 transition-colors"
                          >
                            {/* Serial No */}
                            <td className="px-2 py-2 text-center text-gray-500 font-medium w-10">
                              {idx + 1}
                            </td>

                            {/* Code / Barcode */}
                            <td className="px-2 py-2 text-center w-32">
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                {item.itemcode || "-"}
                              </span>
                            </td>

                            {/* Item Name */}
                            <td className="px-3 py-2 text-left font-medium text-gray-800 min-w-[220px]">
                              <div>
                                <p className="font-medium text-gray-800">
                                  {item.itemName || "Unknown Product"}
                                </p>
                                {itemNotes[idx] && (
                                  <p className="text-xs italic text-gray-500 mt-1">
                                    {itemNotes[idx]}
                                  </p>
                                )}
                              </div>
                            </td>
                              {/* UOM */}
                            <td className="px-2 py-2 text-center w-20">

                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                {item.unit || "Pcs"}
                              </span>


                            </td>
                            {/* Quantity */}
                            <td className="px-2 py-2 text-center w-20">
                              <input
                                ref={(el) => {
                                  itemInputRefs.current[
                                    `item_${idx}_quantity`
                                  ] = el;
                                }}
                                type="number"
                                inputMode="numeric"
                                step="1"
                                min="0"
                                value={item.quantity || ""}
                                onChange={(e) =>
                                  handleItemChange(
                                    idx,
                                    "quantity",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                onKeyDown={(e) =>
                                  handleTableCellKeyDown(e, idx, "quantity")
                                }
                                className="w-full text-center border border-gray-200 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            </td>

                            {/* Price */}
                            <td className="px-2 py-2 text-center w-24">
                              <input
                                ref={(el) => {
                                  itemInputRefs.current[
                                    `item_${idx}_unitPrice`
                                  ] = el;
                                }}
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                min="0"
                                value={item.unitPrice || ""}
                                onChange={(e) =>
                                  handleItemChange(
                                    idx,
                                    "unitPrice",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                onKeyDown={(e) =>
                                  handleTableCellKeyDown(e, idx, "unitPrice")
                                }
                                className="w-full text-center border border-gray-200 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            </td>

                            {/* Total */}
                            <td className="px-2 py-2 text-right font-bold text-gray-900 w-28">
                              {formatNumber(netAmount)}
                            </td>

                            {/* Actions */}
                            <td className="px-2 py-2 text-center w-24">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => {
                                    setSelectedItemNote(idx);
                                    setShowItemNoteModal(true);
                                  }}
                                  className="text-blue-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-md transition"
                                  title="Add item note"
                                >
                                  <FileText size={16} />
                                </button>
                                <button
                                  onClick={() => removeItem(idx)}
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

            {/* ==================== FOOTER SECTION ==================== */}
            <div
              className="bg-gray-50  px-6 py-3 shadow-lg flex-shrink-0 overflow-y-auto z-20 space-y-4"
              style={{ maxHeight: "calc(100vh - 550px)", minHeight: "100px" }}
            >
              <div>
                {/* Summary Footer - Compact Row Layout (Like GRN) */}
                <div className="flex flex-col gap-0.5 p-1.5 border-t bg-gray-50 flex-shrink-0">
                  {/* Summary Row 1 - Qty, Subtotal, Discount, Totals */}
                  <div className="flex items-center justify-between pr-2 gap-2 text-xs overflow-x-auto pb-1">
                    {/* Total Items */}
                    <div className="flex items-center justify-between gap-0.5 w-20 bg-white px-1 py-0.5 rounded border border-gray-200">
                      <span className="font-semibold text-xs">Items:</span>
                      <span className="font-bold text-blue-600 text-xs">
                        {orderData.totalItems || 0}
                      </span>
                    </div>

                    {/* Subtotal */}
                    <div className="flex items-center justify-between w-32 gap-0.5 bg-white px-1 py-0.5 rounded border border-gray-200 text-xs">
                      <span className="font-semibold">Subtotal:</span>
                      <span className="font-bold text-blue-600">
                        {formatNumber(orderData.subtotal || 0)}
                      </span>
                    </div>

                    {/* Discount Amount */}
                    <div className="flex items-center w-48 justify-between gap-0.5 bg-white px-1 py-0.5 rounded border border-gray-200 text-xs">
                      <span className="font-semibold">Disc Amt :</span>
                      <input
                        type="number"
                        step="0.01"
                        value={orderData.discountAmount}
                        onChange={(e) => {
                          const discAmount = parseFloat(e.target.value) || 0;
                          const discPercentage =
                            orderData.subtotal > 0
                              ? (discAmount / orderData.subtotal) * 100
                              : 0;
                          setOrderData((prev) => ({
                            ...prev,
                            discountAmount: discAmount,
                            discount: discPercentage,
                            totalAfterDiscount: prev.subtotal - discAmount,
                            totalIncludeVat: prev.subtotal - discAmount,
                          }));
                        }}
                        placeholder="0.00"
                        className="w-14 px-0.5 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                      />
                    </div>

                    {/* Discount Percentage */}
                    <div className="flex items-center w-32 justify-between gap-0.5 bg-white px-1 py-0.5 rounded border border-gray-200 text-xs">
                      <span className="font-semibold">Disc % :</span>
                      <input
                        type="number"
                        step="0.01"
                        value={orderData.discount}
                        onChange={(e) => {
                          const discPercentage =
                            parseFloat(e.target.value) || 0;
                          const discAmount =
                            (orderData.subtotal * discPercentage) / 100;
                          setOrderData((prev) => ({
                            ...prev,
                            discount: discPercentage,
                            discountAmount: discAmount,
                            totalAfterDiscount: prev.subtotal - discAmount,
                            totalIncludeVat: prev.subtotal - discAmount,
                          }));
                        }}
                        placeholder="0.00"
                        className="w-14 px-0.5 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                      />
                    </div>

                    {/* Total After Discount */}
                    <div className="flex items-center justify-between w-48 gap-0.5 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                      <span className="font-semibold">Total Ex.Tax:</span>
                      <span className="font-bold text-blue-600">
                        {formatNumber(orderData.totalAfterDiscount || 0)}
                      </span>
                    </div>

                    {/* VAT */}
                    <div className="flex items-center justify-between w-32 gap-0.5 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                      <span className="font-semibold">VAT :</span>
                      <span className="font-bold text-blue-600">
                        {formatNumber(orderData.vatAmount || 0)}
                      </span>
                    </div>

                    {/* Net Total */}
                    <div className="flex items-center justify-between w-40 gap-0.5 bg-yellow-100 px-1.5 py-0.5 rounded border border-yellow-300">
                      <span className="font-semibold">Net Total :</span>
                      <span className="font-bold text-yellow-700">
                        {formatNumber(orderData.totalIncludeVat || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Notes & Action Buttons Row */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Notes Input */}
                    <div className="flex-1">
                      <input
                        type="text"
                        value={orderData.notes}
                        onChange={(e) =>
                          setOrderData((prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
                        }
                        placeholder="Notes..."
                        className="w-[500px] h-10 px-2 py-0.5 text-xs border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      {/* ✅ Reset Button - Calls resetForm function */}
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-5 py-2 text-xm border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition-colors font-medium whitespace-nowrap"
                      >
                        Reset
                      </button>

                      {/* ✅ Save Draft Button */}
                      <button
                        type="button"
                        onClick={() => handleSaveSalesOrder("draft")}
                        disabled={loading}
                        className="px-5 py-2 text-xm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors font-medium flex items-center gap-1 disabled:opacity-50 whitespace-nowrap"
                      >
                        <Save className="w-3 h-3" />
                        {loading ? "Saving..." : "Save Draft"}
                      </button>

                      {/* ✅ Regular Save/Update Button */}
                      <button
                        type="button"
                        onClick={() => handleSaveSalesOrder("save")}
                        disabled={loading}
                        className="px-5 py-2 text-xm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium flex items-center gap-1 disabled:opacity-50 whitespace-nowrap"
                      >
                        <Save className="w-3 h-3" />
                        {loading ? "Saving..." : editId ? "Update" : "Save"}
                      </button>

                      {/* ✅ Save & Print Button */}
                      <button
                        type="button"
                        onClick={() => handleSaveSalesOrder("print")}
                        disabled={loading}
                        className="px-5 py-2 text-xm bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium flex items-center gap-1 disabled:opacity-50 whitespace-nowrap"
                      >
                        <Printer className="w-3 h-3" />
                        {loading ? "Saving..." : "Save & Print"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PRODUCT SEARCH DROPDOWN - Rendered at root level to escape parent overflow */}
        {showSearchDropdown &&
          searchDropdownRef.current &&
          itemSearch.trim() && (
            <div
              className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto"
              style={{
                top: `${searchDropdownRef.current.getBoundingClientRect().bottom + window.scrollY}px`,
                left: `${searchDropdownRef.current.getBoundingClientRect().left}px`,
                width: `${searchDropdownRef.current.offsetWidth}px`,
              }}
            >
              <div className="text-[10px] text-gray-400 px-4 py-2 border-b bg-gray-50 sticky top-0 z-20 flex justify-between items-center">
                <span>↑↓ Navigate • Enter to add • Esc to close</span>
                <span className="text-[9px]">
                  {searchMetadata?.totalCount || 0} of{" "}
                  {searchMetadata?.totalCount || 0}
                </span>
              </div>

              {searchLoading && (
                <div className="px-4 py-8 text-center text-xs text-gray-400">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-blue-300 border-t-blue-500"></div>
                  <p className="mt-2">Searching products...</p>
                </div>
              )}

              {!searchLoading &&
                products.length === 0 &&
                itemSearch.trim() && (
                  <div className="px-4 py-8 text-center text-xs text-gray-400">
                    <Search className="w-5 h-5 mx-auto mb-2 opacity-50" />
                    <p>No products found</p>
                  </div>
                )}

              {!searchLoading && products.length > 0 && (
                <>
                  <div className="text-[10px] text-gray-400 px-4 py-1 bg-blue-50 sticky top-10 z-10 border-b">
                    Showing {filteredProducts.length} of {searchMetadata?.totalCount || 0} results
                  </div>
                  {filteredProducts.map((product, idx) => {
                    const existingItem = existingProductsMap.get(product._id);
                    return (
                      <div
                        key={product._id}
                        onClick={() => addItemFromSearch(product)}
                        onMouseEnter={() => setSelectedSearchIndex(idx)}
                        className={`px-4 py-3 cursor-pointer border-b border-gray-50 last:border-b-0 transition ${
                          idx === selectedSearchIndex
                            ? "bg-blue-50 border-l-4 border-l-blue-500"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-800">
                                {product.itemname || product.name}
                              </p>
                              {existingItem && (
                                <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full">
                                  ×{existingItem.quantity}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              <span className="font-mono bg-gray-100 px-1 rounded">
                                {product.itemcode}
                              </span>
                              {product.barcode && (
                                <>
                                  <span className="mx-2">•</span>
                                  <span className="font-mono">
                                    {product.barcode}
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                          <div className="text-right mr-3">
                            <p className="font-bold text-green-600 text-sm">
                              {formatNumber(product.salesprice || product.price)}
                            </p>
                            <p
                              className={`text-xs font-semibold ${product.stock > 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              Stock: {product.stock || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

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
                </>
              )}
            </div>
          )}

        {/* Quick Customer Modal */}
        {showQuickCustomerModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Quick Customer
                </h3>
                <button
                  onClick={() => setShowQuickCustomerModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-xs text-gray-600 mb-4">
                Enter customer details (not saved in database). Used only for
                this SalesOrder.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={quickCustomerData.name}
                    onChange={(e) =>
                      setQuickCustomerData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Required"
                    className="w-full px-3 py-2 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="text"
                    value={quickCustomerData.phone}
                    onChange={(e) =>
                      setQuickCustomerData((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="Enter phone number"
                    className="w-full px-3 py-2 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Address (Optional)
                  </label>
                  <textarea
                    value={quickCustomerData.address}
                    onChange={(e) =>
                      setQuickCustomerData((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    placeholder="Enter address"
                    rows="2"
                    className="w-full px-3 py-2 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowQuickCustomerModal(false)}
                  className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!quickCustomerData.name.trim()) {
                      showToast("error", "Customer name is required");
                      return;
                    }
                    setOrderData((prev) => ({
                      ...prev,
                      customerType: "QUICK",
                      partyName: quickCustomerData.name,
                      partyPhone: quickCustomerData.phone,
                      partyAddress: quickCustomerData.address,
                    }));
                    setShowQuickCustomerModal(false);
                    setCustomerSearch("");
                    showToast("success", "Quick customer added");
                  }}
                  className="flex-1 px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Add & Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SalesOrder PRINTING & PDF MODAL - Terminal Template Mapped */}
        {showPrintingModal && viewedOrder && (
          <GlobalDocumentPrintingComponent
            documentType="SALES_ORDER"
            documentId={viewedOrder._id}
            onClose={() => {
              setShowPrintingModal(false);
              setViewedOrder(null);
              setSavedOrderId(null);
            }}
          />
        )}

        {/* ✅ UNIT VARIANT SELECTOR MODAL */}
        <SalesInvoiceUnitVariantSelector
          product={productForUnitSelection}
          isOpen={showUnitSelector}
          onSelect={handleUnitVariantSelected}
          onClose={() => {
            setShowUnitSelector(false);
            setProductForUnitSelection(null);
          }}
        />

        {/* ITEM NOTE MODAL */}
        {showItemNoteModal && selectedItemNote !== null && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
              <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
                <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <FileText size={18} className="text-blue-600" />
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

        {/* ✅ SalesOrder HISTORY MODAL */}
        {showHistoryModal && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 40 }}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[85vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50 flex-shrink-0">
                <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Clock size={16} className="text-purple-600" />
                  SalesOrder History
                </h2>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Filters */}
              <div className="px-4 py-2 border-b bg-white flex-shrink-0">
                <div className="grid grid-cols-4 gap-2">
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

                  {/* Status Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Status
                    </label>
                    <select
                      value={filteredHistoryStatus}
                      onChange={(e) => setFilteredHistoryStatus(e.target.value)}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="All">All</option>
                      <option value="Draft">Draft</option>
                      <option value="Final">Final</option>
                    </select>
                  </div>

                  {/* Search Filter */}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Search
                    </label>
                    <input
                      type="text"
                      placeholder="Customer or SalesOrder #"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* orders Table */}
              <div className="flex-1 overflow-y-auto">
                {filteredHistoryorders.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    {orders.length === 0
                      ? "No orders found"
                      : historySearch.trim()
                      ? `No orders found for "${historySearch}" on ${historyDateFilter}`
                      : `No orders found for ${historyDateFilter}`}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100 border-b border-gray-300 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-center font-semibold text-gray-800">SL</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-800">SalesOrder #</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-800">Date</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-800">Customer</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-800">Items</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-800">Qty</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-800">Total</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-800">Status</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-800 w-32">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistoryorders.map((SalesOrder, idx) => (
                          <tr key={SalesOrder._id} className="border-b border-gray-200 hover:bg-blue-50 transition">
                            <td className="px-3 py-2 text-center text-gray-700 font-semibold">{idx + 1}</td>
                            <td className="px-3 py-2 font-semibold text-blue-600">#{SalesOrder.orderNumber}</td>
                            <td className="px-3 py-2 text-center text-gray-600">
                              {new Date(SalesOrder.date).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-2 text-gray-700">{SalesOrder.customerName}</td>
                            <td className="px-3 py-2 text-center text-gray-700">{SalesOrder.items?.length || 0}</td>
                            <td className="px-3 py-2 text-center font-semibold text-gray-800">
                              {SalesOrder.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700">
                              {formatNumber(SalesOrder.totalIncludeVat || SalesOrder.subtotal || 0)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                SalesOrder.status === 'Final' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {SalesOrder.status}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex gap-1 justify-center">
                                <button
                                  onClick={() => handleHistoryPreview(SalesOrder)}
                                  title="Preview"
                                  className="flex items-center justify-center gap-1 px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded text-xs font-medium transition"
                                >
                                  <Eye size={11} />
                                  Preview
                                </button>
                                <button
                                  onClick={() => {
                                    handleEditSalesOrder(SalesOrder);
                                    setShowHistoryModal(false);
                                  }}
                                  title="Edit"
                                  className="flex items-center justify-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-xs font-medium transition"
                                >
                                  <Edit2 size={11} />
                                  Edit
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
      </div>
    </div>
  );
};

export default SalesOrder;





