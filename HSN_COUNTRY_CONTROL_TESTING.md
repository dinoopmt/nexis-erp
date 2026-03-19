# HSN Country-Based Control - Verification Checklist

## Pre-Deployment Testing

### ✅ Environment Setup
- [ ] Backend server running
- [ ] Database connected
- [ ] Frontend development server running
- [ ] Browser console open (F12)
- [ ] No console errors visible

---

## Frontend Tests

### 1. India Company Tests

#### Test 1.1: India Company - Tab Visibility
- [ ] Navigate to Settings page
- [ ] Verify company country is set to "India"
- [ ] Confirm "HSN Management" tab is **visible and blue**
- [ ] Confirm tab is **not grayed out**
- [ ] Confirm **no "India only" badge** appears
- [ ] No warning banner visible above tabs

#### Test 1.2: India Company - Tab Interaction
- [ ] Click on "HSN Management" tab
- [ ] Tab becomes active (highlights)
- [ ] HSN interface loads completely
- [ ] Search, filter, table, and create button visible
- [ ] No warnings or errors displayed

#### Test 1.3: India Company - HSN Functionality
- [ ] Can search HSN codes
- [ ] Can filter by name
- [ ] Can create new HSN
- [ ] Can view existing HSNs
- [ ] Can edit HSN
- [ ] Can delete HSN
- [ ] Can pagination works

### 2. Non-India Company Tests

#### Test 2.1: Non-India Company - Tab Appearance
- [ ] Change company country to "UAE" (or any non-India country)
- [ ] Go back to Settings page
- [ ] Confirm "HSN Management" tab is **grayed out**
- [ ] Confirm "India only" badge is **visible**
- [ ] Tab text color is lighter/faded
- [ ] Warning banner visible: "Your company is configured for UAE..."

#### Test 2.2: Non-India Company - Tab Interaction
- [ ] Try to click HSN Management tab
- [ ] **Nothing happens** (no navigation)
- [ ] Cursor shows "not-allowed" icon
- [ ] Tab does not become active
- [ ] No errors in console

#### Test 2.3: Non-India Company - Content Hidden
- [ ] All HSN interface hidden
- [ ] Red warning alert displayed
- [ ] Alert explains HSN is India-only
- [ ] Alert shows current company country ("UAE")
- [ ] No HSN search/filter/table visible
- [ ] No create HSN button visible

### 3. Country Change Tests

#### Test 3.1: Switch from Non-India to India
- [ ] Start with non-India country (HSN disabled)
- [ ] Go to Company Master tab
- [ ] Change country to "India"
- [ ] Save changes
- [ ] **Automatically refresh/reload settings**
- [ ] Confirm HSN tab is now **enabled**
- [ ] Confirm tab is no longer grayed out
- [ ] Confirm "India only" badge disappears
- [ ] Confirm warning banner disappears

#### Test 3.2: Switch from India to Non-India While Viewing HSN
- [ ] Start with India country (HSN enabled)
- [ ] Click on HSN Management tab (now active)
- [ ] View HSN interface (search, table visible)
- [ ] Go to Company Master tab while HSN is active
- [ ] Change country to "UK" or any non-India country
- [ ] Save changes
- [ ] **Automatically redirected to Company Master tab**
- [ ] HSN tab now grayed out with badge
- [ ] Can see warning banner
- [ ] Confirm user wasn't left on disabled HSN tab

#### Test 3.3: Switch from Non-India to India While on Other Tab
- [ ] Start with non-India country
- [ ] View Company Master tab (or another tab)
- [ ] Go to Company Master settings
- [ ] Change country to "India"
- [ ] Save changes
- [ ] Confirm HSN tab is now enabled
- [ ] Can click on HSN tab (should work)

### 4. Tab Tooltip Tests

#### Test 4.1: Enabled HSN Tooltip
- [ ] With India company, hover over HSN Management tab
- [ ] Tooltip should show (if configured)
- [ ] Or tooltip can be absent (both acceptable)

