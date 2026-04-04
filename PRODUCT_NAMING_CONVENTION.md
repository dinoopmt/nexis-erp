# 📝 Auto-Capitalization & Naming Convention System

## Overview
Complete product naming standardization system with:
- ✅ Auto-capitalization on save (Title Case)
- ✅ Real-time validation (prevent lowercase/all caps)
- ✅ Duplicate name detection
- ✅ Store-wide configurable rules
- ✅ Title Case format enforcement
- ✅ Beautiful UI with live feedback

---

## 🎯 Features

### 1. **Auto-Capitalization** (Title Case)
```
Input:  "sony headphones pro"
Save:   "Sony Headphones Pro"

Input:  "APPLE IPHONE"
Save:   "Apple Iphone"

Input:  "samsung galaxy a50"
Save:   "Samsung Galaxy A50"
```

### 2. **Real-Time Validation**
While user types:
- ✅ Prevents all lowercase
- ✅ Prevents all UPPERCASE
- ✅ Shows preview of auto-formatted name
- ✅ Displays errors/warnings
- ✅ Checks for duplicates on blur

### 3. **Duplicate Detection**
```
Prevents:
- "Sony Headphones" (if already exists)
- "SONY HEADPHONES" (same name, different case)
- "sony headphones" (normalized comparison)

Shows:
- List of similar existing products
- Clear error message
```

### 4. **Store Settings Control**
Admin can configure:
- Naming convention (Title Case, lowercase, UPPERCASE, Sentence Case)
- Validation rules (prevent lowercase, prevent UPPERCASE)
- Auto-format on save
- Duplicate checking
- Enable/disable entire system

---

## 🏗️ System Architecture

### File Structure
```
/client/src/
├── utils/
│   └── productNamingConvention.js         ← Core logic
├── hooks/
│   └── useProductNamingValidation.js      ← React hook
├── components/
│   ├── inputs/
│   │   └── ProductNameInput.jsx           ← Input with validation UI
│   ├── settings/
│   │   └── ProductNamingSettings.jsx      ← Admin settings modal
│   └── shared/
│       └── GlobalProductFormModal.jsx     ← Updated to use validation
└── PRODUCT_NAMING_CONVENTION.md           ← This file
```

### Data Flow

```
User Types Product Name
    ↓
ProductNameInput captures onChange
    ↓
useProductNamingValidation.validate()
    ↓
Real-time error/warning display
    ↓
User blur → checkDuplicate()
    ↓
Show duplicate warning if exists
    ↓
User clicks Save
    ↓
GlobalProductFormModal calls validateAndPrepareForSave()
    ↓
Final validation + duplicate check
    ↓
Auto-capitalize name
    ↓
Send to API with processed name
```

---

## 🔧 Core Utilities

### productNamingConvention.js Functions

#### `toTitleCase(name)`
Converts to Title Case (Each Word Capitalized)
```javascript
toTitleCase("sony headphones pro")
// → "Sony Headphones Pro"
```

#### `validateProductName(name, options)`
Validates against configured rules
```javascript
validateProductName("apple", {
  allowLowercase: false,
  allowAllCaps: false,
  minLength: 2,
  maxLength: 100,
})
// → { isValid: true, errors: [], warnings: [] }
```

#### `checkDuplicateProductName(name, productId)`
Checks if name already exists (API call)
```javascript
await checkDuplicateProductName("Sony Headphones", null)
// → { isDuplicate: true, similarProducts: [...] }
```

#### `normalizeProductName(name)`
Trims and applies Title Case
```javascript
normalizeProductName("  APPLE IPHONE  ")
// → "Apple Iphone"
```

#### `getStoreNamingRules()`
Fetches rules from store settings (API call)
```javascript
await getStoreNamingRules()
// → {
//     enabled: true,
//     convention: 'titleCase',
//     preventLowercase: true,
//     preventAllCaps: true,
//     enforceOnSave: true,
//     checkDuplicates: true
//   }
```

---

## 🎣 useProductNamingValidation Hook

### Usage
```jsx
const namingValidation = useProductNamingValidation(productId);

// State
namingValidation.storeRules        // Loaded store settings
namingValidation.validationResult  // Validation errors/warnings
namingValidation.duplicateCheck    // Duplicate check result
namingValidation.isCheckingDuplicate // Loading state
namingValidation.isLoadingRules    // Rules loading state

// Functions
namingValidation.validate(name)              // Validate name
namingValidation.checkDuplicate(name)        // Check duplicates
namingValidation.normalize(name)             // Normalize name
namingValidation.applyConvention(name)       // Apply convention
namingValidation.validateAndPrepareForSave(name)  // Full save prep

// Helpers
namingValidation.getErrorMessage()           // Display error
namingValidation.getWarningMessage()         // Display warning
namingValidation.isValid                     // Boolean valid state
```

