import Organization from '../../../Models/Organization.js';
import logger from '../../../config/logger.js';

class OrganizationService {
  // Get full organization hierarchy
  async getOrganizationTree(companyId) {
    try {
      // Get all organizations
      const orgs = await Organization.find({})
        .populate('parentId', 'name code type')
        .populate('managerId', 'username email')
        .populate('warehouseId', 'name code');

      // Return empty array if no organizations
      if (!orgs || orgs.length === 0) {
        return [];
      }

      // Build tree from root level organizations
      const roots = orgs.filter(org => org.type === 'HEAD_OFFICE' || !org.parentId);
      const trees = [];

      for (const root of roots) {
        trees.push(await this.buildTree(root, orgs));
      }

      // Always return as array for consistency
      return trees;
    } catch (error) {
      logger.error('Error getting organization tree', { error: error.message });
      throw error;
    }
  }

  // Build nested tree structure
  buildTree(node, allOrgs) {
    const children = allOrgs.filter(org => 
      org.parentId && org.parentId._id.toString() === node._id.toString()
    );

    return {
      ...node.toObject(),
      children: children.length > 0 
        ? children.map(child => this.buildTree(child, allOrgs))
        : []
    };
  }

  // Get all branches flat list
  async getAllBranches() {
    try {
      const branches = await Organization.find({ isActive: true })
        .populate('managerId', 'username email')
        .sort({ code: 1 });

      return branches;
    } catch (error) {
      logger.error('Error getting all branches', { error: error.message });
      throw error;
    }
  }

  // Get branches by parent
  async getBranchesByParent(parentId) {
    try {
      return await Organization.find({
        parentId: parentId,
        isActive: true,
      })
        .populate('managerId', 'username email')
        .populate('warehouseId', 'name code');
    } catch (error) {
      logger.error('Error getting branches by parent', { error: error.message });
      throw error;
    }
  }

  // Get branch by ID
  async getBranchById(branchId) {
    try {
      const branch = await Organization.findById(branchId)
        .populate('parentId', 'name code')
        .populate('managerId', 'username email')
        .populate('warehouseId', 'name code');

      if (!branch) {
        const error = new Error('Branch not found');
        error.status = 404;
        throw error;
      }

      return branch;
    } catch (error) {
      logger.error('Error getting branch by ID', { error: error.message });
      throw error;
    }
  }

  // Create new organization
  async createOrganization(orgData) {
    try {
      // Validate required fields
      if (!orgData.name || !orgData.code || !orgData.country) {
        const error = new Error('Name, code, and country are required');
        error.status = 400;
        throw error;
      }

      // Check if code already exists
      const existing = await Organization.findOne({ code: orgData.code.toUpperCase() });
      if (existing) {
        const error = new Error('Organization code already exists');
        error.status = 409;
        throw error;
      }

      // If parent exists, validate and calculate level
      if (orgData.parentId) {
        const parent = await Organization.findById(orgData.parentId);
        if (!parent) {
          const error = new Error('Parent organization not found');
          error.status = 404;
          throw error;
        }
        orgData.level = parent.level + 1;
      } else {
        orgData.level = 0;
        orgData.type = 'HEAD_OFFICE';
      }

      const org = new Organization(orgData);
      await org.save();

      logger.info('Organization created', { 
        orgId: org._id, 
        name: org.name,
        code: org.code 
      });

      return await this.getBranchById(org._id);
    } catch (error) {
      logger.error('Error creating organization', { error: error.message });
      throw error;
    }
  }

  // Update organization
  async updateOrganization(branchId, updateData) {
    try {
      // Don't allow changing code or parentId after creation
      const { code, parentId, ...safeData } = updateData;

      const org = await Organization.findByIdAndUpdate(
        branchId,
        safeData,
        { new: true, runValidators: true }
      )
        .populate('parentId', 'name code')
        .populate('managerId', 'username email')
        .populate('warehouseId', 'name code');

      if (!org) {
        const error = new Error('Organization not found');
        error.status = 404;
        throw error;
      }

      logger.info('Organization updated', { 
        orgId: branchId,
        name: org.name
      });

      return org;
    } catch (error) {
      logger.error('Error updating organization', { error: error.message });
      throw error;
    }
  }

  // Delete organization
  async deleteOrganization(branchId) {
    try {
      // Check if organization has children
      const children = await Organization.find({ parentId: branchId });
      if (children.length > 0) {
        const error = new Error('Cannot delete organization with child branches');
        error.status = 409;
        throw error;
      }

      const org = await Organization.findByIdAndUpdate(
        branchId,
        { isActive: false },
        { new: true }
      );

      if (!org) {
        const error = new Error('Organization not found');
        error.status = 404;
        throw error;
      }

      logger.info('Organization deleted (soft)', { orgId: branchId });
      return org;
    } catch (error) {
      logger.error('Error deleting organization', { error: error.message });
      throw error;
    }
  }

  // Get branch configuration
  async getBranchConfig(branchId) {
    try {
      const branch = await Organization.findById(branchId)
        .populate('warehouseId')
        .populate('managerId', 'username email');

      if (!branch) {
        throw new Error('Branch not found');
      }

      return {
        branchId: branch._id,
        name: branch.name,
        code: branch.code,
        type: branch.type,
        country: branch.country,
        currency: branch.currency,
        timezone: branch.timezone,
        taxNumber: branch.taxNumber,
        manager: branch.managerId,
        warehouse: branch.warehouseId,
        allowTransfers: branch.allowInventoryTransfer,
      };
    } catch (error) {
      logger.error('Error getting branch config', { error: error.message });
      throw error;
    }
  }

  // Transfer inventory between branches
  async transferInventory(fromBranchId, toBranchId, items) {
    try {
      const fromBranch = await Organization.findById(fromBranchId);
      const toBranch = await Organization.findById(toBranchId);

      if (!fromBranch || !toBranch) {
        const error = new Error('Invalid branch');
        error.status = 404;
        throw error;
      }

      // Validate transfer eligibility
      if (!fromBranch.allowInventoryTransfer || !toBranch.allowInventoryTransfer) {
        const error = new Error('Inventory transfer not allowed for one or both branches');
        error.status = 403;
        throw error;
      }

      logger.info('Inventory transfer planned', {
        from: fromBranch.code,
        to: toBranch.code,
        itemCount: items.length,
      });

      return { 
        success: true, 
        message: 'Transfer initiated',
        transfer: {
          fromBranch: fromBranch.code,
          toBranch: toBranch.code,
          items: items.length,
          timestamp: new Date()
        }
      };
    } catch (error) {
      logger.error('Error transferring inventory', { error: error.message });
      throw error;
    }
  }

  // Get branches by country
  async getBranchesByCountry(country) {
    try {
      return await Organization.find({
        country,
        isActive: true,
      })
        .populate('managerId', 'username email')
        .sort({ code: 1 });
    } catch (error) {
      logger.error('Error getting branches by country', { error: error.message });
      throw error;
    }
  }

  // Get branch hierarchy path (e.g., HQ > Dubai > Dubai Downtown)
  async getBranchPath(branchId) {
    try {
      const branch = await Organization.findById(branchId).populate('parentId');
      if (!branch) {
        throw new Error('Branch not found');
      }

      const path = [{ id: branch._id, name: branch.name, code: branch.code }];

      let current = branch;
      while (current.parentId) {
        current = await Organization.findById(current.parentId);
        path.unshift({ id: current._id, name: current.name, code: current.code });
      }

      return path;
    } catch (error) {
      logger.error('Error getting branch path', { error: error.message });
      throw error;
    }
  }
}

export default new OrganizationService();
