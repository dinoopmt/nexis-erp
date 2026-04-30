import React, { createContext, useState, useCallback, useEffect, useRef, useContext } from 'react'
import axios from 'axios'
import { showToast } from '../components/shared/AnimatedCenteredToast.jsx'
import { API_URL } from '../config/config'
import { ServerReadyContext } from './ServerReadyContext'

// Create the context
export const CompanyContext = createContext()

// Provider component
export const CompanyProvider = ({ children }) => {
  const { serverReady, serverError } = useContext(ServerReadyContext)
  
  const [company, setCompany] = useState({
    countryCode: 'AE',
    countryName: 'UAE',
    currency: 'AED',
    taxSystem: 'VAT',
    taxNumberLabel: 'TRN',
    taxStructure: 'SINGLE',
    taxRate: 5.0,
    decimalPlaces: 2,
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
  
  // ✅ Prevent duplicate API calls in StrictMode
  const hasFetched = useRef(false)

  // Set error if server is not available
  useEffect(() => {
    if (serverError) {
      setError(serverError)
      showToast('error', 'Cannot connect to server. Please restart the application.')
    }
  }, [serverError])

  // Fetch company data on mount (only once) - but only after server is ready
  useEffect(() => {
    if (hasFetched.current || !serverReady) return
    hasFetched.current = true
    fetchCompanyData()
  }, [serverReady])

  // Fetch company settings
  const fetchCompanyData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/settings/company`)

      // API returns company object directly (not wrapped in {data: {...}})
      const companyData = response.data
      
      if (companyData && companyData.companyName !== undefined) {
        setCompany(companyData)
        // Fetch tax master for this country
        const countryCode = companyData.countryCode || companyData.country
        if (countryCode) {
          fetchTaxMaster(countryCode)
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

      // API returns { message: '...', data: companyObject }
      const responseData = response.data
      const updatedCompanyData = responseData.data || responseData
      
      if (updatedCompanyData && updatedCompanyData.companyName !== undefined) {
        setCompany(updatedCompanyData)
        // Fetch updated tax master if country changed
        const countryCode = updatedCompanyData.countryCode || updatedCompanyData.country
        if (countryCode && countryCode !== company.countryCode) {
          fetchTaxMaster(countryCode)
        }
      }
      return response.data
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


