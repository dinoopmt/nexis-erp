# HSN Frontend Developer Integration Guide

## Component Overview

The HSN Management component is a React-based CRUD interface for managing HSN codes in the frontend.

**Location:** `client/src/components/settings/company/HSNManagement.jsx`  
**Integrated:** `client/src/components/settings/CompanySettings.jsx`

---

## Architecture

```
CompanySettings.jsx
├── Imports HSNManagement.jsx
├── Adds "HSN Management" tab
├── Renders on tab selection
└── Passes no props (self-contained)

HSNManagement.jsx
├── State Management (React hooks)
├── API Communication (fetch)
├── Form Validation
├── Modal handling
└── Table rendering
```

---

## Component Features

### State Management
```javascript
// Data States
const [hsnList, setHsnList] = useState([])           // All HSN codes
const [filteredHSN, setFilteredHSN] = useState([])   // Filtered results
const [categories, setCategories] = useState([])     // Category options

// Filter States
const [searchQuery, setSearchQuery] = useState('')
const [selectedCategory, setSelectedCategory] = useState('')
const [selectedGSTRate, setSelectedGSTRate] = useState('')

// Pagination States
const [page, setPage] = useState(1)
const [pageSize, setPageSize] = useState(10)
const [totalItems, setTotalItems] = useState(0)

// UI States
const [loading, setLoading] = useState(false)
const [message, setMessage] = useState('')
const [messageType, setMessageType] = useState('') // 'success' or 'error'
const [showModal, setShowModal] = useState(false)
const [editingHSN, setEditingHSN] = useState(null)

// Form States
const [formData, setFormData] = useState({
  code: '',
  description: '',
  category: '',
  gstRate: 5,
})
```

### API Calls

#### Fetch HSN List
```javascript
GET /api/hsn/list?limit=10&page=1&search=&category=&gstRate=

Response:
{
  success: true,
  data: [
    {
      _id: "...",
      code: "090111",
      description: "Coffee, not roasted",
      category: "Foodstuffs",
      gstRate: 5,
      isActive: true,
      repealed: false
    },
    ...
  ],
  pagination: {
    total: 40,
    page: 1,
    pages: 4,
    limit: 10
  }
}
```

#### Create HSN
```javascript
POST /api/hsn/create
Body: {
  code: "090111",
  description: "Coffee, not roasted",
  category: "Foodstuffs",
  gstRate: 5
}

Response:
{
  success: true,
  message: "HSN code created successfully",
  data: { ... }
}
```

#### Update HSN
```javascript
PUT /api/hsn/update/090111
Body: {
  description: "Updated description",
  category: "Foodstuffs",
  gstRate: 5
}

Response:
{
  success: true,
  message: "HSN code updated successfully",
  data: { ... }
}
```

#### Delete HSN
```javascript
POST /api/hsn/repeal/090111
Body: {
  reason: "Repealed through frontend interface"
}

Response:
{
  success: true,
  message: "HSN code repealed successfully",
  data: { repealed: true, repealedDate: "..." }
}
```

---

## Component Methods

### Fetch Operations

#### fetchHSNList()
Fetches paginated HSN list with filters.

```javascript
const fetchHSNList = async () => {
  // Builds query params from state
  // Calls GET /api/hsn/list
  // Updates hsnList and pagination state
}
```

**Triggers:**
- On component mount
- When filter changes (search, category, gstRate)
- When page changes
- After CRUD operations

#### fetchCategories()
Fetches available HSN categories.

```javascript
const fetchCategories = async () => {
  // Calls GET /api/hsn/categories
  // Updates categories state
}
```

**Triggers:**
- On component mount

### CRUD Operations

#### handleCreateHSN()
Creates new HSN code.

```javascript
const handleCreateHSN = async () => {
  // Validates form data
  // Calls POST /api/hsn/create
  // Refreshes list on success
  // Closes modal
}
```

**Validations:**
- Code: 6 digits only
- Description: Not empty
- Category: Selected
- GST Rate: Selected

#### handleEditClick(hsn)
Opens edit modal with HSN data.

```javascript
const handleEditClick = async (hsn) => {
  // Loads HSN data into form
  // Sets editingHSN state
  // Opens modal
}
```

#### handleUpdateHSN()
Updates existing HSN code.

```javascript
const handleUpdateHSN = async () => {
  // Validates form data
  // Calls PUT /api/hsn/update/:code
  // Refreshes list on success
  // Closes modal
}
```

**Note:** Code cannot be changed (disabled in form)

#### handleDeleteHSN(code)
Marks HSN as repealed (soft delete).

```javascript
const handleDeleteHSN = async (code) => {
  // Confirms with user
  // Calls POST /api/hsn/repeal/:code
  // Refreshes list on success
}
```

### UI Operations

#### handleFormChange(e)
Updates form field values.

