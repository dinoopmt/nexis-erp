import { StoreSettingsService } from '../services/index.js';
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
