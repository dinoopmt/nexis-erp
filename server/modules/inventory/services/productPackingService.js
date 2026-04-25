import ProductPacking from '../../../Models/ProductPacking.js';
import UnitType from '../../../Models/UnitType.js';
import AddProduct from '../../../Models/AddProduct.js';

class ProductPackingService {
  /**
   * Create a new product packing option
   */
  async createPacking(packingData) {
    try {
      // Validate product exists
      const product = await AddProduct.findById(packingData.productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Validate unit type exists
      const unitType = await UnitType.findById(packingData.unitType);
      if (!unitType) {
        throw new Error('Unit type not found');
      }

      // Check for duplicate packing symbol for same product
      const existingPacking = await ProductPacking.findOne({
        productId: packingData.productId,
        packingSymbol: packingData.packingSymbol,
      });

      if (existingPacking) {
        throw new Error(`Packing symbol '${packingData.packingSymbol}' already exists for this product`);
      }

      // If this is default, unset other defaults
      if (packingData.isDefault) {
        await ProductPacking.updateMany(
          { productId: packingData.productId, isDefault: true },
          { isDefault: false }
        );
      }

      const packing = new ProductPacking(packingData);
      await packing.save();
      return await packing.populate(['productId', 'unitType']);
    } catch (error) {
      throw new Error(`Failed to create packing: ${error.message}`);
    }
  }

  /**
   * Get all packings for a product
   */
  async getPackingsByProduct(productId, filters = {}) {
    try {
      const query = { productId };

      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      const packings = await ProductPacking.find(query)
        .populate('unitType')
        .populate('productId')
        .sort({ isDefault: -1, createdAt: 1 });

      return packings;
    } catch (error) {
      throw new Error(`Failed to get packings: ${error.message}`);
    }
  }

  /**
   * Get single packing by ID
   */
  async getPackingById(packingId) {
    try {
      const packing = await ProductPacking.findById(packingId)
        .populate('unitType')
        .populate('productId');

      if (!packing) {
        throw new Error('Packing not found');
      }

      return packing;
    } catch (error) {
      throw new Error(`Failed to get packing: ${error.message}`);
    }
  }

  /**
   * Get default packing for product
   */
  async getDefaultPacking(productId) {
    try {
      const packing = await ProductPacking.findOne({
        productId,
        isDefault: true,
        isActive: true,
      })
        .populate('unitType')
        .populate('productId');

      if (!packing) {
        // Return first active packing if no default
        return await ProductPacking.findOne({
          productId,
          isActive: true,
        })
          .populate('unitType')
          .populate('productId');
      }

      return packing;
    } catch (error) {
      throw new Error(`Failed to get default packing: ${error.message}`);
    }
  }

  /**
   * Update packing details
   */
  async updatePacking(packingId, updateData) {
    try {
      // If setting as default, unset others
      if (updateData.isDefault === true) {
        const packing = await ProductPacking.findById(packingId);
        if (packing) {
          await ProductPacking.updateMany(
            { productId: packing.productId, _id: { $ne: packingId }, isDefault: true },
            { isDefault: false }
          );
        }
      }

      const packing = await ProductPacking.findByIdAndUpdate(packingId, updateData, {
        returnDocument: 'after',
        runValidators: true,
      })
        .populate('unitType')
        .populate('productId');

      if (!packing) {
        throw new Error('Packing not found');
      }

      return packing;
    } catch (error) {
      throw new Error(`Failed to update packing: ${error.message}`);
    }
  }

  /**
   * Delete packing
   */
  async deletePacking(packingId) {
    try {
      const packing = await ProductPacking.findByIdAndDelete(packingId);

      if (!packing) {
        throw new Error('Packing not found');
      }

      // If deleted packing was default, set first remaining as default
      const remainingPackings = await ProductPacking.find({
        productId: packing.productId,
        isActive: true,
      }).sort({ createdAt: 1 });

      if (remainingPackings.length > 0 && !remainingPackings.some(p => p.isDefault)) {
        await ProductPacking.findByIdAndUpdate(remainingPackings[0]._id, { isDefault: true });
      }

      return packing;
    } catch (error) {
      throw new Error(`Failed to delete packing: ${error.message}`);
    }
  }

  /**
   * Convert quantity from one packing to another
   * Example: Convert 2 boxes to loose pieces
   */
  async convertPackingQuantity(productId, fromPackingId, toPackingId, quantity) {
    try {
      const fromPacking = await ProductPacking.findOne({
        _id: fromPackingId,
        productId,
      });

      const toPacking = await ProductPacking.findOne({
        _id: toPackingId,
        productId,
      });

      if (!fromPacking || !toPacking) {
        throw new Error('One or both packings not found for this product');
      }

      // Convert to base units
      const baseUnits = quantity * fromPacking.packingFactor;

      // Convert to target packing
      if (toPacking.packingFactor === 0) {
        throw new Error('Cannot convert: target packing factor is zero');
      }

      const convertedQuantity = baseUnits / toPacking.packingFactor;

      return {
        fromPacking: {
          name: fromPacking.packingName,
          symbol: fromPacking.packingSymbol,
          quantity,
        },
        toPacking: {
          name: toPacking.packingName,
          symbol: toPacking.packingSymbol,
          quantity: convertedQuantity,
        },
        baseUnitQuantity: baseUnits,
        conversionFormula: `${quantity} ${fromPacking.packingSymbol} × ${fromPacking.packingFactor} ÷ ${toPacking.packingFactor} = ${convertedQuantity.toFixed(2)} ${toPacking.packingSymbol}`,
      };
    } catch (error) {
      throw new Error(`Failed to convert packing quantity: ${error.message}`);
    }
  }

  /**
   * Calculate cost for packing quantity
   */
  async calculatePackingCost(packingId, quantity) {
    try {
      const packing = await ProductPacking.findById(packingId);

      if (!packing) {
        throw new Error('Packing not found');
      }

      const totalCost = packing.packingPrice * quantity;
      const unitCost = packing.packingPrice / packing.quantity;

      return {
        packing: {
          name: packing.packingName,
          symbol: packing.packingSymbol,
          packingPrice: packing.packingPrice,
        },
        quantity,
        totalCost: totalCost.toFixed(2),
        unitCost: unitCost.toFixed(2),
        baseUnitCost: (packing.packingPrice / packing.baseUnitQuantity).toFixed(2),
      };
    } catch (error) {
      throw new Error(`Failed to calculate cost: ${error.message}`);
    }
  }

  /**
   * Get packing statistics
   */
  async getPackingStats(productId) {
    try {
      const packings = await ProductPacking.find({ productId });

      if (packings.length === 0) {
        throw new Error('No packings found for this product');
      }

      const stats = {
        totalPackings: packings.length,
        activePackings: packings.filter(p => p.isActive).length,
        defaultPacking: packings.find(p => p.isDefault),
        packings: packings.map(p => ({
          _id: p._id,
          name: p.packingName,
          symbol: p.packingSymbol,
          factor: p.packingFactor,
          quantity: p.quantity,
          price: p.packingPrice,
          stock: p.stock,
          isDefault: p.isDefault,
          isActive: p.isActive,
        })),
      };

      return stats;
    } catch (error) {
      throw new Error(`Failed to get packing stats: ${error.message}`);
    }
  }

  /**
   * Bulk create packings from template
   */
  async createPackingsFromTemplate(productId, template) {
    try {
      const product = await AddProduct.findById(productId).populate('unitType');
      if (!product) {
        throw new Error('Product not found');
      }

      const createdPackings = [];

      for (let i = 0; i < template.length; i++) {
        const packingData = {
          productId,
          packingName: template[i].name,
          packingSymbol: template[i].symbol,
          packingFactor: template[i].factor,
          quantity: template[i].quantity,
          unitType: product.unitType._id,
          packingPrice: template[i].price || 0,
          isDefault: i === 0,
          isActive: true,
        };

        const packing = await this.createPacking(packingData);
        createdPackings.push(packing);
      }

      return createdPackings;
    } catch (error) {
      throw new Error(`Failed to create packings from template: ${error.message}`);
    }
  }

  /**
   * Update packing stock
   */
  async updatePackingStock(packingId, quantity) {
    try {
      const packing = await ProductPacking.findByIdAndUpdate(
        packingId,
        { stock: quantity },
        { returnDocument: 'after', runValidators: true }
      );

      if (!packing) {
        throw new Error('Packing not found');
      }

      return packing;
    } catch (error) {
      throw new Error(`Failed to update packing stock: ${error.message}`);
    }
  }

  /**
   * Adjust packing stock (increment/decrement)
   */
  async adjustPackingStock(packingId, adjustment) {
    try {
      const packing = await ProductPacking.findById(packingId);

      if (!packing) {
        throw new Error('Packing not found');
      }

      const newStock = packing.stock + adjustment;

      if (newStock < 0) {
        throw new Error('Insufficient stock to adjust');
      }

      packing.stock = newStock;
      await packing.save();

      return packing;
    } catch (error) {
      throw new Error(`Failed to adjust packing stock: ${error.message}`);
    }
  }

  /**
   * Get low stock packings for a product
   */
  async getLowStockPackings(productId) {
    try {
      const packings = await ProductPacking.find({
        productId,
        isActive: true,
        $expr: { $lte: ['$stock', '$reorderLevel'] },
      }).populate('unitType');

      return packings;
    } catch (error) {
      throw new Error(`Failed to get low stock packings: ${error.message}`);
    }
  }
}

export default new ProductPackingService();
