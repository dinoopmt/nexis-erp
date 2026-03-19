# Services Layer Pattern Guide

## 📋 Overview

The **Services Layer** is where all business logic lives. Controllers become thin, focusing only on HTTP request/response handling while services handle the actual business operations.

---

## 🏗️ Architecture Pattern

```
┌─────────────────────────────────────────┐
│         HTTP Request                    │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│      ROUTE (Defines endpoint)           │
│    /api/v1/products (POST)              │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  MIDDLEWARE (Auth, Validation, Logging) │
│    ├─ authenticateUser()                │
│    ├─ validateInput()                   │
│    └─ logRequest()                      │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│    CONTROLLER (HTTP Handler)            │
│    ├─ Extract data from req             │
│    ├─ Call service method               │
│    ├─ Format response                   │
│    └─ Send res.status().json()          │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│     SERVICE (Business Logic)            │
│    ├─ Data validation                   │
│    ├─ Business rules                    │
│    ├─ Database operations               │
│    ├─ Calculations                      │
│    ├─ Error handling                    │
│    └─ Logging                           │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│   MODELS (Database Access)              │
│    ├─ .find()                           │
│    ├─ .create()                         │
│    ├─ .updateOne()                      │
│    └─ .delete()                         │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│       DATABASE (MongoDB)                │
└─────────────────────────────────────────┘
```

---

## 📁 Folder Structure

Each module now has services:

```
modules/{feature}/
├── controllers/
│   ├── featureController.js      (Thin - delegates to service)
│   └── feature2Controller.js
├── routes/
│   ├── featureRoutes.js
│   └── index.js
├── services/                     (NEW!)
│   ├── featureService.js         (Business logic)
│   ├── index.js                  (Export all services)
│   └── ...
├── models/
└── README.md
```

---

## 💡 Service Pattern Example

### 1. Create Service File

**File**: `modules/sales/services/salesInvoiceService.js`

```javascript
import SalesInvoice from '../../../Models/Sales/SalesInvoice.js';
import logger from '../../../config/logger.js';

class SalesInvoiceService {
  /**
   * Create new sales invoice
   * @param {Object} invoiceData - Invoice data
   * @returns {Promise<Object>} Created invoice
   * @throws {Error} If creation fails
   */
  async createInvoice(invoiceData) {
    try {
      // Validation
      this.validateInvoiceData(invoiceData);

      // Check stock availability
      await this.checkStockAvailability(invoiceData.items);

      // Calculate totals
      const totals = this.calculateInvoiceTotals(invoiceData.items);

      // Create invoice
      const invoice = new SalesInvoice({
        ...invoiceData,
        ...totals,
        status: 'draft',
      });

      await invoice.save();

      logger.info('Invoice created', { invoiceId: invoice._id });

      return invoice;
    } catch (error) {
      logger.error('Create invoice error', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate invoice data
   * @private
   */
  validateInvoiceData(data) {
    if (!data.customerId || !data.items || data.items.length === 0) {
      const error = new Error('Invalid invoice data');
      error.status = 400;
      throw error;
    }
  }

  /**
   * Check if items are in stock
   * @private
   */
  async checkStockAvailability(items) {
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || product.stock < item.quantity) {
        const error = new Error(`Insufficient stock for ${product?.name}`);
        error.status = 400;
        throw error;
      }
    }
  }

  /**
   * Calculate invoice totals
   * @private
   */
  calculateInvoiceTotals(items) {
    let subtotal = 0;
    let totalTax = 0;

    items.forEach(item => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      totalTax += item.tax || 0;
    });

    return {
      subtotal,
      totalTax,
      total: subtotal + totalTax,
    };
  }
}

export default new SalesInvoiceService();
```

### 2. Use in Controller

**File**: `modules/sales/controllers/salesInvoiceController.js`

```javascript
import salesInvoiceService from '../services/salesInvoiceService.js';
import { catchAsync } from '../../../config/errorHandler.js';

/**
 * Create invoice - Controller just handles HTTP
 */
export const createInvoice = catchAsync(async (req, res) => {
  // Extract data
  const invoiceData = req.body;
  const userId = req.user?.userId;

  // Call service - all business logic here
  const invoice = await salesInvoiceService.createInvoice({
    ...invoiceData,
    createdBy: userId,
  });

  // Format response
  res.status(201).json({
    success: true,
    data: invoice,
    message: 'Invoice created successfully',
  });
});
```

