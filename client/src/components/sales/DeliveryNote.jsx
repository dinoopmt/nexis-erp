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
  Truck,
  MapPin,
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

const DeliveryNote = () => {
  const { company } = useContext(CompanyContext);
  const { formatNumber } = useDecimalFormat();

  const statusColors = {
    Draft: "bg-gray-200 text-gray-800",
    Partial: "bg-yellow-200 text-yellow-800",
    Delivered: "bg-green-200 text-green-800",
    Returned: "bg-orange-200 text-orange-800",
    Cancelled: "bg-red-200 text-red-800",
  };

  // ===== SEARCH & PRODUCT STATES =====
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

  // ===== PRODUCT SEARCH HOOK (Same as SalesOrder) =====
  const {
    results: searchResults,
    loading: searchLoading,
    metadata: searchMetadata,
  } = useProductSearch(
    itemSearch,
    300,
    productPage,
    20,
    true,
  );

  useEffect(() => {
    if (!searchResults || searchResults.length === 0) return;

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

  const loadMoreProducts = () => {
    if (!searchMetadata?.hasNextPage) return;
    setProductPage((prev) => prev + 1);
  };

  // ===== CUSTOMER & REFS =====
  const customerDropdownRef = useRef(null);
  const customerSearchInputRef = useRef(null);
  const barcodeBuffer = useRef("");
  const lastKeyTime = useRef(0);
  const scannerInputRef = useRef(null);
  const itemInputRefs = useRef({});
  const [focusedCell, setFocusedCell] = useState(null);

  // ===== DELIVERY NOTE DATA STATE =====
  const [noteData, setNoteData] = useState({
    noteNo: "",
    noteDate: new Date().toISOString().split("T")[0],
    salesOrderId: "",
    vehicleNumber: "",
    driverName: "",
    driverPhone: "",
    sealNumber: "",
    receivedBy: "",
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    items: [],
    notes: "",
    remarks: "",
    status: "Draft",
    deliveryDate: new Date().toISOString().split("T")[0],
  });

  // ===== UI STATE VARIABLES =====
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deliveryNotes, setDeliveryNotes] = useState([]);
  const [editId, setEditId] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showProductLookup, setShowProductLookup] = useState(false);
  const [viewedNote, setViewedNote] = useState(null);
  const [showPrintingModal, setShowPrintingModal] = useState(false);
  const [savedNoteId, setSavedNoteId] = useState(null);
  const [historyDateFilter, setHistoryDateFilter] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [historySearch, setHistorySearch] = useState("");
  const [filteredHistoryStatus, setFilteredHistoryStatus] = useState("All");
  const [financialYear, setFinancialYear] = useState("2025-26");

  // ===== SALES ORDER & CUSTOMER STATES =====
  const [salesOrders, setSalesOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null);
  const [hoveredCustomer, setHoveredCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerDropdownPos, setCustomerDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const [searchDropdownPos, setSearchDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const [customerType, setCustomerType] = useState("EXISTING");

  // ===== DELIVERY MODE STATES (From Sales Order or Direct Delivery) =====
  const [deliveryMode, setDeliveryMode] = useState("SALES_ORDER"); // SALES_ORDER or DIRECT
  const [showQuickCustomerForm, setShowQuickCustomerForm] = useState(false);
  const [quickCustomerData, setQuickCustomerData] = useState({
    name: "",
    phone: "",
    address: "",
  });

  // ===== ITEM NOTES & MODALS =====
  const [itemNotes, setItemNotes] = useState({});
  const [showItemNoteModal, setShowItemNoteModal] = useState(false);
  const [selectedItemNote, setSelectedItemNote] = useState(null);

  // ===== SERIAL NUMBERS STATE =====
  const [serialNumbers, setSerialNumbers] = useState({});
  const [showSerialModal, setShowSerialModal] = useState(false);
  const [selectedItemSerial, setSelectedItemSerial] = useState(null);
  const [newSerialInput, setNewSerialInput] = useState("");

  const [showUnitSelector, setShowUnitSelector] = useState(false);
  const [productForUnitSelection, setProductForUnitSelection] = useState(null);

  // ===== MEMOIZED VALUES =====
  const existingProductsMap = useMemo(() => {
    const map = new Map();
    noteData.items.forEach((item) => {
      map.set(item.productId, item);
    });
    return map;
  }, [noteData.items]);

  const productsMap = useMemo(() => {
    const map = new Map();
    products.forEach((product) => {
      map.set(product._id, product);
    });
    return map;
  }, [products]);

  // ===== LIFECYCLE HOOKS =====
  useEffect(() => {
    clearAllCache();
  }, []);

  useEffect(() => {
    if (!showCustomerDropdown || !customerSearchInputRef.current) return;

    const calculatePosition = () => {
      const inputRect = customerSearchInputRef.current.getBoundingClientRect();
      setCustomerDropdownPos({
        top: inputRect.bottom + 4,
        left: inputRect.left,
        width: inputRect.width,
      });
    };

    // Small delay to ensure DOM is ready
    setTimeout(calculatePosition, 0);
    window.addEventListener("resize", calculatePosition);
    return () => window.removeEventListener("resize", calculatePosition);
  }, [showCustomerDropdown]);

  useEffect(() => {
    if (!showSearchDropdown || !searchInputRef.current) return;

    const calculatePosition = () => {
      const inputRect = searchInputRef.current.getBoundingClientRect();
      setSearchDropdownPos({
        top: inputRect.bottom + 4,
        left: inputRect.left,
        width: inputRect.width,
      });
    };

    // Small delay to ensure DOM is ready
    setTimeout(calculatePosition, 0);
    window.addEventListener("resize", calculatePosition);
    return () => window.removeEventListener("resize", calculatePosition);
  }, [showSearchDropdown]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const dropdownElement = document.querySelector(
        "[data-customer-dropdown]",
      );
      const inputElement = customerSearchInputRef.current;

      if (dropdownElement && dropdownElement.contains(e.target)) {
        return;
      }

      if (inputElement && inputElement.contains(e.target)) {
        return;
      }

      setShowCustomerDropdown(false);
    };

    if (showCustomerDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showCustomerDropdown]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const dropdownElement = document.querySelector(
        "[data-search-dropdown]",
      );
      const inputElement = searchInputRef.current;

      if (dropdownElement && dropdownElement.contains(e.target)) {
        return;
      }

      if (inputElement && inputElement.contains(e.target)) {
        return;
      }

      setShowSearchDropdown(false);
    };

    if (showSearchDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSearchDropdown]);

  useEffect(() => {
    const fetchSalesOrders = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/sales-orders/getSalesOrders`,
        );
        setSalesOrders(response.data || []);
      } catch (err) {
        console.error("Error fetching sales orders:", err);
      }
    };
    fetchSalesOrders();
  }, []);

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
      }
    };
    fetchCustomers();
  }, [company]);

  useEffect(() => {
    const fetchDeliveryNotes = async () => {
      try {
        const response = await axios.get(`${API_URL}/delivery-notes/getDeliveryNotes`);
        setDeliveryNotes(response.data || []);
      } catch (err) {
        console.error("Error fetching delivery notes:", err);
      }
    };
    fetchDeliveryNotes();
  }, []);

  // ===== SYNC SERIAL NUMBERS TO ITEMS =====
  useEffect(() => {
    if (Object.keys(serialNumbers).length > 0) {
      const updatedItems = noteData.items.map((item, idx) => ({
        ...item,
        serialNumbers: serialNumbers[idx] || [],
      }));
      setNoteData((prev) => ({ ...prev, items: updatedItems }));
    }
  }, [serialNumbers]);

  // ===== FILTERED CUSTOMERS =====
  const filteredCustomers = customers.filter((customer) => {
    const searchLower = customerSearch.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.phone?.includes(customerSearch)
    );
  });

  // ===== HANDLERS =====
  const handleSalesOrderSelect = (orderId) => {
    const order = salesOrders.find((o) => o._id === orderId);
    if (order) {
      setNoteData((prev) => ({
        ...prev,
        salesOrderId: orderId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerAddress: order.customerAddress,
        items: order.items.map((item) => ({
          productId: item.productId,
          itemName: item.itemName,
          itemcode: item.itemcode,
          unit: item.unit || "Pcs",
          orderedQuantity: item.quantity || 0,
          deliveredQuantity: item.quantity || 0,
          batchNumber: item.batchNumber || "",
          expiryDate: item.expiryDate || "",
          remark: item.remark || "",
        })),
      }));
      setSelectedCustomerId(order.customerId);
    }
  };

  const handleCustomerSelect = (customer) => {
    setNoteData((prev) => ({
      ...prev,
      customerName: customer.name,
      customerPhone: customer.phone || "",
      customerAddress: customer.address || "",
    }));
    setSelectedCustomerId(customer._id);
    setCustomerSearch("");
    setShowCustomerDropdown(false);
  };

  const handleQuickAddCustomer = async () => {
    if (!quickCustomerData.name.trim() || !quickCustomerData.phone.trim()) {
      showToast("error", "Customer name and phone are required");
      return;
    }

    try {
      const companyCountry = company?.country || company?.countryCode || "AE";
      const response = await axios.post(
        `${API_URL}/customers/addcustomer`,
        {
          name: quickCustomerData.name.trim(),
          phone: quickCustomerData.phone.trim(),
          address: quickCustomerData.address.trim(),
          email: `${quickCustomerData.name.trim().replace(/\s+/g, "")}@delivery.local`,
          paymentType: "Cash",
          country: companyCountry,
          status: "Active",
        },
      );

      const newCustomer = response.data.customer;
      setCustomers((prev) => [newCustomer, ...prev]);
      handleCustomerSelect(newCustomer);
      setShowQuickCustomerForm(false);
      setQuickCustomerData({ name: "", phone: "", address: "" });
      showToast("success", "Customer created successfully");
    } catch (err) {
      showToast(
        "error",
        err.response?.data?.message || "Error creating customer",
      );
    }
  };

  const handleBarcodeScanned = () => {
    const product = products.find(
      (p) => p.itemcode === scannerInput || p.barcode === scannerInput,
    );
    if (product) {
      handleAddItem(product);
      setScannerInput("");
    }
  };

  const handleAddItem = (product) => {
    const existingItem = noteData.items.find(
      (item) => item.productId === product._id,
    );

    if (existingItem) {
      const newItems = noteData.items.map((item) =>
        item.productId === product._id
          ? { ...item, deliveredQuantity: (item.deliveredQuantity || 0) + 1 }
          : item,
      );
      setNoteData((prev) => ({ ...prev, items: newItems }));
    } else {
      // ✅ Check if product exists in selected sales order and use its quantity
      let orderedQty = 1; // Default fallback
      if (noteData.salesOrderId && salesOrders.length > 0) {
        const selectedOrder = salesOrders.find(
          (o) => o._id === noteData.salesOrderId,
        );
        const orderItem = selectedOrder?.items?.find(
          (item) => item.productId === product._id,
        );
        if (orderItem) {
          orderedQty = orderItem.quantity || 1;
          console.log(
            `✅ Found product in order: qty=${orderedQty}`,
            product.itemcode,
          );
        }
      }

      const newItem = {
        productId: product._id,
        itemName: product.itemname || product.name,
        itemcode: product.itemcode,
        unit: product.unit || "Pcs",
        orderedQuantity: orderedQty,
        deliveredQuantity: orderedQty,
        batchNumber: "",
        expiryDate: "",
        remark: "",
      };
      setNoteData((prev) => ({
        ...prev,
        items: [...prev.items, newItem],
      }));
    }
  };

  const removeItem = (index) => {
    setNoteData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
    setItemNotes((prev) => {
      const newNotes = { ...prev };
      delete newNotes[index];
      return newNotes;
    });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...noteData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setNoteData((prev) => ({ ...prev, items: newItems }));
  };

  const handleTableCellKeyDown = (e, index, field) => {
    const itemCount = noteData.items.length;
    let nextRow = index;
    let nextField = field;

    if (e.key === "Tab") {
      e.preventDefault();
      const fields = ["deliveredQuantity", "unitPrice"];
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

  const handleSaveDeliveryNote = async (mode = "save") => {
    if (!noteData.customerName || noteData.items.length === 0) {
      showToast("error", "Please select customer and add items");
      return;
    }

    try {
      setLoading(true);

      let noteNumber = noteData.noteNo;
      if (!noteNumber && !editId) {
        try {
          const nextNumberResponse = await axios.get(
            `${API_URL}/delivery-notes/nextDeliveryNoteNumber?financialYear=${financialYear}`,
          );
          noteNumber = nextNumberResponse.data.deliveryNoteNumber;
        } catch (err) {
          console.error("Error generating delivery note number:", err);
          showToast("error", "Failed to generate delivery note number");
          return;
        }
      }

      let status = noteData.status;
      if (mode === "draft") {
        status = "Draft";
      }

      const payload = {
        deliveryNoteNumber: noteNumber,
        financialYear,
        date: new Date(noteData.noteDate),
        deliveryDate: new Date(noteData.deliveryDate),
        ...(noteData.salesOrderId && { salesOrderId: noteData.salesOrderId }),
        customerId: selectedCustomerId,
        customerName: noteData.customerName,
        customerPhone: noteData.customerPhone,
        customerAddress: noteData.customerAddress,
        vehicleNumber: noteData.vehicleNumber,
        driverName: noteData.driverName,
        driverPhone: noteData.driverPhone,
        sealNumber: noteData.sealNumber,
        receivedBy: noteData.receivedBy,
        totalOrderedQuantity: noteData.items.reduce(
          (sum, item) => sum + item.orderedQuantity,
          0,
        ),
        totalDeliveredQuantity: noteData.items.reduce(
          (sum, item) => sum + item.deliveredQuantity,
          0,
        ),
        totalItems: noteData.items.length,
        notes: noteData.notes,
        remarks: noteData.remarks,
        status: status,
        items: noteData.items.map((item, idx) => ({
          productId: item.productId,
          itemName: item.itemName,
          itemcode: item.itemcode,
          orderedQuantity: item.orderedQuantity,
          deliveredQuantity: item.deliveredQuantity,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          serialNumbers: serialNumbers[idx] || [],
          note: itemNotes[idx] || item.note || "",
          remark: item.remark || "",
        })),
      };

      const url = editId
        ? `${API_URL}/delivery-notes/updateDeliveryNote/${editId}`
        : `${API_URL}/delivery-notes/createDeliveryNote`;

      const response = await axios[editId ? "put" : "post"](url, payload);

      showToast(
        "success",
        editId
          ? "Delivery Note updated successfully"
          : "Delivery Note created successfully",
      );

      if (mode === "print" && response.data._id) {
        setSavedNoteId(response.data._id);
        setViewedNote(response.data);
        setShowPrintingModal(true);
      }

      if (editId) {
        setDeliveryNotes(
          deliveryNotes.map((n) => (n._id === editId ? response.data : n)),
        );
      } else {
        setDeliveryNotes([...deliveryNotes, response.data]);
      }

      setNoteData({
        noteNo: "",
        noteDate: new Date().toISOString().split("T")[0],
        deliveryDate: new Date().toISOString().split("T")[0],
        salesOrderId: "",
        vehicleNumber: "",
        driverName: "",
        driverPhone: "",
        sealNumber: "",
        receivedBy: "",
        customerName: "",
        customerPhone: "",
        customerAddress: "",
        items: [],
        notes: "",
        remarks: "",
        status: "Draft",
      });
      setSelectedCustomerId(null);
      setEditId(null);
      setItemNotes({});
      setSerialNumbers({});
    } catch (err) {
      console.error("Delivery Note save error:", err);
      showToast(
        "error",
        err.response?.data?.error || "Error saving delivery note",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditDeliveryNote = (note) => {
    setEditId(note._id);
    setNoteData({
      noteNo: note.deliveryNoteNumber,
      noteDate: note.date?.split("T")[0] ?? "",
      deliveryDate: note.deliveryDate?.split("T")[0] ?? "",
      salesOrderId: note.salesOrderId || "",
      vehicleNumber: note.vehicleNumber || "",
      driverName: note.driverName || "",
      driverPhone: note.driverPhone || "",
      sealNumber: note.sealNumber || "",
      receivedBy: note.receivedBy || "",
      customerName: note.customerName,
      customerPhone: note.customerPhone || "",
      customerAddress: note.customerAddress || "",
      items: note.items || [],
      notes: note.notes || "",
      remarks: note.remarks || "",
      status: note.status,
    });

    const notesMap = {};
    const restoredSerials = {};
    note.items.forEach((item, idx) => {
      if (item.note) {
        notesMap[idx] = item.note;
      }
      // Restore serial numbers from items
      if (item.serialNumbers?.length > 0) {
        restoredSerials[idx] = item.serialNumbers;
      }
    });
    setItemNotes(notesMap);
    setSerialNumbers(restoredSerials);
    setSelectedCustomerId(note.customerId);
    window.scrollTo(0, 0);
  };

  const handleDeleteDeliveryNote = async (id) => {
    if (
      window.confirm("Are you sure you want to delete this delivery note?")
    ) {
      try {
        await axios.delete(`${API_URL}/delivery-notes/deleteDeliveryNote/${id}`);
        setDeliveryNotes(deliveryNotes.filter((n) => n._id !== id));
        showToast("success", "Delivery note deleted successfully");
      } catch (err) {
        showToast("error", "Error deleting delivery note");
      }
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(
        `${API_URL}/delivery-notes/updateStatus/${id}`,
        { status: newStatus },
      );
      setDeliveryNotes(
        deliveryNotes.map((n) =>
          n._id === id ? { ...n, status: newStatus } : n,
        ),
      );
      showToast("success", "Status updated successfully");
    } catch (err) {
      showToast("error", "Error updating status");
    }
  };

  const handleHistoryPreview = (note) => {
    setViewedNote({ _id: note._id });
    setShowPrintingModal(true);
  };

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSearchIndex((prev) =>
        Math.min(prev + 1, products.length - 1),
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSearchIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (products[selectedSearchIndex]) {
        handleAddItem(products[selectedSearchIndex]);
        setItemSearch("");
        setShowSearchDropdown(false);
      }
    }
  }, [products, selectedSearchIndex]);

  const filteredNotes = deliveryNotes.filter((note) => {
    const noteDate = new Date(note.date).toISOString().split("T")[0];
    const dateMatch = noteDate === historyDateFilter;

    if (!historySearch.trim()) {
      if (filteredHistoryStatus === "All") return dateMatch;
      return dateMatch && note.status === filteredHistoryStatus;
    }

    const searchLower = historySearch.toLowerCase();
    const customerNameMatch = note.customerName
      ?.toLowerCase()
      .includes(searchLower);
    const noteNumberMatch = note.deliveryNoteNumber
      ?.toString()
      .includes(historySearch);

    const statusMatch =
      filteredHistoryStatus === "All" || note.status === filteredHistoryStatus;
    return dateMatch && statusMatch && (customerNameMatch || noteNumberMatch);
  });

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-100 overflow-hidden">
      {/* HEADER - Fixed at top */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 shadow-lg z-10">
        <div className="flex justify-between gap-6 items-center">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold">Delivery Note</h1>
              <div
                className={`px-3 py-1.5 rounded-lg mt-2 inline-block ${
                  noteData.noteNo ? "bg-white/20" : "bg-blue-300/40"
                }`}
              >
                <p
                  className={`font-bold text-xs ${
                    noteData.noteNo
                      ? "text-white"
                      : "text-blue-100 italic"
                  }`}
                >
                  {noteData.noteNo || "Generated on Save"}
                </p>
              </div>
            </div>

            <div className="border-l border-white/30 pl-4">
              <label className="block text-xs font-medium text-white/80 mb-1">
                Delivery Date
              </label>
              <input
                type="date"
                value={noteData.deliveryDate}
                onChange={(e) =>
                  setNoteData((prev) => ({
                    ...prev,
                    deliveryDate: e.target.value,
                  }))
                }
                className="px-2 py-1 text-xs text-black border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50"
              />
            </div>

            <div className="border-l border-white/30 pl-4 flex flex-col gap-2">
              <label className="block text-xs font-medium text-white/80">
                Delivery Mode
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeliveryMode("SALES_ORDER")}
                  className={`px-3 py-1 text-xs font-medium rounded transition ${
                    deliveryMode === "SALES_ORDER"
                      ? "bg-white text-blue-600"
                      : "bg-blue-500/30 text-white hover:bg-blue-500/50"
                  }`}
                >
                  From Order
                </button>
                <button
                  onClick={() => setDeliveryMode("DIRECT")}
                  className={`px-3 py-1 text-xs font-medium rounded transition ${
                    deliveryMode === "DIRECT"
                      ? "bg-white text-blue-600"
                      : "bg-blue-500/30 text-white hover:bg-blue-500/50"
                  }`}
                >
                  Direct Delivery
                </button>
              </div>
            </div>

            {deliveryMode === "SALES_ORDER" ? (
              <div className="border-l border-white/30 pl-4">
                <label className="block text-xs font-medium text-white/80 mb-1">
                  Sales Order
                </label>
                <select
                  value={noteData.salesOrderId}
                  onChange={(e) => handleSalesOrderSelect(e.target.value)}
                  className="px-2 py-1 text-xs text-black border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50"
                >
                  <option value="">Select Order</option>
                  {salesOrders.map((order) => (
                    <option key={order._id} value={order._id}>
                      {order.orderNumber} - {order.customerName}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="border-l border-white/30 pl-4 flex flex-col gap-2 min-w-[300px]">
                <label className="block text-xs font-medium text-white/80">
                  Customer
                </label>
                <div className="flex gap-1.5">
                  <div className="flex-1">
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
                      className="w-full px-2 py-1 text-xs text-black border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50"
                    />
                  </div>
                  <button
                    onClick={() => setShowQuickCustomerForm(!showQuickCustomerForm)}
                    className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition"
                    title="Quick add customer"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}

          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-black/10 hover:bg-white/20 border border-white-400/50 rounded-lg text-white font-medium text-xs transition"
            >
              <Clock size={16} />
              History
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden overflow-y-scroll">
        <div className="w-full flex flex-col h-full">
          <div className="bg-white rounded-lg shadow flex flex-col flex-1 min-h-0 mx-4 mt-4 mb-4 overflow-visible">
            {/* PRODUCT SEARCH SECTION */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 flex-shrink-0 sticky top-0 z-40 overflow-hidden">
              <div className="p-4 bg-gray-50 flex-shrink-0 sticky z-30 overflow-hidden">
                <div className="grid grid-cols-2 gap-4 min-h-30">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      <Search className="inline w-3 h-3 mr-1" />
                      Search & Add Products
                    </label>
                    <div className="relative overflow-visible" ref={searchDropdownRef}>
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={itemSearch}
                        onChange={(e) => {
                          setItemSearch(e.target.value);
                          setShowSearchDropdown(e.target.value.trim().length > 0);
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

                  {/* CUSTOMER INFO DISPLAY */}
                  <div className="flex justify-end">
                    <div className="w-[400px] h-20 overflow-hidden">
                      {noteData.customerName && noteData.customerName.trim() ? (
                        <div className="bg-white border-2 border-green-300 rounded-lg p-2 shadow-sm h-20 flex flex-col">
                          <div className="space-y-0.5 flex-1 min-h-0 overflow-hidden">
                            <div>
                              <p className="text-xs pl-4 text-gray-900 line-clamp-1">
                                Name - {noteData.customerName}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs pl-4 text-gray-900">
                                Contact - {noteData.customerPhone || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs pl-4 text-gray-900 line-clamp-1">
                                Address - {noteData.customerAddress || "-"}
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
                              Select from Sales Order
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* DELIVERY DETAILS SECTION */}
              
            </div>

            {/* ==================== ITEMS SECTION ==================== */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-blue-200 flex flex-col min-h-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-blue-200 bg-blue-50">
                <h3 className="text-sm font-bold text-gray-900">
                  Delivery Items
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
                      <th className="text-center px-2 py-3 w-16">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {noteData.items.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="text-center py-16 text-gray-400"
                        >
                          <p className="text-xs">
                            No items added. Search above to add items or select a Sales Order
                          </p>
                        </td>
                      </tr>
                    ) : (
                      noteData.items.map((item, idx) => {
                        const amount =
                          (item.deliveredQuantity || 0) * (item.unitPrice || item.price || 0);

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
                                {item.serialNumbers?.length > 0 && (
                                  <p className="text-xs italic text-blue-600 mt-1">
                                    Serials: {item.serialNumbers.join(", ")}
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

                            {/* Quantity (Delivered) */}
                            <td className="px-2 py-2 text-center w-20">
                              <input
                                ref={(el) => {
                                  itemInputRefs.current[
                                    `item_${idx}_deliveredQuantity`
                                  ] = el;
                                }}
                                type="number"
                                inputMode="numeric"
                                step="1"
                                min="0"
                                max={item.orderedQuantity}
                                value={item.deliveredQuantity || ""}
                                onChange={(e) =>
                                  handleItemChange(
                                    idx,
                                    "deliveredQuantity",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                onKeyDown={(e) =>
                                  handleTableCellKeyDown(e, idx, "deliveredQuantity")
                                }
                                className="w-full text-center border border-gray-200 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            </td>

                            {/* Actions */}
                            <td className="px-2 py-2 text-center w-24">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => {
                                    setSelectedItemSerial(idx);
                                    setShowSerialModal(true);
                                  }}
                                  className="text-blue-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-md transition"
                                  title="Manage serial numbers"
                                >
                                  <Hash size={16} />
                                </button>
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
              className="bg-gray-50 px-6 py-3 shadow-lg flex-shrink-0 overflow-y-auto z-20 space-y-4"
              style={{ maxHeight: "calc(100vh - 550px)", minHeight: "100px" }}
            >
              <div>
                {/* Summary Footer - Compact Row Layout (Like SalesOrder) */}
                <div className="flex flex-col gap-0.5 p-1.5 border-t bg-gray-50 flex-shrink-0">
                  {/* Summary Row 1 - Total Items and Total Quantity */}
                  <div className="flex items-center justify-between pr-2 gap-2 text-xs overflow-x-auto pb-1">
                    {/* Total Items */}
                    <div className="flex items-center justify-between gap-0.5 w-24 bg-white px-1 py-0.5 rounded border border-gray-200">
                      <span className="font-semibold text-xs">Items:</span>
                      <span className="font-bold text-blue-600 text-xs">
                        {noteData.items.length || 0}
                      </span>
                    </div>

                    {/* Total Delivered */}
                    <div className="flex items-center w-32 justify-between gap-0.5 bg-white px-1 py-0.5 rounded border border-gray-200 text-xs">
                      <span className="font-semibold">Quantity :</span>
                      <span className="font-bold text-green-600">
                        {noteData.items.reduce((sum, item) => sum + (item.deliveredQuantity || 0), 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* NOTES & REMARKS */}
            <div className="grid grid-cols-2 gap-4 p-4 border-t bg-gray-50">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={noteData.notes}
                  onChange={(e) =>
                    setNoteData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Delivery notes..."
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-20 resize-none"
                />
              </div>

               <div className="flex justify-end items-end gap-4 p-4 border-t bg-white">
              <div className="flex gap-2 flex-shrink-0">
                {editId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(null);
                      setNoteData({
                        noteNo: "",
                        noteDate: new Date().toISOString().split("T")[0],
                        deliveryDate: new Date().toISOString().split("T")[0],
                        salesOrderId: "",
                        vehicleNumber: "",
                        driverName: "",
                        driverPhone: "",
                        sealNumber: "",
                        receivedBy: "",
                        customerName: "",
                        customerPhone: "",
                        customerAddress: "",
                        items: [],
                        notes: "",
                        remarks: "",
                        status: "Draft",
                      });
                    }}
                    className="px-5 py-2 text-sm border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition-colors font-medium whitespace-nowrap"
                  >
                    Reset
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSaveDeliveryNote("draft")}
                  disabled={loading}
                  className="px-5 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors font-medium flex items-center gap-1 disabled:opacity-50 whitespace-nowrap"
                >
                  Draft
                </button>

                <button
                  type="button"
                  onClick={handleSaveDeliveryNote}
                  disabled={loading}
                  className="px-5 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium flex items-center gap-1 disabled:opacity-50 whitespace-nowrap"
                >
                  <Save className="w-3 h-3" />
                  {loading ? "Saving..." : editId ? "Update" : "Save"}
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveDeliveryNote("print")}
                  disabled={loading}
                  className="px-5 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium flex items-center gap-1 disabled:opacity-50 whitespace-nowrap"
                >
                  <Printer className="w-3 h-3" />
                  {loading ? "Saving..." : "Save & Print"}
                </button>
              </div>
            </div>
              
            </div>

            {/* ACTION BUTTONS */}
           
          </div>
        </div>
      </div>

      {/* CUSTOMER DROPDOWN - Root level to avoid clipping */}
      {showCustomerDropdown && (
        <div
          data-customer-dropdown
          style={{
            position: "fixed",
            top: `${customerDropdownPos.top}px`,
            left: `${customerDropdownPos.left}px`,
            width: `${customerDropdownPos.width}px`,
            zIndex: 9999,
          }}
          className="bg-white border border-blue-300 rounded shadow-lg max-h-48 overflow-y-auto"
        >
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer) => (
              <button
                key={customer._id}
                type="button"
                onClick={() => handleCustomerSelect(customer)}
                className="w-full text-left px-3 py-2 hover:bg-blue-100 text-xs border-b last:border-b-0 transition"
              >
                <div className="font-medium text-gray-900">
                  {customer.name}
                </div>
                <div className="text-xs text-gray-600">
                  {customer.phone || "-"}
                </div>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-gray-500">
              No customers found
            </div>
          )}
        </div>
      )}

      {/* PRODUCT SEARCH DROPDOWN - Root level to avoid clipping */}
      {showSearchDropdown && searchResults.length > 0 && (
        <div
          data-search-dropdown
          style={{
            position: "fixed",
            top: `${searchDropdownPos.top}px`,
            left: `${searchDropdownPos.left}px`,
            width: `${searchDropdownPos.width}px`,
            zIndex: 9999,
          }}
          className="bg-white border border-blue-300 rounded shadow-lg max-h-80 overflow-y-auto"
        >
          {searchResults.map((product, index) => {
            const existingItem = existingProductsMap.get(product._id);
            return (
              <div
                key={product._id}
                onClick={() => {
                  handleAddItem(product);
                  setItemSearch("");
                  setShowSearchDropdown(false);
                }}
                className={`p-3 cursor-pointer border-b last:border-b-0 transition ${
                  index === selectedSearchIndex
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
                          ×{existingItem.deliveredQuantity || 0}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="font-mono bg-gray-100 px-1 rounded">
                        {product.itemcode}
                      </span>
                    </p>
                  </div>
                  <div className="text-right mr-3">
                    <p className="font-bold text-green-600 text-sm">
                      Stock: {product.stock || 0}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {searchMetadata?.hasNextPage && (
            <div className="sticky bottom-0 px-4 py-3 border-t bg-gray-50 flex justify-center">
              <button
                onClick={loadMoreProducts}
                className="text-xs px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Load More Products
              </button>
            </div>
          )}
        </div>
      )}

      {/* HISTORY MODAL */}
      {showHistoryModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
          style={{ zIndex: 40 }}
        >
          <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-96 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Clock size={16} className="text-purple-600" />
                Delivery Notes History
              </h2>
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
                placeholder="Search by DN #..."
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
                <option value="Partial">Partial</option>
                <option value="Delivered">Delivered</option>
                <option value="Returned">Returned</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="border-b px-3 py-2 text-left">DN #</th>
                    <th className="border-b px-3 py-2 text-left">Customer</th>
                    <th className="border-b px-3 py-2 text-right">Delivered/Total</th>
                    <th className="border-b px-3 py-2 text-center">Status</th>
                    <th className="border-b px-3 py-2 text-left">Date</th>
                    <th className="border-b px-3 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNotes.map((note) => (
                    <tr key={note._id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 font-bold text-blue-600">
                        {note.deliveryNoteNumber}
                      </td>
                      <td className="px-3 py-2">{note.customerName}</td>
                      <td className="px-3 py-2 text-right">
                        {note.totalDeliveredQuantity}/{note.totalOrderedQuantity}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            statusColors[note.status] || "bg-gray-100"
                          }`}
                        >
                          {note.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {note.deliveryDate?.split("T")[0]}
                      </td>
                      <td className="px-3 py-2 text-center flex gap-1 justify-center">
                        <button
                          onClick={() => handleHistoryPreview(note)}
                          title="Preview"
                          className="flex items-center justify-center gap-1 px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded text-xs font-medium transition"
                        >
                          <Eye size={11} />
                          Preview
                        </button>
                        <button
                          onClick={() => {
                            handleEditDeliveryNote(note);
                            setShowHistoryModal(false);
                          }}
                          title="Edit"
                          className="flex items-center justify-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-xs font-medium transition"
                        >
                          <Edit2 size={11} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteDeliveryNote(note._id)}
                          title="Delete"
                          className="flex items-center justify-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-medium transition"
                        >
                          <Trash2 size={11} />
                          Delete
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

      {/* PRINTING MODAL */}
      {showPrintingModal && viewedNote && (
        <GlobalDocumentPrintingComponent
          documentType="DELIVERY_NOTE"
          documentId={viewedNote._id}
          onClose={() => {
            setShowPrintingModal(false);
            setViewedNote(null);
            setSavedNoteId(null);
          }}
        />
      )}

      {/* ITEM NOTE MODAL */}
      {showItemNoteModal && selectedItemNote !== null && (
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

      {/* SERIAL MANAGEMENT MODAL */}
      {showSerialModal && selectedItemSerial !== null && (
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
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK CUSTOMER CREATION MODAL */}
      {showQuickCustomerForm && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Plus size={18} className="text-green-600" />
                Quick Add Customer
              </h2>
              <button
                onClick={() => setShowQuickCustomerForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4 flex-1">
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
                  placeholder="Enter customer name..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={quickCustomerData.phone}
                  onChange={(e) =>
                    setQuickCustomerData((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  placeholder="Enter phone number..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={quickCustomerData.address}
                  onChange={(e) =>
                    setQuickCustomerData((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  placeholder="Enter address..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none h-16"
                />
              </div>
            </div>
            <div className="px-6 py-3 border-t bg-gray-50 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowQuickCustomerForm(false);
                  setQuickCustomerData({ name: "", phone: "", address: "" });
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickAddCustomer}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
              >
                Create Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryNote;
