import mongoose from 'mongoose'
import CountryConfig from '../Models/CountryConfig.js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '..', '.env') })

const seedCountries = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to MongoDB')

    // Clear existing country configs
    await CountryConfig.deleteMany({})
    console.log('Cleared existing country configurations')

    const countries = [
      {
        countryCode: 'AE',
        countryName: 'AE',
        label: 'United Arab Emirates',
        flagEmoji: '🇦🇪',
        currency: 'AED',
        taxSystem: 'VAT',
        taxNumberLabel: 'TRN',
        taxStructure: 'SINGLE',
        taxRate: 5.0,
        hsnRequired: false,
        interstateApplicable: false,
        regulations: [
          {
            title: 'Tax System',
            description: 'Value Added Tax (VAT)',
            requirement: 'VAT at 5%',
          },
          {
            title: 'Registration',
            description: 'Commercial Registration (CR) required',
            requirement: 'CR from Department of Economic Development',
          },
          {
            title: 'Tax Authority Registration',
            description: 'FTA (Federal Tax Authority) registration',
            requirement: 'Mandatory for eligible businesses',
          },
          {
            title: 'Accounting Standards',
            description: 'IFRS compliant accounting',
            requirement: 'International Financial Reporting Standards',
          },
        ],
        addressPlaceholder: {
          street: 'Al Batin Tower, Dubai',
          city: 'Dubai / Abu Dhabi / Sharjah',
          state: 'Emirate name',
          postalCode: '12345',
        },
        complianceRequirements: [
          {
            name: 'TRN Registration',
            description: 'Register with FTA using TRN (Tax Registration Number)',
          },
          {
            name: 'IFRS Compliance',
            description: 'Maintain IFRS compliant financial records',
          },
          {
            name: 'Annual Reporting',
            description: 'Submit annual financial reports to authorities',
          },
          {
            name: 'VAT Filing',
            description: 'File VAT returns with FTA',
          },
        ],
        isActive: true,
      },
      {
        countryCode: 'OM',
        countryName: 'OM',
        label: 'Oman',
        flagEmoji: '🇴🇲',
        currency: 'OMR',
        taxSystem: 'VAT',
        taxNumberLabel: 'Tax Registration No',
        taxStructure: 'SINGLE',
        taxRate: 5.0,
        hsnRequired: false,
        interstateApplicable: false,
        regulations: [
          {
            title: 'Tax System',
            description: 'Value Added Tax (VAT)',
            requirement: 'VAT at 5%',
          },
          {
            title: 'Registration',
            description: 'Ministry of Commerce & Industry registration',
            requirement: 'Trade license from relevant ministry',
          },
          {
            title: 'Tax Authority',
            description: 'State General Revenue Authority (DGRA)',
            requirement: 'DGRA registration for VAT purposes',
          },
          {
            title: 'Accounting Standards',
            description: 'IFRS compliant financial reporting',
            requirement: 'International Financial Reporting Standards',
          },
          {
            title: 'Omanization',
            description: 'Omanization requirements for workforce',
            requirement: 'Percentage of Omani nationals required',
          },
        ],
        addressPlaceholder: {
          street: 'Muscat Business Park, Muscat',
          city: 'Muscat / Salalah',
          state: 'Governorate',
          postalCode: '100',
        },
        complianceRequirements: [
          {
            name: 'Trade License',
            description: 'Obtain from Ministry of Commerce & Industry',
          },
          {
            name: 'DGRA Registration',
            description: 'Register with State General Revenue Authority',
          },
          {
            name: 'Omanization Policy',
            description: 'Comply with workforce Omanization requirements',
          },
          {
            name: 'IFRS Standards',
            description: 'Maintain IFRS compliant financial records',
          },
        ],
        isActive: true,
      },
      {
        countryCode: 'IN',
        countryName: 'IN',
        label: 'India',
        flagEmoji: '🇮🇳',
        currency: 'INR',
        taxSystem: 'GST',
        taxNumberLabel: 'GSTIN',
        taxStructure: 'DUAL',
        taxRate: 18.0,
        hsnRequired: true,
        interstateApplicable: true,
        regulations: [
          {
            title: 'Tax System',
            description: 'Goods & Services Tax (GST)',
            requirement: 'GST at 18% (standard rate) - CGST (9%) + SGST (9%)',
          },
          {
            title: 'GSTIN',
            description: 'GST Identification Number registration',
            requirement: 'Mandatory for registered businesses',
          },
          {
            title: 'PAN',
            description: 'Permanent Account Number',
            requirement: 'Required for all business entities',
          },
          {
            title: 'HSN Code',
            description: 'Harmonized System of Nomenclature',
            requirement: 'Required for invoicing products',
          },
          {
            title: 'Accounting Standards',
            description: 'Indian GAAP / Ind-AS standards',
            requirement: 'Indian Generally Accepted Accounting Principles',
          },
          {
            title: 'Fiscal Year',
            description: 'April 1 - March 31',
            requirement: 'Financial year follows government fiscal year',
          },
        ],
        addressPlaceholder: {
          street: 'MG Road, Bangalore',
          city: 'Bangalore / Mumbai / Delhi',
          state: 'State name',
          postalCode: 'PIN code',
        },
        complianceRequirements: [
          {
            name: 'GSTIN Registration',
            description: 'Register for GSTIN with local tax authority',
          },
          {
            name: 'PAN Registration',
            description: 'Obtain PAN from Income Tax Department',
          },
          {
            name: 'HSN Classification',
            description: 'Classify all products with HSN codes',
          },
          {
            name: 'Indian GAAP Compliance',
            description: 'Maintain Ind-AS compliant financial statements',
          },
          {
            name: 'GST Filing',
            description: 'File monthly/quarterly GST returns (GSTR-1, GSTR-3B)',
          },
          {
            name: 'Income Tax Filing',
            description: 'Annual income tax return filing with PAN',
          },
          {
            name: 'Interstate Compliance',
            description: 'Track IGST for inter-state supplies',
          },
        ],
        isActive: true,
      },
    ]

    const result = await CountryConfig.insertMany(countries)
    console.log(`Successfully seeded ${result.length} country configurations`)
    console.log('Country configurations:')
    result.forEach((country) => {
      console.log(`  - ${country.label} (${country.countryCode})`)
    })

    process.exit(0)
  } catch (error) {
    console.error('Error seeding countries:', error.message)
    throw error;
  }
}

export { seedCountries };

// Run as standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
  seedCountries().then(() => process.exit(0)).catch(() => process.exit(1));
}
