import Company from '../../../Models/Company.js';
import License from '../../../Models/License.js';
import SystemSettings from '../../../Models/SystemSettings.js';

// Get Company Settings
export async function getCompanySettings(req, res) {
  try {
    let company = await Company.findOne();
    
    if (!company) {
      // Create default company if it doesn't exist
      company = await Company.create({
        companyName: 'Your Company Name',
        email: 'info@example.com',
        phone: '+1234567890',
        address: 'Company Address',
        city: 'City',
        country: 'AE',
        taxType: 'VAT',
        taxRate: 5.00,
      });
    }
    
    res.json(company.toObject());
  } catch (error) {
    console.error('Error fetching company settings:', error.message);
    res.status(500).json({ message: 'Error fetching company settings: ' + error.message });
  }
}

// Update Company Settings
export async function updateCompanySettings(req, res) {
  try {
    // Validate required fields
    const { companyName, email, phone, address, city, country } = req.body;
    
    if (!companyName || !email || !phone || !address || !city || !country) {
      return res.status(400).json({ 
        message: 'Missing required fields: companyName, email, phone, address, city, country' 
      });
    }

    // ✅ Validate country code (use codes that match MongoDB enum)
    const validCountryCodes = ['AE', 'OM', 'IN'];
    if (!validCountryCodes.includes(country)) {
      return res.status(400).json({ 
        message: `Invalid country code. Must be one of: ${validCountryCodes.join(', ')} (AE=UAE, OM=Oman, IN=India)`
      });
    }

    // Validate tax type enum value
    const validTaxTypes = ['VAT', 'GST', 'None'];
    if (req.body.taxType && !validTaxTypes.includes(req.body.taxType)) {
      return res.status(400).json({ 
        message: `Invalid tax type. Must be one of: ${validTaxTypes.join(', ')}`
      });
    }

    // Prepare update data - exclude _id and __v
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.__v;

    // Convert taxRate to proper number
    if (updateData.taxRate !== undefined) {
      updateData.taxRate = parseFloat(updateData.taxRate);
    }

    let company = await Company.findOne();
    
    if (!company) {
      // Create new company
      company = await Company.create(updateData);
    } else {
      // Update existing company
      company = await Company.findOneAndUpdate(
        {}, 
        updateData, 
        { returnDocument: 'after', runValidators: true }
      );
    }

    res.json({ message: 'Company settings updated successfully', data: company.toObject() });
  } catch (error) {
    console.error('Error updating company settings:', error.message);
    res.status(500).json({ message: error.message || 'Error updating company settings' });
  }
}

// Get License
export async function getLicense(req, res) {
  try {
    let license = await License.findOne({ companyId: 1 });
    
    if (!license) {
      // Create default license if it doesn't exist
      license = await License.create({
        companyId: 1,
        licenseKey: 'DEFAULT-LICENSE-KEY',
        licensePlan: 'Professional',
        companyName: 'Your Company',
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      });
    }
    
    res.json(license);
  } catch (error) {
    console.error('Error fetching license:', error);
    res.status(500).json({ message: 'Error fetching license: ' + error.message });
  }
}

// Validate License
export async function validateLicense(req, res) {
  try {
    const { licenseKey } = req.body;

    if (!licenseKey) {
      return res.status(400).json({ message: 'License key is required' });
    }

    const license = await License.findOne({ licenseKey });

    if (!license) {
      return res.status(404).json({ message: 'Invalid license key' });
    }

    // Check if license is expired
    const today = new Date();
    if (license.expiryDate < today) {
      return res.status(400).json({ message: 'License has expired' });
    }

    // Update company with new license
    await License.findOneAndUpdate(
      { _id: license._id },
      { isActive: true },
      { returnDocument: 'after' }
    );

    res.json({ message: 'License validated successfully', data: license });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Get System Settings
export async function getSystemSettings(req, res) {
  try {
    let settings = await SystemSettings.findOne({ companyId: 1 });

    if (!settings) {
      // Create default settings if not found
      settings = await SystemSettings.create({ companyId: 1 });
    }

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Update System Settings
export async function updateSystemSettings(req, res) {
  try {
    let settings = await SystemSettings.findOne({ companyId: 1 });

    if (!settings) {
      settings = await SystemSettings.create({ companyId: 1, ...req.body });
    } else {
      settings = await SystemSettings.findOneAndUpdate(
        { companyId: 1 },
        req.body,
        { returnDocument: 'after' }
      );
    }

    res.json({ message: 'System settings updated successfully', data: settings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Get All Settings (Combined)
export async function getAllSettings(req, res) {
  try {
    const company = await Company.findOne();
    const license = await License.findOne({ companyId: 1 });
    let systemSettings = await SystemSettings.findOne({ companyId: 1 });

    if (!systemSettings) {
      systemSettings = await SystemSettings.create({ companyId: 1 });
    }

    res.json({
      company,
      license,
      systemSettings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
