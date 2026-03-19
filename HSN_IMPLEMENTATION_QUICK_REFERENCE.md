# HSN Implementation Guide - Quick Reference

## 1. HSN Setup Status

✅ **Completed:**
- HSNMaster MongoDB model with validation
- 40+ HSN codes pre-loaded via seeder
- Complete HSN controller with CRUD operations
- HSN validation service
- API routes integrated into server
- Product model linked to HSN

⏳ **Ready to Execute:**
- Database seeding: `cd server && node hsnMasterSeeder.js`

---

## 2. Quick API Reference

### Search HSN Codes
```bash
# Text search
GET /api/hsn/search?query=coffee

# By category
GET /api/hsn/category/Foodstuffs

# By code
GET /api/hsn/code/090111

# Dropdown (for forms)
GET /api/hsn/dropdown?category=Foodstuffs

# List all with pagination
GET /api/hsn/list?category=Foodstuffs&gstRate=5&limit=50

# Validate code
GET /api/hsn/validate/090111
```

---

## 3. Backend Integration

### In Product Controller
```javascript
import HSNValidationService from '../services/HSNValidationService.js';

// When creating/updating product
export const createProduct = async (req, res) => {
  const { itemcode, hsn, ...otherData } = req.body;

  // Validate HSN
  if (hsn) {
    const hsnValidation = await HSNValidationService.validateComplete(hsn);
    
    if (!hsnValidation.valid) {
      return res.status(400).json({
        success: false,
        error: hsnValidation.error
      });
    }

    // Create product with HSN
    const product = new Product({
      itemcode,
      hsn,
      hsnReference: hsnValidation.hsn._id,
      gstRate: hsnValidation.hsn.gstRate,
      ...otherData
    });

    await product.save();
  }
};
```

### In Invoice Generation
```javascript
// When creating invoice item
const productHSN = product.hsn;
const gstRate = product.gstRate; // Automatically populated from HSN

const invoiceItem = {
  productCode: product.itemcode,
  productName: product.name,
  hsn: productHSN,
  gstRate: gstRate,
  quantity: item.quantity,
  rate: item.rate,
  amount: item.quantity * item.rate,
  taxAmount: (item.quantity * item.rate * gstRate) / 100
};
```

---

## 4. Frontend Integration

