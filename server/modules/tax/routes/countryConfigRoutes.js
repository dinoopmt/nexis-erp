import express from 'express'
import {
  getAllCountries,
  getCountryByCode,
  getCountryByName,
  createCountry,
  updateCountry,
  deleteCountry,
} from '../controllers/countryConfigController.js'

const router = express.Router()

// Public routes
router.get('/', getAllCountries)
router.get('/code/:code', getCountryByCode)
router.get('/name/:name', getCountryByName)

// Admin routes (for creating/updating/deleting countries)
router.post('/', createCountry)
router.put('/:code', updateCountry)
router.delete('/:code', deleteCountry)

export default router
