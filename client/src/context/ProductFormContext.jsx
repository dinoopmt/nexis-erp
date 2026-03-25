/**
 * ProductFormContext
 * Global context for product creation/update modal
 * Accessible from anywhere: GRN form, Product page, etc.
 * 
 * Usage:
 * const { openProductForm } = useContext(ProductFormContext);
 * openProductForm({ mode: 'create', onSave: handleProductSaved });
 */
import React, { createContext, useState, useCallback } from 'react';
import { clearAllCache } from '../utils/searchCache';

export const ProductFormContext = createContext();

export const ProductFormProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('create'); // 'create' or 'edit'
  const [productData, setProductData] = useState(null);
  const [onSaveCallback, setOnSaveCallback] = useState(null);
  const [hasOnSaveCallback, setHasOnSaveCallback] = useState(false); // ✅ Track if callback exists
  const [products, setProducts] = useState([]); // ✅ Optional: products list for modal search/nav (Product.jsx)
  const [filteredProducts, setFilteredProducts] = useState([]); // ✅ Optional: filtered products for search (Product.jsx)
  const [editIndex, setEditIndex] = useState(-1); // ✅ Optional: current product index in filtered list (Product.jsx)

  const openProductForm = useCallback((options = {}) => {
    const {
      mode: formMode = 'create',
      product = null,
      onSave = null,
      products: productsList = [], // ✅ Optional: products list from Product.jsx
      filteredProducts: filteredList = [], // ✅ Optional: filtered products from Product.jsx
      editIndex: currentIndex = -1, // ✅ Optional: current product index from Product.jsx
    } = options;

    setMode(formMode);
    setProductData(product);
    setOnSaveCallback(() => onSave);
    setHasOnSaveCallback(!!onSave); // ✅ Track if onSave was provided
    setProducts(productsList); // ✅ Store products list for search functionality
    setFilteredProducts(filteredList); // ✅ Store filtered products for navigation
    setEditIndex(currentIndex); // ✅ Store current index for nav buttons
    setIsOpen(true);
  }, []);

  const closeProductForm = useCallback(() => {
    setIsOpen(false);
    setProductData(null);
    setOnSaveCallback(null);
    setHasOnSaveCallback(false);
    setProducts([]); // ✅ Clear products when closing
    setFilteredProducts([]); // ✅ Clear filtered products when closing
    setEditIndex(-1); // ✅ Reset edit index
  }, []);

  // ✅ NEW: Allow components to update mode (e.g., after saving a new product → switch to edit mode)
  const updateMode = useCallback((newMode) => {
    setMode(newMode);
  }, []);

  const notifyProductSaved = useCallback((newProduct) => {
    if (onSaveCallback) {
      onSaveCallback(newProduct);
    }
    
    // ✅ Clear product search cache when product is updated
    clearAllCache();
    console.log('🧹 Cleared search cache after product update');
    
    // 🔴 P2: Broadcast product update event (include productId for downstream handlers)
    window.dispatchEvent(
      new CustomEvent('productUpdated', {
        detail: {
          product: newProduct,
          productId: newProduct?._id,  // ✅ Include productId for auto-retry logic
          timestamp: Date.now(),
        },
      })
    );
    
    closeProductForm();
  }, [onSaveCallback, closeProductForm]);

  const value = {
    isOpen,
    mode,
    productData,
    openProductForm,
    closeProductForm,
    updateMode,
    hasOnSaveCallback,
    onSaveCallback, // ✅ Expose callback function so modal can call it directly
    notifyProductSaved,
    products, // ✅ Optional products list for search/nav
    filteredProducts, // ✅ Optional filtered products
    editIndex, // ✅ Optional current product index
    setEditIndex, // ✅ Allow modal to update index when navigating
  };

  return (
    <ProductFormContext.Provider value={value}>
      {children}
    </ProductFormContext.Provider>
  );
};


