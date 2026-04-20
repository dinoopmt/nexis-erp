/**
 * Financial Year Reducer
 * Manages view modes, edit state, and modal visibility
 */

import { INITIAL_FORM_DATA } from './constants';

export const FY_ACTIONS = {
  SET_FINANCIAL_YEARS: 'SET_FINANCIAL_YEARS',
  SET_LOADING: 'SET_LOADING',
  SET_VIEW_MODE: 'SET_VIEW_MODE',
  SET_MODAL_STATE: 'SET_MODAL_STATE',
  SET_FORM_DATA: 'SET_FORM_DATA',
  SET_EDITING_ID: 'SET_EDITING_ID',
  RESET_FORM: 'RESET_FORM',
  SET_SEARCH_TERM: 'SET_SEARCH_TERM',
  SET_ERROR: 'SET_ERROR',
};

export const fyInitialState = {
  financialYears: [],
  loading: false,
  viewMode: 'list',
  showModal: false,
  editingId: null,
  searchTerm: '',
  error: null,
  formData: INITIAL_FORM_DATA,
};

export function fyReducer(state, action) {
  switch (action.type) {
    case FY_ACTIONS.SET_FINANCIAL_YEARS:
      return { ...state, financialYears: action.payload };

    case FY_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    case FY_ACTIONS.SET_VIEW_MODE:
      return { ...state, viewMode: action.payload };

    case FY_ACTIONS.SET_MODAL_STATE:
      return { ...state, showModal: action.payload };

    case FY_ACTIONS.SET_FORM_DATA:
      return {
        ...state,
        formData: { ...state.formData, ...action.payload },
      };

    case FY_ACTIONS.SET_EDITING_ID:
      return { ...state, editingId: action.payload };

    case FY_ACTIONS.RESET_FORM:
      return {
        ...state,
        formData: INITIAL_FORM_DATA,
        editingId: null,
        showModal: false,
      };

    case FY_ACTIONS.SET_SEARCH_TERM:
      return { ...state, searchTerm: action.payload };

    case FY_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };

    default:
      return state;
  }
}
