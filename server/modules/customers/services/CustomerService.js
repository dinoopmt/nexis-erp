/**
 * Customer Management Service
 * Handles customer master data, status, and customer queries
 */

import Customer from '../../../Models/Customer.js';
import ChartOfAccounts from '../../../Models/ChartOfAccounts.js';
import logger from '../../../config/logger.js';

class CustomerService {
  /**
   * Generate next customer code
   * Format: CUST-001, CUST-002, CUST-003...
   */
  async generateNextCustomerCode() {
    try {
      const lastCustomer = await Customer.findOne().sort({ customerCode: -1 });

      if (!lastCustomer?.customerCode) {
        return 'CUST001';
      }

      const num = parseInt(lastCustomer.customerCode.replace(/\D/g, ''), 10);
      return `CUST${String(num + 1).padStart(3, '0')}`;
    } catch (error) {
      logger.error('Error generating customer code', { error });
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
   * Check if email is unique (excluding current customer)
   */
  async isEmailUnique(email, excludeId = null) {
    try {
      const query = { email: email.toLowerCase(), isDeleted: false };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const customer = await Customer.findOne(query);
      return !customer;
    } catch (error) {
      logger.error('Error checking email uniqueness', { email, error });
      throw error;
    }
  }

  /**
   * Check if GST number is unique
   */
  async isGSTUnique(gstNumber, excludeId = null, country) {
    try {
      if (!gstNumber || !gstNumber.trim()) {
        return true; // GST is optional
      }

      const query = {
        gstNumber: gstNumber.toUpperCase(),
        country,
        isDeleted: false,
      };

      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const customer = await Customer.findOne(query);
      return !customer;
    } catch (error) {
      logger.error('Error checking GST uniqueness', { gstNumber, error });
      throw error;
    }
  }

  /**
   * Create new customer
   */
  async createCustomer(customerData) {
    try {
      const { name, email, phone, address, city, gstNumber, country, taxType, paymentType, paymentTerms, creditLimit } = customerData;

      // Validation
      if (!name || !name.trim()) {
        const error = new Error('Customer name is required');
        error.status = 400;
        throw error;
      }

      if (!country || !['UAE', 'Oman', 'India'].includes(country)) {
        const error = new Error('Country must be one of: UAE, Oman, India');
        error.status = 400;
        throw error;
      }

      if (email && email.trim() && !this.validateEmail(email)) {
        const error = new Error('Invalid email format');
        error.status = 400;
        throw error;
      }

      // Check email uniqueness
      if (email && email.trim()) {
        const isUnique = await this.isEmailUnique(email);
        if (!isUnique) {
          const error = new Error('Email already exists for another customer');
          error.status = 409;
          throw error;
        }
      }

      // Check GST uniqueness
      if (gstNumber && gstNumber.trim()) {
        const isUnique = await this.isGSTUnique(gstNumber, null, country);
        if (!isUnique) {
          const error = new Error('GST number already exists for another customer in this country');
          error.status = 409;
          throw error;
        }
      }

      // Generate customer code
      const customerCode = await this.generateNextCustomerCode();

      // Create AR ledger account if country is India
      let ledgerAccountId = null;
      if (country === 'India') {
        const ledgerAccount = await ChartOfAccounts.findOne({
          accountName: 'Accounts Receivable',
          isDeleted: false,
        });

        ledgerAccountId = ledgerAccount?._id || null;
      }

      const customer = new Customer({
        customerCode,
        name: name.trim(),
        email: email?.trim().toLowerCase() || '',
        phone: phone?.trim() || '',
        address: address?.trim() || '',
        city: city?.trim() || '',
        gstNumber: gstNumber?.trim().toUpperCase() || '',
        country,
        taxType: taxType || null,
        paymentType: paymentType || 'Credit Sale',
        paymentTerms: paymentTerms?.trim() || 'NET 30',
        creditLimit: creditLimit || 0,
        status: 'Active',
        ledgerAccountId,
        isDeleted: false,
        createdAt: new Date(),
      });

      await customer.save();

      logger.info('Customer created successfully', {
        customerId: customer._id,
        customerCode,
        name,
        country,
      });

      return customer;
    } catch (error) {
      logger.error('Error creating customer', { error });
      throw error;
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(customerId) {
    try {
      if (!customerId) {
        const error = new Error('Customer ID is required');
        error.status = 400;
        throw error;
      }

      const customer = await Customer.findOne({ _id: customerId, isDeleted: false })
        .populate('taxGroupId', 'name taxPercentage')
        .populate('ledgerAccountId', 'accountName accountCode');

      if (!customer) {
        const error = new Error('Customer not found');
        error.status = 404;
        throw error;
      }

      return customer;
    } catch (error) {
      logger.error('Error fetching customer by ID', { customerId, error });
      throw error;
    }
  }

  /**
   * Get customer by code
   */
  async getCustomerByCode(customerCode) {
    try {
      if (!customerCode) {
        const error = new Error('Customer code is required');
        error.status = 400;
        throw error;
      }

      const customer = await Customer.findOne({
        customerCode: customerCode.toUpperCase(),
        isDeleted: false,
      })
        .populate('taxGroupId', 'name taxPercentage')
        .populate('ledgerAccountId', 'accountName accountCode');

      if (!customer) {
        const error = new Error('Customer not found');
        error.status = 404;
        throw error;
      }

      return customer;
    } catch (error) {
      logger.error('Error fetching customer by code', { customerCode, error });
      throw error;
    }
  }

  /**
   * Get all customers with pagination and filters
   */
  async getAllCustomers(filters) {
    try {
      const page = Math.max(1, filters.page || 1);
      const limit = Math.max(1, Math.min(100, filters.limit || 50));
      const search = filters.search?.trim() || '';
      const country = filters.country?.trim() || null;
      const status = filters.status?.trim() || null;

      const query = { isDeleted: false };

      // Search across multiple fields
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { customerCode: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { city: { $regex: search, $options: 'i' } },
        ];
      }

      // Filter by country
      if (country && ['UAE', 'Oman', 'India'].includes(country)) {
        query.country = country;
      }

      // Filter by status
      if (status && ['Active', 'Inactive', 'Blacklisted', 'On Hold'].includes(status)) {
        query.status = status;
      }

      const total = await Customer.countDocuments(query);
      const customers = await Customer.find(query)
        .populate('taxGroupId', 'name taxPercentage')
        .populate('ledgerAccountId', 'accountName accountCode')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 });

      return {
        customers,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error fetching customers', { error });
      throw error;
    }
  }

  /**
   * Get active customers for a country
   */
  async getActiveCustomeprettyrs(country, limit = 100) {
    try {
      if (!country || !['UAE', 'Oman', 'India'].includes(country)) {
        const error = new Error('Country must be one of: UAE, Oman, India');
        error.status = 400;
        throw error;
      }

      if (limit < 1 || limit > 500) {
        const error = new Error('Limit must be between 1 and 500');
        error.status = 400;
        throw error;
      }

      const customers = await Customer.find({
        status: 'Active',
        country,
        isDeleted: false,
      })
        .limit(limit)
        .sort({ name: 1 });

      return customers;
    } catch (error) {
      logger.error('Error fetching active customers', { country, error });
      throw error;
    }
  }

  /**
   * Update customer
   */
  async updateCustomer(customerId, updateData) {
    try {
      if (!customerId) {
        const error = new Error('Customer ID is required');
        error.status = 400;
        throw error;
      }

      const customer = await this.getCustomerById(customerId);

      // Validate email if being updated
      if (updateData.email && updateData.email !== customer.email) {
        if (!this.validateEmail(updateData.email)) {
          const error = new Error('Invalid email format');
          error.status = 400;
          throw error;
        }

        const isEmailUnique = await this.isEmailUnique(updateData.email, customerId);
        if (!isEmailUnique) {
          const error = new Error('Email already exists for another customer');
          error.status = 409;
          throw error;
        }
      }

      // Validate GST if being updated
      if (updateData.gstNumber && updateData.gstNumber !== customer.gstNumber) {
        const isGSTUnique = await this.isGSTUnique(updateData.gstNumber, customerId, customer.country);
        if (!isGSTUnique) {
          const error = new Error('GST number already exists for another customer in this country');
          error.status = 409;
          throw error;
        }
      }

      // Update allowed fields
      const allowedFields = ['name', 'email', 'phone', 'address', 'city', 'gstNumber', 'taxType', 'paymentType', 'paymentTerms', 'creditLimit', 'status'];

      allowedFields.forEach(field => {
        if (updateData.hasOwnProperty(field) && updateData[field] !== undefined) {
          if (field === 'email') {
            customer[field] = updateData[field].toLowerCase();
          } else if (field === 'gstNumber') {
            customer[field] = updateData[field].toUpperCase();
          } else {
            customer[field] = updateData[field];
          }
        }
      });

      customer.updatedAt = new Date();
      await customer.save();

      logger.info('Customer updated successfully', { customerId });

      return customer;
    } catch (error) {
      logger.error('Error updating customer', { customerId, error });
      throw error;
    }
  }

  /**
   * Update customer status
   */
  async updateCustomerStatus(customerId, status) {
    try {
      if (!customerId) {
        const error = new Error('Customer ID is required');
        error.status = 400;
        throw error;
      }

      const validStatuses = ['Active', 'Inactive', 'Blacklisted', 'On Hold'];
      if (!status || !validStatuses.includes(status)) {
        const error = new Error(`Status must be one of: ${validStatuses.join(', ')}`);
        error.status = 400;
        throw error;
      }

      const customer = await this.getCustomerById(customerId);
      customer.status = status;
      customer.updatedAt = new Date();

      await customer.save();

      logger.info('Customer status updated', { customerId, newStatus: status });

      return customer;
    } catch (error) {
      logger.error('Error updating customer status', { customerId, error });
      throw error;
    }
  }

  /**
   * Soft delete customer
   */
  async deleteCustomer(customerId) {
    try {
      if (!customerId) {
        const error = new Error('Customer ID is required');
        error.status = 400;
        throw error;
      }

      const customer = await this.getCustomerById(customerId);

      customer.isDeleted = true;
      customer.deletedAt = new Date();

      await customer.save();

      logger.info('Customer deleted successfully', { customerId });

      return { message: 'Customer deleted successfully' };
    } catch (error) {
      logger.error('Error deleting customer', { customerId, error });
      throw error;
    }
  }

  /**
   * Search customers
   */
  async searchCustomers(searchTerm, country = null, limit = 20) {
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

      const query = {
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
          { customerCode: { $regex: searchTerm, $options: 'i' } },
          { phone: { $regex: searchTerm, $options: 'i' } },
        ],
        isDeleted: false,
      };

      if (country && ['UAE', 'Oman', 'India'].includes(country)) {
        query.country = country;
      }

      const customers = await Customer.find(
        query,
        {
          _id: 1,
          customerCode: 1,
          name: 1,
          email: 1,
          phone: 1,
          country: 1,
          status: 1,
        }
      )
        .limit(limit)
        .sort({ name: 1 });

      return customers;
    } catch (error) {
      logger.error('Error searching customers', { searchTerm, error });
      throw error;
    }
  }

