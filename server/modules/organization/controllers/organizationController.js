import OrganizationService from '../services/OrganizationService.js';
import logger from '../../../config/logger.js';

// Get organization tree (hierarchical structure)
export const getOrganizationTree = async (req, res) => {
  try {
    const tree = await OrganizationService.getOrganizationTree();
    res.json({
      success: true,
      data: tree,
    });
  } catch (error) {
    logger.error('Error in getOrganizationTree', { error: error.message });
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all branches (flat list)
export const getAllBranches = async (req, res) => {
  try {
    const branches = await OrganizationService.getAllBranches();
    res.json({
      success: true,
      data: branches,
      count: branches.length,
    });
  } catch (error) {
    logger.error('Error in getAllBranches', { error: error.message });
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get branches by parent
export const getBranchesByParent = async (req, res) => {
  try {
    const { parentId } = req.params;
    const branches = await OrganizationService.getBranchesByParent(parentId);
    res.json({
      success: true,
      data: branches,
      count: branches.length,
    });
  } catch (error) {
    logger.error('Error in getBranchesByParent', { error: error.message });
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get branch by ID
export const getBranchById = async (req, res) => {
  try {
    const { branchId } = req.params;
    const branch = await OrganizationService.getBranchById(branchId);
    res.json({
      success: true,
      data: branch,
    });
  } catch (error) {
    logger.error('Error in getBranchById', { error: error.message });
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create new organization
export const createOrganization = async (req, res) => {
  try {
    const orgData = {
      ...req.body,
      createdBy: req.user?.username || 'system',
      updatedBy: req.user?.username || 'system',
    };
    const org = await OrganizationService.createOrganization(orgData);
    res.status(201).json({
      success: true,
      data: org,
      message: 'Organization created successfully',
    });
  } catch (error) {
    logger.error('Error in createOrganization', { error: error.message });
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update organization
export const updateOrganization = async (req, res) => {
  try {
    const { branchId } = req.params;
    const updateData = {
      ...req.body,
      updatedBy: req.user?.username || 'system',
    };
    const org = await OrganizationService.updateOrganization(branchId, updateData);
    res.json({
      success: true,
      data: org,
      message: 'Organization updated successfully',
    });
  } catch (error) {
    logger.error('Error in updateOrganization', { error: error.message });
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete organization (soft delete)
export const deleteOrganization = async (req, res) => {
  try {
    const { branchId } = req.params;
    const org = await OrganizationService.deleteOrganization(branchId);
    res.json({
      success: true,
      data: org,
      message: 'Organization deleted successfully',
    });
  } catch (error) {
    logger.error('Error in deleteOrganization', { error: error.message });
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get branch configuration
export const getBranchConfig = async (req, res) => {
  try {
    const { branchId } = req.params;
    const config = await OrganizationService.getBranchConfig(branchId);
    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error('Error in getBranchConfig', { error: error.message });
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Transfer inventory between branches
export const transferInventory = async (req, res) => {
  try {
    const { fromBranchId, toBranchId } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required',
      });
    }

    const result = await OrganizationService.transferInventory(
      fromBranchId,
      toBranchId,
      items
    );
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error in transferInventory', { error: error.message });
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get branches by country
export const getBranchesByCountry = async (req, res) => {
  try {
    const { country } = req.params;
    const branches = await OrganizationService.getBranchesByCountry(country);
    res.json({
      success: true,
      data: branches,
      count: branches.length,
    });
  } catch (error) {
    logger.error('Error in getBranchesByCountry', { error: error.message });
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get branch path/hierarchy
export const getBranchPath = async (req, res) => {
  try {
    const { branchId } = req.params;
    const path = await OrganizationService.getBranchPath(branchId);
    res.json({
      success: true,
      data: path,
    });
  } catch (error) {
    logger.error('Error in getBranchPath', { error: error.message });
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
};