### 3. Register in Routes

**File**: `modules/sales/routes/salesInvoiceRoutes.js`

```javascript
import express from 'express';
import * as controller from '../controllers/salesInvoiceController.js';
import { authenticate } from '../../../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, controller.createInvoice);
router.get('/:id', authenticate, controller.getInvoice);

export default router;
```

---

## ✅ Service Layer Best Practices

### 1. Single Responsibility

Each service class handles one feature:

```javascript
// ✅ GOOD
class ProductService {
  async createProduct(data) { ... }
  async updateProduct(id, data) { ... }
  async deleteProduct(id) { ... }
}

// ❌ BAD - Don't mix unrelated features
class ProductService {
  async createProduct(data) { ... }
  async sendEmail(to, subject) { ... }  // Not product-related
  async processPayment(amount) { ... }  // Not product-related
}
```

### 2. Error Handling

Always include status codes:

```javascript
async createProduct(data) {
  try {
    // Validation
    if (!data.name) {
      const error = new Error('Product name is required');
      error.status = 400;  // ← Include status
      throw error;
    }

    // Business logic
    const product = new Product(data);
    await product.save();

    return product;
  } catch (error) {
    logger.error('Create product error', { error: error.message });
    throw error;  // ← Controller catches and handles
  }
}
```

### 3. Logging

Log important operations:

```javascript
async createProduct(data) {
  logger.debug('Creating product', { name: data.name });

  const product = new Product(data);
  await product.save();

  logger.info('Product created', { 
    productId: product._id, 
    name: product.name 
  });

  return product;
}
```

### 4. Helper Methods (Private)

Use private methods for repeated logic:

```javascript
class InvoiceService {
  async createInvoice(data) {
    this.validateData(data);           // Private helper
    await this.checkInventory(data);   // Private helper
    const totals = this.calculateTotals(data); // Private helper

    return await Invoice.create({...data, ...totals});
  }

  // Private methods (don't export)
  validateData(data) { ... }
  checkInventory(data) { ... }
  calculateTotals(data) { ... }
}
```

### 5. Return Consistent Format

Always return objects with clear structure:

```javascript
// ✅ GOOD - consistent, clear
return {
  success: true,
  data: product,
  message: 'Product created',
};

// ❌ BAD - inconsistent
return product;
return { id: product._id };
return true;
```

---

## 📊 Service Method Patterns

### CRUD Operations

```javascript
class ProductService {
  // CREATE
  async createProduct(data) {
    const product = new Product(data);
    await product.save();
    return product;
  }

  // READ
  async getProductById(id) {
    const product = await Product.findById(id);
    if (!product) {
      const error = new Error('Product not found');
      error.status = 404;
      throw error;
    }
    return product;
  }

  // UPDATE
  async updateProduct(id, updateData) {
    const product = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!product) {
      const error = new Error('Product not found');
      error.status = 404;
      throw error;
    }
    return product;
  }

  // DELETE (Soft delete)
  async deleteProduct(id) {
    const product = await Product.findByIdAndUpdate(
      id,
      { $set: { isDeleted: true } },
      { new: true }
    );
    if (!product) {
      const error = new Error('Product not found');
      error.status = 404;
      throw error;
    }
    return { message: 'Product deleted successfully' };
  }

  // LIST with pagination
  async getAllProducts(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const products = await Product.find()
      .skip(skip)
      .limit(limit);
    const total = await Product.countDocuments();
    
    return {
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // SEARCH
  async searchProducts(query) {
    return await Product.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { sku: { $regex: query, $options: 'i' } },
      ],
    });
  }
}
```

---

## 🔄 Complex Business Logic Example