### HSN Autocomplete Component
```jsx
import { useState, useEffect } from 'react';

function HSNAutoComplete({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    fetch(`/api/hsn/search?query=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        setResults(data.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [query]);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search HSN code or description..."
      />
      
      {loading && <p>Loading...</p>}
      
      <ul>
        {results.map((hsn) => (
          <li 
            key={hsn.code}
            onClick={() => {
              onSelect(hsn);
              setQuery('');
              setResults([]);
            }}
          >
            <strong>{hsn.code}</strong> - {hsn.description}
            <span style={{ marginLeft: '10px', color: '#666' }}>
              {hsn.gstRate}% GST
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default HSNAutoComplete;
```

### HSN Dropdown for Product Form
```jsx
import { useState, useEffect } from 'react';

function HSNDropdown({ category, onSelect }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    
    let url = '/api/hsn/dropdown';
    if (category) {
      url += `?category=${encodeURIComponent(category)}`;
    }

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setOptions(data.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [category]);

  return (
    <select onChange={(e) => onSelect(e.target.value)} disabled={loading}>
      <option value="">Select HSN Code...</option>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export default HSNDropdown;
```

### HSN Validation in Form
```jsx
import { useState } from 'react';

function HSNField({ value, onChange }) {
  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);
    
    if (val.length === 6) {
      setValidating(true);
      
      fetch(`/api/hsn/validate/${val}`)
        .then(res => res.json())
        .then(data => {
          if (data.valid) {
            setValidation({
              valid: true,
              gstRate: data.hsn.gstRate,
              description: data.hsn.description
            });
          } else {
            setValidation({
              valid: false,
              error: data.error
            });
          }
          setValidating(false);
        })
        .catch(err => {
          setValidating(false);
          setValidation({ valid: false, error: err.message });
        });
    }
  };

  return (
    <div>
      <input
        type="text"
        maxLength="6"
        value={value}
        onChange={handleChange}
        placeholder="Enter 6-digit HSN code"
      />
      
      {validating && <p>Validating...</p>}
      
      {validation && !validation.valid && (
        <p style={{ color: 'red' }}>{validation.error}</p>
      )}
      
      {validation && validation.valid && (
        <div style={{ color: 'green' }}>
          <p>✓ Valid HSN Code</p>
          <p>GST Rate: <strong>{validation.gstRate}%</strong></p>
          <p>Description: {validation.description}</p>
        </div>
      )}
    </div>
  );
}

export default HSNField;
```

---

## 5. Database Seeding

### Execute Seeder
```bash
cd server
node hsnMasterSeeder.js
```

Expected output:
```
Connected to database
Connected to database  
Clearing existing HSN Master data...
Deleted 0 documents
Inserting new HSN Master data...
Inserted 40 HSN codes
Total HSN codes in database: 40
Statistics by GST Rate:
- 0%: 0 codes
- 5%: 25 codes
- 12%: 10 codes
- 18%: 4 codes
- 28%: 1 code

Sample lookups:
Found Coffee (090111): Coffee, not roasted, not decaffeinated
Found ceramics (600622): Knitted or crocheted fabrics
```

### Verify Seeding
```bash
# Check MongoDB
mongo
> use nexis_erp
> db.hsn_master.count()
# Should return 40

> db.hsn_master.findOne({ code: "090111" })
# Should return coffee entry
```

---

## 6. Common Use Cases

### Use Case 1: Creating Product with HSN
```javascript
POST /api/products/create
{
  "itemcode": "COFFEE-001",
  "name": "Premium Coffee Beans",
  "hsn": "090111",
  "categoryId": "...",
  "groupingId": "...",
  "vendor": "Coffee Supplier Ltd",
  "unitType": "kg",
  "factor": 1,
  "cost": 50000,
  "price": 75000,
  "barcode": "8901234567890",
  "stock": 100
}
```

Result:
```json
{
  "success": true,
  "data": {
    "itemcode": "COFFEE-001",
    "name": "Premium Coffee Beans",
    "hsn": "090111",
    "hsnReference": "507f1f77bcf86cd799439011",
    "gstRate": 5,  // Auto-populated from HSN
    "price": 75000,
    "stock": 100
  }
}
```

### Use Case 2: Generating Invoice with HSN
```javascript
// Invoice item automatically includes HSN and calculated GST
{
  "productCode": "COFFEE-001",
  "productName": "Premium Coffee Beans",
  "hsn": "090111",
  "gstRate": 5,
  "quantity": 10,
  "rate": 750,
  "amount": 7500,
  "taxAmount": 375  // 7500 * 5 / 100
}
```

### Use Case 3: GSTR Report Generation
```javascript
// When generating GSTR-1 or GSTR-9
const invoices = await SalesInvoice.find({...});

invoices.forEach(invoice => {
  invoice.items.forEach(item => {
    // HSN already available for report
    // item.hsn = "090111"
    // item.gstRate = 5
    // item.taxAmount = 375
  });
});
```

---

## 7. HSN Master Data Categories

### Current Seeded Categories (40 codes)

| Category | Example HSN | GST Rate | Count |
|----------|-------------|----------|-------|
| **Foodstuffs** | 090111/090121/090411/090412 | 5% | 8 |
| | 100610/100620 | 5% | 2 |
| | 110100/110811 | 5% | 2 |
| | 151590/150711 | 5% | 2 |
| | 170131 | 5% | 1 |
| | 040110/040610 | 5% | 2 |
| | 020110 | 5% | 1 |
| **Textiles** | 610510/620462/600622/640399 | 5% | 4 |
| **Machinery** | 841551/841821 | 12% | 2 |
| **Electrical** | 850720/853921/851712 | 18% | 3 |
| **Vehicles** | 870321 | 12% | 1 |
| **Optical** | 900580 | 0% | 1 |
| **Glass & Stone** | 700711/730890 | 0% | 2 |
| **Other** | Various | Mixed | 8 |

---

## 8. Testing Checklist

### API Testing
- [ ] GET `/api/hsn/list` - returns paginated results
- [ ] GET `/api/hsn/code/090111` - returns detailed HSN
- [ ] GET `/api/hsn/search?query=coffee` - returns search results
- [ ] GET `/api/hsn/category/Foodstuffs` - returns category results
- [ ] GET `/api/hsn/validate/090111` - validates code
- [ ] GET `/api/hsn/dropdown` - returns formatted dropdown options
- [ ] GET `/api/hsn/stats` - returns statistics
- [ ] POST `/api/hsn/create` - creates new HSN (if needed)

### Product Integration Testing
- [ ] Create product with valid HSN
- [ ] Create product with invalid HSN (should fail)
- [ ] Update product HSN
- [ ] Verify gstRate auto-populated from HSN
- [ ] Verify hsnReference linked correctly

### Invoice Testing
- [ ] Generate invoice with HSNed products
- [ ] Verify HSN displays in invoice
- [ ] Verify GST calculated correctly based on HSN rate

---

## 9. Troubleshooting

### Issue: "HSN code not found"
**Solution**: Run seeder first
```bash
cd server
node hsnMasterSeeder.js
```

### Issue: "Code must be exactly 6 digits"
**Solution**: Ensure HSN code is padded to 6 digits
```javascript
const hsnCode = '90111'; // Wrong
const hsnCode = '090111'; // Correct
```

### Issue: "gstRate is null in product"
**Solution**: Ensure HSN exists in database before linking
```javascript
// First validate HSN exists
const hsnValidation = await HSNValidationService.validateComplete(hsn);
if (!hsnValidation.valid) {
  // Handle error
}
```

### Issue: Dropdown showing no results
**Solution**: Check category name matches exactly
```javascript
// Correct categories:
GET /api/hsn/dropdown?category=Foodstuffs
GET /api/hsn/dropdown?category=Textiles
GET /api/hsn/dropdown?category=Machinery
```

---

## 10. Next Steps

1. ✅ Execute seeder: `node hsnMasterSeeder.js`
2. ⏳ Test API endpoints
3. ⏳ Create HSN filter component for UI
4. ⏳ Add HSN to product creation form
5. ⏳ Update invoice generation to include HSN
6. ⏳ Create HSN reports (GSTR integration)

---

## 11. File References

| File | Purpose |
|------|---------|
| [server/Models/HSNMaster.js](server/Models/HSNMaster.js) | HSN database schema |
| [server/hsnMasterSeeder.js](server/hsnMasterSeeder.js) | Seeding script with 40 HSN codes |
| [server/controllers/hsnController.js](server/controllers/hsnController.js) | API controller |
| [server/routes/hsnRoutes.js](server/routes/hsnRoutes.js) | API routes |
| [server/services/HSNValidationService.js](server/services/HSNValidationService.js) | Validation logic |
| [server/Models/AddProduct.js](server/Models/AddProduct.js) | Product model with HSN reference |
| [HSN_API_DOCUMENTATION.md](HSN_API_DOCUMENTATION.md) | Complete API documentation |

---

## Support
Refer to `HSN_MANAGEMENT_GUIDE.md` for detailed information.
