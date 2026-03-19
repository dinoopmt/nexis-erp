import express from 'express';
import * as unitTypeController from '../controllers/unitTypeController.js';

const router = express.Router();

// Create a new unit type
router.post('/create', unitTypeController.createUnitType);

// Get all unit types with filters
router.get('/', unitTypeController.getAllUnitTypes);

// Get unit type by ID
router.get('/id/:id', unitTypeController.getUnitTypeById);

// Get unit type by symbol
router.get('/symbol/:symbol', unitTypeController.getUnitTypeBySymbol);

// Get units by category
router.get('/category/:category', unitTypeController.getUnitsByCategory);

// Update unit type
router.put('/update/:id', unitTypeController.updateUnitType);

// Delete unit type
router.delete('/delete/:id', unitTypeController.deleteUnitType);

// Convert between units
router.post('/convert', unitTypeController.convertUnits);

// Get conversion ratio
router.get('/ratio', unitTypeController.getConversionRatio);

// Create default units
router.post('/default/create', unitTypeController.createDefaultUnits);

export default router;
