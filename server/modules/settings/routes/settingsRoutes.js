import express from 'express';
import * as settingsController from '../controllers/settingsController.js';
import * as storeSettingsController from '../controllers/storeSettingsController.js';
import printerConfigurationRoutes from './printerConfigurationRoutes.js';

const router = express.Router();

// Company Settings Routes
router.get('/company', settingsController.getCompanySettings);
router.post('/company', settingsController.updateCompanySettings);
router.put('/company', settingsController.updateCompanySettings);

// License Routes
router.get('/license', settingsController.getLicense);
router.post('/license/validate', settingsController.validateLicense);

// System Settings Routes
router.get('/system', settingsController.getSystemSettings);
router.post('/system', settingsController.updateSystemSettings);
router.put('/system', settingsController.updateSystemSettings);

// Store Settings Routes
router.get('/store', storeSettingsController.getStoreSettings);
router.post('/store', storeSettingsController.updateStoreSettings);
router.put('/store', storeSettingsController.updateStoreSettings);

// Terminal Settings Routes
router.get('/store/terminal/:terminalId', storeSettingsController.getTerminalSettings);
router.post('/store/terminal/:terminalId', storeSettingsController.updateTerminalSettings);
router.put('/store/terminal/:terminalId', storeSettingsController.updateTerminalSettings);

// Store Control Settings Routes
router.get('/store/controls', storeSettingsController.getStoreControlSettings);

// Printer Configuration Routes
router.get('/store/printer', storeSettingsController.getPrinterConfiguration);

// Barcode Configuration Routes
router.get('/store/barcode', storeSettingsController.getBarcodeConfiguration);

// Feature Check Routes
router.get('/store/feature/:featureName', storeSettingsController.checkFeatureEnabled);

// ✅ NEW: Printer Configuration Templates Routes
router.use('/printer-configurations', printerConfigurationRoutes);

// ✅ NEW: Product Naming Rules Routes
router.get('/naming-rules', storeSettingsController.getNamingRules);
router.get('/naming-rules/fresh', storeSettingsController.getFreshNamingRules); // ✅ Fresh on login
router.get('/naming-rules/subscribe', storeSettingsController.subscribeToNamingRulesChanges); // ✅ Real-time SSE
router.post('/naming-rules', storeSettingsController.updateNamingRules);
router.put('/naming-rules', storeSettingsController.updateNamingRules);

// Get All Settings Combined
router.get('/', settingsController.getAllSettings);

export default router;
