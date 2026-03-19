import UnitType from '../../../Models/UnitType.js';

class UnitTypeService {
  // Create a new unit type
  async createUnitType(unitTypeData) {
    try {
      const { unitName, unitSymbol, factor, unitDecimal, category, baseUnit } = unitTypeData;

      // Check if unit already exists
      const existingUnit = await UnitType.findOne({
        $or: [{ unitName: unitName.toLowerCase() }, { unitSymbol: unitSymbol.toUpperCase() }]
      });

      if (existingUnit) {
        throw new Error(`Unit with name "${unitName}" or symbol "${unitSymbol}" already exists`);
      }

      // If baseUnit is true, ensure no other base unit exists for this category
      if (baseUnit) {
        const existingBaseUnit = await UnitType.findOne({ category, baseUnit: true });
        if (existingBaseUnit) {
          throw new Error(`Base unit already exists for category "${category}"`);
        }
      }

      const newUnit = new UnitType({
        unitName: unitName.trim(),
        unitSymbol: unitSymbol.toUpperCase().trim(),
        factor,
        unitDecimal,
        category,
        baseUnit,
        description: unitTypeData.description || '',
        conversionNote: unitTypeData.conversionNote || ''
      });

      await newUnit.save();
      return newUnit;
    } catch (error) {
      throw new Error(`Error creating unit type: ${error.message}`);
    }
  }

  // Get all unit types with filters
  async getAllUnitTypes(filters = {}) {
    try {
      const query = {};

      if (filters.category) {
        query.category = filters.category;
      }

      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      if (filters.baseUnitsOnly) {
        query.baseUnit = true;
      }

      const units = await UnitType.find(query).sort({ category: 1, unitName: 1 });
      return units;
    } catch (error) {
      throw new Error(`Error fetching unit types: ${error.message}`);
    }
  }

  // Get unit type by ID
  async getUnitTypeById(id) {
    try {
      const unit = await UnitType.findById(id);
      if (!unit) {
        throw new Error('Unit type not found');
      }
      return unit;
    } catch (error) {
      throw new Error(`Error fetching unit type: ${error.message}`);
    }
  }

  // Get unit type by symbol
  async getUnitTypeBySymbol(symbol) {
    try {
      const unit = await UnitType.findOne({ unitSymbol: symbol.toUpperCase() });
      if (!unit) {
        throw new Error(`Unit with symbol "${symbol}" not found`);
      }
      return unit;
    } catch (error) {
      throw new Error(`Error fetching unit type: ${error.message}`);
    }
  }

  // Update unit type
  async updateUnitType(id, updateData) {
    try {
      const unit = await UnitType.findById(id);
      if (!unit) {
        throw new Error('Unit type not found');
      }

      // Check for duplicate unit name (excluding current unit)
      if (updateData.unitName && updateData.unitName !== unit.unitName) {
        const duplicate = await UnitType.findOne({
          unitName: updateData.unitName.toLowerCase(),
          _id: { $ne: id }
        });
        if (duplicate) {
          throw new Error(`Unit with name "${updateData.unitName}" already exists`);
        }
      }

      // Check for duplicate symbol (excluding current unit)
      if (updateData.unitSymbol && updateData.unitSymbol !== unit.unitSymbol) {
        const duplicate = await UnitType.findOne({
          unitSymbol: updateData.unitSymbol.toUpperCase(),
          _id: { $ne: id }
        });
        if (duplicate) {
          throw new Error(`Unit with symbol "${updateData.unitSymbol}" already exists`);
        }
      }

      // If changing to baseUnit, check category doesn't have another base unit
      if (updateData.baseUnit && !unit.baseUnit) {
        const existingBase = await UnitType.findOne({
          category: updateData.category || unit.category,
          baseUnit: true,
          _id: { $ne: id }
        });
        if (existingBase) {
          throw new Error(`Base unit already exists for this category`);
        }
      }

      // Update fields
      if (updateData.unitName) unit.unitName = updateData.unitName.trim();
      if (updateData.unitSymbol) unit.unitSymbol = updateData.unitSymbol.toUpperCase().trim();
      if (updateData.factor !== undefined) unit.factor = updateData.factor;
      if (updateData.unitDecimal !== undefined) unit.unitDecimal = updateData.unitDecimal;
      if (updateData.category) unit.category = updateData.category;
      if (updateData.baseUnit !== undefined) unit.baseUnit = updateData.baseUnit;
      if (updateData.description !== undefined) unit.description = updateData.description;
      if (updateData.isActive !== undefined) unit.isActive = updateData.isActive;
      if (updateData.conversionNote !== undefined) unit.conversionNote = updateData.conversionNote;

      await unit.save();
      return unit;
    } catch (error) {
      throw new Error(`Error updating unit type: ${error.message}`);
    }
  }

  // Delete unit type
  async deleteUnitType(id) {
    try {
      const unit = await UnitType.findById(id);
      if (!unit) {
        throw new Error('Unit type not found');
      }

      // Prevent deletion if it's a base unit
      if (unit.baseUnit) {
        throw new Error(`Cannot delete base unit "${unit.unitName}". Set "baseUnit" to false first.`);
      }

      await UnitType.findByIdAndDelete(id);
      return { message: 'Unit type deleted successfully' };
    } catch (error) {
      throw new Error(`Error deleting unit type: ${error.message}`);
    }
  }

