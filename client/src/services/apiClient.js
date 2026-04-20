import { API_URL } from '../config/config';

/**
 * Enhanced API Client with Terminal Identity Support
 * 
 * This client automatically:
 * 1. Attaches terminal ID header
 * 2. Manages authentication tokens
 * 3. Implements retry logic for failed requests
 * 4. Provides consistent error handling
 * 
 * Terminal info (store, permissions, hardware) comes from backend
 * after login based on terminal ID in headers.
 * 
 * Usage:
 *   const response = await apiClient.get('/products');
 *   const response = await apiClient.post('/grn', { data });
 *   const response = await apiClient.put('/grn/123', { data });
 */

class APIClient {
  constructor(baseURL = API_URL) {
    this.baseURL = baseURL;
    this.authToken = null;
    this.terminalId = null;
    this.terminalConfig = null;
    this.isElectron = !!window.electronAPI;
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      retryableStatus: [408, 500, 502, 503, 504], // Removed 429 - don't retry rate limit
    };

    // Load auth token from storage
    this.loadAuthToken();
    
    // Load terminal ID if running in Electron
    if (this.isElectron) {
      this.initializeTerminalId();
    }
  }

  /**
   * Initialize terminal ID from Electron preload
   */
  async initializeTerminalId() {
    try {
      this.terminalId = await window.electronAPI.terminal.getTerminalId();
      console.log('✅ Terminal ID loaded:', this.terminalId);
    } catch (error) {
      console.warn('⚠️ Failed to load terminal ID:', error);
    }
  }

  /**
   * Fetch terminal configuration from backend after login
   * Backend uses terminal-id header to identify and return terminal details
   */
  async fetchTerminalConfig() {
    try {
      const response = await this.get('/auth/terminal-config');
      if (response.ok) {
        this.terminalConfig = response.data;
        console.log('✅ Terminal config from backend:', this.terminalConfig);
        return this.terminalConfig;
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch terminal config:', error);
    }
  }

  /**
   * Build request headers including terminal identity
   */
  buildHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    // Add authentication token
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
      console.log('✅ Auth header added');
    } else {
      console.warn('⚠️ No auth token available for request');
    }

    // Add terminal ID if available
    if (this.terminalId) {
      headers['terminal-id'] = this.terminalId;
    }

    // Add user agent
    headers['User-Agent'] = this.buildUserAgent();

    return headers;
  }

  /**
   * Build user agent string for tracking
   */
  buildUserAgent() {
    if (this.isElectron && this.terminalId) {
      return `NEXIS-ERP-Electron/${this.terminalId}`;
    }
    return 'NEXIS-ERP-Web';
  }

  /**
   * Load auth token from localStorage
   */
  loadAuthToken() {
    try {
      // Check both 'token' and 'authToken' keys for backwards compatibility
      let token = localStorage.getItem('token') || localStorage.getItem('authToken');
      if (token) {
        this.authToken = token;
        console.log('✅ Auth token loaded from localStorage');
      }
    } catch (error) {
      console.warn('Failed to load auth token:', error);
    }
  }

  /**
   * Set auth token (called on login)
   */
  setAuthToken(token) {
    this.authToken = token;
    try {
      localStorage.setItem('token', token);
    } catch (error) {
      console.warn('Failed to save auth token:', error);
    }
  }

  /**
   * Clear auth token (called on logout)
   */
  clearAuthToken() {
    this.authToken = null;
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
    } catch (error) {
      console.warn('Failed to clear auth token:', error);
    }
  }

  /**
   * Internal method to make fetch request with retry logic
   */
  async _fetch(url, options = {}, retryCount = 0) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 30000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Handle auth errors - redirect to login
      if (response.status === 401) {
        this.clearAuthToken();
        window.location.href = '/login';
        return null;
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      const isJSON = contentType?.includes('application/json');

      let data;
      try {
        data = isJSON ? await response.json() : await response.text();
      } catch (parseError) {
        data = null;
        console.error('Failed to parse response:', parseError);
      }

      // Handle non-successful responses with retry logic
      if (!response.ok) {
        // Retry on specific status codes
        if (
          this.retryConfig.retryableStatus.includes(response.status) &&
          retryCount < this.retryConfig.maxRetries
        ) {
          console.warn(
            `⚠️ Request failed with ${response.status}, retrying... (${retryCount + 1}/${this.retryConfig.maxRetries})`
          );
          await this._delay(this.retryConfig.retryDelay * Math.pow(2, retryCount)); // Exponential backoff
          return this._fetch(url, options, retryCount + 1);
        }

        // Return error response
        return {
          ok: false,
          status: response.status,
          statusText: response.statusText,
          data,
          error: data?.message || response.statusText,
        };
      }

      // Return successful response
      return {
        ok: true,
        status: response.status,
        statusText: response.statusText,
        data,
      };
    } catch (error) {
      clearTimeout(timeout);

      // Retry on network errors
      if (retryCount < this.retryConfig.maxRetries) {
        console.warn(
          `⚠️ Network error, retrying... (${retryCount + 1}/${this.retryConfig.maxRetries})`
        );
        await this._delay(this.retryConfig.retryDelay * Math.pow(2, retryCount));
        return this._fetch(url, options, retryCount + 1);
      }

      return {
        ok: false,
        status: 0,
        error: error.message || 'Network request failed',
        data: null,
      };
    }
  }

  /**
   * Helper: Sleep for specified milliseconds
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * GET request
   */
  async get(endpoint, options = {}) {
    let url = `${this.baseURL}${endpoint}`;
    
    // Handle query parameters if provided
    if (options.params) {
      const queryString = new URLSearchParams(options.params).toString();
      url = `${url}?${queryString}`;
      delete options.params; // Remove params from options before spreading
    }
    
    return this._fetch(url, {
      method: 'GET',
      headers: this.buildHeaders(options.headers),
      ...options,
    });
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    return this._fetch(url, {
      method: 'POST',
      headers: this.buildHeaders(options.headers),
      body: JSON.stringify(data),
      ...options,
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    return this._fetch(url, {
      method: 'PUT',
      headers: this.buildHeaders(options.headers),
      body: JSON.stringify(data),
      ...options,
    });
  }

  /**
   * PATCH request
   */
  async patch(endpoint, data = {}, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    return this._fetch(url, {
      method: 'PATCH',
      headers: this.buildHeaders(options.headers),
      body: JSON.stringify(data),
      ...options,
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    return this._fetch(url, {
      method: 'DELETE',
      headers: this.buildHeaders(options.headers),
      ...options,
    });
  }

  /**
   * Upload file
   */
  async uploadFile(endpoint, file, additionalData = {}, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const formData = new FormData();

    // Add file
    formData.append('file', file);

    // Add additional form data
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    // Build headers without Content-Type (browser will set it with boundary)
    const headers = { ...this.buildHeaders(options.headers) };
    delete headers['Content-Type']; // Let the browser set it

    // Add terminal identity to form data
    if (this.terminalIdentity) {
      formData.append('terminal-id', this.terminalIdentity['terminal-id']);
      formData.append('store-id', this.terminalIdentity['store-id']);
    }

    return this._fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      ...options,
    });
  }

  /**
   * Batch request - makes multiple requests efficiently
   */
  async batch(requests) {
    const promises = requests.map(req => {
      const { method = 'GET', endpoint, data, options } = req;
      
      switch (method.toUpperCase()) {
        case 'GET':
          return this.get(endpoint, options);
        case 'POST':
          return this.post(endpoint, data, options);
        case 'PUT':
          return this.put(endpoint, data, options);
        case 'PATCH':
          return this.patch(endpoint, data, options);
        case 'DELETE':
          return this.delete(endpoint, options);
        default:
          return Promise.reject(new Error(`Unknown method: ${method}`));
      }
    });

    return Promise.all(promises);
  }

  /**
   * Get current API base URL
   */
  getBaseURL() {
    return this.baseURL;
  }

  /**
   * Get terminal identity headers
   */
  getTerminalIdentity() {
    return { terminalId: this.terminalId };
  }

  /**
   * Check if running in Electron
   */
  isRunningInElectron() {
    return this.isElectron;
  }
}

// Create and export singleton instance
const apiClient = new APIClient();

export default apiClient;
export { APIClient };
