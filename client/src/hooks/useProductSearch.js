import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../config/config';
import { getCachedResults, setCachedResults, onCacheUpdate, clearQueryCache, clearAllCache } from '../utils/searchCache';
import { checkSearchRateLimit } from '../utils/rateLimiter';

/**
 * Helper: Attempt to re-index Meilisearch if empty results detected
 * Uses localStorage to avoid re-indexing too frequently
 * Only triggers if last attempt was > 5 minutes ago
 */
const attemptMeilisearchReindex = async () => {
  const now = Date.now();
  const lastReindexTime = localStorage.getItem('meilisearch_last_reindex_attempt');
  const REINDEX_COOLDOWN = 5 * 60 * 1000; // 5 minutes

  // Check cooldown
  if (lastReindexTime && now - parseInt(lastReindexTime) < REINDEX_COOLDOWN) {
    const timeLeft = Math.ceil((REINDEX_COOLDOWN - (now - parseInt(lastReindexTime))) / 1000);
    console.log(`⏳ Re-index already attempted recently. Try again in ${timeLeft}s`);
    return false;
  }

  try {
    // Record this attempt
    localStorage.setItem('meilisearch_last_reindex_attempt', now.toString());

    console.log('🔄 Triggering Meilisearch re-indexing...');
    console.log('📍 API_URL:', API_URL);
    
    // Ensure proper URL construction
    const reindexUrl = `${API_URL}/products/bulk-sync-meilisearch`;
    console.log('📍 Requesting:', reindexUrl);

    const response = await axios.post(reindexUrl, {}, {
      timeout: 30000, // 30 second timeout for re-indexing
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Re-indexing triggered successfully:', response.data);
    return true;
  } catch (err) {
    console.error('❌ Failed to trigger re-indexing:', err.message);
    console.error('❌ Error status:', err.response?.status);
    console.error('❌ Error response:', err.response?.data);
    console.error('❌ Full error:', err);
    return false;
  }
};

/**
 * Helper: Parse stringified packingUnits from Meilisearch results
 * Meilisearch stores packingUnits as JSON string, so we need to parse it back
 */
const parsePackingUnits = (products) => {
  return products.map(product => ({
    ...product,
    packingUnits: 
      typeof product.packingUnits === 'string' 
        ? JSON.parse(product.packingUnits || '[]')
        : (product.packingUnits || [])
  }));
};

/**
 * Custom Hook: useProductSearch
 * 
 * Centralizes product search logic across the entire application
 * Features:
 * - Debounced search to prevent UI freeze
 * - Tries Meilisearch first, falls back to MongoDB if needed
 * - Automatic response format conversion
 * - Comprehensive error handling and logging
 * - Pagination support
 * 
 * Usage:
 * const { results, loading, error, metadata, clearSearch } = useProductSearch(
 *   searchQuery,
 *   300,      // debounce duration
 *   1,        // page number
 *   100,      // page size
 *   true      // use fallback
 * );
 */
export const useProductSearch = (
  searchQuery = '',
  debounceDuration = 300,
  pageNumber = 1,
  pageSize = 100,
  useFallback = true
) => {
  // Search state
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [metadata, setMetadata] = useState({
    totalCount: 0,
    totalPages: 0,
    page: 1,
    pageSize: 100,
    hasNextPage: false,
    hasPrevPage: false,
    cached: false,
    queryTime: 0,
  });

  // Refs for debouncing and cleanup
  const debounceTimerRef = useRef(null);
  const abortControllerRef = useRef(null);

  /**
   * Perform product search with Meilisearch + fallback mechanism
   * ✅ NOW WITH LOCALSTORAGE CACHING for cross-tab sync
   * ✅ NOW WITH RATE LIMITING to prevent API abuse
   */
  const performSearch = async (query, page, limit) => {
    // Clear any previous abort controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError('');

    try {
      console.log('🔍 Search initiated for:', query);

      // ✅ RATE LIMIT CHECK: Prevent API abuse
      const rateLimitCheck = checkSearchRateLimit(query);
      if (!rateLimitCheck.allowed) {
        setError(
          `Search rate limited. Try again in ${Math.ceil(rateLimitCheck.resetTime / 1000)} second${rateLimitCheck.resetTime > 1000 ? 's' : ''}.`
        );
        setLoading(false);
        return;
      }

      // ✅ STEP 1: Check if results are cached (page 1 only for now)
      if (page === 1 && query.trim()) {
        const cached = getCachedResults(query);
        if (cached && cached.length > 0) {
          console.log('⚡ Using CACHED results');
          // ✅ Parse packingUnits in case they're stringified
          const parsedCached = parsePackingUnits(cached);
          setResults(parsedCached);
          setMetadata({
            totalCount: cached.length,
            totalPages: 1,
            page: 1,
            pageSize: limit,
            hasNextPage: false,
            hasPrevPage: false,
            cached: true, // ✅ Mark as cached
            queryTime: 0,
          });
          setLoading(false);
          return;
        }
      }

      let response;
      let usedFallback = false;

      // Try Meilisearch first
      try {
        const searchUrl = `${API_URL}/products/search`;
        const searchParams = {
          q: query.trim(),
          page: page,
          limit: limit,
        };

        console.log('📡 Trying Meilisearch endpoint:', searchUrl);
        response = await axios.get(searchUrl, {
          params: searchParams,
          signal: abortControllerRef.current.signal,
        });

        if (response.data.products && response.data.products.length > 0) {
          console.log(
            '✅ Meilisearch returned',
            response.data.products.length,
            'results'
          );
        } else if (!response.data.products || response.data.products.length === 0) {
          console.warn(
            '⚠️ Meilisearch returned empty results, trying fallback...'
          );

          if (!useFallback) {
            // If fallback is disabled, just use empty results
            setResults([]);
            setMetadata({
              totalCount: 0,
              totalPages: 0,
              page: page,
              pageSize: limit,
              hasNextPage: false,
              hasPrevPage: false,
              cached: false,
              queryTime: response.data.queryTime || 0,
            });
            setLoading(false);
            return;
          }

          throw new Error('Empty search results - using fallback');
        }
      } catch (meilisearchErr) {
        // ✅ FIX: Don't show errors for AbortError/canceled - it's expected when user types quickly
        if (meilisearchErr.name === 'AbortError' || meilisearchErr.message === 'canceled') {
          console.debug('⚠️ Meilisearch search cancelled (new search initiated)');
          setLoading(false);
          return;
        }

        if (!useFallback) {
          throw meilisearchErr;
        }

        console.warn(
          '⚠️ Meilisearch failed, falling back to getproducts endpoint:',
          meilisearchErr.message
        );
        usedFallback = true;

        // Fallback to getproducts endpoint
        const fallbackUrl = `${API_URL}/products/getproducts`;
        const fallbackParams = {
          search: query.trim(),
          page: page,
          limit: limit,
        };

        console.log('📡 Using fallback endpoint:', fallbackUrl);
        response = await axios.get(fallbackUrl, {
          params: fallbackParams,
          signal: abortControllerRef.current.signal,
        });

        // Convert response format to Meilisearch format if needed
        if (response.data.products && !response.data.totalCount) {
          response.data.totalCount = response.data.total;
          response.data.pageSize = limit;
          response.data.totalPages = response.data.pages;
          response.data.page = page;
        }
      }

      console.log('✅ Search Response:', {
        productsCount: response.data.products?.length || 0,
        totalCount: response.data.totalCount || response.data.total,
        usedFallback: usedFallback,
        status: response.status,
      });

      if (response.data.products) {
        console.log(
          '✅ Setting',
          response.data.products.length,
          'search results'
        );
        // ✅ Parse stringified packingUnits from Meilisearch
        const parsedProducts = parsePackingUnits(response.data.products);
        setResults(parsedProducts);

        // ✅ STEP 2: Cache results if it's page 1 search
        if (page === 1 && query.trim()) {
          setCachedResults(query, parsedProducts);
        }

        // Store pagination metadata for UI updates
        setMetadata({
          totalCount: response.data.totalCount || response.data.total,
          totalPages: response.data.totalPages || response.data.pages,
          page: response.data.page || page,
          pageSize: response.data.pageSize || limit,
          hasNextPage:
            response.data.hasNextPage ||
            (response.data.page * limit <
              (response.data.totalCount || response.data.total)),
          hasPrevPage: response.data.hasPrevPage || (response.data.page > 1),
          cached: false, // Fresh from API
          queryTime: response.data.queryTime,
        });

        // ✅ CRITICAL FIX: Set loading to false after results are set
        setLoading(false);
      } else {
        console.warn('⚠️ No products field in response:', response.data);
        setResults([]);
        setError('No results found');
        setLoading(false);
      }
    } catch (err) {
      // ✅ FIX: Don't show errors for AbortError/canceled - it's expected when user types quickly
      if (err.name === 'AbortError' || err.message === 'canceled') {
        console.debug('⚠️ Previous search cancelled (new search initiated)');
        setLoading(false);
        return;
      }

      console.error('❌ Search Error:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        search: query,
      });

      setResults([]);
      setError(`Search failed: ${err.message}`);
      setLoading(false);
    }
  };

  /**
   * Main effect: Handle debounced search
   */
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If search is empty, clear results
    if (!searchQuery.trim()) {
      console.log('🔍 Search cleared - empty query');
      setResults([]);
      setError('');
      setMetadata({
        totalCount: 0,
        totalPages: 0,
        page: 1,
        pageSize: pageSize,
        hasNextPage: false,
        hasPrevPage: false,
        cached: false,
        queryTime: 0,
      });
      setLoading(false);
      return;
    }

    // Set debounce timer
    debounceTimerRef.current = setTimeout(() => {
      performSearch(searchQuery, pageNumber, pageSize);
    }, debounceDuration);

    // Cleanup: cancel any in-flight requests
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchQuery, debounceDuration, pageNumber, pageSize]);

  /**
   * ✅ NEW: Listen for cache updates from other tabs
   * When another tab caches a search result, instantly sync it here
   */
  useEffect(() => {
    const unsubscribe = onCacheUpdate(({ query, data }) => {
      // If the cached query matches our current search, update results
      if (query === searchQuery.trim().toLowerCase()) {
        console.log('📡 Cache update from another tab detected!');
        setResults(data);
        setMetadata(prev => ({
          ...prev,
          cached: true,
          totalCount: data.length,
        }));
      }
    });

    return unsubscribe;
  }, [searchQuery]);

  /**
   * ✅ NEW: On app startup, check if Meilisearch is indexed
   * If empty, automatically trigger re-indexing
   */
  useEffect(() => {
    const checkAndReindexOnStartup = async () => {
      try {
        // Only check once per app session
        const hasCheckedReindex = sessionStorage.getItem('meilisearch_startup_check_done');
        if (hasCheckedReindex) {
          return;
        }

        console.log('🚀 App startup: Checking Meilisearch index status...');
        
        // Mark that we've checked
        sessionStorage.setItem('meilisearch_startup_check_done', 'true');

        // Do a simple test search to see if Meilisearch has any data
        try {
          const testUrl = `${API_URL}/products/search`;
          const testResponse = await axios.get(testUrl, {
            params: { q: 'test', page: 1, limit: 1 },
            timeout: 5000,
          });

          // Check if Meilisearch returned ANY results or has an index
          const hasMeilisearchData = testResponse.data.totalCount > 0 || testResponse.data.totalCount !== undefined;
          
          if (!hasMeilisearchData) {
            console.log('⚠️ Meilisearch appears empty. Attempting auto-reindex...');
            await attemptMeilisearchReindex();
          } else {
            console.log('✅ Meilisearch is properly indexed');
          }
        } catch (testErr) {
          console.log('📡 Meilisearch test failed, will attempt re-index on first search');
        }
      } catch (err) {
        console.error('Error checking Meilisearch status:', err.message);
      }
    };

    checkAndReindexOnStartup();
  }, []); // Runs once on mount

  /**
   * Clear search results and error
   */
  const clearSearch = () => {
    setResults([]);
    setError('');
    setMetadata({
      totalCount: 0,
      totalPages: 0,
      page: 1,
      pageSize: pageSize,
      hasNextPage: false,
      hasPrevPage: false,
      cached: false,
      queryTime: 0,
    });
  };

  /**
   * Clear cache for current or specific query
   */
  const clearCache = (query = searchQuery) => {
    if (query && query.trim()) {
      clearQueryCache(query);
      console.log(`🗑️ Cleared cache for: "${query}"`);
    }
  };

  return {
    results,
    loading,
    error,
    metadata,
    totalCount: metadata.totalCount,
    totalPages: metadata.totalPages,
    clearSearch,
    clearCache,
    // Convenience aliases
    products: results,
    isSearching: loading,
    searchError: error,
  };
};

export default useProductSearch;