#### Test 4.2: Disabled HSN Tooltip
- [ ] With non-India company, hover over HSN Management tab
- [ ] Tooltip should show: **"HSN Management is only available for India companies"**
- [ ] Tooltip appears near tab

---

## Component-Level Tests

### 5. CompanySettings.jsx Tests

#### Test 5.1: Import Verification
- [ ] Open `client/src/components/settings/CompanySettings.jsx`
- [ ] Confirm `useEffect` is imported from React
- [ ] Confirm `useTaxMaster` hook is imported
- [ ] Confirm `AlertCircle` icon is imported from lucide-react

#### Test 5.2: State Initialization
- [ ] Confirm `isIndiaCompany` computed state exists
- [ ] Value should be `company?.country === 'India'`
- [ ] Updates reactively when country changes

#### Test 5.3: Tab Configuration
- [ ] Confirm tabs array has `enabled` property for HSN tab
- [ ] Confirm HSN tab has `enabled: isIndiaCompany`
- [ ] Confirm other tabs don't have `enabled` property (or always true)

#### Test 5.4: useEffect Hook
- [ ] Confirm useEffect resets to 'company' tab when HSN becomes disabled
- [ ] Check useEffect dependencies include `isIndiaCompany` and `activeTab`
- [ ] Verify effect runs when country changes

#### Test 5.5: Tab Button Rendering
- [ ] Confirm disabled-state styling applied when `isDisabled`
- [ ] Confirm "India only" badge renders when HSN is disabled
- [ ] Confirm tooltip div renders with proper message

#### Test 5.6: Warning Alert
- [ ] Confirm warning alert appears when `!isIndiaCompany`
- [ ] Confirm alert shows current company country
- [ ] Alert message clear and helpful

### 6. HSNManagement.jsx Tests

#### Test 6.1: Import Verification
- [ ] Confirm `useTaxMaster` hook is imported
- [ ] Confirm all icons used are imported
- [ ] No missing dependencies

#### Test 6.2: Country Detection
- [ ] Confirm `isIndiaCompany` computed state exists
- [ ] Value should be `company?.country === 'India'`
- [ ] Verify it matches CompanySettings.jsx logic

#### Test 6.3: Warning Alert
- [ ] Confirm red warning alert shown when `!isIndiaCompany`
- [ ] Alert background is red/pink (`bg-red-50`)
- [ ] Alert text is red (`text-red-700`)
- [ ] Alert message explains India-only requirement
- [ ] Shows current company country

#### Test 6.4: Content Wrapping
- [ ] Confirm all HSN content wrapped in `{isIndiaCompany && (...)}`
- [ ] Search/filter section inside conditional
- [ ] HSN list table inside conditional
- [ ] Create/Edit modal inside conditional
- [ ] When not India, **everything hidden** (no errors)

#### Test 6.5: No Partial Rendering
- [ ] For non-India company, confirm:
  - [ ] No search box visible
  - [ ] No filter controls visible
  - [ ] No HSN table visible
  - [ ] No create button visible
  - [ ] No edit modal visible
  - [ ] Only warning alert visible

---

## API Tests (Backend Validation)

### 7. HSN API Tests

#### Test 7.1: Get HSN List - India Company
- [ ] API: GET `/api/hsn`
- [ ] With India company authorization
- [ ] Should return: 200 OK with HSN list

#### Test 7.2: Get HSN List - Non-India Company
- [ ] API: GET `/api/hsn`
- [ ] With non-India company authorization
- [ ] Frontend prevents access (no API call should be made)
- [ ] If API is called: Should return 403 Forbidden (if backend validation added)

#### Test 7.3: Create HSN - India Company
- [ ] API: POST `/api/hsn`
- [ ] With India company authorization
- [ ] Should allow HSN creation

#### Test 7.4: Create HSN - Non-India Company
- [ ] API: POST `/api/hsn`
- [ ] With non-India company authorization
- [ ] Frontend prevents request (no API call should be made)

