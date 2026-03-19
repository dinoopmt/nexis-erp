/**
 * HSN (Harmonized System of Nomenclature) Service
 * Manages tax classification codes and rates
 */

import HSNMaster from '../../../Models/HSNMaster.js';
import logger from '../../../config/logger.js';

class HSNService {
  /**
   * Validate HSN code format
   * Must be 6 digits
   */
  validateHSNCode(code) {
    try {
      if (!code || typeof code !== 'string') {
        const error = new Error('HSN code must be a string');
        error.status = 400;
        throw error;
      }

      const trimmedCode = code.trim();

      if (!/^\d{6}$/.test(trimmedCode)) {
        const error = new Error('HSN code must be exactly 6 digits');
        error.status = 400;
        throw error;
      }

      return trimmedCode;
    } catch (error) {
      logger.error('Error validating HSN code', { code, error });
      throw error;
    }
  }

  /**
   * Validate tax rate
   */
  validateTaxRate(rate) {
    try {
      const parsedRate = parseFloat(rate);

      if (isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100) {
        const error = new Error('Tax rate must be a number between 0 and 100');
        error.status = 400;
        throw error;
      }

      return parsedRate;
    } catch (error) {
      logger.error('Error validating tax rate', { rate, error });
      throw error;
    }
  }

  /**
   * Create HSN code
   */
  async createHSN(hsnData) {
    try {
      const { code, description, chapter, heading, subHeading, gstRate, country } = hsnData;

      // Validation
      const validatedCode = this.validateHSNCode(code);

      if (!description || !description.trim()) {
        const error = new Error('Description is required');
        error.status = 400;
        throw error;
      }

      const chapterNum = parseInt(chapter);
      if (isNaN(chapterNum) || chapterNum < 1 || chapterNum > 99) {
        const error = new Error('Chapter must be between 1 and 99');
        error.status = 400;
        throw error;
      }

      const headingNum = parseInt(heading);
      if (isNaN(headingNum) || headingNum < 0 || headingNum > 99) {
        const error = new Error('Heading must be between 0 and 99');
        error.status = 400;
        throw error;
      }

      const subHeadingNum = parseInt(subHeading);
      if (isNaN(subHeadingNum) || subHeadingNum < 0 || subHeadingNum > 99) {
        const error = new Error('Sub-heading must be between 0 and 99');
        error.status = 400;
        throw error;
      }

      // Check for duplicate code
      const existing = await HSNMaster.findOne({ code: validatedCode, isDeleted: false });
      if (existing) {
        const error = new Error('HSN code already exists');
        error.status = 409;
        throw error;
      }

      const validatedTaxRate = this.validateTaxRate(gstRate || 0);

      const hsn = new HSNMaster({
        code: validatedCode,
        description: description.trim(),
        chapter: chapterNum,
        heading: headingNum,
        subHeading: subHeadingNum,
        gstRate: validatedTaxRate,
        country: country?.trim() || 'IN',
        isActive: true,
        isDeleted: false,
      });

      await hsn.save();

      logger.info('HSN code created', {
        code: hsn.code,
        description: hsn.description,
        gstRate: hsn.gstRate,
      });

      return hsn;
    } catch (error) {
      logger.error('Error creating HSN code', { error });
      throw error;
    }
  }

  /**
   * Get HSN by code
   */
  async getHSNByCode(code) {
    try {
      const validatedCode = this.validateHSNCode(code);

      const hsn = await HSNMaster.findOne({
        code: validatedCode,
        isDeleted: false,
      });

      if (!hsn) {
        const error = new Error('HSN code not found');
        error.status = 404;
        throw error;
      }

      return hsn;
    } catch (error) {
      logger.error('Error fetching HSN by code', { code, error });
      throw error;
    }
  }

  /**
   * Get HSN by ID
   */
  async getHSNById(hsnId) {
    try {
      if (!hsnId) {
        const error = new Error('HSN ID is required');
        error.status = 400;
        throw error;
      }

      const hsn = await HSNMaster.findOne({ _id: hsnId, isDeleted: false });

      if (!hsn) {
        const error = new Error('HSN code not found');
        error.status = 404;
        throw error;
      }

      return hsn;
    } catch (error) {
      logger.error('Error fetching HSN by ID', { hsnId, error });
      throw error;
    }
  }

