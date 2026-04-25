/**
 * Context: StoreContext
 * 
 * Provides store details to entire app from localStorage cache
 * Avoids repeated API calls for store information in print templates
 * 
 * Available Store Details (from localStorage cache):
 * ─────────────────────────────────────────────────────────────
 * - storeName: Store display name
 * - storeCode: Store code identifier
 * - address1: Primary address line
 * - address2: Secondary address line
 * - phone: Store phone number
 * - email: Store email address
 * - taxNumber: Tax ID / GST number
 * - logoUrl: Store logo image URL
 * - savedAt: Timestamp when cache was last updated
 * ─────────────────────────────────────────────────────────────
 * 
 * Usage: const storeDetails = useStore();
 */

import React, { createContext, useContext } from 'react';
import { useStoreDetails } from '../hooks/useStoreDetails';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const storeDetails = useStoreDetails();

  return (
    <StoreContext.Provider value={storeDetails}>
      {children}
    </StoreContext.Provider>
  );
}

/**
 * Hook to use store context
 * Returns cached store details from localStorage
 * 
 * @returns {Object|null} Store details or null if not cached
 */
export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    console.warn('⚠️ useStore must be used within StoreProvider');
    return null;
  }
  return context;
}

/**
 * Helper to get store field
 * 
 * @param {string} field - Field name (storeName, address1, etc)
 * @param {string} defaultValue - Default value if not found
 * @returns {string} Field value or default
 */
export function useStoreField(field, defaultValue = '') {
  const store = useStore();
  return store?.[field] || defaultValue;
}

/**
 * Helper to check if store is configured
 * 
 * @returns {boolean} True if store details are available
 */
export function useStoreConfigured() {
  const store = useStore();
  return store && store.storeName ? true : false;
}