```javascript
const handleFormChange = (e) => {
  const { name, value } = e.target
  setFormData((prev) => ({
    ...prev,
    [name]: name === 'gstRate' ? parseInt(value) : value,
  }))
}
```

#### closeModal()
Closes modal and resets form.

```javascript
const closeModal = () => {
  setShowModal(false)
  setEditingHSN(null)
  setFormData({ code: '', description: '', category: '', gstRate: 5 })
}
```

---

## UI Layout

### Main Layout
```
┌─ Header Section ─────────────────────────────────┐
│  Message Alert (if any)                          │
├──────────────────────────────────────────────────┤
│ ┌─ Filter Section ──────────────────────────────┐│
│ │ [Search] [Category▼] [GST Rate▼] [Add HSN]   ││
│ └──────────────────────────────────────────────┘│
├──────────────────────────────────────────────────┤
│ ┌─ Table Section ───────────────────────────────┐│
│ │ Code │ Desc │ Category │ GST │ Status │ Act  ││
│ │──────┼──────┼──────────┼─────┼────────┼──────│
│ │ ... │   ...  │   ...     │ ... │  ...   │ ... ││
│ │──────┼──────┼──────────┼─────┼────────┼──────│
│ │ Page 1 of 4 │ Prev | Next                     ││
│ └──────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘

Modal Overlay (when Create/Edit):
┌─────────────────────────────────────────┐
│ Create/Edit HSN Code            [Close] │
├─────────────────────────────────────────┤
│ Code:       [090111 ........]            │
│ Description [.....................]      │
│ Category:   [Foodstuffs.......▼]        │
│ GST Rate:   [5%..................▼]     │
├─────────────────────────────────────────┤
│ [Cancel]                     [Create]    │
└─────────────────────────────────────────┘
```

---

## Styling Classes

### Tailwind Classes Used
```css
/* Grid & Layout */
space-y-3, gap-2, flex, items-center, justify-between

/* Colors */
bg-white, bg-gray-50, bg-gray-100, bg-blue-600, bg-green-50
text-gray-700, text-gray-600, text-blue-600, text-green-700

/* Sizing */
px-3, py-2, w-full, min-w-[200px], max-w-md

/* States */
hover:bg-blue-700, disabled:opacity-50, disabled:bg-gray-400
hover:text-gray-800, focus:ring-2, focus:ring-blue-500

/* Borders & Shadows */
border, border-gray-300, rounded-lg, shadow-md, shadow-lg
```

---

## Error Handling

### Validation Errors
```javascript
if (!formData.code || !formData.description) {
  setMessage('Please fill all required fields')
  setMessageType('error')
  return
}

if (!/^\d{6}$/.test(formData.code.toString())) {
  setMessage('HSN code must be exactly 6 digits')
  setMessageType('error')
  return
}
```

### Network Errors
```javascript
try {
  // fetch call
} catch (error) {
  setMessage(`Error: ${error.message}`)
  setMessageType('error')
}
```

### API Response Errors
```javascript
if (!data.success) {
  setMessage(data.error || 'Operation failed')
  setMessageType('error')
}
```

### Auto-dismiss
```javascript
useEffect(() => {
  if (message) {
    const timer = setTimeout(() => setMessage(''), 5000)
    return () => clearTimeout(timer)
  }
}, [message])
```

Messages auto-dismiss after 5 seconds.

---

## Customization Guide

### Change Page Size
```javascript
// Line: const [pageSize, setPageSize] = useState(10)
const [pageSize, setPageSize] = useState(25)  // Show 25 items per page
```

### Add More Filters
```javascript
// Add new state
const [filterByStatus, setFilterByStatus] = useState('active')

// Add to query params
if (filterByStatus) {
  params.append('isActive', filterByStatus === 'active')
}

// Add UI element
<select value={filterByStatus} onChange={(e) => setFilterByStatus(e.target.value)}>
  <option value="">All Status</option>
  <option value="active">Active Only</option>
  <option value="repealed">Repealed Only</option>
</select>
```

### Change Modal Size
```javascript
// Line: className="bg-white rounded-lg shadow-lg max-w-md w-full p-4"
// Change max-w-md to:
max-w-lg   // Larger
max-w-sm   // Smaller
max-w-2xl  // Much larger
```

### Add Export Function
```javascript
const handleExportHSN = () => {
  const csv = hsnList.map(h => 
    `${h.code},${h.description},${h.category},${h.gstRate}`
  ).join('\n')
  
  const link = document.createElement('a')
  link.href = `data:text/csv,${encodeURIComponent(csv)}`
  link.download = 'hsn_codes.csv'
  link.click()
}
```

### Add Bulk Delete
```javascript
const [selectedCodes, setSelectedCodes] = useState([])

const handleBulkDelete = async () => {
  for (const code of selectedCodes) {
    await handleDeleteHSN(code)
  }
  setSelectedCodes([])
}
```

