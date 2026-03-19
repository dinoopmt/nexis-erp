import mongoose from 'mongoose'

const taxMasterSchema = new mongoose.Schema(
  {
    countryCode: {
      type: String,
      required: true,
      enum: ['AE', 'OM', 'IN'],
    },
    taxName: {
      type: String,
      required: true,
    },
    taxType: {
      type: String,
      required: true,
      enum: ['standard', 'zero-rated', 'reduced', 'exempt'],
      default: 'standard',
    },
    components: [
      {
        name: {
          type: String,
          required: true,
        },
        rate: {
          type: Number,
          required: true,
          min: 0,
          max: 100,
        },
      },
    ],
    totalRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    description: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, collection: 'tax_masters' }
)

// Create compound unique index for countryCode + taxType
taxMasterSchema.index({ countryCode: 1, taxType: 1 }, { unique: true })

const TaxMaster =
  mongoose.models.TaxMaster || mongoose.model('TaxMaster', taxMasterSchema)

export default TaxMaster
