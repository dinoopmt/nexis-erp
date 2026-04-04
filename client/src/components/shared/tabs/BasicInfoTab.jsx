import { React, useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Info } from "lucide-react";

/**
 * BasicInfoTab Component
 * Handles product basic information: name, category, HSN, stock, taxes
 *
 * Props:
 * - pricingLines: Array of pricing data from parent (Product.jsx)
 * - onPricingFieldChange: Handler for pricing field changes - calls parent's calculatePricingFields
 */
const BasicInfoTab = forwardRef((
  {
    newProduct,
    setNewProduct,
    errors,
    setErrors,
    loading,
    isIndiaCompany,
    hsnCodes,
    loadingHsn,
    departments,
    subdepartments,
    brands,
    vendors,
    units,
    filteredTaxes,
    loadingTaxes,
    activeCountryCode,
    onHSNSelection,
    onCategoryChange,
    onSubdepartmentChange,
    onOpenGroupingModal,
    onOpenVendorModal,
    onOpenPricingLevelModal,
    pricingLines = [],
    onPricingFieldChange,
    handleTaxSelectionAndRecalculation,
    onGenerateBarcode,
    onCheckedRowsChange,
    round,
    formatNumber,
  },
  ref
) => {
  // Track which rows are selected in pricing table for bulk operations (rows 0-3: base + 3 variants)
  const [checkedRows, setCheckedRows] = useState([true, false, false, false]);

  // ✅ NEW: Track if user has manually changed checkboxes (prevents auto-override)
  const userModifiedCheckboxRef = useRef(false);

  // Cache unit selections locally for instant UI feedback while parent recalculates pricing
  const [localUnitSelections, setLocalUnitSelections] = useState(
    pricingLines.map((line) => String(line.unit || "")),
  );

  // Search filters for dropdowns
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [subdepartmentSearch, setSubdepartmentSearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");

  // Dropdown visibility states
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [showSubdeptDropdown, setShowSubdeptDropdown] = useState(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  // ✅ Keyboard navigation: Track highlighted item index in each dropdown
  const [highlightedDeptIndex, setHighlightedDeptIndex] = useState(-1);
  const [highlightedSubdeptIndex, setHighlightedSubdeptIndex] = useState(-1);
  const [highlightedBrandIndex, setHighlightedBrandIndex] = useState(-1);
  const [highlightedVendorIndex, setHighlightedVendorIndex] = useState(-1);


  


  // Track which pricing field is currently focused (for formatting: show formatted when not editing, raw when editing)
  // Format: "0-cost", "1-price", etc. null when no field is focused
  const [focusedField, setFocusedField] = useState(null);
  const [editingValues, setEditingValues] = useState({}); // Track temp values while editing: { "0-cost": "100", etc }

  // ✅ Expose methods to clear search filters when items are created in parent modals
  useImperativeHandle(ref, () => ({
    clearDepartmentSearch: () => setDepartmentSearch(""),
    clearSubdepartmentSearch: () => setSubdepartmentSearch(""),
    clearBrandSearch: () => setBrandSearch(""),
    clearVendorSearch: () => setVendorSearch(""),
    setDepartmentSearchValue: (value) => setDepartmentSearch(value),
    setSubdepartmentSearchValue: (value) => setSubdepartmentSearch(value),
    setBrandSearchValue: (value) => setBrandSearch(value),
    setVendorSearchValue: (value) => setVendorSearch(value),
  }), []);

  // Keep local unit cache in sync with parent pricingLines (handles data updates from parent)
  useEffect(() => {
    setLocalUnitSelections(pricingLines.map((line) => String(line.unit || "")));
  }, [pricingLines]);

  // ✅ FIX: Initialize checked rows based on pricing lines when editing
  // When loading a product with multiple variants, reflect which rows have data
  // Only auto-check rows that have a UNIT selected (not just any field)
  // ✅ FIXED: Only auto-check if user hasn't manually modified checkboxes
  useEffect(() => {
    if (pricingLines.length > 0 && !userModifiedCheckboxRef.current) {
      const newCheckedRows = pricingLines.map((line, idx) => {
        // Always check row 0 (base unit)
        if (idx === 0) return true;
        // ✅ FIXED: Only check other rows if they have a UNIT selected
        // Don't auto-check just because cost/price/margin was entered
        return Boolean(line.unit);
      });
      // Only update if the checked pattern actually changed
      const hasChanged = checkedRows.length !== newCheckedRows.length || 
        checkedRows.some((val, idx) => val !== newCheckedRows[idx]);
      if (hasChanged) {
        setCheckedRows(newCheckedRows);
      }
    }
  }, [pricingLines]);

  // ✅ NEW: Sync checked rows to parent selectedPricingLines when they change
  useEffect(() => {
    if (typeof onCheckedRowsChange === 'function') {
      onCheckedRowsChange(checkedRows);
    }
  }, [checkedRows]); // Only checkedRows - callback is stable via parent's useCallback

  // ✅ NEW: Track previous checkedRows to detect when rows are unchecked
  const previousCheckedRowsRef = useRef(checkedRows);

  // ✅ NEW: Clear pricing data when rows are unchecked
  useEffect(() => {
    const prevCheckedRows = previousCheckedRowsRef.current;
    
    // Detect which rows were just unchecked (changed from true to false)
    for (let i = 1; i < 4; i++) { // Skip row 0 (base unit can't be unchecked)
      if (prevCheckedRows[i] === true && checkedRows[i] === false) {
        // Row i was just unchecked, clear its fields
        if (onPricingFieldChangeRef.current) {
          onPricingFieldChangeRef.current(i, "unit", "");
          onPricingFieldChangeRef.current(i, "cost", "");
          onPricingFieldChangeRef.current(i, "costIncludetax", "");
          onPricingFieldChangeRef.current(i, "margin", "");
          onPricingFieldChangeRef.current(i, "marginAmount", "");
          onPricingFieldChangeRef.current(i, "price", "");
          onPricingFieldChangeRef.current(i, "taxAmount", "");
          onPricingFieldChangeRef.current(i, "factor", "");
          onPricingFieldChangeRef.current(i, "barcode", "");
        }
      }
    }
    
    // Update the ref for next comparison
    previousCheckedRowsRef.current = checkedRows;
  }, [checkedRows]);

  // ✅ NEW: Reset user modification tracking when product changes (new product or different edit)
  useEffect(() => {
    userModifiedCheckboxRef.current = false;
  }, [newProduct._id]); // Reset when product ID changes

  // ✅ FIX: Initialize search fields when editing a product
  // This syncs the dropdown search inputs with the loaded product data
  // Only initialize when product ID changes, not on every render
  useEffect(() => {
    if (newProduct.categoryId) {
      // categoryId can be a string or object {_id, name}
      const categoryName = typeof newProduct.categoryId === 'object' 
        ? newProduct.categoryId.name 
        : departments.find(d => d._id === newProduct.categoryId)?.name || '';
      setDepartmentSearch(categoryName);
    } else {
      setDepartmentSearch("");
    }
  }, [newProduct._id, newProduct.categoryId]); // Trigger when product ID or categoryId changes

  // ✅ FIX: Initialize subdepartment search when editing
  // Only initialize when product ID changes, not on every render
  useEffect(() => {
    if (newProduct.groupingId) {
      // groupingId can be a string or object {_id, name}
      const groupingName = typeof newProduct.groupingId === 'object' 
        ? newProduct.groupingId.name 
        : subdepartments.find(sd => sd._id === newProduct.groupingId)?.name || '';
      setSubdepartmentSearch(groupingName);
    } else {
      setSubdepartmentSearch("");
    }
  }, [newProduct._id, newProduct.groupingId]); // Trigger when product ID or groupingId changes

  // ✅ FIX: Initialize brand search when editing
  // Only initialize when product ID changes, not on every render
  useEffect(() => {
    if (newProduct.brandId) {
      // brandId can be a string or object {_id, name}
      const brandName = typeof newProduct.brandId === 'object' 
        ? newProduct.brandId.name 
        : brands.find(b => b._id === newProduct.brandId)?.name || '';
      setBrandSearch(brandName);
    } else {
      setBrandSearch("");
    }
  }, [newProduct._id, newProduct.brandId]); // Trigger when product ID or brandId changes

  // ✅ FIX: Initialize vendor search when editing
  // Only initialize when product ID changes, not on every render
  useEffect(() => {
    if (newProduct.vendor) {
      // vendor can be a string or object {_id, name}
      const vendorName = typeof newProduct.vendor === 'object' 
        ? newProduct.vendor.name 
        : vendors.find(v => v._id === newProduct.vendor)?.name || newProduct.vendor || '';
      setVendorSearch(vendorName);
    } else {
      setVendorSearch("");
    }
  }, [newProduct._id, newProduct.vendor]); // Trigger when product ID or vendor changes

  // Use ref to preserve callback reference and avoid stale closures in inline handlers
  // This ensures handlers always call the latest version of calculatePricingFields from parent
  const onPricingFieldChangeRef = useRef(onPricingFieldChange);

  useEffect(() => {
    onPricingFieldChangeRef.current = onPricingFieldChange;
  }, [onPricingFieldChange]);

  // Pricing calculation flow:
  // User enters value in pricing table → Field handler triggers → Parent's calculatePricingFields runs
  // Parent handles all math (cost, margin, tax, price calculations) → Parent updates pricingLines
  // Component re-renders with updated values from parent

  // Change unit type for a pricing line (e.g., PCS, KG, BOX)
  // Updates local state immediately for responsiveness, then triggers parent recalculation
  const handleUnitChange = (index, unitId) => {
    setLocalUnitSelections((prev) => {
      const updated = [...prev];
      updated[index] = unitId;
      return updated;
    });
    
    if (onPricingFieldChangeRef.current) {
      onPricingFieldChangeRef.current(index, "unit", unitId);
      // Factor is no longer auto-populated - user must manually change it
    }
    // Clear unit error
    if (errors.unit) {
      setErrors((prev) => ({ ...prev, unit: undefined }));
    }
  };

  // Helper function to allow only numbers and one decimal point
  const sanitizeDecimalInput = (value) => {
    // Remove all characters except digits and decimal point
    let cleaned = value.replace(/[^\d.]/g, '');
    
    // Keep only the FIRST decimal point
    let result = '';
    let hasDecimal = false;
    for (let char of cleaned) {
      if (char === '.') {
        if (!hasDecimal) {
          result += char;
          hasDecimal = true;
        }
      } else {
        result += char;
      }
    }
    return result;
  };

  // Update product cost for a pricing line
  // Parent will recalculate tax amount, margin %, and selling price based on new cost
  const handleCostChange = (index, costValue) => {
    const decimalValue = sanitizeDecimalInput(costValue);
    if (onPricingFieldChangeRef.current) {
      onPricingFieldChangeRef.current(index, "cost", decimalValue);
    }
    // Clear cost error
    if (errors.cost) {
      setErrors((prev) => ({ ...prev, cost: undefined }));
    }
  };

  // Update profit margin percentage for a pricing line
  // Parent will calculate margin amount and selling price: price = cost + (cost * margin%)
  const handleMarginPercentChange = (index, marginPercent) => {
    const decimalValue = sanitizeDecimalInput(marginPercent);
    if (onPricingFieldChangeRef.current) {
      onPricingFieldChangeRef.current(index, "margin", decimalValue);
    }
  };

  // Update profit margin amount (rupee value) for a pricing line
  // Parent will calculate margin % and selling price: price = cost + margin amount
  const handleMarginAmtChange = (index, marginAmt) => {
    const decimalValue = sanitizeDecimalInput(marginAmt);
    if (onPricingFieldChangeRef.current) {
      onPricingFieldChangeRef.current(index, "marginAmount", decimalValue);
    }
  };

  // Update selling price for a pricing line
  // Parent will reverse-calculate margin % and margin amount: margin = (price - cost) / cost * 100
  const handlePriceChange = (index, priceValue) => {
    const decimalValue = sanitizeDecimalInput(priceValue);
    if (onPricingFieldChangeRef.current) {
      onPricingFieldChangeRef.current(index, "price", decimalValue);
    }
    // Clear price error
    if (errors.price) {
      setErrors((prev) => ({ ...prev, price: undefined }));
    }
  };

  // Update unit conversion factor (e.g., 2 KG = 1 unit means factor = 2)
  // Used to calculate equivalent pricing when selling in different unit types
  const handleFactorChange = (index, factorValue) => {
    const decimalValue = sanitizeDecimalInput(factorValue);
    if (onPricingFieldChangeRef.current) {
      onPricingFieldChangeRef.current(index, "factor", decimalValue);
    }
  };

  // Update cost including tax
  const handleCostIncludeTaxChange = (index, costIncludeTaxValue) => {
    const decimalValue = sanitizeDecimalInput(costIncludeTaxValue);
    if (onPricingFieldChangeRef.current) {
      onPricingFieldChangeRef.current(index, "costIncludetax", decimalValue);
    }
  };

  // Filter functions for dropdown searches
  const filteredDepartments = departments.filter((d) =>
    d.name.toLowerCase().includes(departmentSearch.toLowerCase())
  );

  const filteredSubdepartments = subdepartments.filter((sd) =>
    sd.name.toLowerCase().includes(subdepartmentSearch.toLowerCase())
  );

  const filteredBrands = brands.filter((b) =>
    b.name.toLowerCase().includes(brandSearch.toLowerCase())
  );

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  // ✅ KEYBOARD NAVIGATION HANDLERS
  
  // Generic keyboard handler factory for dropdowns
  const createDropdownKeyHandler = (filterList, highlightedIndex, setHighlightedIndex, showDropdown, setShowDropdown, onSelect) => {
    return (e) => {
      if (!showDropdown || filterList.length === 0) {
        // If not showing dropdown or no items, only handle Enter to show/open
        if (e.key === 'Enter' && !showDropdown) {
          e.preventDefault();
          setShowDropdown(true);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => {
            const nextIndex = prev + 1 >= filterList.length ? 0 : prev + 1;
            return nextIndex;
          });
          break;
        
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => {
            const nextIndex = prev - 1 < 0 ? filterList.length - 1 : prev - 1;
            return nextIndex;
          });
          break;
        
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < filterList.length) {
            onSelect(filterList[highlightedIndex]);
            setHighlightedIndex(-1);
          }
          break;
        
        case 'Escape':
          e.preventDefault();
          setShowDropdown(false);
          setHighlightedIndex(-1);
          break;
        
        default:
          // Reset highlight when user types
          setHighlightedIndex(-1);
          break;
      }
    };
  };

  // Department dropdown keyboard handler
  const handleDepartmentKeyDown = createDropdownKeyHandler(
    filteredDepartments,
    highlightedDeptIndex,
    setHighlightedDeptIndex,
    showDeptDropdown,
    setShowDeptDropdown,
    (dept) => {
      setDepartmentSearch(dept.name);
      onCategoryChange(dept._id);
      setShowDeptDropdown(false);
    }
  );

  // Sub-department dropdown keyboard handler
  const handleSubdeptKeyDown = createDropdownKeyHandler(
    filteredSubdepartments,
    highlightedSubdeptIndex,
    setHighlightedSubdeptIndex,
    showSubdeptDropdown,
    setShowSubdeptDropdown,
    (subdept) => {
      setSubdepartmentSearch(subdept.name);
      onSubdepartmentChange(subdept._id);
      setShowSubdeptDropdown(false);
    }
  );

  // Brand dropdown keyboard handler
  const handleBrandKeyDown = createDropdownKeyHandler(
    filteredBrands,
    highlightedBrandIndex,
    setHighlightedBrandIndex,
    showBrandDropdown,
    setShowBrandDropdown,
    (brand) => {
      setBrandSearch(brand.name);
      setNewProduct({
        ...newProduct,
        brandId: brand._id,
      });
      setShowBrandDropdown(false);
    }
  );

  // Vendor dropdown keyboard handler
  const handleVendorKeyDown = createDropdownKeyHandler(
    filteredVendors,
    highlightedVendorIndex,
    setHighlightedVendorIndex,
    showVendorDropdown,
    setShowVendorDropdown,
    (vendor) => {
      setVendorSearch(vendor.name);
      setNewProduct({
        ...newProduct,
        vendor: vendor._id,
      });
      setShowVendorDropdown(false);
    }
  );

  // Calculate available stock for a specific pricing line (unit variant)
  // Returns calculated stock only if a unit variant is selected and stock exceeds the factor
  // This ensures we only show variant stock when: (1) unit is selected, (2) stock > factor
  const getStock = (index) => {
    // Only show stock if a unit variant is selected at this index
    if (!pricingLines[index]?.unit) {
      return 0;
    }
    
    const factor = parseFloat(pricingLines[index]?.factor) || 1;
    const baseStock = parseFloat(newProduct.stock) || 0;
    
    // Only show stock if baseStock is greater than or equal to factor
    if (baseStock >= factor) {
      return (baseStock / factor).toFixed(3);
    }
    return 0;
  };

  return (
    <div className="flex flex-col gap-0 h-full w-full overflow-y-auto">
      <>
        <div className="flex flex-col md:flex-row gap-1 flex-shrink-0">
          {/* Left Column: Basic product info (item code, name, category, vendor) */}
          <div className="w-3/5 space-y-1">
            {/* Row 1: Item Code & HSN Code */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 h-9 flex-1">
                <label className="text-xs font-semibold text-gray-700 w-20 flex-shrink-0">
                  Item Code *
                </label>

                <input
                  type="text"
                  placeholder="Item code"
                  autoComplete="off"
                  className={`border rounded px-2 py-1 text-xs flex-1 ${
                    errors.itemcode
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300"
                  }`}
                  value={newProduct.itemcode || ""}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      itemcode: e.target.value,
                    })
                  }
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={loading}
                />
              </div>

              {/* HSN Code (India-specific tax classification) */}
              <div className="flex items-center gap-2 h-9 flex-1">
                <label className="text-xs font-semibold text-gray-700 w-30 flex-shrink-0">
                  HSN Code
                  {isIndiaCompany && (
                    <span className="text-blue-600 ml-1">(India)</span>
                  )}
                </label>

                {isIndiaCompany ? (
                  <select
                    className="border border-gray-300 rounded px-2 py-1 text-xs flex-1"
                    value={newProduct.hsn}
                    onChange={(e) => onHSNSelection(e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={loading || loadingHsn}
                  >
                    <option value="">Select HSN Code...</option>
                    {hsnCodes.map((hsn) => (
                      <option key={hsn.code}>{hsn.code}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="HSN not available for this country"
                    className="border border-gray-300 rounded px-2 py-1 text-xs flex-1 bg-gray-100 text-gray-500 cursor-not-allowed"
                    disabled
                    value="India only"
                  />
                )}
              </div>
            </div>

            {/* Row 2: Product Name */}
            <div className="flex items-center gap-2 h-9">
              <label className="text-xs font-semibold text-gray-700 w-20 flex-shrink-0">
                Item Name *
              </label>
              <input
                type="text"
                placeholder="Enter product name"
                autoComplete="off"
                className={`border rounded px-1 py-1 text-xs flex-1 ${
                  errors.name ? "border-red-500 bg-red-50" : "border-gray-300"
                }`}
                value={newProduct.name || ""}
                onChange={(e) => {
                  const newName = e.target.value;
                  
                  // ✅ Auto-fill short name with ENTIRE item name (like a mirror)
                  let updatedProduct = {
                    ...newProduct,
                    name: newName,
                  };
                  
                  // Generate auto-fill suggestion (entire name, max 50 chars)
                  const generateShortName = (name) => {
                    if (!name || name.trim().length === 0) return '';
                    return name.trim().substring(0, 50);  // Full name up to 50 chars
                  };
                  
                  const autoFillSuggestion = generateShortName(newName);
                  
                  // Only auto-fill if:
                  // 1. Short name is empty, OR
                  // 2. Short name still matches the previous auto-fill (user hasn't manually edited)
                  const previousAutoFill = generateShortName(newProduct.name);
                  
                  if (!newProduct.shortName || newProduct.shortName === previousAutoFill) {
                    updatedProduct.shortName = autoFillSuggestion;
                  }
                  
                  setNewProduct(updatedProduct);
                  
                  // Clear error on change
                  if (errors.name) {
                    setErrors((prev) => ({ ...prev, name: undefined }));
                  }
                }}
                onFocus={() => {
                  // Clear error on focus
                  if (errors.name) {
                    setErrors((prev) => ({ ...prev, name: undefined }));
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={loading}
              />
            </div>

            {/* Row 3: Short Name (abbreviated product name) - Auto-filled but editable */}
            <div className="flex items-center gap-2 h-9">
              <label className="text-xs font-semibold text-gray-700 w-20 flex-shrink-0">
                Short Name
              </label>
              <input
                type="text"
                placeholder="Auto-filled from item name (edit as needed)"
                autoComplete="off"
                className="border border-gray-300 rounded px-1 py-1 text-xs flex-1"
                value={newProduct.shortName || ""}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    shortName: e.target.value,
                  })
                }
                onMouseDown={(e) => e.stopPropagation()}
                disabled={loading}
                title="Automatically filled with Item Name. You can trim or adjust this field."
              />
            </div>

            {/* Row 4: Local Name (regional language/name) */}
            <div className="flex items-center gap-2 h-9">
              <label className="text-xs font-semibold text-gray-700 w-20 flex-shrink-0">
                Local Name
              </label>
              <input
                type="text"
                placeholder="Local name"
                autoComplete="off"
                className="border border-gray-300 rounded px-1 py-1 text-xs flex-1"
                value={newProduct.localName || ""}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    localName: e.target.value,
                  })
                }
                onMouseDown={(e) => e.stopPropagation()}
                disabled={loading}
              />
            </div>

            {/* Row 5: Department (hierarchical category L1) - Inline Search */}
            <div className="flex items-center gap-2 h-9">
              <label className="text-xs font-semibold text-gray-700 w-20 flex-shrink-0">
                Department *
              </label>
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search departments..."
                  autoComplete="off"
                  className={`border rounded px-2 py-1 text-xs w-full ${
                    errors.categoryId
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300"
                  }`}
                  value={departmentSearch}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setDepartmentSearch(newValue);
                    setShowDeptDropdown(true);
                    setHighlightedDeptIndex(-1); // Reset highlight when typing
                  }}
                  onFocus={() => {
                    setShowDeptDropdown(true);
                    if (errors.categoryId) {
                      setErrors((prev) => ({ ...prev, categoryId: undefined }));
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowDeptDropdown(false), 200);
                  }}
                  onKeyDown={handleDepartmentKeyDown}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={loading}
                />
                {showDeptDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 border border-gray-300 bg-white rounded shadow-lg z-20 max-h-48 overflow-y-auto">
                    {filteredDepartments.length > 0 ? (
                      filteredDepartments.map((d, index) => (
                        <button
                          key={d._id}
                          type="button"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setDepartmentSearch(d.name);
                            onCategoryChange(d._id);
                            setShowDeptDropdown(false);
                          }}
                          onMouseEnter={() => setHighlightedDeptIndex(index)}
                          onKeyDown={(e) => e.stopPropagation()}
                          className={`w-full text-left px-3 py-2 text-xs border-b last:border-b-0 truncate transition ${
                            highlightedDeptIndex === index
                              ? "bg-blue-500 text-white font-semibold"
                              : "hover:bg-blue-100 border-gray-200"
                          }`}
                        >
                          {d.name}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-gray-500 text-center">No departments found</div>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  onOpenGroupingModal("1", null);
                }}
                className="px-2 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded text-xs font-medium flex-shrink-0 shadow-sm"
                title="Add Department"
              >
                ➕
              </button>
            </div>

            {/* Row 6: Sub-Department (hierarchical category L2, optional) - Inline Search */}
            <div className="flex items-center gap-2 h-9">
              <label className="text-xs font-semibold text-gray-700 w-20 flex-shrink-0">
                Sub-Depart.
              </label>
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search sub-departments..."
                  autoComplete="off"
                  className={`border rounded px-2 py-1 text-xs w-full ${
                    errors.groupingId
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300"
                  }`}
                  value={subdepartmentSearch}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setSubdepartmentSearch(newValue);
                    setShowSubdeptDropdown(true);
                    setHighlightedSubdeptIndex(-1); // Reset highlight when typing
                  }}
                  onFocus={() => {
                    if (newProduct.categoryId) {
                      setShowSubdeptDropdown(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowSubdeptDropdown(false), 200);
                  }}
                  onKeyDown={handleSubdeptKeyDown}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={loading || !newProduct.categoryId}
                />
                {showSubdeptDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 border border-gray-300 bg-white rounded shadow-lg z-20 max-h-48 overflow-y-auto" onMouseDown={(e) => e.stopPropagation()}>
                    {filteredSubdepartments.length > 0 ? (
                      filteredSubdepartments.map((sd, index) => (
                        <button
                          key={sd._id}
                          type="button"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setSubdepartmentSearch(sd.name);
                            onSubdepartmentChange(sd._id);
                            setShowSubdeptDropdown(false);
                          }}
                          onMouseEnter={() => setHighlightedSubdeptIndex(index)}
                          onKeyDown={(e) => e.stopPropagation()}
                          className={`w-full text-left px-3 py-2 text-xs border-b last:border-b-0 truncate transition ${
                            highlightedSubdeptIndex === index
                              ? "bg-blue-500 text-white font-semibold"
                              : "hover:bg-blue-100 border-gray-200"
                          }`}
                        >
                          {sd.name}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-gray-500 text-center">No sub-departments found</div>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  const catId =
                    typeof newProduct.categoryId === "object"
                      ? newProduct.categoryId._id
                      : newProduct.categoryId;
                  onOpenGroupingModal("2", catId);
                }}
                className="px-2 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded text-xs font-medium flex-shrink-0 disabled:opacity-50 shadow-sm"
                title="Add Sub-Department"
              >
                ➕
              </button>
            </div>

            {/* Row 7: Brand (manufacturer/brand, optional) - Inline Search */}
            <div className="flex items-center gap-2 h-9">
              <label className="text-xs font-semibold text-gray-700 w-20 flex-shrink-0">
                Brand
              </label>
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search brands..."
                  autoComplete="off"
                  className={`border rounded px-2 py-1 text-xs w-full ${
                    errors.brandId
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300"
                  }`}
                  value={brandSearch}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setBrandSearch(newValue);
                    setShowBrandDropdown(true);
                    setHighlightedBrandIndex(-1); // Reset highlight when typing
                  }}
                  onFocus={() => {
                    if (newProduct.groupingId) {
                      setShowBrandDropdown(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowBrandDropdown(false), 200);
                  }}
                  onKeyDown={handleBrandKeyDown}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={loading || !newProduct.groupingId}
                />
                {showBrandDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 border border-gray-300 bg-white rounded shadow-lg z-20 max-h-48 overflow-y-auto" onMouseDown={(e) => e.stopPropagation()}>
                    {filteredBrands.length > 0 ? (
                      filteredBrands.map((b, index) => (
                        <button
                          key={b._id}
                          type="button"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setBrandSearch(b.name);
                            setNewProduct({
                              ...newProduct,
                              brandId: b._id,
                            });
                            setShowBrandDropdown(false);
                          }}
                          onMouseEnter={() => setHighlightedBrandIndex(index)}
                          onKeyDown={(e) => e.stopPropagation()}
                          className={`w-full text-left px-3 py-2 text-xs border-b last:border-b-0 truncate transition ${
                            highlightedBrandIndex === index
                              ? "bg-blue-500 text-white font-semibold"
                              : "hover:bg-blue-100 border-gray-200"
                          }`}
                        >
                          {b.name}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-gray-500 text-center">No brands found</div>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  const groupId =
                    typeof newProduct.groupingId === "object"
                      ? newProduct.groupingId._id
                      : newProduct.groupingId;
                  onOpenGroupingModal("3", groupId);
                }}
                className="px-2 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded text-xs font-medium flex-shrink-0 disabled:opacity-50 shadow-sm"
                title="Add Brand"
              >
                ➕
              </button>
            </div>

            {/* Row 8: Vendor (supplier who provides this product) - Inline Search */}
            <div className="flex items-center gap-2 h-9">
              <label className="text-xs font-semibold text-gray-700 w-20 flex-shrink-0">
                Vendor *
              </label>
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search vendors..."
                  autoComplete="off"
                  className={`border rounded px-2 py-1 text-xs w-full ${
                    errors.vendor
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300"
                  }`}
                  value={vendorSearch}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setVendorSearch(newValue);
                    setShowVendorDropdown(true);
                    setHighlightedVendorIndex(-1); // Reset highlight when typing
                    if (errors.vendor) {
                      setErrors((prev) => ({ ...prev, vendor: undefined }));
                    }
                  }}
                  onFocus={() => {
                    setShowVendorDropdown(true);
                    if (errors.vendor) {
                      setErrors((prev) => ({ ...prev, vendor: undefined }));
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowVendorDropdown(false), 200);
                  }}
                  onKeyDown={handleVendorKeyDown}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={loading}
                />
                {showVendorDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 border border-gray-300 bg-white rounded shadow-lg z-20 max-h-48 overflow-y-auto" onMouseDown={(e) => e.stopPropagation()}>
                    {filteredVendors.length > 0 ? (
                      filteredVendors.map((v, index) => (
                        <button
                          key={v._id}
                          type="button"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setVendorSearch(v.name);
                            setNewProduct({
                              ...newProduct,
                              vendor: v._id,
                            });
                            setShowVendorDropdown(false);
                          }}
                          onMouseEnter={() => setHighlightedVendorIndex(index)}
                          onKeyDown={(e) => e.stopPropagation()}
                          className={`w-full text-left px-3 py-2 text-xs border-b last:border-b-0 truncate transition ${
                            highlightedVendorIndex === index
                              ? "bg-blue-500 text-white font-semibold"
                              : "hover:bg-blue-100 border-gray-200"
                          }`}
                        >
                          {v.name}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-gray-500 text-center">No vendors found</div>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  onOpenVendorModal();
                }}
                className="px-2 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded text-xs font-medium flex-shrink-0 shadow-sm"
                title="Add Vendor"
              >
                ➕
              </button>
            </div>
          </div>

          {/* Right Column: Additional info (taxes, stock levels, flags) */}
          <div className="w-2/5   rounded-lg p-3">

            <div className="grid grid-cols-2  gap-3 p-2">
              <div className="bg-white p-2">
                {/* Tax Type Selection */}
                <div className="flex items-center  gap-3 h-9 mb-2 pl-2">
                  <label className="text-xs font-semibold text-gray-700 w-10 flex-shrink-0">
                    TAX
                  </label>

                  {isIndiaCompany ? (
                    // India: Tax is auto-fetched from HSN code (GST regulations), user cannot change
                    <input
                      type="text"
                      placeholder="Auto-filled from HSN"
                      className="border rounded px-2 py-1 text-xs flex-1 w-10 bg-blue-50 font-semibold text-blue-700"
                      value={newProduct.taxType || ""}
                      disabled={true}
                    />
                  ) : (
                    // Non-India countries: User selects applicable tax from master data
                    // Tax% is used to calculate tax amount and can affect selling price
                    <div className="flex-1 flex flex-col">
                      <select
                        value={newProduct.taxType || ""}
                        onChange={(e) => {
                          const selectedTax = filteredTaxes.find(
                            (t) => t._id === e.target.value,
                          );

                         
                          const newTaxPercent = selectedTax?.totalRate || 0;
                          if (handleTaxSelectionAndRecalculation) {
                            handleTaxSelectionAndRecalculation(e.target.value, newTaxPercent);
                          }
                          
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={`border rounded px-2 py-1 text-xs flex-1 ${
                          errors.taxType
                            ? "border-red-500 bg-red-50"
                            : "border-gray-300"
                        }`}
                        disabled={loading || filteredTaxes.length === 0}
                      >
                        <option value="">
                          {loadingTaxes
                            ? "Loading taxes..."
                            : filteredTaxes.length === 0
                              ? `No taxes for ${activeCountryCode}`
                              : " Select Tax"}
                        </option>
                        {filteredTaxes.map((tax) => (
                          <option key={tax._id} value={tax._id}>
                            {tax.taxName}
                          </option>
                        ))}
                      </select>
                      {filteredTaxes.length === 0 && !loadingTaxes && (
                        <div className="text-xs text-orange-500 mt-1">
                          ℹ️ No taxes configured for {activeCountryCode}. Check
                          tax master settings.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Current Available Stock (on-hand inventory) */}
                <div className="flex items-center gap-3 h-9">
                  <label className="text-xs font-semibold text-gray-700 w-20 p-2 flex-shrink-0">
                    Stock O/H
                  </label>

                  <input
                    type="number"
                    placeholder="0"
                    className="border rounded px-2 py-1 text-xs text-center flex-1 w-10 border-gray-300"
                    value={newProduct.stock ?? 0}
                    onChange={(e) => {
                      setNewProduct({
                        ...newProduct,
                        stock: e.target.value === '' ? 0 : e.target.value,
                      });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={loading}
                  />
                </div>

                {/* Reorder Point (alert when stock falls below this) */}
                <div className="flex items-center gap-3 h-9">
                  <label className="text-xs font-semibold text-gray-700 w-20 p-2 flex-shrink-0">
                    Min Stock
                  </label>
                  <input
                    type="number"
                    className="border rounded px-2 py-1 text-xs text-center flex-1 w-10 border-gray-300"
                    value={newProduct.minStock ?? 0}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        minStock: e.target.value === '' ? 0 : e.target.value,
                      })
                    }
                    disabled={loading}
                  />
                </div>
              </div>
                      {/* Summary box for stock and unit info */}
              <div className="bg-blue-50 border border-blue-300 p-3 rounded-lg">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-700">{pricingLines[0]?.unit 
                        ? units?.find(u => String(u._id) === String(pricingLines[0].unit))?.unitName || 'N/A'
                        : 'Select unit'}</span>
                    <span className="text-sm font-bold text-blue-600">{newProduct.stock ?? 0}</span>

                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-700">{pricingLines[0]?.unit 
                        ? units?.find(u => String(u._id) === String(pricingLines[1].unit))?.unitName || 'N/A'
                        : 'Select unit'}</span>
                        <span className="text-sm font-bold text-blue-600">{getStock(1)}</span>
                    

                      


                   
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-700">{pricingLines[0]?.unit 
                        ? units?.find(u => String(u._id) === String(pricingLines[2].unit))?.unitName || 'N/A'
                        : 'Select unit'}</span>
                    <span className="text-sm font-bold text-blue-600">{getStock(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-700">{pricingLines[0]?.unit 
                        ? units?.find(u => String(u._id) === String(pricingLines[3].unit))?.unitName || 'N/A'
                        : 'Select unit'}</span>
                    <span className="text-sm font-bold text-blue-600">{getStock(3)}</span>
                  </div>





                  
                  
                  
                
                 
                  
                </div>
              </div>
            </div>

            {/* Product Control Flags */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Flag: Prevent sales (hold item) */}
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="itemHold"
                    checked={newProduct.itemHold || false}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        itemHold: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                  />
                  <label
                    htmlFor="itemHold"
                    className="text-xs font-semibold text-gray-700 cursor-pointer"
                  >
                    Item Hold
                  </label>
                </div>

                {/* Flag: Allow flexible pricing at POS - Allow Open Price */}
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="AllowOpenPrice"
                    checked={newProduct.allowOpenPrice || false}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        allowOpenPrice: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                  />
                  <label
                    htmlFor="AllowOpenPrice"
                    className="text-xs font-semibold text-gray-700 cursor-pointer"
                  >
                    Open Price Allowed
                  </label>
                </div>
                {/* Flag: Apply discounts/promotions */}
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="EnablePromotion"
                    checked={newProduct.enablePromotion || false}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        enablePromotion: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                  />
                  <label
                    htmlFor="EnablePromotion"
                    className="text-xs font-semibold text-gray-700 cursor-pointer"
                  >
                    Enable Promotion
                  </label>
                </div>
                {/* Flag: High-velocity product (for inventory analysis) */}
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="FastMovingItem"
                    checked={newProduct.fastMovingItem || false}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        fastMovingItem: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                  />
                  <label
                    htmlFor="FastMovingItem"
                    className="text-xs font-semibold text-gray-700 cursor-pointer"
                  >
                    Fast Moving Item
                  </label>
                </div>
                {/* Flag: Display price includes tax (affects price display) */}
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="TaxInPrice"
                    checked={newProduct.taxInPrice || false}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        taxInPrice: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                  />
                  <label
                    htmlFor="TaxInPrice"
                    className="text-xs font-semibold text-gray-700 cursor-pointer"
                  >
                    Tax In Price
                  </label>
                </div>

                {/* Flag: Enable batch/expiry date tracking at warehouse */}
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="trackExpiry"
                    checked={newProduct.trackExpiry || false}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        trackExpiry: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                  />
                  <label
                    htmlFor="trackExpiry"
                    className="text-xs font-semibold text-gray-700 cursor-pointer"
                  >
                    Track Expiry
                  </label>
                </div>

                {/* Flag: Weighed item at checkout (requires scale hardware) */}
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="IsScaleItem"
                    checked={newProduct.isScaleItem || false}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        isScaleItem: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                  />
                  <label
                    htmlFor="IsScaleItem"
                    className="text-xs font-semibold text-gray-700 cursor-pointer"
                  >
                    Is Scale Item
                  </label>
                </div>

                <div className="flex items-center gap-2.5">
                  <select
                    value={newProduct.scaleUnitType || ''}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        scaleUnitType: e.target.value,
                      })
                    }
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={!newProduct.isScaleItem}
                    className={`border px-2 py-1 rounded text-xs ${
                      !newProduct.isScaleItem
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-700"
                    }`}
                  >
                    <option value="">Unit of Measure</option>
                    <option value="Weight">Weight</option>
                    <option value="Quantity">Quantity</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>

      {/* Pricing Configuration Table: Unit variants with cost, margin, and price settings */}
      <div className="overflow-x-auto mt-1">
        {/* 
          Pricing Matrix Guide:
          - Row 0 (checked, mandatory): Base Unit - All fields editable. Primary pricing reference.
          - Rows 1-3 (optional): Variant Units - Limited fields editable. Inherits cost/tax from base.
          
          Field Editability:
          - Row 0: Cost, Margin%, MarginAmt, Price, CostIncludeTax, Barcode (all editable)
          - Rows 1-3: Unit, Factor, Cost, Margin%, MarginAmt, Price, Barcode (editable);
                      CostIncludeTax is read-only (calculated from base row)
          
          Data Flow: User input → Parent calculates all dependent fields → Component displays results
        */}
        <table className="w-full table-auto bg-white border border-gray-200 rounded-lg shadow-sm">
          <thead className="bg-gray-100 sticky top-0 z-11">
            <tr>
              <th className="w-12 px-0.5 py-1.5 text-center text-xs font-semibold text-gray-700 border-b border-gray-200">
                <input
                  type="checkbox"
                  checked={checkedRows[1] && checkedRows[2] && checkedRows[3]}
                  onChange={(e) => {
                    // ✅ Mark that user manually changed checkboxes
                    userModifiedCheckboxRef.current = true;
                    if (e.target.checked) {
                      // Check all variant rows (1, 2, 3)
                      setCheckedRows([true, true, true, true]);
                    } else {
                      // Uncheck all variant rows, keep only base unit
                      // ✅ Clearing is now handled by useEffect when checkedRows changes
                      setCheckedRows([true, false, false, false]);
                    }
                  }}
                  title={
                    checkedRows[1] && checkedRows[2] && checkedRows[3]
                      ? "Uncheck all variant rows"
                      : "Check all variant rows"
                  }
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                />
              </th>
              <th className="w-24 px-1 py-1.5 text-center text-xs font-semibold text-gray-700 border-b border-gray-200">
                Unit Type
              </th>
              <th className="w-14 px-1 py-1.5 text-center text-xs font-semibold text-gray-700 border-b border-gray-200">
                Factor
              </th>
              <th className="w-20 px-1 py-1.5 text-center text-xs font-semibold text-gray-700 border-b border-gray-200">
                Cost
              </th>
              <th className="w-20 px-1 py-1.5 text-center text-xs font-semibold text-gray-700 border-b border-gray-200">
                Cost
                <div className="text-xs font-normal text-gray-600 mt-0.5">
                  Tax Incl.
                </div>
              </th>
              <th className="w-20 px-1 py-1.5 text-center text-xs font-semibold text-gray-700 border-b border-gray-200">
                Margin %
              </th>
              <th className="w-20 px-1 py-1.5 text-center text-xs font-semibold text-gray-700 border-b border-gray-200">
                Margin Amt
              </th>
              <th className="w-20 px-1 py-1.5 text-center text-xs font-semibold text-gray-700 border-b border-gray-200">
                Tax Amt
              </th>
              <th className="w-20 px-1 py-1.5 text-center text-xs font-semibold text-gray-700 border-b border-gray-200">
                Price
                <div className="text-xs font-normal text-gray-600 mt-0.5">
                  {newProduct.taxInPrice ? "Tax Incl." : "Tax Excl."}
                </div>
              </th>
              <th className="w-32 px-1 py-1.5 text-center text-xs font-semibold text-gray-700 border-b border-gray-200">
                Barcode
              </th>
              <th className="w-28 px-1 py-1.5 text-center text-xs font-semibold text-gray-700 border-b border-gray-200">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className={checkedRows[i] ? "" : "opacity-40 bg-gray-50"}>
                <td className="w-12 px-0.5 py-1 text-center text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={checkedRows[i]}
                    disabled={i === 0 || (i > 0 && !checkedRows[i - 1])}
                    onChange={(e) => {
                      if (i !== 0) {
                        // ✅ Mark that user manually changed checkboxes
                        userModifiedCheckboxRef.current = true;
                        const newCheckedRows = [...checkedRows];
                        if (e.target.checked) {
                          // Only allow checking if previous row is checked
                          if (i > 0 && !checkedRows[i - 1]) {
                            return; // Don't check if previous row unchecked
                          }
                          newCheckedRows[i] = true;
                        } else {
                          // If unchecking, also uncheck all rows after it
                          // ✅ Clearing is now handled by useEffect when checkedRows changes
                          newCheckedRows[i] = false;
                          for (let j = i + 1; j < 4; j++) {
                            newCheckedRows[j] = false;
                          }
                        }
                        setCheckedRows(newCheckedRows);
                      }
                    }}
                    title={
                      i === 0
                        ? "Base unit - cannot be disabled"
                        : i > 0 && !checkedRows[i - 1]
                          ? "Enable previous row first"
                          : ""
                    }
                    className={`w-4 h-4 rounded border-gray-300 text-blue-600 ${i === 0 || (i > 0 && !checkedRows[i - 1]) ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                  />
                </td>
                <td className="w-24 px-1 py-1 text-center text-xs text-gray-700">
                  <select
                    disabled={i === 0 && !checkedRows[i]}
                    value={localUnitSelections[i] || ""}
                    onChange={(e) => {
                      handleUnitChange(i, String(e.target.value));
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full border rounded px-1 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 border-blue-500 bg-white disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-500 disabled:border-gray-300"
                  >
                    <option value="">
                      {!units
                        ? "Units not loaded"
                        : units.length === 0
                          ? "No units available"
                          : `Select Unit (${units.length})`}
                    </option>
                    {units &&
                      Array.isArray(units) &&
                      units.length > 0 &&
                      units
                        .filter((unit) => {
                          // For base unit: only show baseUnit === true
                          if (i === 0) return unit.baseUnit === true;
                          
                          // For variant units: exclude already-selected units in other rows
                          const isAlreadySelected = 
                            pricingLines.some((line, idx) => 
                              idx !== i && String(line.unit) === String(unit._id)
                            );
                          
                          return !isAlreadySelected;
                        })
                        .sort((a, b) => {
                          // ✅ Base unit (row 0): Keep selected unit first (don't sort)
                          if (i === 0) {
                            const selectedUnitId = String(pricingLines[i]?.unit || "");
                            const aIsSelected = String(a._id) === selectedUnitId;
                            const bIsSelected = String(b._id) === selectedUnitId;
                            
                            // Selected unit comes first
                            if (aIsSelected && !bIsSelected) return -1;
                            if (!aIsSelected && bIsSelected) return 1;
                            return 0; // Keep original order for non-selected
                          }
                          
                          // ✅ Variant units (rows 1-3): Sort alphabetically
                          return (a.unitName || "").localeCompare(b.unitName || "");
                        })
                        .map((unit) => (
                          <option key={unit._id} value={String(unit._id)}>
                            {unit.unitName} ({unit.unitSymbol})
                          </option>
                        ))}
                  </select>
                </td>
                <td className={`w-14 px-1 py-1 text-center text-xs ${i === 0 ? "text-gray-700" : "bg-white"}`}>
                  <input
                    type="text"
                    disabled={i === 0}
                    value={(() => {
                      const val = i === 0 
                        ? (pricingLines[i]?.factor !== undefined && pricingLines[i]?.factor !== "" ? pricingLines[i].factor : "1")
                        : (pricingLines[i]?.factor ?? "");
                      // While editing, use temporary editingValues; otherwise, use stored formatted value
                      if (focusedField === `${i}-factor` && editingValues[`${i}-factor`] !== undefined) {
                        return editingValues[`${i}-factor`];
                      }
                      return val && !isNaN(parseFloat(val)) ? formatNumber(parseFloat(val)) : val;
                    })()}
                    onFocus={() => {
                      setFocusedField(`${i}-factor`);
                      setEditingValues({ ...editingValues, [`${i}-factor`]: pricingLines[i]?.factor ?? "" });
                    }}
                    onChange={(e) => {
                      // Update temporary editing value - don't call parent yet
                      setEditingValues({ ...editingValues, [`${i}-factor`]: e.target.value });
                    }}
                    onBlur={(e) => {
                      setFocusedField(null);
                      const finalValue = editingValues[`${i}-factor`] ?? e.target.value;
                      const numValue = parseFloat(finalValue) || 0;
                      setEditingValues((prev) => {
                        const updated = { ...prev };
                        delete updated[`${i}-factor`];
                        return updated;
                      });
                      if (onPricingFieldChangeRef.current) {
                        onPricingFieldChangeRef.current(i, "factor", numValue.toString());
                      }
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    title={i === 0 ? "Base unit factor is read-only" : "Factor determines cost and cost+tax for variant units"}
                    className="w-full border rounded px-1 py-1 text-center text-xs focus:outline-none border-blue-500 focus:ring-2 focus:ring-blue-400 disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-500 disabled:border-gray-300"
                  />
                </td>
                <td className="w-20 px-1 py-1 text-center text-xs text-gray-700">
                  {i === 0 ? (
                    // Base unit (row 0): User editable
                    <input
                      type="text"
                      disabled={i === 0 && !checkedRows[i]}
                      value={(() => {
                        // While editing, use temporary editingValues; otherwise, use stored formatted value
                        if (focusedField === `${i}-cost` && editingValues[`${i}-cost`] !== undefined) {
                          return editingValues[`${i}-cost`];
                        }
                        const val = pricingLines[i]?.cost ?? "";
                        return val && !isNaN(parseFloat(val)) ? formatNumber(parseFloat(val)) : val;
                      })()}
                      onFocus={() => {
                        setFocusedField(`${i}-cost`);
                        // Initialize editing value with current cost (raw)
                        setEditingValues({ ...editingValues, [`${i}-cost`]: pricingLines[i]?.cost ?? "" });
                      }}
                      onChange={(e) => {
                        // Update temporary editing value - don't call parent yet
                        setEditingValues({ ...editingValues, [`${i}-cost`]: e.target.value });
                      }}
                      onBlur={(e) => {
                        setFocusedField(null);
                        // Clear editing value and trigger parent calculation with final value
                        const finalValue = editingValues[`${i}-cost`] ?? e.target.value;
                        const numValue = parseFloat(finalValue) || 0;
                        
                        setEditingValues((prev) => {
                          const updated = { ...prev };
                          delete updated[`${i}-cost`];
                          return updated;
                        });
                        
                        // Always trigger parent calculation on blur
                        if (onPricingFieldChangeRef.current) {
                          onPricingFieldChangeRef.current(i, "cost", numValue.toString());
                        }
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-full border rounded px-1 py-1 text-center text-xs focus:outline-none border-blue-500 focus:ring-2 focus:ring-blue-400 disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-500 disabled:border-gray-300"
                    />
                  ) : (
                    // Variant units (rows 1-3): Read-only, calculated as base cost × factor
                    <input
                      type="text"
                      disabled={true}
                      readOnly
                      value={(() => {
                        // ✅ If row is unchecked, show empty
                        if (!checkedRows[i]) return "";
                        
                        // Use stored variant cost if available (show formatted)
                        if (pricingLines[i]?.cost && pricingLines[i]?.cost !== "") {
                          const val = parseFloat(pricingLines[i].cost) || 0;
                          return formatNumber(val);
                        }
                        
                        // Fallback: calculate from base cost × factor (show formatted)
                        const baseCost = parseFloat(pricingLines[0]?.cost) || 0;
                        const factor = parseFloat(pricingLines[i]?.factor) || 1;
                        const calculatedCost = baseCost * factor;
                        return formatNumber(calculatedCost);
                      })()}
                      className="w-full border rounded px-1 py-1 text-center text-xs focus:outline-none bg-gray-200 border-gray-400 text-gray-700 cursor-not-allowed pointer-events-none"
                    />
                  )}
                </td>
                <td className="w-20 px-1 py-1 text-center text-xs text-gray-700">
                  {i === 0 ? (
                    // Base unit (row 0): User editable, important for tax and cost calculations
                    <input
                      type="text"
                      disabled={i === 0 && !checkedRows[i]}
                      value={(() => {
                        // While editing, use temporary editingValues; otherwise, use stored formatted value
                        if (focusedField === `${i}-costIncludetax` && editingValues[`${i}-costIncludetax`] !== undefined) {
                          return editingValues[`${i}-costIncludetax`];
                        }
                        const val = pricingLines[i]?.costIncludetax ?? "";
                        return val && !isNaN(parseFloat(val)) ? formatNumber(parseFloat(val)) : val;
                      })()}
                      onFocus={() => {
                        setFocusedField(`${i}-costIncludetax`);
                        setEditingValues({ ...editingValues, [`${i}-costIncludetax`]: pricingLines[i]?.costIncludetax ?? "" });
                      }}
                      onChange={(e) => {
                        // Update temporary editing value - don't call parent yet
                        setEditingValues({ ...editingValues, [`${i}-costIncludetax`]: e.target.value });
                      }}
                      onBlur={(e) => {
                        setFocusedField(null);
                        const finalValue = editingValues[`${i}-costIncludetax`] ?? e.target.value;
                        const numValue = parseFloat(finalValue) || 0;
                        setEditingValues((prev) => {
                          const updated = { ...prev };
                          delete updated[`${i}-costIncludetax`];
                          return updated;
                        });
                        if (onPricingFieldChangeRef.current) {
                          onPricingFieldChangeRef.current(i, "costIncludetax", numValue.toString());
                        }
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-full border rounded px-1 py-1 text-center text-xs focus:outline-none border-blue-500 focus:ring-2 focus:ring-blue-400 disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-500 disabled:border-gray-300"
                    />
                  ) : (
                    // Variant units (rows 1-3): Read-only, calculated as base costIncludeTax × factor
                    <input
                      type="text"
                      disabled={true}
                      readOnly
                      value={(() => {
                        // ✅ If row is unchecked, show empty
                        if (!checkedRows[i]) return "";
                        
                        // Use stored variant costIncludetax if available (show formatted)
                        if (pricingLines[i]?.costIncludetax && pricingLines[i]?.costIncludetax !== "") {
                          const val = parseFloat(pricingLines[i].costIncludetax) || 0;
                          return formatNumber(val);
                        }
                        
                        // Fallback: calculate from base costIncludeTax × factor (show formatted)
                        const baseCostIncludeTax = parseFloat(pricingLines[0]?.costIncludetax) || 0;
                        const factor = parseFloat(pricingLines[i]?.factor) || 1;
                        const calculatedCostIncludeTax = baseCostIncludeTax * factor;
                        return formatNumber(calculatedCostIncludeTax);
                      })()}
                      className="w-full border rounded px-1 py-1 text-center text-xs focus:outline-none bg-gray-200 border-gray-400 text-gray-700 cursor-not-allowed pointer-events-none"
                    />
                  )}
                </td>
                <td className="w-20 px-1 py-1 text-center text-xs text-gray-700">
                  <input
                    type="text"
                    value={(() => {
                      // While editing, use temporary editingValues; otherwise, use stored formatted value
                      if (focusedField === `${i}-margin` && editingValues[`${i}-margin`] !== undefined) {
                        return editingValues[`${i}-margin`];
                      }
                      const val = pricingLines[i]?.margin ?? "";
                      return val && !isNaN(parseFloat(val)) ? formatNumber(parseFloat(val)) : val;
                    })()}
                    onFocus={() => {
                      setFocusedField(`${i}-margin`);
                      setEditingValues({ ...editingValues, [`${i}-margin`]: pricingLines[i]?.margin ?? "" });
                    }}
                    onChange={(e) => {
                      // Update temporary editing value - don't call parent yet
                      setEditingValues({ ...editingValues, [`${i}-margin`]: e.target.value });
                    }}
                    onBlur={(e) => {
                      setFocusedField(null);
                      const finalValue = editingValues[`${i}-margin`] ?? e.target.value;
                      const numValue = parseFloat(finalValue) || 0;
                      setEditingValues((prev) => {
                        const updated = { ...prev };
                        delete updated[`${i}-margin`];
                        return updated;
                      });
                      if (onPricingFieldChangeRef.current) {
                        onPricingFieldChangeRef.current(i, "margin", numValue.toString());
                      }
                    }}
                    disabled={i === 0 && !checkedRows[i]}
                    title={i === 0 && !checkedRows[i] ? "Row disabled" : ""}
                    className="w-full border rounded px-1 py-1 text-center text-xs focus:outline-none border-blue-500 focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500 disabled:border-gray-300"
                  />
                </td>
                <td className="w-20 px-1 py-1 text-center text-xs text-gray-700">
                  <input
                    type="text"
                    value={(() => {
                      // While editing, use temporary editingValues; otherwise, use stored formatted value
                      if (focusedField === `${i}-marginAmount` && editingValues[`${i}-marginAmount`] !== undefined) {
                        return editingValues[`${i}-marginAmount`];
                      }
                      const val = pricingLines[i]?.marginAmount ?? "";
                      return val && !isNaN(parseFloat(val)) ? formatNumber(parseFloat(val)) : val;
                    })()}
                    onFocus={() => {
                      setFocusedField(`${i}-marginAmount`);
                      setEditingValues({ ...editingValues, [`${i}-marginAmount`]: pricingLines[i]?.marginAmount ?? "" });
                    }}
                    onChange={(e) => {
                      // Update temporary editing value - don't call parent yet
                      setEditingValues({ ...editingValues, [`${i}-marginAmount`]: e.target.value });
                    }}
                    onBlur={(e) => {
                      setFocusedField(null);
                      const finalValue = editingValues[`${i}-marginAmount`] ?? e.target.value;
                      const numValue = parseFloat(finalValue) || 0;
                      setEditingValues((prev) => {
                        const updated = { ...prev };
                        delete updated[`${i}-marginAmount`];
                        return updated;
                      });
                      if (onPricingFieldChangeRef.current) {
                        onPricingFieldChangeRef.current(i, "marginAmount", numValue.toString());
                      }
                    }}
                    disabled={i === 0 && !checkedRows[i]}
                    title={i === 0 && !checkedRows[i] ? "Row disabled" : ""}
                    className="w-full border rounded px-1 py-1 text-center text-xs focus:outline-none border-blue-500 focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500 disabled:border-gray-300"
                  />
                </td>
                <td className="w-20 px-1 py-1 text-center text-xs text-gray-700">
                  <input
                    type="text"
                    disabled={true}
                    readOnly
                    onKeyDown={(e) => e.preventDefault()}
                    onChange={(e) => e.preventDefault()}
                    value={((i) => {
                      // ✅ If row is unchecked, show empty
                      if (!checkedRows[i]) return "";
                      
                      const taxRate = parseFloat(newProduct.taxPercent) || 0;
                      const price = parseFloat(pricingLines[i]?.price) || 0;
                      
                      // Always calculate from price if available
                      if (price > 0 && taxRate > 0) {
                        const taxAmount = newProduct.taxInPrice
                          ? ((price * taxRate) / (100 + taxRate))
                          : (price * taxRate / 100);
                        // Use formatNumber to apply country-based decimal control
                        return formatNumber(taxAmount);
                      }
                      
                      // Fallback to stored value if available
                      if (pricingLines[i]?.taxAmount && pricingLines[i]?.taxAmount !== "") {
                        const storedTax = parseFloat(pricingLines[i].taxAmount) || 0;
                        return formatNumber(storedTax);
                      }
                      
                      return "0";
                    })(i)}
                    className="w-full border rounded px-1 py-1 text-center text-xs focus:outline-none bg-gray-200 border-gray-400 text-gray-700 cursor-not-allowed pointer-events-none"
                  />
                </td>
                <td className="w-20 px-1 py-1 text-center text-xs text-gray-700">
                  <input
                    type="text"
                    value={(() => {
                      // While editing, use temporary editingValues; otherwise, use stored formatted value
                      if (focusedField === `${i}-price` && editingValues[`${i}-price`] !== undefined) {
                        return editingValues[`${i}-price`];
                      }
                      const val = pricingLines[i]?.price ?? "";
                      return val && !isNaN(parseFloat(val)) ? formatNumber(parseFloat(val)) : val;
                    })()}
                    onFocus={() => {
                      setFocusedField(`${i}-price`);
                      setEditingValues({ ...editingValues, [`${i}-price`]: pricingLines[i]?.price ?? "" });
                    }}
                    onChange={(e) => {
                      // Update temporary editing value - don't call parent yet
                      setEditingValues({ ...editingValues, [`${i}-price`]: e.target.value });
                    }}
                    onBlur={(e) => {
                      setFocusedField(null);
                      const finalValue = editingValues[`${i}-price`] ?? e.target.value;
                      const numValue = parseFloat(finalValue) || 0;
                      setEditingValues((prev) => {
                        const updated = { ...prev };
                        delete updated[`${i}-price`];
                        return updated;
                      });
                      if (onPricingFieldChangeRef.current) {
                        onPricingFieldChangeRef.current(i, "price", numValue.toString());
                      }
                    }}
                    disabled={i === 0 && !checkedRows[i]}
                    title={i === 0 && !checkedRows[i] ? "Row disabled" : ""}
                    className="w-full border rounded px-1 py-1 text-center text-xs focus:outline-none border-blue-500 focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500 disabled:border-gray-300"
                  />
                </td>
                <td className="w-32 px-1 py-1 text-center text-xs text-gray-700">
                  {i === 0 ? (
                    // Base unit (row 0): Barcode editable, or auto-generated from item code + dept + unit
                    <div className="flex gap-1 items-center">
                      <input
                        type="text"
                        disabled={i === 0 && !checkedRows[i]}
                        value={pricingLines[i]?.barcode ?? ""}
                        onChange={(e) => {
                          if (onPricingFieldChangeRef.current) {
                            onPricingFieldChangeRef.current(
                              i,
                              "barcode",
                              e.target.value,
                            );
                          }
                          // Clear barcode error
                          if (errors.barcode) {
                            setErrors((prev) => ({ ...prev, barcode: undefined }));
                          }
                        }}
                        className="w-full border rounded px-1 py-1 text-center text-xs focus:outline-none border-blue-500 focus:ring-2 focus:ring-blue-400 disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-500 disabled:border-gray-300"
                      />
                    </div>
                  ) : (
                    // Variant units (rows 1-3): Barcode editable
                    <div className="flex gap-1 items-center">
                      <input
                        type="text"
                        disabled={false}
                        value={pricingLines[i]?.barcode ?? ""}
                        onChange={(e) => {
                          if (onPricingFieldChangeRef.current) {
                            onPricingFieldChangeRef.current(
                              i,
                              "barcode",
                              e.target.value,
                            );
                          }
                          // Clear barcode error
                          if (errors.barcode) {
                            setErrors((prev) => ({ ...prev, barcode: undefined }));
                          }
                        }}
                        className="w-full border rounded px-1 py-1 text-center text-xs focus:outline-none border-blue-500 focus:ring-2 focus:ring-blue-400 disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-500 disabled:border-gray-300"
                      />
                    </div>
                  )}
                </td>
                <td className="w-28 px-1 py-1 text-center text-xs text-gray-700">
                  <div className="flex gap-0.5 justify-center">
                    {/* Auto-generate barcode based on item code, department, and unit */}
                    <button
                      type="button"
                      className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                      title={pricingLines[i]?.barcode ? "Barcode already exists - clear to regenerate" : "Auto-generate Barcode"}
                      onClick={() => {
                        if (typeof onGenerateBarcode === "function") {
                          onGenerateBarcode(i);
                        }
                      }}
                      disabled={
                        !checkedRows[i] ||
                        loading ||
                        !newProduct.categoryId ||
                        (!pricingLines[i]?.unit && !localUnitSelections[i]) ||
                        !!pricingLines[i]?.barcode
                      }
                    >
                      Auto
                    </button>
                    {/* Pricing Levels Modal */}
                    <button
                      type="button"
                      className="px-1.5 py-0.5 rounded text-xs font-medium transition-colors bg-purple-500 hover:bg-purple-600 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                      title={!pricingLines[i]?.unit && !localUnitSelections[i] ? "Select unit first to define pricing levels" : "Define pricing levels for this unit"}
                      onClick={() => {
                        if (typeof onOpenPricingLevelModal === "function") {
                          onOpenPricingLevelModal(i);
                        }
                      }}
                      disabled={!checkedRows[i] || (!pricingLines[i]?.unit && !localUnitSelections[i])}
                    >
                      More
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}, 'BasicInfoTab');

BasicInfoTab.displayName = 'BasicInfoTab';

export default BasicInfoTab;


