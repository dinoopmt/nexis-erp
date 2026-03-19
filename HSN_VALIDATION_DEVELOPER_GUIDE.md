# HSN Validation & Integration - Developer Guide

For developers implementing or extending HSN functionality in NEXIS-ERP.

---

## 🏗️ Current HSN Architecture

### Database Schema
```javascript
// server/Models/AddProduct.js
productSchema = {
  itemcode: String,          // e.g., "1001"
  hsn: String,               // e.g., "260590" - 6 digits, uppercase
  name: String,              // Product name
  categoryId: ObjectId,      // Product category
  // ... other fields
}

// server/Models/CountryConfig.js
countryConfigSchema = {
  countryCode: 'AE' | 'OM' | 'IN',
  hsnRequired: boolean,      // true for India, false for others
  // ... other fields
}
```

### Flow Diagram
```
User Input (Product Form)
    ↓
Frontend Validation (formatInput.toUpperCase())
    ↓
API Request (POST /api/products)
    ↓
Backend Validation (Mongoose schema)
    ↓
Database Storage (uppercase, trimmed)
    ↓
Display in UI (Auto-uppercase)
    ↓
Export in CSV
```

---

## ✅ HSN Validation Rules

### Rule 1: Format Validation
```javascript
function validateHSNFormat(hsn) {
  // Empty is acceptable (optional for non-India)
  if (!hsn || hsn.trim() === '') {
    return { valid: true, isEmpty: true };
  }
  
  // Must be exactly 6 digits
  const isValid = /^\d{6}$/.test(hsn.trim());
  
  return {
    valid: isValid,
    error: isValid ? null : 'HSN must be exactly 6 digits (e.g., 260590)'
  };
}

// Usage
validateHSNFormat("260590");   // { valid: true, isEmpty: false }
validateHSNFormat("26059");    // { valid: false, error: "..." }
validateHSNFormat("");         // { valid: true, isEmpty: true }
validateHSNFormat("ABC123");   // { valid: false, error: "..." }
```

### Rule 2: Country Requirement Validation
```javascript
function validateHSNRequirement(hsn, countryCode, companyTurnover) {
  // Check country config
  const config = getCountryConfig(countryCode);
  
  if (countryCode === 'IN' && config.hsnRequired) {
    // India: HSN required if turnover > 5 lakhs
    if (companyTurnover > 500000 && !hsn) {
      return {
        valid: false,
        error: 'HSN is required for India GST compliance'
      };
    }
  }
  
  // UAE & Oman: HSN optional
  if (['AE', 'OM'].includes(countryCode)) {
    return { valid: true, optional: true };
  }
  
  return { valid: true };
}

// Usage
validateHSNRequirement("260590", 'IN', 600000);  // { valid: true }
validateHSNRequirement("", 'IN', 600000);        // { valid: false, error: "..." }
validateHSNRequirement("", 'AE', 1000000);       // { valid: true, optional: true }
```

### Rule 3: HSN Mapping to Category
```javascript
function validateHSNforCategory(hsn, productCategory) {
  // HSN Chapter 09 = Coffee, Tea, Spices
  // HSN Chapter 26 = Ores, slag, ash
  
  const hsnChapter = parseInt(hsn.substring(0, 2));
  
  const validMappings = {
    'Beverages': [9],      // Chapter 09
    'Spices': [9],         // Chapter 09
    'Textiles': [50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63],
    'Machinery': [84],     // Chapter 84
    'Electronics': [85],   // Chapter 85
    'Chemicals': [28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39],
    // ... more mappings
  };
  
  const validChapters = validMappings[productCategory] || [];
  
  if (!validChapters.includes(hsnChapter)) {
    return {
      valid: false,
      error: `HSN chapter ${hsnChapter} doesn't match category "${productCategory}"`
    };
  }
  
  return { valid: true };
}

