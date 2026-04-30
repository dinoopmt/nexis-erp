/**
 * InventoryTemplateForm Component
 * For creating/editing LPO, GRN, RTV templates
 * Unified template editor for all inventory documents
 */
import React, { useState, useEffect } from 'react';
import {
  X,
  Code,
  Settings,
  FileText,
  Palette,
  Copy,
  Check,
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../../config/config';
import toast from 'react-hot-toast';
import FloatingInput from '../../ui/FloatingInput';
import FloatingSelect from '../../ui/FloatingSelect';
import FloatingTextarea from '../../ui/FloatingTextarea';

const LANGUAGES = [
  { label: 'English', value: 'EN' },
  { label: 'Arabic', value: 'AR' },
];

const FONTS = [
  { label: 'Arial', value: 'Arial' },
  { label: 'Helvetica', value: 'Helvetica' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Courier New', value: 'Courier New' },
  { label: 'Georgia', value: 'Georgia' },
];

const PAGE_SIZES = [
  { label: 'A4 (210 x 297 mm)', value: 'A4' },
  { label: 'A5 (148 x 210 mm)', value: 'A5' },
  { label: 'Letter (8.5 x 11 in)', value: 'LETTER' },
];

const getDefaultColor = (docType) => {
  const colorMap = { 'LPO': '#1e40af', 'GRN': '#059669', 'RTV': '#dc2626' };
  return colorMap[docType] || '#1e40af';
};

const getDocumentLabel = (docType) => {
  const labelMap = {
    'LPO': 'Local Purchase Order',
    'GRN': 'Goods Receipt Note',
    'RTV': 'Return to Vendor'
  };
  return labelMap[docType] || docType;
};

const InventoryTemplateForm = ({ template, documentType = 'LPO', onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    templateName: '',
    documentType: documentType.toUpperCase(),
    language: 'EN',
    description: '',
    includeLogo: true,
    isActive: true,
    isDefault: false,
    customDesign: {
      headerColor: getDefaultColor(documentType),
      bodyFont: 'Arial',
      pageSize: 'A4',
      margins: { top: 10, bottom: 10, left: 10, right: 10 },
      showSerialNumbers: true,
      showQrCode: false,
      showBarcode: false,
      showBatchInfo: true,
      showExpiryDates: true,
      showReturnReason: true,
      showCreditNoteRef: true,
    },
    htmlContent: '',
    cssContent: '',
  });

  useEffect(() => {
    if (template) {
      setFormData({
        ...template,
        htmlContent: template.htmlContent || '',
        cssContent: template.cssContent || '',
        customDesign: {
          ...template.customDesign,
          margins: template.customDesign?.margins || {
            top: 10, bottom: 10, left: 10, right: 10,
          },
        },
      });
    }
  }, [template]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCustomDesignChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      customDesign: { ...prev.customDesign, [field]: value },
    }));
  };

  const handleMarginChange = (side, value) => {
    setFormData((prev) => ({
      ...prev,
      customDesign: {
        ...prev.customDesign,
        margins: {
          ...prev.customDesign.margins,
          [side]: parseInt(value) || 0,
        },
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.templateName?.trim()) {
      toast.error('Template name is required');
      return;
    }

    if (!formData.htmlContent?.trim()) {
      toast.error('HTML content is required');
      return;
    }

    try {
      setLoading(true);
      const endpoint = `${API_URL}/inventory-templates`;

      if (template?._id) {
        await axios.put(`${endpoint}/${template._id}`, formData);
        toast.success('Template updated successfully');
      } else {
        await axios.post(endpoint, formData);
        toast.success('Template created successfully');
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(error.response?.data?.message || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const defaultHtmlTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${formData.documentType}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      font-size: 12px;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid ${formData.customDesign.headerColor};
      padding-bottom: 15px;
    }
    .header h1 {
      color: ${formData.customDesign.headerColor};
      margin: 0;
      font-size: 24px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: ${formData.customDesign.headerColor};
      color: white;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${formData.documentType}</h1>
    <p>{{companyName}}</p>
  </div>
  <div style="margin-bottom: 20px;">
    <p><strong>${formData.documentType} No.:</strong> {{documentNumber}}</p>
    <p><strong>Date:</strong> {{documentDate}}</p>
    <p><strong>Vendor:</strong> {{vendorName}}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Item Code</th>
        <th>Description</th>
        <th>Qty</th>
        <th>Unit</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      {{#items}}<tr><td>{{itemCode}}</td><td>{{itemName}}</td><td>{{quantity}}</td><td>{{unit}}</td><td>{{amount}}</td></tr>{{/items}}
    </tbody>
  </table>
  <div style="text-align: right; margin-top: 20px;">
    <p><strong>Total: {{totalAmount}}</strong></p>
  </div>
</body>
</html>`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {template ? `Edit ${getDocumentLabel(formData.documentType)}` : `Create ${getDocumentLabel(formData.documentType)}`}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {template ? 'Update template details' : 'Design your inventory document template'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-0">
            {[
              { id: 'basic', label: 'Basic', icon: FileText },
              { id: 'design', label: 'Design', icon: Palette },
              { id: 'content', label: 'Content', icon: Code },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FloatingInput
                  label="Template Name"
                  name="templateName"
                  value={formData.templateName}
                  onChange={handleInputChange}
                  placeholder={`e.g., ${formData.documentType}_EN_v1`}
                  required
                />
                <FloatingSelect
                  label="Language"
                  name="language"
                  value={formData.language}
                  onChange={handleInputChange}
                  options={LANGUAGES}
                />
              </div>
              <FloatingTextarea
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Template description"
                rows="2"
              />
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="includeLogo"
                  checked={formData.includeLogo}
                  onChange={handleInputChange}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Include Company Logo</span>
              </label>
            </div>
          )}

          {activeTab === 'design' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Header Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.customDesign.headerColor}
                    onChange={(e) => handleCustomDesignChange('headerColor', e.target.value)}
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.customDesign.headerColor}
                    onChange={(e) => handleCustomDesignChange('headerColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <FloatingSelect
                label="Font"
                value={formData.customDesign.bodyFont}
                onChange={(e) => handleCustomDesignChange('bodyFont', e.target.value)}
                options={FONTS}
              />
              <FloatingSelect
                label="Page Size"
                value={formData.customDesign.pageSize}
                onChange={(e) => handleCustomDesignChange('pageSize', e.target.value)}
                options={PAGE_SIZES}
              />
              <div>
                <h4 className="text-sm font-semibold mb-3">Margins (mm)</h4>
                <div className="grid grid-cols-4 gap-3">
                  {['top', 'bottom', 'left', 'right'].map((side) => (
                    <div key={side}>
                      <label className="text-xs text-gray-600 capitalize">{side}</label>
                      <input
                        type="number"
                        value={formData.customDesign.margins[side]}
                        onChange={(e) => handleMarginChange(side, e.target.value)}
                        className="w-full px-2 py-2 border border-gray-300 rounded text-sm"
                        min="0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">HTML Content</label>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, htmlContent: defaultHtmlTemplate }))}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Load Default
                  </button>
                </div>
                <textarea
                  value={formData.htmlContent}
                  onChange={(e) => setFormData((p) => ({ ...p, htmlContent: e.target.value }))}
                  rows="12"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">CSS (Optional)</label>
                <textarea
                  value={formData.cssContent}
                  onChange={(e) => setFormData((p) => ({ ...p, cssContent: e.target.value }))}
                  rows="6"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs"
                />
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={formData.isDefault}
                  onChange={handleInputChange}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Set as Default</span>
              </label>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                <p className="font-semibold">Info:</p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Only active templates appear in print workflows</li>
                  <li>One default template per language and type</li>
                </ul>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : template ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryTemplateForm;
