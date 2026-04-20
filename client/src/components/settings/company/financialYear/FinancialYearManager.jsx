import React, { useReducer, useEffect, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { API_URL } from '../../../../config/config';
import { fyReducer, fyInitialState, FY_ACTIONS } from './reducer';
import { FY_VIEW_MODES, API_ENDPOINTS, INITIAL_FORM_DATA, STATUS_CONFIG } from './constants';
import FinancialYearFormModal from './FinancialYearFormModal';
import FinancialYearView from './FinancialYearView';

const FinancialYearManager = () => {
  const [state, dispatch] = useReducer(fyReducer, fyInitialState);

  // Load financial years on mount
  useEffect(() => {
    loadFinancialYears();
  }, []);

  const loadFinancialYears = useCallback(async () => {
    dispatch({ type: FY_ACTIONS.SET_LOADING, payload: true });
    try {
      const response = await axios.get(`${API_URL}${API_ENDPOINTS.FETCH_FY}`);
      const years = response.data.data || response.data || [];
      dispatch({ type: FY_ACTIONS.SET_FINANCIAL_YEARS, payload: years });
    } catch (error) {
      console.error('Error loading financial years:', error);
      dispatch({ type: FY_ACTIONS.SET_ERROR, payload: 'Failed to load financial years' });
    } finally {
      dispatch({ type: FY_ACTIONS.SET_LOADING, payload: false });
    }
  }, []);

  const handleOpenModal = (year = null) => {
    if (year) {
      // Edit mode
      dispatch({ type: FY_ACTIONS.SET_EDITING_ID, payload: year._id });
      dispatch({
        type: FY_ACTIONS.SET_FORM_DATA,
        payload: {
          yearCode: year.yearCode,
          yearName: year.yearName,
          startDate: year.startDate.split('T')[0],
          endDate: year.endDate.split('T')[0],
          status: year.status,
          isCurrent: year.isCurrent,
          allowPosting: year.allowPosting,
        },
      });
    } else {
      // Create mode
      dispatch({ type: FY_ACTIONS.RESET_FORM });
    }
    dispatch({ type: FY_ACTIONS.SET_MODAL_STATE, payload: true });
  };

  const handleCloseModal = () => {
    dispatch({ type: FY_ACTIONS.SET_MODAL_STATE, payload: false });
    setTimeout(() => dispatch({ type: FY_ACTIONS.RESET_FORM }), 300);
  };

  const handleFormChange = (field, value) => {
    dispatch({
      type: FY_ACTIONS.SET_FORM_DATA,
      payload: { [field]: value },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!state.formData.yearCode || !state.formData.yearName || !state.formData.startDate || !state.formData.endDate) {
      toast.error('Please fill in all required fields', { duration: 4000, position: 'top-right' });
      return;
    }

    if (new Date(state.formData.startDate) >= new Date(state.formData.endDate)) {
      toast.error('Start date must be before end date', { duration: 4000, position: 'top-right' });
      return;
    }

    dispatch({ type: FY_ACTIONS.SET_LOADING, payload: true });

    try {
      const payload = {
        yearCode: state.formData.yearCode,
        yearName: state.formData.yearName,
        startDate: new Date(state.formData.startDate),
        endDate: new Date(state.formData.endDate),
        status: state.formData.status || 'OPEN',
        isCurrent: state.formData.isCurrent,
        allowPosting: state.formData.allowPosting !== false,
      };

      if (state.editingId) {
        // Update
        await axios.put(`${API_URL}${API_ENDPOINTS.UPDATE_FY(state.editingId)}`, payload);
        toast.success('Financial year updated successfully!', { duration: 4000, position: 'top-right' });
      } else {
        // Create
        await axios.post(`${API_URL}${API_ENDPOINTS.CREATE_FY}`, payload);
        toast.success('Financial year created successfully!', { duration: 4000, position: 'top-right' });
      }

      handleCloseModal();
      await loadFinancialYears();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to save financial year';
      toast.error(message, { duration: 4000, position: 'top-right' });
      console.error('Error saving financial year:', error);
    } finally {
      dispatch({ type: FY_ACTIONS.SET_LOADING, payload: false });
    }
  };

  const handleSetCurrent = async (id) => {
    try {
      await axios.put(`${API_URL}${API_ENDPOINTS.SET_CURRENT(id)}`);
      toast.success('Financial year set as current', { duration: 4000, position: 'top-right' });
      await loadFinancialYears();
    } catch (error) {
      toast.error('Failed to set current financial year', { duration: 4000, position: 'top-right' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this financial year?')) return;

    try {
      await axios.delete(`${API_URL}${API_ENDPOINTS.DELETE_FY(id)}`);
      toast.success('Financial year deleted successfully', { duration: 4000, position: 'top-right' });
      await loadFinancialYears();
    } catch (error) {
      toast.error('Failed to delete financial year', { duration: 4000, position: 'top-right' });
    }
  };

  const handleLock = async (id) => {
    if (!window.confirm('Are you sure you want to lock this financial year? It cannot be edited afterward.')) return;

    try {
      await axios.put(`${API_URL}${API_ENDPOINTS.LOCK_YEAR(id)}`);
      toast.success('Financial year locked successfully', { duration: 4000, position: 'top-right' });
      await loadFinancialYears();
    } catch (error) {
      toast.error('Failed to lock financial year', { duration: 4000, position: 'top-right' });
    }
  };

  const handleReopen = async (id) => {
    if (!window.confirm('Are you sure you want to unlock this financial year?')) return;

    try {
      await axios.put(`${API_URL}${API_ENDPOINTS.REOPEN_YEAR(id)}`);
      toast.success('Financial year unlocked successfully', { duration: 4000, position: 'top-right' });
      await loadFinancialYears();
    } catch (error) {
      toast.error('Failed to unlock financial year', { duration: 4000, position: 'top-right' });
    }
  };

  const isEditingLocked = state.editingId && state.formData.status === 'LOCKED';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Financial Year Management</h2>
          <p className="text-sm text-gray-600 mt-1">Create and manage financial years for your organization</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition"
        >
          <Plus size={16} />
          New Financial Year
        </button>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white rounded-lg shadow-sm border-b border-gray-200 overflow-hidden">
        <div className="flex gap-0">
          {Object.values(FY_VIEW_MODES).map((mode) => (
            <button
              key={mode}
              onClick={() => dispatch({ type: FY_ACTIONS.SET_VIEW_MODE, payload: mode })}
              className={`flex-1 py-3 px-4 text-sm font-medium transition ${
                state.viewMode === mode
                  ? 'bg-cyan-600 text-white border-b-2 border-cyan-600'
                  : 'text-gray-600 hover:bg-gray-50 border-b-2 border-gray-200'
              }`}
            >
              {mode === FY_VIEW_MODES.LIST && '📋 List View'}
              {mode === FY_VIEW_MODES.SUMMARY && '📊 Summary'}
              {mode === FY_VIEW_MODES.TIMELINE && '📅 Timeline'}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by code or name..."
            value={state.searchTerm}
            onChange={(e) => dispatch({ type: FY_ACTIONS.SET_SEARCH_TERM, payload: e.target.value })}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Loading State */}
      {state.loading && !state.financialYears.length ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="inline-block">
            <div className="w-8 h-8 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 text-sm mt-3">Loading financial years...</p>
        </div>
      ) : (
        <FinancialYearView
          financialYears={state.financialYears}
          viewMode={state.viewMode}
          searchTerm={state.searchTerm}
          onEdit={handleOpenModal}
          onSetCurrent={handleSetCurrent}
          onDelete={handleDelete}
          onLock={handleLock}
          onReopen={handleReopen}
        />
      )}

      {/* Form Modal */}
      <FinancialYearFormModal
        show={state.showModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        formData={state.formData}
        onFormChange={handleFormChange}
        loading={state.loading}
        editingId={state.editingId}
        isLocked={isEditingLocked}
      />
    </div>
  );
};

export default FinancialYearManager;