// Usage
validateHSNforCategory("260590", "Beverages");       // { valid: true }
validateHSNforCategory("850720", "Beverages");       // { valid: false, error: "..." }
```

---

## 🔗 Frontend Implementation

### In Product Form Component
```jsx
// client/src/components/product/Product.jsx

const [newProduct, setNewProduct] = useState({
  hsn: "",
  // ... other fields
});

const [hsnError, setHsnError] = useState("");

// Validate HSN on input
const handleHSNChange = (e) => {
  const value = e.target.value;
  
  // Auto-uppercase
  const uppercase = value.toUpperCase();
  
  setNewProduct({ ...newProduct, hsn: uppercase });
  
  // Validate format
  if (uppercase && !/^\d{6}$/.test(uppercase)) {
    setHsnError("HSN must be 6 digits (e.g., 260590)");
  } else {
    setHsnError("");
  }
};

// In form JSX
<div className="flex items-center gap-2 h-9 flex-1">
  <label className="text-xs font-semibold text-gray-700 w-20">
    HSN Code
  </label>
  
  <input
    type="text"
    placeholder="e.g., 260590"
    className={`border rounded px-2 py-1 text-xs flex-1 ${
      hsnError ? 'border-red-500 bg-red-50' : 'border-gray-300'
    }`}
    value={newProduct.hsn}
    onChange={handleHSNChange}
    maxLength="6"
    disabled={loading}
  />
  
  {hsnError && (
    <span className="text-red-600 text-xs">{hsnError}</span>
  )}
</div>
```

### Frontend Validation Before Submit
```jsx
const validateProductForm = () => {
  const errors = {};
  
  // HSN validation
  if (newProduct.hsn) {
    if (!/^\d{6}$/.test(newProduct.hsn)) {
      errors.hsn = "HSN must be exactly 6 digits";
    }
  }
  
  // Country-specific HSN requirement
  if (company.countryCode === 'IN' && !newProduct.hsn) {
    errors.hsn = "HSN is required for India";
  }
  
  setErrors(errors);
  return Object.keys(errors).length === 0;
};

const handleSave = async () => {
  if (!validateProductForm()) {
    return;  // Don't submit
  }
  
  // Proceed with save
};
```

---

## 🖥️ Backend Implementation

### In Product Controller
```javascript
// server/controllers/productController.js

// Validate HSN
function validateHSN(hsn, countryCode) {
  // 1. Format check
  if (hsn && !/^\d{6}$/.test(hsn.toString().trim())) {
    throw new Error('HSN must be exactly 6 digits');
  }
  
  // 2. Country requirement check
  if (countryCode === 'IN' && !hsn) {
    throw new Error('HSN is required for India GST compliance');
  }
  
  return true;
}

// Create product with HSN
export const createProduct = async (req, res) => {
  try {
    let { itemcode, hsn, name, categoryId, vendor, cost, price, stock } = req.body;
    
    // Validate HSN
    const company = req.user.company;  // From auth
    validateHSN(hsn, company.countryCode);
    
    // Normalize HSN (uppercase, trim)
    hsn = hsn ? hsn.toUpperCase().trim() : "";
    
    const product = new Product({
      itemcode,
      hsn,
      name,
      categoryId,
      vendor,
      cost,
      price,
      stock
    });
    
    await product.save();
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: product
    });
    
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Update product HSN
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let { hsn, ...otherData } = req.body;
    
    // Validate HSN if provided
    if (hsn !== undefined) {
      const company = req.user.company;
      validateHSN(hsn, company.countryCode);
      
      // Normalize
      hsn = hsn ? hsn.toUpperCase().trim() : "";
      otherData.hsn = hsn;
    }
    
    const product = await Product.findByIdAndUpdate(
      id,
      otherData,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      product: product
    });
    
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
```

### In Mongoose Schema
```javascript
// server/Models/AddProduct.js

