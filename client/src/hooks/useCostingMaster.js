import { useContext } from 'react';
import { CostingContext } from '../context/CostingContext';

/**
 * Custom hook for accessing costing methods throughout the application
 * 
 * Usage:
 * const { costingMethod, calculateCost, compareCostingMethods } = useCostingMaster();
 * 
 * @returns {Object} Costing features and methods
 */
export const useCostingMaster = () => {
  const context = useContext(CostingContext);

  if (!context) {
    throw new Error(
      'useCostingMaster must be used within CostingProvider. Wrap your app with <CostingProvider> in main.jsx'
    );
  }

  return context;
};


