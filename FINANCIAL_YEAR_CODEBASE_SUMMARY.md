# Financial Year Implementation - Complete Codebase Summary

---

## 1. FINANCIAL YEAR ENDPOINTS

### **Base Routes File**
📍 [server/modules/masters/routes/financialYearRoutes.js](server/modules/masters/routes/financialYearRoutes.js)

### **All Endpoints**

| Method | Endpoint | Controller Function | Purpose |
|--------|----------|-------------------|---------|
| **POST** | `/financial-years` | `createFinancialYear` | Create new financial year |
| **GET** | `/financial-years` | `getFinancialYears` | Get all financial years (with filters for status, includeDeleted) |
| **GET** | `/financial-years/current` | `getCurrentFinancialYear` | Get the currently active financial year |
| **GET** | `/financial-years/by-date/:date` | `getFinancialYearForDate` | Get financial year for specific date |
| **GET** | `/financial-years/:id` | `getFinancialYearById` | Get financial year by ID |
| **PUT** | `/financial-years/:id` | `updateFinancialYear` | Update financial year details |
| **DELETE** | `/financial-years/:id` | `deleteFinancialYear` | Soft delete financial year |
| **PATCH** | `/financial-years/:id/set-current` | `setCurrentFinancialYear` | Mark as current active year |
| **PATCH** | `/financial-years/:id/close` | `closeFinancialYear` | Close financial year (prevents posting) |
| **PATCH** | `/financial-years/:id/lock` | `lockFinancialYear` | Permanently lock financial year |
| **PATCH** | `/financial-years/:id/reopen` | `reopenFinancialYear` | Reopen a closed financial year |
| **POST** | `/financial-years/validate-posting` | `validatePostingDate` | Check if posting allowed for date |

---

## 2. FINANCIAL YEAR MODEL SCHEMA

📍 [server/Models/FinancialYear.js](server/Models/FinancialYear.js)

### **All Fields**

```javascript
{
  // Code & Display
  yearCode: String (unique, uppercase, required)      // e.g., "FY2025-26"
  yearName: String (required)                          // e.g., "Financial Year 2025-2026"
  
  // Date Range
  startDate: Date (required, indexed)
  endDate: Date (required, indexed)
  
  // Status Management
  status: String (enum: "OPEN", "CLOSED", "LOCKED")   // Default: "OPEN"
  isCurrent: Boolean (default: false, indexed)         // Current active year
  allowPosting: Boolean (default: true)                // Allow transactions
  
  // Closing Details
  closingDate: Date (nullable)
  closedBy: String
  
  // Opening Balances
  openingBalancesPosted: Boolean (default: false)
  openingBalancesDate: Date
  previousYearId: ObjectId (ref: FinancialYear)       // Link to prior year
  
  // Notes
  remarks: String
  
  // Soft Delete
  isDeleted: Boolean (default: false)
  deletedAt: Date
  
  // Timestamps
  createdAt: Date (auto)
  updatedAt: Date (auto)
}
```

### **Key Indexes**
- `status`: For fast filtering by OPEN/CLOSED/LOCKED
- `isCurrent`: For finding active year
- `startDate + endDate`: For date range queries
- `isDeleted`: For soft delete filtering

### **Important Virtual & Methods**

```javascript
// Virtual
isActive()  // Returns true if OPEN + allowPosting + within date range

// Instance Methods
containsDate(date)  // Check if date falls within this FY

// Static Methods
getCurrentYear()              // Get year marked as current
getYearForDate(date)          // Get year containing this date
```

### **Pre-save Hook**
Ensures only ONE financial year marked as `isCurrent` at any time

---

## 3. VIEW/DISPLAY COMPONENTS FOR FINANCIAL YEARS

### **Currently Implemented Components**

