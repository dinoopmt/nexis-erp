import HSNMaster from '../Models/HSNMaster.js';

/**
 * HSN Validation Service
 * Provides comprehensive HSN validation and verification methods
 */

class HSNValidationService {
  /**
   * Validate HSN format (6 digits)
   */
  static validateFormat(code) {
    if (!code) {
      return {
        valid: false,
        error: 'HSN code is required'
      };
    }

    const codeStr = code.toString().trim();

    if (!/^\d{6}$/.test(codeStr)) {
      return {
        valid: false,
        error: 'HSN code must be exactly 6 digits (e.g., 090111)'
      };
    }

    return { valid: true };
  }

  /**
   * Validate HSN code exists in master database
   */
  static async validateExists(code) {
    try {
      const hsn = await HSNMaster.findByCode(code);

      if (!hsn) {
        return {
          valid: false,
          error: `HSN code ${code} not found in master database`,
          suggestion: 'Please check the code or use search functionality'
        };
      }

      return {
        valid: true,
        hsn: {
          code: hsn.code,
          description: hsn.description,
          category: hsn.category,
          gstRate: hsn.gstRate
        }
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Validate HSN is currently active and not repealed
   */
  static async validateActive(code) {
    try {
      const hsn = await HSNMaster.findByCode(code);

      if (!hsn) {
        return {
          valid: false,
          error: `HSN code ${code} not found`
        };
      }

      if (!hsn.isValidForUse()) {
        let replacement = null;
        if (hsn.replacementHSN) {
          replacement = await HSNMaster.findByCode(hsn.replacementHSN);
        }

        return {
          valid: false,
          error: `HSN code ${code} is no longer active (repealed on ${hsn.repealedDate.toLocaleDateString()})`,
          repealed: true,
          replacementHSN: hsn.replacementHSN,
          replacement: replacement ? {
            code: replacement.code,
            description: replacement.description,
            gstRate: replacement.gstRate
          } : null
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Complete HSN validation (format + exists + active)
   */
  static async validateComplete(code) {
    // Step 1: Format validation
    const formatCheck = this.validateFormat(code);
    if (!formatCheck.valid) {
      return formatCheck;
    }

    // Step 2: Existence check
    const existCheck = await this.validateExists(code);
    if (!existCheck.valid) {
      return existCheck;
    }

    // Step 3: Active status check
    const activeCheck = await this.validateActive(code);
    if (!activeCheck.valid) {
      return activeCheck;
    }

    // All validations passed
    return {
      valid: true,
      hsn: existCheck.hsn
    };
  }

  /**
   * Validate HSN is suitable for product category
   */
  static async validateForCategory(code, productCategory) {
    try {
      const hsn = await HSNMaster.findByCode(code);

      if (!hsn) {
        return {
          valid: false,
          error: 'HSN code not found'
        };
      }

      // This is a simple category name match
      // In production, you'd have a mapping table for product categories to HSN categories
      const categoryMatch = hsn.category.toLowerCase().includes(
        productCategory.toLowerCase()
      ) || productCategory.toLowerCase().includes(
        hsn.category.toLowerCase()
      );

      if (!categoryMatch) {
        return {
          valid: false,
          warning: `HSN category (${hsn.category}) may not match product category (${productCategory})`,
          canOverride: true
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Get GST rate for HSN code
   */
  static async getGSTRate(code) {
    try {
      const hsn = await HSNMaster.findByCode(code);

      if (!hsn) {
        return {
          success: false,
          error: 'HSN code not found'
        };
      }

      return {
        success: true,
        code: hsn.code,
        gstRate: hsn.gstRate,
        description: hsn.description
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search HSN by partial code or description
   */
  static async search(query, limit = 10) {
    try {
      if (!query || query.trim().length < 2) {
        return {
          success: false,
          error: 'Search query must be at least 2 characters'
        };
      }

      // Try exact code match first
      const exactMatch = await HSNMaster.findOne({
        code: query.toString().padStart(6, '0'),
        isActive: true
      });

      if (exactMatch) {
        return {
          success: true,
          exact: true,
          data: [{
            code: exactMatch.code,
            description: exactMatch.description,
            category: exactMatch.category,
            gstRate: exactMatch.gstRate
          }]
        };
      }

      // Then try description search
      const searchResults = await HSNMaster.searchByDescription(query);

      return {
        success: true,
        exact: false,
        data: searchResults.slice(0, limit).map(hsn => ({
          code: hsn.code,
          description: hsn.description,
          category: hsn.category,
          gstRate: hsn.gstRate
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get HSN chapter name from code
   */
  static getChapterName(code) {
    const chapters = {
      '01': 'Animal Products',
      '02': 'Meat and Edible Meat Offal',
      '03': 'Fish and Crustaceans',
      '04': 'Dairy, Eggs, Honey',
      '05': 'Products of Animal Origin',
      '06': 'Trees, Plants, Flowers',
      '07': 'Edible Vegetables',
      '08': 'Edible Fruit and Nuts',
      '09': 'Coffee, Tea, Spices',
      '10': 'Cereals',
      '11': 'Milling Products, Malts',
      '12': 'Oil Seeds',
      '13': 'Lac, Gums, Resins',
      '14': 'Vegetable Plaiting Materials',
      '15': 'Animal or Vegetable Fats',
      '16': 'Meat, Fish Preparations',
      '17': 'Sugars and Sugar Confectionery',
      '18': 'Cocoa and Cocoa Preparations',
      '19': 'Cereal, Flour, Starch Preparations',
      '20': 'Vegetable, Fruit Preparations',
      '21': 'Miscellaneous Edible Preparations',
      '22': 'Beverages, Vinegar',
      '23': 'Food Industry Residue',
      '24': 'Tobacco and Substitutes',
      '25': 'Salt, Sulfur, Earth, Stone',
      '26': 'Ores, Slag, Ash',
      '27': 'Mineral Fuels, Oils',
      '28': 'Inorganic Chemicals',
      '29': 'Organic Chemicals',
      '30': 'Pharmaceuticals',
      '31': 'Fertilizers',
      '32': 'Tanning, Dye Extracts',
      '33': 'Essential Oils, Perfumery',
      '34': 'Soap, Detergents, Waxes',
      '35': 'Albuminoidal Substances, Glues',
      '36': 'Explosives, Matches, Pyrotechnics',
      '37': 'Photographic Chemicals',
      '38': 'Miscellaneous Chemicals',
      '39': 'Plastics and Plastic Articles',
      '40': 'Rubber and Articles',
      '41': 'Raw Hides and Skins',
      '42': 'Articles of Leather',
      '43': 'Furs, except Fur Skins',
      '44': 'Wood and Wood Articles',
      '45': 'Cork and Cork Articles',
      '46': 'Straw, Esparto and Plaiting Articles',
      '47': 'Pulp of Wood',
      '48': 'Paper and Paperboard',
      '49': 'Printed Books, Newspapers',
      '50': 'Silk',
      '51': 'Wool',
      '52': 'Cotton',
      '53': 'Other Vegetable Textile Fibers',
      '54': 'Manmade Filaments',
      '55': 'Manmade Staple Fibers',
      '56': 'Wadding, Felt, Nonwovens',
      '57': 'Special Woven Fabrics',
      '58': 'Other Woven Fabrics',
      '59': 'Coated Textiles',
      '60': 'Knitted or Crocheted Fabrics',
      '61': 'Articles of Apparel (Knitted)',
      '62': 'Articles of Apparel (Not Knitted)',
      '63': 'Other Made-up Textile Articles',
      '64': 'Footwear',
      '65': 'Hat and Hat Parts',
      '66': 'Umbrellas, Walking Sticks',
      '67': 'Feathers, Down Articles',
      '68': 'Articles of Stone, Plaster, Etc',
      '69': 'Ceramic Products',
      '70': 'Glass and Glassware',
      '71': 'Pearls, Precious, Semi-precious Stones',
      '72': 'Iron and Steel',
      '73': 'Articles of Iron and Steel',
      '74': 'Copper and Articles',
      '75': 'Nickel and Articles',
      '76': 'Aluminum and Articles',
      '78': 'Lead and Articles',
      '79': 'Zinc and Articles',
      '80': 'Tin and Articles',
      '81': 'Miscellaneous Metals, Ores',
      '82': 'Tools, Cutlery, etc.',
      '83': 'Miscellaneous Articles of Metal',
      '84': 'Machinery and Mechanical Appliances',
      '85': 'Electrical Machinery and Equipment',
      '86': 'Railway and Tramway Stock',
      '87': 'Vehicles',
      '88': 'Aircraft and Aerospace Equipment',
      '89': 'Ships and Floating Structures',
      '90': 'Optical, Medical Instruments',
      '91': 'Clocks and Watches',
      '92': 'Musical Instruments',
      '93': 'Arms and Ammunition',
      '94': 'Furniture, Bedding, etc.',
      '95': 'Toys, Games, Sports Equipment',
      '96': 'Miscellaneous Manufactures',
      '97': 'Works of Art, Antiques',
      '98': 'Special Classification Provisions',
      '99': 'Commodities not specified'
    };

    const chapter = code.toString().substring(0, 2);
    return chapters[chapter] || 'Unknown Chapter';
  }

  /**
   * Format HSN code for display (with grouping)
   */
  static formatCode(code) {
    const codeStr = code.toString().padStart(6, '0');
    return `${codeStr.substring(0, 2)}-${codeStr.substring(2, 4)}-${codeStr.substring(4)}`;
  }

  /**
   * Bulk validate multiple HSN codes
   */
  static async validateBulk(codes) {
    try {
      const results = {
        valid: [],
        invalid: [],
        repealed: []
      };

      for (const code of codes) {
        const validation = await this.validateComplete(code);

        if (validation.valid) {
          results.valid.push({
            code,
            ...validation.hsn
          });
        } else if (validation.repealed) {
          results.repealed.push({
            code,
            error: validation.error,
            replacement: validation.replacement
          });
        } else {
          results.invalid.push({
            code,
            error: validation.error
          });
        }
      }

      return {
        success: true,
        results,
        summary: {
          total: codes.length,
          valid: results.valid.length,
          invalid: results.invalid.length,
          repealed: results.repealed.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default HSNValidationService;
