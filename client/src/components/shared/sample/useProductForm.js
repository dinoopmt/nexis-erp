import { useState } from 'react';

const INITIAL_PRODUCT = {
  itemcode: '',
  hsn: '',
  name: '',
  shortName: '',
  localName: '',
  categoryId: '',
  groupingId: '',
  brandId: '',
  vendor: '',
  unitType: '',
  factor: '',
  cost: '',
  costIncludeVat: '',
  marginPercent: '',
  marginAmount: '',
  taxType: '',
  taxPercent: '',
  taxAmount: '',
  taxInPrice: false,
  price: '',
  barcode: '',
  stock: '',
  packingUnits: [],
  unitVariants: [],
  batchTrackingEnabled: false,
  pricingLevels: {},
  isScaleItem: false,
  scaleUnitType: '', // ✅ Unit of measure when isScaleItem is checked (Weight/Quantity)
  image: null, // ✅ Product image (base64)
};

const INITIAL_PRICING_LINE = {
  unit: '',
  factor: '',
  price: '',
  barcode: '',
  cost: '',
  costIncludetax: '',
  margin: '',
  marginAmount: '',
  taxAmount: '',
};

/**
 * Hook for managing product form state and validation
 * Handles: newProduct, pricingLines, errors, loading
 */
export function useProductForm(suggestedItemCode = '') {
  const [newProduct, setNewProduct] = useState({
    ...INITIAL_PRODUCT,
    itemcode: suggestedItemCode,
  });
  
  const [pricingLines, setPricingLines] = useState([
    { ...INITIAL_PRICING_LINE },
    { ...INITIAL_PRICING_LINE },
    { ...INITIAL_PRICING_LINE },
    { ...INITIAL_PRICING_LINE },
  ]);

  const [barcodeVariants, setBarcodeVariants] = useState([]);
  const [selectedPricingLines, setSelectedPricingLines] = useState(new Set());
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset form to initial state
  const resetForm = (suggested = '') => {
    setNewProduct({
      ...INITIAL_PRODUCT,
      itemcode: suggested,
    });
    setPricingLines([
      { ...INITIAL_PRICING_LINE },
      { ...INITIAL_PRICING_LINE },
      { ...INITIAL_PRICING_LINE },
      { ...INITIAL_PRICING_LINE },
    ]);
    setBarcodeVariants([]);
    setSelectedPricingLines(new Set());
    setErrors({});
    setError('');
  };

  // Validate product before saving
  const validateProduct = () => {
    const newErrors = {};

    if (!newProduct.itemcode?.trim()) {
      newErrors.itemcode = 'Item code is required';
    }

    if (!newProduct.name?.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!newProduct.categoryId) {
      newErrors.categoryId = 'Category is required';
    }

    if (!newProduct.vendor) {
      newErrors.vendor = 'Vendor is required';
    }

    if (!newProduct.unitType) {
      newErrors.unitType = 'Unit type is required';
    }

    const baseCost = parseFloat(newProduct.cost);
    if (isNaN(baseCost) || baseCost <= 0) {
      newErrors.cost = 'Valid cost price required';
    }

    const basePrice = parseFloat(newProduct.price);
    if (isNaN(basePrice) || basePrice <= 0) {
      newErrors.price = 'Valid selling price required';
    }

    if (parseInt(newProduct.stock) < 0) {
      newErrors.stock = 'Stock cannot be negative';
    }

    // ✅ NEW: Validate scale item requires unit of measure
    if (newProduct.isScaleItem && !newProduct.scaleUnitType) {
      newErrors.scaleUnitType = 'Unit of measure is required when Scale Item is enabled';
    }

    setErrors(newErrors);
    return newErrors; // ✅ Return errors object instead of boolean
  };

  return {
    newProduct,
    setNewProduct,
    pricingLines,
    setPricingLines,
    barcodeVariants,
    setBarcodeVariants,
    selectedPricingLines,
    setSelectedPricingLines,
    errors,
    setErrors,
    error,
    setError,
    loading,
    setLoading,
    resetForm,
    validateProduct,
  };
}


