import { StoreSettingsService, settingsEventEmitter } from '../services/index.js';
import { catchAsync } from '../../../config/errorHandler.js';
import logger from '../../../config/logger.js';

/**
 * StoreSettingsController - Handles HTTP requests for store settings
 */

export const getStoreSettings = catchAsync(async (req, res) => {
  const settings = await StoreSettingsService.getStoreSettings();

  res.status(200).json({
    success: true,
    data: settings,
    message: 'Store settings fetched successfully',
  });
});

export const updateStoreSettings = catchAsync(async (req, res) => {
  const storeData = req.body;

  if (!storeData.storeName) {
    return res.status(400).json({
      success: false,
      message: 'Store name is required',
    });
  }

  const settings = await StoreSettingsService.updateStoreSettings(storeData);

  res.status(200).json({
    success: true,
    data: settings,
    message: 'Store settings updated successfully',
  });
});

export const getTerminalSettings = catchAsync(async (req, res) => {
  const { terminalId } = req.params;

  const terminal = await StoreSettingsService.getTerminalSettings(terminalId);

  res.status(200).json({
    success: true,
    data: terminal,
    message: 'Terminal settings fetched successfully',
  });
});

export const updateTerminalSettings = catchAsync(async (req, res) => {
  const { terminalId } = req.params;
  const terminalData = req.body;

  const terminal = await StoreSettingsService.updateTerminalSettings(
    terminalId,
    terminalData
  );

  res.status(200).json({
    success: true,
    data: terminal,
    message: 'Terminal settings updated successfully',
  });
});

export const getStoreControlSettings = catchAsync(async (req, res) => {
  const settings = await StoreSettingsService.getStoreControlSettings();

  res.status(200).json({
    success: true,
    data: settings,
    message: 'Store control settings fetched successfully',
  });
});

export const getPrinterConfiguration = catchAsync(async (req, res) => {
  const config = await StoreSettingsService.getPrinterConfiguration();

  res.status(200).json({
    success: true,
    data: config,
    message: 'Printer configuration fetched successfully',
  });
});

export const getBarcodeConfiguration = catchAsync(async (req, res) => {
  const config = await StoreSettingsService.getBarcodeConfiguration();

  res.status(200).json({
    success: true,
    data: config,
    message: 'Barcode configuration fetched successfully',
  });
});

export const checkFeatureEnabled = catchAsync(async (req, res) => {
  const { featureName } = req.params;

  const isEnabled = await StoreSettingsService.isFeatureEnabled(featureName);

  res.status(200).json({
    success: true,
    data: { enabled: isEnabled },
    message: `Feature ${featureName} status: ${isEnabled ? 'enabled' : 'disabled'}`,
  });
});

// ✅ NEW: Product Naming Rules
export const getNamingRules = catchAsync(async (req, res) => {
  const rules = await StoreSettingsService.getNamingRules();

  res.status(200).json({
    success: true,
    enabled: rules.enabled,
    convention: rules.convention,
    preventLowercase: rules.preventLowercase,
    preventAllCaps: rules.preventAllCaps,
    enforceOnSave: rules.enforceOnSave,
    checkDuplicates: rules.checkDuplicates,
    message: 'Naming rules fetched successfully',
  });
});

export const updateNamingRules = catchAsync(async (req, res) => {
  const rulesData = req.body;

  const updatedRules = await StoreSettingsService.updateNamingRules(rulesData);

  res.status(200).json({
    success: true,
    enabled: updatedRules.enabled,
    convention: updatedRules.convention,
    preventLowercase: updatedRules.preventLowercase,
    preventAllCaps: updatedRules.preventAllCaps,
    enforceOnSave: updatedRules.enforceOnSave,
    checkDuplicates: updatedRules.checkDuplicates,
    message: 'Naming rules updated successfully',
  });
});

// ✅ NEW: Fresh naming rules on login (bypasses cache)
export const getFreshNamingRules = catchAsync(async (req, res) => {
  logger.info('🔄 Fresh naming rules requested (user login detected)');
  const rules = await StoreSettingsService.forceRefreshNamingRules();

  res.status(200).json({
    success: true,
    enabled: rules.enabled,
    convention: rules.convention,
    preventLowercase: rules.preventLowercase,
    preventAllCaps: rules.preventAllCaps,
    enforceOnSave: rules.enforceOnSave,
    checkDuplicates: rules.checkDuplicates,
    cached: false,
    message: 'Fresh naming rules fetched from database',
  });
});

// ✅ NEW: Subscribe to real-time naming rules changes (Server-Sent Events)
export const subscribeToNamingRulesChanges = (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  logger.info('🔔 Client subscribed to naming rules updates (SSE)');

  // Send initial connection message
  res.write('data: {"type":"connected","message":"Connected to naming rules updates stream"}\n\n');

  // Listen for naming rules update events
  const onNamingRulesUpdate = (data) => {
    logger.info('📤 Pushing naming rules update to subscribed client');
    res.write(`data: ${JSON.stringify({
      type: 'naming-rules-updated',
      ...data
    })}\n\n`);
  };

  // Attach event listener
  settingsEventEmitter.on('naming-rules-updated', onNamingRulesUpdate);

  // Handle client disconnect
  req.on('close', () => {
    logger.info('❌ Client disconnected from naming rules updates stream');
    settingsEventEmitter.removeListener('naming-rules-updated', onNamingRulesUpdate);
    res.end();
  });

  // Prevent timeout
  const keepAliveInterval = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 30000); // Send keepalive every 30 seconds

  req.on('close', () => {
    clearInterval(keepAliveInterval);
  });
};
