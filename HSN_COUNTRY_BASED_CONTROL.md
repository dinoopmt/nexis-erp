# HSN Country-Based Control Configuration

## Overview

The HSN Management feature is now intelligently controlled based on the company's country setting. HSN (Harmonized System of Nomenclature) is only applicable to **India-based companies** that use the GST (Goods and Services Tax) system.

---

## How It Works

### ✅ For India Companies
- ✅ HSN Management tab is **enabled**
- ✅ Users can access all HSN features
- ✅ Full CRUD operations available
- ✅ No restrictions

### ❌ For Non-India Companies
- ❌ HSN Management tab is **disabled** (grayed out)
- ❌ Cannot be clicked
- ❌ Shows tooltip: "HSN Management is only available for India companies (GST based)"
- ❌ Warning message displayed if somehow accessed
- ❌ All HSN functionality is disabled

---

## Configuration

### How to Enable HSN

The HSN tab automatically enables when:

1. **Company Country** is set to **"India"**
   - Go to Settings → Company Master
   - Set Country field to "India"
   - Save changes
   - HSN Management tab automatically becomes enabled

### How to Disable HSN

The HSN tab automatically disables when:

1. **Company Country** is set to anything **other than "India"**
   - Go to Settings → Company Master
   - Change Country to (e.g., "UAE", "US", "UK", etc.)
   - Save changes
   - HSN Management tab automatically becomes disabled
   - User is redirected to Company Master tab if HSN was active

---

## Visual Indicators

### Enabled State (India)
```
🏢 Company Master  🔒 License  ⚙️ Settings  📦 HSN Management (blue)
                                           ^--- Active and clickable
```

### Disabled State (Non-India)
```
🏢 Company Master  🔒 License  ⚙️ Settings  📦 HSN Management (grayed out)
                                           ^--- Disabled
                                           Shows "India only" badge
```

---

## User Experience

### When HSN is Disabled

#### 1. Tab Appearance
- Tab text is grayed out (50% opacity)
- Cursor shows "not-allowed" icon on hover
- Small badge shows "India only"
- Hover tooltip: "HSN Management is only available for India companies (GST based)"

