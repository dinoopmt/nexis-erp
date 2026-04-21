/**
 * Hook: useTerminalConfig
 * 
 * Fetches and manages terminal configuration from database
 * Provides access to terminal controls and printer settings
 */

import { useState, useEffect, useCallback } from 'react';

export function useTerminalConfig() {
  const [terminalConfig, setTerminalConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get cache key for specific terminal ID
  const getCacheKey = useCallback((terminalId) => {
    return `terminalConfig_${terminalId}`;
  }, []);

  // Check if cached config exists for a terminal (no expiration time)
  const getCachedConfig = useCallback((terminalId) => {
    try {
      const cacheKey = getCacheKey(terminalId);
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const { config } = JSON.parse(cached);
      console.log('📂 Terminal config loaded from localStorage cache');
      return config;
    } catch (err) {
      console.warn('⚠️ Failed to parse cached config:', err);
      return null;
    }
  }, [getCacheKey]);

  // Save config to cache (per terminal)
  const saveConfigToCache = useCallback((config, terminalId) => {
    try {
      const cacheKey = getCacheKey(terminalId);
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          config,
          savedAt: new Date().toISOString(),
        })
      );
    } catch (err) {
      console.warn('⚠️ Failed to cache config:', err);
    }
  }, [getCacheKey]);

  // Clear cache for specific terminal (call when terminal is updated)
  const clearConfigCache = useCallback((terminalId = null) => {
    if (terminalId) {
      const cacheKey = getCacheKey(terminalId);
      localStorage.removeItem(cacheKey);
      console.log('🔄 Terminal config cache cleared for:', terminalId);
    } else {
      // Clear all terminal configs
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('terminalConfig_')) {
          localStorage.removeItem(key);
        }
      });
      console.log('🔄 All terminal config caches cleared');
    }
  }, [getCacheKey]);

  // Fetch terminal config from backend
  const fetchConfig = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Get terminal ID from config file
      const configRes = await fetch('/config/terminal.json');
      if (!configRes.ok) throw new Error('Failed to load terminal config');
      const { terminalId, apiBaseUrl } = await configRes.json();

      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        const cachedConfig = getCachedConfig(terminalId);
        if (cachedConfig) {
          setTerminalConfig(cachedConfig);
          setIsLoading(false);
          return cachedConfig;
        }
      }

      // Get auth token - skip refetch if not available (will use existing config)
      const authToken = localStorage.getItem('token') || localStorage.getItem('authToken');
      if (!authToken) {
        console.warn('⚠️ No auth token available - skipping refetch (using cached config)');
        setIsLoading(false);
        return terminalConfig; // Return cached config
      }

      // Fetch terminal details from backend
      const baseUrl = apiBaseUrl || 'http://localhost:5000/api/v1';
      console.log('📡 API Request: GET', `${baseUrl}/terminals/${terminalId}`);
      
      const response = await fetch(`${baseUrl}/terminals/${terminalId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'terminal-id': terminalId,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Terminal API error: ${response.statusText}`);
      }

      const data = await response.json();
      const config = data.data || data;

      // Extract key information
      const terminalInfo = {
        terminalId: config.terminalId,
        terminalName: config.terminalName,
        terminalType: config.terminalType,
        terminalStatus: config.terminalStatus,
        
        // Sales Controls
        salesControls: config.salesControls || {
          allowReturns: true,
          allowDiscounts: true,
          allowCredits: true,
          allowExchanges: true,
          allowPromotions: true,
          maxDiscount: 100,
          requireApprovalAbove: 50,
        },

        // Hardware Mapping
        hardwareMapping: config.hardwareMapping || {
          invoicePrinter: {
            enabled: false,
            printerName: '',
            timeout: 5000,
          },
          barcodePrinter: {
            enabled: false,
            printerName: '',
            timeout: 5000,
          },
          customerDisplay: {
            enabled: false,
          },
        },

        // Format Mapping
        formatMapping: config.formatMapping || {
          invoice: null,
          deliveryNote: null,
          quotation: null,
          salesOrder: null,
          salesReturn: null,
        },

        // Raw config for advanced usage
        raw: config,
      };

      setTerminalConfig(terminalInfo);
      saveConfigToCache(terminalInfo, terminalId); // Cache the config per terminal
      console.log('✅ Terminal config loaded from API:', terminalInfo);
      return terminalInfo;
    } catch (err) {
      const errorMsg = err.message || 'Failed to fetch terminal configuration';
      console.error('❌ Terminal config error:', errorMsg);
      setError(errorMsg);
      setTerminalConfig(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getCachedConfig, saveConfigToCache, terminalConfig]);

  // Load config on mount and when user changes
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      fetchConfig();
    } else {
      setIsLoading(false);
    }
  }, []); // Only run once on mount

  return {
    terminalConfig,
    isLoading,
    error,
    refetch: fetchConfig,
    clearCache: clearConfigCache, // Call this when terminal settings are updated
  };
}

/**
 * Clear terminal config cache (call when terminal settings are updated)
 * Can be called from anywhere without needing the hook
 */
export function clearTerminalConfigCache(terminalId = null) {
  if (terminalId) {
    const cacheKey = `terminalConfig_${terminalId}`;
    localStorage.removeItem(cacheKey);
    console.log('🔄 Terminal config cache cleared for:', terminalId);
  } else {
    // Clear all terminal configs
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('terminalConfig_')) {
        localStorage.removeItem(key);
      }
    });
    console.log('🔄 All terminal config caches cleared');
  }
}

/**
 * Helper functions to check terminal controls
 */
export function useTerminalControls(terminalConfig) {
  if (!terminalConfig) {
    return {
      allowReturns: true,
      allowDiscounts: true,
      allowCredits: true,
      allowExchanges: true,
      allowPromotions: true,
      maxDiscount: 100,
      requireApprovalAbove: 50,
    };
  }

  return terminalConfig.salesControls || {};
}

/**
 * Helper to get printer config
 */
export function useTerminalPrinter(terminalConfig, printerType = 'invoicePrinter') {
  if (!terminalConfig?.hardwareMapping?.[printerType]) {
    return null;
  }

  return terminalConfig.hardwareMapping[printerType];
}

/**
 * Helper to check if feature is allowed
 */
export function isFeatureAllowed(terminalConfig, featureName) {
  if (!terminalConfig?.salesControls) return true;
  
  const feature = terminalConfig.salesControls[featureName];
  return feature !== false; // Default to true if not specified
}

/**
 * Helper to validate discount amount
 */
export function validateDiscount(terminalConfig, discountAmount) {
  if (!terminalConfig?.salesControls) return { valid: true };

  const maxDiscount = terminalConfig.salesControls.maxDiscount || 100;
  const requireApprovalAbove = terminalConfig.salesControls.requireApprovalAbove || 100;

  if (discountAmount > maxDiscount) {
    return {
      valid: false,
      error: `Discount exceeds maximum allowed (${maxDiscount}%)`,
    };
  }

  if (discountAmount > requireApprovalAbove) {
    return {
      valid: true,
      requiresApproval: true,
      message: `Discount above ${requireApprovalAbove}% requires manager approval`,
    };
  }

  return { valid: true };
}
