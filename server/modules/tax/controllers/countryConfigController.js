import CountryConfig from '../../../Models/CountryConfig.js'

// Get all country configurations
export const getAllCountries = async (req, res) => {
  try {
    const countries = await CountryConfig.find({ isActive: true }).sort({
      countryCode: 1,
    })

    if (!countries || countries.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No country configurations found',
        data: [],
      })
    }

    res.status(200).json({
      success: true,
      message: 'Country configurations retrieved successfully',
      data: countries,
    })
  } catch (error) {
    console.error('Error fetching countries:', error)
    res.status(500).json({
      success: false,
      message: `Error fetching country configurations: ${error.message}`,
      data: null,
    })
  }
}

// Get country configuration by code
export const getCountryByCode = async (req, res) => {
  try {
    const { code } = req.params

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Country code is required',
        data: null,
      })
    }

    const country = await CountryConfig.findOne({
      countryCode: code.toUpperCase(),
      isActive: true,
    })

    if (!country) {
      return res.status(404).json({
        success: false,
        message: `Country with code ${code} not found`,
        data: null,
      })
    }

    res.status(200).json({
      success: true,
      message: 'Country configuration retrieved successfully',
      data: country,
    })
  } catch (error) {
    console.error('Error fetching country by code:', error)
    res.status(500).json({
      success: false,
      message: `Error fetching country configuration: ${error.message}`,
      data: null,
    })
  }
}

// Get country configuration by name
export const getCountryByName = async (req, res) => {
  try {
    const { name } = req.params

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Country name is required',
        data: null,
      })
    }

    const country = await CountryConfig.findOne({
      countryName: name,
      isActive: true,
    })

    if (!country) {
      return res.status(404).json({
        success: false,
        message: `Country ${name} not found`,
        data: null,
      })
    }

    res.status(200).json({
      success: true,
      message: 'Country configuration retrieved successfully',
      data: country,
    })
  } catch (error) {
    console.error('Error fetching country by name:', error)
    res.status(500).json({
      success: false,
      message: `Error fetching country configuration: ${error.message}`,
      data: null,
    })
  }
}

// Create country configuration (Admin only)
export const createCountry = async (req, res) => {
  try {
    const {
      countryName,
      countryCode,
      label,
      flagEmoji,
      taxSystem,
      regulations,
      addressPlaceholder,
      complianceRequirements,
    } = req.body

    // Validate required fields
    if (
      !countryName ||
      !countryCode ||
      !label ||
      !flagEmoji ||
      !taxSystem
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        data: null,
      })
    }

    // Check if country already exists
    const existingCountry = await CountryConfig.findOne({
      $or: [{ countryName }, { countryCode }],
    })

    if (existingCountry) {
      return res.status(409).json({
        success: false,
        message: `Country ${countryName} already exists`,
        data: null,
      })
    }

    const newCountry = new CountryConfig({
      countryName,
      countryCode: countryCode.toUpperCase(),
      label,
      flagEmoji,
      taxSystem,
      regulations,
      addressPlaceholder,
      complianceRequirements,
    })

    const savedCountry = await newCountry.save()

    res.status(201).json({
      success: true,
      message: 'Country configuration created successfully',
      data: savedCountry,
    })
  } catch (error) {
    console.error('Error creating country:', error)
    res.status(500).json({
      success: false,
      message: `Error creating country configuration: ${error.message}`,
      data: null,
    })
  }
}

// Update country configuration (Admin only)
export const updateCountry = async (req, res) => {
  try {
    const { code } = req.params
    const updates = req.body

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Country code is required',
        data: null,
      })
    }

    const country = await CountryConfig.findOneAndUpdate(
      { countryCode: code.toUpperCase() },
      updates,
      { returnDocument: 'after', runValidators: true }
    )

    if (!country) {
      return res.status(404).json({
        success: false,
        message: `Country ${code} not found`,
        data: null,
      })
    }

    res.status(200).json({
      success: true,
      message: 'Country configuration updated successfully',
      data: country,
    })
  } catch (error) {
    console.error('Error updating country:', error)
    res.status(500).json({
      success: false,
      message: `Error updating country configuration: ${error.message}`,
      data: null,
    })
  }
}

// Delete country configuration (Admin only)
export const deleteCountry = async (req, res) => {
  try {
    const { code } = req.params

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Country code is required',
        data: null,
      })
    }

    const country = await CountryConfig.findOneAndUpdate(
      { countryCode: code.toUpperCase() },
      { isActive: false },
      { returnDocument: 'after' }
    )

    if (!country) {
      return res.status(404).json({
        success: false,
        message: `Country ${code} not found`,
        data: null,
      })
    }

    res.status(200).json({
      success: true,
      message: 'Country configuration deleted successfully',
      data: country,
    })
  } catch (error) {
    console.error('Error deleting country:', error)
    res.status(500).json({
      success: false,
      message: `Error deleting country configuration: ${error.message}`,
      data: null,
    })
  }
}
