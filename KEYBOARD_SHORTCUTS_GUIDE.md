# 🎹 Global Keyboard Control System - Complete Guide

## Overview
The app now has a comprehensive global keyboard shortcut system that works everywhere, accessible via `Ctrl+?` or `?` key.

---

## 📋 Default Shortcuts

### Product Management
| Shortcut | Action | Category |
|----------|--------|----------|
| `Ctrl+N` | Create new product | Product |
| `Ctrl+S` | Save (in active form) | Product |

### Navigation
| Shortcut | Action | Category |
|----------|--------|----------|
| `Ctrl+Home` | Go to home / dashboard | Navigation |
| `Alt+1` | Navigate to Products | Navigation |
| `Alt+2` | Navigate to GRN | Navigation |
| `Alt+3` | Navigate to Sales | Navigation |
| `Alt+4` | Navigate to Reports | Navigation |

### Search & Filter
| Shortcut | Action | Category |
|----------|--------|----------|
| `Ctrl+F` | Open search/filter | Search |
| `Ctrl+L` | Focus search bar | Search |
| `Ctrl+K` | Open command palette / quick search | Navigation |

### General
| Shortcut | Action | Category |
|----------|--------|----------|
| `?` or `Ctrl+?` | Show keyboard help | General |
| `Ctrl+E` | Toggle expand/collapse mode | General |
| `Ctrl+,` | Open settings | General |

### Form & Dropdown Navigation
| Shortcut | Action | Category |
|----------|--------|----------|
| `↓` Arrow Down | Next dropdown option | Form |
| `↑` Arrow Up | Previous dropdown option | Form |
| `Enter` | Select highlighted dropdown option | Form |
| `Escape` | Close dropdown/modal | Form |

---

## 🔧 How to Register Custom Shortcuts

### Basic Usage in Components

```jsx
import { useGlobalKeyboard } from '../hooks/useGlobalKeyboard';
import { useEffect } from 'react';

function MyComponent() {
  const { registerShortcut } = useGlobalKeyboard();

  useEffect(() => {
    // Register a shortcut
    const unregister = registerShortcut(
      'Ctrl+G',  // Shortcut key combination
      () => {
        console.log('Shortcut triggered!');
        // Your action here
      },
      {
        description: 'My custom action',
        category: 'Custom',
        global: true,  // true = skip if user is typing, false = always active
      }
    );

    // Cleanup - unregister when component unmounts
    return unregister;
  }, [registerShortcut]);

  return <div>My Component</div>;
}
```

### Advanced: Custom Shortcuts for Product Page

```jsx
import { useGlobalKeyboard } from '../hooks/useGlobalKeyboard';
import { useEffect } from 'react';

function ProductPage() {
  const { registerShortcut } = useGlobalKeyboard();

  useEffect(() => {
    const shortcuts = [];

    // Ctrl+A: Select all products
    shortcuts.push(
      registerShortcut('Ctrl+A', () => {
        // Your select all logic
      }, {
        description: 'Select all products',
        category: 'Product',
      })
    );

    // Ctrl+D: Delete selected
    shortcuts.push(
      registerShortcut('Ctrl+D', () => {
        // Your delete logic
      }, {
        description: 'Delete selected products',
        category: 'Product',
        global: false,  // Always active even if typing
      })
    );

    // Cleanup
    return () => shortcuts.forEach(fn => fn?.());
  }, [registerShortcut]);

  return <div>Product Page</div>;
}
```

---

## 📝 Shortcut Format

### Supported Keys
- **Modifiers**: `Ctrl`, `Shift`, `Alt`, `Meta` (Windows key / Cmd)
- **Letters**: `A-Z`, `a-z`
- **Numbers**: `0-9`
- **Special**: `/`, `?`, `,`, `.`, etc.
- **Function Keys**: `F1-F12`

### Shortcut Examples
```javascript
'Ctrl+N'           // Simple ctrl + key
'Ctrl+Shift+N'     // Multiple modifiers
'Ctrl+Alt+S'       // Three modifiers
'Shift+F5'         // Shift + function key
'?'                // Single key (global only)
'Escape'           // Single special key
'/'                // Single symbol
```

---

## 🎯 Shortcut Options

```javascript
registerShortcut(
  'Ctrl+X',
  () => { /* handler */ },
  {
    // Description shown in help modal
    description: 'Clear selection',
    
    // Category for organizing in help modal
    category: 'Selection',  // 'General', 'Product', 'Search', 'Navigation', 'Form', etc.
    
    // If true (default): Skip this shortcut when user is typing in input/textarea
    // If false: Always execute even if user is typing
    global: true,
    
    // Optional: Unique ID for later unregistering
    id: 'my-custom-shortcut-id',
  }
);
```

---

