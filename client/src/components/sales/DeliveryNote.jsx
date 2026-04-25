import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  Trash2,
  Save,
  X,
  ScanBarcode,
  User,
  Phone,
  FileText,
  Calendar,
  ShoppingCart,
  Clock,
  Package,
  Eye,
  Edit2,
  CreditCard,
  Truck,
  MapPin,
} from "lucide-react";
import axios from "axios";
import { API_URL } from "../../config/config";
import { useTaxMaster } from "../../hooks/useTaxMaster";
import GlobalDocumentPrintingComponent from "../shared/printing/GlobalDocumentPrintingComponent";

const DeliveryNote = () => {
  // Get company data for country-based filtering
  const { company } = useTaxMaster();
  const [products, setProducts] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [scannerInput, setScannerInput] = useState("");
  const [scannerActive, setScannerActive] = useState(true);
  const [itemSearch, setItemSearch] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);

  const searchInputRef = useRef(null);
  const searchDropdownRef = useRef(null);
  const barcodeBuffer = useRef("");
  const lastKeyTime = useRef(0);

  const [noteData, setNoteData] = useState({
    deliveryNoteNo: "001",
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

  const [loading, setLoading] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState([]);
  const [editId, setEditId] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [viewedNote, setViewedNote] = useState(null);
  const [showPrintingModal, setShowPrintingModal] = useState(false);
  const [savedNoteId, setSavedNoteId] = useState(null); // For Save & Print flow
  const [historyDateFilter, setHistoryDateFilter] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [historySearch, setHistorySearch] = useState("");
  const [filteredHistoryStatus, setFilteredHistoryStatus] = useState("All");
  const [financialYear, setFinancialYear] = useState("2025-26");

  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "info", duration = 3000) => {
    const id = Date.now();
    const toast = { id, message, type };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  // Fetch next delivery note number
  useEffect(() => {
    const fetchNextNumber = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/api/v1/delivery-notes/nextDeliveryNoteNumber`,
          { params: { financialYear } }
        );
        setNoteData((prev) => ({
          ...prev,
          deliveryNoteNo: response.data.deliveryNoteNumber,
        }));
      } catch (err) {
        console.error("Error fetching delivery note number:", err);
      }
    };
    if (!editId) {
      fetchNextNumber();
    }
  }, [financialYear, editId]);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/v1/products/getproducts?limit=50000`);  // ✅ Fetch up to 50k products
        setProducts(response.data.products || response.data || []);
      } catch (err) {
        console.error("Error fetching products:", err);
      }
    };
    fetchProducts();
  }, []);

  // Fetch sales orders
  useEffect(() => {
    const fetchSalesOrders = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/v1/sales-orders/getSalesOrders`);
        setSalesOrders(response.data || []);
      } catch (err) {
        console.error("Error fetching sales orders:", err);
      }
    };
    fetchSalesOrders();
  }, []);

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

  // Fetch delivery notes
  useEffect(() => {
    const fetchDeliveryNotes = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/v1/delivery-notes/getDeliveryNotes`);
        setDeliveryNotes(response.data || []);
      } catch (err) {
        console.error("Error fetching delivery notes:", err);
        showToast("error", "Failed to load delivery notes");
      }
    };
    fetchDeliveryNotes();
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
  }, [scannerActive, noteData.items]);

  useEffect(() => {
    if (scannerActive) {
      window.addEventListener("keydown", handleScannerInput);
      return () => window.removeEventListener("keydown", handleScannerInput);
    }
  }, [scannerActive, handleScannerInput]);

  const handleBarcodeScanned = () => {
    const product = products.find((p) => p.itemcode === scannerInput || p.barcode === scannerInput);
    if (product) {
      incrementDeliveredQuantity(product._id);
      setScannerInput("");
    } else {
      showToast("error", "Product not found: " + scannerInput);
    }
  };

  const incrementDeliveredQuantity = (productId) => {
    const newItems = noteData.items.map((item) =>
      item.productId === productId
        ? {
            ...item,
            deliveredQuantity: item.deliveredQuantity + 1,
          }
        : item
    );
    setNoteData((prev) => ({ ...prev, items: newItems }));
    showToast("success", "Quantity incremented");
  };

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
          orderedQuantity: item.quantity,
          deliveredQuantity: 0,
          unitPrice: item.unitPrice,
          batchNumber: "",
          expiryDate: "",
          serialNumbers: [],
          remark: "",
        })),
      }));
      showToast("success", `Loaded ${order.orderNumber} items`);
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...noteData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setNoteData((prev) => ({ ...prev, items: newItems }));
  };

  const removeItem = (index) => {
    const newItems = noteData.items.filter((_, i) => i !== index);
    setNoteData((prev) => ({ ...prev, items: newItems }));
  };

  const handleSaveDeliveryNote = async () => {
    if (!noteData.salesOrderId || noteData.items.length === 0) {
      showToast("error", "Please select a sales order and add items");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        deliveryNoteNumber: noteData.deliveryNoteNo,
        financialYear,
        salesOrderId: noteData.salesOrderId,
        date: new Date(noteData.deliveryDate),
        deliveryDate: new Date(noteData.deliveryDate),
        customerName: noteData.customerName,
        customerPhone: noteData.customerPhone,
        customerAddress: noteData.customerAddress,
        vehicleNumber: noteData.vehicleNumber,
        driverName: noteData.driverName,
        driverPhone: noteData.driverPhone,
        sealNumber: noteData.sealNumber,
        receivedBy: noteData.receivedBy,
        totalOrderedQuantity: noteData.items.reduce((sum, item) => sum + item.orderedQuantity, 0),
        totalDeliveredQuantity: noteData.items.reduce((sum, item) => sum + item.deliveredQuantity, 0),
        totalItems: noteData.items.length,
        notes: noteData.notes,
        remarks: noteData.remarks,
        status: noteData.status,
        items: noteData.items.map((item) => ({
          productId: item.productId,
          itemName: item.itemName,
          itemcode: item.itemcode,
          orderedQuantity: item.orderedQuantity,
          deliveredQuantity: item.deliveredQuantity,
          unitPrice: item.unitPrice,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          serialNumbers: item.serialNumbers,
          remark: item.remark,
        })),
      };

      const url = editId
        ? `${API_URL}/api/v1/delivery-notes/updateDeliveryNote/${editId}`
        : `${API_URL}/api/v1/delivery-notes/createDeliveryNote`;

      const response = await axios[editId ? "put" : "post"](url, payload);

      showToast(
        "success",
        editId ? "Delivery note updated successfully" : "Delivery note created successfully"
      );

      if (!editId) {
        setNoteData({
          deliveryNoteNo: "",
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
      }

      setEditId(null);
      setDeliveryNotes([...deliveryNotes, response.data]);
      
      // ✅ Return success with delivery note ID for Save & Print flow
      return { success: true, noteId: response.data._id };
    } catch (err) {
      showToast("error", err.response?.data?.error || "Error saving delivery note");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // ✅ Save and Print - opens printing modal with terminal template
  const handleSaveAndPrint = async () => {
    const result = await handleSaveDeliveryNote();
    if (result?.success) {
      setSavedNoteId(result.noteId);
      setViewedNote({ _id: result.noteId });
      setShowPrintingModal(true);
      console.log('✅ Delivery note saved and print modal opened:', result.noteId);
    }
  };

  const handleEditNote = (note) => {
    setEditId(note._id);
    setNoteData({
      deliveryNoteNo: note.deliveryNoteNumber,
      deliveryDate: note.deliveryDate.split("T")[0],
      salesOrderId: note.salesOrderId,
      vehicleNumber: note.vehicleNumber || "",
      driverName: note.driverName || "",
      driverPhone: note.driverPhone || "",
      sealNumber: note.sealNumber || "",
      receivedBy: note.receivedBy || "",
      customerName: note.customerName,
      customerPhone: note.customerPhone || "",
      customerAddress: note.customerAddress || "",
      items: note.items,
      notes: note.notes || "",
      remarks: note.remarks || "",
      status: note.status,
    });
    window.scrollTo(0, 0);
  };

  const handleDeleteNote = async (id) => {
    if (window.confirm("Are you sure you want to delete this delivery note?")) {
      try {
        await axios.delete(`${API_URL}/api/v1/delivery-notes/deleteDeliveryNote/${id}`);
        setDeliveryNotes(deliveryNotes.filter((n) => n._id !== id));
        showToast("success", "Delivery note deleted successfully");
      } catch (err) {
        showToast("error", "Error deleting delivery note");
      }
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(`${API_URL}/api/v1/delivery-notes/updateStatus/${id}`, {
        status: newStatus,
      });
      setDeliveryNotes(
        deliveryNotes.map((n) =>
          n._id === id ? { ...n, status: newStatus } : n
        )
      );
      showToast("success", "Status updated successfully");
    } catch (err) {
      showToast("error", "Error updating status");
    }
  };

  const filteredNotes = deliveryNotes.filter((n) => {
    const matchesDate =
      !historyDateFilter ||
      n.deliveryDate.split("T")[0] === historyDateFilter;
    const matchesSearch =
      !historySearch ||
      n.deliveryNoteNumber.includes(historySearch) ||
      n.customerName.toLowerCase().includes(historySearch.toLowerCase());
    const matchesStatus =
      filteredHistoryStatus === "All" || n.status === filteredHistoryStatus;

    return matchesDate && matchesSearch && matchesStatus;
  });

  const statusColors = {
    Draft: "bg-gray-100 text-gray-800",
    Partial: "bg-blue-100 text-blue-800",
    Delivered: "bg-green-100 text-green-800",
    Returned: "bg-orange-100 text-orange-800",
    Cancelled: "bg-red-100 text-red-800",
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

      {/* HEADER */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 shadow-lg z-10">
        <div className="flex justify-between gap-6">
          <div className="flex items-start gap-3">
            <div>
              <h1 className="text-lg font-bold">Delivery Note</h1>
              <div className="bg-white/20 px-3 py-1.5 rounded-lg mt-2 inline-block">
                <span className="text-xs text-blue-200">DN #</span>
                <p className="font-bold text-xs">{noteData.deliveryNoteNo}</p>
                <p className="font-bold text-xs text-blue-100">{noteData.deliveryDate}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 border border-blue-400/50 rounded-lg text-white font-medium text-xs transition"
          >
            <Clock size={16} />
            History
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4">
          {/* FORM SECTION */}
          <div className="bg-white rounded-lg shadow-md p-5 mb-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  <Calendar size={14} className="inline mr-1" /> Delivery Date
                </label>
                <input
                  type="date"
                  value={noteData.deliveryDate}
                  onChange={(e) =>
                    setNoteData((prev) => ({ ...prev, deliveryDate: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  <ShoppingCart size={14} className="inline mr-1" /> Sales Order
                </label>
                <select
                  value={noteData.salesOrderId}
                  onChange={(e) => handleSalesOrderSelect(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">Select Sales Order</option>
                  {salesOrders.map((order) => (
                    <option key={order._id} value={order._id}>
                      {order.orderNumber} - {order.customerName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  <Truck size={14} className="inline mr-1" /> Vehicle Number
                </label>
                <input
                  type="text"
                  value={noteData.vehicleNumber}
                  onChange={(e) =>
                    setNoteData((prev) => ({ ...prev, vehicleNumber: e.target.value }))
                  }
                  placeholder="ABC-123"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  <FileText size={14} className="inline mr-1" /> Seal Number
                </label>
                <input
                  type="text"
                  value={noteData.sealNumber}
                  onChange={(e) =>
                    setNoteData((prev) => ({ ...prev, sealNumber: e.target.value }))
                  }
                  placeholder="Seal #"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Driver Name
                </label>
                <input
                  type="text"
                  value={noteData.driverName}
                  onChange={(e) =>
                    setNoteData((prev) => ({ ...prev, driverName: e.target.value }))
                  }
                  placeholder="Driver name"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Driver Phone
                </label>
                <input
                  type="tel"
                  value={noteData.driverPhone}
                  onChange={(e) =>
                    setNoteData((prev) => ({ ...prev, driverPhone: e.target.value }))
                  }
                  placeholder="Phone"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Received By
                </label>
                <input
                  type="text"
                  value={noteData.receivedBy}
                  onChange={(e) =>
                    setNoteData((prev) => ({ ...prev, receivedBy: e.target.value }))
                  }
                  placeholder="Receiver name"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* CUSTOMER INFO */}
            <div className="mb-4 bg-white/30 border border-blue-400/50 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-bold text-gray-700">Customer:</span>
                  <p className="text-gray-600">{noteData.customerName}</p>
                </div>
                <div>
                  <span className="font-bold text-gray-700">Phone:</span>
                  <p className="text-gray-600">{noteData.customerPhone}</p>
                </div>
                <div className="col-span-2">
                  <span className="font-bold text-gray-700">Address:</span>
                  <p className="text-gray-600">{noteData.customerAddress}</p>
                </div>
              </div>
            </div>

            {/* BARCODE SCANNER HINT */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-gray-700">
              <ScanBarcode size={14} className="inline mr-1 text-blue-600" />
              <span className="font-medium">Barcode Scanner:</span> Scan products to increment delivered quantities
            </div>

            {/* ITEMS TABLE */}
            <div className="mb-4 overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-xs">
                <thead className="bg-gradient-to-r from-blue-100 to-blue-50">
                  <tr>
                    <th className="border border-gray-300 px-2 py-2 text-left">#</th>
                    <th className="border border-gray-300 px-2 py-2 text-left w-32">Product</th>
                    <th className="border border-gray-300 px-2 py-2 text-right w-16">Ordered</th>
                    <th className="border border-gray-300 px-2 py-2 text-right w-16">Delivered</th>
                    <th className="border border-gray-300 px-2 py-2 text-right w-16">Balance</th>
                    <th className="border border-gray-300 px-2 py-2 text-left w-24">Batch #</th>
                    <th className="border border-gray-300 px-2 py-2 text-left w-20">Expiry</th>
                    <th className="border border-gray-300 px-2 py-2 text-left w-32">Remark</th>
                    <th className="border border-gray-300 px-2 py-2 text-center w-16">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {noteData.items.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="border border-gray-300 px-2 py-2">{index + 1}</td>
                      <td className="border border-gray-300 px-2 py-2">
                        <div className="font-medium text-gray-800">{item.itemName}</div>
                        <div className="text-xs text-gray-500">{item.itemcode}</div>
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-right font-bold">
                        {item.orderedQuantity}
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          max={item.orderedQuantity}
                          value={item.deliveredQuantity}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "deliveredQuantity",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs text-right"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-right">
                        <span
                          className={`font-bold ${
                            item.orderedQuantity === item.deliveredQuantity
                              ? "text-green-600"
                              : item.deliveredQuantity === 0
                              ? "text-red-600"
                              : "text-yellow-600"
                          }`}
                        >
                          {item.orderedQuantity - item.deliveredQuantity}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={item.batchNumber}
                          onChange={(e) => handleItemChange(index, "batchNumber", e.target.value)}
                          placeholder="Batch"
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <input
                          type="date"
                          value={item.expiryDate}
                          onChange={(e) => handleItemChange(index, "expiryDate", e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={item.remark}
                          onChange={(e) => handleItemChange(index, "remark", e.target.value)}
                          placeholder="Remark"
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
                        />
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

            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-3">
                <div className="text-xs text-gray-600 font-bold">Total Ordered</div>
                <div className="text-lg font-bold text-blue-700">
                  {noteData.items.reduce((sum, item) => sum + item.orderedQuantity, 0)}
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-300 rounded-lg p-3">
                <div className="text-xs text-gray-600 font-bold">Total Delivered</div>
                <div className="text-lg font-bold text-green-700">
                  {noteData.items.reduce((sum, item) => sum + item.deliveredQuantity, 0)}
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-300 rounded-lg p-3">
                <div className="text-xs text-gray-600 font-bold">Balance Items</div>
                <div className="text-lg font-bold text-orange-700">
                  {noteData.items.reduce((sum, item) => sum + (item.orderedQuantity - item.deliveredQuantity), 0)}
                </div>
              </div>
            </div>

            {/* NOTES */}
            <div className="grid grid-cols-2 gap-4 mb-4">
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
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Remarks
                </label>
                <textarea
                  value={noteData.remarks}
                  onChange={(e) =>
                    setNoteData((prev) => ({ ...prev, remarks: e.target.value }))
                  }
                  placeholder="Additional remarks..."
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-20 resize-none"
                />
              </div>
            </div>

            {/* STATUS & SAVE */}
            <div className="flex justify-between items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={noteData.status}
                  onChange={(e) =>
                    setNoteData((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="Draft">Draft</option>
                  <option value="Partial">Partial Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Returned">Returned</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex gap-2">
                {editId && (
                  <button
                    onClick={() => {
                      setEditId(null);
                      setNoteData({
                        deliveryNoteNo: "",
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
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium transition flex items-center gap-1.5"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleSaveDeliveryNote}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded font-medium transition flex items-center gap-1.5"
                >
                  <Save size={16} />
                  {loading ? "Saving..." : editId ? "Update Note" : "Create Note"}
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

          {/* HISTORY MODAL */}
          {showHistoryModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 40 }}>
              <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-96 flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                  <h2 className="text-lg font-bold text-gray-800">Delivery Notes History</h2>
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
                          <td className="px-3 py-2 font-bold text-blue-600">{note.deliveryNoteNumber}</td>
                          <td className="px-3 py-2">{note.customerName}</td>
                          <td className="px-3 py-2 text-right">
                            {note.totalDeliveredQuantity}/{note.totalOrderedQuantity}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${statusColors[note.status] || "bg-gray-100"}`}>
                              {note.status}
                            </span>
                          </td>
                          <td className="px-3 py-2">{note.deliveryDate?.split("T")[0]}</td>
                          <td className="px-3 py-2 text-center flex gap-1">
                            <button
                              onClick={() => setViewedNote(note)}
                              className="text-blue-600 hover:text-blue-800"
                              title="View"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => {
                                handleEditNote(note);
                                setShowHistoryModal(false);
                              }}
                              className="text-green-600 hover:text-green-800"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note._id)}
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

          {/* DELIVERY NOTE PRINTING & PDF MODAL - Terminal Template Mapped */}
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
        </div>
      </div>
    </div>
  );
};

export default DeliveryNote;


