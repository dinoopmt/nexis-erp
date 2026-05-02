import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Printer, Barcode, Settings, Scale, Building, Cog, Monitor } from 'lucide-react';
import apiClient from '../../../services/apiClient';
import { showToast } from '../../shared/AnimatedCenteredToast';
import TerminalFormModal from './TerminalFormModal';
import TerminalTypeSwitcher from './TerminalTypeSwitcher';
import { useTerminal } from '../../../context/TerminalContext';
import { clearTerminalConfigCache } from '../../../hooks/useTerminalConfig';
import { saveStoreDetailsToCache } from '../../../hooks/useStoreDetails';

const StoreSettings = () => {
  const [storeData, setStoreData] = useState({
    storeName: '',
    storeCode: '',
    address1: '',
    address2: '',
    phone: '',
    email: '',
    taxNumber: '',
    // ✅ NEW: Store logo ONLY (branding per location)
    logoUrl: '',
    // ✅ NEW: Inventory Template Mappings (LPO, GRN, RTV)
    templateMappings: {
      lpo: { templateId: null },
      grn: { templateId: null },
      rtv: { templateId: null }
    },
    salesControls: {
      enableInvoiceNumbering: true,
      invoiceNumberFormat: 'INV-YYMMDD-XXXX',
      enableReceiptPrinting: true,
      enableOnlineSync: true,
      maxOfflineTransactions: 100,
    },
    // Terminal settings removed - now managed via Terminal Management Collection
    storeControlSettings: {
      enableInventoryTracking: true,
      enableStockAlerts: true,
      enableCreditLimit: true,
      enableDiscounts: true,
      enableReturns: true,
      enablePriceOverride: false,
      enableManagerApproval: true,
      // ✅ SECURITY: Sales Return Settings (Invoice mandatory, strict return window only - prevents fraud)
      salesReturnAllowedDays: 30,
    },
    // ✅ NEW: Weight Scale Settings
    weightScaleSettings: {
      scalePrefix: '2',
      enableWeightScale: false,
      defaultWeightUnit: 'KG',
      pricingModel: 'weight',
      barcodeMeasurement: {
        enableWeightEmbedding: false,
        maxWeight: 99.99,
        minWeight: 0.01,
        precipisionDecimalPlaces: 2,
        weightPosition: 'end',
        weightDigits: 5,
      },
      scaleDevice: {
        deviceType: 'manual',
        serialPort: 'COM1',
        baudRate: 9600,
        usbVendorId: '',
        usbProductId: '',
        networkAddress: '',
        networkPort: 5000,
      },
      autoSyncWeight: false,
      enableScaleAlerts: true,
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [activeTerminalIndex, setActiveTerminalIndex] = useState(0);
  const [showTerminalModal, setShowTerminalModal] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState(null);
  const [activeTab, setActiveTab] = useState('store-details');
  const [availableInventoryTemplates, setAvailableInventoryTemplates] = useState({
    lpo: [],
    grn: [],
    rtv: []
  });
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  // ✅ Terminal Management state - separate from store settings
  const [storeId, setStoreId] = useState(null);
  const [terminals, setTerminals] = useState([]);
  const [loadingTerminals, setLoadingTerminals] = useState(false);
  // ✅ Terminal Type Switcher state
  const [currentConfig, setCurrentConfig] = useState(null);
  
  // ✅ Get refetch function from TerminalContext for instant UI updates
  const { refetch: refetchTerminalConfig } = useTerminal();

  useEffect(() => {
    fetchStoreSettings();
    fetchInventoryTemplates();
  }, []);

  // Fetch terminals whenever storeId changes - with debounce to prevent rate limiting
  // ✅ IMPORTANT: Wait for auth token to be available before fetching terminals
  useEffect(() => {
    if (storeId) {
      // Check if auth token is available
      const authToken = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      if (!authToken) {
        console.warn('⚠️ Auth token not available yet, skipping terminal fetch');
        return;
      }

      const timer = setTimeout(() => {
        fetchTerminals(storeId);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [storeId]);

  const fetchStoreSettings = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get(`/settings/store`);
      if (response.ok && response.data.data) {
        console.log('📥 Fetched store settings:', { templateMappings: response.data.data.templateMappings });
        
        // Merge API response with default state to ensure all fields are defined
        setStoreData(prev => {
          const merged = {
            ...prev,
            ...response.data.data,
            // Ensure nested objects are properly merged
            salesControls: {
              ...prev.salesControls,
              ...(response.data.data.salesControls || {})
            },
            storeControlSettings: {
              ...prev.storeControlSettings,
              ...(response.data.data.storeControlSettings || {})
            },
            templateMappings: {
              lpo: { templateId: response.data.data.templateMappings?.lpo?.templateId || null },
              grn: { templateId: response.data.data.templateMappings?.grn?.templateId || null },
              rtv: { templateId: response.data.data.templateMappings?.rtv?.templateId || null }
            },
            weightScaleSettings: {
              ...prev.weightScaleSettings,
              ...(response.data.data.weightScaleSettings || {}),
              barcodeMeasurement: {
                ...prev.weightScaleSettings.barcodeMeasurement,
                ...(response.data.data.weightScaleSettings?.barcodeMeasurement || {})
              },
              scaleDevice: {
                ...prev.weightScaleSettings.scaleDevice,
                ...(response.data.data.weightScaleSettings?.scaleDevice || {})
              }
            }
          };
          console.log('📤 Updated state:', { templateMappings: merged.templateMappings });
          return merged;
        });
        
        // ✅ Cache store details for print templates (performance optimization)
        saveStoreDetailsToCache(response.data.data);
        
        // Extract storeId for terminal management API
        if (response.data.data._id) {
          setStoreId(response.data.data._id);
        } else if (response.data.data.storeId) {
          setStoreId(response.data.data.storeId);
        }
      }
    } catch (err) {
      // Initialize with default if not found
      console.error('Failed to fetch store settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Fetch terminals from Terminal Management Collection API
  const fetchTerminals = async (currentStoreId) => {
    if (!currentStoreId) return;
    try {
      setLoadingTerminals(true);
      const response = await apiClient.get(`/terminals/store/${currentStoreId}`);
      if (response.ok && response.data.data) {
        setTerminals(Array.isArray(response.data.data) ? response.data.data : [response.data.data]);
      } else {
        setTerminals([]);
      }
    } catch (err) {
      console.error('Failed to fetch terminals:', err);
      setTerminals([]);
    } finally {
      setLoadingTerminals(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStoreData(prev => ({ ...prev, [name]: value }));
  };

  // ✅ NEW: Handle logo upload
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      showToast('error', 'Only PNG, JPG, JPEG files are allowed');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'File size must be less than 2MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      setStoreData(prev => ({
        ...prev,
        logoUrl: event.target.result
      }));
      showToast('success', 'Logo uploaded successfully');
    };
    reader.readAsDataURL(file);
  };

  const handleSalesControlChange = (field, value) => {
    setStoreData(prev => ({
      ...prev,
      salesControls: { ...prev.salesControls, [field]: value }
    }));
  };

  const handleStoreControlChange = (field, value) => {
    setStoreData(prev => ({
      ...prev,
      storeControlSettings: { ...prev.storeControlSettings, [field]: value }
    }));
  };

  // ✅ NEW: Handle weight scale settings changes
  const handleWeightScaleChange = (field, value) => {
    setStoreData(prev => ({
      ...prev,
      weightScaleSettings: { ...prev.weightScaleSettings, [field]: value }
    }));
  };

  // Handle changes to barcode measurement nested settings
  const handleBarcodeMeasurementChange = (field, value) => {
    setStoreData(prev => ({
      ...prev,
      weightScaleSettings: {
        ...prev.weightScaleSettings,
        barcodeMeasurement: { ...prev.weightScaleSettings.barcodeMeasurement, [field]: value }
      }
    }));
  };

  // Handle changes to scale device nested settings
  const handleScaleDeviceChange = (field, value) => {
    setStoreData(prev => ({
      ...prev,
      weightScaleSettings: {
        ...prev.weightScaleSettings,
        scaleDevice: { ...prev.weightScaleSettings.scaleDevice, [field]: value }
      }
    }));
  };

  // ✅ NEW: Fetch inventory templates from API
  const fetchInventoryTemplates = async () => {
    try {
      setLoadingTemplates(true);
      console.log('🔄 Fetching inventory templates...');
      
      const response = await apiClient.get(`/inventory-templates`);
      console.log('📡 Raw API response:', response);
      
      // Handle different response formats
      let templates = [];
      if (response.ok) {
        if (Array.isArray(response.data)) {
          templates = response.data;
        } else if (Array.isArray(response.data.data)) {
          templates = response.data.data;
        } else if (response.data.data && typeof response.data.data === 'object') {
          // Single template response
          templates = [response.data.data];
        }
      }
      
      console.log('📦 Parsed templates:', templates, `Total: ${templates.length}`);
      
      if (!templates || templates.length === 0) {
        console.warn('⚠️  No templates found in response');
        setAvailableInventoryTemplates({ lpo: [], grn: [], rtv: [] });
        setLoadingTemplates(false);
        return;
      }
      
      const organized = {
        lpo: templates.filter(t => t.documentType === 'LPO'),
        grn: templates.filter(t => t.documentType === 'GRN'),
        rtv: templates.filter(t => t.documentType === 'RTV')
      };
      
      console.log('✅ Organized templates:', organized);
      console.log(`   LPO: ${organized.lpo.length}, GRN: ${organized.grn.length}, RTV: ${organized.rtv.length}`);
      
      setAvailableInventoryTemplates(organized);
    } catch (err) {
      console.error('❌ Failed to fetch inventory templates:', err);
      console.error('   Error details:', err.response?.data || err.message);
      setAvailableInventoryTemplates({ lpo: [], grn: [], rtv: [] });
    } finally {
      setLoadingTemplates(false);
    }
  };

  // ✅ NEW: Handle template mapping changes
  const handleTemplateMappingChange = (docType, templateId) => {
    console.log(`📋 Mapping change: ${docType} = ${templateId}`);
    setStoreData(prev => ({
      ...prev,
      templateMappings: {
        ...prev.templateMappings,
        [docType]: { 
          templateId: templateId && templateId.trim() ? templateId : null
        }
      }
    }));
  };

  // ✅ Handle terminal config loaded from TerminalTypeSwitcher
  const handleConfigLoaded = (config) => {
    setCurrentConfig(config);
  };

  const addTerminal = () => {
    setEditingTerminal(null);
    setShowTerminalModal(true);
  };

  const handleSaveTerminal = async (terminalData) => {
    try {
      setIsLoading(true);
      
      if (editingTerminal !== null) {
        // Update existing terminal via Terminal Management API
        // Use terminalId (not MongoDB _id) as the route parameter
        const terminalId = terminals[editingTerminal].terminalId;
        await apiClient.put(`/terminals/${terminalId}`, terminalData);
        showToast('success', 'Terminal updated successfully');
        
        // ✅ CRITICAL: Clear cache for this terminal BEFORE refetching
        // Ensures next fetch gets fresh data from API, not stale cache
        clearTerminalConfigCache(terminalId);
        console.log('🔄 Cleared cache for terminal:', terminalId);
      } else {
        // Create new terminal via Terminal Management API
        // Add storeId to terminal data before creating
        const terminalWithStoreId = { ...terminalData, storeId };
        
        // Debug logging
        console.log("📤 Sending terminal data to backend:");
        console.log(JSON.stringify(terminalWithStoreId, null, 2));
        
        await apiClient.post(`/terminals/create`, terminalWithStoreId);
        showToast('success', 'Terminal added successfully');
      }
      
      // Refresh terminals list
      if (storeId) {
        await fetchTerminals(storeId);
      }
      
      // ✅ INSTANT UPDATE: Refetch terminal config from context for all components
      // Cache is already cleared above, so this will fetch fresh data from API
      // ⚠️ CRITICAL: Use forceRefresh=true to bypass cache and get fresh data from server
      console.log('🔄 Refetching terminal config for instant UI update...');
      setTimeout(() => {
        refetchTerminalConfig(true); // Force refresh to get latest template IDs from server
      }, 300);
      
      setShowTerminalModal(false);
    } catch (err) {
      console.error("❌ Terminal save error:");
      console.error("Status:", err.response?.status);
      console.error("Message:", err.response?.data?.message);
      console.error("Full error:", err.response?.data);
      
      // Get detailed error message
      let errorMessage = 'Failed to save terminal';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message === 'Network Error') {
        errorMessage = 'Network error - please check your connection';
      }
      
      console.error("Showing error to user:", errorMessage);
      showToast('error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditTerminal = (index) => {
    setEditingTerminal(index);
    setShowTerminalModal(true);
  };

  const removeTerminal = async (index) => {
    if (terminals.length <= 1) {
      showToast('error', 'At least one terminal configuration is required');
      return;
    }

    try {
      setIsLoading(true);
      const terminalId = terminals[index].terminalId;
      
      // Delete from Terminal Management API using terminalId (not MongoDB _id)
      await apiClient.delete(`/terminals/${terminalId}`);
      showToast('success', 'Terminal deleted successfully');
      
      // ✅ Clear cache for deleted terminal
      clearTerminalConfigCache(terminalId);
      console.log('🔄 Cleared cache for deleted terminal:', terminalId);
      
      // Refresh terminals list
      if (storeId) {
        await fetchTerminals(storeId);
      }
      setActiveTerminalIndex(0);
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to delete terminal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!storeData.storeName) {
      showToast('error', 'Store name is required');
      return;
    }

    try {
      setIsLoading(true);
      console.log('💾 Saving store settings...');
      console.log('   Sending payload:');
      console.log('   - LPO Template ID:', storeData.templateMappings?.lpo?.templateId);
      console.log('   - GRN Template ID:', storeData.templateMappings?.grn?.templateId);
      console.log('   - RTV Template ID:', storeData.templateMappings?.rtv?.templateId);
      console.log('   - Full templateMappings:', JSON.stringify(storeData.templateMappings, null, 2));
      
      const response = await apiClient.post(`/settings/store`, storeData);
      
      if (response.ok && response.data.data) {
        console.log('✅ Server response received');
        console.log('   Response templateMappings:', JSON.stringify(response.data.data.templateMappings, null, 2));
        console.log('   - LPO from server:', response.data.data.templateMappings?.lpo?.templateId);
        console.log('   - GRN from server:', response.data.data.templateMappings?.grn?.templateId);
        console.log('   - RTV from server:', response.data.data.templateMappings?.rtv?.templateId);
        
        // ✅ Update state with server response (ensures data persisted correctly)
        setStoreData(prev => {
          const updated = {
            ...prev,
            ...response.data.data,
            // Merge nested objects
            salesControls: {
              ...prev.salesControls,
              ...(response.data.data.salesControls || {})
            },
            storeControlSettings: {
              ...prev.storeControlSettings,
              ...(response.data.data.storeControlSettings || {})
            },
            templateMappings: {
              lpo: { templateId: response.data.data.templateMappings?.lpo?.templateId || null },
              grn: { templateId: response.data.data.templateMappings?.grn?.templateId || null },
              rtv: { templateId: response.data.data.templateMappings?.rtv?.templateId || null }
            }
          };
          console.log('📤 Updated state templateMappings:', JSON.stringify(updated.templateMappings, null, 2));
          return updated;
        });
        
        // ✅ Cache store details after successful update
        saveStoreDetailsToCache(response.data.data);
        
        showToast('success', 'Store settings saved successfully');
      }
    } catch (err) {
      console.error('❌ Save error:', err);
      showToast('error', err.response?.data?.message || 'Failed to save store settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Store Settings</h2>
        <p className="text-sm text-gray-600">Configure store information, inventory controls, and operational settings</p>
      </div>

      {/* Grouped Tab Navigation */}
      <div className="flex gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200 overflow-x-auto">
        <button onClick={() => setActiveTab('store-details')} className={`flex items-center gap-2 px-4 py-2 rounded-md whitespace-nowrap font-medium text-sm transition ${activeTab === 'store-details' ? 'bg-white text-blue-600 border border-gray-300 shadow-sm' : 'text-gray-700'}`}>
          <Building size={16} />
          Store Details
        </button>
        <button onClick={() => setActiveTab('store-settings')} className={`flex items-center gap-2 px-4 py-2 rounded-md whitespace-nowrap font-medium text-sm transition ${activeTab === 'store-settings' ? 'bg-white text-blue-600 border border-gray-300 shadow-sm' : 'text-gray-700'}`}>
          <Cog size={16} />
          Store Settings
        </button>
        <button onClick={() => setActiveTab('template-mappings')} className={`flex items-center gap-2 px-4 py-2 rounded-md whitespace-nowrap font-medium text-sm transition ${activeTab === 'template-mappings' ? 'bg-white text-blue-600 border border-gray-300 shadow-sm' : 'text-gray-700'}`}>
          <Printer size={16} />
          Template Mappings
        </button>
        <button onClick={() => setActiveTab('terminal-settings')} className={`flex items-center gap-2 px-4 py-2 rounded-md whitespace-nowrap font-medium text-sm transition ${activeTab === 'terminal-settings' ? 'bg-white text-blue-600 border border-gray-300 shadow-sm' : 'text-gray-700'}`}>
          <Monitor size={16} />
          Terminal Settings
        </button>
      </div>

      {/* Tab 1: Store Details */}
      {activeTab === 'store-details' && (
      <>

      {/* Store Basic Information */}
      <div className="bg-white p-3 rounded-lg shadow">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Store Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Store Name</label>
            <input
              type="text"
              name="storeName"
              value={storeData.storeName}
              onChange={handleInputChange}
              placeholder="Enter store name"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Store Code</label>
            <input
              type="text"
              name="storeCode"
              value={storeData.storeCode}
              onChange={handleInputChange}
              placeholder="Enter store code"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Address Line 1</label>
            <input
              type="text"
              name="address1"
              value={storeData.address1}
              onChange={handleInputChange}
              placeholder="Street address"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Address Line 2</label>
            <input
              type="text"
              name="address2"
              value={storeData.address2}
              onChange={handleInputChange}
              placeholder="City, state, postal code (for invoice header)"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              name="phone"
              value={storeData.phone}
              onChange={handleInputChange}
              placeholder="+1 (555) 000-0000"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={storeData.email}
              onChange={handleInputChange}
              placeholder="store@example.com"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tax Number</label>
            <input
              type="text"
              name="taxNumber"
              value={storeData.taxNumber}
              onChange={handleInputChange}
              placeholder="Enter tax number"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* ✅ NEW: Store Branding - Logo Only */}
      <div className="bg-white p-3 rounded-lg shadow mt-3">
        <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Printer className="w-4 h-4" />
          Store Logo (for invoices)
        </h3>
        <div className="max-w-sm">
          <label className="block text-xs font-semibold text-gray-700 mb-2">Upload Store Logo</label>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleLogoUpload(e)}
              className="text-xs"
            />
            {storeData.logoUrl && (
              <div className="flex items-center gap-2">
                <img src={storeData.logoUrl} alt="Store Logo" className="h-12 w-12 rounded border p-1" />
                <span className="text-xs text-gray-600">Logo preview</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Upload PNG/JPG/JPEG (max 2MB). Each store can have its own logo on invoices.
          </p>
        </div>
      </div>
      </>
      )}

      {/* Tab 2: Store Settings */}
      {activeTab === 'store-settings' && (
      <>

      {/* Barcode and Printer Settings - Now at Terminal Level */}
      {/* Note: These settings (barcodePrefix, barcodeFormat, printerModel, printerPort, labelWidth, labelHeight)
          are now managed per-terminal in the Terminal Management settings tab */}

      {/* Sales Controls */}
      <div className="bg-white p-3 rounded-lg shadow">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Sales Controls</h3>
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Invoice Number Format</label>
            <input
              type="text"
              value={storeData.salesControls.invoiceNumberFormat}
              onChange={(e) => handleSalesControlChange('invoiceNumberFormat', e.target.value)}
              placeholder="e.g., INV-YYMMDD-XXXX"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-600 mt-0.5">Use: YY=Year, MM=Month, DD=Day, XXXX=Sequence</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={storeData.salesControls.enableInvoiceNumbering}
                  onChange={(e) => handleSalesControlChange('enableInvoiceNumbering', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                Enable Invoice Numbering
              </label>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={storeData.salesControls.enableReceiptPrinting}
                  onChange={(e) => handleSalesControlChange('enableReceiptPrinting', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                Enable Receipt Printing
              </label>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={storeData.salesControls.enableOnlineSync}
                  onChange={(e) => handleSalesControlChange('enableOnlineSync', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                Enable Online Sync
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Max Offline Transactions</label>
              <input
                type="number"
                value={storeData.salesControls.maxOfflineTransactions}
                onChange={(e) => handleSalesControlChange('maxOfflineTransactions', parseInt(e.target.value))}
                min="1"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Tab 3: Terminal Settings */}
      {activeTab === 'terminal-settings' && (
      <>

      {/* Terminal-Wise Settings */}
      <div className="bg-white p-3 rounded-lg shadow">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Terminal-Wise Configuration</h3>
          <button
            onClick={addTerminal}
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-xs"
          >
            <Plus size={14} />
            Add Terminal
          </button>
        </div>

        {/* Terminal List Table */}
        <div className="mb-3 overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Terminal ID</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Name</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Type</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Enabled Formats</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Hardware</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {terminals.map((terminal, index) => {
                const enabledFormats = [];
                if (terminal.formatMapping?.invoice?.enabled) enabledFormats.push('Invoice');
                if (terminal.formatMapping?.deliveryNote?.enabled) enabledFormats.push('DN');
                if (terminal.formatMapping?.quotation?.enabled) enabledFormats.push('Quo');
                if (terminal.formatMapping?.salesOrder?.enabled) enabledFormats.push('SO');
                if (terminal.formatMapping?.salesReturn?.enabled) enabledFormats.push('Return');

                const hardware = [];
                if (terminal.hardwareMapping?.printer?.enabled) hardware.push('🖨️');
                if (terminal.hardwareMapping?.customerDisplay?.enabled) hardware.push('🖥️');

                return (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-900 font-medium">{terminal.terminalId || '-'}</td>
                    <td className="px-3 py-2 text-gray-900">{terminal.terminalName || '-'}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        terminal.terminalType === 'SALES'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {terminal.terminalType === 'SALES' ? 'POS' : 'BO'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 flex-wrap">
                        {enabledFormats.length > 0 ? (
                          enabledFormats.map((format) => (
                            <span key={format} className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                              {format}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-lg">{hardware.length > 0 ? hardware.join(' ') : '-'}</div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => handleEditTerminal(index)}
                          className="p-1 hover:bg-blue-50 rounded transition"
                          title="Edit"
                        >
                          <Edit2 size={14} className="text-blue-600" />
                        </button>
                        {terminals.length > 1 && (
                          <button
                          onClick={() => removeTerminal(index)}
                          className="p-1 hover:bg-red-50 rounded transition"
                          title="Delete"
                        >
                          <Trash2 size={14} className="text-red-600" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ Terminal Type Switcher - Load/Switch between configurations */}
      <TerminalTypeSwitcher 
        storeId={storeId}
        onConfigLoaded={handleConfigLoaded}
        currentConfig={currentConfig}
      />
      </>
      )}

      {/* Template Mappings Tab */}
      {activeTab === 'template-mappings' && (
      <>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-2 mb-3">
            <Printer size={16} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Inventory Document Template Mappings</h3>
          </div>
          <p className="text-xs text-gray-600 mb-4">Select default templates for printing LPO, GRN, and RTV documents at this store</p>

          {loadingTemplates ? (
            <div className="text-center py-8 text-gray-600">
              <div className="inline-block">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mb-2"></div>
                Loading templates...
              </div>
            </div>
          ) : availableInventoryTemplates.lpo.length === 0 && availableInventoryTemplates.grn.length === 0 && availableInventoryTemplates.rtv.length === 0 ? (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-red-700 text-sm">
              <p className="font-semibold mb-2">⚠️ No Templates Available</p>
              <p>No inventory templates found in the system.</p>
              <p className="text-xs mt-2">Go to Settings → Template Configuration → Inventory Templates to create templates first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* LPO Template */}
              <div className="border border-blue-200 bg-blue-50 p-3 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-900 mb-2">Local Purchase Order (LPO)</h4>
                <select
                  value={storeData.templateMappings?.lpo?.templateId ? String(storeData.templateMappings.lpo.templateId) : ''}
                  onChange={(e) => {
                    console.log(`🔵 LPO selected: ${e.target.value}`);
                    handleTemplateMappingChange('lpo', e.target.value);
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select LPO Template --</option>
                  {availableInventoryTemplates.lpo && availableInventoryTemplates.lpo.map(template => (
                    <option key={template._id} value={String(template._id)}>
                      {template.templateName} ({template.language || 'EN'})
                    </option>
                  ))}
                </select>
                {availableInventoryTemplates.lpo && availableInventoryTemplates.lpo.length === 0 && (
                  <p className="text-xs text-red-600 mt-2">No LPO templates available</p>
                )}
                {storeData.templateMappings?.lpo?.templateId && (
                  <p className="text-xs text-green-600 mt-2">✓ Template selected</p>
                )}
              </div>

              {/* GRN Template */}
              <div className="border border-green-200 bg-green-50 p-3 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-900 mb-2">Goods Receipt Note (GRN)</h4>
                <select
                  value={storeData.templateMappings?.grn?.templateId ? String(storeData.templateMappings.grn.templateId) : ''}
                  onChange={(e) => {
                    console.log(`🟢 GRN selected: ${e.target.value}`);
                    handleTemplateMappingChange('grn', e.target.value);
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">-- Select GRN Template --</option>
                  {availableInventoryTemplates.grn && availableInventoryTemplates.grn.map(template => (
                    <option key={template._id} value={String(template._id)}>
                      {template.templateName} ({template.language || 'EN'})
                    </option>
                  ))}
                </select>
                {availableInventoryTemplates.grn && availableInventoryTemplates.grn.length === 0 && (
                  <p className="text-xs text-red-600 mt-2">No GRN templates available</p>
                )}
                {storeData.templateMappings?.grn?.templateId && (
                  <p className="text-xs text-green-600 mt-2">✓ Template selected</p>
                )}
              </div>

              {/* RTV Template */}
              <div className="border border-orange-200 bg-orange-50 p-3 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-900 mb-2">Return to Vendor (RTV)</h4>
                <select
                  value={storeData.templateMappings?.rtv?.templateId ? String(storeData.templateMappings.rtv.templateId) : ''}
                  onChange={(e) => {
                    console.log(`🔴 RTV selected: ${e.target.value}`);
                    handleTemplateMappingChange('rtv', e.target.value);
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">-- Select RTV Template --</option>
                  {availableInventoryTemplates.rtv && availableInventoryTemplates.rtv.map(template => (
                    <option key={template._id} value={String(template._id)}>
                      {template.templateName} ({template.language || 'EN'})
                    </option>
                  ))}
                </select>
                {availableInventoryTemplates.rtv && availableInventoryTemplates.rtv.length === 0 && (
                  <p className="text-xs text-red-600 mt-2">No RTV templates available</p>
                )}
                {storeData.templateMappings?.rtv?.templateId && (
                  <p className="text-xs text-green-600 mt-2">✓ Template selected</p>
                )}
              </div>
            </div>
          )}
        </div>
      </>
      )}

      {/* Store Control Settings & Weight Scale - Part of Store Settings */}
      {activeTab === 'store-settings' && (
      <>

      {/* Store Control Settings */}
      <div className="bg-white p-3 rounded-lg shadow">
        <div className="flex items-center gap-2 mb-2">
          <Settings size={16} className="text-purple-600" />
          <h3 className="text-sm font-semibold text-gray-900">Store Control Settings</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={storeData.storeControlSettings.enableInventoryTracking}
                onChange={(e) => handleStoreControlChange('enableInventoryTracking', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              Enable Inventory Tracking
            </label>
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={storeData.storeControlSettings.enableStockAlerts}
                onChange={(e) => handleStoreControlChange('enableStockAlerts', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              Enable Stock Alerts
            </label>
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={storeData.storeControlSettings.enableCreditLimit}
                onChange={(e) => handleStoreControlChange('enableCreditLimit', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              Enable Credit Limit
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={storeData.storeControlSettings.enableDiscounts}
                onChange={(e) => handleStoreControlChange('enableDiscounts', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              Enable Discounts
            </label>
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={storeData.storeControlSettings.enableReturns}
                onChange={(e) => handleStoreControlChange('enableReturns', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              Enable Returns
            </label>
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={storeData.storeControlSettings.enablePriceOverride}
                onChange={(e) => handleStoreControlChange('enablePriceOverride', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              Enable Price Override
            </label>
          </div>
        </div>

        {/* ✅ SECURITY: Sales Return Settings */}
        {storeData.storeControlSettings.enableReturns && (
          <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200 space-y-2">
            <h4 className="text-xs font-semibold text-gray-900 mb-2">Sales Return Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Allow Sales Return Days <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={storeData.storeControlSettings.salesReturnAllowedDays}
                  onChange={(e) => handleStoreControlChange('salesReturnAllowedDays', parseInt(e.target.value) || 30)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-600 mt-0.5">Days from invoice date when sales returns are allowed (1-365). Returns outside this window are NOT permitted.</p>
              </div>
              <div className="bg-red-50 p-2 rounded border border-red-200">
                <p className="text-xs font-semibold text-red-900 mb-1">🔒 Strict Fraud Prevention</p>
                <p className="text-xs text-red-800">✅ Invoice mandatory<br/>✅ Strict return window<br/>✅ No returns after allowed days</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
          <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={storeData.storeControlSettings.enableManagerApproval}
              onChange={(e) => handleStoreControlChange('enableManagerApproval', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            Require Manager Approval for Price Override & High Value Discounts
          </label>
        </div>
      </div>

      {/* ✅ NEW: Weight Scale Configuration */}
      <div className="bg-white p-3 rounded-lg shadow">
        <div className="flex items-center gap-2 mb-2">
          <Scale size={16} className="text-orange-600" />
          <h3 className="text-sm font-semibold text-gray-900">Weight Scale Settings</h3>
        </div>

        {/* Enable Weight Scale Master Switch */}
        <div className="mb-3 p-2 bg-orange-50 rounded-lg border border-orange-200">
          <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={storeData.weightScaleSettings.enableWeightScale}
              onChange={(e) => handleWeightScaleChange('enableWeightScale', e.target.checked)}
              className="w-4 h-4 text-orange-600 rounded"
            />
            Enable Weight Scale Items in POS
          </label>
          <p className="text-xs text-gray-600 mt-1">Enable to support selling items by weight (vegetables, meat, grains, etc.)</p>
        </div>

        {storeData.weightScaleSettings.enableWeightScale && (
          <div className="space-y-3">
            {/* Basic Settings */}
            <div className="border-t border-gray-200 pt-3">
              <h4 className="text-xs font-semibold text-gray-800 mb-2">Basic Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Scale Item Barcode Prefix</label>
                  <select
                    value={storeData.weightScaleSettings.scalePrefix}
                    onChange={(e) => handleWeightScaleChange('scalePrefix', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="2">2 - Standard scale item</option>
                    <option value="20">20 - Produce</option>
                    <option value="21">21 - Meat</option>
                    <option value="22">22 - Dairy</option>
                  </select>
                  <p className="text-xs text-gray-600 mt-0.5">EAN prefix for scale items</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Default Weight Unit</label>
                  <select
                    value={storeData.weightScaleSettings.defaultWeightUnit}
                    onChange={(e) => handleWeightScaleChange('defaultWeightUnit', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="KG">Kilogram (KG)</option>
                    <option value="LB">Pound (LB)</option>
                    <option value="G">Gram (G)</option>
                    <option value="MG">Milligram (MG)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Pricing Model</label>
                  <select
                    value={storeData.weightScaleSettings.pricingModel}
                    onChange={(e) => handleWeightScaleChange('pricingModel', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="weight">Price per Unit Weight (₹/KG)</option>
                    <option value="total">Fixed Total Price by Weight</option>
                  </select>
                  <p className="text-xs text-gray-600 mt-0.5">How items are priced</p>
                </div>
              </div>
            </div>

            {/* Barcode Measurement Settings */}
            <div className="border-t border-gray-200 pt-3">
              <h4 className="text-xs font-semibold text-gray-800 mb-2">Barcode Measurement Settings</h4>
              
              <div className="mb-2">
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={storeData.weightScaleSettings.barcodeMeasurement.enableWeightEmbedding}
                    onChange={(e) => handleBarcodeMeasurementChange('enableWeightEmbedding', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  Embed Weight in Barcode
                </label>
                <p className="text-xs text-gray-600 ml-6 mt-0.5">Include weight data within EAN barcode</p>
              </div>

              {storeData.weightScaleSettings.barcodeMeasurement.enableWeightEmbedding && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 ml-6 p-2 bg-blue-50 rounded-lg">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Max Weight</label>
                    <input
                      type="number"
                      value={storeData.weightScaleSettings.barcodeMeasurement.maxWeight}
                      onChange={(e) => handleBarcodeMeasurementChange('maxWeight', parseFloat(e.target.value))}
                      step="0.01"
                      min="0.01"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Min Weight</label>
                    <input
                      type="number"
                      value={storeData.weightScaleSettings.barcodeMeasurement.minWeight}
                      onChange={(e) => handleBarcodeMeasurementChange('minWeight', parseFloat(e.target.value))}
                      step="0.01"
                      min="0.001"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Decimal Places</label>
                    <select
                      value={storeData.weightScaleSettings.barcodeMeasurement.precipisionDecimalPlaces}
                      onChange={(e) => handleBarcodeMeasurementChange('precipisionDecimalPlaces', parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="1">1 (0.1)</option>
                      <option value="2">2 (0.01)</option>
                      <option value="3">3 (0.001)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Weight Position</label>
                    <select
                      value={storeData.weightScaleSettings.barcodeMeasurement.weightPosition}
                      onChange={(e) => handleBarcodeMeasurementChange('weightPosition', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="start">Start</option>
                      <option value="middle">Middle</option>
                      <option value="end">End</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Weight Digits</label>
                    <input
                      type="number"
                      value={storeData.weightScaleSettings.barcodeMeasurement.weightDigits}
                      onChange={(e) => handleBarcodeMeasurementChange('weightDigits', parseInt(e.target.value))}
                      min="3"
                      max="8"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Scale Device Configuration */}
            <div className="border-t border-gray-200 pt-3">
              <h4 className="text-xs font-semibold text-gray-800 mb-2">Scale Device Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Device Type</label>
                  <select
                    value={storeData.weightScaleSettings.scaleDevice.deviceType}
                    onChange={(e) => handleScaleDeviceChange('deviceType', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="manual">Manual Entry</option>
                    <option value="serial">Serial Port (COM)</option>
                    <option value="usb">USB Device</option>
                    <option value="network">Network Scale</option>
                  </select>
                  <p className="text-xs text-gray-600 mt-0.5">How weight input is received</p>
                </div>

                {storeData.weightScaleSettings.scaleDevice.deviceType === 'serial' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Serial Port</label>
                      <input
                        type="text"
                        value={storeData.weightScaleSettings.scaleDevice.serialPort}
                        onChange={(e) => handleScaleDeviceChange('serialPort', e.target.value)}
                        placeholder="COM1, COM2, etc."
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Baud Rate</label>
                      <select
                        value={storeData.weightScaleSettings.scaleDevice.baudRate}
                        onChange={(e) => handleScaleDeviceChange('baudRate', parseInt(e.target.value))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  </>
                )}

                {storeData.weightScaleSettings.scaleDevice.deviceType === 'usb' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">USB Vendor ID</label>
                      <input
                        type="text"
                        value={storeData.weightScaleSettings.scaleDevice.usbVendorId}
                        onChange={(e) => handleScaleDeviceChange('usbVendorId', e.target.value)}
                        placeholder="e.g., 0x1234"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">USB Product ID</label>
                      <input
                        type="text"
                        value={storeData.weightScaleSettings.scaleDevice.usbProductId}
                        onChange={(e) => handleScaleDeviceChange('usbProductId', e.target.value)}
                        placeholder="e.g., 0x5678"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}

                {storeData.weightScaleSettings.scaleDevice.deviceType === 'network' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Network Address (IP/URL)</label>
                      <input
                        type="text"
                        value={storeData.weightScaleSettings.scaleDevice.networkAddress}
                        onChange={(e) => handleScaleDeviceChange('networkAddress', e.target.value)}
                        placeholder="192.168.1.100 or scale.local"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Network Port</label>
                      <input
                        type="number"
                        value={storeData.weightScaleSettings.scaleDevice.networkPort}
                        onChange={(e) => handleScaleDeviceChange('networkPort', parseInt(e.target.value))}
                        min="1"
                        max="65535"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Auto-sync and Alerts */}
            <div className="border-t border-gray-200 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={storeData.weightScaleSettings.autoSyncWeight}
                    onChange={(e) => handleWeightScaleChange('autoSyncWeight', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  Auto-Sync Weight from Scale to POS
                </label>

                <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={storeData.weightScaleSettings.enableScaleAlerts}
                    onChange={(e) => handleWeightScaleChange('enableScaleAlerts', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  Enable Scale Device Alerts
                </label>
              </div>
              <p className="text-xs text-gray-600 mt-2">Alert on weight scale disconnection or device errors</p>
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {/* Save Button - Outside all tabs */}
      <div className="flex justify-end gap-2">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save Store Settings'}
        </button>
      </div>

      {/* Terminal Form Modal */}
      {showTerminalModal && (
        <TerminalFormModal
          terminal={editingTerminal !== null ? terminals[editingTerminal] : null}
          existingTerminals={terminals}
          onSave={handleSaveTerminal}
          onCancel={() => setShowTerminalModal(false)}
        />
      )}
    </div>
  );
};

export default StoreSettings;


