import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Copy, Power } from 'lucide-react';
import { showToast } from '../../shared/AnimatedCenteredToast.jsx';
import axios from 'axios';
import { API_URL } from '../../../config/config';
import PrinterConfigurationForm from './PrinterConfigurationForm';

const PrinterConfigurationManagement = () => {
  const [configs, setConfigs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Fetch printer configurations on mount
  useEffect(() => {
    fetchConfigurations();
  }, []);

  const fetchConfigurations = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/settings/printer-configurations`);
      if (response.data.success) {
        setConfigs(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching configurations:', error);
      showToast('error', 'Failed to load printer configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleAddConfig = () => {
    setEditingConfig(null);
    setShowForm(true);
  };

  const handleEditConfig = (config) => {
    setEditingConfig(config);
    setShowForm(true);
  };

  const handleDeleteConfig = async (configId) => {
    if (!window.confirm('Are you sure you want to delete this printer configuration?')) return;

    try {
      const response = await axios.delete(
        `${API_URL}/settings/printer-configurations/${configId}`
      );
      
      if (response.data.success) {
        setConfigs(configs.filter((c) => c._id !== configId));
        showToast('success', 'Printer configuration deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting configuration:', error);
      showToast('error', 'Failed to delete printer configuration');
    }
  };

  const handleToggleActive = async (configId, currentStatus) => {
    try {
      const response = await axios.put(
        `${API_URL}/settings/printer-configurations/${configId}`,
        { isActive: !currentStatus }
      );

      if (response.data.success) {
        setConfigs(
          configs.map((c) =>
            c._id === configId ? { ...c, isActive: !currentStatus } : c
          )
        );
        showToast('success', `Printer configuration ${!currentStatus ? 'activated' : 'deactivated'}`);
      }
    } catch (error) {
      console.error('Error toggling configuration status:', error);
      showToast('error', 'Failed to update printer configuration');
    }
  };

  const handleDuplicateConfig = async (config) => {
    try {
      const newConfig = {
        ...config,
        _id: undefined,
        name: `${config.name}_Copy`,
        legends: `${config.legends} (Copy)`,
      };

      const response = await axios.post(
        `${API_URL}/settings/printer-configurations`,
        newConfig
      );

      if (response.data.success) {
        setConfigs([...configs, response.data.data]);
        showToast('success', 'Printer configuration duplicated successfully');
      }
    } catch (error) {
      console.error('Error duplicating configuration:', error);
      showToast('error', 'Failed to duplicate printer configuration');
    }
  };

  const handleSaveConfig = async (configData) => {
    try {
      let response;
      
      if (editingConfig) {
        response = await axios.put(
          `${API_URL}/settings/printer-configurations/${editingConfig._id}`,
          configData
        );
      } else {
        response = await axios.post(
          `${API_URL}/settings/printer-configurations`,
          configData
        );
      }

      if (response.data.success) {
        if (editingConfig) {
          setConfigs(configs.map((c) => (c._id === editingConfig._id ? response.data.data : c)));
          showToast('success', 'Printer configuration updated successfully');
        } else {
          setConfigs([...configs, response.data.data]);
          showToast('success', 'Printer configuration created successfully');
        }
        setShowForm(false);
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      showToast('error', error.response?.data?.message || 'Failed to save printer configuration');
    }
  };

  if (showForm) {
    return (
      <PrinterConfigurationForm
        config={editingConfig}
        onSave={handleSaveConfig}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading printer configurations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-900">
          💡 <strong>Printer Configuration Manager:</strong> Create and manage printer templates for barcode printing. 
          Define label dimensions, printer models, and template variables for your printing hardware.
        </p>
      </div>

      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold text-gray-900">Printer Templates</h3>
        <button
          onClick={handleAddConfig}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          <Plus size={16} />
          Add Template
        </button>
      </div>

      {/* Configurations Table */}
      {configs.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600">No printer configurations found</p>
          <button
            onClick={handleAddConfig}
            className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            Create your first template →
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {configs.map((config) => (
            <div
              key={config._id}
              className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start md:items-center">
                {/* Config Info */}
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{config.legends}</h4>
                    <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded font-medium">
                      {config.printerModel}
                    </span>
                    {config.isActive ? (
                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded font-medium">
                        🟢 Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded font-medium">
                        ⚫ Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">
                    Label: {config.labelWidth}mm × {config.labelHeight}mm
                  </p>
                  <p className="text-xs text-gray-700 mt-1">
                    Variables: <span className="text-gray-600">{config.variables?.join(', ') || 'None'}</span>
                  </p>
                </div>

                {/* Stats */}
                <div className="flex gap-2 text-xs text-gray-600 md:justify-end">
                  <div>
                    <p className="font-medium text-gray-900">{config.variables?.length || 0}</p>
                    <p>Variables</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 justify-between md:justify-end">
                  <button
                    onClick={() => handleToggleActive(config._id, config.isActive)}
                    title={config.isActive ? 'Deactivate' : 'Activate'}
                    className={`p-1.5 rounded transition ${
                      config.isActive
                        ? 'hover:bg-red-50 text-red-600'
                        : 'hover:bg-green-50 text-green-600'
                    }`}
                  >
                    <Power size={16} />
                  </button>
                  <button
                    onClick={() => handleDuplicateConfig(config)}
                    title="Duplicate"
                    className="p-1.5 hover:bg-blue-50 rounded transition text-blue-600"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    onClick={() => handleEditConfig(config)}
                    title="Edit"
                    className="p-1.5 hover:bg-blue-50 rounded transition text-blue-600"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteConfig(config._id)}
                    title="Delete"
                    className="p-1.5 hover:bg-red-50 rounded transition text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Config Preview */}
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-600 mb-1 font-medium">Template Preview:</p>
                <div className="bg-gray-50 p-2 rounded text-xs text-gray-700 font-mono whitespace-pre-wrap break-words max-h-20 overflow-y-auto">
                  {config.configTxt.substring(0, 150)}
                  {config.configTxt.length > 150 && '...'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {configs.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
            <p className="text-xs text-blue-700 font-medium">Total Templates</p>
            <p className="text-lg font-bold text-blue-900">{configs.length}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-2 border border-green-200">
            <p className="text-xs text-green-700 font-medium">Active</p>
            <p className="text-lg font-bold text-green-900">
              {configs.filter((c) => c.isActive).length}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
            <p className="text-xs text-gray-700 font-medium">Inactive</p>
            <p className="text-lg font-bold text-gray-900">
              {configs.filter((c) => !c.isActive).length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrinterConfigurationManagement;