---

## 🎨 ProductNameInput Component

### Usage
```jsx
<ProductNameInput
  value={productName}
  onChange={setProductName}
  onBlur={handleNameBlur}
  errors={validationErrors}
  disabled={isLoading}
  productId={editingProductId}
  label="Product Name *"
/>
```

### Features
- Real-time validation display
- Status icons (✓, ⚠️, ✗)
- Preview of auto-capitalized name
- Duplicate detection with similar products list
- Error and warning messages
- Loading states

---

## ⚙️ ProductNamingSettings Component

### Purpose
Admin settings to configure naming rules for entire store

### Configuration Options
```javascript
{
  enabled: true,              // Enable/disable system
  convention: 'titleCase',    // titleCase | lowercase | UPPERCASE | sentenceCase
  preventLowercase: true,     // Reject all lowercase names
  preventAllCaps: true,       // Reject all UPPERCASE names
  enforceOnSave: true,        // Auto-capitalize on save
  checkDuplicates: true,      // Check for duplicate names
}
```

---

## 🔌 Integration with GlobalProductFormModal

### Current Integration
```javascript
// 1. Import hook
import useProductNamingValidation from "../../hooks/useProductNamingValidation";

// 2. Use in component
const namingValidation = useProductNamingValidation(productData?._id);

// 3. In handleSaveProduct
const nameValidationResult = await namingValidation.validateAndPrepareForSave(newProduct.name);

if (!nameValidationResult.isValid) {
  showToast('error', nameValidationResult.error);
  return;
}

// 4. Use processed name
const processedProduct = {
  ...newProduct,
  name: nameValidationResult.processedName,
};
```

---

## 📡 Required API Endpoints

### Backend endpoints needed:

#### 1. **GET /settings/naming-rules**
Get store naming convention settings
```
Response:
{
  enabled: boolean,
  convention: string,
  preventLowercase: boolean,
  preventAllCaps: boolean,
  enforceOnSave: boolean,
  checkDuplicates: boolean,
}
```

#### 2. **PUT /settings/naming-rules**
Update store naming convention settings
```
Body: { enabled, convention, preventLowercase, ... }
```

#### 3. **GET /products/check-duplicate-name**
Check if product name already exists
```
Query params:
  name: string (normalized name to check)
  excludeId: string (product ID to exclude from check)

Response:
{
  isDuplicate: boolean,
  similarProducts: [{ _id, name }, ...]
}
```

---

## 🧪 Testing

### Test Cases

#### 1. Basic Validation
- [ ] "apple" → Valid
- [ ] "" → Invalid (empty)
- [ ] "a" → Invalid (too short)
- [ ] (100+ chars) → Invalid (too long)

#### 2. Case Validation
- [ ] "apple" → Error (lowercase enabled)
- [ ] "APPLE" → Error (uppercase enabled)
- [ ] "Apple" → Valid (Title Case)

#### 3. Duplicate Detection
- [ ] "Apple Iphone" (exists) → Duplicate error
- [ ] "apple iphone" (exists) → Duplicate error (case normalized)
- [ ] "New Product" (not exists) → Valid

#### 4. Auto-Capitalization
- [ ] "sony headphones" → "Sony Headphones"
- [ ] "SAMSUNG GALAXY" → "Samsung Galaxy"
- [ ] "LG tv pro" → "Lg Tv Pro"

#### 5. UI Feedback
- [ ] Error message displays
- [ ] Warning message displays
- [ ] Preview shows auto-capitalized name
- [ ] Status icons show correct state
- [ ] Duplicate list shows similar products

---

## 🚀 Usage Examples

### Example 1: Basic Integration
```jsx
import ProductNameInput from '../components/inputs/ProductNameInput';

function ProductForm() {
  const [productName, setProductName] = useState('');
  const [errors, setErrors] = useState({});

  return (
    <ProductNameInput
      value={productName}
      onChange={setProductName}
      errors={errors}
      productId={editingProductId}
    />
  );
}
```