---

## Console Tests

### 8. Browser Console (F12)

#### Test 8.1: No Errors
- [ ] Open DevTools (F12)
- [ ] Go to Console tab
- [ ] Confirm **no red error messages**
- [ ] Confirm **no undefined variable warnings**
- [ ] Confirm **no import/export errors**

#### Test 8.2: Proper Logging (Optional)
- [ ] Can add console.log to verify country detection
- [ ] Should see: `isIndiaCompany: true` or `isIndiaCompany: false`
- [ ] Company object should be fully loaded

#### Test 8.3: Network Requests
- [ ] Go to Network tab
- [ ] Check company data is being fetched
- [ ] No failed requests (404, 500, etc.)
- [ ] Country value properly populated

---

## Styling Tests

### 9. CSS/Tailwind Tests

#### Test 9.1: Disabled Tab Styling
- [ ] Non-India HSN tab shows reduced opacity (50%)
- [ ] Text appears grayed out/lighter
- [ ] "India only" badge visible next to text

#### Test 9.2: Warning Alert Colors
- [ ] Red alert background (bg-red-50 or similar)
- [ ] Red alert text (text-red-700)
- [ ] Red alert border (border-red-200)
- [ ] AlertCircle icon visible and red

#### Test 9.3: Active Tab Styling
- [ ] India company HSN tab active = blue background
- [ ] Non-India company HSN tab disabled = grayed out
- [ ] Other tabs (Company, License, Settings) always styled normally

#### Test 9.4: Cursor Behavior
- [ ] Hover over enabled HSN tab = normal pointer cursor
- [ ] Hover over disabled HSN tab = "not-allowed" cursor
- [ ] Other tabs = normal pointer cursor

---

## Mobile/Responsive Tests

### 10. Responsive Design Tests

#### Test 10.1: Mobile View
- [ ] Resize browser to mobile width (375px)
- [ ] Tabs still properly stacked/scrollable
- [ ] HSN tab disabling logic works on mobile
- [ ] Warning banner readable on mobile
- [ ] Touch interactions work

#### Test 10.2: Tablet View
- [ ] Resize browser to tablet width (768px)
- [ ] Layout still responsive
- [ ] All elements visible and functional

---

## Edge Cases

### 11. Edge Case Tests

#### Test 11.1: Null Country
- [ ] Set company country to empty string or null
- [ ] HSN tab should be disabled (treated as non-India)
- [ ] Warning alert should display

#### Test 11.2: Case Sensitivity
- [ ] Test if country is "india" (lowercase)
- [ ] **Expected:** HSN should be disabled (check is case-sensitive for "India")
- [ ] This is OK (country should always be "India" from selector)

#### Test 11.3: Rapid Country Changes
- [ ] Change country multiple times rapidly
- [ ] UI should update smoothly
- [ ] No errors or broken states
- [ ] Tab switching works properly

#### Test 11.4: Page Refresh While on HSN Tab
- [ ] India company, viewing HSN tab
- [ ] Press F5 to refresh
- [ ] Should still be on HSN tab (if country still India)
- [ ] Should redirect to Company tab if company country changed since last save

#### Test 11.5: Logout/Login
- [ ] Login as India company user
- [ ] HSN tab enabled
- [ ] Logout
- [ ] Login as non-India company user
- [ ] HSN tab disabled
- [ ] Logout
- [ ] Login back to India company user
- [ ] HSN tab enabled again

---

## Test Data Preparation

### Before Running Tests:

1. **Create Test Company Profiles:**
   ```
   Test Company 1 (India):
   - Name: "Test India Co"
   - Country: "India"
   - Status: Active
   
   Test Company 2 (Non-India):
   - Name: "Test UAE Co"
   - Country: "UAE"
   - Status: Active
   ```

