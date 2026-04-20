# Terminal Features vs Role-Based Controls - Clarification

**Date:** April 20, 2026

## 🎯 Key Distinction

### Terminal Features → UI Show/Hide (TERMINAL CONFIG)
```jsx
const allowReturns = useTerminalFeature('allowReturns');
const allowDiscounts = useTerminalFeature('allowDiscounts');
const allowExchanges = useTerminalFeature('allowExchanges');

// Use to show/hide buttons
{allowReturns && <ReturnButton />}
{allowDiscounts && <DiscountButton />}
```

### Discount Validation → Role-Based Limits (USER ROLE)
```jsx
// ❌ NOT TERMINAL-BASED (DEPRECATED in v2)
// useTerminalDiscount() - DO NOT USE for discount validation

// ✅ USE ROLE-BASED SYSTEM
const user = localStorage.getItem('user');  // Contains role
const userRole = user?.role;

// Check role permissions
if (userRole === 'MANAGER' || userRole === 'ADMIN') {
  // Can approve high discounts
}
```

---

## 📋 Terminal Feature Controls

### Supported Terminal Features

```javascript
allowReturns        // Show "Process Return" button
allowDiscounts      // Show discount input fields
allowCredits        // Show credit payment option
allowExchanges      // Show "Process Exchange" button
allowPromotions     // Show promotional codes section
```

### Usage in Components

```jsx
import { useTerminalFeature } from '../context/TerminalContext';

export function SalesInvoice() {
  const allowReturns = useTerminalFeature('allowReturns');
  const allowDiscounts = useTerminalFeature('allowDiscounts');
  const allowExchanges = useTerminalFeature('allowExchanges');
  const allowPromotions = useTerminalFeature('allowPromotions');

  return (
    <div>
      {/* Show discount fields only if allowed by terminal */}
      {allowDiscounts && (
        <>
          <input name="discount" placeholder="Discount %" />
          <input name="discountAmount" placeholder="Discount Amount" />
        </>
      )}

      {/* Show return button only if allowed */}
      {allowReturns && (
        <button onClick={handleReturnTransaction}>
          Process Return
        </button>
      )}

      {/* Show exchange button only if allowed */}
      {allowExchanges && (
        <button onClick={handleExchange}>
          Process Exchange
        </button>
      )}
    </div>
  );
}
```

---

## 🔐 Role-Based Discount Validation (SEPARATE)

### Discount validation should check USER ROLE, not terminal

```jsx
// Get user role from localStorage
const getUserRole = () => {
  const user = localStorage.getItem('user');
  return user?.role?.name || 'STAFF';
};

// Define discount limits by role
const discountLimitsByRole = {
  STAFF: 5,           // Staff can give max 5% discount
  SUPERVISOR: 10,     // Supervisor max 10%
  MANAGER: 25,        // Manager max 25%
  ADMIN: 100,         // Admin unlimited
};

// Validate discount against role
const validateDiscountByRole = (discountAmount) => {
  const userRole = getUserRole();
  const maxAllowed = discountLimitsByRole[userRole] || 0;
  
  if (discountAmount > maxAllowed) {
    return {
      valid: false,
      error: `Your role allows max ${maxAllowed}% discount. Required: Manager approval`,
      requiresApproval: true,
    };
  }
  
  return { valid: true };
};
```

---

## ✅ Implementation Example for SalesInvoice

```jsx
import { useTerminalFeature } from '../context/TerminalContext';

export function SalesInvoice() {
  // Terminal features (show/hide UI elements)
  const allowDiscounts = useTerminalFeature('allowDiscounts');
  const allowReturns = useTerminalFeature('allowReturns');
  
  // Get user role (for discount validation)
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user?.role?.name || 'STAFF';

  // Discount validation (role-based)
  const validateDiscount = (amount) => {
    const roleDiscountLimits = {
      STAFF: 5,
      SUPERVISOR: 10,
      MANAGER: 25,
      ADMIN: 100,
    };
    
    const maxAllowed = roleDiscountLimits[userRole] || 0;
    if (amount > maxAllowed) {
      return {
        valid: false,
        error: `${userRole} can give max ${maxAllowed}% discount`,
        requiresApproval: true,
      };
    }
    return { valid: true };
  };

  const handleDiscountChange = (value) => {
    // First check: Is discount feature allowed by terminal?
    if (!allowDiscounts) {
      alert('Terminal does not allow discounts');
      return;
    }

    // Second check: Does user role allow this discount amount?
    const validation = validateDiscount(value);
    if (!validation.valid) {
      alert(validation.error);
      if (validation.requiresApproval) {
        showManagerApprovalModal();
      }
      return;
    }

    setDiscount(value);
  };

  return (
    <div>
      {/* 1. Terminal Control: Show/Hide discount UI */}
      {allowDiscounts && (
        <div className="discount-section">
          <input
            type="number"
            value={discount}
            onChange={(e) => handleDiscountChange(parseFloat(e.target.value))}
            placeholder="Discount %"
          />
          <small>Role: {userRole} (Max: {roleDiscountLimits[userRole]}%)</small>
        </div>
      )}

      {/* 2. Terminal Control: Show/Hide return button */}
      {allowReturns && (
        <button onClick={handleReturn}>Process Return</button>
      )}
    </div>
  );
}
```

---

## 🗂️ Where Each Control Lives

| Control | Type | Source | Hook/API |
|---------|------|--------|----------|
| Show/Hide Buttons | Terminal Feature | TerminalManagement DB | `useTerminalFeature()` |
| Discount Limits | Role-Based | User Object (localStorage) | Role in user.role.name |
| Feature Restrictions | Terminal Config | TerminalManagement DB | `useTerminalFeature()` |
| User Permissions | Role-Based | Database + JWT | User object |

---

## 📚 Summary

### Terminal Features (useTerminalFeature)
```
✅ Control: Show/hide UI elements
✅ Source: Terminal configuration from database
✅ Applied to: Specific terminal (e.g., Main Counter)
✅ Purpose: Different terminals can have different capabilities
```

### Role-Based Validation (User Object)
```
✅ Control: Approve/reject actions with business logic
✅ Source: User role from authentication
✅ Applied to: All users with that role
✅ Purpose: Enforce company policies based on user job function
```

---

## 🚀 Integration Checklist

For SalesInvoice:
- [ ] Import `useTerminalFeature` from TerminalContext
- [ ] Check `allowDiscounts` before showing discount UI
- [ ] Check `allowReturns` before showing return button
- [ ] Keep discount validation ROLE-BASED (check user.role)
- [ ] Show user's role and max discount limit
- [ ] Add manager approval flow if needed

---

## ⚠️ Common Mistakes

❌ **Wrong:** Using terminal controls for discount validation
```jsx
const { validate } = useTerminalDiscount();  // ❌ Don't use this
```

✅ **Right:** Using role-based validation for discounts
```jsx
const userRole = user?.role?.name;
const maxDiscount = roleDiscountLimits[userRole];
if (amount > maxDiscount) alert('Exceeds limit');  // ✅ Correct
```

❌ **Wrong:** Hiding discount field without checking role
```jsx
{!allowDiscounts && <DiscountField />}  // ❌ Wrong logic
```

✅ **Right:** Hide if terminal doesn't allow
```jsx
{allowDiscounts && <DiscountField />}  // ✅ Correct
```

---

## 📞 Questions?

- **Terminal Features:** Check TerminalManagement collection in MongoDB
- **User Roles:** Check authentication system and user object structure
- **Discount Policies:** Define role-based limits in your business logic
