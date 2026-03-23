import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Printer, Barcode, Settings, Scale } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../../config/config';

const StoreSettings = () => {
  const [storeData, setStoreData] = useState({
    storeName: '',
    storeCode: '',
    address: '',
    phone: '',
    email: '',
    taxNumber: '',
    barcodePrefix: '',
    barcodeFormat: 'EAN13',
    printerModel: '',
    printerPort: 'COM1',
    labelWidth: '4',
    labelHeight: '6',
    salesControls: {
      enableInvoiceNumbering: true,
      invoiceNumberFormat: 'INV-YYMMDD-XXXX',
      enableReceiptPrinting: true,
      enableOnlineSync: true,
      maxOfflineTransactions: 100,
    },
    terminalSettings: [
      {
        terminalId: '',
        terminalName: '',
        invoiceNumberPrefix: '',
        invoiceFormat: 'STANDARD',
        enableCreditSale: true,
        enableReturns: true,
        enablePromotions: true,
      },
    ],
    storeControlSettings: {
      enableInventoryTracking: true,
      enableStockAlerts: true,
      enableCreditLimit: true,
      enableDiscounts: true,
      enableReturns: true,
      enablePriceOverride: false,
      enableManagerApproval: true,
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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTerminalIndex, setActiveTerminalIndex] = useState(0);
  const [addingTerminal, setAddingTerminal] = useState(false);

  useEffect(() => {
    fetchStoreSettings();
  }, []);

  const fetchStoreSettings = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/settings/store`);
      if (response.data.data) {
        setStoreData(response.data.data);
      }
      setError('');
    } catch (err) {
      // Initialize with default if not found
      console.error('Failed to fetch store settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStoreData(prev => ({ ...prev, [name]: value }));
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

  const handleTerminalChange = (field, value) => {
    const updatedTerminals = [...storeData.terminalSettings];
    updatedTerminals[activeTerminalIndex] = {
      ...updatedTerminals[activeTerminalIndex],
      [field]: value
    };
    setStoreData(prev => ({ ...prev, terminalSettings: updatedTerminals }));
  };

  const addTerminal = () => {
    const newTerminal = {
      terminalId: '',
      terminalName: '',
      invoiceNumberPrefix: '',
      invoiceFormat: 'STANDARD',
      enableCreditSale: true,
      enableReturns: true,
      enablePromotions: true,
    };
    setStoreData(prev => ({
      ...prev,
      terminalSettings: [...prev.terminalSettings, newTerminal]
    }));
    setActiveTerminalIndex(storeData.terminalSettings.length);
    setAddingTerminal(false);
  };

  const removeTerminal = (index) => {
    if (storeData.terminalSettings.length <= 1) {
      setError('At least one terminal configuration is required');
      return;
    }
    const updatedTerminals = storeData.terminalSettings.filter((_, i) => i !== index);
    setStoreData(prev => ({ ...prev, terminalSettings: updatedTerminals }));
    setActiveTerminalIndex(0);
  };

  const handleSave = async () => {
    if (!storeData.storeName) {
      setError('Store name is required');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const response = await axios.post(`${API_URL}/settings/store`, storeData);
      setSuccess('Store settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save store settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Error & Success Messages */}
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg flex justify-between items-center text-sm">
          {error}
          <button onClick={() => setError('')} className="text-red-900">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-100 text-green-700 rounded-lg flex justify-between items-center text-sm">
          {success}
          <button onClick={() => setSuccess('')} className="text-green-900">
            <X size={16} />
          </button>
        </div>
      )}

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
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Address</label>
            <textarea
              name="address"
              value={storeData.address}
              onChange={handleInputChange}
              placeholder="Store address"
              rows="1"
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

      {/* Barcode Configuration */}
      <div className="bg-white p-3 rounded-lg shadow">
        <div className="flex items-center gap-2 mb-2">
          <Barcode size={16} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900">Barcode Configuration</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Barcode Prefix</label>
            <input
              type="text"
              name="barcodePrefix"
              value={storeData.barcodePrefix}
              onChange={handleInputChange}
              placeholder="e.g., 800"
              maxLength="3"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Barcode Format</label>
            <select
              name="barcodeFormat"
              value={storeData.barcodeFormat}
              onChange={handleInputChange}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="EAN13">EAN-13</option>
              <option value="EAN8">EAN-8</option>
              <option value="CODE128">CODE-128</option>
              <option value="QR">QR Code</option>
            </select>
          </div>
        </div>
      </div>

      {/* Printer Configuration */}
      <div className="bg-white p-3 rounded-lg shadow">
        <div className="flex items-center gap-2 mb-2">
          <Printer size={16} className="text-green-600" />
          <h3 className="text-sm font-semibold text-gray-900">Label Printer Configuration</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Printer Model</label>
            <select
              name="printerModel"
              value={storeData.printerModel}
              onChange={handleInputChange}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select printer...</option>
              <option value="ZEBRA">Zebra</option>
              <option value="BROTHER">Brother</option>
              <option value="DYMO">Dymo</option>
              <option value="EPSON">Epson</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Printer Port</label>
            <input
              type="text"
              name="printerPort"
              value={storeData.printerPort}
              onChange={handleInputChange}
              placeholder="e.g., COM1, LPT1, USB"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Label Width (inches)</label>
            <input
              type="number"
              name="labelWidth"
              value={storeData.labelWidth}
              onChange={handleInputChange}
              step="0.1"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Label Height (inches)</label>
            <input
              type="number"
              name="labelHeight"
              value={storeData.labelHeight}
              onChange={handleInputChange}
              step="0.1"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

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

      {/* Terminal-Wise Settings */}
      <div className="bg-white p-3 rounded-lg shadow">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-gray-900">Terminal-Wise Configuration</h3>
          <button
            onClick={() => setAddingTerminal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-2 py-1.5 rounded-lg hover:bg-blue-700 text-xs"
          >
            <Plus size={14} />
            Add Terminal
          </button>
        </div>

        {/* Terminal Tabs */}
        <div className="flex gap-1 mb-2 border-b">
          {storeData.terminalSettings.map((terminal, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer border-b-2 transition text-xs ${
                activeTerminalIndex === index
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setActiveTerminalIndex(index)}
            >
              <span className="font-medium text-sm">{terminal.terminalName || `Terminal ${index + 1}`}</span>
              {storeData.terminalSettings.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTerminal(index);
                  }}
                  className="text-red-600 hover:text-red-800"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Terminal Settings Form */}
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Terminal ID</label>
              <input
                type="text"
                value={storeData.terminalSettings[activeTerminalIndex]?.terminalId || ''}
                onChange={(e) => handleTerminalChange('terminalId', e.target.value)}
                placeholder="e.g., TRM001"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Terminal Name</label>
              <input
                type="text"
                value={storeData.terminalSettings[activeTerminalIndex]?.terminalName || ''}
                onChange={(e) => handleTerminalChange('terminalName', e.target.value)}
                placeholder="e.g., Counter 1"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Invoice Number Prefix</label>
              <input
                type="text"
                value={storeData.terminalSettings[activeTerminalIndex]?.invoiceNumberPrefix || ''}
                onChange={(e) => handleTerminalChange('invoiceNumberPrefix', e.target.value)}
                placeholder="e.g., C1"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Invoice Format</label>
              <select
                value={storeData.terminalSettings[activeTerminalIndex]?.invoiceFormat || 'STANDARD'}
                onChange={(e) => handleTerminalChange('invoiceFormat', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="STANDARD">Standard</option>
                <option value="THERMAL">Thermal (58mm)</option>
                <option value="THERMAL80">Thermal (80mm)</option>
                <option value="A4">A4</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={storeData.terminalSettings[activeTerminalIndex]?.enableCreditSale || false}
                onChange={(e) => handleTerminalChange('enableCreditSale', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              Enable Credit Sale
            </label>
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={storeData.terminalSettings[activeTerminalIndex]?.enableReturns || false}
                onChange={(e) => handleTerminalChange('enableReturns', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              Enable Returns
            </label>
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={storeData.terminalSettings[activeTerminalIndex]?.enablePromotions || false}
                onChange={(e) => handleTerminalChange('enablePromotions', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              Enable Promotions
            </label>
          </div>
        </div>
      </div>

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

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save Store Settings'}
        </button>
      </div>
    </div>
  );
};

export default StoreSettings;


