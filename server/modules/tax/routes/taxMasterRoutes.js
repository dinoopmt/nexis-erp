import express from 'express'
import {
  getAllTaxMasters,
  getTaxByCountryCode,
  createTaxMaster,
  updateTaxMaster,
  deleteTaxMaster,
} from '../controllers/taxMasterController.js'

const router = express.Router()

// Public routes
router.get('/', getAllTaxMasters)
router.get('/:countryCode', getTaxByCountryCode)

// Admin routes (for creating/updating/deleting tax masters)
router.post('/', createTaxMaster)
router.put('/:countryCode', updateTaxMaster)
router.delete('/:countryCode', deleteTaxMaster)

export default router
