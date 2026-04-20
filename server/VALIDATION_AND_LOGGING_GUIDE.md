/**
 * INPUT VALIDATION & LOGGING USAGE GUIDE
 * 
 * This file demonstrates how to use the new validation and logging middleware
 */

// ============================================
// 1. ROUTE VALIDATION EXAMPLE
// ============================================

import express from 'express'
import { validate, createSalesInvoiceSchema, createFinancialYearSchema } from '../middleware/validators/schemaValidator.js'
import { businessEventLogger, securityLogger } from '../middleware/structuredLogger.js'

const router = express.Router()

/**
 * Example: Sales Invoice Route with Validation
 */
router.post(
  '/sales-invoices',
  validate(createSalesInvoiceSchema, 'body'), // Validates req.body
  async (req, res) => {
    // At this point, req.body is guaranteed to be valid
    const invoiceData = req.body

    try {
      // Business logic
      const invoice = await SalesInvoice.create(invoiceData)

      // Log business event
      businessEventLogger('INVOICE_CREATED', {
        invoiceId: invoice._id,
        customerId: invoiceData.customerId,
        amount: invoice.total,
        userId: req.user?.id,
      })

      res.status(201).json(invoice)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }
)

/**
 * Example: Financial Year Route with Validation
 */
router.post(
  '/financial-years',
  validate(createFinancialYearSchema, 'body'),
  async (req, res) => {
    try {
      const fy = await FinancialYear.create(req.body)

      businessEventLogger('FINANCIAL_YEAR_CREATED', {
        fyId: fy._id,
        yearCode: fy.yearCode,
        userId: req.user?.id,
      })

      res.status(201).json(fy)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }
)

// ============================================
// 2. LOGGING EXAMPLES IN CONTROLLERS
// ============================================

import { logger, businessEventLogger, securityLogger } from '../middleware/structuredLogger.js'

export const exampleController = async (req, res) => {
  const requestId = req.id

  try {
    // Info level logging
    logger.info('PROCESSING_REQUEST', {
      requestId,
      userId: req.user?.id,
      action: 'create_invoice',
    })

    // Your business logic here
    const result = await someOperation()

    // Log success
    businessEventLogger('OPERATION_SUCCESS', {
      requestId,
      operation: 'create_invoice',
      resultId: result._id,
    })

    res.json(result)
  } catch (error) {
    // Log error
    logger.error('OPERATION_FAILED', {
      requestId,
      error: error.message,
      stack: error.stack,
    })

    res.status(500).json({ error: error.message })
  }
}

// ============================================
// 3. SECURITY EVENT LOGGING
// ============================================

export const loginController = async (req, res) => {
  const requestId = req.id

  try {
    const { username, password } = req.body

    // Attempt login
    const user = await User.findOne({ username })

    if (!user) {
      // Log failed authentication attempt
      securityLogger('LOGIN_FAILED', {
        requestId,
        username,
        ip: req.ip,
        reason: 'user_not_found',
      })
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    if (!await user.verifyPassword(password)) {
      // Log failed password attempt
      securityLogger('LOGIN_FAILED', {
        requestId,
        userId: user._id,
        ip: req.ip,
        reason: 'invalid_password',
      })
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Log successful login
    securityLogger('LOGIN_SUCCESS', {
      requestId,
      userId: user._id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    })

    const token = user.generateToken()
    res.json({ token, user })
  } catch (error) {
    logger.error('LOGIN_ERROR', {
      requestId,
      error: error.message,
    })
    res.status(500).json({ error: error.message })
  }
}

// ============================================
// 4. HOW VALIDATION WORKS
// ============================================

/*
When you add validate() middleware to a route:

1. Request comes in:
   POST /api/v1/sales-invoices
   {
     "customerId": "507f1f77bcf86cd799439011",
     "items": [
       {
         "productId": "507f1f77bcf86cd799439012",
         "quantity": 5,
         "rate": 100
       }
     ]
   }

2. Middleware validates against schema:
   - customerId must be valid MongoDB ObjectId ✓
   - items must be non-empty array ✓
   - quantity must be positive ✓
   - rate must be positive ✓

3. If valid:
   - Continues to controller
   - req.body is guaranteed valid

4. If invalid:
   Response:
   {
     "success": false,
     "message": "Validation error",
     "errors": [
       {
         "field": "items.0.quantity",
         "message": "Quantity must be positive"
       }
     ]
   }
*/

// ============================================
// 5. ADDING NEW VALIDATORS
// ============================================

/*
To add a new validator:

1. Open server/middleware/validators/schemaValidator.js

2. Add your schema:
   export const createVendorSchema = z.object({
     vendorCode: z.string().min(1),
     vendorName: z.string().min(1),
     email: emailSchema,
     phone: phoneSchema,
   })

3. Use in route:
   router.post(
     '/vendors',
     validate(createVendorSchema, 'body'),
     createVendorController
   )

4. TypeScript support (future):
   type Vendor = z.infer<typeof createVendorSchema>
   const vendor: Vendor = validatedData
*/

// ============================================
// 6. LOG FILE LOCATIONS
// ============================================

/*
Logs are stored in:
- logs/error.log       → Errors only (max 5 files, 5MB each)
- logs/combined.log    → All logs (max 10 files, 5MB each)
- logs/exceptions.log  → Uncaught exceptions
- logs/rejections.log  → Unhandled promise rejections

View logs:
Windows:
  type logs\combined.log
  Get-Content logs\combined.log -Tail 50

Linux/Mac:
  tail -f logs/combined.log
  tail -50 logs/combined.log
*/

// ============================================
// 7. REQUEST ID TRACKING
// ============================================

/*
Every request gets a unique ID for tracking:

1. From header: X-Request-ID (if provided by client)
   Example: curl -H "X-Request-ID: my-custom-id" http://localhost:5000/api/v1/...

2. Generated automatically: req_<timestamp>_<random>
   Example: req_1713607200000_a1b2c3d4e5

3. Available in:
   - req.id (in handlers)
   - Response header: X-Request-ID (client can access)
   - Logs: All logged events include requestId

This allows tracing a request through all system logs.
*/

export default router
