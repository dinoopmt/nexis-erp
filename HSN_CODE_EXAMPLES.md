# HSN Frontend - Code Examples & Implementation Reference

## 🎯 Quick Reference for Developers

### Using the HSN Component

#### Option 1: In Settings (Already Integrated)
The component is already integrated in the Settings page. No action needed.

```jsx
// Already done in CompanySettings.jsx
<HSNManagement />  // Renders in HSN tab
```

#### Option 2: Import Standalone
```jsx
import HSNManagement from '@/components/settings/company/HSNManagement'

function MyPage() {
  return (
    <div>
      <h1>HSN Management</h1>
      <HSNManagement />
    </div>
  )
}
```

#### Option 3: Programmatically Create HSN
```jsx
const createHSNCode = async (hsn) => {
  const response = await fetch('/api/hsn/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hsn)
  })
  return response.json()
}

// Usage
const result = await createHSNCode({
  code: '090111',
  description: 'Coffee, not roasted, not decaffeinated',
  category: 'Foodstuffs',
  gstRate: 5
})

if (result.success) {
  console.log('HSN created:', result.data)
} else {
  console.error('Error:', result.error)
}
```

---

## 🔧 Implementation Patterns

### Pattern 1: Fetch with Filters
```javascript
const fetchHSN = async (filters) => {
  const params = new URLSearchParams()
  
  if (filters.category) params.append('category', filters.category)
  if (filters.gstRate) params.append('gstRate', filters.gstRate)
  if (filters.search) params.append('search', filters.search)
  
  params.append('limit', filters.limit || 10)
  params.append('page', filters.page || 1)
  
  const response = await fetch(`/api/hsn/list?${params}`)
  return response.json()
}

// Usage
const data = await fetchHSN({
  category: 'Foodstuffs',
  gstRate: 5,
  search: 'coffee',
  limit: 20,
  page: 1
})
```

### Pattern 2: Validate HSN Code
```javascript
const validateHSNCode = (code) => {
  // Format validation
  if (!/^\d{6}$/.test(code.toString())) {
    return {
      valid: false,
      error: 'HSN code must be exactly 6 digits'
    }
  }
  
  // Additional checks
  if (code === '000000') {
    return {
      valid: false,
      error: 'Invalid HSN code'
    }
  }
  
  return { valid: true }
}

// Usage
const validation = validateHSNCode('090111')
if (!validation.valid) {
  console.error(validation.error)
}
```

### Pattern 3: Update with Error Handling
```javascript
const updateHSNWithErrorHandling = async (code, updates) => {
  try {
    const response = await fetch(`/api/hsn/update/${code}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || 'Update failed')
    }
    
    return {
      success: true,
      data: data.data,
      message: 'Updated successfully'
    }
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Usage
const result = await updateHSNWithErrorHandling('090111', {
  description: 'New description',
  gstRate: 12
})

