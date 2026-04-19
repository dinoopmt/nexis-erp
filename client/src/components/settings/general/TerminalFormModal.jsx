import React, { useState, useEffect } from 'react'
import { X, Save, Printer, Monitor, Download } from 'lucide-react'
import axios from 'axios'
import apiClient from '../../../services/apiClient'
import { API_URL } from '../../../config/config'
import { showToast } from '../../shared/AnimatedCenteredToast'
import useValidationToast from '../../../hooks/useValidationToast'

const TerminalFormModal = ({ terminal, existingTerminals = [], onSave, onCancel }) => {
  const { showApiError, showSuccess } = useValidationToast()
  const [modalHeight, setModalHeight] = useState('90vh')
  const [activeTab, setActiveTab] = useState('basic')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastValidationTime, setLastValidationTime] = useState(0) // ✅ Debounce rapid clicks
  const [availableTemplates, setAvailableTemplates] = useState({
    invoice: [],
    deliveryNote: [],
    quotation: [],
    salesOrder: [],
    salesReturn: [],
  })
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [installedPrinters, setInstalledPrinters] = useState([])
  const [availableComPorts, setAvailableComPorts] = useState([])
  const [loadingHardware, setLoadingHardware] = useState(false)
  const [deviceFingerprint, setDeviceFingerprint] = useState(null)
  const [deviceTerminals, setDeviceTerminals] = useState([])
  const [validatingTerminalId, setValidatingTerminalId] = useState(false)
  const [vfdModels] = useState([
    { id: 'VFD_20X2', name: 'VFD 20x2 Characters', rows: 2, cols: 20 },
    { id: 'VFD_40X2', name: 'VFD 40x2 Characters', rows: 2, cols: 40 },
    { id: 'VFD_20X4', name: 'VFD 20x4 Characters', rows: 4, cols: 20 },
  ])
  const [formData, setFormData] = useState({
    terminalId: '',
    terminalName: '',
    terminalType: 'SALES',
    invoiceControls: {
      invoiceNumberPrefix: '',
    },
    // ✅ Simplified: formatMapping only has templateId
    formatMapping: {
      invoice: {
        templateId: null,
      },
      deliveryNote: {
        templateId: null,
      },
      quotation: {
        templateId: null,
      },
      salesOrder: {
        templateId: null,
      },
      salesReturn: {
        templateId: null,
      },
    },
    hardwareMapping: {
      invoicePrinter: {
        enabled: true,
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
        displayType: 'VFD',
        comPort: '',
        vfdModel: 'VFD_20X2',
        baudRate: 9600,
        displayItems: true,
        displayPrice: true,
        displayTotal: true,
        displayDiscount: true,
      },
    },
  })

  // ✅ Fetch available invoice templates from database
  useEffect(() => {
    fetchAvailableTemplates()
    fetchHardwareDevices()
    initializeDeviceFingerprint()
  }, [])

  const fetchHardwareDevices = async () => {
    try {
      setLoadingHardware(true)
      
      // Check if running in Electron
      const isElectron = typeof window !== 'undefined' && window.electronAPI
      
      console.log('🔧 Checking Electron availability...')
      console.log('   window.electronAPI:', !!window.electronAPI)
      console.log('   window.electronAPI.hardware:', !!window.electronAPI?.hardware)
      
      if (isElectron && window.electronAPI.hardware) {
        // Use Electron IPC for hardware detection
        try {
          console.log('📡 Calling window.electronAPI.hardware.getAllDevices()...')
          const devices = await window.electronAPI.hardware.getAllDevices()
          
          console.log('═══════════════════════════════════════════════════════')
          console.log('📊 FULL RESPONSE FROM ELECTRON:')
          console.log('   devices object:', devices)
          console.log('   JSON:', JSON.stringify(devices, null, 2))
          console.log('   devices.printers:', devices.printers)
          console.log('   devices.debug:', devices.debug)
          console.log('   devices.debug is array?', Array.isArray(devices.debug))
          console.log('═══════════════════════════════════════════════════════')
          
          // Log all debug messages with colors
          if (devices.debug && Array.isArray(devices.debug) && devices.debug.length > 0) {
            console.log('🖨️  PRINTER DETECTION DEBUG OUTPUT:')
            devices.debug.forEach((msg, idx) => {
              console.log(`   [${idx}] ${msg}`)
            })
          } else {
            console.warn('⚠️ No debug messages in response')
          }
          
          console.log('📊 Response from Electron:', devices)
          console.log('   Printers:', devices.printers)
          console.log('   Printers length:', devices.printers?.length)
          console.log('   COM Ports:', devices.comPorts)
          console.log('   COM Ports length:', devices.comPorts?.length)
          
          // Set printers from hardware detection
          if (devices.printers && devices.printers.length > 0) {
            const formattedPrinters = devices.printers.map(p => ({
              name: p.name || p,
              displayName: (p.displayName || p.name || p).replace(/_/g, ' '),
            }))
            setInstalledPrinters(formattedPrinters)
            console.log('✅ Hardware printers detected and set:', formattedPrinters.length, 'printers')
            formattedPrinters.forEach((p, i) => console.log(`   [${i}] ${p.name} -> ${p.displayName}`))
          } else {
            console.log('⚠️ No printers detected from hardware, using defaults')
            setInstalledPrinters([
              { name: 'Network Printer (IP)', displayName: 'Network Printer' },
              { name: 'Local Printer', displayName: 'Local Printer' },
            ])
          }
          
          // Set COM ports from hardware detection
          if (devices.comPorts && devices.comPorts.length > 0) {
            const ports = devices.comPorts.map(port => 
              typeof port === 'string' ? port : port.path
            )
            setAvailableComPorts(ports)
            console.log('✅ Hardware COM ports detected:', ports.length, 'ports')
            ports.forEach((p, i) => console.log(`   [${i}] ${p}`))
          } else {
            console.log('⚠️ No COM ports detected from hardware, using defaults')
            setAvailableComPorts(['COM1', 'COM2', 'COM3', 'COM4', 'LPT1'])
          }
        } catch (err) {
          console.error('❌ Electron hardware detection failed:', err)
          console.error('   Error message:', err.message)
          console.error('   Error stack:', err.stack)
          console.log('⚠️ Falling back to default printers')
          // Fallback to defaults on error
          setInstalledPrinters([
            { name: 'Network Printer (IP)', displayName: 'Network Printer' },
            { name: 'Local Printer', displayName: 'Local Printer' },
          ])
          setAvailableComPorts(['COM1', 'COM2', 'COM3', 'COM4', 'LPT1'])
        }
      } else {
        // Running in web browser - use HTTP API calls
        console.log('🌐 Running in web browser, fetching hardware via API')
        try {
          const printersResponse = await axios.get(`${API_URL}/system/printers`)
          if (printersResponse.data.data && Array.isArray(printersResponse.data.data)) {
            setInstalledPrinters(printersResponse.data.data)
            console.log('✅ API printers detected:', printersResponse.data.data.length)
          } else {
            throw new Error('Invalid printers response')
          }
        } catch (err) {
          console.log('⚠️ Printers API not available, using defaults')
          setInstalledPrinters([
            { name: 'Network Printer (IP)', displayName: 'Network Printer' },
            { name: 'Local Printer', displayName: 'Local Printer' },
          ])
        }

        try {
          const portsResponse = await axios.get(`${API_URL}/system/com-ports`)
          if (portsResponse.data.data && Array.isArray(portsResponse.data.data)) {
            setAvailableComPorts(portsResponse.data.data)
            console.log('✅ API COM ports detected:', portsResponse.data.data.length)
          } else {
            throw new Error('Invalid COM ports response')
          }
        } catch (err) {
          console.log('⚠️ COM ports API not available, using defaults')
          setAvailableComPorts(['COM1', 'COM2', 'COM3', 'COM4', 'LPT1', 'USB0', 'USB1'])
        }
      }
    } finally {
      setLoadingHardware(false)
    }
  }

  // ✅ Auto-populate printer and COM port from detected hardware
  useEffect(() => {
    if (!loadingHardware && (installedPrinters.length > 0 || availableComPorts.length > 0)) {
      setFormData(prev => {
        const updated = { ...prev }
        
        // Auto-set invoice printer if empty
        if (!updated.hardwareMapping.invoicePrinter.printerName && installedPrinters.length > 0) {
          updated.hardwareMapping.invoicePrinter.printerName = installedPrinters[0].name
        }
        
        // Auto-set barcode printer if empty and we have a second printer
        if (!updated.hardwareMapping.barcodePrinter.printerName && installedPrinters.length > 1) {
          updated.hardwareMapping.barcodePrinter.printerName = installedPrinters[1].name
        }
        
        // Auto-set COM port if empty
        if (!updated.hardwareMapping.customerDisplay.comPort && availableComPorts.length > 0) {
          updated.hardwareMapping.customerDisplay.comPort = availableComPorts[0]
        }
        
        return updated
      })
    }
  }, [loadingHardware, installedPrinters, availableComPorts])

  const fetchAvailableTemplates = async () => {
    try {
      setLoadingTemplates(true)
      const response = await apiClient.get(`/invoice-templates`)
      
      if (response.ok && response.data.data) {
        const templates = Array.isArray(response.data.data) ? response.data.data : [response.data.data]
        
        // Organize templates by templateType
        const organized = {
          invoice: templates.filter(t => t.templateType === 'INVOICE' || !t.templateType),
          deliveryNote: templates.filter(t => t.templateType === 'DELIVERY_NOTE'),
          quotation: templates.filter(t => t.templateType === 'QUOTATION'),
          salesOrder: templates.filter(t => t.templateType === 'SALES_ORDER'),
          salesReturn: templates.filter(t => t.templateType === 'SALES_RETURN' || t.templateType === 'RTV'),
        }
        
        setAvailableTemplates(organized)
        console.log('✅ Templates organized by type:', organized)
      }
    } catch (error) {
      console.error('Failed to fetch invoice templates:', error)
      showToast('error', 'Failed to load document templates')
    } finally {
      setLoadingTemplates(false)
    }
  }

  // ✅ Initialize Device Fingerprint and auto-generate Terminal ID
  const initializeDeviceFingerprint = async () => {
    try {
      const isElectron = typeof window !== 'undefined' && window.electronAPI

      if (isElectron && window.electronAPI.device) {
        // Get device fingerprint from Electron
        const fingerprint = await window.electronAPI.device.getFingerprint()
        setDeviceFingerprint(fingerprint)
        console.log('✅ Device fingerprint:', fingerprint)

        // Fetch existing device terminals
        const response = await apiClient.get(`/terminals/device-info`, {
          params: { deviceFingerprint: fingerprint },
        })

        if (response.data.success) {
          setDeviceTerminals(response.data.terminals)
          console.log('✅ Device terminals found:', response.data.terminals.length)

          // If creating new terminal, auto-generate ID
          if (!terminal) {
            const nextTerminalNumber = response.data.nextTerminalNumber
            const generatedId = await window.electronAPI.device.generateTerminalId(nextTerminalNumber)
            setFormData(prev => ({
              ...prev,
              terminalId: generatedId,
            }))
            console.log('✅ Generated Terminal ID:', generatedId)
          }
        }
      }
    } catch (error) {
      console.error('⚠️ Error initializing device fingerprint:', error)
      // Continue without device fingerprinting in web mode
    }
  }

  // ✅ Validate Terminal ID for duplicates
  const validateTerminalId = async (terminalId, terminalType = 'SALES') => {
    // Only validate Terminal ID if type is SALES
    if (terminalType !== 'SALES') {
      return
    }

    if (!terminalId) return

    try {
      setValidatingTerminalId(true)

      const response = await apiClient.post(`/terminals/validate-id`, {
        terminalId,
        excludeId: terminal?._id, // Exclude current terminal if editing
      })

      if (response.data.success) {
        console.log('✅ Terminal ID is unique:', terminalId)
      }
    } catch (error) {
      if (error.response?.data?.code === 'DUPLICATE_TERMINAL_ID') {
        const errorMsg = `Terminal ID already exists: ${error.response.data.details.existingTerminal}`
        showToast('error', errorMsg)
        console.error('❌ Duplicate Terminal ID:', errorMsg)
      } else {
        showApiError(error)
        console.error('Error validating Terminal ID:', error)
      }
    } finally {
      setValidatingTerminalId(false)
    }
  }

  useEffect(() => {
    const calculateHeight = () => {
      const maxHeight = window.innerHeight - 32
      setModalHeight(`${maxHeight}px`)
    }
    calculateHeight()
    window.addEventListener('resize', calculateHeight)
    return () => window.removeEventListener('resize', calculateHeight)
  }, [])

  useEffect(() => {
    if (terminal) {
      // ✅ Migrate old hardwareMapping structure to new one if needed
      let hardwareMapping = terminal.hardwareMapping
      
      // If old structure with 'printer' exists, migrate to new structure
      if (hardwareMapping && hardwareMapping.printer && !hardwareMapping.invoicePrinter) {
        hardwareMapping = {
          ...hardwareMapping,
          invoicePrinter: {
            enabled: hardwareMapping.printer.enabled,
            printerName: hardwareMapping.printer.printerName || (installedPrinters[0]?.name || ''),
            timeout: hardwareMapping.printer.timeout || 5000,
          },
          barcodePrinter: {
            enabled: false,
            printerName: installedPrinters[1]?.name || '',
            timeout: 5000,
          },
        }
        // Remove old printer field
        delete hardwareMapping.printer
      }
      
      // Ensure new structure exists
      if (!hardwareMapping) {
        hardwareMapping = {
          invoicePrinter: {
            enabled: true,
            printerName: installedPrinters[0]?.name || '',
            timeout: 5000,
          },
          barcodePrinter: {
            enabled: false,
            printerName: installedPrinters[1]?.name || '',
            timeout: 5000,
          },
          customerDisplay: {
            enabled: false,
            displayType: 'VFD',
            comPort: availableComPorts[0] || 'COM1',
            vfdModel: 'VFD_20X2',
            baudRate: 9600,
            displayItems: true,
            displayPrice: true,
            displayTotal: true,
            displayDiscount: true,
          },
        }
      }
      
      // Ensure customerDisplay exists
      if (!hardwareMapping.customerDisplay) {
        hardwareMapping.customerDisplay = {
          enabled: false,
          displayType: 'VFD',
          comPort: availableComPorts[0] || 'COM1',
          vfdModel: 'VFD_20X2',
          baudRate: 9600,
          displayItems: true,
          displayPrice: true,
          displayTotal: true,
          displayDiscount: true,
        }
      }
      
      // Load formatMapping and hardwareMapping
      let formatMapping = terminal.formatMapping || {}
      
      // Ensure all keys exist in formatMapping
      Object.keys(formData.formatMapping).forEach(key => {
        if (!formatMapping[key]) {
          formatMapping[key] = { templateId: null }
        }
      })
      
      setFormData(prev => ({
        ...prev,
        ...terminal,
        invoiceControls: terminal.invoiceControls || prev.invoiceControls,
        formatMapping,
        hardwareMapping,
      }))
    }
  }, [terminal, installedPrinters, availableComPorts])

  // Cleanup effect: reset isSubmitting and debounce on unmount
  useEffect(() => {
    return () => {
      setIsSubmitting(false)
      setLastValidationTime(0) // ✅ Reset debounce on close
    }
  }, [])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleNestedChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      }
    }))
  }

  const handleDeepNestedChange = (section, subsection, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [field]: value,
        }
      }
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // ✅ Prevent multiple submissions
    if (isSubmitting) {
      return
    }

    // ✅ Debounce rapid validation clicks (prevent blinking)
    // User must wait 2 seconds between validation attempts
    const now = Date.now()
    if (now - lastValidationTime < 2000) {
      return
    }
    setLastValidationTime(now)
    
    if (!formData.terminalId) {
      showToast('error', 'Terminal ID is required', 6000) // Show for 6 seconds
      return
    }

    if (!formData.terminalName) {
      showToast('error', 'Terminal Name is required', 6000)
      return
    }

    // Check for duplicate Terminal ID (only when creating new, not editing)
    if (!terminal) {
      const isDuplicate = existingTerminals.some(t => t.terminalId === formData.terminalId)
      if (isDuplicate) {
        showToast('error', `Terminal ID "${formData.terminalId}" already exists. Please use a different ID or edit the existing terminal.`, 6000)
        return
      }
    }

    setIsSubmitting(true)
    try {
      // ✅ Await the parent's API call
      // If parent handles error and shows toast, isSubmitting will still reset
      // allowing user to try again
      await onSave(formData)
    } catch (error) {
      // Parent error handling shows toast, but also catch here
      // in case we need to handle modal-level errors
      console.error('Terminal save error:', error)
    } finally {
      // ✅ Always reset isSubmitting so button is clickable again
      // even if API call failed
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setIsSubmitting(false)
    onCancel()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ scrollbarGutter: 'stable' }}>
      <div
        className="bg-white rounded-2xl flex flex-col"
        style={{ maxHeight: modalHeight, width: '95%', maxWidth: '900px', scrollbarGutter: 'stable' }}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-start flex-shrink-0 z-20">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {terminal ? 'Edit Terminal' : 'Add New Terminal'}
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              Configure terminal type, document formats, and hardware
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="bg-gray-600 hover:bg-gray-700 text-white w-8 h-8 rounded flex items-center justify-center transition flex-shrink-0"
            title="Close"
            disabled={isSubmitting}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="sticky top-[50px] bg-gray-50 border-b border-gray-200 px-4 py-2 flex gap-1 flex-shrink-0 z-10">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-3 py-1 text-xs font-medium rounded transition ${
              activeTab === 'basic'
                ? 'bg-white text-blue-600 border border-blue-300'
                : 'text-gray-700 hover:bg-white'
            }`}
          >
            Basic Info
          </button>
          <button
            onClick={() => setActiveTab('formats')}
            className={`px-3 py-1 text-xs font-medium rounded transition ${
              activeTab === 'formats'
                ? 'bg-white text-blue-600 border border-blue-300'
                : 'text-gray-700 hover:bg-white'
            }`}
          >
            Document Formats
          </button>
          <button
            onClick={() => setActiveTab('hardware')}
            className={`px-3 py-1 text-xs font-medium rounded transition ${
              activeTab === 'hardware'
                ? 'bg-white text-blue-600 border border-blue-300'
                : 'text-gray-700 hover:bg-white'
            }`}
          >
            Hardware
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          className="flex-1 overflow-y-auto px-4 py-2"
          style={{ scrollbarGutter: 'stable' }}
        >
          <form onSubmit={handleSubmit} className="space-y-2">

            {/* BASIC INFO TAB */}
            {activeTab === 'basic' && (
              <>
                {/* Terminal Information */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-900 mb-2">Terminal Information</h4>
                  {deviceFingerprint && (
                    <div className="mb-2 p-2 bg-blue-50 rounded border border-blue-200">
                      <p className="text-xs text-gray-700">
                        <span className="font-medium">Device:</span> {deviceFingerprint}
                      </p>
                      {deviceTerminals.length > 0 && (
                        <p className="text-xs text-gray-600 mt-1">
                          <span className="font-medium">{deviceTerminals.length} terminal(s) on this device</span>
                        </p>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Terminal ID * {!terminal && formData.terminalType === 'SALES' && '(Auto-generated)'}
                      </label>
                      <div className="flex gap-2 items-start">
                        <input
                          type="text"
                          name="terminalId"
                          value={formData.terminalId}
                          onChange={(e) => {
                            handleInputChange(e)
                            validateTerminalId(e.target.value, formData.terminalType)
                          }}
                          placeholder={formData.terminalType === 'SALES' ? 'e.g., TERM-ABC123DEF456-001' : 'e.g., BACKOFFICE-DEFAULT'}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={!terminal && deviceFingerprint && formData.terminalType === 'SALES'} // Disable if auto-generated for new SALES terminal
                          required
                        />
                        {formData.terminalType === 'SALES' && validatingTerminalId && (
                          <span className="text-xs mt-2">🔄</span>
                        )}
                        {formData.terminalType === 'SALES' && !validatingTerminalId && formData.terminalId && (
                          <span className="text-xs mt-2">✅</span>
                        )}
                      </div>
                      {!terminal && deviceFingerprint && formData.terminalType === 'SALES' && (
                        <p className="text-xs text-gray-600 mt-1">Device-based ID prevents cloning</p>
                      )}
                      {formData.terminalType === 'BACKOFFICE' && (
                        <p className="text-xs text-gray-600 mt-1">BACKOFFICE terminals do not require Terminal ID validation</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Terminal Name *
                      </label>
                      <input
                        type="text"
                        name="terminalName"
                        value={formData.terminalName}
                        onChange={handleInputChange}
                        placeholder="e.g., Counter 1"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Terminal Type *
                      </label>
                      <select
                        name="terminalType"
                        value={formData.terminalType}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="SALES">Sales (Point-of-Sale Terminal)</option>
                        <option value="BACKOFFICE">Backoffice (Administrative Terminal)</option>
                      </select>
                      <p className="text-xs text-gray-600 mt-1">
                        {formData.terminalType === 'SALES' 
                          ? 'Use for customer transactions and receipts'
                          : 'Use for administrative and back office operations'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Invoice Number Prefix */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-900 mb-2">Invoice Settings</h4>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Invoice Number Prefix
                    </label>
                    <input
                      type="text"
                      value={formData.invoiceControls.invoiceNumberPrefix}
                      onChange={(e) => handleNestedChange('invoiceControls', 'invoiceNumberPrefix', e.target.value)}
                      placeholder="e.g., C1"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-600 mt-1">Prefix for invoice numbers at this terminal</p>
                  </div>
                </div>
              </>
            )}

            {/* FORMATS TAB */}
            {activeTab === 'formats' && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-900 mb-2">Document Templates Configuration</h4>
                {loadingTemplates && (
                  <div className="p-2 bg-blue-50 rounded text-center text-xs text-gray-700">
                    Loading available templates...
                  </div>
                )}
                
                {/* Invoice Template */}
                <div className="bg-blue-50 rounded p-2 border border-blue-200">
                  <h4 className="font-semibold text-xs text-gray-900 mb-2">Invoice</h4>
                  <div className="space-y-1 p-2 bg-white rounded border border-blue-100">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Select Template</label>
                    <select
                      value={formData.formatMapping.invoice.templateId || ''}
                      onChange={(e) => handleDeepNestedChange('formatMapping', 'invoice', 'templateId', e.target.value || null)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="">-- Select Invoice Template --</option>
                      {availableTemplates.invoice.map((template) => (
                        <option key={template._id} value={template._id}>
                          {template.templateName} ({template.language || 'EN'})
                        </option>
                      ))}
                    </select>
                    {availableTemplates.invoice.length === 0 && !loadingTemplates && (
                      <p className="text-xs text-red-600 mt-1">No invoice templates available</p>
                    )}
                  </div>
                </div>

                {/* Delivery Note Template */}
                <div className="bg-green-50 rounded p-2 border border-green-200">
                  <h4 className="font-semibold text-xs text-gray-900 mb-2">Delivery Note</h4>
                  <div className="space-y-1 p-2 bg-white rounded border border-green-100">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Select Template</label>
                    <select
                      value={formData.formatMapping.deliveryNote.templateId || ''}
                      onChange={(e) => handleDeepNestedChange('formatMapping', 'deliveryNote', 'templateId', e.target.value || null)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="">-- Select Delivery Note Template --</option>
                      {availableTemplates.deliveryNote.map((template) => (
                        <option key={template._id} value={template._id}>
                          {template.templateName}
                        </option>
                      ))}
                    </select>
                    {availableTemplates.deliveryNote.length === 0 && !loadingTemplates && (
                      <p className="text-xs text-orange-600 mt-1">No delivery note templates available</p>
                    )}
                  </div>
                </div>

                {/* Quotation Template */}
                <div className="bg-purple-50 rounded p-2 border border-purple-200">
                  <h4 className="font-semibold text-xs text-gray-900 mb-2">Quotation</h4>
                  <div className="space-y-1 p-2 bg-white rounded border border-purple-100">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Select Template</label>
                    <select
                      value={formData.formatMapping.quotation.templateId || ''}
                      onChange={(e) => handleDeepNestedChange('formatMapping', 'quotation', 'templateId', e.target.value || null)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="">-- Select Quotation Template --</option>
                      {availableTemplates.quotation.map((template) => (
                        <option key={template._id} value={template._id}>
                          {template.templateName}
                        </option>
                      ))}
                    </select>
                    {availableTemplates.quotation.length === 0 && !loadingTemplates && (
                      <p className="text-xs text-orange-600 mt-1">No quotation templates available</p>
                    )}
                  </div>
                </div>

                {/* Sales Order Template */}
                <div className="bg-yellow-50 rounded p-2 border border-yellow-200">
                  <h4 className="font-semibold text-xs text-gray-900 mb-2">Sales Order</h4>
                  <div className="space-y-1 p-2 bg-white rounded border border-yellow-100">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Select Template</label>
                    <select
                      value={formData.formatMapping.salesOrder.templateId || ''}
                      onChange={(e) => handleDeepNestedChange('formatMapping', 'salesOrder', 'templateId', e.target.value || null)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="">-- Select Sales Order Template --</option>
                      {availableTemplates.salesOrder.map((template) => (
                        <option key={template._id} value={template._id}>
                          {template.templateName}
                        </option>
                      ))}
                    </select>
                    {availableTemplates.salesOrder.length === 0 && !loadingTemplates && (
                      <p className="text-xs text-orange-600 mt-1">No sales order templates available</p>
                    )}
                  </div>
                </div>

                {/* Sales Return Template */}
                <div className="bg-red-50 rounded p-2 border border-red-200">
                  <h4 className="font-semibold text-xs text-gray-900 mb-2">Sales Return</h4>
                  <div className="space-y-1 p-2 bg-white rounded border border-red-100">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Select Template</label>
                    <select
                      value={formData.formatMapping.salesReturn.templateId || ''}
                      onChange={(e) => handleDeepNestedChange('formatMapping', 'salesReturn', 'templateId', e.target.value || null)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="">-- Select Return Template --</option>
                      {availableTemplates.salesReturn.map((template) => (
                        <option key={template._id} value={template._id}>
                          {template.templateName}
                        </option>
                      ))}
                    </select>
                    {availableTemplates.salesReturn.length === 0 && !loadingTemplates && (
                      <p className="text-xs text-orange-600 mt-1">No return templates available</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* HARDWARE TAB */}
            {activeTab === 'hardware' && (
              <div className="space-y-2">
                {/* Invoice Printer Configuration */}
                <div className="bg-blue-50 rounded p-2 border border-blue-200">
                  <div className="flex items-center gap-1 mb-2">
                    <Printer size={14} className="text-blue-600" />
                    <h4 className="font-semibold text-xs text-gray-900">Invoice Printer</h4>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">For printing receipts and invoices</p>
                  
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={formData.hardwareMapping.invoicePrinter.enabled}
                      onChange={(e) => handleDeepNestedChange('hardwareMapping', 'invoicePrinter', 'enabled', e.target.checked)}
                      className="w-3 h-3 rounded"
                    />
                    <span className="text-xs text-gray-700">Enable invoice printer</span>
                  </label>

                  {formData.hardwareMapping.invoicePrinter.enabled && (
                    <div className="ml-4 space-y-2 p-2 bg-white rounded border border-blue-100">
                      {/* Installed Printers Dropdown */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs font-medium text-gray-700">Select Installed Printer</label>
                          <button
                            type="button"
                            onClick={fetchHardwareDevices}
                            disabled={loadingHardware}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            {loadingHardware ? '🔄 Detecting...' : '🔍 Detect'}
                          </button>
                        </div>
                        <select
                          value={formData.hardwareMapping.invoicePrinter.printerName}
                          onChange={(e) => handleDeepNestedChange('hardwareMapping', 'invoicePrinter', 'printerName', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        >
                          <option value="">-- Select from installed printers --</option>
                          {installedPrinters.length > 0 ? (
                            installedPrinters.map((printer, idx) => (
                              <option key={idx} value={typeof printer === 'string' ? printer : printer.name}>
                                {typeof printer === 'string' ? printer : (printer.displayName || printer.name)}
                              </option>
                            ))
                          ) : (
                            <option disabled>No printers detected</option>
                          )}
                        </select>
                        {loadingHardware && <p className="text-xs text-gray-500 mt-1">🔄 Detecting printers...</p>}
                        {!loadingHardware && installedPrinters.length > 0 && (
                          <p className="text-xs text-green-600 mt-1">✅ {installedPrinters.length} printer(s) detected</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Timeout (ms)</label>
                        <input
                          type="number"
                          min="1000"
                          step="1000"
                          value={formData.hardwareMapping.invoicePrinter.timeout}
                          onChange={(e) => handleDeepNestedChange('hardwareMapping', 'invoicePrinter', 'timeout', parseInt(e.target.value))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Barcode/Label Printer Configuration */}
                <div className="bg-purple-50 rounded p-2 border border-purple-200">
                  <div className="flex items-center gap-1 mb-2">
                    <Download size={14} className="text-purple-600" />
                    <h4 className="font-semibold text-xs text-gray-900">Barcode Printer</h4>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">For printing barcode labels and product labels</p>
                  
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={formData.hardwareMapping.barcodePrinter.enabled}
                      onChange={(e) => handleDeepNestedChange('hardwareMapping', 'barcodePrinter', 'enabled', e.target.checked)}
                      className="w-3 h-3 rounded"
                    />
                    <span className="text-xs text-gray-700">Enable barcode printer</span>
                  </label>

                  {formData.hardwareMapping.barcodePrinter.enabled && (
                    <div className="ml-4 space-y-2 p-2 bg-white rounded border border-purple-100">
                      {/* Installed Printers Dropdown */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs font-medium text-gray-700">Select Installed Printer</label>
                          <button
                            type="button"
                            onClick={fetchHardwareDevices}
                            disabled={loadingHardware}
                            className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            {loadingHardware ? '🔄 Detecting...' : '🔍 Detect'}
                          </button>
                        </div>
                        <select
                          value={formData.hardwareMapping.barcodePrinter.printerName}
                          onChange={(e) => handleDeepNestedChange('hardwareMapping', 'barcodePrinter', 'printerName', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        >
                          <option value="">-- Select from installed printers --</option>
                          {installedPrinters.length > 0 ? (
                            installedPrinters.map((printer, idx) => (
                              <option key={idx} value={typeof printer === 'string' ? printer : printer.name}>
                                {typeof printer === 'string' ? printer : (printer.displayName || printer.name)}
                              </option>
                            ))
                          ) : (
                            <option disabled>No printers detected</option>
                          )}
                        </select>
                        {loadingHardware && <p className="text-xs text-gray-500 mt-1">🔄 Detecting printers...</p>}
                        {!loadingHardware && installedPrinters.length > 0 && (
                          <p className="text-xs text-green-600 mt-1">✅ {installedPrinters.length} printer(s) detected</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Timeout (ms)</label>
                        <input
                          type="number"
                          min="1000"
                          step="1000"
                          value={formData.hardwareMapping.barcodePrinter.timeout}
                          onChange={(e) => handleDeepNestedChange('hardwareMapping', 'barcodePrinter', 'timeout', parseInt(e.target.value))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Customer Display Configuration */}
                <div className="bg-green-50 rounded p-2 border border-green-200">
                  <div className="flex items-center gap-1 mb-2">
                    <Monitor size={14} className="text-green-600" />
                    <h4 className="font-semibold text-xs text-gray-900">Customer Display</h4>
                  </div>
                  
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={formData.hardwareMapping.customerDisplay.enabled}
                      onChange={(e) => handleDeepNestedChange('hardwareMapping', 'customerDisplay', 'enabled', e.target.checked)}
                      className="w-3 h-3 rounded"
                    />
                    <span className="text-xs text-gray-700">Enable customer display</span>
                  </label>

                  {formData.hardwareMapping.customerDisplay.enabled && (
                    <div className="ml-4 space-y-2 p-2 bg-white rounded border border-green-100">
                      {/* Display Type Selection */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Display Type *</label>
                        <select
                          value={formData.hardwareMapping.customerDisplay.displayType}
                          onChange={(e) => handleDeepNestedChange('hardwareMapping', 'customerDisplay', 'displayType', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        >
                          <option value="VFD">VFD (Serial Command LCD)</option>
                          <option value="SECONDARY_MONITOR">Secondary Monitor (HDMI/VGA)</option>
                        </select>
                        <p className="text-xs text-gray-600 mt-1">
                          {formData.hardwareMapping.customerDisplay.displayType === 'VFD'
                            ? 'Connect via COM port, data sent as commands'
                            : 'Dedicated secondary monitor showing customer display'}
                        </p>
                      </div>

                      {/* For VFD Display */}
                      {formData.hardwareMapping.customerDisplay.displayType === 'VFD' && (
                        <>
                          {/* COM Port Selection */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-xs font-medium text-gray-700">COM Port *</label>
                              <button
                                type="button"
                                onClick={fetchHardwareDevices}
                                disabled={loadingHardware}
                                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                              >
                                {loadingHardware ? '🔄 Detecting...' : '🔍 Detect'}
                              </button>
                            </div>
                            <select
                              value={formData.hardwareMapping.customerDisplay.comPort}
                              onChange={(e) => handleDeepNestedChange('hardwareMapping', 'customerDisplay', 'comPort', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            >
                              <option value="">-- Select COM port --</option>
                              {availableComPorts.length > 0 ? (
                                availableComPorts.map((port, idx) => (
                                  <option key={idx} value={typeof port === 'string' ? port : port.name || port}>
                                    {typeof port === 'string' ? port : port.name || port}
                                  </option>
                                ))
                              ) : (
                                <option disabled>-- COM ports not detected --</option>
                              )}
                            </select>
                            {loadingHardware && <p className="text-xs text-gray-500 mt-1">🔄 Detecting COM ports...</p>}
                            {!loadingHardware && availableComPorts.length > 0 && (
                              <p className="text-xs text-green-600 mt-1">✅ {availableComPorts.length} COM port(s) detected</p>
                            )}
                          </div>

                          {/* VFD Model Selection */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">VFD Model *</label>
                            <select
                              value={formData.hardwareMapping.customerDisplay.vfdModel}
                              onChange={(e) => handleDeepNestedChange('hardwareMapping', 'customerDisplay', 'vfdModel', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            >
                              {vfdModels.map((model) => (
                                <option key={model.id} value={model.id}>
                                  {model.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Baud Rate */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Baud Rate</label>
                            <select
                              value={formData.hardwareMapping.customerDisplay.baudRate}
                              onChange={(e) => handleDeepNestedChange('hardwareMapping', 'customerDisplay', 'baudRate', parseInt(e.target.value))}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            >
                              <option value="2400">2400</option>
                              <option value="4800">4800</option>
                              <option value="9600">9600</option>
                              <option value="19200">19200</option>
                              <option value="38400">38400</option>
                              <option value="57600">57600</option>
                              <option value="115200">115200</option>
                            </select>
                          </div>

                          <div className="p-2 bg-green-50 rounded border border-green-200 text-xs text-gray-700">
                            📡 Commands will be sent via {formData.hardwareMapping.customerDisplay.comPort} at {formData.hardwareMapping.customerDisplay.baudRate} baud
                          </div>
                        </>
                      )}

                      {/* For Secondary Monitor */}
                      {formData.hardwareMapping.customerDisplay.displayType === 'SECONDARY_MONITOR' && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-xs text-gray-700 mb-2">Secondary monitor will display:</p>
                          <ul className="text-xs text-gray-600 space-y-1 ml-3">
                            <li>✓ Current items being scanned</li>
                            <li>✓ Running total amount</li>
                            <li>✓ Discount information</li>
                            <li>✓ Payment status</li>
                          </ul>
                          <p className="text-xs text-gray-600 mt-2">Preview will be shown in sales terminal during checkout</p>
                        </div>
                      )}

                      {/* Display Content Options */}
                      <div className="border-t border-green-100 pt-2 space-y-2">
                        <p className="text-xs font-semibold text-gray-700">Display Content:</p>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.hardwareMapping.customerDisplay.displayItems}
                            onChange={(e) => handleDeepNestedChange('hardwareMapping', 'customerDisplay', 'displayItems', e.target.checked)}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-xs text-gray-700">Show item details</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.hardwareMapping.customerDisplay.displayPrice}
                            onChange={(e) => handleDeepNestedChange('hardwareMapping', 'customerDisplay', 'displayPrice', e.target.checked)}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-xs text-gray-700">Show price</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.hardwareMapping.customerDisplay.displayTotal}
                            onChange={(e) => handleDeepNestedChange('hardwareMapping', 'customerDisplay', 'displayTotal', e.target.checked)}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-xs text-gray-700">Show running total</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.hardwareMapping.customerDisplay.displayDiscount}
                            onChange={(e) => handleDeepNestedChange('hardwareMapping', 'customerDisplay', 'displayDiscount', e.target.checked)}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-xs text-gray-700">Show discount info</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </form>
        </div>

        {/* Sticky Footer - Action Buttons */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-2 flex gap-2 justify-end flex-shrink-0">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-3 py-1 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            {isSubmitting ? 'Saving...' : 'Save Terminal'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TerminalFormModal
