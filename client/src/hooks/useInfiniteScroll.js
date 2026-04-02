import { useState, useCallback, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

/**
 * useInfiniteScroll - Manages pagination state for infinite scroll + virtual scrolling
 * 
 * Handles:
 * ✅ Accumulating products from multiple pages
 * ✅ Preventing duplicate fetches
 * ✅ Tracking loading state
 * ✅ Sparse map storage (object, not array)
 * 
 * @param {Function} fetchFunction - API function: (page, limit) => Promise<{products, total, hasMore}>
 * @param {number} itemsPerPage - Items to fetch per page (default: 50)
 * @returns {Object} { productsMap, currentPage, isLoading, totalProducts, hasMore, fetchNextPage }
 */
export const useInfiniteScroll = (fetchFunction, itemsPerPage = 50) => {
  // State - use sparse map object instead of array
  const [productsMap, setProductsMap] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Refs for preventing duplicate fetches
  const loadedPagesRef = useRef(new Set());
  const fetchingPagesRef = useRef(new Set());
  const initialFetchDoneRef = useRef(false); // Prevent double-init in Strict Mode
  const lastPageHadFewerItemsRef = useRef(false); // Stop fetching when we reach end of data

  /**
   * Fetch a specific page and store in sparse map
   */
  const fetchPage = useCallback(async (pageNum) => {
    // Early exit if we've already reached the end of data
    if (lastPageHadFewerItemsRef.current && pageNum > 1) {
      console.log(`⏹️  Page ${pageNum} skipped: Already know data ends before this page`);
      return;
    }

    // Prevent duplicate fetches of same page
    if (loadedPagesRef.current.has(pageNum)) {
      console.log(`📦 Page ${pageNum} already cached, skipping fetch`);
      return;
    }

    if (fetchingPagesRef.current.has(pageNum)) {
      console.warn(`⚠️  Page ${pageNum} already fetching, skipping duplicate`);
      return;
    }

    // Mark page as being fetched
    fetchingPagesRef.current.add(pageNum);
    setIsLoading(true);

    try {
      console.log(`🔄 Fetching page ${pageNum} (${itemsPerPage} items)...`);
      
      const result = await fetchFunction(pageNum, itemsPerPage);
      
      if (!result || !Array.isArray(result.products)) {
        console.error('Invalid response format:', result);
        showToast('error', 'Failed to fetch products');
        return;
      }

      // ✅ SPARSE MAP: Store items at correct indices as object keys
      if (result.products.length > 0) {
        const skip = (pageNum - 1) * itemsPerPage;
        
        setProductsMap((prev) => {
          const updated = { ...prev };
          result.products.forEach((item, index) => {
            updated[skip + index] = item;
          });
          return updated;
        });
        loadedPagesRef.current.add(pageNum);
        
        console.log(`✅ Page ${pageNum}: +${result.products.length} items at [${skip}-${skip + result.products.length - 1}]`);
      }

      // Update totals
      setTotalProducts(result.total || 0);
      
      // ✅ IMPORTANT: If we got fewer items than requested, we've reached the end
      // This prevents fetching unnecessary subsequent pages
      const hasMoreData = result.hasMore !== false && result.products.length === itemsPerPage;
      
      // Track when we hit the last page (fewer items than requested)
      if (result.products.length < itemsPerPage) {
        lastPageHadFewerItemsRef.current = true;
        console.log(`🏁 Last page detected: Got ${result.products.length} items (expected ${itemsPerPage})`);
        // ✅ NEW: Immediately set isLoading to false when we detect end-of-data
        // This ensures loading animation stops immediately even if other logic delays removal
        setIsLoading(false);
      }
      
      setHasMore(hasMoreData);
      
      console.log(`📊 Page ${pageNum} - Items: ${result.products.length}/${itemsPerPage}, hasMore: ${hasMoreData}, Total: ${result.total}`);
    } catch (err) {
      console.error(`❌ Error fetching page ${pageNum}:`, err.message);
      if (err.response?.status !== 304) {
        showToast('error', `Failed to load products: ${err.message}`);
      }
    } finally {
      // Remove from fetching set and update loading state
      fetchingPagesRef.current.delete(pageNum);
      
      // Only set isLoading to false if NO pages are fetching
      if (fetchingPagesRef.current.size === 0) {
        console.log(`✅ ALL PAGES LOADED: isLoading → false`);
        setIsLoading(false);
      } else {
        console.log(`⏳ Still fetching: ${Array.from(fetchingPagesRef.current).join(', ')} (${fetchingPagesRef.current.size} pages)`);
      }
    }
  }, [fetchFunction, itemsPerPage]);

  /**
   * Load initial pages on mount - sequentially to detect end-of-data early
   */
  useEffect(() => {
    // Ensure we only do initial fetch once, even in React Strict Mode (which double-invokes effects)
    if (initialFetchDoneRef.current) return;
    initialFetchDoneRef.current = true;

    // Fetch first page on mount. Will auto-abort subsequent pages if fewer items than requested.
    // This provides a good starting point without over-fetching for small datasets.
    if (Object.keys(productsMap).length === 0) {
      console.log(`🚀 Initial load: Starting page 1 fetch...`);
      fetchPage(1);
    }
  }, [fetchPage]); // Include fetchPage in deps

  /**
   * User called onPageChange from VirtualizedProductTable
   */
  const fetchNextPage = useCallback((newPage) => {
    if (newPage !== currentPage) {
      setCurrentPage(newPage);
      fetchPage(newPage);
    }
  }, [currentPage, fetchPage]);

  return {
    productsMap,
    currentPage,
    isLoading,
    totalProducts,
    hasMore,
    fetchNextPage,
    // Advanced: allow manual page fetch
    fetchPage: (page) => {
      setCurrentPage(page);
      fetchPage(page);
    },
    // Advanced: reset all state
    reset: () => {
      console.log(`🔄 RESET: Clearing all infinite scroll state`);
      setProductsMap({});
      setCurrentPage(1);
      setIsLoading(false);
      setTotalProducts(0);
      setHasMore(true);
      loadedPagesRef.current = new Set();
      fetchingPagesRef.current = new Set();
      initialFetchDoneRef.current = false; // Reset so next mount will fetch again
      lastPageHadFewerItemsRef.current = false; // Reset end-of-data flag
    },
  };
};

export default useInfiniteScroll;
