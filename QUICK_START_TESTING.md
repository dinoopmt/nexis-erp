# 🚀 Quick Start: Run Your First Test

**This guide gets you testing in 15 minutes**

---

## 1. Start the Backend Server (2 min)

```powershell
# Terminal 1: Start Node server
cd d:\NEXIS-ERP\server
npm start
# OR if you have node running
npm run dev

# Expected output:
# 🚀 Server running on port 5000
# 📍 API Base: http://localhost:5000/api/v1
```

---

## 2. Test Security: Rate Limiting (3 min)

**Open Postman or use curl:**

```powershell
# Create 6 login requests rapidly
for ($i = 1; $i -le 6; $i++) {
  $body = @{
    username = "test"
    password = "test123"
  } | ConvertTo-Json
  
  $response = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/auth/login" `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $body `
    -ErrorAction SilentlyContinue
  
  Write-Host "Request $i - Status: $($response.StatusCode)"
}

# Expected:
# Request 1 - Status: 401
# Request 2 - Status: 401
# Request 3 - Status: 401
# Request 4 - Status: 401
# Request 5 - Status: 401
# Request 6 - Status: 429  ← TOO MANY REQUESTS (Rate limited!)
```

---

## 3. Test Validation: Financial Year (3 min)

**Valid Request (Should succeed):**

```powershell
$body = @{
  yearCode = "FY2025-26"
  yearName = "Financial Year 2025-2026"
  startDate = "2025-04-01"
  endDate = "2026-03-31"
  isCurrent = $true
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/financial-years" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body $body

Write-Host "Status: $($response.StatusCode)"
Write-Host "Response: $($response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3)"

# Expected: Status: 201
```

**Invalid Request (Should fail validation):**

```powershell
$body = @{
  yearCode = ""  # Invalid - empty!
  yearName = "Test"
  startDate = "2025-04-01"
  endDate = "2024-01-01"  # Invalid - end date before start date!
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/financial-years" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body $body `
  -ErrorAction SilentlyContinue

Write-Host "Status: $($response.StatusCode)"
$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3

# Expected: Status: 400
# Message: "Validation error"
# Errors showing yearCode and endDate issues
```

---

## 4. Check Logs (3 min)

```powershell
# Terminal 2: Monitor logs in real-time
cd d:\NEXIS-ERP\server

# View last 50 lines
Get-Content logs\combined.log -Tail 50

# Watch for new entries
Get-Content logs\combined.log -Wait

# Search for specific request
Select-String -Path logs\combined.log -Pattern "FY2025-26"

# Check errors
Get-Content logs\error.log
```

**Look for:**
- Request IDs (e.g., `req_1713607200000_abc123`)
- HTTP method and path
- Status codes (201 = created, 400 = validation error, 429 = rate limited)
- Duration in milliseconds
- User ID (if authenticated)

---

## 5. Test Frontend: Create Financial Year (4 min)

**Start Frontend (if not running):**
```powershell
# Terminal 3: Start React dev server
cd d:\NEXIS-ERP\client
npm run dev
# Opens http://localhost:5173
```

**Navigate to:**
1. Dashboard → Company Settings → Financial Year Management
2. Click "New Financial Year" button
3. Fill form:
   - Year Code: `FY2025-26`
   - Year Name: `Financial Year 2025-2026`
   - Start Date: `2025-04-01`
   - End Date: `2026-03-31`
   - ☑ Set as current financial year
4. Click "Create"

**Expected:**
- ✅ Success toast appears
- ✅ FY appears in list with "Current" badge
- ✅ Check browser console for no errors

---

## 6. View Comprehensive Test Suite

**Run all 17 tests:**
See: [TESTING_GUIDE_END_TO_END.md](TESTING_GUIDE_END_TO_END.md)

**Quick checklist:**
- [ ] Security Tests (3)
- [ ] Financial Year Tests (4)
- [ ] Sales Invoice Tests (3)
- [ ] Frontend Tests (2)
- [ ] Logging Tests (2)
- [ ] Performance Tests (2)
- [ ] Validation Format Tests (1)

---

## Troubleshooting

### Server won't start
```powershell
# Check if port 5000 is in use
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
# Kill process
Stop-Process -Id <PID> -Force
# Try again
npm start
```

### Rate limiting not working
```powershell
# Verify middleware loaded
Select-String -Path server/server.js -Pattern "globalLimiter"
# Check rateLimiter file exists
dir server/middleware/rateLimiter.js
```

### Validation not triggering
```powershell
# Verify validators imported
Select-String -Path server/modules/masters/routes/financialYearRoutes.js -Pattern "validate"
# Check schema file exists
dir server/middleware/validators/schemaValidator.js
```

### No logs created
```powershell
# Create logs directory
mkdir server/logs
# Check permissions
ls -la server/logs
```

---

## Success Indicators

✅ **You'll know it's working when:**

1. **Rate Limiting:**
   - 5th login attempt returns 429 error
   - Message: "Too many requests"

2. **Validation:**
   - Empty form returns 400 error
   - Message: "Validation error"
   - Lists specific field errors

3. **Logging:**
   - `logs/combined.log` exists and growing
   - Each request has unique request ID
   - Errors logged with full context

4. **Frontend:**
   - FY creation modal works
   - Success toast appears
   - New FY visible in list immediately

---

## Next Steps

After confirming all tests pass:

1. **Run full test suite:** [TESTING_GUIDE_END_TO_END.md](TESTING_GUIDE_END_TO_END.md)
2. **Review all documentation:**
   - [VALIDATION_AND_LOGGING_GUIDE.md](VALIDATION_AND_LOGGING_GUIDE.md)
   - [SECURITY_HARDENING_COMPLETE.md](SECURITY_HARDENING_COMPLETE.md)
3. **Start applying to other endpoints**
4. **Setup monitoring and alerts**
5. **Deploy to staging**

---

## Support

**Questions about:**
- **Testing?** → [TESTING_GUIDE_END_TO_END.md](TESTING_GUIDE_END_TO_END.md)
- **Implementation?** → [VALIDATION_AND_LOGGING_GUIDE.md](VALIDATION_AND_LOGGING_GUIDE.md)
- **Architecture?** → [INDUSTRIAL_ARCHITECTURE_COMPLIANCE_ANALYSIS.md](INDUSTRIAL_ARCHITECTURE_COMPLIANCE_ANALYSIS.md)

---

**Estimated Time to Pass All Tests: 30 minutes**

**Ready to begin? Start with Section 1 above ⬆️**
