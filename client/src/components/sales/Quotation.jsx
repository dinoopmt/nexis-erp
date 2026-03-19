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

const Quotation = () => {
  const [products, setProducts] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [scannerInput, setScannerInput] = useState("");
  const [scannerActive, setScannerActive] = useState(true);
  const [lastScanTime, setLastScanTime] = useState(0);
  const [itemSearch, setItemSearch] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);
  const [productPage, setProductPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasMoreProducts, setHasMoreProducts] = useState(false);
  const scannerInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchDropdownRef = useRef(null);
  const customerDropdownRef = useRef(null);
  const barcodeBuffer = useRef("");
  const lastKeyTime = useRef(0);

  const itemInputRefs = useRef({});
  const [focusedCell, setFocusedCell] = useState(null);

  const [quotationData, setQuotationData] = useState({
    quotationNo: "001",
    quotationDate: new Date().toISOString().split("T")[0],
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
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

  const [itemNotes, setItemNotes] = useState({});
  const [showItemNoteModal, setShowItemNoteModal] = useState(false);
  const [selectedItemNote, setSelectedItemNote] = useState(null);

  const [serialNumbers, setSerialNumbers] = useState({});
  const [showSerialModal, setShowSerialModal] = useState(false);
  const [selectedItemSerial, setSelectedItemSerial] = useState(null);
  const [newSerialInput, setNewSerialInput] = useState("");

  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertToType, setConvertToType] = useState("SalesOrder");

  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "info", duration = 3000) => {
    const id = Date.now();
    const toast = { id, message, type };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  // Fetch next quotation number
  useEffect(() => {
    const fetchNextQuotationNumber = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/api/v1/quotations/nextQuotationNumber`,
          { params: { financialYear } }
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

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/v1/products`, {
          params: { page: productPage, limit: 50 },
        });
        setProducts(response.data.products || []);
        setTotalProducts(response.data.total || 0);
        setHasMoreProducts(response.data.hasMore || false);
      } catch (err) {
        console.error("Error fetching products:", err);
      }
    };
    fetchProducts();
  }, [productPage]);

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/v1/customers`);
        setCustomers(response.data || []);
      } catch (err) {
        console.error("Error fetching customers:", err);
      }
    };
    fetchCustomers();
  }, []);

  // Fetch quotations
  useEffect(() => {
    const fetchQuotations = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/v1/quotations/getQuotations`);
        setQuotations(response.data || []);
      } catch (err) {
        console.error("Error fetching quotations:", err);
        showToast("Failed to load quotations", "error");
      }
    };
    fetchQuotations();
  }, []);

  // Barcode Scanner Handler
  const handleScannerInput = useCallback((e) => {
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
  }, [scannerActive, quotationData.items]);

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
      showToast("Product not found: " + scannerInput, "error");
    }
  };

  const addItemByBarcode = (product) => {
    const existingItem = quotationData.items.find(
      (item) => item.productId === product._id
    );

    let newItems;
    if (existingItem) {
      newItems = quotationData.items.map((item) =>
        item.productId === product._id
          ? {
              ...item,
              quantity: item.quantity + 1,
              lineAmount: (item.quantity + 1) * item.unitPrice,
            }
          : item
      );
    } else {
      newItems = [
        ...quotationData.items,
        {
          productId: product._id,
          itemName: product.itemname,
          itemcode: product.itemcode,
          quantity: 1,
          unitPrice: product.salesprice || 0,
          lineAmount: product.salesprice || 0,
          unitCost: product.cost || 0,
          lineCost: product.cost || 0,
          discountPercentage: 0,
          discountAmount: 0,
          amountAfterDiscount: product.salesprice || 0,
          vatPercentage: 0,
          vatAmount: 0,
          total: product.salesprice || 0,
          serialNumbers: [],
          note: "",
        },
      ];
    }
    setQuotationData((prev) => ({ ...prev, items: newItems }));
    calculateTotals(newItems);
    showToast(`Added: ${product.itemname}`, "success");
  };

  const addItemFromSearch = () => {
    if (selectedSearchIndex >= 0 && selectedSearchIndex < products.length) {
      addItemByBarcode(products[selectedSearchIndex]);
      setItemSearch("");
      setShowSearchDropdown(false);
      setSelectedSearchIndex(0);
      searchInputRef.current?.focus();
    }
  };

  const handleCustomerSelect = (customer) => {
    setSelectedCustomerId(customer._id);
    setSelectedCustomerDetails(customer);
    setQuotationData((prev) => ({
      ...prev,
      partyName: customer.name,
      partyPhone: customer.phone || "",
      partyTRN: customer.customerTRN || "",
      partyAddress: customer.address || "",
      partyContact: customer.contactPerson || "",
    }));
    setShowCustomerDropdown(false);
    setCustomerSearch("");
  };

  const filteredCustomers = customerSearch
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase())
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
      newItems[index].lineAmount = newItems[index].quantity * newItems[index].unitPrice;
      newItems[index].lineCost = newItems[index].quantity * newItems[index].unitCost;
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
      newItems[index].amountAfterDiscount =
        newItems[index].lineAmount - value;
    }

    if (field === "productId") {
      const product = products.find((p) => p._id === value);
      if (product) {
        newItems[index].itemName = product.itemname;
        newItems[index].itemcode = product.itemcode;
        newItems[index].unitPrice = product.salesprice || 0;
        newItems[index].unitCost = product.cost || 0;
        newItems[index].lineAmount = newItems[index].quantity * (product.salesprice || 0);
        newItems[index].lineCost = newItems[index].quantity * (product.cost || 0);
      }
    }

    setQuotationData((prev) => ({ ...prev, items: newItems }));
    if (field === "quantity" || field === "unitPrice" || field === "discountPercentage" || field === "discountAmount") {
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
    const netProfitMargin = totalIncludeVat > 0 ? (netProfit / totalIncludeVat) * 100 : 0;

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
      showToast("Please enter customer and add items", "error");
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
        ? `${API_URL}/api/v1/quotations/updateQuotation/${editId}`
        : `${API_URL}/api/v1/quotations/createQuotation`;

      const response = await axios[editId ? "put" : "post"](url, payload);

      showToast(
        editId ? "Quotation updated successfully" : "Quotation created successfully",
        "success"
      );

      if (!editId) {
        setQuotationData({
          quotationNo: response.data.quotationNumber,
          quotationDate: new Date().toISOString().split("T")[0],
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
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
      showToast(err.response?.data?.error || "Error saving quotation", "error");
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
        await axios.delete(`${API_URL}/api/v1/quotations/deleteQuotation/${id}`);
        setQuotations(quotations.filter((q) => q._id !== id));
        showToast("Quotation deleted successfully", "success");
      } catch (err) {
        showToast("Error deleting quotation", "error");
      }
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(`${API_URL}/api/v1/quotations/updateStatus/${id}`, {
        status: newStatus,
      });
      setQuotations(
        quotations.map((q) =>
          q._id === id ? { ...q, status: newStatus } : q
        )
      );
      showToast("Status updated successfully", "success");
    } catch (err) {
      showToast("Error updating status", "error");
    }
  };

  const handleTableCellKeyDown = (e, index, field) => {
    const itemCount = quotationData.items.length;
    let nextRow = index;
    let nextField = field;

    if (e.key === "Tab") {
      e.preventDefault();
      const fields = ["productId", "quantity", "unitPrice", "discountPercentage"];
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
      !historyDateFilter ||
      q.date.split("T")[0] === historyDateFilter;
    const matchesSearch =
      !historySearch ||
      q.quotationNumber.includes(historySearch) ||
      q.customerName.toLowerCase().includes(historySearch.toLowerCase());
    const matchesStatus =
      filteredHistoryStatus === "All" || q.status === filteredHistoryStatus;

    return matchesDate && matchesSearch && matchesStatus;
  });

  const statusColors = {
    Draft: "bg-gray-100 text-gray-800",
    Sent: "bg-blue-100 text-blue-800",
    Accepted: "bg-green-100 text-green-800",
    Rejected: "bg-red-100 text-red-800",
    Expired: "bg-yellow-100 text-yellow-800",
    Converted: "bg-purple-100 text-purple-800",
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-100 overflow-hidden">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              toast.type === "success"
                ? "bg-green-500 text-white"
                : toast.type === "error"
                ? "bg-red-500 text-white"
                : "bg-blue-500 text-white"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* HEADER - Fixed at top */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 shadow-lg z-10">
        <div className="flex justify-between gap-6">
          <div className="flex items-start gap-3">
            <div>
              <h1 className="text-lg font-bold">Quotation</h1>
              <div className="bg-white/20 px-3 py-1.5 rounded-lg mt-2 inline-block">
                <span className="text-xs text-blue-200">Quotation #</span>
                <p className="font-bold text-xs">{quotationData.quotationNo}</p>
                <p className="font-bold text-xs text-blue-100">{quotationData.quotationDate}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowHistoryModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 border border-blue-400/50 rounded-lg text-white font-medium text-xs transition"
            >
              <Clock size={16} />
              History
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await axios.get(`${API_URL}/api/v1/products/getproducts?limit=50000`);  // ✅ Fetch up to 50k products
                  setProducts(res.data.products || res.data);
                  setItemSearch("");
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
        </div>
      </div>

      {/* CONTENT AREA - Scrollable */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4">

        {/* Main Form */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-blue-900">
              {editId ? "Edit Quotation" : "New Quotation"}
            </h2>
            {editId && (
              <button
                onClick={() => {
                  setEditId(null);
                  setQuotationData({
                    quotationNo: "001",
                    quotationDate: new Date().toISOString().split("T")[0],
                    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
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
                }}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                New Quotation
              </button>
            )}
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-3 pb-3 border-b border-blue-200">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <Hash className="inline w-3 h-3 mr-1" />
                Quotation No.
              </label>
              <input
                type="text"
                value={quotationData.quotationNo}
                disabled
                className="w-full px-2 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <Calendar className="inline w-3 h-3 mr-1" />
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
                className="w-full px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <Clock className="inline w-3 h-3 mr-1" />
                Expiry Date
              </label>
              <input
                type="date"
                value={quotationData.expiryDate}
                onChange={(e) =>
                  setQuotationData((prev) => ({
                    ...prev,
                    expiryDate: e.target.value,
                  }))
                }
                className="w-full px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <FileText className="inline w-3 h-3 mr-1" />
                Status
              </label>
              <select
                value={quotationData.status}
                onChange={(e) =>
                  setQuotationData((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
                className="w-full px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
                <option value="Expired">Expired</option>
                <option value="Converted">Converted</option>
              </select>
            </div>
          </div>

          {/* Customer Selection */}
          <div className="mb-3 pb-3 border-b border-blue-200">
            <label className="block text-xs font-medium text-gray-700 mb-2">
              <User className="inline w-3 h-3 mr-1" />
              Select Customer
            </label>

            <div className="relative mb-2" ref={customerDropdownRef}>
              <input
                type="text"
                placeholder="Search and select customer..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="w-full px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {showCustomerDropdown && (
                <div className="absolute top-full left-0 right-0 bg-white border border-blue-300 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto mt-1">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer, idx) => (
                      <button
                        key={customer._id}
                        onClick={() => handleCustomerSelect(customer)}
                        onMouseEnter={() => setHoveredCustomer(idx)}
                        className={`w-full px-2 py-1 text-left text-xs hover:bg-blue-50 ${
                          hoveredCustomer === idx ? "bg-blue-100" : ""
                        }`}
                      >
                        <div className="font-medium text-gray-900 text-xs">{customer.name}</div>
                        <div className="text-xs text-gray-600">
                          {customer.phone} • {customer.customerCode}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-gray-600">No customers found</div>
                  )}
                </div>
              )}
            </div>

            {/* Selected Customer Details */}
            {selectedCustomerDetails && (
              <div className="bg-white/20 rounded-lg px-3 py-1.5 border border-blue-400/50 h-auto overflow-hidden">
                <div className="flex gap-4 text-xs flex-wrap">
                  <div>
                    <span className="text-blue-200 font-semibold block">Name</span>
                    <span className="text-white font-semibold">{quotationData.partyName}</span>
                  </div>
                  <div>
                    <span className="text-blue-200 font-semibold block">Phone</span>
                    <span className="text-white font-semibold">{quotationData.partyPhone || "-"}</span>
                  </div>
                  <div>
                    <span className="text-blue-200 font-semibold block">TRN</span>
                    <span className="text-white font-semibold">{quotationData.partyTRN || "-"}</span>
                  </div>
                  <div>
                    <span className="text-blue-200 font-semibold block">Address</span>
                    <span className="text-white font-semibold text-xs">{quotationData.partyAddress || "-"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Barcode Scanner */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-xs font-medium text-gray-700 flex-1">
                <ScanBarcode className="inline w-3 h-3 mr-1" />
                Barcode Scanner
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={scannerActive}
                  onChange={(e) => setScannerActive(e.target.checked)}
                  className="rounded"
                />
                Active
              </label>
            </div>
            <input
              ref={scannerInputRef}
              type="text"
              value={scannerInput}
              onChange={(e) => setScannerInput(e.target.value)}
              placeholder="Scan barcode here..."
              disabled={!scannerActive}
              className="w-full px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          {/* Product Search */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-2">
              <Search className="inline w-3 h-3 mr-1" />
              Search & Add Products
            </label>
            <div className="flex gap-1">
              <div className="flex-1 relative" ref={searchDropdownRef}>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={itemSearch}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    setShowSearchDropdown(true);
                  }}
                  onFocus={() => setShowSearchDropdown(true)}
                  placeholder="Search product by name or code..."
                  className="w-full px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {showSearchDropdown && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-blue-300 rounded-lg shadow-xl z-10 max-h-72 overflow-y-auto mt-1">
                    <div className="text-[10px] text-gray-400 px-4 py-2 border-b bg-gray-50 sticky top-0 flex justify-between">
                      <span>↑↓ Navigate • Enter to add • Esc to close</span>
                    </div>
                    {products
                      .filter(
                        (p) =>
                          p.itemname.toLowerCase().includes(itemSearch.toLowerCase()) ||
                          p.itemcode.toLowerCase().includes(itemSearch.toLowerCase())
                      )
                      .slice(0, 20)
                      .map((product, idx) => (
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
                              <p className="font-semibold text-gray-800 text-sm">{product.itemname}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                <span className="font-mono bg-gray-100 px-1 rounded">{product.itemcode}</span>
                                {product.barcode && <><span className="mx-2">•</span><span className="font-mono">{product.barcode}</span></>}
                              </p>
                            </div>
                            <div className="text-right mr-3">
                              <p className="font-bold text-blue-600 text-sm">{product.salesprice?.toFixed(2)}</p>
                              <p className="text-xs text-gray-400">Stock: {product.stock || 0}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <button
                onClick={addItemFromSearch}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-blue-100 text-blue-900 text-xs">
                <tr>
                  <th className="px-2 py-1 text-left">#</th>
                  <th className="px-2 py-1 text-left">Product</th>
                  <th className="px-2 py-1 text-right">Qty</th>
                  <th className="px-2 py-1 text-right">Unit Price</th>
                  <th className="px-2 py-1 text-right">Discount %</th>
                  <th className="px-2 py-1 text-right">Net Amount</th>
                  <th className="px-2 py-1 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotationData.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-blue-50 text-xs">
                    <td className="px-2 py-1">{idx + 1}</td>
                    <td className="px-2 py-1">
                      <select
                        ref={(el) => {
                          itemInputRefs.current[`item_${idx}_productId`] = el;
                        }}
                        value={item.productId}
                        onChange={(e) =>
                          handleItemChange(idx, "productId", e.target.value)
                        }
                        onKeyDown={(e) =>
                          handleTableCellKeyDown(e, idx, "productId")
                        }
                        className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select product</option>
                        {products.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.itemname} ({p.itemcode})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input
                        ref={(el) => {
                          itemInputRefs.current[`item_${idx}_quantity`] = el;
                        }}
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(idx, "quantity", parseFloat(e.target.value))
                        }
                        onKeyDown={(e) =>
                          handleTableCellKeyDown(e, idx, "quantity")
                        }
                        className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        ref={(el) => {
                          itemInputRefs.current[`item_${idx}_unitPrice`] = el;
                        }}
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(idx, "unitPrice", parseFloat(e.target.value))
                        }
                        onKeyDown={(e) =>
                          handleTableCellKeyDown(e, idx, "unitPrice")
                        }
                        className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        ref={(el) => {
                          itemInputRefs.current[`item_${idx}_discountPercentage`] =
                            el;
                        }}
                        type="number"
                        value={item.discountPercentage}
                        onChange={(e) =>
                          handleItemChange(
                            idx,
                            "discountPercentage",
                            parseFloat(e.target.value)
                          )
                        }
                        onKeyDown={(e) =>
                          handleTableCellKeyDown(e, idx, "discountPercentage")
                        }
                        className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                      />
                    </td>
                    <td className="px-2 py-1 text-right font-semibold text-gray-900 text-xs">
                      PKR {item.amountAfterDiscount.toFixed(2)}
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-red-600 hover:text-red-800 inline-flex items-center"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {quotationData.items.length === 0 && (
              <div className="w-full p-4 text-center text-xs text-gray-500">
                No items added yet. Add products using barcode scanner or search.
              </div>
            )}
          </div>

          {/* Add Item Button */}
          <div className="mb-3">
            <button
              onClick={addItem}
              className="px-3 py-1 text-sm border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Blank Item
            </button>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-xs text-gray-600 mb-1">Subtotal</p>
              <p className="text-lg font-bold text-blue-900">
                PKR {quotationData.subtotal?.toFixed(2) || "0.00"}
              </p>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-3 rounded-lg border border-yellow-200">
              <p className="text-xs text-gray-600 mb-1">After Discount</p>
              <p className="text-lg font-bold text-yellow-900">
                PKR {quotationData.totalAfterDiscount?.toFixed(2) || "0.00"}
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
              <p className="text-xs text-gray-600 mb-1">Total (VAT Incl.)</p>
              <p className="text-lg font-bold text-green-900">
                PKR {quotationData.totalIncludeVat?.toFixed(2) || "0.00"}
              </p>
            </div>
          </div>

          {/* Discount Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3 pb-3 border-b border-blue-200">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Discount %
              </label>
              <input
                type="number"
                value={quotationData.discount}
                onChange={(e) => {
                  const discPercentage = parseFloat(e.target.value) || 0;
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
                className="w-full px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Discount Amount
              </label>
              <input
                type="number"
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
                className="w-full px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Terms and Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Terms & Conditions
              </label>
              <textarea
                value={quotationData.terms}
                onChange={(e) =>
                  setQuotationData((prev) => ({
                    ...prev,
                    terms: e.target.value,
                  }))
                }
                placeholder="Enter terms and conditions..."
                rows="2"
                className="w-full px-2 py-1 text-xs border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={quotationData.notes}
                onChange={(e) =>
                  setQuotationData((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                placeholder="Additional notes..."
                rows="2"
                className="w-full px-2 py-1 text-xs border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setEditId(null);
                setQuotationData({
                  quotationNo: "001",
                  quotationDate: new Date().toISOString().split("T")[0],
                  expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
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
              }}
              className="px-4 py-2 text-sm border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              Reset
            </button>

            <button
              onClick={handleSaveQuotation}
              disabled={loading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-1 disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              {loading
                ? "Saving..."
                : editId
                ? "Update Quotation"
                : "Save Quotation"}
            </button>
          </div>
        </div>

          {/* Quotations History */}
        <div className="bg-white rounded-lg shadow p-4 mt-4">
          <h2 className="text-lg font-bold text-blue-900 mb-3">Quotation History</h2>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3 pb-3 border-b border-blue-200">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={historyDateFilter}
                onChange={(e) => setHistoryDateFilter(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filteredHistoryStatus}
                onChange={(e) => setFilteredHistoryStatus(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Status</option>
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
                <option value="Expired">Expired</option>
                <option value="Converted">Converted</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Search by customer or quotation number..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Quotations Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-blue-100 text-blue-900 text-xs">
                <tr>
                  <th className="px-2 py-2 text-left">Quotation #</th>
                  <th className="px-2 py-2 text-left">Customer</th>
                  <th className="px-2 py-2 text-left">Date</th>
                  <th className="px-2 py-2 text-right">Total</th>
                  <th className="px-2 py-2 text-center">Status</th>
                  <th className="px-2 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotations.length > 0 ? (
                  filteredQuotations.map((quotation) => (
                    <tr
                      key={quotation._id}
                      className="border-b border-gray-200 hover:bg-blue-50 text-xs"
                    >
                      <td className="px-2 py-2 font-semibold text-gray-900">
                        {quotation.quotationNumber}
                      </td>
                      <td className="px-2 py-2 text-gray-700">
                        {quotation.customerName}
                      </td>
                      <td className="px-2 py-2 text-gray-700">
                        {new Date(quotation.date).toLocaleDateString()}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold text-gray-900">
                        PKR {quotation.totalIncludeVat?.toFixed(2) || "0.00"}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <select
                          value={quotation.status}
                          onChange={(e) =>
                            handleStatusChange(quotation._id, e.target.value)
                          }
                          className={`px-1 py-0.5 rounded text-xs font-semibold ${
                            statusColors[quotation.status] || statusColors.Draft
                          } border-0 cursor-pointer`}
                        >
                          <option value="Draft">Draft</option>
                          <option value="Sent">Sent</option>
                          <option value="Accepted">Accepted</option>
                          <option value="Rejected">Rejected</option>
                          <option value="Expired">Expired</option>
                          <option value="Converted">Converted</option>
                        </select>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => handleEditQuotation(quotation)}
                            className="p-0.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => {
                              setViewedQuotation(quotation);
                              setShowHistoryModal(true);
                            }}
                            className="p-0.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                            title="View"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuotation(quotation._id)}
                            className="p-0.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-3 text-center text-xs text-gray-500">
                      No quotations found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
                <p className="font-semibold text-xs">{viewedQuotation.customerName}</p>
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
                  {new Date(viewedQuotation.expiryDate).toLocaleDateString()}
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
                      <td className="px-1 py-1 text-right">{item.quantity}</td>
                      <td className="px-1 py-1 text-right">
                        PKR {item.unitPrice?.toFixed(2)}
                      </td>
                      <td className="px-1 py-1 text-right font-semibold">
                        PKR {item.total?.toFixed(2)}
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
    </div>
    </div>
  );
};

export default Quotation;


