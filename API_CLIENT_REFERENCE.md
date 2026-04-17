# API Client Quick Reference

## Installation & Setup

Already integrated! Just import and use:

```javascript
import apiClient from '@/services/apiClient';
```

---

## Basic Usage Patterns

### GET Request

```javascript
// Simple GET
const response = await apiClient.get('/products');

if (response.ok) {
  console.log('Products:', response.data);
} else {
  console.error('Error:', response.error);
  toast.error(response.error);
}
```

### GET with Query Parameters

```javascript
// Option 1: Append to URL
const response = await apiClient.get(
  '/products?storeId=STORE-01&category=electronics'
);

// Option 2: Using URLSearchParams
const params = new URLSearchParams({
  storeId: 'STORE-01',
  category: 'electronics',
  page: 1,
  limit: 20
});
const response = await apiClient.get(`/products?${params}`);
```

### POST Request (Create)

```javascript
// Create a new product
const response = await apiClient.post('/products', {
  name: 'iPhone 15',
  sku: 'APPLE-IP15',
  price: 999.99,
  category: 'Electronics',
  stock: 100
});

if (response.ok) {
  const newProduct = response.data;
  console.log('Created:', newProduct._id);
} else {
  console.error('Create failed:', response.error);
}
```

### PUT Request (Full Update)

```javascript
// Update entire product
const response = await apiClient.put('/products/123', {
  name: 'iPhone 15 Pro',
  price: 1099.99,
  stock: 50
});
```

### PATCH Request (Partial Update)

```javascript
// Update only specific fields
const response = await apiClient.patch('/products/123', {
  price: 1099.99  // Only update price
});
```

### DELETE Request

```javascript
const response = await apiClient.delete('/products/123');

if (response.ok) {
  toast.success('Product deleted');
} else {
  toast.error(response.error);
}
```

---

## File Operations

### Upload Single File

```javascript
// File upload (e.g., product image)
const file = event.target.files[0];
const response = await apiClient.uploadFile(
  '/products/upload-image',
  file,
  { productId: '123' }
);

if (response.ok) {
  console.log('Uploaded:', response.data.imageUrl);
}
```

### Upload with Progress

```javascript
// For showing upload progress, wrap with manual fetch
const handleUpload = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('terminal-id', terminalId);

  const xhr = new XMLHttpRequest();
  
  xhr.upload.addEventListener('progress', (e) => {
    const percent = (e.loaded / e.total) * 100;
    setUploadProgress(percent);
  });

  xhr.onload = () => {
    if (xhr.status === 200) {
      console.log('Upload complete');
    }
  };

  xhr.open('POST', `${apiClient.getBaseURL()}/products/upload`);
  xhr.setRequestHeader('Authorization', 
    `Bearer ${localStorage.getItem('authToken')}`
  );
  xhr.send(formData);
};
```

---

## Batch Requests

### Multiple Requests at Once

```javascript
// Load dashboard data in parallel
const [products, vendors, grns] = await apiClient.batch([
  { method: 'GET', endpoint: '/products?limit=10' },
  { method: 'GET', endpoint: '/vendors' },
  { method: 'GET', endpoint: '/grn' }
]);

if (products.ok && vendors.ok && grns.ok) {
  setDashboard({
    products: products.data,
    vendors: vendors.data,
    grns: grns.data
  });
}
```

---

## Authentication

### Login & Token Management

```javascript
// Login
const response = await apiClient.post('/auth/login', {
  email: 'user@example.com',
  password: 'password123'
});

if (response.ok) {
  const { token } = response.data;
  apiClient.setAuthToken(token);
  localStorage.setItem('user', JSON.stringify(response.data.user));
}

// Logout
apiClient.clearAuthToken();
localStorage.removeItem('user');
```

### Auto Token Refresh

```javascript
// Implement token refresh interceptor
const originalPost = apiClient.post;
apiClient.post = async function(...args) {
  let response = await originalPost.apply(this, args);
  
  if (response.status === 401) {
    // Token expired, refresh it
    const refreshResponse = await fetch(
      `${apiClient.getBaseURL()}/auth/refresh`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: apiClient.authToken
        })
      }
    );
    
    if (refreshResponse.ok) {
      const { token } = await refreshResponse.json();
      apiClient.setAuthToken(token);
      // Retry original request
      response = await originalPost.apply(this, args);
    }
  }
  
  return response;
};
```

---

## Error Handling

### Basic Error Handling

```javascript
const response = await apiClient.get('/products');

if (!response.ok) {
  switch (response.status) {
    case 401:
      console.error('Unauthorized - redirect to login');
      window.location.href = '/login';
      break;
    case 403:
      toast.error('You do not have permission');
      break;
    case 404:
      toast.error('Resource not found');
      break;
    case 500:
      toast.error('Server error - please try again');
      break;
    default:
      toast.error(response.error || 'Request failed');
  }
}
```

### Retry Custom Logic

```javascript
// Retry on specific errors
async function fetchWithRetry(endpoint, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await apiClient.get(endpoint);
      if (response.ok || response.status === 404) {
        return response; // Success or not found
      }
      
      // Retry on server errors
      if (response.status >= 500) {
        lastError = response;
        await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error;
    }
  }
  
  return lastError;
}
```

