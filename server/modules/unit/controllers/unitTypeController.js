import unitTypeService from '../services/unitTypeService.js';

export const createUnitType = async (req, res) => {
  try {
    const { unitName, unitSymbol, factor, unitDecimal, category, baseUnit, description, conversionNote } = req.body;

    // Validation
    if (!unitName || !unitSymbol || factor === undefined || unitDecimal === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newUnit = await unitTypeService.createUnitType({
      unitName,
      unitSymbol,
      factor,
      unitDecimal,
      category,
      baseUnit,
      description,
      conversionNote
    });

    res.status(201).json({ success: true, data: newUnit, message: 'Unit type created successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAllUnitTypes = async (req, res) => {
  try {
    const { category, isActive, baseUnitsOnly } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (baseUnitsOnly) filters.baseUnitsOnly = baseUnitsOnly === 'true';

    const units = await unitTypeService.getAllUnitTypes(filters);

    res.status(200).json({ success: true, data: units, count: units.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUnitTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const unit = await unitTypeService.getUnitTypeById(id);

    res.status(200).json({ success: true, data: unit });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

export const getUnitTypeBySymbol = async (req, res) => {
  try {
    const { symbol } = req.params;
    const unit = await unitTypeService.getUnitTypeBySymbol(symbol);

    res.status(200).json({ success: true, data: unit });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

export const updateUnitType = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedUnit = await unitTypeService.updateUnitType(id, updateData);

    res.status(200).json({ success: true, data: updatedUnit, message: 'Unit type updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteUnitType = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await unitTypeService.deleteUnitType(id);

    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getUnitsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const units = await unitTypeService.getUnitsByCategory(category);

    res.status(200).json({ success: true, data: units, count: units.length });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const convertUnits = async (req, res) => {
  try {
    const { fromSymbol, toSymbol, quantity } = req.body;

    if (!fromSymbol || !toSymbol || quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const result = await unitTypeService.convertUnits(fromSymbol, toSymbol, quantity);

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getConversionRatio = async (req, res) => {
  try {
    const { fromSymbol, toSymbol } = req.query;

    if (!fromSymbol || !toSymbol) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }

    const result = await unitTypeService.getConversionRatio(fromSymbol, toSymbol);

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createDefaultUnits = async (req, res) => {
  try {
    const result = await unitTypeService.createDefaultUnits();
    res.status(201).json({ success: true, message: result.message });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
