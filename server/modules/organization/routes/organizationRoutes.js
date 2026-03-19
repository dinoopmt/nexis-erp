import express from 'express';
import * as organizationController from '../controllers/organizationController.js';

const router = express.Router();

// GET routes
router.get('/tree', organizationController.getOrganizationTree);
router.get('/all', organizationController.getAllBranches);
router.get('/country/:country', organizationController.getBranchesByCountry);
router.get('/:branchId', organizationController.getBranchById);
router.get('/:branchId/config', organizationController.getBranchConfig);
router.get('/:branchId/path', organizationController.getBranchPath);
router.get('/parent/:parentId', organizationController.getBranchesByParent);

// POST routes
router.post('/', organizationController.createOrganization);
router.post('/:fromBranchId/transfer/:toBranchId', organizationController.transferInventory);

// PUT routes
router.put('/:branchId', organizationController.updateOrganization);

// DELETE routes
router.delete('/:branchId', organizationController.deleteOrganization);

export default router;
