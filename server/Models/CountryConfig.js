import mongoose from 'mongoose'

const countryConfigSchema = new mongoose.Schema(
  {
    countryCode: {
      type: String,
      required: true,
      enum: ['AE', 'OM', 'IN'],
      unique: true,
    },
    countryName: {
      type: String,
      required: true,
      enum: ['AE', 'OM', 'IN'],
      unique: true,
    },
    label: {
      type: String,
      required: true,
    },
    flagEmoji: {
      type: String,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      enum: ['INR', 'AED', 'OMR'],
    },
    taxSystem: {
      type: String,
      required: true,
      enum: ['VAT', 'GST', 'Income Tax', 'None'],
    },
    taxNumberLabel: {
      type: String,
      required: true,
    },
    taxStructure: {
      type: String,
      required: true,
      enum: ['SINGLE', 'DUAL'],
      description: 'SINGLE for VAT, DUAL for GST (CGST + SGST)',
    },
    taxRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    hsnRequired: {
      type: Boolean,
      default: false,
    },
    interstateApplicable: {
      type: Boolean,
      default: true,
    },
    regulations: [
      {
        title: String,
        description: String,
        requirement: String,
      },
    ],
    addressPlaceholder: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
    },
    complianceRequirements: [
      {
        name: String,
        description: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, collection: 'country_configs' }
)

const CountryConfig =
  mongoose.models.CountryConfig ||
  mongoose.model('CountryConfig', countryConfigSchema)

export default CountryConfig
