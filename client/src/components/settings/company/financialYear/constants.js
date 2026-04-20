/**
 * Financial Year Management Constants
 * View modes, actions, and status configurations
 */

export const FY_VIEW_MODES = {
  LIST: 'list',
  SUMMARY: 'summary',
  TIMELINE: 'timeline'
};

export const FY_STATUSES = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  LOCKED: 'LOCKED'
};

export const STATUS_CONFIG = {
  OPEN: {
    badge: 'bg-green-100 text-green-800',
    icon: '✓',
    label: 'Open',
    allowEdit: true,
    allowClose: true,
    allowLock: true
  },
  CLOSED: {
    badge: 'bg-yellow-100 text-yellow-800',
    icon: '○',
    label: 'Closed',
    allowEdit: false,
    allowClose: false,
    allowLock: false
  },
  LOCKED: {
    badge: 'bg-red-100 text-red-800',
    icon: '🔒',
    label: 'Locked',
    allowEdit: false,
    allowClose: false,
    allowLock: false
  }
};

export const INITIAL_FORM_DATA = {
  yearCode: '',
  yearName: '',
  startDate: '',
  endDate: '',
  status: 'OPEN',
  isCurrent: false,
  allowPosting: true,
};

export const API_ENDPOINTS = {
  FETCH_FY: '/financial-years',
  CREATE_FY: '/financial-years',
  UPDATE_FY: (id) => `/financial-years/${id}`,
  DELETE_FY: (id) => `/financial-years/${id}`,
  SET_CURRENT: (id) => `/financial-years/${id}/set-current`,
  CLOSE_YEAR: (id) => `/financial-years/${id}/close`,
  LOCK_YEAR: (id) => `/financial-years/${id}/lock`,
  REOPEN_YEAR: (id) => `/financial-years/${id}/reopen`,
};
