/**
 * Chart of Accounts Constants
 * Centralized configuration for account types, view modes, and API endpoints
 */

export const API_ENDPOINTS = {
  FETCH_ACCOUNTS: "/chart-of-accounts/getchartofaccounts",
  FETCH_GROUPS: "/account-groups/getaccountgroups",
  ADD_ACCOUNT: "/chart-of-accounts/addchartofaccount",
  UPDATE_ACCOUNT: "/chart-of-accounts/updatechartofaccount",
  DELETE_ACCOUNT: "/chart-of-accounts/deletechartofaccount"
};

export const VIEW_MODES = {
  GROUPED: "grouped",
  LIST: "list",
  SUMMARY: "summary"
};

export const ACCOUNT_TYPES = [
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "INCOME",
  "EXPENSE"
];

export const ACCOUNT_TYPE_CONFIG = {
  ASSET: {
    icon: "💰",
    label: "Assets",
    headerBg: "bg-blue-600",
    subBg: "bg-blue-50",
    border: "border-blue-400",
    text: "text-blue-600",
    color: "blue"
  },
  LIABILITY: {
    icon: "📋",
    label: "Liabilities",
    headerBg: "bg-red-600",
    subBg: "bg-red-50",
    border: "border-red-400",
    text: "text-red-600",
    color: "red"
  },
  EQUITY: {
    icon: "🏛️",
    label: "Equity",
    headerBg: "bg-green-600",
    subBg: "bg-green-50",
    border: "border-green-400",
    text: "text-green-600",
    color: "green"
  },
  INCOME: {
    icon: "📈",
    label: "Income",
    headerBg: "bg-purple-600",
    subBg: "bg-purple-50",
    border: "border-purple-400",
    text: "text-purple-600",
    color: "purple"
  },
  EXPENSE: {
    icon: "📉",
    label: "Expenses",
    headerBg: "bg-orange-600",
    subBg: "bg-orange-50",
    border: "border-orange-400",
    text: "text-orange-600",
    color: "orange"
  }
};

export const BANK_ACCOUNT_TYPES = ["Savings", "Current", "Cash"];

export const INITIAL_FORM_DATA = {
  accountNumber: "",
  accountName: "",
  accountGroupId: "",
  description: "",
  openingBalance: "",
  isActive: true,
  isBank: false,
  bankName: "",
  accountTypeBank: ""
};

export const TYPE_COLOR_MAPPING = {
  ASSET: "bg-blue-100 text-blue-800",
  LIABILITY: "bg-red-100 text-red-800",
  EQUITY: "bg-green-100 text-green-800",
  INCOME: "bg-purple-100 text-purple-800",
  EXPENSE: "bg-orange-100 text-orange-800"
};

export const SUMMARY_TYPE_COLORS = {
  ASSET: "bg-blue-50 border-blue-500 text-blue-800",
  LIABILITY: "bg-red-50 border-red-500 text-red-800",
  EQUITY: "bg-green-50 border-green-500 text-green-800",
  INCOME: "bg-purple-50 border-purple-500 text-purple-800",
  EXPENSE: "bg-orange-50 border-orange-500 text-orange-800"
};

export const ERROR_MESSAGES = {
  FETCH_ACCOUNTS: "Error fetching chart of accounts",
  FETCH_GROUPS: "Error fetching account groups",
  SAVE_ACCOUNT: "Error saving chart of account",
  DELETE_ACCOUNT: "Error deleting chart of account",
  REQUIRED_FIELDS: "Please fill in all required fields"
};
