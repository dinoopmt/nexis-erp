import React, { useState, useEffect } from 'react';
import {
  X,
  Code,
  Settings,
  Package,
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../../config/config';
import toast from 'react-hot-toast';
import FloatingInput from '../../ui/FloatingInput';
import FloatingTextarea from '../../ui/FloatingTextarea';

const BarcodeTemplateForm = ({ template, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState({
    itemName: 'Sample Product',
    barcode: '1234567890123',
    price: '99.99',
    sku: 'SKU-001',
    quantity: '1',
    expiryDate: '2025-12-31',
  });
  const [formData, setFormData] = useState({
    templateName: '',
    name: '',
    legends: '',
    description: '',
    configTxt: '',
    isActive: true,
    isDefault: false,
  });

  useEffect(() => {
    if (template) {
      setFormData({
        templateName: template.templateName || '',
        name: template.name || '',
        legends: template.legends || '',
        description: template.description || '',
        configTxt: template.configTxt || '',
        isActive: template.isActive !== undefined ? template.isActive : true,
        isDefault: template.isDefault || false,
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.templateName || !formData.templateName.trim()) {
      toast.error('Template name is required');
      return;
    }

    if (!formData.configTxt || !formData.configTxt.trim()) {
      toast.error('Printer configuration (ZPLII/CPCL) is required');
      return;
    }

    try {
      setLoading(true);

      if (template?._id) {
        // Update existing template
        await axios.put(
          `${API_URL}/barcode-templates/${template._id}`,
          formData
        );
        toast.success('Barcode template updated successfully');
      } else {
        // Create new template
        await axios.post(`${API_URL}/barcode-templates`, formData);
        toast.success('Barcode template created successfully');
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving barcode template:', error);
      toast.error(
        error.response?.data?.message || 'Failed to save barcode template'
      );
    } finally {
      setLoading(false);
    }
  };

  const defaultConfigTxt = `SIZE 38 mm, 25 mm
DIRECTION 1
REFERENCE 0,0
OFFSET 0 mm
SET PEEL OFF
SET CUTTER OFF
SET TEAR ON
CLS
CODEBARCODE 50,120,"128",50,2,0,2,2,"{BARCODE}"
PRINT 1,{LABEL_QUANTITY}`;

  const replaceVariables = (text) => {
    let result = text;
    result = result.replace(/{BARCODE}/g, previewData.barcode);
    result = result.replace(/{ITEM_NAME}/g, previewData.itemName);
    result = result.replace(/{ITEM_CODE}/g, previewData.sku);
    result = result.replace(/{PRICE}/g, previewData.price);
    result = result.replace(/{QUANTITY}/g, previewData.quantity);
    result = result.replace(/{EXPIRY_DATE}/g, previewData.expiryDate);
    return result;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {template ? 'Edit Barcode Template' : 'Create Barcode Template'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {template
                ? 'Update the barcode template details below'
                : 'Create a new barcode label template with ZPLII/CPCL configuration'}
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
              { id: 'basic', label: 'Basic Info', icon: Package },
              { id: 'config', label: 'Printer Config', icon: Code },
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
                  placeholder="e.g., BARCODE_STANDARD_38x25"
                  required
                />
                <FloatingInput
                  label="Display Name (Optional)"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Standard Barcode Label"
                />
              </div>

              <FloatingInput
                label="Label (Legend)"
                name="legends"
                value={formData.legends}
                onChange={handleInputChange}
                placeholder="e.g., BARCODE_STANDARD_38x25"
              />

              <FloatingTextarea
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe this barcode template"
                rows="3"
              />
            </div>
          )}

          {/* Printer Configuration Tab */}
          {activeTab === 'config' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZPLII/CPCL Printer Configuration
                </label>
                <textarea
                  value={formData.configTxt}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      configTxt: e.target.value,
                    })
                  }
                  placeholder="Enter ZPLII or CPCL printer commands"
                  rows="14"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      configTxt: defaultConfigTxt,
                    })
                  }
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Use Default Configuration
                </button>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-800 space-y-2">
                <p className="font-semibold">Available Variables:</p>
                <div className="font-mono space-y-1">
                  <p>{'{'}{'{'}BARCODE{'}'}{'}'} - Product barcode/SKU</p>
                  <p>{'{'}{'{'}ITEM_NAME{'}'}{'}'} - Product name</p>
                  <p>{'{'}{'{'}ITEM_CODE{'}'}{'}'} - Product item code</p>
                  <p>{'{'}{'{'}PRICE{'}'}{'}'} - Product price</p>
                  <p>{'{'}{'{'}EXPIRY_DATE{'}'}{'}'} - Expiry date</p>
                  <p>{'{'}{'{'}QUANTITY{'}'}{'}'} - Quantity</p>
                  <p>{'{'}{'{'}LABEL_QUANTITY{'}'}{'}'} - Number of labels to print</p>
                </div>
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
                  <li>Only active templates can be used for printing barcode labels</li>
                  <li>Only one template can be set as default</li>
                  <li>ZPLII/CPCL configuration is required for printer compatibility</li>
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
    </div>
  );
};

export default BarcodeTemplateForm;
