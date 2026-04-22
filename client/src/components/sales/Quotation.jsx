import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
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
import { CompanyContext } from "../../context/CompanyContext";
import { showToast } from "../shared/AnimatedCenteredToast";

const Quotation = () => {
  const { company } = useContext(CompanyContext);

  const statusColors = {
    Draft: "bg-gray-200 text-gray-800",
    Sent: "bg-blue-200 text-blue-800",
    Accepted: "bg-green-200 text-green-800",
    Rejected: "bg-red-200 text-red-800",
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

  // ✅ Product Search Hook - MeiliSearch with fallback
  const {
    results: searchResults,
    loading: searchLoading,
    metadata: searchMetadata,
  } = useProductSearch(
    itemSearch,
    300, // 300ms debounce
    productPage,
    20, // 20 items per page
    true, // use fallback
  );

  // ✅ Update products list when search results change
  useEffect(() => {
    if (!searchResults || searchResults.length === 0) return;

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

  const [quotationData, setQuotationData] = useState({
    quotationNo: "001",
    quotationDate: new Date().toISOString().split("T")[0],
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
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
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [editId, setEditId] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showProductLookup, setShowProductLookup] = useState(false);
  const [viewedQuotation, setViewedQuotation] = useState(null);
  const [historyDateFilter, setHistoryDateFilter] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [historySearch, setHistorySearch] = useState("");
  const [filteredHistoryStatus, setFilteredHistoryStatus] = useState("All");
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

  const [serialNumbers, setSerialNumbers] = useState({});
  const [showSerialModal, setShowSerialModal] = useState(false);
  const [selectedItemSerial, setSelectedItemSerial] = useState(null);
  const [newSerialInput, setNewSerialInput] = useState("");

  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertToType, setConvertToType] = useState("SalesOrder");

  // Fetch next quotation number
  useEffect(() => {
    const fetchNextQuotationNumber = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/quotations/nextQuotationNumber`,
          { params: { financialYear } },
        );
        setQuotationData((prev) => ({
          ...prev,
          quotationNo: response.data.quotationNumber,
        }));
      } catch (err) {
        console.error("Error fetching quotation number:", err);
      }
    };
    fetchNextQuotationNumber();
  }, [financialYear]);

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

  // Fetch quotations
  useEffect(() => {
    const fetchQuotations = async () => {
      try {
        const response = await axios.get(`${API_URL}/quotations/getQuotations`);
        setQuotations(response.data || []);
      } catch (err) {
        console.error("Error fetching quotations:", err);
        showToast("error", "Failed to load quotations");
      }
    };
    fetchQuotations();
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
    [scannerActive, quotationData.items],
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
      addItemByBarcode(product);
      setScannerInput("");
    } else {
      showToast("error", "Product not found: " + scannerInput);
    }
  };

  const addItemByBarcode = (product) => {
    const existingItem = quotationData.items.find(
      (item) => item.productId === product._id,
    );

    let newItems;
    let isNew = false;
    if (existingItem) {
      newItems = quotationData.items.map((item) =>
        item.productId === product._id
          ? {
              ...item,
              quantity: item.quantity + 1,
              lineAmount: (item.quantity + 1) * item.unitPrice,
            }
          : item,
      );
    } else {
      newItems = [
        ...quotationData.items,
        {
          productId: product._id,
          itemName: product.itemname || product.name,
          itemcode: product.itemcode,
          barcode: product.barcode,
          quantity: 1,
          unitPrice: product.salesprice || product.price || 0,
          lineAmount: product.salesprice || product.price || 0,
          unitCost: product.cost || 0,
          lineCost: product.cost || 0,
          discountPercentage: 0,
          discountAmount: 0,
          amountAfterDiscount: product.salesprice || product.price || 0,
          vatPercentage: 0,
          vatAmount: 0,
          total: product.salesprice || product.price || 0,
          serialNumbers: [],
          note: "",
        },
      ];
      isNew = true;
    }
    setQuotationData((prev) => ({ ...prev, items: newItems }));
    calculateTotals(newItems);
  };

  const addItemFromSearch = () => {
    if (selectedSearchIndex >= 0 && selectedSearchIndex < products.length) {
      addItemByBarcode(products[selectedSearchIndex]);
      setItemSearch("");
      setShowSearchDropdown(false);
      setSelectedSearchIndex(0);
      setProductPage(1); // Reset page for next search
      searchInputRef.current?.focus();
    }
  };

  const handleCustomerSelect = (customer) => {
    console.log("🎯 Customer selected:", customer);
    setSelectedCustomerId(customer._id);
    setSelectedCustomerDetails(customer);
    setQuotationData((prev) => {
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
      console.log("✅ Updated quotation data:", updated);
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
      vatPercentage: 0,
      vatAmount: 0,
      total: 0,
      serialNumbers: [],
      note: "",
    };
    const newItems = [...quotationData.items, newItem];
    setQuotationData((prev) => ({ ...prev, items: newItems }));
  };

  const removeItem = (index) => {
    const newItems = quotationData.items.filter((_, i) => i !== index);
    setQuotationData((prev) => ({ ...prev, items: newItems }));
    calculateTotals(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...quotationData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "quantity" || field === "unitPrice") {
      newItems[index].lineAmount =
        newItems[index].quantity * newItems[index].unitPrice;
      newItems[index].lineCost =
        newItems[index].quantity * newItems[index].unitCost;
      newItems[index].amountAfterDiscount =
        newItems[index].lineAmount - newItems[index].discountAmount;
    }

    if (field === "discountPercentage") {
      newItems[index].discountAmount =
        (newItems[index].lineAmount * value) / 100;
      newItems[index].amountAfterDiscount =
        newItems[index].lineAmount - newItems[index].discountAmount;
    }

    if (field === "discountAmount") {
      newItems[index].discountPercentage =
        (value / newItems[index].lineAmount) * 100;
      newItems[index].amountAfterDiscount = newItems[index].lineAmount - value;
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
      }
    }

    setQuotationData((prev) => ({ ...prev, items: newItems }));
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
      subtotal += item.lineAmount;
      totalCost += item.lineCost;
      totalItemQty += item.quantity;
      totalVat += item.vatAmount || 0;
    });

    const discountAmount = quotationData.discountAmount;
    const totalAfterDiscount = subtotal - discountAmount;
    const totalIncludeVat = totalAfterDiscount + totalVat;

    const grossProfit = subtotal - totalCost;
    const grossProfitMargin = subtotal > 0 ? (grossProfit / subtotal) * 100 : 0;
    const netProfit = totalIncludeVat - totalCost;
    const netProfitMargin =
      totalIncludeVat > 0 ? (netProfit / totalIncludeVat) * 100 : 0;

    setQuotationData((prev) => ({
      ...prev,
      subtotal,
      totalAfterDiscount,
      totalIncludeVat,
      totalItemQty,
      totalItems: items.length,
      totalCost,
      grossProfit,
      grossProfitMargin,
      netProfit,
      netProfitMargin,
    }));
  };

  const handleSaveQuotation = async () => {
    if (!quotationData.partyName || quotationData.items.length === 0) {
      showToast("error", "Please enter customer and add items");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        quotationNumber: quotationData.quotationNo,
        financialYear,
        date: new Date(quotationData.quotationDate),
        expiryDate: new Date(quotationData.expiryDate),
        paymentType: quotationData.paymentType,
        paymentTerms: quotationData.paymentTerms,
        customerId: selectedCustomerId,
        customerName: quotationData.partyName,
        customerPhone: quotationData.partyPhone,
        customerTRN: quotationData.partyTRN,
        customerAddress: quotationData.partyAddress,
        customerContact: quotationData.partyContact,
        subtotal: quotationData.subtotal,
        discountPercentage: quotationData.discount,
        discountAmount: quotationData.discountAmount,
        totalAfterDiscount: quotationData.totalAfterDiscount,
        vatPercentage: 0,
        vatAmount: 0,
        totalIncludeVat: quotationData.totalIncludeVat,
        totalCost: quotationData.totalCost,
        grossProfit: quotationData.grossProfit,
        grossProfitMargin: quotationData.grossProfitMargin,
        netProfit: quotationData.netProfit,
        netProfitMargin: quotationData.netProfitMargin,
        totalItems: quotationData.totalItems,
        totalItemQty: quotationData.totalItemQty,
        notes: quotationData.notes,
        terms: quotationData.terms,
        status: quotationData.status,
        items: quotationData.items.map((item) => ({
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
          vatPercentage: 0,
          vatAmount: 0,
          total: item.amountAfterDiscount,
          serialNumbers: item.serialNumbers,
          note: item.note,
        })),
      };

      const url = editId
        ? `${API_URL}/quotations/updateQuotation/${editId}`
        : `${API_URL}/quotations/createQuotation`;

      const response = await axios[editId ? "put" : "post"](url, payload);

      showToast(
        editId
          ? "Quotation updated successfully"
          : "Quotation created successfully",
        "success",
      );

      if (!editId) {
        setQuotationData({
          quotationNo: response.data.quotationNumber,
          quotationDate: new Date().toISOString().split("T")[0],
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          paymentType: "",
          paymentTerms: "",
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
        });
        setSelectedCustomerId(null);
      }

      setEditId(null);
      setQuotations([...quotations, response.data]);
    } catch (err) {
      showToast("error", err.response?.data?.error || "Error saving quotation");
    } finally {
      setLoading(false);
    }
  };

  const handleEditQuotation = (quotation) => {
    setEditId(quotation._id);
    setQuotationData({
      quotationNo: quotation.quotationNumber,
      quotationDate: quotation.date.split("T")[0],
      expiryDate: quotation.expiryDate?.split("T")[0] || "",
      paymentType: quotation.paymentType || "",
      paymentTerms: quotation.paymentTerms || "",
      partyName: quotation.customerName,
      partyPhone: quotation.customerPhone || "",
      partyTRN: quotation.customerTRN || "",
      partyAddress: quotation.customerAddress || "",
      partyContact: quotation.customerContact || "",
      discount: quotation.discountPercentage,
      discountAmount: quotation.discountAmount,
      items: quotation.items,
      notes: quotation.notes || "",
      terms: quotation.terms || "",
      status: quotation.status,
      subtotal: quotation.subtotal,
      totalAfterDiscount: quotation.totalAfterDiscount,
      totalIncludeVat: quotation.totalIncludeVat,
      totalItemQty: quotation.totalItemQty,
      totalItems: quotation.totalItems,
    });
    setSelectedCustomerId(quotation.customerId);
    window.scrollTo(0, 0);
  };

  const handleDeleteQuotation = async (id) => {
    if (window.confirm("Are you sure you want to delete this quotation?")) {
      try {
        await axios.delete(`${API_URL}/quotations/deleteQuotation/${id}`);
        setQuotations(quotations.filter((q) => q._id !== id));
        showToast("success", "Quotation deleted successfully");
      } catch (err) {
        showToast("error", "Error deleting quotation");
      }
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(`${API_URL}/quotations/updateStatus/${id}`, {
        status: newStatus,
      });
      setQuotations(
        quotations.map((q) => (q._id === id ? { ...q, status: newStatus } : q)),
      );
      showToast("success", "Status updated successfully");
    } catch (err) {
      showToast("error", "Error updating status");
    }
  };

  const handleTableCellKeyDown = (e, index, field) => {
    const itemCount = quotationData.items.length;
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

  const filteredQuotations = quotations.filter((q) => {
    const matchesDate =
      !historyDateFilter || q.date.split("T")[0] === historyDateFilter;
    const matchesSearch =
      !historySearch ||
      q.quotationNumber.includes(historySearch) ||
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
              <h1 className="text-lg font-bold">Quotation</h1>
              <div className="bg-white/20 px-3 py-1.5 rounded-lg mt-2 inline-block">
                <p className="font-bold text-xs">{quotationData.quotationNo}</p>
              </div>
            </div>

            <div className="border-l border-white/30 pl-4">
              <label className="block text-xs font-medium text-white/80 mb-1">
                Quotation Date
              </label>
              <input
                type="date"
                value={quotationData.quotationDate}
                onChange={(e) =>
                  setQuotationData((prev) => ({
                    ...prev,
                    quotationDate: e.target.value,
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
                {quotationData.partyName && (
                  <button
                    type="button"
                    onClick={() => {
                      // Batch all state updates together to prevent re-render flickering
                      setQuotationData((prev) => ({
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
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded font-medium transition whitespace-nowrap"
                    title="Change customer"
                  >
                    ↻ Clear
                  </button>
                )}
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
                  setProducts(res.data.products || res.data);
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

      {/* CONTENT AREA - Scrollable */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="w-full flex flex-col h-full">
          {/* QUOTATION DOCUMENT */}
          <div className="bg-white rounded-lg shadow flex flex-col flex-1 min-h-0 mx-4 mt-4 mb-4 overflow-visible">
            {/* ==================== HEADER SECTION ==================== */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-1  flex-shrink-0 sticky top-0 z-40">
              <div className="p-4 bg-gray-50 border-b border-blue-200 flex-shrink-0 sticky top-20 z-30 overflow-visible">
                <div className="grid grid-cols-2  gap-4 min-h-30">
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
                          setProductPage(1); // Reset to first page on new search
                        }}
                        onFocus={() =>
                          itemSearch.trim() && setShowSearchDropdown(true)
                        }
                        onKeyDown={(e) => {
                          if (!showSearchDropdown || products.length === 0) {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (products.length > 0) {
                                addItemFromSearch();
                              }
                            }
                            return;
                          }

                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setSelectedSearchIndex((prev) =>
                              prev < products.length - 1 ? prev + 1 : 0,
                            );
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setSelectedSearchIndex((prev) =>
                              prev > 0 ? prev - 1 : products.length - 1,
                            );
                          } else if (e.key === "Enter") {
                            e.preventDefault();
                            if (products.length > 0) {
                              addItemFromSearch();
                            }
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            setShowSearchDropdown(false);
                          }
                        }}
                        placeholder="Search product by name, code, or barcode..."
                        className="w-full px-2 h-10 py-1 text-xs border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* ==================== CUSTOMER DETAILS SECTION (RIGHT SIDE) ==================== */}

                  <div className="flex justify-end">
                    <div className="w-[400px] h-20 overflow-hidden">
                      {quotationData.partyName &&
                      quotationData.partyName.trim() ? (
                        <div className="bg-white border-2 border-green-300 rounded-lg p-2 shadow-sm h-20 flex flex-col">
                          <div className="space-y-0.5 flex-1 min-h-0 overflow-hidden">
                            <div>
                              <p className=" text-xs pl-4 text-gray-900 line-clamp-1">
                                Name -{quotationData.partyName}
                              </p>
                            </div>
                            <div>
                              <p className=" text-xs pl-4  text-gray-900">
                                Contact -  {quotationData.partyPhone || "-"}
                              </p>
                            </div>
                            <div>
                              <p className=" text-xs pl-4 text-gray-900 line-clamp-1">
                                Address -{quotationData.partyAddress || "-"}
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
            </div>

            {/* ==================== ITEMS SECTION ==================== */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-blue-200 flex flex-col min-h-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-blue-200 bg-blue-50">
                <h3 className="text-sm font-bold text-gray-900">
                  Quotation Items
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-gray-50 text-gray-600 uppercase text-xs sticky top-0 z-10">
                    <tr>
                      <th className="text-center px-2 py-3 w-12">#</th>
                      <th className="text-center px-2 py-3 w-28">Code</th>
                      <th className="text-center px-2 py-3 w-20">Image</th>
                      <th className="text-left px-2 py-3">Item Name</th>
                      <th className="text-center px-2 py-3 w-20">Qty</th>
                      <th className="text-center px-2 py-3 w-24">Price</th>
                      <th className="text-right px-2 py-3 w-28">Total</th>
                      <th className="text-center px-2 py-3 w-16">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {quotationData.items.length === 0 ? (
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
                      quotationData.items.map((item, idx) => {
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
                                {item.itemcode || item.barcode || "-"}
                              </span>
                            </td>

                            {/* Image */}
                            <td className="px-2 py-2 text-center w-20">
                              {item.image || item.images ? (
                                <img
                                  src={
                                    item.image ||
                                    (item.images && item.images[0])
                                  }
                                  alt={item.itemName}
                                  className="w-16 h-16 object-cover rounded border border-gray-200"
                                  onError={(e) =>
                                    (e.target.style.display = "none")
                                  }
                                />
                              ) : (
                                <div className="w-16 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                                  <span className="text-xs text-gray-400">
                                    No Image
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Item Name */}
                            <td className="px-3 py-2 text-left font-medium text-gray-800 min-w-[220px]">
                              <div>
                                <p className="font-medium text-gray-800">
                                  {item.itemName || "Unknown Product"}
                                </p>
                                {itemNotes[idx] && (
                                  <p className="text-xs italic text-gray-500 mt-1">
                                    Note: {itemNotes[idx]}
                                  </p>
                                )}
                              </div>
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
                              {netAmount.toFixed(2)}
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
                                  onClick={() => {
                                    setQuotationData((prev) => ({
                                      ...prev,
                                      items: prev.items.filter(
                                        (_, i) => i !== idx,
                                      ),
                                    }));
                                  }}
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
                        {quotationData.totalItems || 0}
                      </span>
                    </div>

                    {/* Subtotal */}
                    <div className="flex items-center justify-between w-32 gap-0.5 bg-white px-1 py-0.5 rounded border border-gray-200 text-xs">
                      <span className="font-semibold">Subtotal:</span>
                      <span className="font-bold text-blue-600">
                        {(quotationData.subtotal || 0).toFixed(2)}
                      </span>
                    </div>

                    {/* Discount Amount */}
                    <div className="flex items-center w-48 justify-between gap-0.5 bg-white px-1 py-0.5 rounded border border-gray-200 text-xs">
                      <span className="font-semibold">Disc Amt :</span>
                      <input
                        type="number"
                        step="0.01"
                        value={quotationData.discountAmount}
                        onChange={(e) => {
                          const discAmount = parseFloat(e.target.value) || 0;
                          const discPercentage =
                            quotationData.subtotal > 0
                              ? (discAmount / quotationData.subtotal) * 100
                              : 0;
                          setQuotationData((prev) => ({
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
                        value={quotationData.discount}
                        onChange={(e) => {
                          const discPercentage =
                            parseFloat(e.target.value) || 0;
                          const discAmount =
                            (quotationData.subtotal * discPercentage) / 100;
                          setQuotationData((prev) => ({
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
                        {(quotationData.totalAfterDiscount || 0).toFixed(2)}
                      </span>
                    </div>

                    {/* VAT */}
                    <div className="flex items-center justify-between w-32 gap-0.5 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                      <span className="font-semibold">VAT :</span>
                      <span className="font-bold text-blue-600">
                        {(quotationData.vatAmount || 0).toFixed(2)}
                      </span>
                    </div>

                    {/* Net Total */}
                    <div className="flex items-center justify-between w-40 gap-0.5 bg-yellow-100 px-1.5 py-0.5 rounded border border-yellow-300">
                      <span className="font-semibold">Net Total :</span>
                      <span className="font-bold text-yellow-700">
                        {(quotationData.totalIncludeVat || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Notes & Action Buttons Row */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Notes Input */}
                    <div className="flex-1">
                      <input
                        type="text"
                        value={quotationData.notes}
                        onChange={(e) =>
                          setQuotationData((prev) => ({
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
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(null);
                          setQuotationData({
                            quotationNo: "001",
                            quotationDate: new Date()
                              .toISOString()
                              .split("T")[0],
                            expiryDate: new Date(
                              Date.now() + 30 * 24 * 60 * 60 * 1000,
                            )
                              .toISOString()
                              .split("T")[0],
                            paymentType: "",
                            paymentTerms: "",
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
                          });
                          setSelectedCustomerId(null);
                          setCustomerSearch("");
                          setShowCustomerDropdown(false);
                        }}
                        className="px-5 py-2 text-xm border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition-colors font-medium whitespace-nowrap"
                      >
                        Reset
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveQuotation}
                        disabled={loading}
                        className="px-5 py-2 text-xm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium flex items-center gap-1 disabled:opacity-50 whitespace-nowrap"
                      >
                        <Save className="w-3 h-3" />
                        {loading ? "Saving..." : editId ? "Update" : "Save"}
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
          itemSearch.trim().length > 0 && (
            <div
              className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto"
              style={{
                top: `${searchDropdownRef.current.getBoundingClientRect().bottom + window.scrollY}px`,
                left: `${searchDropdownRef.current.getBoundingClientRect().left}px`,
                width: `${searchDropdownRef.current.offsetWidth}px`,
              }}
            >
              <div className="text-[10px] text-gray-400 px-4 py-2 border-b bg-gray-50 sticky top-0 flex justify-between items-center">
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
                itemSearch.trim().length > 0 && (
                  <div className="px-4 py-8 text-center text-xs text-gray-400">
                    <Search className="w-5 h-5 mx-auto mb-2 opacity-50" />
                    <p>No products found</p>
                  </div>
                )}

              {!searchLoading && products.length > 0 && (
                <>
                  <div className="text-[10px] text-gray-400 px-4 py-1 bg-blue-50 sticky top-10 border-b">
                    Showing {Math.min(50, products.length)} of {products.length} results
                  </div>
                  {products.slice(0, 50).map((product, idx) => {
                    const existingItem = quotationData.items.find(
                      (item) => item.productId === product._id,
                    );
                    return (
                      <div
                        key={product._id}
                        onClick={() => addItemFromSearch()}
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
                              <p className="font-semibold text-gray-800 text-sm">
                                {product.itemname || product.name}
                              </p>
                              {existingItem && (
                                <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded font-medium">
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
                              {product.salesprice?.toFixed(2) ||
                                product.price?.toFixed(2)}
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

                  {/* Show message if more products available */}
                  {products.length > 50 && (
                    <div className="px-4 py-3 border-t bg-yellow-50 text-center">
                      <p className="text-xs text-yellow-700 font-medium">
                        Showing first 50 of {products.length} results
                      </p>
                      <p className="text-[10px] text-yellow-600 mt-1">
                        Type more to refine your search
                      </p>
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
                this quotation.
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
                    setQuotationData((prev) => ({
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

        {/* View Modal */}
        {showHistoryModal && viewedQuotation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-96 overflow-y-auto p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-gray-900">
                  Quotation: {viewedQuotation.quotationNumber}
                </h3>
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setViewedQuotation(null);
                  }}
                  className="text-white bg-gray-600 hover:bg-gray-700 w-8 h-8 flex items-center justify-center rounded transition-colors text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3 pb-3 border-b">
                <div>
                  <p className="text-xs text-gray-600">Customer</p>
                  <p className="font-semibold text-xs">
                    {viewedQuotation.customerName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Date</p>
                  <p className="font-semibold text-xs">
                    {new Date(viewedQuotation.date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Expiry</p>
                  <p className="font-semibold text-xs">
                    {viewedQuotation.expiryDate
                      ? new Date(
                          viewedQuotation.expiryDate,
                        ).toLocaleDateString()
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Status</p>
                  <p
                    className={`font-semibold px-1.5 py-0.5 rounded inline-block text-xs ${
                      statusColors[viewedQuotation.status] || statusColors.Draft
                    }`}
                  >
                    {viewedQuotation.status}
                  </p>
                </div>
              </div>

              <div className="mb-3">
                <h4 className="font-semibold text-xs mb-2">Items</h4>
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 text-xs">
                    <tr>
                      <th className="px-1 py-1 text-left">Product</th>
                      <th className="px-1 py-1 text-right">Qty</th>
                      <th className="px-1 py-1 text-right">Price</th>
                      <th className="px-1 py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewedQuotation.items.map((item, idx) => (
                      <tr key={idx} className="border-b text-xs">
                        <td className="px-1 py-1">{item.itemName}</td>
                        <td className="px-1 py-1 text-right">
                          {item.quantity}
                        </td>
                        <td className="px-1 py-1 text-right">
                          {item.unitPrice?.toFixed(2)}
                        </td>
                        <td className="px-1 py-1 text-right font-semibold">
                          {item.total?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
                <div>
                  <p className="text-xs text-gray-600">Total Amount</p>
                  <p className="text-md font-bold">
                    PKR {viewedQuotation.totalIncludeVat?.toFixed(2)}
                  </p>
                </div>
                {viewedQuotation.notes && (
                  <div>
                    <p className="text-xs text-gray-600">Notes</p>
                    <p className="text-xs">{viewedQuotation.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4 justify-end">
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setViewedQuotation(null);
                  }}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleEditQuotation(viewedQuotation);
                    setShowHistoryModal(false);
                  }}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}

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
      </div>
    </div>
  );
};

export default Quotation;