## 🌐 Good Shortcut Conventions

### Standard Shortcuts (Common Apps)
- `Ctrl+N` - New item
- `Ctrl+S` - Save
- `Ctrl+O` - Open
- `Ctrl+W` - Close window
- `Ctrl+Q` - Quit app
- `Ctrl+Z` - Undo
- `Ctrl+Y` - Redo
- `Ctrl+F` - Find/Search
- `Ctrl+H` - History
- `Ctrl+A` - Select all
- `Ctrl+X` - Cut
- `Ctrl+C` - Copy
- `Ctrl+V` - Paste
- `Escape` - Cancel/Exit
- `?` - Help

### Navigation Shortcuts
- `Alt+1`, `Alt+2`, etc. - Navigate to different sections
- `Ctrl+K` - Command palette / quick search
- `Ctrl+Home` - Go to home

### Form Shortcuts
- `Tab` - Move to next field (browser default)
- `Shift+Tab` - Move to previous field (browser default)
- `Enter` - Submit form
- `Escape` - Cancel/Close

---

## 🛑 Preventing Conflicts

### Form Inputs
By default, **global shortcuts are disabled** when user is typing in:
- `<input>` elements
- `<textarea>` elements
- Elements with `contenteditable="true"`

**Example**: If user is in a search input field and presses `Ctrl+N`, it won't trigger "New Product" because they might want to type normal characters.

### Override: Local vs Global
```javascript
// This will NOT work when user is typing in inputs
registerShortcut('Ctrl+N', myHandler, { global: true });

// This WILL work even when user is typing
registerShortcut('Ctrl+N', myHandler, { global: false });
```

---

## 🔍 Debugging Keyboard Shortcuts

### Check Registered Shortcuts
```javascript
// In browser console
// Import the context to access getAllShortcuts
const { getAllShortcuts } = useGlobalKeyboard();
console.log(getAllShortcuts());
```

### Test Shortcut Format
The system automatically normalizes: `Ctrl+A`, `A+Ctrl`, `ctrl+a` all become `a+ctrl` internally.

---

## 📂 File Structure

```
/client/src/
├── context/
│   └── GlobalKeyboardContext.jsx          # Main context
├── hooks/
│   └── useGlobalKeyboard.js               # Custom hook
├── components/
│   └── keyboard/
│       ├── KeyboardHelpModal.jsx          # Help dialog
│       ├── DefaultKeyboardShortcuts.jsx   # Default shortcuts
│       └── KeyboardHelpListener.jsx       # Event listener
└── App.jsx                                 # Updated with providers
```

---

## 🎨 Customizing the Help Modal

The keyboard help modal shows:
- All registered shortcuts grouped by category
- Formatted shortcut keys with proper styling
- Tips for using keyboard shortcuts
- Empty state if no shortcuts registered

To customize the modal appearance, edit:
- `/components/keyboard/KeyboardHelpModal.jsx`

---

## 🚀 Best Practices

1. **Keep shortcuts discoverable** - Use standard shortcuts when possible
2. **Document your shortcuts** - Always provide description and category
3. **Avoid conflicts** - Check existing shortcuts before creating new ones
4. **Clean up properly** - Unregister shortcuts when components unmount
5. **Use global=true for app-wide shortcuts** - Prevents accidental triggers while typing
6. **Use global=false for destructive actions** - Make sure user wants to execute
7. **Group related shortcuts** - Use categories to organize in help modal

---

## 📱 Future Enhancements

Possible additions:
- Record/playback macros
- Customizable shortcuts (user preferences)
- Shortcut search in help modal
- Platform-specific shortcuts (Mac vs Windows)
- Conflict detection and warnings
- Keyboard shortcut profiles (different sets for different pages)
- Mouse+Keyboard combinations

---

## ❓ FAQ

**Q: Can I use single keys like 'A' or '1'?**  
A: Yes, but they'll override normal typing. Use only for special scenarios. Better to use modifiers like `Ctrl+A`.

**Q: What if I press a shortcut while typing in an input?**  
A: If `global: true` (default), it won't trigger. If `global: false`, it will.

**Q: Can I unregister a shortcut later?**  
A: Yes! `registerShortcut` returns an unregister function. Call it to remove the shortcut.

**Q: How do I see all shortcuts?**  
A: Press `?` or `Ctrl+?` to open the keyboard help modal. It shows all registered shortcuts.

**Q: Does this work on mobile?**  
A: Limited support. Most mobile devices don't have keyboard events for shortcuts.

---

## 🔗 Related Documentation
- [BasicInfoTab Keyboard Navigation](./keyboard-navigation-dropdowns.md) - Keyboard support in dropdowns
- [Global Product Modal](./global-product-modal.md) - Using Ctrl+N to create products
