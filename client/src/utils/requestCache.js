/**
 * 🔄 Request Cache & Deduplication
 * Prevents duplicate API calls for same endpoint within a time window
 * Reduces network load and memory issues (ERR_INSUFFICIENT_RESOURCES)
 */

class RequestCache {
  constructor(ttl = 30000) {
    this.cache = new Map();
    this.pending = new Map();
    this.ttl = ttl; // Time to live in milliseconds
  }

  /**
   * Check if cached data is still valid
   * @param {string} key - Cache key
   * @returns {boolean} True if cache exists and not expired
   */
  isValid(key) {
    if (!this.cache.has(key)) {
      return false;
    }

    const { timestamp } = this.cache.get(key);
    const isExpired = Date.now() - timestamp > this.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {any} Cached data or undefined
   */
  get(key) {
    if (this.isValid(key)) {
      return this.cache.get(key).data;
    }
    return undefined;
  }

  /**
   * Set cache data
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   */
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Wait for pending request to complete
   * @param {string} key - Cache key
   * @returns {Promise} Promise that resolves when request completes
   */
  getPending(key) {
    return this.pending.get(key);
  }

  /**
   * Set pending request
   * @param {string} key - Cache key
   * @param {Promise} promise - Request promise
   */
  setPending(key, promise) {
    this.pending.set(key, promise);
    promise
      .then((data) => {
        this.set(key, data);
      })
      .catch((error) => {
        // Keep error in cache for short time in case of retry
        console.error(`Cache error for ${key}:`, error.message);
      })
      .finally(() => {
        this.pending.delete(key);
      });

    return promise;
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.pending.clear();
  }

  /**
   * Clear specific cache key
   * @param {string} key - Cache key
   */
  clearKey(key) {
    this.cache.delete(key);
    this.pending.delete(key);
  }
}

// Global request cache instance (30 second TTL)
export const requestCache = new RequestCache(30000);

export default RequestCache;


