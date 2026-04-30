import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Download,
  Upload,
  FileText,
  Barcode,
  Eye,
  AlertCircle,
  Package,
  Inbox,
  Archive,
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../../config/config';
import toast from 'react-hot-toast';
import Modal from '../../shared/Model';
import InvoiceTemplateForm from './InvoiceTemplateForm';
import BarcodeTemplateForm from './BarcodeTemplateForm';
import InventoryTemplateForm from './InventoryTemplateForm';

const TemplateConfigurationForm = () => {
  const [activeTab, setActiveTab] = useState('sales');
  const [activeInventoryType, setActiveInventoryType] = useState('LPO'); // For inventory sub-tabs
  const [invoiceTemplates, setInvoiceTemplates] = useState([]);
  const [barcodeTemplates, setBarcodeTemplates] = useState([]);
  const [inventoryTemplates, setInventoryTemplates] = useState({
    LPO: [],
    GRN: [],
    RTV: []
  });
  const [loading, setLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editingTemplateType, setEditingTemplateType] = useState(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showBarcodeForm, setShowBarcodeForm] = useState(false);
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      
      // Fetch invoice templates
      try {
        const invoiceResponse = await axios.get(`${API_URL}/invoice-templates`);
        const invoiceData = Array.isArray(invoiceResponse.data) 
          ? invoiceResponse.data 
          : invoiceResponse.data?.data || [];
        setInvoiceTemplates(invoiceData);
      } catch (err) {
        console.warn('Invoice templates fetch failed:', err);
      }
      
      // Fetch barcode templates
      try {
        const barcodeResponse = await axios.get(`${API_URL}/barcode-templates`);
        const barcodeData = Array.isArray(barcodeResponse.data) 
          ? barcodeResponse.data 
          : barcodeResponse.data?.data || [];
        setBarcodeTemplates(barcodeData);
      } catch (err) {
        console.warn('Barcode templates fetch failed:', err);
      }

      // ✅ Fetch unified inventory templates
      try {
        const inventoryResponse = await axios.get(`${API_URL}/inventory-templates`, {
          params: { activeOnly: false }
        });
        
        const templates = Array.isArray(inventoryResponse.data?.data) 
          ? inventoryResponse.data.data 
          : [];
        
        // Group by documentType
        const grouped = { LPO: [], GRN: [], RTV: [] };
        templates.forEach(template => {
          if (grouped[template.documentType]) {
            grouped[template.documentType].push(template);
          }
        });
        
        setInventoryTemplates(grouped);
      } catch (err) {
        console.warn('Inventory templates fetch failed:', err);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = (templateId, type, documentType) => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        let endpoint = '';
        
        if (type === 'invoice') {
          endpoint = `${API_URL}/invoice-templates/${templateId}`;
          axios.delete(endpoint).then(() => {
            setInvoiceTemplates(invoiceTemplates.filter(t => t._id !== templateId));
            toast.success('Template deleted successfully');
          });
        } else if (type === 'barcode') {
          endpoint = `${API_URL}/barcode-templates/${templateId}`;
          axios.delete(endpoint).then(() => {
            setBarcodeTemplates(barcodeTemplates.filter(t => t._id !== templateId));
            toast.success('Template deleted successfully');
          });
        } else if (type === 'inventory') {
          endpoint = `${API_URL}/inventory-templates/${templateId}`;
          axios.delete(endpoint).then(() => {
            setInventoryTemplates(prev => ({
              ...prev,
              [documentType]: prev[documentType].filter(t => t._id !== templateId)
            }));
            toast.success('Template deleted successfully');
          });
        }
        
        fetchTemplates();
      } catch (error) {
        console.error('Error deleting template:', error);
        toast.error('Failed to delete template');
      }
    }
  };

  const handlePreview = (template) => {
    setPreviewTemplate(template);
    setShowPreview(true);
  };

  const handleCreateTemplate = (type = 'invoice', documentType = null) => {
    setEditingTemplate(null);
    setEditingTemplateType(type);
    if (type === 'invoice') {
      setShowInvoiceForm(true);
    } else if (type === 'barcode') {
      setShowBarcodeForm(true);
    } else if (type === 'inventory') {
      setShowInventoryForm(true);
    }
  };

  const handleEditTemplate = (template, type = 'invoice', documentType = null) => {
    setEditingTemplate(template);
    setEditingTemplateType(type);
    if (type === 'invoice') {
      setShowInvoiceForm(true);
    } else if (type === 'barcode') {
      setShowBarcodeForm(true);
    } else if (type === 'inventory') {
      setShowInventoryForm(true);
    }
  };

  const handleFormClose = () => {
    setShowInvoiceForm(false);
    setShowBarcodeForm(false);
    setShowInventoryForm(false);
    setEditingTemplate(null);
    setEditingTemplateType(null);
  };

  const handleFormSave = () => {
    fetchTemplates();
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Template Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage invoice and barcode templates for your business
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0 overflow-x-auto">
          {/* Sales Templates Tab */}
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'sales'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            Sales Templates
          </button>

          {/* Barcode Templates Tab */}
          <button
            onClick={() => setActiveTab('barcode')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'barcode'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Barcode className="w-4 h-4" />
            Barcode Templates
          </button>

          {/* ✅ Inventory Templates Tab */}
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Package className="w-4 h-4" />
            Inventory Templates
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* Sales Templates Tab Content */}
        {activeTab === 'sales' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Invoice Templates</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your invoice templates for different languages and styles
                </p>
              </div>
              <button
                onClick={handleCreateTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                New Template
              </button>
            </div>

            {/* Templates List */}
            {invoiceTemplates.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No invoice templates found</p>
                <button
                  onClick={handleCreateTemplate}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create First Template
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {invoiceTemplates.map((template) => (
                  <div key={template._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      {/* Template Info */}
                      <div className="md:col-span-2">
                        <h4 className="font-semibold text-gray-900">{template.templateName}</h4>
                        <div className="flex gap-3 mt-2 text-xs text-gray-600">
                          <span>🌐 {template.language}</span>
                          <span>•</span>
                          <span>📄 {template.templateType}</span>
                        </div>
                        {template.description && (
                          <p className="text-xs text-gray-500 mt-2">{template.description}</p>
                        )}
                      </div>

                      {/* Status */}
                      <div className="flex justify-start md:justify-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          template.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {template.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 justify-start md:justify-end">
                        <button
                          onClick={() => handlePreview(template)}
                          className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          title="Preview template"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleEditTemplate(template)}
                          className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          title="Edit template"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template._id, 'invoice')}
                          className="px-3 py-2 border border-gray-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete template"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Import/Export Section */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 text-sm">Bulk Actions</h4>
                  <p className="text-xs text-blue-800 mt-1">Import or export templates for backup or sharing</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-4 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm">
                  <Upload className="w-4 h-4" />
                  Import Templates
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm">
                  <Download className="w-4 h-4" />
                  Export Templates
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Barcode Templates Tab Content */}
        {activeTab === 'barcode' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Barcode Templates</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Manage barcode label templates for different sizes and formats
                </p>
              </div>
              <button
                onClick={() => handleCreateTemplate('barcode')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                New Template
              </button>
            </div>

            {/* Barcode Templates List */}
            {barcodeTemplates.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <Barcode className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No barcode templates found</p>
                <button
                  onClick={() => handleCreateTemplate('barcode')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create First Template
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {barcodeTemplates.map((template) => (
                  <div key={template._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                      {/* Template Info */}
                      <div className="md:col-span-2">
                        <h4 className="font-semibold text-gray-900">{template.templateName}</h4>
                        <div className="flex gap-3 mt-2 text-xs text-gray-600">
                          <span>📋 Format: {template.customDesign?.format || 'Code128'}</span>
                          <span>•</span>
                          <span>📏 Size: {template.customDesign?.pageSize || 'A4'}</span>
                        </div>
                        {template.description && (
                          <p className="text-xs text-gray-500 mt-2">{template.description}</p>
                        )}
                      </div>

                      {/* Status */}
                      <div className="flex justify-start md:justify-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          template.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {template.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 justify-start md:justify-end">
                        <button
                          onClick={() => handlePreview(template)}
                          className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          title="Preview template"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleEditTemplate(template, 'barcode')}
                          className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          title="Edit template"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template._id, 'barcode')}
                          className="px-3 py-2 border border-gray-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete template"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Barcode Settings */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
              <h4 className="font-semibold text-gray-900 text-sm">Default Barcode Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3 bg-white rounded border border-gray-200">
                  <label className="text-xs text-gray-600">Default Format</label>
                  <p className="font-medium text-gray-900 mt-1">Code128</p>
                </div>
                <div className="p-3 bg-white rounded border border-gray-200">
                  <label className="text-xs text-gray-600">Default Size</label>
                  <p className="font-medium text-gray-900 mt-1">4x6 inches</p>
                </div>
                <div className="p-3 bg-white rounded border border-gray-200">
                  <label className="text-xs text-gray-600">Include Product Code</label>
                  <p className="font-medium text-gray-900 mt-1">Yes</p>
                </div>
                <div className="p-3 bg-white rounded border border-gray-200">
                  <label className="text-xs text-gray-600">Include Price</label>
                  <p className="font-medium text-gray-900 mt-1">No</p>
                </div>
              </div>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm">
                Edit Settings
              </button>
            </div>
          </div>
        )}

        {/* ✅ Inventory Templates Tab Content (LPO, GRN, RTV) */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {/* Sub-Tab Navigation for Document Types */}
            <div className="border-b border-gray-200">
              <div className="flex gap-2">
                {['LPO', 'GRN', 'RTV'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveInventoryType(type)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeInventoryType === type
                        ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {type === 'LPO' && '📋'} {type === 'GRN' && '📦'} {type === 'RTV' && '↩️'} {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Content for each Document Type */}
            {['LPO', 'GRN', 'RTV'].map((docType) => (
              activeInventoryType === docType && (
                <div key={docType} className="space-y-6">
                  {/* Header */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {docType === 'LPO' && 'Local Purchase Order Templates'}
                        {docType === 'GRN' && 'Goods Receipt Note Templates'}
                        {docType === 'RTV' && 'Return to Vendor Templates'}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Manage {docType} templates with custom design and layout
                      </p>
                    </div>
                    <button
                      onClick={() => handleCreateTemplate('inventory', docType)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      New Template
                    </button>
                  </div>

                  {/* Templates List */}
                  {inventoryTemplates[docType]?.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 mb-4">No {docType} templates found</p>
                      <button
                        onClick={() => handleCreateTemplate('inventory', docType)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Create First Template
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {inventoryTemplates[docType]?.map((template) => (
                        <div key={template._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                            {/* Template Info */}
                            <div className="md:col-span-2">
                              <h4 className="font-semibold text-gray-900">{template.templateName}</h4>
                              <div className="flex gap-3 mt-2 text-xs text-gray-600">
                                <span>🌐 {template.language === 'EN' ? 'English' : 'Arabic'}</span>
                                <span>•</span>
                                <span>📄 {template.documentType}</span>
                              </div>
                              {template.description && (
                                <p className="text-xs text-gray-500 mt-2">{template.description}</p>
                              )}
                            </div>

                            {/* Status */}
                            <div className="flex justify-start md:justify-center">
                              <div className="space-y-1 text-xs">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium block ${
                                  template.isActive
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {template.isActive ? 'Active' : 'Inactive'}
                                </span>
                                {template.isDefault && (
                                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 block">
                                    Default
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 justify-start md:justify-end">
                              <button
                                onClick={() => handlePreview(template)}
                                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                title="Preview template"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleEditTemplate(template, 'inventory', docType)}
                                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                title="Edit template"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteTemplate(template._id, 'inventory', docType)}
                                className="px-3 py-2 border border-gray-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                title="Delete template"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreview && previewTemplate}
        title={previewTemplate ? `Preview: ${previewTemplate.templateName}` : 'Preview'}
        onClose={() => setShowPreview(false)}
        width="max-w-5xl"
      >
        {previewTemplate && (
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Template Info Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <p className="text-xs text-gray-600">Name</p>
                <p className="font-semibold text-gray-900 text-sm">{previewTemplate.templateName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Type</p>
                <p className="font-semibold text-gray-900 text-sm">{previewTemplate.templateType}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Language</p>
                <p className="font-semibold text-gray-900 text-sm">{previewTemplate.language === 'EN' ? 'English' : 'Arabic'}</p>
              </div>
              {previewTemplate.customDesign?.pageSize && (
                <div>
                  <p className="text-xs text-gray-600">Page Size</p>
                  <p className="font-semibold text-gray-900 text-sm">{previewTemplate.customDesign.pageSize}</p>
                </div>
              )}
              {previewTemplate.customDesign?.currency && (
                <div>
                  <p className="text-xs text-gray-600">Currency</p>
                  <p className="font-semibold text-gray-900 text-sm">{previewTemplate.customDesign.currency}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-600">Status</p>
                <span className={`px-2 py-1 rounded text-xs font-medium inline-block ${
                  previewTemplate.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {previewTemplate.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Description */}
            {previewTemplate.description && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-600 font-medium mb-1">Description</p>
                <p className="text-xs text-blue-800">{previewTemplate.description}</p>
              </div>
            )}

            {/* HTML Preview */}
            {previewTemplate.htmlContent && (
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900 text-sm">Template Preview</h4>
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
                            font-family: ${previewTemplate.customDesign?.bodyFont || 'Arial'}, Arial, sans-serif;
                            margin: ${previewTemplate.customDesign?.margins?.top || 10}mm ${previewTemplate.customDesign?.margins?.right || 10}mm ${previewTemplate.customDesign?.margins?.bottom || 10}mm ${previewTemplate.customDesign?.margins?.left || 10}mm;
                            line-height: 1.6;
                            color: #333;
                            font-size: 13px;
                          }
                          h1, h2, h3 { 
                            color: ${previewTemplate.customDesign?.headerColor || '#1e40af'};
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
                          ${previewTemplate.cssContent || ''}
                        </style>
                      </head>
                      <body>
                        ${previewTemplate.htmlContent}
                      </body>
                      </html>
                    `}
                    className="w-full border-none"
                    style={{ height: '500px' }}
                  />
                </div>
              </div>
            )}

            {/* HTML Source */}
            {previewTemplate.htmlContent && (
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900 text-sm">HTML Source</h4>
                <div className="p-3 bg-gray-900 rounded-lg overflow-x-auto max-h-48 overflow-y-auto">
                  <pre className="text-xs text-gray-100 font-mono whitespace-pre-wrap break-words">
                    {previewTemplate.htmlContent}
                  </pre>
                </div>
              </div>
            )}

            {/* Info Message */}
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
              <p className="font-semibold mb-1">Preview Note:</p>
              <p>This preview shows your template structure. Variables like {'{{'}invoiceNumber{'}}}'}, {'{{'}total{'}}}'}, etc. will be replaced with actual data when generating documents.</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleEditTemplate(previewTemplate, previewTemplate.configTxt ? 'barcode' : 'invoice');
                  setShowPreview(false);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                Edit Template
              </button>
            </div>
          </div>
        )}
        </Modal>

      {/* Invoice Template Form Modal */}
      {showInvoiceForm && (
        <InvoiceTemplateForm
          template={editingTemplate}
          onClose={handleFormClose}
          onSave={handleFormSave}
        />
      )}

      {/* Barcode Template Form Modal */}
      {showBarcodeForm && (
        <BarcodeTemplateForm
          template={editingTemplate}
          onClose={handleFormClose}
          onSave={handleFormSave}
        />
      )}

      {/* ✅ Inventory Template Form Modal (LPO/GRN/RTV) */}
      {showInventoryForm && (
        <InventoryTemplateForm
          template={editingTemplate}
          documentType={editingTemplate?.documentType || activeInventoryType}
          onClose={handleFormClose}
          onSave={handleFormSave}
        />
      )}
    </div>
  );
};

export default TemplateConfigurationForm;