if (result.success) {
  console.log(result.message)
} else {
  console.error(result.error)
}
```

### Pattern 4: Search with Debounce
```javascript
const useHSNSearch = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)

  const search = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `/api/hsn/search?query=${encodeURIComponent(searchQuery)}`
      )
      const data = await response.json()
      setResults(data.success ? data.data : [])
    } catch (error) {
      console.error(error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (value) => {
    setQuery(value)
    
    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    // Set new timeout
    debounceRef.current = setTimeout(() => {
      search(value)
    }, 300)
  }

  return { query, results, loading, handleChange }
}

// Usage
function SearchComponent() {
  const { query, results, loading, handleChange } = useHSNSearch()

  return (
    <div>
      <input
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search HSN..."
      />
      {loading && <p>Searching...</p>}
      <ul>
        {results.map(hsn => (
          <li key={hsn.code}>{hsn.code} - {hsn.description}</li>
        ))}
      </ul>
    </div>
  )
}
```

### Pattern 5: Use Custom Hook for HSN
```javascript
// hooks/useHSN.js
import { useState, useCallback } from 'react'

export const useHSN = () => {
  const [hsnList, setHsnList] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchHSNList = useCallback(async (filters = {}) => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams(filters)
      const response = await fetch(`/api/hsn/list?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setHsnList(data.data)
        return data
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      setError(err.message)
      setHsnList([])
    } finally {
      setLoading(false)
    }
  }, [])

  const createHSN = useCallback(async (hsn) => {
    setLoading(true)
    try {
      const response = await fetch('/api/hsn/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hsn)
      })
      const data = await response.json()
      
      if (data.success) {
        await fetchHSNList()
        return data
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [fetchHSNList])

  const updateHSN = useCallback(async (code, updates) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/hsn/update/${code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      const data = await response.json()
      
      if (data.success) {
        await fetchHSNList()
        return data
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [fetchHSNList])

  const deleteHSN = useCallback(async (code) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/hsn/repeal/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Deleted' })
      })
      const data = await response.json()
      
      if (data.success) {
        await fetchHSNList()
        return data
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [fetchHSNList])

  return {
    hsnList,
    loading,
    error,
    fetchHSNList,
    createHSN,
    updateHSN,
    deleteHSN
  }
}

// Usage
function ProductForm() {
  const { hsnList, loading, fetchHSNList } = useHSN()

  useEffect(() => {
    fetchHSNList({ category: 'Foodstuffs' })
  }, [])

  return (
    <select disabled={loading}>
      <option>Select HSN</option>
      {hsnList.map(hsn => (
        <option key={hsn.code} value={hsn.code}>
          {hsn.code} - {hsn.description}
        </option>
      ))}
    </select>
  )
}
```

---

## 📋 Component Props & Configuration

The HSNManagement component is **self-contained** and accepts no props:

```jsx
<HSNManagement />  // No props needed
```

### Internal Configuration
```javascript
// Change these inside HSNManagement.jsx to customize:

// Pagination size
const [pageSize, setPageSize] = useState(10)  // Change to 25, 50, etc.

// Default GST rate
gstRate: 5  // Change default in formData

// Message duration
setTimeout(() => setMessage(''), 5000)  // Change duration (ms)

// Modal size
max-w-md  // Change to max-w-lg, max-w-sm, etc.
```

---

## 🎨 Styling Customization

### Change Theme Colors
```jsx
// In HSNManagement.jsx, replace color classes:

// Primary color (currently blue)
bg-blue-600 → bg-indigo-600 (indigo)
bg-blue-600 → bg-green-600 (green)
text-blue-600 → text-purple-600 (purple)
focus:ring-blue-500 → focus:ring-green-500 (green)

// Success color (currently green)
bg-green-50 → bg-emerald-50
text-green-700 → text-emerald-700
bg-green-100 → bg-emerald-100

// Error color (currently red)
bg-red-50 → bg-rose-50
text-red-700 → text-rose-700
```

### Example: Dark Mode Theme
```jsx
// Replace light backgrounds with dark
bg-white → bg-gray-900
text-gray-700 → text-gray-100
border-gray-300 → border-gray-600
bg-white rounded-lg → bg-gray-800 rounded-lg dark:bg-gray-900
```

---

## 🔗 Integration with Other Components

### Example 1: Use HSN in Product Form
```jsx
import HSNManagement from '@/components/settings/company/HSNManagement'

function ProductForm() {
  const [product, setProduct] = useState({ hsn: '' })

  return (
    <form>
      <input name="productName" placeholder="Product name" />
      
      <HSNField 
        value={product.hsn}
        onChange={(hsn) => setProduct({ ...product, hsn })}
      />
      
      <button type="submit">Save Product</button>
    </form>
  )
}

// Custom HSN field component
function HSNField({ value, onChange }) {
  const [suggestions, setSuggestions] = useState([])

  const handleSearch = async (query) => {
    const response = await fetch(`/api/hsn/search?query=${query}`)
    const data = await response.json()
    setSuggestions(data.data || [])
  }

  return (
    <div>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          handleSearch(e.target.value)
        }}
        placeholder="Search HSN..."
      />
      <ul>
        {suggestions.map(hsn => (
          <li key={hsn.code} onClick={() => onChange(hsn.code)}>
            {hsn.code} - {hsn.description} ({hsn.gstRate}%)
          </li>
        ))}
      </ul>
    </div>
  )
}
```

### Example 2: Use HSN in Invoice
```jsx
function InvoiceItem({ productId }) {
  const [product, setProduct] = useState(null)
  const [hsn, setHsn] = useState(null)

  useEffect(() => {
    // Fetch product
    fetch(`/api/products/${productId}`)
      .then(r => r.json())
      .then(data => {
        setProduct(data.data)
        
        // Fetch HSN details
        if (data.data.hsn) {
          return fetch(`/api/hsn/code/${data.data.hsn}`)
        }
      })
      .then(r => r?.json())
      .then(data => setHsn(data?.data))
  }, [productId])

  return (
    <div>
      <div>Product: {product?.name}</div>
      <div>HSN: {hsn?.code}</div>
      <div>Description: {hsn?.description}</div>
      <div>GST Rate: {hsn?.gstRate}%</div>
    </div>
  )
}
```

### Example 3: HSN in Reports
```jsx
function HSNReport() {
  const [hsnStats, setHsnStats] = useState(null)

  useEffect(() => {
    fetch('/api/hsn/stats')
      .then(r => r.json())
      .then(data => setHsnStats(data.statistics))
  }, [])

  return (
    <div>
      <h2>HSN Statistics</h2>
      <p>Total: {hsnStats?.total}</p>
      <p>Active: {hsnStats?.active}</p>
      <p>Repealed: {hsnStats?.repealed}</p>
      
      <h3>By GST Rate</h3>
      <ul>
        {hsnStats?.byGSTRate.map(rate => (
          <li key={rate._id}>
            {rate._id}%: {rate.count} codes
          </li>
        ))}
      </ul>
    </div>
  )
}
```

---

## 🧪 Test Examples

### Test: Create HSN
```javascript
async function testCreateHSN() {
  const result = await fetch('/api/hsn/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: '099999',
      description: 'Test HSN Code',
      category: 'Foodstuffs',
      gstRate: 5
    })
  }).then(r => r.json())

  console.log('Create Result:', result)
  // Expected: { success: true, data: {...} }
}

testCreateHSN()
```

### Test: Search HSN
```javascript
async function testSearchHSN() {
  const result = await fetch('/api/hsn/search?query=coffee')
    .then(r => r.json())

  console.log('Search Results:', result)
  // Expected: { success: true, data: [...] }
}

testSearchHSN()
```

### Test: Validate HSN
```javascript
async function testValidateHSN() {
  const result = await fetch('/api/hsn/validate/090111')
    .then(r => r.json())

  console.log('Validation Result:', result)
  // Expected: { success: true, valid: true, hsn: {...} }
}

testValidateHSN()
```

---

## 📱 Responsive Design

The component is fully responsive:

```jsx
// Small screens (mobile): Stack vertically
<div className="flex-col">
  <input className="w-full" />
  <select className="w-full" />
</div>

// Large screens: Side by side
<div className="flex gap-2">
  <input className="flex-1" />
  <select className="w-48" />
</div>

// Table scrolls horizontally on small screens
<div className="overflow-x-auto">
  <table>...</table>
</div>
```

---

## 🔐 Security Considerations

### Input Validation
```javascript
// Validates on frontend:
- HSN Code: 6 digits only
- Description: Not empty, max length check
- Category: From allowed list only
- GST Rate: From allowed rates only

// Backend also validates (defense in depth)
```

### XSS Prevention
```javascript
// Using React (auto-escapes):
<div>{hsn.description}</div>  // Safe

// If using innerHTML (avoid):
<div dangerouslySetInnerHTML={{__html: hsn.description}} />  // Unsafe
```

### CSRF Protection
```javascript
// Ensure backend includes CSRF validation
// Headers should be: 'Content-Type': 'application/json'
// Session/token validation on backend
```

---

## 📊 Performance Tips

### Tip 1: Pagination
Use pagination for large datasets:
```javascript
// Good: Fetch 10 items at a time
const [pageSize] = useState(10)

// Bad: Fetch all items
const [pageSize] = useState(1000)
```

### Tip 2: Search Debouncing
```javascript
// With debounce (good)
useEffect(() => {
  const timer = setTimeout(() => search(), 300)
  return () => clearTimeout(timer)
}, [searchQuery])

// Without debounce (bad - fires on every keystroke)
useEffect(() => {
  search()
}, [searchQuery])
```

### Tip 3: Caching
```javascript
// Cache categories to reduce API calls
const [categories, setCategories] = useState(() => {
  const cached = localStorage.getItem('hsnCategories')
  return cached ? JSON.parse(cached) : []
})
```

---

## 🎓 Learning Resources

### For Frontend
- React Documentation: https://react.dev
- Lucide Icons: https://lucide.dev
- Tailwind CSS: https://tailwindcss.com

### For Backend
- Express.js: https://expressjs.com
- MongoDB: https://docs.mongodb.com
- Mongoose: https://mongoosejs.com

### For This Project
- See HSN_API_DOCUMENTATION.md
- See HSN_IMPLEMENTATION_QUICK_REFERENCE.md
- See HSN_VALIDATION_DEVELOPER_GUIDE.md

---

**Last Updated:** March 2026  
**Version:** 1.0  
**Language:** JavaScript (React)
