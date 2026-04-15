// Settings Module - Route aggregator
import settingsRoutes from './settingsRoutes.js';
import terminalManagementRoutes from './terminalManagementRoutes.js';
// Note: sequenceController is admin-only, routes may be in settings

export default {
  settingsRoutes,
  terminalManagementRoutes,
};
