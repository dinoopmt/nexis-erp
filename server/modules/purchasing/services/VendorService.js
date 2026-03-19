/**
 * Vendor Management Service
 * Handles vendor creation, updates, status management, and vendor-related queries
 */

import Vendor from '../../../Models/CreateVendor.js';
import logger from '../../../config/logger.js';

class VendorService {
  /**
   * Generate next vendor code
   * Format: V001, V002, V003...
   */
  async generateNextVendorCode() {
    try {
      const lastVendor = await Vendor.findOne({ isDeleted: false }).sort({ vendorCode: -1 });
      
      if (!lastVendor?.vendorCode) {
        return 'V001';
      }
      
      const num = parseInt(lastVendor.vendorCode.replace(/\D/g, ''), 10);
      return `V${String(num + 1).padStart(3, '0')}`;
    } catch (error) {
      logger.error('Error generating vendor code', { error });
      throw error;
    }
  }

  /**
   * Validate email format
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if email is unique (excluding current vendor)
   */
  async isEmailUnique(email, excludeId = null) {
    try {
      const query = { email: email.toLowerCase(), isDeleted: false };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }
      
      const vendor = await Vendor.findOne(query);
      return !vendor;
    } catch (error) {
      logger.error('Error checking email uniqueness', { email, error });
      throw error;
    }
  }

  /**
   * Create new vendor
   * @param {Object} vendorData - Vendor details
   * @returns {Promise<Object>} Created vendor
   */
  async createVendor(vendorData) {
    try {
      const { name, email, phone, address, city, taxNumber, paymentTerms, paymentType, creditDays, status, bankDetails } = vendorData;

      // Validation
      if (!name || !name.trim()) {
        const error = new Error('Vendor name is required');
        error.status = 400;
        throw error;
      }

      if (!email || !email.trim()) {
        const error = new Error('Email is required');
        error.status = 400;
        throw error;
      }

      if (!this.validateEmail(email)) {
        const error = new Error('Invalid email format');
        error.status = 400;
        throw error;
      }

      if (!phone || !phone.trim()) {
        const error = new Error('Phone number is required');
        error.status = 400;
        throw error;
      }

      if (!paymentTerms || !paymentTerms.trim()) {
        const error = new Error('Payment terms are required');
        error.status = 400;
        throw error;
      }

      // Check email uniqueness
      const isEmailUnique = await this.isEmailUnique(email);
      if (!isEmailUnique) {
        const error = new Error('Email already exists for another vendor');
        error.status = 409;
        throw error;
      }

      // Generate vendor code
      const vendorCode = await this.generateNextVendorCode();

      const vendor = new Vendor({
        vendorCode,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address?.trim() || '',
        city: city?.trim() || '',
        taxNumber: taxNumber?.trim().toUpperCase() || '',
        paymentTerms: paymentTerms.trim(),
        paymentType: paymentType || 'Credit',
        creditDays: creditDays || 30,
        status: status || 'Active',
        bankDetails: bankDetails ? {
          bankName: bankDetails.bankName?.trim() || '',
          accountNumber: bankDetails.accountNumber?.trim() || '',
          accountHolder: bankDetails.accountHolder?.trim() || '',
          ifscCode: bankDetails.ifscCode?.trim() || '',
          swiftCode: bankDetails.swiftCode?.trim() || '',
        } : {},
        isActive: true,
        isDeleted: false,
        createdAt: new Date(),
      });

      await vendor.save();

      logger.info('Vendor created successfully', {
        vendorId: vendor._id,
        vendorCode,
        name,
        paymentType,
        creditDays,
      });

      return vendor;
    } catch (error) {
      logger.error('Error creating vendor', { error });
      throw error;
    }
  }

  /**
   * Get vendor by ID with population
   */
  async getVendorById(vendorId) {
    try {
      if (!vendorId) {
        const error = new Error('Vendor ID is required');
        error.status = 400;
        throw error;
      }

      const vendor = await Vendor.findOne({ _id: vendorId, isDeleted: false });

      if (!vendor) {
        const error = new Error('Vendor not found');
        error.status = 404;
        throw error;
      }

      return vendor;
    } catch (error) {
      logger.error('Error fetching vendor by ID', { vendorId, error });
      throw error;
    }
  }

  /**
   * Get vendor by code
   */
  async getVendorByCode(vendorCode) {
    try {
      if (!vendorCode) {
        const error = new Error('Vendor code is required');
        error.status = 400;
        throw error;
      }

      const vendor = await Vendor.findOne({
        vendorCode: vendorCode.toUpperCase(),
        isDeleted: false,
      });

      if (!vendor) {
        const error = new Error('Vendor not found');
        error.status = 404;
        throw error;
      }

      return vendor;
    } catch (error) {
      logger.error('Error fetching vendor by code', { vendorCode, error });
      throw error;
    }
  }

  /**
   * Get all vendors with pagination and search
   */
  async getAllVendors(filters) {
    try {
      const page = Math.max(1, filters.page || 1);
      const limit = Math.max(1, Math.min(100, filters.limit || 50));
      const search = filters.search?.trim() || '';
      const status = filters.status?.trim() || null;

      const query = { isDeleted: false };

      // Search across multiple fields
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { vendorCode: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { city: { $regex: search, $options: 'i' } },
        ];
      }

      // Filter by status
      if (status && ['Active', 'Inactive', 'Suspended'].includes(status)) {
        query.status = status;
      }

      const total = await Vendor.countDocuments(query);
      const vendors = await Vendor.find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 });

      return {
        vendors,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error fetching vendors', { error });
      throw error;
    }
  }

  /**
   * Get active vendors only
   */
  async getActiveVendors(limit = 100) {
    try {
      if (limit < 1 || limit > 500) {
        const error = new Error('Limit must be between 1 and 500');
        error.status = 400;
        throw error;
      }

      const vendors = await Vendor.find({
        status: 'Active',
        isActive: true,
        isDeleted: false,
      })
        .limit(limit)
        .sort({ name: 1 });

      return vendors;
    } catch (error) {
      logger.error('Error fetching active vendors', { error });
      throw error;
    }
  }

  /**
   * Update vendor details
   */
  async updateVendor(vendorId, updateData) {
    try {
      if (!vendorId) {
        const error = new Error('Vendor ID is required');
        error.status = 400;
        throw error;
      }

      const vendor = await this.getVendorById(vendorId);

      // Validate email if being updated
      if (updateData.email && updateData.email !== vendor.email) {
        if (!this.validateEmail(updateData.email)) {
          const error = new Error('Invalid email format');
          error.status = 400;
          throw error;
        }

        const isEmailUnique = await this.isEmailUnique(updateData.email, vendorId);
        if (!isEmailUnique) {
          const error = new Error('Email already exists for another vendor');
          error.status = 409;
          throw error;
        }
      }

      // Update allowed fields
      const allowedFields = ['name', 'email', 'phone', 'address', 'city', 'taxNumber', 'paymentTerms', 'paymentType', 'creditDays', 'status', 'bankDetails'];
      
      allowedFields.forEach(field => {
        if (updateData.hasOwnProperty(field) && updateData[field] !== undefined) {
          if (field === 'email') {
            vendor[field] = updateData[field].toLowerCase();
          } else if (field === 'bankDetails' && updateData[field] !== null) {
            vendor[field] = updateData[field];
          } else {
            vendor[field] = updateData[field];
          }
        }
      });

      vendor.updatedAt = new Date();
      await vendor.save();

      logger.info('Vendor updated successfully', { vendorId, updatedFields: Object.keys(updateData) });

      return vendor;
    } catch (error) {
      logger.error('Error updating vendor', { vendorId, error });
      throw error;
    }
  }

  /**
   * Update vendor status
   */
  async updateVendorStatus(vendorId, status) {
    try {
      if (!vendorId) {
        const error = new Error('Vendor ID is required');
        error.status = 400;
        throw error;
      }

      const validStatuses = ['Active', 'Inactive', 'Suspended'];
      if (!status || !validStatuses.includes(status)) {
        const error = new Error(`Status must be one of: ${validStatuses.join(', ')}`);
        error.status = 400;
        throw error;
      }

      const vendor = await this.getVendorById(vendorId);
      vendor.status = status;
      vendor.isActive = status === 'Active';
      vendor.updatedAt = new Date();

      await vendor.save();

      logger.info('Vendor status updated', { vendorId, newStatus: status });

      return vendor;
    } catch (error) {
      logger.error('Error updating vendor status', { vendorId, error });
      throw error;
    }
  }

  /**
   * Soft delete vendor
   */
  async deleteVendor(vendorId) {
    try {
      if (!vendorId) {
        const error = new Error('Vendor ID is required');
        error.status = 400;
        throw error;
      }

      const vendor = await this.getVendorById(vendorId);

      vendor.isDeleted = true;
      vendor.isActive = false;
      vendor.deletedAt = new Date();

      await vendor.save();

      logger.info('Vendor deleted successfully', { vendorId });

      return { message: 'Vendor deleted successfully' };
    } catch (error) {
      logger.error('Error deleting vendor', { vendorId, error });
      throw error;
    }
  }

  /**
   * Bulk update vendor statuses
   */
  async bulkUpdateStatus(vendorIds, status) {
    try {
      if (!Array.isArray(vendorIds) || vendorIds.length === 0) {
        const error = new Error('Vendor IDs array is required');
        error.status = 400;
        throw error;
      }

      const validStatuses = ['Active', 'Inactive', 'Suspended'];
      if (!status || !validStatuses.includes(status)) {
        const error = new Error(`Status must be one of: ${validStatuses.join(', ')}`);
        error.status = 400;
        throw error;
      }

      const result = await Vendor.updateMany(
        { _id: { $in: vendorIds }, isDeleted: false },
        {
          status,
          isActive: status === 'Active',
          updatedAt: new Date(),
        }
      );

      logger.info('Bulk vendor status update completed', {
        count: result.modifiedCount,
        newStatus: status,
      });

      return {
        message: `Status updated for ${result.modifiedCount} vendors`,
        updatedCount: result.modifiedCount,
      };
    } catch (error) {
      logger.error('Error bulk updating vendor status', { error });
      throw error;
    }
  }

  /**
   * Search vendors by name, code, email, or phone
   */
  async searchVendors(searchTerm, limit = 20) {
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

      const vendors = await Vendor.find(
        {
          $or: [
            { name: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } },
            { vendorCode: { $regex: searchTerm, $options: 'i' } },
            { phone: { $regex: searchTerm, $options: 'i' } },
          ],
          isDeleted: false,
        },
        {
          _id: 1,
          vendorCode: 1,
          name: 1,
          email: 1,
          phone: 1,
          status: 1,
        }
      )
        .limit(limit)
        .sort({ name: 1 });

      return vendors;
    } catch (error) {
      logger.error('Error searching vendors', { searchTerm, error });
      throw error;
    }
  }

  /**
   * Get vendor statistics
   */
  async getVendorStatistics() {
    try {
      const stats = await Vendor.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const totalVendors = await Vendor.countDocuments({ isDeleted: false });
      const activeVendors = await Vendor.countDocuments({
        status: 'Active',
        isDeleted: false,
      });

      return {
        totalVendors,
        activeVendors,
        inactiveVendors: totalVendors - activeVendors,
        statusBreakdown: stats,
      };
    } catch (error) {
      logger.error('Error getting vendor statistics', { error });
      throw error;
    }
  }

  /**
   * Get vendor contacts for communication
   */
  async getVendorContacts() {
    try {
      const vendors = await Vendor.find(
        { isDeleted: false, status: 'Active' },
        {
          _id: 1,
          vendorCode: 1,
          name: 1,
          email: 1,
          phone: 1,
          address: 1,
          city: 1,
        }
      ).sort({ name: 1 });

      return vendors;
    } catch (error) {
      logger.error('Error fetching vendor contacts', { error });
      throw error;
    }
  }
}

export default new VendorService();