#### **1. CompanyMaster.jsx** (Main Admin Interface)
📍 [client/src/components/settings/company/CompanyMaster.jsx](client/src/components/settings/company/CompanyMaster.jsx#L781-L850)

**What it does:**
- Lists all financial years in a read-only display format
- Shows: yearCode, yearName, startDate, endDate
- Current year highlighted with badge
- "Set Current" button for each year
- Modal form for creating new financial years

**Display Features:**
```jsx
// Each financial year shown as:
- yearCode (bold)
- "Current" badge (if isCurrent)
- yearName (subtitle)
- Date range (startDate to endDate)
- "Set Current" action button (disabled if already current)
```

**Data Flow:**
```
API: GET /financial-years
  ↓
financialYears state array
  ↓
Map through & display in card layout
```

**Create Flow:**
```
Modal Form (showFYModal state)
  ↓ handleCreateFinancialYear()
  ↓ POST /financial-years
  ↓ fetchFinancialYears() to refresh list
```

---

## 4. FINANCIAL YEAR SERVICE & BUSINESS LOGIC

📍 [server/modules/masters/services/FinancialYearService.js](server/modules/masters/services/FinancialYearService.js)

### **Service Methods**

| Method | Purpose | Input | Output |
|--------|---------|-------|--------|
| `validateFinancialYearDates()` | Validates date logic | startDate, endDate | boolean |
| `checkDateOverlap()` | Check for overlapping years | startDate, endDate, excludeId | Promise<Object\|null> |
| `createFinancialYear()` | Create with validation | fyData object | Promise<FinancialYear> |
| `getFinancialYearById()` | Retrieve by ID | fyId | Promise<FinancialYear> |
| `getFinancialYearByCode()` | Retrieve by code | yearCode | Promise<FinancialYear> |
| `getAllFinancialYears()` | List with pagination | filters object | Promise<paginated results> |
| `getCurrentFinancialYear()` | Get active year | - | Promise<FinancialYear> |
| `setCurrentFinancialYear()` | Make year current | fyId | Promise<FinancialYear> |
| `updateFinancialYear()` | Update allowed fields | fyId, updateData | Promise<FinancialYear> |
| `closeFinancialYear()` | Close year (status=CLOSED) | fyId, closedBy | Promise<FinancialYear> |
| `lockFinancialYear()` | Permanently lock year | fyId, lockedBy | Promise<FinancialYear> |
| `deleteFinancialYear()` | Soft delete | fyId | Promise<FinancialYear> |
| `getFinancialYearForDate()` | Get year containing date | date | Promise<FinancialYear> |
| `isPostingAllowed()` | Check posting permission | fyId | Promise<boolean> |
| `getFinancialYearStatistics()` | Get summary stats | - | Promise<stats object> |

---

## 5. HOW OTHER MASTERS IMPLEMENT VIEW/EDIT MODES

### **Pattern: ChartOfAccounts Component**
📍 [client/src/components/accounts/ChartOfAccounts.jsx](client/src/components/accounts/ChartOfAccounts.jsx)

#### **View Mode Architecture**

```javascript
// Constants/VIEW_MODES
export const VIEW_MODES = {
  GROUPED: "grouped",
  LIST: "list",
  SUMMARY: "summary"
};
```

#### **State Management Pattern**
```javascript
// Using useReducer for clean state management
const [state, dispatch] = useReducer(accountsReducer, initialState);

// Initial state includes viewMode
export const initialState = {
  accounts: [],
  accountGroups: [],
  loading: false,
  showModal: false,
  editingId: null,              // Track which item is being edited
  searchTerm: "",
  filterGroup: "",
  filterBank: "",
  viewMode: "grouped",          // Current view mode
  formData: INITIAL_FORM_DATA
};
```

#### **Action Types Pattern**
```javascript
export const ACTIONS = {
  SET_ACCOUNTS: "SET_ACCOUNTS",
  SET_GROUPS: "SET_GROUPS",
  SET_LOADING: "SET_LOADING",
  SET_MODAL_STATE: "SET_MODAL_STATE",
  SET_FORM_DATA: "SET_FORM_DATA",
  RESET_FORM: "RESET_FORM",
  SET_SEARCH_TERM: "SET_SEARCH_TERM",
  SET_FILTER_GROUP: "SET_FILTER_GROUP",
  SET_FILTER_BANK: "SET_FILTER_BANK",
  SET_VIEW_MODE: "SET_VIEW_MODE",        // Action to change view
  SET_EDITING_ID: "SET_EDITING_ID"       // Track edit mode
};
```

#### **View Mode Rendering Pattern**
```jsx
// UI Tab Buttons
{Object.values(VIEW_MODES).map((mode) => (
  <button
    key={mode}
    onClick={() => dispatch({ type: ACTIONS.SET_VIEW_MODE, payload: mode })}
    className={state.viewMode === mode ? "active" : "inactive"}
  >
    {mode}
  </button>
))}

// Conditional rendering based on viewMode
{state.viewMode === VIEW_MODES.GROUPED && <GroupedView />}
{state.viewMode === VIEW_MODES.LIST && <ListView />}
{state.viewMode === VIEW_MODES.SUMMARY && <SummaryView />}
```

#### **Edit Mode Pattern**
```javascript
const handleOpenModal = (account = null) => {
  if (account) {
    // Edit Mode: Load existing data
    dispatch({ type: ACTIONS.SET_EDITING_ID, payload: account._id });
    dispatch({
      type: ACTIONS.SET_FORM_DATA,
      payload: { ...account }
    });
  } else {
    // Create Mode: Empty form
    dispatch({ type: ACTIONS.SET_EDITING_ID, payload: null });
    dispatch({ type: ACTIONS.RESET_FORM });
  }
  dispatch({ type: ACTIONS.SET_MODAL_STATE, payload: true });
};

// Modal title changes based on editingId
title={state.editingId ? "Edit Account" : "Add Account"}

// Submit button text changes based on mode
{state.editingId ? "Update Account" : "Add Account"}
```

#### **Edit Form Save Pattern**
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  const isEditing = state.editingId;
  const endpoint = isEditing
    ? `${API_ENDPOINTS.UPDATE_ACCOUNT}/${state.editingId}`
    : API_ENDPOINTS.ADD_ACCOUNT;
  const method = isEditing ? "PUT" : "POST";
  
  // API call with appropriate method
  const result = await mutate(endpoint, state.formData, method);
  
  if (result.success) {
    handleCloseModal();
    loadAccounts();  // Refresh list
  }
};
```

---

## 6. RECOMMENDED PATTERNS FOR FINANCIAL YEAR VIEW/EDIT

Based on the codebase analysis, here are recommended patterns:

### **Pattern 1: Detailed View Modal** (Like current CompanyMaster)
```jsx
// Show all FY details when user clicks row
<FinancialYearDetailModal
  financialYear={selectedFY}
  onEdit={() => openEditForm()}
  onClose={() => setSelectedFY(null)}