  /**
   * Get all HSN codes with pagination and filters
   */
  async getAllHSNCodes(filters) {
    try {
      const page = Math.max(1, filters.page || 1);
      const limit = Math.max(1, Math.min(100, filters.limit || 50));
      const chapter = filters.chapter ? parseInt(filters.chapter) : null;
      const country = filters.country?.trim() || null;
      const isActive = filters.isActive !== undefined ? filters.isActive === true : null;

      const query = { isDeleted: false };

      // Filter by chapter
      if (chapter !== null && chapter > 0 && chapter <= 99) {
        query.chapter = chapter;
      }

      // Filter by country
      if (country) {
        query.country = country.toUpperCase();
      }

      // Filter by active status
      if (isActive !== null) {
        query.isActive = isActive;
      }

      const total = await HSNMaster.countDocuments(query);
      const hsnCodes = await HSNMaster.find(query)
        .sort({ code: 1 })
        .skip((page - 1) * limit)
        .limit(limit);

      return {
        hsnCodes,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error fetching all HSN codes', { error });
      throw error;
    }
  }

  /**
   * Get HSN codes by chapter
   */
  async getHSNsByChapter(chapter, limit = 100) {
    try {
      const chapterNum = parseInt(chapter);
      if (isNaN(chapterNum) || chapterNum < 1 || chapterNum > 99) {
        const error = new Error('Chapter must be between 1 and 99');
        error.status = 400;
        throw error;
      }

      if (limit < 1 || limit > 500) {
        const error = new Error('Limit must be between 1 and 500');
        error.status = 400;
        throw error;
      }

      const hsnCodes = await HSNMaster.find({
        chapter: chapterNum,
        isDeleted: false,
        isActive: true,
      })
        .limit(limit)
        .sort({ heading: 1, subHeading: 1 });

      return hsnCodes;
    } catch (error) {
      logger.error('Error fetching HSN codes by chapter', { chapter, error });
      throw error;
    }
  }

  /**
   * Get tax rate for HSN code
   */
  async getTaxRateForHSN(code) {
    try {
      const hsn = await this.getHSNByCode(code);

      return {
        code: hsn.code,
        description: hsn.description,
        gstRate: hsn.gstRate,
        country: hsn.country,
      };
    } catch (error) {
      logger.error('Error getting tax rate for HSN', { code, error });
      throw error;
    }
  }

  /**
   * Get HSN codes by tax rate
   */
  async getHSNsByTaxRate(rate, country = 'IN') {
    try {
      const validatedRate = this.validateTaxRate(rate);

      const hsnCodes = await HSNMaster.find({
        gstRate: validatedRate,
        country: country.toUpperCase(),
        isDeleted: false,
        isActive: true,
      })
        .sort({ code: 1 });

      return hsnCodes;
    } catch (error) {
      logger.error('Error fetching HSN codes by tax rate', { rate, country, error });
      throw error;
    }
  }

  /**
   * Update HSN code
   */
  async updateHSN(hsnId, updateData) {
    try {
      if (!hsnId) {
        const error = new Error('HSN ID is required');
        error.status = 400;
        throw error;
      }

      const hsn = await this.getHSNById(hsnId);

      // Update allowed fields
      if (updateData.description && updateData.description.trim()) {
        hsn.description = updateData.description.trim();
      }

      if (updateData.gstRate !== undefined) {
        hsn.gstRate = this.validateTaxRate(updateData.gstRate);
      }

      if (updateData.isActive !== undefined) {
        hsn.isActive = updateData.isActive === true;
      }

      hsn.updatedAt = new Date();
      await hsn.save();

      logger.info('HSN code updated', { code: hsn.code });

      return hsn;
    } catch (error) {
      logger.error('Error updating HSN code', { hsnId, error });
      throw error;
    }
  }

  /**
   * Delete HSN code (soft delete)
   */
  async deleteHSN(hsnId) {
    try {
      if (!hsnId) {
        const error = new Error('HSN ID is required');
        error.status = 400;
        throw error;
      }

      const hsn = await this.getHSNById(hsnId);

      hsn.isDeleted = true;
      hsn.deletedAt = new Date();

      await hsn.save();

      logger.info('HSN code deleted', { code: hsn.code });

      return { message: 'HSN code deleted successfully' };
    } catch (error) {
      logger.error('Error deleting HSN code', { hsnId, error });
      throw error;
    }
  }

  /**
   * Search HSN codes
   */
  async searchHSNCodes(searchTerm, limit = 50) {
    try {
      if (!searchTerm || !searchTerm.trim()) {
        const error = new Error('Search term is required');
        error.status = 400;
        throw error;
      }

      if (limit < 1 || limit > 100) {
        const error = new Error('Limit must be between 1 and 100');
        error.status = 400;
        throw error;
      }

      const hsnCodes = await HSNMaster.find(
        {
          $or: [
            { code: { $regex: searchTerm, $options: 'i' } },
            { description: { $regex: searchTerm, $options: 'i' } },
          ],
          isDeleted: false,
          isActive: true,
        },
        {
          _id: 1,
          code: 1,
          description: 1,
          gstRate: 1,
          chapter: 1,
        }
      )
        .limit(limit)
        .sort({ code: 1 });

      return hsnCodes;
    } catch (error) {
      logger.error('Error searching HSN codes', { searchTerm, error });
      throw error;
    }
  }

  /**
   * Get HSN statistics
   */
  async getHSNStatistics(country = 'IN') {
    try {
      const total = await HSNMaster.countDocuments({
        isDeleted: false,
        country: country.toUpperCase(),
      });

      const active = await HSNMaster.countDocuments({
        isActive: true,
        isDeleted: false,
        country: country.toUpperCase(),
      });

      const byRate = await HSNMaster.aggregate([
        {
          $match: {
            isDeleted: false,
            country: country.toUpperCase(),
          },
        },
        {
          $group: {
            _id: '$gstRate',
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      const byChapter = await HSNMaster.aggregate([
        {
          $match: {
            isDeleted: false,
            country: country.toUpperCase(),
          },
        },
        {
          $group: {
            _id: '$chapter',
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      return {
        country,
        totalHSNCodes: total,
        activeHSNCodes: active,
        inactiveHSNCodes: total - active,
        byTaxRate: byRate,
        byChapter: byChapter,
      };
    } catch (error) {
      logger.error('Error getting HSN statistics', { country, error });
      throw error;
    }
  }

  /**
   * Get common tax rates
   */
  async getCommonTaxRates(country = 'IN') {
    try {
      const rates = await HSNMaster.distinct('gstRate', {
        isDeleted: false,
        country: country.toUpperCase(),
      });

      return rates.sort((a, b) => a - b);
    } catch (error) {
      logger.error('Error getting common tax rates', { country, error });
      throw error;
    }
  }

  /**
   * Bulk import HSN codes
   */
  async bulkImportHSNCodes(hsnArray) {
    try {
      if (!Array.isArray(hsnArray) || hsnArray.length === 0) {
        const error = new Error('HSN array is required');
        error.status = 400;
        throw error;
      }

      const results = {
        imported: 0,
        failed: 0,
        errors: [],
      };

      for (const hsnData of hsnArray) {
        try {
          const validatedCode = this.validateHSNCode(hsnData.code);

          // Skip if code exists
          const existing = await HSNMaster.findOne({
            code: validatedCode,
            isDeleted: false,
          });

          if (existing) {
            results.failed++;
            results.errors.push(`${validatedCode}: Already exists`);
            continue;
          }

          const validatedRate = this.validateTaxRate(hsnData.gstRate || 0);

          await HSNMaster.create({
            code: validatedCode,
            description: hsnData.description?.trim() || '',
            chapter: parseInt(hsnData.chapter) || 0,
            heading: parseInt(hsnData.heading) || 0,
            subHeading: parseInt(hsnData.subHeading) || 0,
            gstRate: validatedRate,
            country: hsnData.country?.trim() || 'IN',
            isActive: true,
            isDeleted: false,
          });

          results.imported++;
        } catch (err) {
          results.failed++;
          results.errors.push(`${hsnData.code}: ${err.message}`);
        }
      }

      logger.info('HSN bulk import completed', {
        imported: results.imported,
        failed: results.failed,
      });

      return results;
    } catch (error) {
      logger.error('Error bulk importing HSN codes', { error });
      throw error;
    }
  }
}

export default new HSNService();
