/**
 * ProductNamingSettings.jsx
 * Full page component for configuring product naming conventions
 * 
 * Allows admins to configure:
 * - Naming convention (Title Case, lowercase, UPPERCASE, Sentence Case)
 * - Enable/disable validation
 * - Duplicate checking
 * - Auto-capitalization on save
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../../config/config';
import { NAMING_RULES } from '../../../utils/productNamingConvention';
import { AlertCircle, CheckCircle, Settings } from 'lucide-react';

const ProductNamingSettings = () => {
  const [settings, setSettings] = useState({
    enabled: true,
    convention: NAMING_RULES.TITLE_CASE,
    preventLowercase: true,
    preventAllCaps: true,
    enforceOnSave: true,
    checkDuplicates: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // ✅ Load current settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/settings/naming-rules`);
      setSettings(response.data);
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Save settings
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await axios.put(`${API_URL}/settings/naming-rules`, settings);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    loadSettings();
    setMessage({ type: 'info', text: 'Settings reset to last saved values' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const examples = {
    [NAMING_RULES.TITLE_CASE]: 'Apple Iphone 14 Pro',
    [NAMING_RULES.LOWERCASE]: 'apple iphone 14 pro',
    [NAMING_RULES.UPPERCASE]: 'APPLE IPHONE 14 PRO',
    [NAMING_RULES.SENTENCE_CASE]: 'Apple iphone 14 pro',
  };

  if (isLoading) {
    return (
      <div className="p-2 space-y-2">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-2">
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center gap-2">
          <Settings size={24} className="text-blue-600" />
          <h1 className="text-lg font-bold text-gray-900">Product Naming Convention</h1>
        </div>
        <p className="text-gray-600 text-xs mt-1">Configure naming standards for product names across your ERP system</p>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-md p-4 space-y-6">
        {/* Message */}
        {message && (
          <div className={`p-3 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : message.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-blue-50 border border-blue-200 text-blue-700'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle size={16} />
            ) : message.type === 'error' ? (
              <AlertCircle size={16} />
            ) : (
              <CheckCircle size={16} />
            )}
            <p className="text-xs">{message.text}</p>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs text-blue-700">
            ℹ️ Configure product naming standards for your ERP system. These rules ensure consistent product naming across the database.
          </p>
        </div>

        {/* Enable/Disable */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => handleChange('enabled', e.target.checked)}
              className="w-4 h-4 rounded"
              disabled={isSaving}
            />
            <span className="text-sm font-semibold text-gray-700">
              ✅ Enable Product Naming Convention
            </span>
          </label>
          <p className="text-xs text-gray-500 ml-6">
            When enabled, product names will be validated and auto-formatted on save.
          </p>
        </div>

        {settings.enabled && (
          <>
            {/* Naming Convention Selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                📝 Naming Convention
              </label>
              <select
                value={settings.convention}
                onChange={(e) => handleChange('convention', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                disabled={isSaving}
              >
                <option value={NAMING_RULES.TITLE_CASE}>Title Case - Each Word Capitalized</option>
                <option value={NAMING_RULES.SENTENCE_CASE}>Sentence Case - First Word Capitalized</option>
                <option value={NAMING_RULES.LOWERCASE}>Lowercase - all lowercase</option>
                <option value={NAMING_RULES.UPPERCASE}>UPPERCASE - ALL UPPERCASE</option>
              </select>
              <p className="text-xs text-gray-600 mt-1">
                Example: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{examples[settings.convention]}</span>
              </p>
            </div>

            {/* Validation Rules */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-semibold text-gray-700">🛡️ Validation Rules</p>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.preventLowercase}
                  onChange={(e) => handleChange('preventLowercase', e.target.checked)}
                  className="w-4 h-4 rounded"
                  disabled={isSaving}
                />
                <span className="text-xs text-gray-700">
                  Prevent all lowercase product names
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.preventAllCaps}
                  onChange={(e) => handleChange('preventAllCaps', e.target.checked)}
                  className="w-4 h-4 rounded"
                  disabled={isSaving}
                />
                <span className="text-xs text-gray-700">
                  Prevent all UPPERCASE product names
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.checkDuplicates}
                  onChange={(e) => handleChange('checkDuplicates', e.target.checked)}
                  className="w-4 h-4 rounded"
                  disabled={isSaving}
                />
                <span className="text-xs text-gray-700">
                  Check for duplicate product names before saving
                </span>
              </label>
            </div>

            {/* Auto-Format on Save */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enforceOnSave}
                  onChange={(e) => handleChange('enforceOnSave', e.target.checked)}
                  className="w-4 h-4 rounded"
                  disabled={isSaving}
                />
                <span className="text-sm font-semibold text-gray-700">
                  🔄 Auto-Format on Save
                </span>
              </label>
              <p className="text-xs text-gray-500 ml-6">
                Automatically apply naming convention to all product names on save. Example: "apple iphone" → "Apple Iphone"
              </p>
            </div>

            {/* Example */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs font-semibold text-yellow-800 mb-2">📋 Example Workflow:</p>
              <ol className="text-xs text-yellow-700 space-y-1 ml-4 list-decimal">
                <li>User enters product name: <span className="font-mono">"sony headphones"</span></li>
                <li>System validates against rules</li>
                <li>System checks for duplicates</li>
                <li>On save: Auto-formatted to <span className="font-mono">"Sony Headphones"</span></li>
              </ol>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
          <button
            onClick={handleReset}
            disabled={isSaving}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductNamingSettings;
