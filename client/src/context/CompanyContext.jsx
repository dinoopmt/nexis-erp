import React, { createContext, useState, useCallback, useEffect } from 'react'
import axios from 'axios'
import { showToast } from '../components/shared/AnimatedCenteredToast.jsx'
import { API_URL } from '../config/config'

// Create the context
export const CompanyContext = createContext()

// Provider component
export const CompanyProvider = ({ children }) => {
  const [company, setCompany] = useState({
    countryCode: 'AE',
    countryName: 'UAE',
    currency: 'AED',
    taxSystem: 'VAT',
    taxNumberLabel: 'TRN',
    taxStructure: 'SINGLE',
    taxRate: 5.0,
    companyName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    taxId: '',
  })

  const [taxMaster, setTaxMaster] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch company data on mount
  useEffect(() => {
    fetchCompanyData()
  }, [])

  // Fetch company settings
  const fetchCompanyData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/settings/company`)

      const data = response.data
      if (data.data) {
        setCompany(data.data)
        // Fetch tax master for this country
        if (data.data.countryCode) {
          fetchTaxMaster(data.data.countryCode)
        }
      }
    } catch (err) {
      console.error('Error fetching company data:', err)
      showToast('error', 'Failed to load company settings')
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch tax master for country
  const fetchTaxMaster = useCallback(async (countryCode) => {
    try {
      const response = await axios.get(`${API_URL}/tax-masters`)

      const data = response.data
      if (data.success && data.data) {
        // Filter by country code
        const countryTaxes = data.data.filter(
          (tax) => tax.countryCode === countryCode
        )
        // Store all tax entries for this country
        setTaxMaster(countryTaxes)
      }
    } catch (err) {
      console.error('Error fetching tax master:', err)
      showToast('error', 'Failed to load tax information')
      setError(err.message)
    }
  }, [])

  // Update company details
  const updateCompany = useCallback(async (updates) => {
    try {
      setLoading(true)
      const response = await axios.post(`${API_URL}/settings/company`, updates)

      const data = response.data
      if (data.data) {
        setCompany(data.data)
        // Fetch updated tax master if country changed
        if (updates.countryCode && updates.countryCode !== company.countryCode) {
          fetchTaxMaster(updates.countryCode)
        }
      }
      return data
    } catch (err) {
      console.error('Error updating company:', err)
      showToast('error', 'Failed to update company settings')
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [company.countryCode, fetchTaxMaster])

  // Switch country - useful for multi-country operations
  const switchCountry = useCallback(async (countryCode) => {
    try {
      setLoading(true)
      const updatedCompany = { ...company, countryCode }
      await updateCompany(updatedCompany)
    } catch (err) {
      console.error('Error switching country:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [company, updateCompany])

  const value = {
    company,
    setCompany,
    taxMaster,
    loading,
    error,
    fetchCompanyData,
    fetchTaxMaster,
    updateCompany,
    switchCountry,
  }

  return (
    <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
  )
}

export default CompanyContext


