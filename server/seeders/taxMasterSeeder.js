import mongoose from 'mongoose'
import TaxMaster from '../Models/TaxMaster.js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '..', '.env') })

const seedTaxMaster = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to MongoDB')

    // Clear existing tax master records
    await TaxMaster.deleteMany({})
    console.log('Cleared existing tax master data')

    const taxMasterData = [
      {
        countryCode: 'IN',
        taxName: 'GST 18%',
        taxType: 'standard',
        components: [
          { name: 'CGST', rate: 9 },
          { name: 'SGST', rate: 9 },
        ],
        totalRate: 18,
        description:
          'Goods and Services Tax (GST) - Split into Central GST and State GST for India',
        isActive: true,
      },
      {
        countryCode: 'AE',
        taxName: 'VAT 5%',
        taxType: 'standard',
        components: [{ name: 'VAT', rate: 5 }],
        totalRate: 5,
        description: 'Value Added Tax (VAT) - Standard Rate for United Arab Emirates',
        isActive: true,
      },
      {
        countryCode: 'AE',
        taxName: 'VAT 0%',
        taxType: 'zero-rated',
        components: [{ name: 'VAT', rate: 0 }],
        totalRate: 0,
        description:
          'Value Added Tax (VAT) - Zero-Rated for supplies like food, medicine, and healthcare in UAE',
        isActive: true,
      },
      {
        countryCode: 'OM',
        taxName: 'VAT 5%',
        taxType: 'standard',
        components: [{ name: 'VAT', rate: 5 }],
        totalRate: 5,
        description: 'Value Added Tax (VAT) - Standard Rate for Oman',
        isActive: true,
      },
      {
        countryCode: 'OM',
        taxName: 'VAT 0%',
        taxType: 'zero-rated',
        components: [{ name: 'VAT', rate: 0 }],
        totalRate: 0,
        description:
          'Value Added Tax (VAT) - Zero-Rated for supplies like food, medicine, and healthcare in Oman',
        isActive: true,
      },
    ]

    const result = await TaxMaster.insertMany(taxMasterData)
    console.log(`\nSuccessfully seeded ${result.length} tax master records`)
    console.log('\nTax Masters:')
    result.forEach((tax) => {
      const componentsStr = tax.components
        .map((c) => `${c.name} (${c.rate}%)`)
        .join(' + ')
      console.log(`  ✓ ${tax.countryCode}: ${tax.taxName} = ${componentsStr}`)
    })

  } catch (error) {
    console.error('Error seeding tax master:', error.message)
    throw error;
  }
}

export { seedTaxMaster };

// Run as standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTaxMaster().then(() => process.exit(0)).catch(() => process.exit(1));
}