/>
```

### **Pattern 2: Multi-View System** (Like ChartOfAccounts)
```javascript
// Could implement:
VIEW_MODES = {
  CARD: "card",      // Current card layout (CompanyMaster style)
  TABLE: "table",    // Tabular view
  TIMELINE: "timeline" // Visual timeline of years
}
```

### **Pattern 3: Edit/View Toggle** (Standard pattern)
```jsx
// When viewing FY details:
<FinancialYearForm
  financialYear={selectedFY}
  editMode={isEditMode}
  readOnlyFields={["status", "closedBy"]}  // Can't edit these
/>
```

### **Pattern 4: Status-Based Restrictions**
```javascript
// Based on status, restrict available actions:
if (year.status === "LOCKED") {
  // Disable edit button
  // Disable delete button
  // Only allow view
}
if (year.status === "CLOSED") {
  // Allow view
  // Allow reopen (if not locked)
  // Disable edit
}
if (year.status === "OPEN") {
  // Allow all operations
}
```

---

## 7. CONTROLLER IMPLEMENTATION DETAILS

📍 [server/modules/masters/controllers/financialYearController.js](server/modules/masters/controllers/financialYearController.js)

### **Key Business Logic in Controller**

**Create Validation:**
- Checks for duplicate yearCode
- Validates endDate > startDate
- Checks for date overlaps with existing years
- Automatically links to previous year
- Sets new year as OPEN

**Update Restrictions:**
- Cannot modify CLOSED or LOCKED years
- Can only update: yearName, startDate, endDate, remarks, allowPosting
- TODO: Check if transactions exist before date changes

**Status Transitions:**
```
OPEN → CLOSED → LOCKED  (one-way progressive)
CLOSED → OPEN (reopen - except if LOCKED)
LOCKED (terminal - cannot be reopened)
```

**Posting Validation:**
```javascript
validatePostingDate checks:
1. Financial year exists for date
2. Year status is OPEN
3. Year allowPosting is true
Returns: { allowed: boolean, financialYear: Object }
```

---

## 8. SUMMARY TABLE: ENDPOINTS vs. FUNCTIONALITY

| Feature | Endpoint | Method | Where Used |
|---------|----------|--------|-----------|
| List All | `GET /financial-years` | GET | CompanyMaster on mount |
| Create | `POST /financial-years` | POST | CompanyMaster modal submit |
| Get Current | `GET /financial-years/current` | GET | Accounting modules, GRN, Sales |
| Get for Date | `GET /financial-years/by-date/:date` | GET | Validate document dates |
| Get Details | `GET /financial-years/:id` | GET | View mode (if implemented) |
| Update | `PUT /financial-years/:id` | PUT | Edit form submit |
| Delete (soft) | `DELETE /financial-years/:id` | DELETE | Unused - kept for API completeness |
| Set Current | `PATCH /financial-years/:id/set-current` | PATCH | CompanyMaster "Set Current" button |
| Close | `PATCH /financial-years/:id/close` | PATCH | Year-end closing process |
| Lock | `PATCH /financial-years/:id/lock` | PATCH | Permanent close after audit |
| Reopen | `PATCH /financial-years/:id/reopen` | PATCH | Undo close (if not locked) |
| Validate Posting | `POST /financial-years/validate-posting` | POST | Pre-transaction validation |

---

## 9. CURRENT IMPLEMENTATION STATUS

✅ **Fully Implemented:**
- All endpoints working
- Service layer complete
- Model schema complete
- CompanyMaster integration for CRUD

⚠️ **Partially Implemented:**
- View mode (currently just list display in CompanyMaster)
- Edit mode (no dedicated edit modal - only create)
- Detailed view (no detail modal/page)

❌ **Missing / TODO:**
- Dedicated Financial Year List Page (separate from CompanyMaster)
- View/Edit Detail Modal
- Multiple view modes (TABLE, TIMELINE, etc.)
- Transaction existence checks before date modification
- Opening balances carry-forward UI
- Year-end closing checklist/workflow

---

## 10. KEY FILES REFERENCE

| File | Purpose |
|------|---------|
| [financialYearRoutes.js](server/modules/masters/routes/financialYearRoutes.js) | All endpoints |
| [financialYearController.js](server/modules/masters/controllers/financialYearController.js) | Endpoint handlers |
| [FinancialYearService.js](server/modules/masters/services/FinancialYearService.js) | Business logic |
| [FinancialYear.js (Model)](server/Models/FinancialYear.js) | Schema definition |
| [CompanyMaster.jsx](client/src/components/settings/company/CompanyMaster.jsx) | Current UI for FY management |
| [ChartOfAccounts.jsx](client/src/components/accounts/ChartOfAccounts.jsx) | Pattern for view/edit modes |

---

**Last Updated:** April 20, 2026
**Document Status:** ✅ Complete & Current
