import { useEffect, useReducer, useCallback } from "react";
import useDecimalFormat from "../../hooks/useDecimalFormat";
import Modal from "../shared/Model";
import { useFetchGet, useFetchMutation } from "./hooks/useFetch";
import { accountsReducer, initialState, ACTIONS } from "./reducer";
import {
  API_ENDPOINTS,
  VIEW_MODES,
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_CONFIG,
  BANK_ACCOUNT_TYPES,
  TYPE_COLOR_MAPPING,
  SUMMARY_TYPE_COLORS,
  ERROR_MESSAGES
} from "./constants";

/**
 * ChartOfAccounts Component
 * Main component for managing chart of accounts
 * Follows professional coding standards with reduced component responsibilities
 */
export default function ChartOfAccounts() {
  const { formatNumber } = useDecimalFormat();
  const [state, dispatch] = useReducer(accountsReducer, initialState);
  
  // Create separate fetch instances to avoid request cancellation
  const { get: fetchDataAccounts, abort: abortAccounts } = useFetchGet();
  const { get: fetchDataGroups, abort: abortGroups } = useFetchGet();
  const { mutate, abort: abortMutate } = useFetchMutation();

  // Fetch Chart of Accounts - memoized to manage dependencies
  const loadAccounts = useCallback(async () => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    try {
      const query = new URLSearchParams();
      if (state.filterGroup) query.append("groupId", state.filterGroup);
      if (state.filterBank) query.append("isBank", state.filterBank === "true");

      const endpoint = `${API_ENDPOINTS.FETCH_ACCOUNTS}?${query}`;
      const result = await fetchDataAccounts(endpoint);

      if (result.success) {
        const accounts = result.data.chartOfAccounts || [];
        dispatch({
          type: ACTIONS.SET_ACCOUNTS,
          payload: accounts
        });
      } else if (!result.isAborted) {
        // Only log real errors, not expected aborts from React Strict Mode
        console.error(ERROR_MESSAGES.FETCH_ACCOUNTS, result.error);
        alert(ERROR_MESSAGES.FETCH_ACCOUNTS);
      }
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
    }
  }, [state.filterGroup, state.filterBank, fetchDataAccounts]);

  // Fetch Account Groups - memoized to manage dependencies
  const loadAccountGroups = useCallback(async () => {
    try {
      const result = await fetchDataGroups(API_ENDPOINTS.FETCH_GROUPS);
      
      if (!result.success) {
        // Silently ignore aborted requests (expected from React Strict Mode in dev)
        if (!result.isAborted) {
          console.error("❌ API call failed:", result.error);
        }
        dispatch({
          type: ACTIONS.SET_GROUPS,
          payload: []
        });
        return;
      }

      const groups = result.data?.accountGroups || [];
      dispatch({
        type: ACTIONS.SET_GROUPS,
        payload: groups
      });
    } catch (error) {
      console.error("❌ Error in loadAccountGroups:", error.message);
      dispatch({
        type: ACTIONS.SET_GROUPS,
        payload: []
      });
    }
  }, [fetchDataGroups]);

  // Load account groups and initial accounts on mount
  useEffect(() => {
    loadAccountGroups();
    loadAccounts();
  }, [loadAccountGroups, loadAccounts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortAccounts();
      abortGroups();
      abortMutate();
    };
  }, [abortAccounts, abortGroups, abortMutate]);

  const handleOpenModal = (account = null) => {
    if (account) {
      dispatch({ type: ACTIONS.SET_EDITING_ID, payload: account._id });
      const groupId = typeof account.accountGroupId === 'string' 
        ? account.accountGroupId 
        : account.accountGroupId?._id;
      dispatch({
        type: ACTIONS.SET_FORM_DATA,
        payload: {
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          accountGroupId: groupId,
          description: account.description,
          openingBalance: account.openingBalance,
          isActive: account.isActive,
          isBank: account.isBank,
          bankName: account.bankName,
          accountTypeBank: account.accountTypeBank
        }
      });
    } else {
      dispatch({ type: ACTIONS.RESET_FORM });
    }
    dispatch({ type: ACTIONS.SET_MODAL_STATE, payload: true });
  };

  const handleCloseModal = () => {
    dispatch({ type: ACTIONS.SET_MODAL_STATE, payload: false });
    dispatch({ type: ACTIONS.RESET_FORM });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    dispatch({
      type: ACTIONS.SET_FORM_DATA,
      payload: {
        [name]: type === "checkbox" ? checked : value
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { accountNumber, accountName, accountGroupId } = state.formData;
    if (!accountNumber || !accountName || !accountGroupId) {
      alert(ERROR_MESSAGES.REQUIRED_FIELDS);
      return;
    }

    try {
      const isEditing = state.editingId;
      const endpoint = isEditing
        ? `${API_ENDPOINTS.UPDATE_ACCOUNT}/${state.editingId}`
        : API_ENDPOINTS.ADD_ACCOUNT;
      const method = isEditing ? "PUT" : "POST";

      const result = await mutate(endpoint, state.formData, method);

      if (result.success) {
        alert(result.data.message || `Account ${isEditing ? "updated" : "created"} successfully`);
        handleCloseModal();
        loadAccounts();
      } else {
        alert(result.data?.message || ERROR_MESSAGES.SAVE_ACCOUNT);
      }
    } catch (error) {
      console.error(ERROR_MESSAGES.SAVE_ACCOUNT, error);
      alert(ERROR_MESSAGES.SAVE_ACCOUNT);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this account?")) {
      return;
    }

    try {
      const endpoint = `${API_ENDPOINTS.DELETE_ACCOUNT}/${id}`;
      const result = await mutate(endpoint, {}, "DELETE");

      if (result.success) {
        alert(result.data.message || "Account deleted successfully");
        loadAccounts();
      } else {
        alert(result.data?.message || ERROR_MESSAGES.DELETE_ACCOUNT);
      }
    } catch (error) {
      console.error(ERROR_MESSAGES.DELETE_ACCOUNT, error);
      alert(ERROR_MESSAGES.DELETE_ACCOUNT);
    }
  };

  const filteredAccounts = state.accounts.filter(account => {
    const searchLower = state.searchTerm.toLowerCase();
    return (
      account.accountNumber.toLowerCase().includes(searchLower) ||
      account.accountName.toLowerCase().includes(searchLower) ||
      account.description.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="container mx-auto p-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Chart of Accounts</h1>
        <p className="text-sm text-gray-600">Manage your complete accounting structure</p>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-4 border-b border-gray-200">
        <div className="flex gap-0">
          {Object.values(VIEW_MODES).map((mode) => (
            <button
              key={mode}
              onClick={() => dispatch({ type: ACTIONS.SET_VIEW_MODE, payload: mode })}
              className={`flex-1 py-2 px-4 text-sm font-medium transition ${
                state.viewMode === mode
                  ? "bg-blue-600 text-white border-b-2 border-blue-600"
                  : "text-gray-600 hover:bg-gray-50 border-b-2 border-gray-200"
              }`}
            >
              {mode === VIEW_MODES.GROUPED && "📊 Grouped View"}
              {mode === VIEW_MODES.LIST && "📋 List View"}
              {mode === VIEW_MODES.SUMMARY && "📈 Summary"}
            </button>
          ))}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Search account number or name..."
            value={state.searchTerm}
            onChange={(e) =>
              dispatch({ type: ACTIONS.SET_SEARCH_TERM, payload: e.target.value })
            }
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={state.filterGroup}
            onChange={(e) =>
              dispatch({ type: ACTIONS.SET_FILTER_GROUP, payload: e.target.value })
            }
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Sub-Groups</option>
            {state.accountGroups
              .filter((g) => g.level === 2)
              .map((group) => (
                <option key={group._id} value={group._id}>
                  {group.code} - {group.name}
                </option>
              ))}
          </select>
          <select
            value={state.filterBank}
            onChange={(e) =>
              dispatch({ type: ACTIONS.SET_FILTER_BANK, payload: e.target.value })
            }
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Accounts</option>
            <option value="true">Bank Accounts Only</option>
            <option value="false">Non-Bank Accounts</option>
          </select>
          <button
            onClick={() => handleOpenModal()}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-1.5 px-3 rounded-lg transition"
          >
            + Add Account
          </button>
        </div>
      </div>

      {/* Content */}
      {state.loading ? (
        <div className="text-center text-gray-500 py-4 text-sm">Loading...</div>
      ) : (
        <>
          {/* GROUPED VIEW */}
          {state.viewMode === VIEW_MODES.GROUPED && (
            <div className="space-y-3">
              {ACCOUNT_TYPES.map((mainType) => {
                const typeGroups = (state.accountGroups || []).filter(
                  (g) => g.type === mainType && g.level === 2
                );
                const typeAccounts = (state.accounts || []).filter((acc) => {
                  // Handle both string and object accountGroupId formats
                  const accGroupId = typeof acc.accountGroupId === 'string' 
                    ? acc.accountGroupId 
                    : acc.accountGroupId?._id;
                  return typeGroups.some((g) => g._id === accGroupId);
                });
                const totalBalance = typeAccounts.reduce(
                  (sum, acc) => sum + (acc.currentBalance || 0),
                  0
                );

                const config = ACCOUNT_TYPE_CONFIG[mainType];

                return (
                  <div key={mainType} className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {/* Level 1 Header */}
                    <div className={`${config.headerBg} text-white p-2.5`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{config.icon}</span>
                          <div>
                            <h2 className="text-base font-bold">{config.label}</h2>
                            <p className="text-xs opacity-90">
                              {typeGroups.length} Sub-Groups • {typeAccounts.length} Ledger Accounts
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{formatNumber(totalBalance)}</p>
                          <p className="text-xs opacity-90">Total Balance</p>
                        </div>
                      </div>
                    </div>

                    {/* Level 2: Sub Groups */}
                    {typeGroups.length === 0 ? (
                      <div className="p-3 text-gray-500 italic text-xs">
                        No sub-groups defined
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {typeGroups.map((group) => {
                          const groupAccounts = state.accounts.filter((acc) => {
                            // Handle both string and object accountGroupId formats
                            const accGroupId = typeof acc.accountGroupId === 'string' 
                              ? acc.accountGroupId 
                              : acc.accountGroupId?._id;
                            return accGroupId === group._id;
                          });
                          const groupBalance = groupAccounts.reduce(
                            (sum, acc) => sum + (acc.currentBalance || 0),
                            0
                          );

                          return (
                            <div key={group._id} className="bg-gray-50">
                              {/* Level 2 Header */}
                              <div className={`${config.subBg} border-l-4 ${config.border} px-3 py-2`}>
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <span className={config.text}>▸</span>
                                    <div>
                                      <h3 className="text-sm font-semibold text-gray-800">
                                        {group.name}
                                      </h3>
                                      <p className="text-xs text-gray-500">
                                        {group.code} • {group.nature} • {groupAccounts.length} accounts
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-semibold text-gray-700">
                                      {formatNumber(groupBalance)}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Level 3: Ledger Accounts */}
                              {groupAccounts.length === 0 ? (
                                <div className="px-6 py-2 text-gray-400 italic text-xs">
                                  No ledger accounts
                                </div>
                              ) : (
                                <div className="bg-white">
                                  <table className="w-full">
                                    <tbody>
                                      {groupAccounts.map((account) => (
                                        <tr
                                          key={account._id}
                                          className="border-b border-gray-100 hover:bg-gray-50 transition text-xs"
                                        >
                                          <td className="pl-8 pr-2 py-1.5 w-8">
                                            <span className="text-gray-400">└</span>
                                          </td>
                                          <td className="px-2 py-1.5 w-24 font-medium text-blue-600">
                                            {account.accountNumber}
                                          </td>
                                          <td className="px-2 py-1.5 font-medium text-gray-800">
                                            {account.accountName}
                                          </td>
                                          <td className="px-2 py-1.5 text-gray-500 max-w-xs truncate">
                                            {account.description}
                                          </td>
                                          <td className="px-2 py-1.5 text-right font-medium text-gray-700 w-24">
                                            {formatNumber(account.currentBalance || 0)}
                                          </td>
                                          <td className="px-2 py-1.5 text-center w-20">
                                            {account.isActive ? (
                                              <span className="bg-green-100 text-green-700 px-1 py-0.5 rounded text-xs">
                                                Active
                                              </span>
                                            ) : (
                                              <span className="bg-red-100 text-red-700 px-1 py-0.5 rounded text-xs">
                                                Inactive
                                              </span>
                                            )}
                                            {account.isBank && (
                                              <span className="bg-purple-100 text-purple-700 px-1 py-0.5 rounded text-xs ml-1">
                                                🏦
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-2 py-1.5 text-center w-20">
                                            <button
                                              onClick={() => handleOpenModal(account)}
                                              className="text-blue-600 hover:text-blue-800 text-xs mr-2"
                                            >
                                              Edit
                                            </button>
                                            <button
                                              onClick={() => handleDelete(account._id)}
                                              className="text-red-600 hover:text-red-800 text-xs"
                                            >
                                              Del
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* LIST VIEW */}
          {state.viewMode === VIEW_MODES.LIST && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              {filteredAccounts.length === 0 ? (
                <div className="text-center text-gray-500 py-4 text-sm">No accounts found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-blue-600 text-white">
                        <th className="border border-gray-300 px-3 py-2 text-left text-xs">
                          Account #
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-left text-xs">
                          Account Name
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-left text-xs">
                          Account Group
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-left text-xs">
                          Description
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-right text-xs">
                          Opening Balance
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-right text-xs">
                          Current Balance
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-center text-xs">
                          Status
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-center text-xs">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAccounts.map((account) => {
                        const groupName = typeof account.accountGroupId === 'string' 
                          ? state.accountGroups.find(g => g._id === account.accountGroupId)?.name || "N/A" 
                          : account.accountGroupId?.name || "N/A";
                        return (
                        <tr key={account._id} className="hover:bg-gray-50 border-b">
                          <td className="border border-gray-300 px-3 py-2 text-sm font-medium text-blue-600">
                            {account.accountNumber}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm">
                            {account.accountName}
                          </td>
                          <td className="border border-gray-300 px-3 py-2">
                            <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-xs">
                              {groupName}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-xs text-gray-600">
                            {account.description}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-right text-sm">
                            {formatNumber(account.openingBalance || 0)}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-right text-sm font-medium">
                            {formatNumber(account.currentBalance || 0)}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-center">
                            {account.isActive ? (
                              <span className="text-green-600 text-xs font-semibold">Active</span>
                            ) : (
                              <span className="text-red-600 text-xs font-semibold">Inactive</span>
                            )}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-center">
                            <button
                              onClick={() => handleOpenModal(account)}
                              className="bg-blue-500 hover:bg-blue-700 text-white py-0.5 px-2 rounded mr-1 transition text-xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(account._id)}
                              className="bg-red-500 hover:bg-red-700 text-white py-0.5 px-2 rounded transition text-xs"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SUMMARY VIEW */}
          {state.viewMode === VIEW_MODES.SUMMARY && (
            <div className="space-y-4">
              {/* Key Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
                  <p className="text-gray-600 text-xs font-semibold uppercase">Total Accounts</p>
                  <p className="text-2xl font-bold text-blue-600">{state.accounts.length}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
                  <p className="text-gray-600 text-xs font-semibold uppercase">Active Accounts</p>
                  <p className="text-2xl font-bold text-green-600">
                    {state.accounts.filter((a) => a.isActive).length}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
                  <p className="text-gray-600 text-xs font-semibold uppercase">Bank Accounts</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {state.accounts.filter((a) => a.isBank).length}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-orange-500">
                  <p className="text-gray-600 text-xs font-semibold uppercase">Sub-Groups</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {state.accountGroups.filter((g) => g.level === 2).length}
                  </p>
                </div>
              </div>

              {/* Account Groups Summary */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Sub-Groups Summary (Level 2)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {state.accountGroups
                    .filter((g) => g.level === 2)
                    .map((group) => {
                      const groupAccounts = state.accounts.filter((acc) => {
                        const accGroupId = typeof acc.accountGroupId === 'string' 
                          ? acc.accountGroupId 
                          : acc.accountGroupId?._id;
                        return accGroupId === group._id;
                      });
                      const totalBalance = groupAccounts.reduce(
                        (sum, acc) => sum + (acc.currentBalance || 0),
                        0
                      );

                      return (
                        <div
                          key={group._id}
                          className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="text-sm font-bold text-gray-800">{group.name}</h3>
                              <p className="text-xs text-gray-600">
                                {group.code} | {group.nature}
                              </p>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_COLOR_MAPPING[group.type]}`}>
                              {group.type}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">Accounts:</span>
                              <span className="font-medium text-gray-800">{groupAccounts.length}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">Total Balance:</span>
                              <span className="font-medium text-gray-800">{formatNumber(totalBalance)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">Active:</span>
                              <span className="font-medium text-green-600">
                                {groupAccounts.filter((a) => a.isActive).length}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Account Structure by Type */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Accounts by Type</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  {ACCOUNT_TYPES.map((type) => {
                    const typeAccounts = state.accounts.filter((acc) => {
                      const accGroupId = typeof acc.accountGroupId === 'string' 
                        ? acc.accountGroupId 
                        : acc.accountGroupId?._id;
                      const group = state.accountGroups.find((g) => g._id === accGroupId);
                      return group?.type === type;
                    });

                    return (
                      <div
                        key={type}
                        className={`border-l-4 p-3 rounded ${SUMMARY_TYPE_COLORS[type]}`}
                      >
                        <p className="text-xs font-semibold uppercase mb-1">{type}</p>
                        <p className="text-xl font-bold">{typeAccounts.length}</p>
                        <p className="text-xs mt-1">
                          {state.accountGroups.filter((g) => g.type === type && g.level === 2).length}{" "}
                          sub-groups
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {state.showModal && (
        <Modal
          isOpen={state.showModal}
          onClose={handleCloseModal}
          title={state.editingId ? "Edit Chart of Account" : "Add Chart of Account"}
          draggable={true}
        >
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Account Number */}
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-1">
                Account Number *
              </label>
              <input
                type="text"
                name="accountNumber"
                value={state.formData.accountNumber}
                onChange={handleInputChange}
                disabled={state.editingId}
                placeholder="e.g., ACC001"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>

            {/* Account Name */}
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-1">
                Account Name *
              </label>
              <input
                type="text"
                name="accountName"
                value={state.formData.accountName}
                onChange={handleInputChange}
                placeholder="e.g., Sales Revenue"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Account Group */}
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-1">
                Sub-Group (Level 2) *
              </label>
              <select
                name="accountGroupId"
                value={state.formData.accountGroupId}
                onChange={handleInputChange}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Sub-Group</option>
                {ACCOUNT_TYPES.map((type) => {
                  const typeGroups = state.accountGroups.filter(
                    (g) => g.type === type && g.level === 2
                  );
                  if (typeGroups.length === 0) return null;
                  return (
                    <optgroup key={type} label={`── ${type} ──`}>
                      {typeGroups.map((group) => (
                        <option key={group._id} value={group._id}>
                          {group.code} - {group.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={state.formData.description}
                onChange={handleInputChange}
                placeholder="Account description..."
                rows="2"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Opening Balance */}
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-1">
                Opening Balance
              </label>
              <input
                type="number"
                name="openingBalance"
                value={state.formData.openingBalance}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Bank Account Checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="isBank"
                checked={state.formData.isBank}
                onChange={handleInputChange}
                className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label className="ml-2 text-gray-700 text-sm font-semibold">Is Bank Account?</label>
            </div>

            {/* Bank-specific fields */}
            {state.formData.isBank && (
              <>
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    name="bankName"
                    value={state.formData.bankName}
                    onChange={handleInputChange}
                    placeholder="e.g., ABC Bank"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">
                    Account Type
                  </label>
                  <select
                    name="accountTypeBank"
                    value={state.formData.accountTypeBank}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Type</option>
                    {BANK_ACCOUNT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Active Checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={state.formData.isActive}
                onChange={handleInputChange}
                className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label className="ml-2 text-gray-700 text-sm font-semibold">Active</label>
            </div>

            {/* Submit and Cancel Buttons */}
            <div className="flex gap-3 mt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-1.5 px-3 rounded-lg transition"
              >
                {state.editingId ? "Update Account" : "Add Account"}
              </button>
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 bg-gray-400 hover:bg-gray-500 text-white text-sm font-semibold py-1.5 px-3 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}