  // Convert between units
  async convertUnits(fromSymbol, toSymbol, quantity) {
    try {
      const fromUnit = await this.getUnitTypeBySymbol(fromSymbol);
      const toUnit = await this.getUnitTypeBySymbol(toSymbol);

      if (fromUnit.category !== toUnit.category) {
        throw new Error(`Cannot convert between different categories: ${fromUnit.category} and ${toUnit.category}`);
      }

      // Find base unit for the category
      const baseUnit = await UnitType.findOne({ category: fromUnit.category, baseUnit: true });
      if (!baseUnit) {
        throw new Error(`No base unit found for category ${fromUnit.category}`);
      }

      // Convert to base unit, then to target unit
      const quantityInBase = quantity * fromUnit.factor;
      const quantityInTarget = quantityInBase / toUnit.factor;

      return {
        fromSymbol,
        toSymbol,
        originalQuantity: quantity,
        convertedQuantity: Number(quantityInTarget.toFixed(toUnit.unitDecimal)),
        category: fromUnit.category
      };
    } catch (error) {
      throw new Error(`Error converting units: ${error.message}`);
    }
  }

  // Get conversion ratio between two units
  async getConversionRatio(fromSymbol, toSymbol) {
    try {
      const fromUnit = await this.getUnitTypeBySymbol(fromSymbol);
      const toUnit = await this.getUnitTypeBySymbol(toSymbol);

      if (fromUnit.category !== toUnit.category) {
        throw new Error(`Cannot convert between different categories`);
      }

      const ratio = fromUnit.factor / toUnit.factor;
      return {
        from: fromSymbol,
        to: toSymbol,
        ratio: ratio,
        formula: `${fromSymbol} * ${ratio} = ${toSymbol}`
      };
    } catch (error) {
      throw new Error(`Error getting conversion ratio: ${error.message}`);
    }
  }

  // Get units by category
  async getUnitsByCategory(category) {
    try {
      if (!['WEIGHT', 'LENGTH', 'VOLUME', 'QUANTITY', 'AREA', 'OTHER'].includes(category)) {
        throw new Error('Invalid category');
      }

      const units = await UnitType.find({ category, isActive: true }).sort({ baseUnit: -1, unitName: 1 });
      return units;
    } catch (error) {
      throw new Error(`Error fetching units by category: ${error.message}`);
    }
  }

  // Bulk create default units
  async createDefaultUnits() {
    try {
      const defaultUnits = [
        // WEIGHT
        { unitName: 'Kilogram', unitSymbol: 'KG', factor: 1, unitDecimal: 2, category: 'WEIGHT', baseUnit: true },
        { unitName: 'Gram', unitSymbol: 'G', factor: 0.001, unitDecimal: 3, category: 'WEIGHT' },
        { unitName: 'Milligram', unitSymbol: 'MG', factor: 0.000001, unitDecimal: 4, category: 'WEIGHT' },
        { unitName: 'Pound', unitSymbol: 'LB', factor: 0.453592, unitDecimal: 2, category: 'WEIGHT' },
        { unitName: 'Ounce', unitSymbol: 'OZ', factor: 0.0283495, unitDecimal: 3, category: 'WEIGHT' },
        // VOLUME
        { unitName: 'Liter', unitSymbol: 'L', factor: 1, unitDecimal: 2, category: 'VOLUME', baseUnit: true },
        { unitName: 'Milliliter', unitSymbol: 'ML', factor: 0.001, unitDecimal: 2, category: 'VOLUME' },
        { unitName: 'Gallon', unitSymbol: 'GAL', factor: 3.78541, unitDecimal: 2, category: 'VOLUME' },
        // LENGTH
        { unitName: 'Meter', unitSymbol: 'M', factor: 1, unitDecimal: 2, category: 'LENGTH', baseUnit: true },
        { unitName: 'Centimeter', unitSymbol: 'CM', factor: 0.01, unitDecimal: 2, category: 'LENGTH' },
        { unitName: 'Millimeter', unitSymbol: 'MM', factor: 0.001, unitDecimal: 2, category: 'LENGTH' },
        { unitName: 'Kilometer', unitSymbol: 'KM', factor: 1000, unitDecimal: 2, category: 'LENGTH' },
        { unitName: 'Foot', unitSymbol: 'FT', factor: 0.3048, unitDecimal: 2, category: 'LENGTH' },
        { unitName: 'Inch', unitSymbol: 'IN', factor: 0.0254, unitDecimal: 2, category: 'LENGTH' },
        // QUANTITY
        { unitName: 'Piece', unitSymbol: 'PC', factor: 1, unitDecimal: 0, category: 'QUANTITY', baseUnit: true },
        { unitName: 'Pack', unitSymbol: 'PK', factor: 1, unitDecimal: 0, category: 'QUANTITY' },
        { unitName: 'Dozen', unitSymbol: 'DZ', factor: 12, unitDecimal: 0, category: 'QUANTITY' },
        { unitName: 'Box', unitSymbol: 'BX', factor: 1, unitDecimal: 0, category: 'QUANTITY' },
        // AREA
        { unitName: 'Square Meter', unitSymbol: 'SQM', factor: 1, unitDecimal: 2, category: 'AREA', baseUnit: true },
        { unitName: 'Square Centimeter', unitSymbol: 'SQCM', factor: 0.0001, unitDecimal: 2, category: 'AREA' },
        { unitName: 'Square Foot', unitSymbol: 'SQFT', factor: 0.092903, unitDecimal: 2, category: 'AREA' }
      ];

      for (const unit of defaultUnits) {
        const exists = await UnitType.findOne({ unitSymbol: unit.unitSymbol });
        if (!exists) {
          await this.createUnitType(unit);
        }
      }

      return { message: 'Default units created successfully' };
    } catch (error) {
      throw new Error(`Error creating default units: ${error.message}`);
    }
  }
}

export default new UnitTypeService();
