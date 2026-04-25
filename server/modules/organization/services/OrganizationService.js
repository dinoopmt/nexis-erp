import Organization from '../../../Models/Organization.js';
import logger from '../../../config/logger.js';

class OrganizationService {
  // Get full organization hierarchy
  async getOrganizationTree(companyId) {
    try {
      // Get all organizations
      const orgs = await Organization.find({})
        .populate('parentId', 'code type');

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
        .populate('parentId', 'code type');
    } catch (error) {
      logger.error('Error getting branches by parent', { error: error.message });
      throw error;
    }
  }

  // Get branch by ID
  async getBranchById(branchId) {
    try {
      const branch = await Organization.findById(branchId)
        .populate('parentId', 'code type');

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
      if (!orgData.code) {
        const error = new Error('Code is required');
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

      // 🔐 MANDATORY: Check if this is the first organization
      const organizationCount = await Organization.countDocuments();
      const isFirstOrganization = organizationCount === 0;

      // 🔐 Prevent duplicate HEAD_OFFICE
      if (orgData.type === 'HEAD_OFFICE' && !isFirstOrganization) {
        const existingHeadOffice = await Organization.findOne({ type: 'HEAD_OFFICE' });
        if (existingHeadOffice) {
          const error = new Error('❌ Only one Head Office is allowed in the system');
          error.status = 409;
          throw error;
        }
      }

      if (isFirstOrganization) {
        // Business Rule: First organization MUST be HEAD_OFFICE
        if (orgData.type !== 'HEAD_OFFICE') {
          const error = new Error('❌ First organization in the system must be a Head Office');
          error.status = 400;
          throw error;
        }

        // Business Rule: First organization CANNOT have a parent
        if (orgData.parentId) {
          const error = new Error('❌ First organization cannot have a parent organization');
          error.status = 400;
          throw error;
        }
      } else {
        // For BRANCH organizations, auto-assign the HEAD_OFFICE as parent
        if (orgData.type === 'BRANCH') {
          const headOffice = await Organization.findOne({ type: 'HEAD_OFFICE' });
          if (!headOffice) {
            const error = new Error('Head Office not found - please create Head Office first');
            error.status = 400;
            throw error;
          }
          // Auto-assign HEAD_OFFICE as parent
          orgData.parentId = headOffice._id;
        } else if (orgData.parentId) {
          // Validate if parentId is explicitly provided
          const parent = await Organization.findById(orgData.parentId);
          if (!parent) {
            const error = new Error('Parent organization not found');
            error.status = 404;
            throw error;
          }
        }
      }

      const org = new Organization(orgData);
      await org.save();

      logger.info('Organization created', { 
        orgId: org._id, 
        code: org.code,
        type: org.type,
        isFirstOrganization
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
      // Don't allow changing code, type, or parentId after creation
      const { code, type, parentId, ...safeData } = updateData;

      const org = await Organization.findByIdAndUpdate(
        branchId,
        safeData,
        { returnDocument: 'after', runValidators: true }
      )
        .populate('parentId', 'code type');

      if (!org) {
        const error = new Error('Organization not found');
        error.status = 404;
        throw error;
      }

      logger.info('Organization updated', { 
        orgId: branchId,
        code: org.code
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
        { returnDocument: 'after' }
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
        .populate('parentId', 'name code type');

      if (!branch) {
        throw new Error('Branch not found');
      }

      return {
        branchId: branch._id,
        code: branch.code,
        type: branch.type,
        parentId: branch.parentId,
        isActive: branch.isActive,
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

  // Get branches by country (deprecated - country field removed)
  async getBranchesByCountry(country) {
    try {
      // Country field no longer exists - return empty array
      logger.warn('getBranchesByCountry called but country field has been removed');
      return [];
    } catch (error) {
      logger.error('Error getting branches by country', { error: error.message });
      throw error;
    }
  }

  // Get branch hierarchy path (e.g., HO > BRANCH-01)
  async getBranchPath(branchId) {
    try {
      const branch = await Organization.findById(branchId).populate('parentId');
      if (!branch) {
        throw new Error('Branch not found');
      }

      const path = [{ id: branch._id, code: branch.code, type: branch.type }];

      let current = branch;
      while (current.parentId) {
        current = await Organization.findById(current.parentId);
        path.unshift({ id: current._id, code: current.code, type: current.type });
      }

      return path;
    } catch (error) {
      logger.error('Error getting branch path', { error: error.message });
      throw error;
    }
  }
}

export default new OrganizationService();