```javascript
class OrderService {
  /**
   * Process order - Complex operation with multiple steps
   */
  async processOrder(orderId) {
    try {
      // 1. Get order
      const order = await this.getOrder(orderId);

      // 2. Validate order
      this.validateOrderStatus(order);

      // 3. Check inventory
      await this.reserveInventory(order.items);

      // 4. Calculate totals
      const totals = this.calculateOrderTotals(order);

      // 5. Apply discounts
      const finalTotal = this.applyDiscounts(totals, order.customerId);

      // 6. Create payment intent
      const payment = await this.createPaymentIntent(finalTotal);

      // 7. Update order
      order.status = 'processing';
      order.paymentId = payment.id;
      order.total = finalTotal;
      await order.save();

      logger.info('Order processed', { orderId, total: finalTotal });

      return {
        order,
        paymentUrl: payment.url,
      };
    } catch (error) {
      logger.error('Process order error', { error: error.message });
      throw error;
    }
  }

  // Helper methods for complex logic
  validateOrderStatus(order) { ... }
  async reserveInventory(items) { ... }
  calculateOrderTotals(order) { ... }
  applyDiscounts(totals, customerId) { ... }
  async createPaymentIntent(amount) { ... }
}
```

---

## 📚 Service Index File

Each module should have an index.js that exports all services:

**File**: `modules/sales/services/index.js`

```javascript
import salesInvoiceService from './salesInvoiceService.js';
import salesOrderService from './salesOrderService.js';
import deliveryNoteService from './deliveryNoteService.js';

export default {
  salesInvoiceService,
  salesOrderService,
  deliveryNoteService,
};
```

Then use in controller:

```javascript
import services from '../services/index.js';

export const createInvoice = async (req, res) => {
  const invoice = await services.salesInvoiceService.createInvoice(req.body);
  res.json(invoice);
};
```

---

## 🎯 Implementation Checklist

### For Each Module:

- [ ] Create `/services` folder
- [ ] Create service file for each major feature
- [ ] Extract all business logic from controllers
- [ ] Add error handling with status codes
- [ ] Add logging for important operations
- [ ] Create service index.js
- [ ] Update controllers to use services
- [ ] Update controller imports
- [ ] Test all endpoints
- [ ] Document service methods

---

## 📈 Benefits of Services Layer

| Benefit | Impact |
|---------|--------|
| **Testability** | Services are easy to unit test |
| **Reusability** | Services can be used by multiple controllers |
| **Maintainability** | Business logic is centralized |
| **Debugging** | Easier to trace issues |
| **Scalability** | Services can become microservices |
| **Team Collaboration** | Clear responsibilities |
| **Code Organization** | Follows SOLID principles |

---

## 🚀 What's Already Done

✅ **Services Created**:
- `modules/auth/services/authService.js` - Auth business logic
- `modules/inventory/services/inventoryService.js` - Product logic

✅ **Controllers Updated**:
- `modules/auth/controllers/authController.js` - Now uses authService

---

## 📝 Next Steps

1. **Create services for all modules** - Follow the patterns shown
2. **Update all controllers** - Make them thin, delegate to services
3. **Create service index files** - One per module
4. **Add unit tests for services** - Test business logic in isolation
5. **Add integration tests** - Test full request/response flow

---

## 📖 Service Template

Use this template for all modules:

```javascript
import Model from '../../../Models/ModelName.js';
import logger from '../../../config/logger.js';

/**
 * {FeatureName}Service - Handles {feature} business logic
 */
class {FeatureName}Service {
  /**
   * Create {feature}
   * @param {Object} data - {feature} data
   * @returns {Promise<Object>} Created {feature}
   * @throws {Error} If creation fails
   */
  async create{Feature}(data) {
    try {
      // Validation
      this.validate(data);

      // Create
      const item = new Model(data);
      await item.save();

      logger.info('{Feature} created', { itemId: item._id });
      return item;
    } catch (error) {
      logger.error('Create {feature} error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get by ID
   */
  async getById(id) {
    try {
      const item = await Model.findById(id);
      if (!item) {
        const error = new Error('{Feature} not found');
        error.status = 404;
        throw error;
      }
      return item;
    } catch (error) {
      logger.error('Get {feature} error', { error: error.message });
      throw error;
    }
  }

  // More CRUD methods...

  /**
   * Validation helper
   * @private
   */
  validate(data) {
    // Add validation rules
  }
}

export default new {FeatureName}Service();
```

---

**Status**: Services Layer Foundation Ready  
**Modules with Services**: Auth, Inventory  
**Next Phase**: Complete all remaining modules  
**Quality**: Enterprise Grade ⭐⭐⭐⭐⭐
