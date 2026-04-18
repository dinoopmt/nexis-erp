import React, { createContext, useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';

export const CostingContext = createContext();

export const CostingProvider = ({ children }) => {
  const [costingMethod, setCostingMethod] = useState('FIFO');
  const [costingConfig, setCostingConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const companyId = localStorage.getItem('companyId');
  const API_URL = '/api';
  
  // ✅ Prevent duplicate API calls in StrictMode
  const hasFetched = useRef(false);

  // Fetch costing method configuration from backend
  const fetchCostingConfig = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/v1/costing/config/${companyId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setCostingConfig(response.data.data);
      setCostingMethod(response.data.data.defaultCostingMethod);
    } catch (err) {
      console.log('No costing config found, using default FIFO');
      setCostingMethod('FIFO');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // Initialize on mount (only once)
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchCostingConfig();
  }, [fetchCostingConfig]);

  // Update costing method configuration
  const updateCostingConfig = useCallback(
    async (configUpdates) => {
      if (!companyId) return;
      setLoading(true);
      try {
        const response = await axios.put(
          `${API_URL}/api/v1/costing/config/${companyId}`,
          configUpdates,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }
        );
        setCostingConfig(response.data.data);
        setCostingMethod(response.data.data.defaultCostingMethod);
        return response.data;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [companyId]
  );

  // Calculate cost using specific method
  const calculateCost = useCallback(
    async (productId, quantityNeeded, method = costingMethod) => {
      setLoading(true);
      try {
        const response = await axios.post(
          `${API_URL}/api/v1/costing/calculate`,
          {
            productId,
            quantityNeeded,
            method,
          },
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }
        );
        return response.data.data;
      } catch (err) {
        setError(err.response?.data?.message || err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [costingMethod]
  );

  // Compare all three methods
  const compareCostingMethods = useCallback(
    async (productId, quantityNeeded) => {
      setLoading(true);
      try {
        const response = await axios.post(
          `${API_URL}/api/v1/costing/compare`,
          {
            productId,
            quantityNeeded,
          },
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }
        );
        return response.data.data;
      } catch (err) {
        setError(err.response?.data?.message || err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Get ABC analysis
  const getABCAnalysis = useCallback(async (productId = null) => {
    setLoading(true);
    try {
      const params = productId ? { productId } : {};
      const response = await axios.get(`${API_URL}/api/v1/costing/analysis/abc`, {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get inventory valuation
  const getInventoryValuation = useCallback(
    async (productId = null, method = costingMethod) => {
      setLoading(true);
      try {
        const params = {
          ...(productId && { productId }),
          costingMethod: method,
        };
        const response = await axios.get(`${API_URL}/api/v1/costing/analysis/valuation`, {
          params,
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        return response.data;
      } catch (err) {
        setError(err.response?.data?.message || err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [costingMethod]
  );

  // Switch costing method
  const switchCostingMethod = useCallback(
    (newMethod) => {
      if (!['FIFO', 'LIFO', 'WAC'].includes(newMethod)) {
        setError('Invalid costing method');
        return;
      }
      setCostingMethod(newMethod);
    },
    []
  );

  const value = {
    costingMethod,
    costingConfig,
    loading,
    error,
    switchCostingMethod,
    calculateCost,
    compareCostingMethods,
    updateCostingConfig,
    getABCAnalysis,
    getInventoryValuation,
    fetchCostingConfig,
  };

  return (
    <CostingContext.Provider value={value}>
      {children}
    </CostingContext.Provider>
  );
};


