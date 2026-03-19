import { useContext, useCallback } from 'react'
import { CompanyContext } from '../context/CompanyContext'
import TaxService from '../services/TaxService'

/**
 * Custom hook to access company and tax data
 * Usage: const { company, taxMaster, calculateTax } = useTaxMaster()
 */
export const useTaxMaster = () => {
  const context = useContext(CompanyContext)

  if (!context) {
    throw new Error('useTaxMaster must be used within CompanyProvider')
  }

  const {
    company,
    taxMaster,
    loading,
    error,
    switchCountry,
    updateCompany,
  } = context

  // Calculate tax for a given amount
  const calculateTax = useCallback(
    (baseAmount) => {
      if (!company || !taxMaster || company.countryCode === undefined) {
        console.warn('Company or tax master not loaded')
        return null
      }

      return TaxService.calculateTaxByCountry(
        baseAmount,
        company.countryCode,
        taxMaster
      )
    },
    [company, taxMaster]
  )

  // Get total with tax
  const getTotalWithTax = useCallback(
    (baseAmount) => {
      const taxBreakdown = calculateTax(baseAmount)
      return taxBreakdown ? taxBreakdown.total : baseAmount
    },
    [calculateTax]
  )

  // Get tax components (CGST + SGST for India, VAT for others)
  const getTaxComponentNames = useCallback(() => {
    return TaxService.getTaxComponentNames(company?.countryCode)
  }, [company?.countryCode])

  // Check if HSN is required
  const requiresHSN = useCallback(() => {
    return TaxService.requiresHSN(company?.countryCode)
  }, [company?.countryCode])

  // Check if interstate tax applies
  const hasInterstateTax = useCallback(() => {
    return TaxService.hasInterstateTax(company?.countryCode)
  }, [company?.countryCode])

  // Format currency
  const formatCurrency = useCallback(
    (amount) => {
      return TaxService.formatCurrency(amount, company?.currency)
    },
    [company?.currency]
  )

  return {
    // State
    company,
    taxMaster,
    loading,
    error,

    // Tax calculations
    calculateTax,
    getTotalWithTax,
    getTaxComponentNames,
    requiresHSN,
    hasInterstateTax,
    formatCurrency,

    // Actions
    switchCountry,
    updateCompany,
  }
}

export default useTaxMaster


