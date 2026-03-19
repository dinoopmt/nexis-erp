import { INITIAL_FORM_DATA } from "./constants";

/**
 * Action types for the accounts reducer
 */
export const ACTIONS = {
  SET_ACCOUNTS: "SET_ACCOUNTS",
  SET_GROUPS: "SET_GROUPS",
  SET_LOADING: "SET_LOADING",
  SET_MODAL_STATE: "SET_MODAL_STATE",
  SET_FORM_DATA: "SET_FORM_DATA",
  RESET_FORM: "RESET_FORM",
  SET_SEARCH_TERM: "SET_SEARCH_TERM",
  SET_FILTER_GROUP: "SET_FILTER_GROUP",
  SET_FILTER_BANK: "SET_FILTER_BANK",
  SET_VIEW_MODE: "SET_VIEW_MODE",
  SET_EDITING_ID: "SET_EDITING_ID"
};

/**
 * Initial state for the reducer
 */
export const initialState = {
  accounts: [],
  accountGroups: [],
  loading: false,
  showModal: false,
  editingId: null,
  searchTerm: "",
  filterGroup: "",
  filterBank: "",
  viewMode: "grouped",
  formData: INITIAL_FORM_DATA
};

/**
 * Reducer function for managing component state
 */
export function accountsReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_ACCOUNTS:
      return { ...state, accounts: action.payload };

    case ACTIONS.SET_GROUPS:
      return { ...state, accountGroups: action.payload };

    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    case ACTIONS.SET_MODAL_STATE:
      return { ...state, showModal: action.payload };

    case ACTIONS.SET_FORM_DATA:
      return {
        ...state,
        formData: { ...state.formData, ...action.payload }
      };

    case ACTIONS.RESET_FORM:
      return {
        ...state,
        formData: INITIAL_FORM_DATA,
        editingId: null
      };

    case ACTIONS.SET_SEARCH_TERM:
      return { ...state, searchTerm: action.payload };

    case ACTIONS.SET_FILTER_GROUP:
      return { ...state, filterGroup: action.payload };

    case ACTIONS.SET_FILTER_BANK:
      return { ...state, filterBank: action.payload };

    case ACTIONS.SET_VIEW_MODE:
      return { ...state, viewMode: action.payload };

    case ACTIONS.SET_EDITING_ID:
      return { ...state, editingId: action.payload };

    default:
      return state;
  }
}
