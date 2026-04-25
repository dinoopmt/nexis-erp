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
import { useProductSearch } from "../../hooks/useProductSearch";
import { useTaxMaster } from "../../hooks/useTaxMaster";
import GlobalDocumentPrintingComponent from "../shared/printing/GlobalDocumentPrintingComponent";

const SalesOrder = () => {
  // Get company data for country-based filtering
  const { company } = useTaxMaster();
  const [itemSearch, setItemSearch] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [scannerInput, setScannerInput] = useState("");
  const [scannerActive, setScannerActive] = useState(true);
  const [lastScanTime, setLastScanTime] = useState(0);

  // ✅ Product Search Hook - Centralized search with Meilisearch + fallback
  const { results: searchResults } = useProductSearch(
    itemSearch,
    300,  // 300ms debounce
    1,    // always page 1 (no pagination needed)
    100,  // fetch up to 100 for dropdown
    true  // use fallback
  );
  const scannerInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchDropdownRef = useRef(null);
  const customerDropdownRef = useRef(null);
  const barcodeBuffer = useRef("");
  const lastKeyTime = useRef(0);

  const itemInputRefs = useRef({});
  const [focusedCell, setFocusedCell] = useState(null);

  const [orderData, setOrderData] = useState({
    orderNo: "001",
    orderDate: new Date().toISOString().split("T")[0],
    deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
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

  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "info", duration = 3000) => {
    const id = Date.now();
    const toast = { id, message, type };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  // Fetch next order number
  useEffect(() => {
    const fetchNextOrderNumber = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/api/v1/sales-orders/nextOrderNumber`,
          { params: { financialYear } }
        );
        setOrderData((prev) => ({
          ...prev,
          orderNo: response.data.orderNumber,
        }));
      } catch (err) {
        console.error("Error fetching order number:", err);
      }
    };
    if (!editId) {
      fetchNextOrderNumber();
    }
  }, [financialYear, editId]);

  // ✅ No need for initial product fetch - hook handles search on demand
  // This removes the 50k products loading overhead!

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        // Country isolation: Always filter by company's country
        const countryCode = company?.countryCode || 'AE';
        const response = await axios.get(`${API_URL}/api/v1/customers/getcustomers?limit=1000&country=${countryCode}`);
        setCustomers(response.data.customers || []);
      } catch (err) {
        console.error("Error fetching customers:", err);
      }
    };
    fetchCustomers();
  }, [company]);

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/v1/sales-orders/getSalesOrders`);
        setOrders(response.data || []);
      } catch (err) {
        console.error("Error fetching orders:", err);
        showToast("Failed to load orders", "error");
      }
    };
    fetchOrders();
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
  }, [scannerActive, orderData.items]);

  useEffect(() => {
    if (scannerActive) {
      window.addEventListener("keydown", handleScannerInput);
      return () => window.removeEventListener("keydown", handleScannerInput);
    }
  }, [scannerActive, handleScannerInput]);

  const handleBarcodeScanned = async () => {
    // Search for product by barcode (using hook's search)
    try {
      const response = await axios.get(
        `${API_URL}/api/v1/products/getproducts?search=${encodeURIComponent(scannerInput)}&limit=5`
      );
      const product = response.data.products?.find(
        (p) => p.itemcode === scannerInput || p.barcode === scannerInput
      );
      if (product) {
        addItemByBarcode(product);
        setScannerInput("");
      } else {
        showToast("Product not found: " + scannerInput, "error");
      }
    } catch (err) {
      showToast("Error scanning barcode: " + err.message, "error");
    }
  };

  const addItemByBarcode = (product) => {
    const existingItem = orderData.items.find(
      (item) => item.productId === product._id
    );

    let newItems;
    if (existingItem) {
      newItems = orderData.items.map((item) =>
        item.productId === product._id
          ? {
              ...item,
              quantity: item.quantity + 1,
              lineAmount: (item.quantity + 1) * item.unitPrice,
              amountAfterDiscount: (item.quantity + 1) * item.unitPrice - item.discountAmount,
            }
          : item
      );
    } else {
      newItems = [
        ...orderData.items,
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
    setOrderData((prev) => ({ ...prev, items: newItems }));
    calculateTotals(newItems);
    showToast(`Added: ${product.itemname}`, "success");
  };

  const addItemFromSearch = () => {
    if (selectedSearchIndex >= 0 && selectedSearchIndex < searchResults.length) {
      const product = searchResults[selectedSearchIndex];
      if (product) {
        addItemByBarcode(product);
        setItemSearch("");
        setShowSearchDropdown(false);
        setSelectedSearchIndex(0);
        searchInputRef.current?.focus();
      }
    }
  };

  const handleCustomerSelect = (customer) => {
    setSelectedCustomerId(customer._id);
    setSelectedCustomerDetails(customer);
    setOrderData((prev) => ({
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
    const newItems = [...orderData.items, newItem];
    setOrderData((prev) => ({ ...prev, items: newItems }));
  };

  const removeItem = (index) => {
    const newItems = orderData.items.filter((_, i) => i !== index);
    setOrderData((prev) => ({ ...prev, items: newItems }));
    calculateTotals(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...orderData.items];
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

    setOrderData((prev) => ({ ...prev, items: newItems }));
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

    const discountAmount = orderData.discountAmount;
    const totalAfterDiscount = subtotal - discountAmount;
    const totalIncludeVat = totalAfterDiscount + totalVat;

    const grossProfit = subtotal - totalCost;
    const grossProfitMargin = subtotal > 0 ? (grossProfit / subtotal) * 100 : 0;
    const netProfit = totalIncludeVat - totalCost;
    const netProfitMargin = totalIncludeVat > 0 ? (netProfit / totalIncludeVat) * 100 : 0;

    setOrderData((prev) => ({
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

  const handleSaveOrder = async () => {
    if (!orderData.partyName || orderData.items.length === 0) {
      showToast("Please enter customer and add items", "error");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        orderNumber: orderData.orderNo,
        financialYear,
        date: new Date(orderData.orderDate),
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
        vatPercentage: 0,
        vatAmount: 0,
        totalIncludeVat: orderData.totalIncludeVat,
        totalCost: orderData.totalCost,
        grossProfit: orderData.grossProfit,
        grossProfitMargin: orderData.grossProfitMargin,
        netProfit: orderData.netProfit,
        netProfitMargin: orderData.netProfitMargin,
        totalItems: orderData.totalItems,
        totalItemQty: orderData.totalItemQty,
        notes: orderData.notes,
        terms: orderData.terms,
        status: orderData.status,
        items: orderData.items.map((item) => ({
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
        ? `${API_URL}/api/v1/sales-orders/updateSalesOrder/${editId}`
        : `${API_URL}/api/v1/sales-orders/createSalesOrder`;

      const response = await axios[editId ? "put" : "post"](url, payload);

      showToast(
        editId ? "Order updated successfully" : "Order created successfully",
        "success"
      );

      if (!editId) {
        setOrderData({
          orderNo: response.data.orderNumber,
          orderDate: new Date().toISOString().split("T")[0],
          deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
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
      setOrders([...orders, response.data]);
      
      // ✅ Return success with order ID for Save & Print flow
      return { success: true, orderId: response.data._id };
    } catch (err) {
      showToast(err.response?.data?.error || "Error saving order", "error");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // ✅ Save and Print - opens printing modal with terminal template
  const handleSaveAndPrint = async () => {
    const result = await handleSaveOrder();
    if (result?.success) {
      setSavedOrderId(result.orderId);
      setViewedOrder({ _id: result.orderId });
      setShowPrintingModal(true);
      console.log('✅ Order saved and print modal opened:', result.orderId);
    }
  };

  const handleEditOrder = (order) => {
    setEditId(order._id);
    setOrderData({
      orderNo: order.orderNumber,
      orderDate: order.date.split("T")[0],
      deliveryDate: order.deliveryDate?.split("T")[0] || "",
      paymentType: order.paymentType || "",
      paymentTerms: order.paymentTerms || "",
      partyName: order.customerName,
      partyPhone: order.customerPhone || "",
      partyTRN: order.customerTRN || "",
      partyAddress: order.customerAddress || "",
      partyContact: order.customerContact || "",
      discount: order.discountPercentage,
      discountAmount: order.discountAmount,
      items: order.items,
      notes: order.notes || "",
      terms: order.terms || "",
      status: order.status,
      subtotal: order.subtotal,
      totalAfterDiscount: order.totalAfterDiscount,
      totalIncludeVat: order.totalIncludeVat,
      totalItemQty: order.totalItemQty,
      totalItems: order.totalItems,
    });
    setSelectedCustomerId(order.customerId);
    window.scrollTo(0, 0);
  };

  const handleDeleteOrder = async (id) => {
    if (window.confirm("Are you sure you want to delete this order?")) {
      try {
        await axios.delete(`${API_URL}/api/v1/sales-orders/deleteSalesOrder/${id}`);
        setOrders(orders.filter((o) => o._id !== id));
        showToast("Order deleted successfully", "success");
      } catch (err) {
        showToast("Error deleting order", "error");
      }
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(`${API_URL}/api/v1/sales-orders/updateStatus/${id}`, {
        status: newStatus,
      });
      setOrders(
        orders.map((o) =>
          o._id === id ? { ...o, status: newStatus } : o
        )
      );
      showToast("Status updated successfully", "success");
    } catch (err) {
      showToast("Error updating status", "error");
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesDate =
      !historyDateFilter ||
      o.date.split("T")[0] === historyDateFilter;
    const matchesSearch =
      !historySearch ||
      o.orderNumber.includes(historySearch) ||
      o.customerName.toLowerCase().includes(historySearch.toLowerCase());
    const matchesStatus =
      filteredHistoryStatus === "All" || o.status === filteredHistoryStatus;

    return matchesDate && matchesSearch && matchesStatus;
  });

  const statusColors = {
    Draft: "bg-gray-100 text-gray-800",
    Confirmed: "bg-blue-100 text-blue-800",
    Processing: "bg-yellow-100 text-yellow-800",
    Shipped: "bg-purple-100 text-purple-800",
    Delivered: "bg-green-100 text-green-800",
    Cancelled: "bg-red-100 text-red-800",
  };

  const CreditCardIcon = (props) => (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="22" height="16" x="1" y="4" rx="2" />
      <path d="M1 10h22" />
    </svg>
  );

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
              <h1 className="text-lg font-bold">Sales Order</h1>
              <div className="bg-white/20 px-3 py-1.5 rounded-lg mt-2 inline-block">
                <span className="text-xs text-blue-200">Order #</span>
                <p className="font-bold text-xs">{orderData.orderNo}</p>
                <p className="font-bold text-xs text-blue-100">{orderData.orderDate}</p>
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
          {/* FORM SECTION */}
          <div className="bg-white rounded-lg shadow-md p-5 mb-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  <Calendar size={14} className="inline mr-1" /> Order Date
                </label>
                <input
                  type="date"
                  value={orderData.orderDate}
                  onChange={(e) =>
                    setOrderData((prev) => ({ ...prev, orderDate: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  <Package size={14} className="inline mr-1" /> Delivery Date
                </label>
                <input
                  type="date"
                  value={orderData.deliveryDate}
                  onChange={(e) =>
                    setOrderData((prev) => ({ ...prev, deliveryDate: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  <CreditCardIcon size={14} className="inline mr-1" /> Payment Type
                </label>
                <select
                  value={orderData.paymentType}
                  onChange={(e) =>
                    setOrderData((prev) => ({ ...prev, paymentType: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">Select...</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Online">Online Payment</option>
                  <option value="Credit">Credit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  <FileText size={14} className="inline mr-1" /> Payment Terms
                </label>
                <input
                  type="text"
                  value={orderData.paymentTerms}
                  onChange={(e) =>
                    setOrderData((prev) => ({ ...prev, paymentTerms: e.target.value }))
                  }
                  placeholder="NET 30"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* CUSTOMER SECTION */}
            <div className="mb-4 relative">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <User size={14} className="inline mr-1" /> Customer
              </label>
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Search customer by name..."
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                ref={customerDropdownRef}
              />
              {showCustomerDropdown && (
                <div className="absolute bg-white border border-gray-300 rounded-lg mt-1 w-full z-50 max-h-48 overflow-auto shadow-lg">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer) => (
                      <div
                        key={customer._id}
                        onClick={() => handleCustomerSelect(customer)}
                        onMouseEnter={() => setHoveredCustomer(customer._id)}
                        onMouseLeave={() => setHoveredCustomer(null)}
                        className={`px-3 py-2 cursor-pointer text-sm ${
                          hoveredCustomer === customer._id
                            ? "bg-blue-100"
                            : ""
                        }`}
                      >
                        <div className="font-medium text-gray-800">{customer.name}</div>
                        <div className="text-xs text-gray-500">{customer.phone}</div>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-gray-500">No customers found</div>
                  )}
                </div>
              )}

              {selectedCustomerDetails && (
                <div className="mt-2 bg-white/30 border border-blue-400/50 rounded-lg p-3 backdrop-blur-sm">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-bold text-gray-700">Name:</span>
                      <p className="text-gray-600">{selectedCustomerDetails.name}</p>
                    </div>
                    <div>
                      <span className="font-bold text-gray-700">Phone:</span>
                      <p className="text-gray-600">{selectedCustomerDetails.phone}</p>
                    </div>
                    <div>
                      <span className="font-bold text-gray-700">TRN:</span>
                      <p className="text-gray-600">{selectedCustomerDetails.customerTRN}</p>
                    </div>
                    <div>
                      <span className="font-bold text-gray-700">Address:</span>
                      <p className="text-gray-600 truncate">{selectedCustomerDetails.address}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* BARCODE SCANNER HINT */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-gray-700">
              <ScanBarcode size={14} className="inline mr-1 text-blue-600" />
              <span className="font-medium">Barcode Scanner:</span> Scan product barcode or press Ctrl+Shift+I to focus scanner
            </div>

            {/* PRODUCT SEARCH */}
            <div className="mb-4 relative">
              <label className="block text-sm font-bold text-gray-700 mb-1">
                <ShoppingCart size={14} className="inline mr-1" /> Add Products
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={itemSearch}
                    onChange={(e) => {
                      setItemSearch(e.target.value);
                      setShowSearchDropdown(true);
                      setSelectedSearchIndex(0);
                    }}
                    onFocus={() => setShowSearchDropdown(true)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        setSelectedSearchIndex((prev) => prev + 1);
                      } else if (e.key === "ArrowUp") {
                        setSelectedSearchIndex((prev) => (prev > 0 ? prev - 1 : 0));
                      } else if (e.key === "Enter") {
                        addItemFromSearch();
                      } else if (e.key === "Escape") {
                        setShowSearchDropdown(false);
                      }
                    }}
                    placeholder="Search product by name or item code...  (↑↓ Select, Enter Confirm, Esc Close)"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                  {showSearchDropdown && itemSearch && (
                    <div
                      ref={searchDropdownRef}
                      className="absolute bg-white border border-gray-300 rounded-lg mt-0.5 w-full z-40 max-h-48 overflow-auto shadow-lg"
                    >
                      {products
                        .filter(
                          (p) =>
                            p.itemname.toLowerCase().includes(itemSearch.toLowerCase()) ||
                            p.itemcode.toLowerCase().includes(itemSearch.toLowerCase())
                        )
                        .map((product, idx) => (
                          <div
                            key={product._id}
                            onClick={() => {
                              addItemByBarcode(product);
                            }}
                            className={`px-3 py-2 cursor-pointer text-sm border-b ${
                              idx === selectedSearchIndex
                                ? "bg-blue-100 font-medium"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <div className="font-medium text-gray-800">
                              {product.itemname}
                            </div>
                            <div className="text-xs text-gray-500">
                              {product.itemcode} • {product.salesprice}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={addItem}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm flex items-center gap-1.5 transition"
                >
                  <Plus size={16} />
                  Add Blank
                </button>
              </div>
            </div>

            {/* ITEMS TABLE */}
            <div className="mb-4 overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-xs">
                <thead className="bg-gradient-to-r from-blue-100 to-blue-50">
                  <tr>
                    <th className="border border-gray-300 px-2 py-2 text-left">#</th>
                    <th className="border border-gray-300 px-2 py-2 text-left w-48">Product</th>
                    <th className="border border-gray-300 px-2 py-2 text-right w-16">Qty</th>
                    <th className="border border-gray-300 px-2 py-2 text-right w-20">Price</th>
                    <th className="border border-gray-300 px-2 py-2 text-right w-20">Disc %</th>
                    <th className="border border-gray-300 px-2 py-2 text-right w-20">Disc Amt</th>
                    <th className="border border-gray-300 px-2 py-2 text-right w-24">After Disc</th>
                    <th className="border border-gray-300 px-2 py-2 text-center w-16">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orderData.items.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="border border-gray-300 px-2 py-2">{index + 1}</td>
                      <td className="border border-gray-300 px-2 py-2">
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemChange(index, "productId", e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
                        >
                          <option value="">Select Product</option>
                          {products.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.itemname} ({p.itemcode})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(index, "quantity", parseFloat(e.target.value) || 0)
                          }
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs text-right"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleItemChange(index, "unitPrice", parseFloat(e.target.value) || 0)
                          }
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs text-right"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercentage}
                          onChange={(e) =>
                            handleItemChange(index, "discountPercentage", parseFloat(e.target.value) || 0)
                          }
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs text-right"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          value={item.discountAmount}
                          onChange={(e) =>
                            handleItemChange(index, "discountAmount", parseFloat(e.target.value) || 0)
                          }
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs text-right"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-right font-bold text-blue-600">
                        {item.amountAfterDiscount.toFixed(2)}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-center">
                        <button
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* DISCOUNT SECTION */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Global Discount %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={orderData.discount}
                  onChange={(e) => {
                    const discount = parseFloat(e.target.value) || 0;
                    const discountAmount = (orderData.subtotal * discount) / 100;
                    setOrderData((prev) => ({
                      ...prev,
                      discount,
                      discountAmount,
                    }));
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Discount Amount
                </label>
                <input
                  type="number"
                  min="0"
                  value={orderData.discountAmount}
                  onChange={(e) => {
                    const discountAmount = parseFloat(e.target.value) || 0;
                    const discountPercentage =
                      orderData.subtotal > 0
                        ? (discountAmount / orderData.subtotal) * 100
                        : 0;
                    setOrderData((prev) => ({
                      ...prev,
                      discount: discountPercentage,
                      discountAmount,
                    }));
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* FINANCIAL SUMMARY CARDS */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-3">
                <div className="text-xs text-gray-600 font-bold">Subtotal</div>
                <div className="text-lg font-bold text-blue-700">
                  {orderData.subtotal?.toFixed(2) || "0.00"}
                </div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-300 rounded-lg p-3">
                <div className="text-xs text-gray-600 font-bold">Discount</div>
                <div className="text-lg font-bold text-red-700">
                  -{orderData.discountAmount?.toFixed(2) || "0.00"}
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-300 rounded-lg p-3">
                <div className="text-xs text-gray-600 font-bold">After Discount</div>
                <div className="text-lg font-bold text-green-700">
                  {orderData.totalAfterDiscount?.toFixed(2) || "0.00"}
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-3">
                <div className="text-xs text-gray-600 font-bold">Total</div>
                <div className="text-lg font-bold text-blue-700">
                  {orderData.totalIncludeVat?.toFixed(2) || "0.00"}
                </div>
              </div>
            </div>

            {/* NOTES & TERMS */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={orderData.notes}
                  onChange={(e) =>
                    setOrderData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Additional notes..."
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-20 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Terms & Conditions
                </label>
                <textarea
                  value={orderData.terms}
                  onChange={(e) =>
                    setOrderData((prev) => ({ ...prev, terms: e.target.value }))
                  }
                  placeholder="Terms & conditions..."
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-20 resize-none"
                />
              </div>
            </div>

            {/* STATUS & SAVE BUTTON */}
            <div className="flex justify-between items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={orderData.status}
                  onChange={(e) =>
                    setOrderData((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="Draft">Draft</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Processing">Processing</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex gap-2">
                {editId && (
                  <button
                    onClick={() => {
                      setEditId(null);
                      setOrderData({
                        orderNo: "",
                        orderDate: new Date().toISOString().split("T")[0],
                        deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
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
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium transition flex items-center gap-1.5"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleSaveOrder}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded font-medium transition flex items-center gap-1.5"
                >
                  <Save size={16} />
                  {loading ? "Saving..." : editId ? "Update Order" : "Create Order"}
                </button>
                <button
                  onClick={handleSaveAndPrint}
                  disabled={loading}
                  className="flex items-center gap-1.5 bg-purple-600 text-white px-4 py-2 rounded font-medium hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer size={16} />
                  {loading ? "Saving..." : "Save & Print"}
                </button>
              </div>
            </div>
          </div>

          {/* ORDER HISTORY MODAL */}
          {showHistoryModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 40 }}>
              <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-96 flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                  <h2 className="text-lg font-bold text-gray-800">Order History</h2>
                  <button
                    onClick={() => setShowHistoryModal(false)}
                    className="text-white bg-gray-600 hover:bg-gray-700 w-8 h-8 flex items-center justify-center rounded transition-colors text-sm"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-4 border-b flex gap-3">
                  <input
                    type="date"
                    value={historyDateFilter}
                    onChange={(e) => setHistoryDateFilter(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-1 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Search by order #..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-1 text-sm flex-1"
                  />
                  <select
                    value={filteredHistoryStatus}
                    onChange={(e) => setFilteredHistoryStatus(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-1 text-sm"
                  >
                    <option value="All">All Status</option>
                    <option value="Draft">Draft</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Processing">Processing</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="flex-1 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="border-b px-3 py-2 text-left">Order #</th>
                        <th className="border-b px-3 py-2 text-left">Customer</th>
                        <th className="border-b px-3 py-2 text-right">Total</th>
                        <th className="border-b px-3 py-2 text-center">Status</th>
                        <th className="border-b px-3 py-2 text-left">Date</th>
                        <th className="border-b px-3 py-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order._id} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-2 font-bold text-blue-600">{order.orderNumber}</td>
                          <td className="px-3 py-2">{order.customerName}</td>
                          <td className="px-3 py-2 text-right">{order.totalIncludeVat?.toFixed(2) || "0.00"}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${statusColors[order.status] || "bg-gray-100"}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-3 py-2">{order.date?.split("T")[0]}</td>
                          <td className="px-3 py-2 text-center flex gap-1">
                            <button
                              onClick={() => {
                                setViewedOrder(order);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                              title="View"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => {
                                handleEditOrder(order);
                                setShowHistoryModal(false);
                              }}
                              className="text-green-600 hover:text-green-800"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(order._id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SALES ORDER PRINTING & PDF MODAL - Terminal Template Mapped */}
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
        </div>
      </div>
    </div>
  );
};

export default SalesOrder;


