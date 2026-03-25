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

// ✅ NEW: Separated Component Imports
import SalesReturnNewHeader from "./return/SalesReturnNewHeader";
import SalesReturnNewContent from "./return/SalesReturnNewContent";
import SalesReturnNewFooter from "./return/SalesReturnNewFooter";

// ✅ Modal Component Imports
import ReturnHistoryModal from "./modals/ReturnHistoryModal";
import ReturnViewModal from "./modals/ReturnViewModal";
import ProductLookupModal from "./modals/ProductLookupModal";
import ItemNoteModal from "./modals/ItemNoteModal";
import SerialNumberModal from "./modals/SerialNumberModal";

const SalesReturn = () => {
  // Get decimal formatting functions based on company currency settings
  const { round, formatCurrency, formatNumber, config } = useDecimalFormat();
  const decimalPlaces = config?.decimalPlaces || 2;

  // Helper function to get step value for number inputs based on decimal places
  const getInputStep = () => {
    const steps = { 0: "1", 1: "0.1", 2: "0.01", 3: "0.001", 4: "0.0001" };
    return steps[decimalPlaces] || "0.01";
  };

  // Get company data for country-based filtering
  const { company } = useTaxMaster();
  const [products, setProducts] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [scannerInput, setScannerInput] = useState("");
  const [scannerActive, setScannerActive] = useState(true);
  const [lastScanTime, setLastScanTime] = useState(0);
  const [itemSearch, setItemSearch] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);
  const [productPage, setProductPage] = useState(1);

  // ✅ Product Search Hook - Centralized search with Meilisearch + fallback
  const { results: searchResults, metadata: searchMetadata } = useProductSearch(
    itemSearch,
    300,  // 300ms debounce
    productPage,  // current page
    20,   // page size (20 per request)
    true  // use fallback
  );

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

  const scannerInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchDropdownRef = useRef(null);
  const customerDropdownRef = useRef(null);
  const barcodeBuffer = useRef("");
  const lastKeyTime = useRef(0);

  const itemInputRefs = useRef({});
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
  const [showProductLookup, setShowProductLookup] = useState(false);
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

  const resetForm = async () => {
    const newReturnNumber = await axios.get(
      `${API_URL}/api/v1/sales-returns/nextReturnNumber?financialYear=${financialYear}`,
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
  };

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/api/v1/sales-returns/getSalesReturns`,
      );
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
      const countryCode = company?.countryCode || 'AE';
      const res = await axios.get(
        `${API_URL}/api/v1/customers/getcustomers?limit=100&country=${countryCode}`,
      );
      setCustomers(res.data.customers || []);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [company]);

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

  const addItemByBarcode = useCallback(
    (barcode) => {
      const product = products.find(
        (p) => p.barcode === barcode || p.itemcode === barcode,
      );

      if (!product) {
        alert(`Product not found: ${barcode}`);
        return;
      }

      setReturnData((prev) => {
        const existingIndex = prev.items.findIndex(
          (item) => item.productId === product._id,
        );

        if (existingIndex >= 0) {
          const updatedItems = [...prev.items];
          updatedItems[existingIndex] = {
            ...updatedItems[existingIndex],
            qty: updatedItems[existingIndex].qty + 1,
          };
          return { ...prev, items: updatedItems };
        } else {
          const newItem = {
            id: Date.now(),
            itemName: product.name,
            itemcode: product.itemcode,
            cost: product.cost,
            qty: 1,
            rate: product.price,
            tax: product.tax || 5,
            itemDiscount: 0,
            itemDiscountAmount: 0,
            productId: product._id,
            barcode: product.barcode,
            serialNumbers: [],
          };
          return { ...prev, items: [...prev.items, newItem] };
        }
      });

      setLastScanTime(Date.now());
      setScannerInput("");
    },
    [products],
  );

  useEffect(() => {
    if (!scannerActive) return;

    const handleKeyDown = (e) => {
      const now = Date.now();
      const timeDiff = now - lastKeyTime.current;

      if (timeDiff > 100) {
        barcodeBuffer.current = "";
      }

      lastKeyTime.current = now;

      if (e.key === "Enter") {
        if (barcodeBuffer.current.length >= 3) {
          e.preventDefault();
          addItemByBarcode(barcodeBuffer.current.toUpperCase());
        }
        barcodeBuffer.current = "";
        return;
      }

      if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
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
  }, [scannerActive, addItemByBarcode]);

  const handleScannerSubmit = (e) => {
    e.preventDefault();
    if (scannerInput.trim()) {
      addItemByBarcode(scannerInput.trim().toUpperCase());
    }
  };

  const filteredProducts = products
    .filter((p) => {
      if (showProductLookup) return true;

      if (!itemSearch.trim()) return false;
      const search = itemSearch.toLowerCase();
      return (
        p.name?.toLowerCase().includes(search) ||
        p.itemcode?.toLowerCase().includes(search) ||
        p.barcode?.toLowerCase().includes(search)
      );
    })
    .slice(0, 10);

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
          searchInputRef.current?.focus();
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

  const handleSearchKeyDown = (e) => {
    if (!showSearchDropdown || filteredProducts.length === 0) {
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

  useEffect(() => {
    setSelectedSearchIndex(0);
  }, [itemSearch]);

  const addItemFromSearch = (product) => {
    let addedItemId = null;

    setReturnData((prev) => {
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
        const newItem = {
          id: Date.now(),
          itemName: product.name,
          qty: 1,
          cost: product.cost,
          rate: product.price,
          tax: product.tax || 5,
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

    setTimeout(() => {
      const qtyRef = itemInputRefs.current[`${addedItemId}_qty`];
      if (qtyRef) {
        qtyRef.focus();
        qtyRef.select();
        setFocusedCell({ itemId: addedItemId, field: "qty" });
      }
    }, 50);
  };

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

    if (showSearchDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSearchDropdown]);

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
    const updated = returnData.items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item,
    );
    setReturnData({ ...returnData, items: updated });
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
    setReturnData({ ...returnData, items: [...returnData.items, newItem] });
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
      const amount = Number((item.qty * item.rate).toFixed(2));
      const percentDiscount = Number(
        ((amount * (item.itemDiscount ?? 0)) / 100).toFixed(2),
      );
      const amountDiscount =
        Number((item.itemDiscountAmount ?? 0).toFixed(2)) || 0;
      const discountedAmount = Number(
        (amount - percentDiscount - amountDiscount).toFixed(2),
      );

      subtotal += amount;
      totalLineDiscount += percentDiscount + amountDiscount;
      subtotalAfterItemDiscount += discountedAmount;
    });

    subtotal = Number(subtotal.toFixed(2));
    totalLineDiscount = Number(totalLineDiscount.toFixed(2));
    subtotalAfterItemDiscount = Number(subtotalAfterItemDiscount.toFixed(2));

    const invoicePercentDiscount = Number(
      ((subtotalAfterItemDiscount * (returnData.discount || 0)) / 100).toFixed(
        2,
      ),
    );
    const invoiceAmountDiscount =
      Number((returnData.discountAmount ?? 0).toFixed(2)) || 0;
    const totalInvoiceDiscount = Number(
      (invoicePercentDiscount + invoiceAmountDiscount).toFixed(2),
    );

    const totalAfterDiscount = Number(
      (subtotalAfterItemDiscount - totalInvoiceDiscount).toFixed(2),
    );

    const avgVatRate =
      returnData.items.length > 0
        ? Number(
            (
              returnData.items.reduce(
                (sum, item) => sum + (item.tax || 5),
                0,
              ) / returnData.items.length
            ).toFixed(2),
          )
        : 0;
    const totalTax = Number(
      ((totalAfterDiscount * avgVatRate) / 100).toFixed(2),
    );

    const grandTotal = Number((totalAfterDiscount + totalTax).toFixed(2));

    return {
      subtotal: subtotal.toFixed(2),
      discount: Number(
        (totalLineDiscount + totalInvoiceDiscount).toFixed(2),
      ).toFixed(2),
      totalAfterDiscount: totalAfterDiscount.toFixed(2),
      tax: totalTax.toFixed(2),
      total: grandTotal.toFixed(2),
    };
  };

  const totals = calculateTotals();

  const handleSaveReturn = async () => {
    if (!returnData.partyName?.trim()) {
      showToast("Please select a customer", "error", 3000);
      return false;
    }
    if (!returnData.paymentType?.trim()) {
      showToast("Please select a payment type", "error", 3000);
      return false;
    }
    if (selectedCustomerDetails?.paymentType === "Credit Sale" && !returnData.paymentTerms?.trim()) {
      showToast("Please select payment terms for credit sale customers", "error", 3000);
      return false;
    }
    if (returnData.items.length === 0) {
      showToast("Add at least one item to the return", "error", 3000);
      return false;
    }
    if (returnData.items.some((item) => !item.itemName?.trim())) {
      showToast("All items must have a name", "error", 3000);
      return false;
    }
    if (returnData.items.some((item) => item.qty <= 0)) {
      showToast("All items must have quantity greater than 0", "error", 3000);
      return false;
    }
    if (returnData.items.some((item) => item.rate <= 0)) {
      showToast("All items must have a price greater than 0", "error", 3000);
      return false;
    }

    setLoading(true);
    try {
      const now = new Date().toISOString();

      const totalItemQty = returnData.items.reduce(
        (sum, item) => sum + item.qty,
        0,
      );
      const totalCost = parseFloat(
        returnData.items
          .reduce((sum, item) => sum + item.cost * item.qty, 0)
          .toFixed(2),
      );
      const avgVatPercentage =
        returnData.items.length > 0
          ? parseFloat(
              (
                returnData.items.reduce(
                  (sum, item) => sum + (item.tax || 5),
                  0,
                ) / returnData.items.length
              ).toFixed(2),
            )
          : 0;

      const grossProfit = parseFloat(
        (parseFloat(totals.subtotal) - totalCost).toFixed(2),
      );
      const grossProfitMargin =
        parseFloat(totals.subtotal) > 0
          ? parseFloat(
              ((grossProfit / parseFloat(totals.subtotal)) * 100).toFixed(2),
            )
          : 0;
      const netProfit = parseFloat(
        (parseFloat(totals.total) - totalCost).toFixed(2),
      );
      const netProfitMargin =
        parseFloat(totals.total) > 0
          ? parseFloat(
              ((netProfit / parseFloat(totals.total)) * 100).toFixed(2),
            )
          : 0;

      const payload = {
        returnNumber: returnData.returnNo,
        financialYear: financialYear,
        date: returnData.returnDate,
        paymentType: returnData.paymentType,
        paymentTerms: returnData.paymentTerms,
        createdDate: now,
        updatedDate: now,

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
        discountPercentage: Number((returnData.discount || 0).toFixed(2)),
        discountAmount: Number((returnData.discountAmount || 0).toFixed(2)),
        totalAfterDiscount: Number(totals.totalAfterDiscount),
        vatPercentage: Number(avgVatPercentage.toFixed(2)),
        vatAmount: Number(totals.tax),
        totalIncludeVat: Number(totals.total),

        totalCost: Number(totalCost.toFixed(2)),
        grossProfit: Number(grossProfit.toFixed(2)),
        grossProfitMargin: Number(grossProfitMargin.toFixed(2)),
        netProfit: Number(netProfit.toFixed(2)),
        netProfitMargin: Number(netProfitMargin.toFixed(2)),

        notes: returnData.notes,

        items: returnData.items.map((item) => {
          const itemAmount = Number((item.qty * item.rate).toFixed(2));
          const itemPercentDiscount = Number(
            ((itemAmount * (item.itemDiscount ?? 0)) / 100).toFixed(2),
          );
          const itemAmountDiscount =
            Number((item.itemDiscountAmount ?? 0).toFixed(2)) || 0;
          const itemDiscountedAmount = Number(
            (itemAmount - itemPercentDiscount - itemAmountDiscount).toFixed(2),
          );
          const itemVat = Number(
            ((itemDiscountedAmount * (item.tax || 0)) / 100).toFixed(2),
          );
          const itemTotal = Number((itemDiscountedAmount + itemVat).toFixed(2));
          const itemTotalCost = Number((item.cost * item.qty).toFixed(2));
          const itemGrossProfit = Number(
            (itemAmount - itemTotalCost).toFixed(2),
          );
          const itemGrossProfitMargin =
            itemAmount > 0
              ? Number(((itemGrossProfit / itemAmount) * 100).toFixed(2))
              : 0;
          const itemNetProfit = Number((itemTotal - itemTotalCost).toFixed(2));
          const itemNetProfitMargin =
            itemTotal > 0
              ? Number(((itemNetProfit / itemTotal) * 100).toFixed(2))
              : 0;

          return {
            itemName: item.itemName,
            itemcode: item.itemcode,
            productId: item.productId,

            quantity: item.qty,
            unitPrice: Number(item.rate.toFixed(2)),
            lineAmount: itemAmount,

            unitCost: Number(item.cost.toFixed(2)),
            lineCost: itemTotalCost,

            discountPercentage: Number((item.itemDiscount ?? 0).toFixed(2)),
            discountAmount: itemAmountDiscount,
            amountAfterDiscount: itemDiscountedAmount,

            grossProfit: itemGrossProfit,
            grossProfitMargin: itemGrossProfitMargin,
            netProfit: itemNetProfit,
            netProfitMargin: itemNetProfitMargin,

            vatPercentage: Number((item.tax || 5).toFixed(2)),
            vatAmount: itemVat,

            total: itemTotal,

            serialNumbers: item.serialNumbers || [],
            note: itemNotes[item.id] || "",
          };
        }),
      };
      console.log("Saving return with payload:", payload);
      if (editId) {
        await axios.put(
          `${API_URL}/api/v1/sales-returns/updateSalesReturn/${editId}`,
          payload,
        );
      } else {
        await axios.post(
          `${API_URL}/api/v1/sales-returns/createSalesReturn`,
          payload,
        );
      }

      fetchReturns();
      setError(null);
      setEditId(null);
      await resetForm();
      showToast("Return saved successfully", "success", 3000);
      return true;
    } catch (err) {
      setError("Failed to save return");
      showToast("Failed to save return. Please try again.", "error", 3000);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveAndPrint = async () => {
    const saved = await handleSaveReturn();
    if (saved) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  };

  const handleEditReturn = (returnItem) => {
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

  useEffect(() => {
    const fetchNextReturnNumber = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/api/v1/sales-returns/nextReturnNumber?financialYear=${financialYear}`,
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
      {/* HEADER - Using Separated Component */}
      <SalesReturnNewHeader
        returnData={returnData}
        selectedCustomerDetails={selectedCustomerDetails}
        customers={customers}
        customerSearch={customerSearch}
        showCustomerDropdown={showCustomerDropdown}
        loading={loading}
        onCustomerSearchChange={(value) => {
          if (selectedCustomerDetails) {
            setSelectedCustomerId(null);
            setSelectedCustomerDetails(null);
            setHoveredCustomer(null);
          }
          setCustomerSearch(value);
          setShowCustomerDropdown(true);
        }}
        onCustomerDropdownToggle={(show) => setShowCustomerDropdown(show)}
        onSelectCustomer={handleSelectCustomer}
        onHistoryClick={() => {
          setShowHistoryModal(true);
          fetchReturns();
        }}
        onLookupClick={async () => {
          try {
            const res = await axios.get(
              `${API_URL}/api/v1/products/getproducts?limit=50000`,
            );
            setProducts(res.data.products || res.data);
            setItemSearch("");
          } catch (err) {
            console.error("Error fetching products:", err);
          }
          setShowProductLookup(true);
        }}
        onSave={handleSaveReturn}
        onPrint={handleSaveAndPrint}
      />

      {/* CONTENT - Using Separated Component */}
      <SalesReturnNewContent
        returnData={returnData}
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
        onAddItemFromSearch={addItemFromSearch}
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
      <SalesReturnNewFooter
        returnData={returnData}
        totals={totals}
        config={config}
        loading={loading}
        decimalPlaces={decimalPlaces}
        getInputStep={getInputStep}
        formatNumber={formatNumber}
        onNotesChange={(value) => setReturnData({ ...returnData, notes: value })}
        onDiscountChange={(value) => setReturnData({ ...returnData, discount: value })}
        onDiscountAmountChange={(value) => setReturnData({ ...returnData, discountAmount: value })}
        onSave={handleSaveReturn}
        onPrint={handleSaveAndPrint}
      />

      {/* MODALS - Orange theme for Sales Return */}
      <div className="flex-shrink-0 bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 shadow-lg z-10 hidden">
        {/* Header Content */}
        <div className="flex justify-between gap-6">
          {/* Left Column */}
          <div className="flex items-start gap-3">
            <div>
              <h1 className="text-lg font-bold">Sales Return</h1>
              <div className="bg-white/20 px-3 py-1.5 rounded-lg mt-2 inline-block">
                <span className="text-xs text-red-200">Return #</span>
                <p className="font-bold text-xs">{returnData.returnNo}</p>
                <p className="font-bold text-xs text-red-100">
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
              className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 border border-red-400/50 rounded-lg text-white font-medium text-xs transition"
            >
              <Clock size={16} />
              History
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await axios.get(
                    `${API_URL}/api/v1/products/getproducts?limit=50000`,  // ✅ Fetch up to 50k products
                  );
                  setProducts(res.data.products || res.data);
                  setItemSearch("");
                } catch (err) {
                  console.error("Error fetching products:", err);
                }
                setShowProductLookup(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-red-400/50 rounded-lg text-white font-medium text-xs transition"
            >
              <Package size={16} />
              Lookup Product
            </button>
          </div>

          {/* Right Column */}
          <div className="flex items-start gap-6 flex-1 justify-end">
            <div className="flex flex-col gap-2 w-72">
              <div ref={customerDropdownRef} className="relative w-full h-10">
                <User
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-red-300 z-10"
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
                  className="w-full h-10 pl-9 pr-3 bg-white/10 border border-red-400/50 rounded-lg text-sm text-white placeholder-red-300 focus:ring-2 focus:ring-white/30 outline-none"
                />

                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-56 overflow-y-auto">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer._id}
                        onMouseEnter={() => setHoveredCustomer(customer)}
                        onMouseLeave={() => setHoveredCustomer(null)}
                        onClick={() => handleSelectCustomer(customer._id)}
                        className="px-3 py-2 hover:bg-red-50 cursor-pointer border-b last:border-b-0 text-xs text-gray-800"
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

              <div className="bg-white/20 rounded-lg px-3 py-1.5 border border-red-400/50 h-12 overflow-hidden">
                {selectedCustomerDetails || hoveredCustomer ? (
                  <>
                    {hoveredCustomer && !selectedCustomerDetails && (
                      <p className="text-xs text-red-300 mb-1 italic">Preview</p>
                    )}
                    <div className="flex gap-4 text-xs flex-wrap">
                      <div>
                        <span className="text-red-200 font-semibold block">
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
                        <span className="text-red-200 font-semibold block">
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
                  <p className="text-xs text-red-300 italic">
                    Select a customer to view details
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 min-w-40">
              <select
                disabled={!selectedCustomerDetails}
                value={returnData.paymentType}
                onChange={(e) => setReturnData({ ...returnData, paymentType: e.target.value })}
                className={`px-3 py-2 rounded-lg text-sm outline-none transition ${
                  !selectedCustomerDetails
                    ? "bg-gray-600/30 border border-gray-500/30 text-gray-400 cursor-not-allowed opacity-60"
                    : "bg-white/10 border border-red-400/50 text-white focus:ring-2 focus:ring-white/30"
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
              
              {selectedCustomerDetails?.paymentType === "Credit Sale" && (
                <select
                  value={returnData.paymentTerms}
                  onChange={(e) => setReturnData({ ...returnData, paymentTerms: e.target.value })}
                  className="px-3 py-2 bg-white/10 border border-red-400/50 rounded-lg text-sm text-white focus:ring-2 focus:ring-white/30 outline-none"
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

      {/* Items Section - Scrollable (minimal for demo) */}
      <div className="flex-1 flex flex-col p-4 min-h-0 overflow-hidden">
        <div className="flex-shrink-0 bg-white rounded-xl shadow-sm border p-3 mb-3">
          <div className="flex items-center gap-3">
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
                    addItemByBarcode(scannerInput.trim());
                    setScannerInput("");
                  }
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              />
            </div>
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by item name, code, or barcode..."
                value={itemSearch}
                onChange={(e) => {
                  setItemSearch(e.target.value);
                  setShowSearchDropdown(e.target.value.trim().length > 0);
                }}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              />
              {showSearchDropdown && filteredProducts.length > 0 && (
                <div
                  ref={searchDropdownRef}
                  className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto"
                >
                  <div className="text-[10px] text-gray-400 px-4 py-2 border-b bg-gray-50 sticky top-0">
                    <span>↑↓ Navigate • Enter to add • Esc to close</span>
                  </div>
                  {filteredProducts.map((product, index) => (
                    <div
                      key={product._id}
                      onClick={() => addItemFromSearch(product)}
                      onMouseEnter={() => setSelectedSearchIndex(index)}
                      className={`px-4 py-3 cursor-pointer border-b border-gray-50 last:border-b-0 transition ${
                        index === selectedSearchIndex
                          ? "bg-red-50 border-l-4 border-l-red-500"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {product.itemcode}• {product.barcode}
                          </p>
                        </div>
                        <div className="text-right mr-3">
                          <p className="font-bold text-red-600">
                            AED {product.price?.toFixed(2)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addItemFromSearch(product);
                          }}
                          className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <ShoppingCart size={18} />
              <span className="font-semibold">{returnData.items.length}</span> items
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-2 py-2 text-center w-12">#</th>
                <th className="px-2 py-2 text-center w-24">Code</th>
                <th className="px-2 py-2 text-left">Item</th>
                <th className="px-2 py-2 text-center w-16">Qty</th>
                <th className="px-2 py-2 text-center w-20">Price</th>
                <th className="px-2 py-2 text-right w-20">Total</th>
                <th className="px-2 py-2 text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {returnData.items.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-400">
                    No items added yet
                  </td>
                </tr>
              ) : (
                returnData.items.map((item, idx) => {
                  const total = Number((item.qty * item.rate).toFixed(2));
                  return (
                    <tr key={item.id} className="hover:bg-red-50/40">
                      <td className="px-2 py-2 text-center">{idx + 1}</td>
                      <td className="px-2 py-2 text-center text-xs bg-gray-50 rounded">
                        {item.itemcode}
                      </td>
                      <td className="px-2 py-2">{item.itemName}</td>
                      <td className="px-2 py-2">
                        <input
                          ref={(el) => {
                            if (el) itemInputRefs.current[`${item.id}_qty`] = el;
                          }}
                          type="number"
                          value={item.qty}
                          onChange={(e) =>
                            handleItemChange(item.id, "qty", parseFloat(e.target.value) || 0)
                          }
                          className="w-full text-center border rounded px-1 text-xs"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) =>
                            handleItemChange(item.id, "rate", parseFloat(e.target.value) || 0)
                          }
                          className="w-full text-center border rounded px-1 text-xs"
                        />
                      </td>
                      <td className="px-2 py-2 text-right font-bold">{total.toFixed(2)}</td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:bg-red-50 p-1 rounded"
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
              <p className="font-bold">AED {totals.subtotal}</p>
            </div>
            <div className="border-l"></div>
            <div className="text-center">
              <p className="text-gray-500 text-xs">VAT</p>
              <p className="font-bold">AED {totals.tax}</p>
            </div>
            <div className="bg-gray-900 text-white px-4 py-2 rounded">
              <p className="text-gray-400 text-[10px]">Total</p>
              <p className="text-base font-bold text-red-400">AED {totals.total}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded text-xs font-semibold hover:bg-red-700"
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

      {/* MODALS AND MODALS */}

      {/* RETURN HISTORY MODAL */}
      <ReturnHistoryModal
        show={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        returns={returns}
        historyDateFilter={historyDateFilter}
        onHistoryDateFilterChange={setHistoryDateFilter}
        historySearch={historySearch}
        onHistorySearchChange={setHistorySearch}
        filteredHistoryReturns={filteredHistoryReturns}
        onEditReturn={handleEditReturn}
        onViewReturn={setViewedReturn}
        formatNumber={formatNumber}
      />

      {/* RETURN VIEW MODAL */}
      <ReturnViewModal
        viewedReturn={viewedReturn}
        onClose={() => setViewedReturn(null)}
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
        onAddProduct={addItemFromSearch}
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
    </div>
  );
};

export default SalesReturn;