2. **Create Test HSN Codes:**
   ```
   HSN Code 1: 8471 (Automatic Data Processing Machines)
   HSN Code 2: 7318 (Fasteners)
   HSN Code 3: 6304 (Textiles)
   ```

3. **Create Test Users:**
   ```
   User 1: Belongs to India company
   User 2: Belongs to UAE company
   ```

---

## Test Results Summary

| Test Case | Status | Notes |
|-----------|--------|-------|
| 1.1 - India Tab Visibility | ⏳ Pending | |
| 1.2 - India Tab Interaction | ⏳ Pending | |
| 1.3 - India Functionality | ⏳ Pending | |
| 2.1 - Non-India Tab Appearance | ⏳ Pending | |
| 2.2 - Non-India Tab Interaction | ⏳ Pending | |
| 2.3 - Non-India Content Hidden | ⏳ Pending | |
| 3.1 - Switch Non→India | ⏳ Pending | |
| 3.2 - Switch India→Non while viewing | ⏳ Pending | |
| 3.3 - Switch Non→India on other tab | ⏳ Pending | |
| 4.1 - Enabled Tooltip | ⏳ Pending | |
| 4.2 - Disabled Tooltip | ⏳ Pending | |
| 5.1 - Imports | ⏳ Pending | |
| 5.2 - State | ⏳ Pending | |
| 5.3 - Tab Config | ⏳ Pending | |
| 5.4 - useEffect | ⏳ Pending | |
| 5.5 - Button Rendering | ⏳ Pending | |
| 5.6 - Warning Alert | ⏳ Pending | |
| 6.1 - HSN Imports | ⏳ Pending | |
| 6.2 - Country Detection | ⏳ Pending | |
| 6.3 - HSN Warning Alert | ⏳ Pending | |
| 6.4 - Content Wrapping | ⏳ Pending | |
| 6.5 - No Partial Render | ⏳ Pending | |
| 7.1 - API India | ⏳ Pending | |
| 7.2 - API Non-India | ⏳ Pending | |
| 7.3 - API Create India | ⏳ Pending | |
| 7.4 - API Create Non-India | ⏳ Pending | |
| 8.1 - Console Errors | ⏳ Pending | |
| 8.2 - Console Logging | ⏳ Pending | |
| 8.3 - Network Requests | ⏳ Pending | |
| 9.1 - Disabled Styling | ⏳ Pending | |
| 9.2 - Alert Colors | ⏳ Pending | |
| 9.3 - Active Tab | ⏳ Pending | |
| 9.4 - Cursor Behavior | ⏳ Pending | |
| 10.1 - Mobile View | ⏳ Pending | |
| 10.2 - Tablet View | ⏳ Pending | |
| 11.1 - Null Country | ⏳ Pending | |
| 11.2 - Case Sensitivity | ⏳ Pending | |
| 11.3 - Rapid Changes | ⏳ Pending | |
| 11.4 - Page Refresh | ⏳ Pending | |
| 11.5 - Logout/Login | ⏳ Pending | |

---

## Known Issues & Workarounds

| Issue | Workaround | Status |
|-------|-----------|--------|
| Country value case sensitivity | Ensure country is "India" (capital I) | ✅ N/A |
| HSN data persisted after disabling | This is expected - data preserved | ✅ N/A |
| Tab refresh shows HSN briefly | Normal behavior - affected by hook loading | ✅ N/A |

---

## Sign-Off Checklist

- [ ] All test cases passed
- [ ] No console errors
- [ ] UI renders correctly
- [ ] Responsive design verified
- [ ] Country switching works
- [ ] Tooltips and badges visible
- [ ] Warning alerts functional
- [ ] Data integrity maintained
- [ ] API requests work properly
- [ ] Ready for production deployment

---

**Test Date:** _______________  
**Tested By:** _______________  
**Status:** ⏳ In Progress  
**Sign-Off:** _______________ 

---

**Last Updated:** March 4, 2026  
**Feature:** HSN Country-Based Control Testing  
**Version:** 1.0
