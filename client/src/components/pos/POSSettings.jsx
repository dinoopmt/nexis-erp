/**
 * POS Settings Screen
 * Terminal configuration and system settings
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Settings,
  ChevronLeft,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Printer,
  Monitor,
  Lock,
  Wifi
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const POSSettings = ({ terminalId, onBack }) => {
  // State management
  const [settings, setSettings] = useState({
    terminalName: '',
    ipAddress: '',
    macAddress: '',
    receiptWidth: 'standard', // standard, narrow
    printQuality: 'high', // high, medium, draft
    autoSyncInterval: 30, // seconds
    enableBarcode: true,
    enableSignature: false,
    enableCustomerDisplay: true,
    debugMode: false,
    currency: 'AED',
    decimalPlaces: 2
  });

  const [initialSettings, setInitialSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [changed, setChanged] = useState(false);

  // Fetch settings
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setMessage({ type: '', text: '' });

      const response = await axios.get(
        `${API_URL}/api/v1/pos/terminals/${terminalId}/settings`
      );

      const data = response.data.data || {};
      setSettings(data);
      setInitialSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load settings'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle setting change
  const handleChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
    setChanged(true);
  };

  // Save settings
  const handleSave = async () => {
    if (!changed) {
      setMessage({ type: 'info', text: 'No changes to save' });
      return;
    }

    setIsSaving(true);
    try {
      const response = await axios.put(
        `${API_URL}/api/v1/pos/terminals/${terminalId}/settings`,
        settings
      );

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: 'Settings saved successfully'
        });
        setInitialSettings(settings);
        setChanged(false);

        setTimeout(() => {
          setMessage({ type: '', text: '' });
        }, 3000);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to save settings'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to initial
  const handleReset = () => {
    setSettings(initialSettings);
    setChanged(false);
    setMessage({ type: '', text: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-700 rounded-lg transition"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Settings className="w-6 h-6 text-indigo-500" />
                Terminal Settings
              </h1>
              <p className="text-sm text-gray-400">Configure your POS terminal</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleReset}
              disabled={!changed || isLoading}
              className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg transition"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={!changed || isSaving || isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-4xl mx-auto">
        {/* Status Message */}
        {message.text && (
          <div
            className={`mb-6 rounded-lg p-4 flex items-start gap-3 ${
              message.type === 'success'
                ? 'bg-green-600/20 border border-green-600'
                : message.type === 'error'
                ? 'bg-red-600/20 border border-red-600'
                : 'bg-blue-600/20 border border-blue-600'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            ) : message.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            )}
            <p
              className={`text-sm ${
                message.type === 'success'
                  ? 'text-green-400'
                  : message.type === 'error'
                  ? 'text-red-400'
                  : 'text-blue-400'
              }`}
            >
              {message.text}
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <Settings className="w-8 h-8 text-indigo-500 mx-auto animate-spin mb-4" />
            <p className="text-gray-400">Loading settings...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Terminal Information */}
            <section className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-blue-500" />
                Terminal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Terminal Name
                  </label>
                  <input
                    type="text"
                    value={settings.terminalName}
                    onChange={(e) => handleChange('terminalName', e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Terminal ID
                  </label>
                  <input
                    type="text"
                    value={terminalId}
                    disabled
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-gray-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                    <Wifi className="w-4 h-4" />
                    IP Address
                  </label>
                  <input
                    type="text"
                    value={settings.ipAddress}
                    onChange={(e) => handleChange('ipAddress', e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    MAC Address
                  </label>
                  <input
                    type="text"
                    value={settings.macAddress}
                    disabled
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-gray-400 cursor-not-allowed"
                  />
                </div>
              </div>
            </section>

            {/* Printer Settings */}
            <section className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Printer className="w-5 h-5 text-orange-500" />
                Printer Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Receipt Width
                  </label>
                  <select
                    value={settings.receiptWidth}
                    onChange={(e) => handleChange('receiptWidth', e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                  >
                    <option value="standard">Standard (80mm)</option>
                    <option value="narrow">Narrow (58mm)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Print Quality
                  </label>
                  <select
                    value={settings.printQuality}
                    onChange={(e) => handleChange('printQuality', e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                  >
                    <option value="high">High (Slow)</option>
                    <option value="medium">Medium (Normal)</option>
                    <option value="draft">Draft (Fast)</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Peripheral Settings */}
            <section className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Peripheral Settings</h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition">
                  <input
                    type="checkbox"
                    checked={settings.enableBarcode}
                    onChange={(e) => handleChange('enableBarcode', e.target.checked)}
                    className="w-5 h-5"
                  />
                  <div>
                    <p className="font-medium text-white">Enable Barcode Scanner</p>
                    <p className="text-xs text-gray-400">Allow barcode input for products</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition">
                  <input
                    type="checkbox"
                    checked={settings.enableSignature}
                    onChange={(e) => handleChange('enableSignature', e.target.checked)}
                    className="w-5 h-5"
                  />
                  <div>
                    <p className="font-medium text-white">Require Signature</p>
                    <p className="text-xs text-gray-400">Request customer signature for transactions</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition">
                  <input
                    type="checkbox"
                    checked={settings.enableCustomerDisplay}
                    onChange={(e) => handleChange('enableCustomerDisplay', e.target.checked)}
                    className="w-5 h-5"
                  />
                  <div>
                    <p className="font-medium text-white">Customer Display</p>
                    <p className="text-xs text-gray-400">Show prices and items on customer display</p>
                  </div>
                </label>
              </div>
            </section>

            {/* System Settings */}
            <section className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-green-500" />
                System Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Auto-Sync Interval (seconds)
                  </label>
                  <input
                    type="number"
                    value={settings.autoSyncInterval}
                    onChange={(e) => handleChange('autoSyncInterval', parseInt(e.target.value))}
                    min="5"
                    max="300"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Currency
                  </label>
                  <select
                    value={settings.currency}
                    onChange={(e) => handleChange('currency', e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                  >
                    <option value="AED">AED (United Arab Emirates)</option>
                    <option value="OMR">OMR (Oman)</option>
                    <option value="INR">INR (India)</option>
                    <option value="USD">USD (United States)</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition">
                <input
                  type="checkbox"
                  checked={settings.debugMode}
                  onChange={(e) => handleChange('debugMode', e.target.checked)}
                  className="w-5 h-5"
                />
                <div>
                  <p className="font-medium text-white">Debug Mode</p>
                  <p className="text-xs text-gray-400">Enable console logging and debug information</p>
                </div>
              </label>
            </section>

            {/* Decimal Settings */}
            <section className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Format Settings</h3>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Decimal Places
                </label>
                <select
                  value={settings.decimalPlaces}
                  onChange={(e) => handleChange('decimalPlaces', parseInt(e.target.value))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                >
                  <option value="2">2 Decimal Places</option>
                  <option value="3">3 Decimal Places</option>
                  <option value="4">4 Decimal Places</option>
                </select>
              </div>
            </section>

            {/* Changed Indicator */}
            {changed && (
              <div className="bg-yellow-600/20 border border-yellow-600 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                <p className="text-yellow-400 text-sm">
                  You have unsaved changes. Click Save to apply them.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default POSSettings;


