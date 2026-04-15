# Managing Multiple Stores with Different Names & Locations

## Real-World Scenario

```
Company: NEXIS RETAIL LLC (Legal Entity)
├── Headquarters: Dubai, UAE

Store A: Main Store (Same location as HQ)
├── Name: NEXIS Main Store
├── Location: Dubai, UAE
├── Address: Same as Company HQ

Store B: Branch Store (Different location)
├── Name: NEXIS Abu Dhabi Branch
├── Location: Abu Dhabi, UAE
├── Address: Different from Company HQ

Store C: Regional Office (Another location)
├── Name: NEXIS Sharjah Outlet
├── Location: Sharjah, UAE
├── Address: Different from Company HQ
```

---

## Correct Data Structure

### Company (ONE) - Headquarters/Legal Entity
```javascript
{
  _id: "company_001",
  companyName: "NEXIS RETAIL LLC",
  registrationNumber: "1234567",
  address: "123 Business Park, Dubai",
  city: "Dubai",
  country: "AE",
  email: "company@nexis.com",
  phone: "+971501234567",
  currency: "AED",
  taxRate: 5.0
}
```

### Organization (MULTIPLE) - Store Locations
Each store location is an Organization:

```javascript
// Store A - Main Location
{
  _id: "org_001",
  name: "NEXIS Main Store Dubai",
  code: "STORE_DXB_001",
  type: "STORE",
  companyId: "company_001",
  address: "123 Business Park, Dubai",  // Same as Company (no override needed)
  city: "Dubai",
  country: "AE",
  addressOverride: false,               // Using company address
  phone: "+971501111111",
  email: "store1@nexis.com",
  currency: "AED",
  manager: "user_001"
}

// Store B - Abu Dhabi Location
{
  _id: "org_002",
  name: "NEXIS Abu Dhabi Branch",
  code: "STORE_AUH_001",
  type: "STORE",
  companyId: "company_001",
  address: "456 Mall Road, Abu Dhabi",  // DIFFERENT location
  city: "Abu Dhabi",
  country: "AE",
  addressOverride: true,                // Using own address (override)
  phone: "+971672222222",
  email: "store2@nexis.com",
  currency: "AED",
  manager: "user_002"
}

// Store C - Sharjah Location
{
  _id: "org_003",
  name: "NEXIS Sharjah Outlet",
  code: "STORE_SHJ_001",
  type: "STORE",
  companyId: "company_001",
  address: "789 Center Plaza, Sharjah",  // DIFFERENT location
  city: "Sharjah",
  country: "AE",
  addressOverride: true,                // Using own address (override)
  phone: "+971656333333",
  email: "store3@nexis.com",
  currency: "AED",
  manager: "user_003"
}
```

### StoreSettings (MULTIPLE) - Terminal/Sales Configuration

Each store has sales controls and terminal settings:

```javascript
// Store A Settings
{
  _id: "settings_001",
  organizationId: "org_001",  // References Store A Organization
  terminalSettings: [
    {
      terminalId: "DXB_T001",
      terminalName: "Counter 1",
      invoiceNumberPrefix: "DXB"
    },
    {
      terminalId: "DXB_T002",
      terminalName: "Counter 2",
      invoiceNumberPrefix: "DXB"
    }
  ],
  salesControls: {
    enableCreditSale: true,
    enableReturns: true
  },
  printerConfig: { ... }
}

// Store B Settings
{
  _id: "settings_002",
  organizationId: "org_002",  // References Store B Organization
  terminalSettings: [
    {
      terminalId: "AUH_T001",
      terminalName: "Counter 1",
      invoiceNumberPrefix: "AUH"
    },
    {
      terminalId: "AUH_T002",
      terminalName: "Counter 2",
      invoiceNumberPrefix: "AUH"
    }
  ],
  salesControls: {
    enableCreditSale: false,  // Different policy
    enableReturns: true
  },
  printerConfig: { ... }
}
```

---

## Schema Updates

### Updated Organization Schema

```javascript
const organizationSchema = new mongoose.Schema({
  // Basic Info
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['HEAD_OFFICE', 'REGIONAL', 'STORE'],
    default: 'STORE'
  },

  // Hierarchy & References
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true                    // EVERY org belongs to a company
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null
  },

  // Address Management
  address: String,
  city: String,
  state: String,
  postalCode: String,
  country: {
    type: String,
    enum: ['AE', 'OM', 'IN'],
    required: true
  },
  
  // Address Override Flag
  addressOverride: {
    type: Boolean,
    default: false,
    description: 'If true, use this address. If false, inherit from company'
  },

  // Contact Info
  phone: String,
  email: String,
  
  // Store-Specific Settings
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  currency: {
    type: String,
    default: 'AED'
  },
  timezone: {
    type: String,
    default: 'Asia/Dubai'
  },
  
  // Tax Info
  taxNumber: String,
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });
```

### Updated StoreSettings Schema

