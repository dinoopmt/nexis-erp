import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save } from 'lucide-react';

const PrinterConfigurationForm = ({ config, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    legends: '',
    printerModel: 'TSC',
    labelWidth: 38,
    labelHeight: 25,
    configTxt: '',
    variables: [],
  });

  const [variableInput, setVariableInput] = useState('');
  const [printerModels] = useState([
    'TSC',
    'ZEBRA',
    'BROTHER',
    'SATO',
    'DATAMAX',
    'GENERIC',
  ]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        name: config.name,
        legends: config.legends,
        printerModel: config.printerModel,
        labelWidth: config.labelWidth,
        labelHeight: config.labelHeight,
        configTxt: config.configTxt,
        variables: config.variables || [],
      });
    }
  }, [config]);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value,
    }));
  };

  const handleAddVariable = () => {
    if (variableInput.trim() && !formData.variables.includes(variableInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        variables: [...prev.variables, variableInput.trim()],
      }));
      setVariableInput('');
    }
  };

  const handleRemoveVariable = (variable) => {
    setFormData((prev) => ({
      ...prev,
      variables: prev.variables.filter((v) => v !== variable),
    }));
  };

  const handleExtractVariables = () => {
    const regex = /\{(\w+)\}/g;
    const matches = [...formData.configTxt.matchAll(regex)];
    const extracted = Array.from(new Set(matches.map((m) => m[1])));
    
    setFormData((prev) => ({
      ...prev,
      variables: Array.from(new Set([...prev.variables, ...extracted])),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      alert('Please enter a template name');
      return;
    }
    if (!formData.legends.trim()) {
      alert('Please enter a display name');
      return;
    }
    if (!formData.configTxt.trim()) {
      alert('Please enter printer configuration');
      return;
    }
    if (formData.variables.length === 0) {
      alert('Please add at least one variable or extract from template');
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-2 font-medium"
      >
        <ArrowLeft size={16} />
        Back to Configuration List
      </button>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {config ? 'Edit Printer Configuration' : 'Add New Printer Configuration'}
        </h3>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Template Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., TSC_BARCODE_38x25"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              required
            />
            <p className="text-xs text-gray-500">Internal identifier (no spaces)</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Display Name *</label>
            <input
              type="text"
              name="legends"
              value={formData.legends}
              onChange={handleInputChange}
              placeholder="e.g., TSC Printer - 38x25mm Label"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              required
            />
            <p className="text-xs text-gray-500">What users will see in the dropdown</p>
          </div>
        </div>

        {/* Printer Model & Label Size */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Printer Model *</label>
            <select
              name="printerModel"
              value={formData.printerModel}
              onChange={handleInputChange}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {printerModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Label Width (mm) *</label>
            <input
              type="number"
              name="labelWidth"
              value={formData.labelWidth}
              onChange={handleInputChange}
              min="10"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Label Height (mm) *</label>
            <input
              type="number"
              name="labelHeight"
              value={formData.labelHeight}
              onChange={handleInputChange}
              min="10"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Variables Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-blue-900">Template Variables</h4>
            <button
              type="button"
              onClick={handleExtractVariables}
              className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition"
            >
              🔍 Extract from Template
            </button>
          </div>

          {/* Variable Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={variableInput}
              onChange={(e) => setVariableInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddVariable()}
              placeholder="e.g., ITEM_NAME, BARCODE, PRICE"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              type="button"
              onClick={handleAddVariable}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              Add
            </button>
          </div>

          {/* Variables List */}
          <div className="flex flex-wrap gap-1">
            {formData.variables.map((variable) => (
              <div
                key={variable}
                className="flex items-center gap-1 px-2 py-1 bg-white border border-blue-300 rounded text-sm text-blue-900"
              >
                <span className="font-mono">{`{${variable}}`}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveVariable(variable)}
                  className="text-red-600 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {formData.variables.length === 0 && (
            <p className="text-xs text-blue-700 italic">
              No variables added yet. Extract from template above or add manually.
            </p>
          )}
        </div>

        {/* Printer Configuration */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Printer Configuration (Template) *</label>
          <textarea
            name="configTxt"
            value={formData.configTxt}
            onChange={handleInputChange}
            placeholder="Paste your printer configuration template here. Use {VARIABLE_NAME} for placeholders."
            rows={10}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
            required
          />
          <p className="text-xs text-gray-500">
            Include variables in <code className="bg-gray-100 px-1">{'{'}VARIABLE_NAME{'}'}</code> format. 
            Common variables: ITEM_NAME, BARCODE, NUMBER_ITEM_PRICE, DECIMAL_ITEM_PRICE, UNIT_NAME
          </p>
        </div>

        {/* Info Section */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-900">
            <strong>💡 Tip:</strong> Write your printer command format for your specific printer model. 
            Variables will be automatically replaced with actual product data when printing.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 justify-end pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm disabled:opacity-50"
          >
            <Save size={16} />
            {loading ? 'Saving...' : config ? 'Update Configuration' : 'Create Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PrinterConfigurationForm;