const productSchema = new mongoose.Schema({
  itemcode: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    uppercase: true
  },
  
  hsn: {
    type: String,
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        // Allow empty OR 6-digit code
        return !v || /^\d{6}$/.test(v);
      },
      message: 'HSN must be exactly 6 digits (e.g., 260590)'
    }
  },
  
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  // ... other fields
});

// Pre-save middleware to normalize HSN
productSchema.pre('save', function(next) {
  if (this.hsn) {
    this.hsn = this.hsn.toUpperCase().trim();
  }
  next();
});
```

---

## 📊 Advanced Features

### HSN History Tracking (Optional)
```javascript
// server/Models/ProductHSNHistory.js
const hsnHistorySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  previousHSN: String,
  newHSN: String,
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  changeReason: String,
  changedAt: {
    type: Date,
    default: Date.now
  }
});

// Log HSN changes
async function logHSNChange(productId, oldHSN, newHSN, userId, reason) {
  await ProductHSNHistory.create({
    productId,
    previousHSN: oldHSN,
    newHSN,
    changedBy: userId,
    changeReason: reason,
    changedAt: new Date()
  });
}
```

### HSN Master (Optional)
```javascript
// server/Models/HSNMaster.js
const hsnMasterSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) { return /^\d{6}$/.test(v); }
    }
  },
  description: String,
  chapter: Number,           // 01-99
  heading: Number,           // 01-99
  subHeading: Number,        // 01-99
  gstRate: Number,           // 0, 5, 12, 18, 28
  applicableFrom: Date,
  repealed: {
    type: Boolean,
    default: false
  },
  deprecatedOn: Date,
  replacementHSN: String     // If repealed
});

// Validate HSN is still active
async function isHSNActive(hsn) {
  const record = await HSNMaster.findOne({ code: hsn });
  
  if (!record) {
    return { active: false, reason: 'HSN not found' };
  }
  
  if (record.repealed) {
    return {
      active: false,
      reason: `HSN repealed on ${record.deprecatedOn}`,
      replacementHSN: record.replacementHSN
    };
  }
  
  return { active: true, gstRate: record.gstRate };
}
```

---

## 🧪 Testing HSN Validation

### Unit Tests
```javascript
// test/hsnValidation.test.js

describe('HSN Validation', () => {
  
  test('should accept valid 6-digit HSN', () => {
    expect(validateHSNFormat("260590")).toEqual({ valid: true, isEmpty: false });
  });
  
  test('should reject invalid HSN format', () => {
    expect(validateHSNFormat("26059")).toEqual({ valid: false, error: '...' });
    expect(validateHSNFormat("ABC123")).toEqual({ valid: false, error: '...' });
    expect(validateHSNFormat("260590-ABC")).toEqual({ valid: false, error: '...' });
  });
  
  test('should accept empty HSN for optional countries', () => {
    expect(validateHSNRequirement("", 'AE', 1000000)).toEqual({ 
      valid: true, 
      optional: true 
    });
  });
  
  test('should require HSN for India', () => {
    const result = validateHSNRequirement("", 'IN', 600000);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('HSN');
  });
  
  test('should auto-uppercase HSN', () => {
    const hsn = normalizeHSN("abc123");  // Not valid but test uppercase
    expect(hsn).toBe("ABC123");
  });
});
```

### Integration Tests
```javascript
// test/hsnIntegration.test.js