```javascript
const storeSettingsSchema = new mongoose.Schema({
  // Reference to Organization (Store Location)
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    unique: true                     // One settings per store
  },

  // Terminal Settings
  terminalSettings: [{ ... }],
  
  // Sales Controls
  salesControls: { ... },
  
  // Printer Config
  printerModel: String,
  printerPort: String,
  
  // POS/Sales Specific
  barcodePrefix: String,
  barcodeFormat: String,
  
  // NO ADDRESS FIELDS HERE ❌
  // Get address from populate('organizationId')

}, { timestamps: true });
```

---

## API Endpoints

### Get All Stores with Locations

```bash
GET /api/v1/stores

Response:
{
  "success": true,
  "data": [
    {
      "_id": "org_001",
      "name": "NEXIS Main Store Dubai",
      "code": "STORE_DXB_001",
      "address": "123 Business Park, Dubai",
      "city": "Dubai",
      "phone": "+971501111111",
      "terminals": 2,
      "manager": "Ahmed Al Mansoori",
      "address_source": "company"  // Indicates where address comes from
    },
    {
      "_id": "org_002",
      "name": "NEXIS Abu Dhabi Branch",
      "code": "STORE_AUH_001",
      "address": "456 Mall Road, Abu Dhabi",
      "city": "Abu Dhabi",
      "phone": "+971672222222",
      "terminals": 2,
      "manager": "Fatima Al Mazrouei",
      "address_source": "custom"   // Indicates store-specific address
    },
    {
      "_id": "org_003",
      "name": "NEXIS Sharjah Outlet",
      "code": "STORE_SHJ_001",
      "address": "789 Center Plaza, Sharjah",
      "city": "Sharjah",
      "phone": "+971656333333",
      "terminals": 2,
      "manager": "Mohammed Al Kaabi",
      "address_source": "custom"
    }
  ]
}
```

### Get Store Details with Full Address

```bash
GET /api/v1/stores/:organizationId/details

Response:
{
  "success": true,
  "data": {
    "store": {
      "_id": "org_002",
      "name": "NEXIS Abu Dhabi Branch",
      "code": "STORE_AUH_001",
      "manager": "Fatima Al Mazrouei"
    },
    "address": {
      "line1": "456 Mall Road",
      "line2": "Abu Dhabi",
      "city": "Abu Dhabi",
      "postalCode": "12345",
      "country": "AE",
      "country_name": "United Arab Emirates",
      "source": "store_specific",  // "company" or "store_specific"
      "phone": "+971672222222",
      "email": "store2@nexis.com",
      "taxNumber": "TAX123456"
    },
    "company": {
      "name": "NEXIS RETAIL LLC",
      "registrationNumber": "1234567"
    },
    "settings": {
      "terminals": 2,
      "currency": "AED",
      "timezone": "Asia/Dubai",
      "invoicePrefix": "AUH"
    }
  }
}
```

### Create Store in Different Location

```bash
POST /api/v1/stores

Body:
{
  "name": "NEXIS Abu Dhabi Branch",
  "code": "STORE_AUH_001",
  "type": "STORE",
  "companyId": "company_001",
  "address": "456 Mall Road, Abu Dhabi",
  "city": "Abu Dhabi",
  "postalCode": "12345",
  "country": "AE",
  "phone": "+971672222222",
  "email": "store2@nexis.com",
  "addressOverride": true,           // Store has different address
  "manager": "user_002",
  "currency": "AED",
  "timezone": "Asia/Dubai"
}

Response:
{
  "success": true,
  "message": "Store created successfully",
  "data": {
    "_id": "org_002",
    "name": "NEXIS Abu Dhabi Branch",
    "code": "STORE_AUH_001",
    "address": "456 Mall Road, Abu Dhabi",
    "addressOverride": true,
    "phone": "+971672222222"
  }
}
```

---

## Data Resolution Logic

### Backend Controller Function

```javascript
// Get store with resolved address
async getStoreFullDetails(req, res) {
  try {
    const { storeId } = req.params;
    
    // Get Organization (Store Location)
    const store = await Organization.findById(storeId)
      .populate('companyId')
      .populate('manager', 'name email phone');
    
    if (!store) {
      return res.status(404).json({ 
        success: false, 
        message: 'Store not found' 
      });
    }
    
    // Resolve Address (Single Source of Truth)
    let address = {};
    let addressSource = 'company';
    
    if (store.addressOverride) {
      // Store has custom address
      address = {
        line1: store.address,
        city: store.city,
        postalCode: store.postalCode,
        country: store.country,
        phone: store.phone,
        email: store.email
      };
      addressSource = 'store_specific';
    } else {
      // Inherit from Company
      address = {
        line1: store.companyId.address,
        city: store.companyId.city,
        postalCode: store.companyId.postalCode,
        country: store.companyId.country,
        phone: store.companyId.phone,
        email: store.companyId.email
      };
      addressSource = 'company';
    }
    
    // Get Store Settings
    const settings = await StoreSettings.findOne({ organizationId: storeId });
    
    return res.json({
      success: true,
      data: {
        store: {
          _id: store._id,
          name: store.name,
          code: store.code,
          type: store.type,
          manager: store.manager
        },
        address,
        addressSource,
        company: {
          name: store.companyId.companyName,
          id: store.companyId._id
        },
        settings: {
          terminals: settings?.terminalSettings?.length || 0,
          currency: store.currency,
          timezone: store.timezone
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
}
```