### Change Loading Icon
```javascript
// Current: <Loader size={24} className="animate-spin text-blue-600" />

// Alternative spinners available from lucide-react:
// - Settings (cog spinning)
// - RotateCcw (circular arrow)
// - RefreshCw (refresh icon)
// - Clock (hourglass)
```

---

## Integration Example

### Using in Custom Page
```javascript
import HSNManagement from '@/components/settings/company/HSNManagement'

function MyCustomPage() {
  return (
    <div className="container">
      <h1>Manage HSN Codes</h1>
      <HSNManagement />  {/* Drop-in ready */}
    </div>
  )
}
```

### Programmatic Access
```javascript
// To create HSN programmatically (outside component):
const createHSN = async (code, description, category, gstRate) => {
  const response = await fetch('/api/hsn/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, description, category, gstRate })
  })
  return response.json()
}

// Usage
await createHSN('095555', 'Test product', 'Foodstuffs', 5)
```

---

## Dependencies

### React Imports
```javascript
import React, { useState, useEffect }
```

### lucide-react Icons
```javascript
import { 
  Search,      // Search icon
  Plus,        // Create button
  Edit2,       // Edit button
  Trash2,      // Delete button
  AlertCircle, // Error icon
  CheckCircle, // Success icon
  X,           // Close button
  Loader       // Loading spinner
}
```

---

## Testing

### Manual Testing Checklist
- [ ] Component renders on Settings page
- [ ] Search filter works
- [ ] Category filter works
- [ ] GST Rate filter works
- [ ] Pagination works
- [ ] Create modal opens
- [ ] Create form validates
- [ ] Create submits successfully
- [ ] Update modal opens
- [ ] Update submits successfully
- [ ] Delete confirmation appears
- [ ] Delete removes item
- [ ] Error messages appear
- [ ] Success messages appear
- [ ] Messages auto-dismiss

### Unit Testing Example
```javascript
import { render, screen, fireEvent } from '@testing-library/react'
import HSNManagement from './HSNManagement'

test('renders HSN Management component', () => {
  render(<HSNManagement />)
  expect(screen.getByText('Search HSN code')).toBeInTheDocument()
})

test('creates new HSN code', async () => {
  render(<HSNManagement />)
  fireEvent.click(screen.getByText('Add HSN'))
  // ... fill form and submit
  expect(screen.getByText('HSN code created successfully')).toBeInTheDocument()
})
```

---

## Performance Optimization

### Current Optimizations
- ✅ Pagination (loads 10 items at a time)
- ✅ Debounced search (useEffect dependency)
- ✅ Message auto-dismiss (cleanup listeners)
- ✅ Lazy fetch (only on demand)

### Potential Optimizations
1. **Search Debounce:** Add delay before fetching
   ```javascript
   useEffect(() => {
     const timer = setTimeout(() => fetchHSNList(), 300)
     return () => clearTimeout(timer)
   }, [searchQuery])
   ```

2. **Memoization:** Prevent unnecessary re-renders
   ```javascript
   const HSNRow = React.memo(({ hsn, onEdit, onDelete }) => ...)
   ```

3. **Caching:** Cache categories in localStorage
   ```javascript
   const [categories] = useState(() => {
     return JSON.parse(localStorage.getItem('hsnCategories')) || []
   })
   ```

---

## Browser Compatibility

| Browser | Status |
|---------|--------|
| Chrome | ✅ Fully supported |
| Firefox | ✅ Fully supported |
| Safari | ✅ Fully supported |
| Edge | ✅ Fully supported |
| IE 11 | ❌ Not supported |

---

## File Reference

| File | Purpose |
|------|---------|
| `HSNManagement.jsx` | Main component (550+ lines) |
| `CompanySettings.jsx` | Integration point |
| `hsnController.js` | Backend API |
| `hsnRoutes.js` | API routes |
| `HSNMaster.js` | Database model |

---

## Troubleshooting

### Component not appearing?
1. Check import: `import HSNManagement from './company/HSNManagement'`
2. Verify tab definition includes: `{ id: 'hsn', label: 'HSN Management', icon: Barcode }`
3. Check renderContent switch includes: `case 'hsn': return <HSNManagement />`

### API calls failing?
1. Verify backend is running: http://localhost:5000
2. Check browser console for errors
3. Verify API endpoints: GET /api/hsn/list, POST /api/hsn/create, etc.

### Styling issues?
1. Ensure Tailwind CSS is available
2. Check for CSS conflicts
3. Verify lucide-react icons load correctly

### State not updating?
1. Check for async/await issues
2. Verify setState calls
3. Check useEffect dependencies

---

## Support

- **Component Questions:** Check this guide
- **API Issues:** See HSN_API_DOCUMENTATION.md
- **Styling Issues:** Check Tailwind documentation
- **React Questions:** Check React documentation

---

**Last Updated:** March 2026  
**Version:** 1.0  
**Author:** Development Team
