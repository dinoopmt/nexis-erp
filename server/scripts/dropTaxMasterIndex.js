import mongoose from 'mongoose'
import TaxMaster from './Models/TaxMaster.js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

const dropIndex = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to MongoDB')

    // Drop old unique index
    try {
      await TaxMaster.collection.dropIndex('countryCode_1')
      console.log('Dropped old countryCode_1 index')
    } catch (e) {
      console.log('Index not found (may have already been dropped)')
    }

    // Create new compound index if needed
    try {
      await TaxMaster.collection.dropIndex('countryCode_1_taxType_1')
      console.log('Dropped old compound index')
    } catch (e) {
      console.log('Old compound index not found')
    }

    await mongoose.connection.close()
    console.log('Index cleanup complete')
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

dropIndex()