---

## Frontend Store Management UI

### Display Store List

```javascript
const StoreListComponent = () => {
  const [stores, setStores] = useState([]);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    const response = await axios.get('/api/v1/stores');
    setStores(response.data.data);
  };

  return (
    <div className="stores-grid">
      {stores.map(store => (
        <StoreCard key={store._id} store={store} />
      ))}
    </div>
  );
};

// Store Card Component
const StoreCard = ({ store }) => {
  return (
    <div className="card">
      <h3>{store.name}</h3>
      <p><strong>Code:</strong> {store.code}</p>
      <p><strong>Location:</strong> {store.city}, {store.country}</p>
      <p><strong>Address:</strong> {store.address}</p>
      <p>
        <strong>Address Type:</strong> 
        <span className={store.address_source === 'company' ? 'badge-primary' : 'badge-secondary'}>
          {store.address_source === 'company' ? 'Company Headquarters' : 'Store-Specific'}
        </span>
      </p>
      <p><strong>Manager:</strong> {store.manager}</p>
      <p><strong>Phone:</strong> {store.phone}</p>
      <button onClick={() => editStore(store._id)}>Edit</button>
      <button onClick={() => deleteStore(store._id)}>Delete</button>
    </div>
  );
};
```

### Create/Edit Store Form

```javascript
const StoreFormModal = ({ store, onSave }) => {
  const [formData, setFormData] = useState(store || {
    name: '',
    code: '',
    address: '',
    city: '',
    country: 'AE',
    phone: '',
    email: '',
    addressOverride: false
  });

  const handleAddressOverrideChange = (e) => {
    setFormData({
      ...formData,
      addressOverride: e.target.checked
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await axios.post('/api/v1/stores', formData);
    onSave();
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Store Name & Code */}
      <div className="form-group">
        <label>Store Name *</label>
        <input
          type="text"
          placeholder="e.g., NEXIS Abu Dhabi Branch"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label>Store Code *</label>
        <input
          type="text"
          placeholder="e.g., STORE_AUH_001"
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          required
        />
      </div>

      {/* Address Override Checkbox */}
      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={formData.addressOverride}
            onChange={handleAddressOverrideChange}
          />
          Store has different location (otherwise use company address)
        </label>
      </div>

      {/* Address Fields (Show only if override checked) */}
      {formData.addressOverride && (
        <>
          <div className="form-group">
            <label>Address *</label>
            <input
              type="text"
              placeholder="Street address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required={formData.addressOverride}
            />
          </div>

          <div className="form-group">
            <label>City *</label>
            <input
              type="text"
              placeholder="e.g., Abu Dhabi"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required={formData.addressOverride}
            />
          </div>

          <div className="form-group">
            <label>Postal Code</label>
            <input
              type="text"
              placeholder="Postal code"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Country</label>
            <select
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            >
              <option value="AE">United Arab Emirates</option>
              <option value="OM">Oman</option>
              <option value="IN">India</option>
            </select>
          </div>
        </>
      )}

      {/* Contact Info */}
      <div className="form-group">
        <label>Phone</label>
        <input
          type="tel"
          placeholder="+971"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label>Email</label>
        <input
          type="email"
          placeholder="store@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      <button type="submit" className="btn-primary">Save Store</button>
    </form>
  );
};
```

---

## Key Points

✅ **Store Name**: Stored in Organization.name (can be different)
✅ **Store Location**: Each Organization can have its own address
✅ **Address Override**: Flag indicates if store has custom address
✅ **Company Address**: Primary source, inherited unless overridden
✅ **NO Duplication**: Address only stored once (in Company or Organization)
✅ **Automatic Resolution**: API resolves address based on override flag

---

## Examples

### Store A (Same as Company)
```
addressOverride: false
Company Address: 123 Business Park, Dubai
Display: 123 Business Park, Dubai ✅
```

### Store B (Different Location)
```
addressOverride: true
Organization Address: 456 Mall Road, Abu Dhabi
Display: 456 Mall Road, Abu Dhabi ✅
```

### Store C (Another Location)
```
addressOverride: true
Organization Address: 789 Center Plaza, Sharjah
Display: 789 Center Plaza, Sharjah ✅
```

---

## Data Flow

```
Create Store
    ↓
If addressOverride = true:
  ├─ Save store-specific address in Organization
  └─ Display: "Store-Specific Address"
    ↓
If addressOverride = false:
  ├─ Don't store address (null)
  └─ Display: "Inherited from Company"
    ↓
Fetch Store Details:
  ├─ Check addressOverride flag
  ├─ If true: use Organization.address
  └─ If false: use Company.address automatically
    ↓
Result: Always ONE source of truth ✅
```

---

## Migration Notes

- Existing stores need `addressOverride` flag set based on comparison:
  - If StoreSettings.address === Company.address → `addressOverride: false`
  - If StoreSettings.address !== Company.address → `addressOverride: true`, copy to Organization
- Remove address fields from StoreSettings after successful migration
