import { useCallback } from 'react';

/**
 * Custom hook for tax calculation logic
 * Handles customer-based tax rates and country-specific tax details
 */
export const useTaxCalculation = ({ taxMaster, config, selectedCustomerDetails }) => {
  // Helper function to get tax rate based on customer's tax type and tax group
  const getCustomerTaxRate = useCallback(() => {
    // If customer has taxGroupId, use that for the tax rate
    if (selectedCustomerDetails?.taxGroupId && taxMaster) {
      const customerTaxGroup = taxMaster.find(
        (tg) => tg._id === selectedCustomerDetails.taxGroupId
      );
      if (customerTaxGroup) {
        return customerTaxGroup.totalRate || 5; // Default to 5% if not found
      }
    }
    // Fallback: return default tax rate (5%)
    return 5;
  }, [selectedCustomerDetails, taxMaster]);

  // Helper function to get country-based tax details (UAE VAT, Oman VAT, India GST)
  const getTaxDetails = useCallback(() => {
    const country = config?.country || 'UAE';
    const taxRate = getCustomerTaxRate();

    const taxDetails = {
      UAE: {
        label: 'VAT',
        rate: taxRate,
        breakdown: null, // UAE uses single rate
        description: `VAT @ ${taxRate}%`,
      },
      Oman: {
        label: 'VAT',
        rate: taxRate,
        breakdown: null, // Oman uses single rate
        description: `VAT @ ${taxRate}%`,
      },
      India: {
        label: 'GST',
        rate: taxRate,
        breakdown: {
          cgst: taxRate / 2, // CGST = half of total
          sgst: taxRate / 2, // SGST = half of total
        },
        description: `GST @ ${taxRate}% (CGST ${taxRate / 2}% + SGST ${taxRate / 2}%)`,
      },
    };

    return taxDetails[country] || taxDetails['UAE'];
  }, [config, getCustomerTaxRate]);

  return {
    getCustomerTaxRate,
    getTaxDetails,
  };
};