### Example 2: Custom Validation
```jsx
import useProductNamingValidation from '../hooks/useProductNamingValidation';

function MyComponent() {
  const namingValidation = useProductNamingValidation();

  const handleSave = async (name) => {
    const result = await namingValidation.validateAndPrepareForSave(name);
    
    if (result.isValid) {
      // Save with result.processedName
      api.saveProduct(result.processedName);
    } else {
      // Show error
      alert(result.error);
    }
  };
}
```

### Example 3: Settings Configuration
```jsx
import ProductNamingSettings from '../components/settings/ProductNamingSettings';

function AdminPage() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <button onClick={() => setShowSettings(true)}>
        Configure Naming
      </button>
      <ProductNamingSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}
```

---

## 🎯 Naming Convention Rules

### **Title Case** (Recommended - ERP Standard)
```
Format:  Each Word Capitalized
Example: "Sony Headphones Pro 2024"
Use for: Products, categories, standard inventory

Exceptions:
"and", "or", "in", "on", "at", "the", "a", "an" 
→ Kept lowercase unless first word
```

### **Sentence Case**
```
Format:  Only first word capitalized
Example: "Sony headphones pro 2024"
```

### **lowercase** (Not recommended)
```
Format:  All lowercase
Example: "sony headphones pro 2024"
```

### **UPPERCASE** (Not recommended)
```
Format:  All uppercase
Example: "SONY HEADPHONES PRO 2024"
```

---

## 🛡️ Validation Rules

| Rule | Purpose | Example |
|------|---------|---------|
| **Prevent Lowercase** | Enforce proper formatting | ❌ "sony headphones" |
| **Prevent UPPERCASE** | Prevent all-caps product names | ❌ "SONY HEADPHONES" |
| **Prevent Duplicates** | Maintain unique products | ❌ "Sony Headphones" (already exists) |
| **Min Length** | Force meaningful names | ❌ "S" (default min: 2) |
| **Max Length** | Prevent absurdly long names | ❌ (>100 chars, default max: 100) |

---

## 📊 Store Settings Interface

Admin can access via:
1. **Settings → Product Management → Naming Convention**
2. OR Keyboard shortcut: `Ctrl+,` → **Naming Settings**

### Configuration Screen
- Toggle naming system on/off
- Choose convention (dropdown)
- Toggle validation rules (checkboxes)
- Toggle auto-format on save
- Toggle duplicate checking
- Save button

---

## 🔄 Workflow Example

### User Journey: Create Product "sony headphones"

1. **User types** in product name field
   - Input: "sony headphones"
   - Real-time validation: ⚠️ "lowercase not allowed"
   - Preview: "Sony Headphones"

2. **User tabs out** (blur event)
   - Duplicate check: ✓ "No duplicate found"

3. **User clicks Save**
   - Final validation: ✅ Pass
   - Duplicate check: ✅ Pass
   - Auto-capitalize: "sony headphones" → "Sony Headphones"
   - API send: `{ name: "Sony Headphones" }`
   - Success toast: "Product saved!"

---

## 🎓 Best Practices

### For Users
- ✅ Type product names normally (e.g., "sony headphones")
- ✅ Don't worry about capitalization (auto-done on save)
- ✅ Use meaningful, descriptive names
- ✅ Check for duplicates (system alerts you)

### For Admins
- ✅ Keep Title Case as default convention
- ✅ Always enable duplicate checking
- ✅ Review store naming settings annually
- ✅ Communicate naming standards to team

### For Developers
- ✅ Always use `validateAndPrepareForSave()` before saving
- ✅ Handle both frontend and backend validation
- ✅ Provide real-time UI feedback
- ✅ Log naming convention errors for debugging

---

## ❓ FAQ

**Q: Why auto-capitalize?**  
A: Ensures consistent, professional product naming across ERP system.

**Q: Can users disable auto-capitalization?**  
A: No, admin controls this via store settings. Users can't override.

**Q: What if duplicate is found?**  
A: Clear error message with list of existing products.

**Q: Can I use special characters?**  
A: Yes, but system sanitizes them. Avoid: `@#$%^&*`

**Q: What happens in edit mode?**  
A: Same validation applied. Can't change to existing name.

**Q: Why check duplicates?**  
A: Prevents inventory confusion from duplicate product names.

---

## 🔗 Related Documentation
- [Global Keyboard Control](./GLOBAL_KEYBOARD_CONTROL_SUMMARY.md)
- [Keyboard Navigation](./keyboard-navigation-dropdowns.md)
- [Product Form Guide](./GLOBAL_PRODUCT_FORM_GUIDE.md)
