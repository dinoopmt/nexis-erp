import { useState, useCallback } from 'react';

/**
 * Custom hook for customer selection logic
 * Handles customer state, filtering, and selection
 */
export const useCustomerSelection = (customers, config) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');

  // Filter customers based on search term
  const filteredCustomers = customers.filter((c) =>
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.vendorName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.vendorPhone?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.vendorTRN?.toLowerCase().includes(customerSearch.toLowerCase()),
  );

  // Handle customer selection
  const handleSelectCustomer = useCallback(
    (customerId, onSelectCustomer) => {
      const customer = customers.find((c) => c._id === customerId);
      if (customer) {
        setSelectedCustomerId(customerId);
        setSelectedCustomerDetails(customer);
        setCustomerSearch('');
        // Call parent callback if provided
        if (onSelectCustomer) {
          onSelectCustomer(customer);
        }
      }
    },
    [customers]
  );

  // Reset customer selection
  const resetCustomer = useCallback(() => {
    setSelectedCustomerId(null);
    setSelectedCustomerDetails(null);
    setCustomerSearch('');
  }, []);

  return {
    selectedCustomerId,
    setSelectedCustomerId,
    selectedCustomerDetails,
    setSelectedCustomerDetails,
    customerSearch,
    setCustomerSearch,
    filteredCustomers,
    handleSelectCustomer,
    resetCustomer,
  };
};