describe('HSN Integration', () => {
  
  test('should create product with HSN', async () => {
    const response = await request(app)
      .post('/api/products')
      .send({
        itemcode: '1001',
        hsn: '260590',
        name: 'Coffee',
        // ... required fields
      });
    
    expect(response.status).toBe(201);
    expect(response.body.product.hsn).toBe('260590');
  });
  
  test('should reject invalid HSN format', async () => {
    const response = await request(app)
      .post('/api/products')
      .send({
        itemcode: '1001',
        hsn: 'INVALID',  // Invalid format
        name: 'Coffee'
        // ... required fields
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('HSN');
  });
});
```

---

## 🔍 API Endpoints

### GET - Retrieve Product with HSN
```bash
GET /api/products/:id

Response:
{
  "_id": "...",
  "itemcode": "1001",
  "hsn": "260590",
  "name": "Coffee Beans",
  "price": 500,
  ...
}
```

### POST - Create with HSN
```bash
POST /api/products

Body:
{
  "itemcode": "1001",
  "hsn": "260590",
  "name": "Coffee Beans",
  "categoryId": "...",
  "price": 500,
  "cost": 300,
  "vendor": "Supplier ABC",
  "stock": 100
}

Response:
{
  "success": true,
  "product": {
    "hsn": "260590",
    ...
  }
}
```

### PUT - Update HSN
```bash
PUT /api/products/:id

Body:
{
  "hsn": "090121"  // Change to Tea HSN
}

Response:
{
  "success": true,
  "product": {
    "hsn": "090121",
    ...
  }
}
```

### GET - Export with HSN
```bash
GET /api/products/export/csv

Returns CSV with columns:
Item Code, HSN Code, Name, Category, Price, ...
```

---

## 🚀 Implementation Checklist

### MVP (Minimum Viable Product)
- [x] HSN field in Product model
- [x] HSN input in Product form
- [x] Format validation (6 digits)
- [x] Browser uppercase conversion
- [x] Display in product table
- [x] Include in CSV export

### Phase 2: Enhancements
- [ ] HSN Master database
- [ ] Country-required validation
- [ ] HSN → Tax rate mapping
- [ ] Invoice HSN display
- [ ] HSN history tracking
- [ ] Bulk import support

### Phase 3: Advanced Features
- [ ] Real-time GST rate lookup
- [ ] GSTR report generation
- [ ] HSN amendment notifications
- [ ] Multi-HSN per product (variants)
- [ ] Deprecation handling

---

## 📞 Troubleshooting

### Issue: HSN Not Saving
```javascript
// Check 1: Format validation
if (!/^\d{6}$/.test(hsn)) {
  console.error('Invalid format');
}

// Check 2: Schema validation error
Product.validate((err) => {
  if (err) console.error('Validation error:', err);
});

// Check 3: Server logs
console.log('HSN before save:', hsn);  // Should be 6 digits
```

### Issue: HSN Not Displaying
```javascript
// Check 1: HSN exists in DB
const product = await Product.findById(id);
console.log('Stored HSN:', product.hsn);

// Check 2: Correct field in template
// Should be: product.hsn (not product.hsnCode or product.hsnNumber)

// Check 3: Not null/undefined
if (product.hsn) {
  display = product.hsn;
} else {
  display = '-';
}
```

### Issue: HSN Case Issues
```javascript
// HSN should always be uppercase
hsn = hsn.toUpperCase();

// Verify in pre-save hook
productSchema.pre('save', function(next) {
  if (this.hsn) {
    this.hsn = this.hsn.toUpperCase().trim();
  }
  next();
});
```

---

## 📚 References

- **Database:** [server/Models/AddProduct.js](../server/Models/AddProduct.js)
- **Frontend:** [client/src/components/product/Product.jsx](../client/src/components/product/Product.jsx)
- **Controller:** [server/controllers/productController.js](../server/controllers/productController.js)
- **Country Config:** [server/Models/CountryConfig.js](../server/Models/CountryConfig.js)

---

## 🎯 Summary

**HSN Implementation in NEXIS-ERP:**

✅ Format: 6-digit code  
✅ Country-aware: Required for India only  
✅ Validation: Format + optional requirement check  
✅ Storage: Uppercase, trimmed  
✅ Display: In tables, exports  
✅ Export: CSV includes HSN  

**For Developers:**
- Use `validateHSNFormat()` for format check
- Use `validateHSNRequirement()` for requirement check
- Always normalize to uppercase
- Test with 6-digit test codes

---

**Need Help?** Check HSN_MANAGEMENT_GUIDE.md for user guide or HSN_QUICK_START.md for quick reference.
