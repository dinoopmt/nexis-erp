import React, { useState, useEffect } from 'react';
import {
  X,
  Code,
  Settings,
  FileText,
  Palette,
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../../config/config';
import toast from 'react-hot-toast';
import FloatingInput from '../../ui/FloatingInput';
import FloatingSelect from '../../ui/FloatingSelect';
import FloatingTextarea from '../../ui/FloatingTextarea';

const TEMPLATE_TYPES = [
  { label: 'Invoice', value: 'INVOICE' },
  { label: 'GRN', value: 'GRN' },
  { label: 'RTV', value: 'RTV' },
  { label: 'Delivery Note', value: 'DELIVERY_NOTE' },
];

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

const CURRENCIES = [
  { label: 'AED (United Arab Emirates Dirham)', value: 'AED' },
  { label: 'USD (US Dollar)', value: 'USD' },
  { label: 'EUR (Euro)', value: 'EUR' },
  { label: 'GBP (British Pound)', value: 'GBP' },
  { label: 'INR (Indian Rupee)', value: 'INR' },
  { label: 'SAR (Saudi Riyal)', value: 'SAR' },
];

const PAGE_SIZES = [
  { label: 'A4 (210 x 297 mm)', value: 'A4' },
  { label: 'A5 (148 x 210 mm)', value: 'A5' },
  { label: 'Letter (8.5 x 11 in)', value: 'LETTER' },
];

const InvoiceTemplateForm = ({ template, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    templateName: '',
    language: 'EN',
    templateType: 'INVOICE',
    description: '',
    includeLogo: true,
    isActive: true,
    isDefault: false,
    customDesign: {
      headerColor: '#1e40af',
      bodyFont: 'Arial',
      showSerialNumbers: true,
      showQrCode: false,
      showBarcode: false,
      currency: 'AED',
      pageSize: 'A4',
      margins: {
        top: 10,
        bottom: 10,
        left: 10,
        right: 10,
      },
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
            top: 10,
            bottom: 10,
            left: 10,
            right: 10,
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
      customDesign: {
        ...prev.customDesign,
        [field]: value,
      },
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

    if (!formData.templateName || !formData.templateName.trim()) {
      toast.error('Template name is required');
      return;
    }

    if (!formData.htmlContent || !formData.htmlContent.trim()) {
      toast.error('HTML content is required');
      return;
    }

    try {
      setLoading(true);

      if (template?._id) {
        // Update existing template
        await axios.put(
          `${API_URL}/invoice-templates/${template._id}`,
          formData
        );
        toast.success('Template updated successfully');
      } else {
        // Create new template
        await axios.post(`${API_URL}/invoice-templates`, formData);
        toast.success('Template created successfully');
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(
        error.response?.data?.message || 'Failed to save template'
      );
    } finally {
      setLoading(false);
    }
  };

  const defaultHtmlTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice</title>
</head>
<body>
  <div class="header">
    <h1>INVOICE</h1>
  </div>
  
  <div class="company-info">
    <strong>{{companyName}}</strong><br/>
    {{companyAddress}}<br/>
    {{companyPhone}}
  </div>
  
  <div class="invoice-info">
    <p><strong>Invoice #:</strong> {{invoiceNumber}}</p>
    <p><strong>Date:</strong> {{date}}</p>
    <p><strong>Customer:</strong> {{customerName}}</p>
  </div>
  
  <table class="items-table">
    <thead>
      <tr>
        <th>Item</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{this.itemName}}</td>
        <td>{{this.quantity}}</td>
        <td>{{this.unitPrice}}</td>
        <td>{{this.amount}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  
  <div class="summary">
    <p><strong>Subtotal:</strong> {{subtotal}}</p>
    <p><strong>Tax:</strong> {{tax}}</p>
    <p><strong>Total:</strong> {{total}}</p>
  </div>
  
  <div class="footer">
    <p>Thank you for your business!</p>
  </div>
</body>
</html>`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {template ? 'Edit Invoice Template' : 'Create Invoice Template'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {template
                ? 'Update the template details below'
                : 'Create a new invoice template with custom design'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-0">
            {[
              { id: 'basic', label: 'Basic Info', icon: FileText },
              { id: 'design', label: 'Design', icon: Palette },
              { id: 'content', label: 'Content', icon: Code },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
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
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FloatingInput
                  label="Template Name"
                  name="templateName"
                  value={formData.templateName}
                  onChange={handleInputChange}
                  placeholder="e.g., Invoice_EN_with_Logo"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FloatingSelect
                  label="Template Type"
                  name="templateType"
                  value={formData.templateType}
                  onChange={handleInputChange}
                  options={TEMPLATE_TYPES}
                />
              </div>

              <FloatingTextarea
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe this template"
                rows="3"
              />

              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="includeLogo"
                    checked={formData.includeLogo}
                    onChange={handleInputChange}
                    className="w-4 h-4 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Include Company Logo
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Design Tab */}
          {activeTab === 'design' && (
            <div className="space-y-6">
              {/* Colors & Fonts */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Colors & Fonts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Header Color
                    </label>
                    <input
                      type="color"
                      value={formData.customDesign.headerColor}
                      onChange={(e) =>
                        handleCustomDesignChange(
                          'headerColor',
                          e.target.value
                        )
                      }
                      className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                  </div>
                  <FloatingSelect
                    label="Body Font"
                    value={formData.customDesign.bodyFont}
                    onChange={(e) =>
                      handleCustomDesignChange('bodyFont', e.target.value)
                    }
                    options={FONTS}
                  />
                </div>
              </div>

              {/* Page Settings */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Page Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FloatingSelect
                    label="Page Size"
                    value={formData.customDesign.pageSize}
                    onChange={(e) =>
                      handleCustomDesignChange('pageSize', e.target.value)
                    }
                    options={PAGE_SIZES}
                  />
                  <FloatingSelect
                    label="Currency"
                    value={formData.customDesign.currency}
                    onChange={(e) =>
                      handleCustomDesignChange('currency', e.target.value)
                    }
                    options={CURRENCIES}
                  />
                </div>
              </div>

              {/* Margins */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Margins (mm)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['top', 'bottom', 'left', 'right'].map((side) => (
                    <div key={side}>
                      <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">
                        {side}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={formData.customDesign.margins[side]}
                        onChange={(e) =>
                          handleMarginChange(side, e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Display Options */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Display Options</h3>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.customDesign.showSerialNumbers}
                    onChange={(e) =>
                      handleCustomDesignChange(
                        'showSerialNumbers',
                        e.target.checked
                      )
                    }
                    className="w-4 h-4 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Show Serial Numbers
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.customDesign.showQrCode}
                    onChange={(e) =>
                      handleCustomDesignChange('showQrCode', e.target.checked)
                    }
                    className="w-4 h-4 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Show QR Code
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.customDesign.showBarcode}
                    onChange={(e) =>
                      handleCustomDesignChange(
                        'showBarcode',
                        e.target.checked
                      )
                    }
                    className="w-4 h-4 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Show Barcode
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Content Tab */}
          {activeTab === 'content' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HTML Content
                </label>
                <textarea
                  value={formData.htmlContent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      htmlContent: e.target.value,
                    })
                  }
                  placeholder="Enter HTML template with Handlebars syntax (e.g., {{invoiceNumber}})"
                  rows="12"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      htmlContent: defaultHtmlTemplate,
                    })
                  }
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Use Default Template
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  disabled={!formData.htmlContent || !formData.htmlContent.trim()}
                  className="mt-2 ml-4 text-sm text-green-600 hover:text-green-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  View Preview
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CSS Styling (Optional)
                </label>
                <textarea
                  value={formData.cssContent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cssContent: e.target.value,
                    })
                  }
                  placeholder="Enter custom CSS styles"
                  rows="8"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                />
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-800">
                <p className="font-semibold mb-2">Available Variables:</p>
                <p className="font-mono text-blue-900">
                  invoiceNumber, date, customerName, companyName, total, tax, subtotal and more...
                </p>
                <p className="text-xs mt-2 opacity-75">
                  Use Handlebars syntax in HTML template: (double braces before variable name)
                </p>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="w-4 h-4 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Active Template
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="isDefault"
                    checked={formData.isDefault}
                    onChange={handleInputChange}
                    className="w-4 h-4 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Set as Default Template
                  </span>
                </label>
              </div>

              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                <p className="font-semibold mb-1">Info:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Only active templates can be used for generating invoices</li>
                  <li>Only one template can be set as default per language/type</li>
                  <li>
                    Templates are associated with your company settings
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {template ? 'Update Template' : 'Create Template'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
            {/* Preview Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Template Preview</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {formData.templateName || 'Untitled Template'} - {formData.language === 'EN' ? 'English' : 'Arabic'}
                </p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-4">
                {/* Template Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="text-xs text-gray-600">Name</p>
                    <p className="font-semibold text-gray-900">{formData.templateName || 'Untitled'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Type</p>
                    <p className="font-semibold text-gray-900">{formData.templateType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Language</p>
                    <p className="font-semibold text-gray-900">{formData.language === 'EN' ? 'English' : 'Arabic'}</p>
                  </div>
                </div>

                {/* HTML Preview */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">HTML Output</h3>
                  <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                    <iframe
                      title="template-preview"
                      srcDoc={`
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <meta charset="UTF-8">
                          <meta name="viewport" content="width=device-width, initial-scale=1.0">
                          <style>
                            body {
                              font-family: ${formData.customDesign.bodyFont}, Arial, sans-serif;
                              margin: ${formData.customDesign.margins.top}mm ${formData.customDesign.margins.right}mm ${formData.customDesign.margins.bottom}mm ${formData.customDesign.margins.left}mm;
                              line-height: 1.6;
                              color: #333;
                            }
                            h1, h2, h3 { 
                              color: ${formData.customDesign.headerColor};
                              margin-bottom: 0.5em;
                            }
                            table {
                              width: 100%;
                              border-collapse: collapse;
                              margin: 1em 0;
                            }
                            th, td {
                              border: 1px solid #ddd;
                              padding: 0.5em;
                              text-align: left;
                            }
                            th {
                              background-color: #f2f2f2;
                              font-weight: bold;
                            }
                            .header, .footer {
                              text-align: center;
                              margin: 1em 0;
                            }
                            ${formData.cssContent}
                          </style>
                        </head>
                        <body>
                          ${formData.htmlContent}
                        </body>
                        </html>
                      `}
                      className="w-full border-none"
                      style={{ height: '600px' }}
                    />
                  </div>
                </div>

                {/* Sample Data Info */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-800">
                    <span className="font-semibold">Note:</span> This preview shows your HTML template structure. In production, variables like {'{{'}invoiceNumber{'}}}'}, {'{{'}total{'}}}'}, etc. will be replaced with actual data.
                  </p>
                </div>

                {/* HTML Source */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">HTML Source</h3>
                  <div className="p-3 bg-gray-900 rounded-lg overflow-x-auto">
                    <pre className="text-xs text-gray-100 font-mono whitespace-pre-wrap break-words">
                      {formData.htmlContent}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceTemplateForm;