  /**
   * Get customer statistics
   */
  async getCustomerStatistics(country = null) {
    try {
      const query = { isDeleted: false };

      if (country && ['UAE', 'Oman', 'India'].includes(country)) {
        query.country = country;
      }

      const totalCustomers = await Customer.countDocuments(query);

      const byStatus = await Customer.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const byCountry = await Customer.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: '$country',
            count: { $sum: 1 },
          },
        },
      ]);

      const creditSale = await Customer.countDocuments({
        paymentType: 'Credit Sale',
        isDeleted: false,
      });

      const cashSale = await Customer.countDocuments({
        paymentType: 'Cash Sale',
        isDeleted: false,
      });

      return {
        totalCustomers,
        byStatus,
        byCountry,
        byPaymentType: [
          { paymentType: 'Credit Sale', count: creditSale },
          { paymentType: 'Cash Sale', count: cashSale },
        ],
      };
    } catch (error) {
      logger.error('Error getting customer statistics', { error });
      throw error;
    }
  }

  /**
   * Get customer contacts for communication
   */
  async getCustomerContacts(country = null) {
    try {
      const query = { isDeleted: false, status: 'Active' };

      if (country && ['UAE', 'Oman', 'India'].includes(country)) {
        query.country = country;
      }

      const customers = await Customer.find(
        query,
        {
          _id: 1,
          customerCode: 1,
          name: 1,
          email: 1,
          phone: 1,
          address: 1,
          city: 1,
          country: 1,
        }
      ).sort({ name: 1 });

      return customers;
    } catch (error) {
      logger.error('Error fetching customer contacts', { error });
      throw error;
    }
  }
}

export default new CustomerService();
