import TaxMaster from '../../../Models/TaxMaster.js'

// Get all tax masters
export const getAllTaxMasters = async (req, res) => {
  try {
    const taxes = await TaxMaster.find({ isActive: true }).sort({
      countryCode: 1,
    })

    if (!taxes || taxes.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No tax masters found',
        data: [],
      })
    }

    res.status(200).json({
      success: true,
      message: 'Tax masters retrieved successfully',
      data: taxes,
    })
  } catch (error) {
    console.error('Error fetching tax masters:', error)
    res.status(500).json({
      success: false,
      message: `Error fetching tax masters: ${error.message}`,
      data: null,
    })
  }
}

// Get tax master by country code
export const getTaxByCountryCode = async (req, res) => {
  try {
    const { countryCode } = req.params

    if (!countryCode) {
      return res.status(400).json({
        success: false,
        message: 'Country code is required',
        data: null,
      })
    }

    const tax = await TaxMaster.findOne({
      countryCode: countryCode.toUpperCase(),
      isActive: true,
    })

    if (!tax) {
      return res.status(404).json({
        success: false,
        message: `Tax master for country ${countryCode} not found`,
        data: null,
      })
    }

    res.status(200).json({
      success: true,
      message: 'Tax master retrieved successfully',
      data: tax,
    })
  } catch (error) {
    console.error('Error fetching tax master:', error)
    res.status(500).json({
      success: false,
      message: `Error fetching tax master: ${error.message}`,
      data: null,
    })
  }
}

// Create tax master (Admin only)
export const createTaxMaster = async (req, res) => {
  try {
    const { countryCode, taxName, components, description } = req.body

    // Validate required fields
    if (!countryCode || !taxName || !components || components.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: countryCode, taxName, components',
        data: null,
      })
    }

    // Calculate total rate
    const totalRate = components.reduce((sum, comp) => sum + comp.rate, 0)

    // Check if tax master already exists
    const existingTax = await TaxMaster.findOne({ countryCode })

    if (existingTax) {
      return res.status(409).json({
        success: false,
        message: `Tax master for country ${countryCode} already exists`,
        data: null,
      })
    }

    const newTaxMaster = new TaxMaster({
      countryCode: countryCode.toUpperCase(),
      taxName,
      components,
      totalRate,
      description,
    })

    const savedTax = await newTaxMaster.save()

    res.status(201).json({
      success: true,
      message: 'Tax master created successfully',
      data: savedTax,
    })
  } catch (error) {
    console.error('Error creating tax master:', error)
    res.status(500).json({
      success: false,
      message: `Error creating tax master: ${error.message}`,
      data: null,
    })
  }
}

// Update tax master (Admin only)
export const updateTaxMaster = async (req, res) => {
  try {
    const { countryCode } = req.params
    const updates = req.body

    if (!countryCode) {
      return res.status(400).json({
        success: false,
        message: 'Country code is required',
        data: null,
      })
    }

    // Recalculate total rate if components are updated
    if (updates.components && updates.components.length > 0) {
      updates.totalRate = updates.components.reduce(
        (sum, comp) => sum + comp.rate,
        0
      )
    }

    const tax = await TaxMaster.findOneAndUpdate(
      { countryCode: countryCode.toUpperCase() },
      updates,
      { returnDocument: 'after', runValidators: true }
    )

    if (!tax) {
      return res.status(404).json({
        success: false,
        message: `Tax master for country ${countryCode} not found`,
        data: null,
      })
    }

    res.status(200).json({
      success: true,
      message: 'Tax master updated successfully',
      data: tax,
    })
  } catch (error) {
    console.error('Error updating tax master:', error)
    res.status(500).json({
      success: false,
      message: `Error updating tax master: ${error.message}`,
      data: null,
    })
  }
}

// Delete tax master (Admin only - soft delete)
export const deleteTaxMaster = async (req, res) => {
  try {
    const { countryCode } = req.params

    if (!countryCode) {
      return res.status(400).json({
        success: false,
        message: 'Country code is required',
        data: null,
      })
    }

    const tax = await TaxMaster.findOneAndUpdate(
      { countryCode: countryCode.toUpperCase() },
      { isActive: false },
      { returnDocument: 'after' }
    )

    if (!tax) {
      return res.status(404).json({
        success: false,
        message: `Tax master for country ${countryCode} not found`,
        data: null,
      })
    }

    res.status(200).json({
      success: true,
      message: 'Tax master deleted successfully',
      data: tax,
    })
  } catch (error) {
    console.error('Error deleting tax master:', error)
    res.status(500).json({
      success: false,
      message: `Error deleting tax master: ${error.message}`,
      data: null,
    })
  }
}
