/**
 * Hook: useStoreDetails
 * 
 * Manages store details caching in localStorage
 * Provides store info for print templates without API calls
 * 
 * Cached Fields:
 * - storeName: Store name
 * - storeCode: Store code
 * - address1: Address line 1
 * - address2: Address line 2
 * - phone: Phone number
 * - email: Email address
 * - taxNumber: Tax ID
 * - logoUrl: Store logo URL
 */

export function getStoreCacheKey() {
  return 'storeDetails';
}

/**
 * Save store details to localStorage cache
 * Call this after fetching store settings or on login
 * 
 * @param {Object} storeData - Store details to cache
 */
export function saveStoreDetailsToCache(storeData) {
  try {
    if (!storeData) return;
    
    const cacheData = {
      storeName: storeData.storeName || '',
      storeCode: storeData.storeCode || '',
      address1: storeData.address1 || '',
      address2: storeData.address2 || '',
      phone: storeData.phone || '',
      email: storeData.email || '',
      taxNumber: storeData.taxNumber || '',
      logoUrl: storeData.logoUrl || '',
      savedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(
      getStoreCacheKey(),
      JSON.stringify(cacheData)
    );
    
    console.log('✅ Store details cached:', cacheData.storeName);
  } catch (err) {
    console.warn('⚠️ Failed to cache store details:', err);
  }
}

/**
 * Get store details from localStorage cache
 * 
 * @returns {Object|null} Store details or null if not cached
 */
export function getStoreDetailsFromCache() {
  try {
    const cached = localStorage.getItem(getStoreCacheKey());
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    console.log('📂 Store details loaded from cache');
    return data;
  } catch (err) {
    console.warn('⚠️ Failed to parse cached store details:', err);
    return null;
  }
}

/**
 * Clear store details cache
 * Call this when user logs out or store settings change
 */
export function clearStoreDetailsCache() {
  try {
    localStorage.removeItem(getStoreCacheKey());
    console.log('🔄 Store details cache cleared');
  } catch (err) {
    console.warn('⚠️ Failed to clear store cache:', err);
  }
}

/**
 * Get store details (cached or null if not available)
 * Does NOT make API calls - use for quick access
 * 
 * @returns {Object|null} Cached store details or null
 */
export function useStoreDetails() {
  return getStoreDetailsFromCache();
}

/**
 * Helper to get specific store field from cache
 * 
 * @param {string} field - Field name (storeName, address1, etc)
 * @param {string} defaultValue - Default value if not found
 * @returns {string} Field value or default
 */
export function getStoreDetailField(field, defaultValue = '') {
  const storeDetails = getStoreDetailsFromCache();
  return storeDetails?.[field] || defaultValue;
}
