# 🔍 Meilisearch Setup Guide for Windows

## Quick Start (2 minutes)

### 1. **Download Meilisearch Binary**
Visit: https://github.com/meilisearch/meilisearch/releases

Look for the latest **Windows executable** (e.g., `meilisearch-windows-amd64.exe`)
- Download to: `D:\NEXIS-ERP\meilisearch\` (create this folder first)

### 2. **Run Meilisearch**
```powershell
# Open PowerShell and navigate to the folder
cd D:\NEXIS-ERP\meilisearch

# Run the executable
.\meilisearch-windows-amd64.exe
```

**Expected Output:**
```
Meilisearch v1.X.X
Listening on: http://127.0.0.1:7700
```

### 3. **Verify Connection**
In a new PowerShell window:
```powershell
$response = Invoke-WebRequest -Uri "http://localhost:7700/version"
$response | ConvertFrom-Json
```

You should see version information.

---

## Configuration

### Environment Variables
Edit `.env` in `D:\NEXIS-ERP\server\`:
```env
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=    # Leave empty for development
```

### For Production (Optional)
Set an API key when starting Meilisearch:
```powershell
.\meilisearch-windows-amd64.exe --env=production --master-key="your-super-secret-key"
```

Then in `.env`:
```env
MEILISEARCH_API_KEY=your-super-secret-key
```

---

## Testing Search

### 1. **Start Server**
```powershell
cd D:\NEXIS-ERP\server
npm start
```

### 2. **Test Search Endpoint**
```powershell
# Search for products
$response = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/products/search?q=ladies&page=1&limit=10"
$response.Content | ConvertFrom-Json | Format-Table
```

### 3. **Expected Response**
```json
{
  "products": [
    {
      "_id": "...",
      "name": "Ladies T-Shirt",
      "itemcode": "ITEM001",
      "barcode": "123456789",
      "price": 299,
      "cost": 100,
      "stock": 50,
      "vendor": "Vendor Name",
      "categoryId": "Category Name"
    }
  ],
  "totalCount": 45,
  "page": 1,
  "pageSize": 10,
  "totalPages": 5,
  "resultCount": 10,
  "hasNextPage": true,
  "hasPrevPage": false,
  "message": "Found 45 matching products"
}
```

---

## Troubleshooting

### Issue: "Connection refused"
- ✅ Make sure Meilisearch is running
- ✅ Check if port 7700 is available
- ✅ Verify URL in `.env` is correct

### Issue: "Empty search results"
- Products need to be indexed first
- Run bulk indexing when products are created/updated
- Check Meilisearch dashboard: http://localhost:7700/

### Issue: "Meilisearch not found"
- Download the correct Windows binary
- Ensure file is in an accessible location
- Try full path: `C:\Path\meilisearch-windows-amd64.exe`

---

## Next Steps

1. ✅ Download and run Meilisearch
2. ✅ Verify connection works
3. ✅ Start Node.js server (it will auto-sync existing products)
4. ✅ Test search endpoint

---

## Dashboard

Access Meilisearch web dashboard:
```
http://localhost:7700/
```

View:
- Indexes and documents
- Search statistics
- Configuration settings

---

## Performance Tips

- **Meilisearch uses ~256MB RAM** by default
- **Typo tolerance enabled** by default (e.g., "ladis" finds "ladies")
- **Instant search results** even for 100k+ products
- **Automatic indexing** on product CRUD operations

---

## Stopping Meilisearch

Press `Ctrl+C` in the PowerShell window where Meilisearch is running.

For graceful shutdown:
```
POST http://localhost:7700/health
```

---

**You're all set! Meilisearch is now powering your product search.** 🚀
