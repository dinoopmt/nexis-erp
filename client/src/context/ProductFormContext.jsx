/**
 * ProductFormContext
 * Global context for product creation/update modal
 * Accessible from anywhere: GRN form, Product page, etc.
 * 
 * Usage:
 * const { openProductForm } = useContext(ProductFormContext);
 * openProductForm({ mode: 'create', onSave: handleProductSaved });
 */
import React, { createContext, useState, useCallback, useRef } from 'react';
import { clearAllCache } from '../utils/searchCache';

export const ProductFormContext = createContext();

export const ProductFormProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('create'); // 'create' or 'edit'
  const [productData, setProductData] = useState(null);
  const [hasOnSaveCallback, setHasOnSaveCallback] = useState(false); // ✅ Track if callback exists
  const [products, setProducts] = useState([]); // ✅ Optional: products list for modal search/nav (Product.jsx)
  const [filteredProducts, setFilteredProducts] = useState([]); // ✅ Optional: filtered products for search (Product.jsx)
  const [editIndex, setEditIndex] = useState(-1); // ✅ Optional: current product index in filtered list (Product.jsx)
  
  // ✅ FIX: Use ref to store callback to avoid triggering re-renders on callback change
  const onSaveCallbackRef = useRef(null);

  const openProductForm = useCallback((options = {}) => {
    const {
      mode: formMode = 'create',
      product = null,
      onSave = null,
      products: productsList = [], // ✅ Optional: products list from Product.jsx
      filteredProducts: filteredList = [], // ✅ Optional: filtered products from Product.jsx
      editIndex: currentIndex = -1, // ✅ Optional: current product index from Product.jsx
    } = options;

    console.log('🔓 [ProductFormContext] openProductForm called', { 
      mode: formMode, 
      productId: product?._id,
      hasCallback: !!onSave,
      callbackType: typeof onSave,
      stackTrace: new Error().stack
    });

    setMode(formMode);
    setProductData(product);
    
    // ✅ FIX: Store callback in ref to avoid state update triggering render that calls it
    if (typeof onSave === 'function') {
      console.log('✅ [ProductFormContext] Setting valid callback function');
      onSaveCallbackRef.current = onSave;
      setHasOnSaveCallback(true);
    } else {
      console.warn('⚠️ [ProductFormContext] onSave is not a function:', typeof onSave, onSave);
      onSaveCallbackRef.current = null;
      setHasOnSaveCallback(false);
    }
    setProducts(productsList); // ✅ Store products list for search functionality
    setFilteredProducts(filteredList); // ✅ Store filtered products for navigation
    setEditIndex(currentIndex); // ✅ Store current index for nav buttons
    setIsOpen(true);
  }, []);

  const closeProductForm = useCallback(() => {
    setIsOpen(false);
    setProductData(null);
    onSaveCallbackRef.current = null; // ✅ Clear callback ref
    setHasOnSaveCallback(false);
    setProducts([]); // ✅ Clear products when closing
    setFilteredProducts([]); // ✅ Clear filtered products when closing
    setEditIndex(-1); // ✅ Reset edit index
  }, []);

  // ✅ NEW: Allow components to update mode (e.g., after saving a new product → switch to edit mode)
  const updateMode = useCallback((newMode) => {
    setMode(newMode);
  }, []);

  // ✅ Getter function to safely retrieve callback from ref
  const getOnSaveCallback = useCallback(() => {
    return onSaveCallbackRef.current;
  }, []);

  const value = {
    isOpen,
    mode,
    productData,
    openProductForm,
    closeProductForm,
    updateMode,
    hasOnSaveCallback,
    getOnSaveCallback, // ✅ Use getter function instead of storing callback directly
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