---

## React Hooks Patterns

### useAsync Hook

```javascript
function useAsync(asyncFunction, immediate = true) {
  const [status, setStatus] = useState('idle');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const execute = useCallback(async () => {
    setStatus('pending');
    setData(null);
    setError(null);
    
    try {
      const response = await asyncFunction();
      if (!response.ok) throw new Error(response.error);
      setData(response.data);
      setStatus('success');
    } catch (error) {
      setError(error);
      setStatus('error');
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) execute();
  }, [execute, immediate]);

  return { status, data, error, execute };
}

// Usage
function ProductList() {
  const { status, data: products, error, execute } = useAsync(
    () => apiClient.get('/products'),
    true  // Load immediately on mount
  );

  if (status === 'pending') return <Loading />;
  if (error) return <Error message={error.message} />;
  
  return <ProductTable products={products} />;
}
```

### useFetch Hook

```javascript
function useFetch(url) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    apiClient.get(url).then(response => {
      if (!isMounted) return;
      
      if (response.ok) {
        setData(response.data);
      } else {
        setError(response.error);
      }
      setLoading(false);
    });

    return () => { isMounted = false; };
  }, [url]);

  return { loading, data, error };
}

// Usage
function Dashboard() {
  const { data: products } = useFetch('/products');
  const { data: vendors } = useFetch('/vendors');
  
  return (
    <div>
      <Products list={products} />
      <Vendors list={vendors} />
    </div>
  );
}
```

### useMutation Hook

```javascript
function useMutation(asyncFunction) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const mutate = async (args) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const response = await asyncFunction(args);
      if (!response.ok) throw new Error(response.error);
      setSuccess(true);
      return response.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error, success };
}

// Usage
function CreateProductForm() {
  const { mutate, loading, error } = useMutation(
    (data) => apiClient.post('/products', data)
  );

  const handleSubmit = async (formData) => {
    try {
      const product = await mutate(formData);
      toast.success('Product created');
      navigate(`/products/${product._id}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit(new FormData(e.target));
    }}>
      {/* form fields */}
      <button disabled={loading}>
        {loading ? 'Creating...' : 'Create'}
      </button>
      {error && <Error>{error.message}</Error>}
    </form>
  );
}
```

---

## Terminal Identity

### Get Terminal Information

```javascript
// In Electron context
const terminalId = await window.electronAPI.terminal.getTerminalId();
const storeId = await window.electronAPI.terminal.getStoreId();
const config = await window.electronAPI.terminal.getConfig();
const headers = await window.electronAPI.terminal.getIdentityHeaders();

console.log(`Running on ${terminalId} in store ${storeId}`);
```

### Send Terminal-Specific Requests

```javascript
// The API client automatically adds terminal headers
// But you can override if needed:

const response = await apiClient.post('/custom-endpoint', data, {
  headers: {
    'x-custom-header': 'value'
  }
});
```

---

## Performance Optimization

### Debounce Search

```javascript
import { useCallback, useState } from 'react';

function ProductSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const debouncedSearch = useCallback(
    debounce(async (searchQuery) => {
      if (!searchQuery) {
        setResults([]);
        return;
      }
      
      const response = await apiClient.get(
        `/products/search?q=${encodeURIComponent(searchQuery)}`
      );
      
      if (response.ok) {
        setResults(response.data);
      }
    }, 300),
    []
  );

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  return (
    <div>
      <input 
        type="text" 
        value={query} 
        onChange={handleChange}
        placeholder="Search products..."
      />
      <ul>
        {results.map(p => <li key={p._id}>{p.name}</li>)}
      </ul>
    </div>
  );
}

function debounce(func, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}
```

### Cache Responses

```javascript
const requestCache = new Map();

async function cachedGet(endpoint, cacheDuration = 5 * 60 * 1000) {
  const cached = requestCache.get(endpoint);
  
  if (cached && Date.now() - cached.timestamp < cacheDuration) {
    return cached.response;
  }

  const response = await apiClient.get(endpoint);
  
  if (response.ok) {
    requestCache.set(endpoint, {
      response,
      timestamp: Date.now()
    });
  }

  return response;
}

// Usage
const response = await cachedGet('/vendors', 10 * 60 * 1000); // 10 min cache
```

---

## Debugging

### Enable Request Logging

```javascript
// Add this to your app initialization
const originalPost = apiClient.post;
apiClient.post = function(...args) {
  console.log(`🚀 POST ${args[0]}`, args[1]);
  return originalPost.apply(this, args).then(res => {
    console.log(`✅ POST ${args[0]} ->`, res);
    return res;
  });
};
```

### Check Terminal Identity

```javascript
// In browser console
await window.electronAPI.terminal.getIdentityHeaders()
  .then(h => console.log(JSON.stringify(h, null, 2)))
```

### View Network Requests

```javascript
// Open DevTools (F12)
// Go to Network tab
// Look for headers like:
// terminal-id: TERM-001
// store-id: STORE-01
// Authorization: Bearer ...
```

---

**Last Updated:** April 17, 2026  
**Version:** 1.0.0