#### 2. Warning Banner
If somehow accessed (shouldn't be possible):
```
⚠️  HSN Management Not Available
    HSN (Harmonized System of Nomenclature) is only applicable 
    for India-based companies using GST. Your company is currently 
    configured for [Country]. Please update your company settings 
    to India if you want to use HSN management.
```

#### 3. Cannot Click
- Clicking disabled tab does nothing
- Button is disabled with `disabled` attribute
- JavaScript prevents navigation

### When HSN is Enabled (India)

#### 1. Tab Appearance
- Tab is fully visible and blue (when active)
- Normal cursor on hover
- No "India only" badge
- Tooltip: "Manage HSN codes"

#### 2. Full Functionality
- All HSN features available
- Create, read, update, delete
- Search, filter, pagination
- Form validation and error handling

---

## Implementation Details

### Frontend Files Modified

#### 1. CompanySettings.jsx
```javascript
// Import hook
const { company } = useTaxMaster()

// Check country
const isIndiaCompany = company?.country === 'India'

// Render conditional
<button
  disabled={isDisabled}
  className={isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
>
  {tab.label}
  {isDisabled && <span className="text-xs">India only</span>}
</button>
```

#### 2. HSNManagement.jsx
```javascript
// Import hook
const { company } = useTaxMaster()

// Check country
const isIndiaCompany = company?.country === 'India'

// Show warning if not India
{!isIndiaCompany && (
  <div className="bg-red-50 border border-red-200">
    HSN Management Not Available
  </div>
)}

// Wrap content in conditional
{isIndiaCompany && (
  <div>
    {/* All HSN content here */}
  </div>
)}
```

---

## Testing

### Test Case 1: India Company
1. Go to Settings → Company Master
2. Set Country to "India"
3. Save
4. Check HSN Management tab is **enabled** (blue, clickable)
5. Click tab → Should load HSN interface
6. ✅ PASS

### Test Case 2: Non-India Company
1. Go to Settings → Company Master
2. Set Country to "UAE" (or any non-India country)
3. Save
4. Check HSN Management tab is **disabled** (grayed out, not clickable)
5. Try to click tab → Nothing happens
6. ✅ PASS

### Test Case 3: Switch from India to Non-India
1. Start with India company (HSN enabled)
2. Go to Company Master
3. Change country to "UK"
4. Save
5. Automatically redirected to Company Master tab
6. HSN tab is now disabled
7. ✅ PASS

### Test Case 4: Switch from Non-India to India
1. Start with non-India company (HSN disabled)
2. Go to Company Master
3. Change country to "India"
4. Save
5. HSN tab is now enabled
6. Can click on it
7. ✅ PASS

---

## Configuration Options

### Supported Countries (Sample List)

| Country | HSN Support |
|---------|-------------|
| India | ✅ YES |
| UAE | ❌ NO |
| Saudi Arabia | ❌ NO |
| United States | ❌ NO |
| United Kingdom | ❌ NO |
| Canada | ❌ NO |
| Australia | ❌ NO |
| Singapore | ❌ NO |
| Malaysia | ❌ NO |
| Thailand | ❌ NO |

**Note:** Only "India" enables HSN. Any other country disables it.

---

## Customization

### To Add More Countries with HSN Support

If in the future other countries (e.g., Bangladesh, Sri Lanka) also adopt HSN, update the check in:

**File:** `client/src/components/settings/CompanySettings.jsx`

**Current Code:**
```javascript
const isIndiaCompany = company?.country === 'India'
```

**Updated Code (Example):**
```javascript
const hsnSupportedCountries = ['India', 'Bangladesh', 'Nepal']
const isHSNSupported = hsnSupportedCountries.includes(company?.country)
```

Then replace all `isIndiaCompany` with `isHSNSupported`.

---

## Error Handling

### Scenario 1: Company not loaded yet
- Shows warning banner "HSN Management Not Available"
- Prevents access
- No errors in console

### Scenario 2: Invalid country value
- Treats as non-India
- HSN disabled
- Safe behavior

### Scenario 3: Country changed while viewing HSN
- Auto-redirects to Company Master tab
- Prevents orphaned state
- Shows updated tab as disabled

---

## Related Files

### Frontend
- `client/src/components/settings/CompanySettings.jsx` - Tab control
- `client/src/components/settings/company/HSNManagement.jsx` - HSN interface
- `client/src/hooks/useTaxMaster.js` - Company data source

### Backend
- `server/Models/Company.js` - Company model with country field
- `server/controllers/hsnController.js` - HSN API endpoints
- `server/routes/hsnRoutes.js` - HSN routes

---

## FAQ

### Q: What if I switch country from India to non-India?
**A:** HSN tab becomes disabled immediately. If you were viewing HSN, you're redirected to Company Master.

### Q: Can I force HSN to work for non-India countries?
**A:** Technically possible by modifying code, but not recommended. HSN is India-specific (GST), so other countries shouldn't use it.

### Q: Does changing country delete HSN data?
**A:** No. HSN data is not deleted. If you switch back to India, all HSN codes remain intact.

### Q: What if company country is blank/null?
**A:** Treated as non-India. HSN remains disabled until country is set to "India".

### Q: Do existing HSN codes restrict non-India access?
**A:** No. The UI prevents access to HSN interface for non-India companies. But if you bypass the UI, the API also validates on backend.

---

## Backend Validation (Optional)

For additional security, you can also add country validation in the backend:

**File:** `server/controllers/hsnController.js`

```javascript
export const getHSNList = async (req, res) => {
  try {
    // Get user's company
    const company = await Company.findById(req.user.companyId)
    
    // Validate country
    if (company.country !== 'India') {
      return res.status(403).json({
        success: false,
        error: 'HSN Management is only available for India-based companies'
      })
    }
    
    // Continue with normal logic
    // ...
  } catch (error) {
    // ...
  }
}
```

---

## Summary

✅ **Automatic Control** - HSN tab enabled/disabled based on country  
✅ **User-Friendly** - Clear indicators and tooltips  
✅ **Safe** - Prevents access to India-only feature  
✅ **Responsive** - Updates when country changes  
✅ **Non-Destructive** - Data preserved if country changes  

---

## Support

For questions or issues regarding country-based HSN control:

1. Check company country setting in Company Master
2. Verify it's set to "India" for HSN access
3. Save and refresh page if tab state doesn't update
4. Check browser console for any errors

---

**Last Updated:** March 4, 2026  
**Feature:** Country-Based HSN Control  
**Status:** ✅ Implemented and Ready
