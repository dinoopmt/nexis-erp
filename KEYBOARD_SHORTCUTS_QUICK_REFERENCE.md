# 🎹 Global Keyboard Shortcuts - Quick Reference

## Show Help
| Key | Action |
|-----|--------|
| `?` | Show keyboard help |
| `Ctrl+?` | Show keyboard help |

## Products
| Key | Action |
|-----|--------|
| `Ctrl+N` | **New Product** |
| `Ctrl+S` | **Save** |

## Navigation
| Key | Action |
|-----|--------|
| `Ctrl+Home` | Go to Dashboard |
| `Alt+1` | **➜ Products** |
| `Alt+2` | **➜ GRN** |
| `Alt+3` | **➜ Sales** |
| `Alt+4` | **➜ Reports** |

## Search
| Key | Action |
|-----|--------|
| `Ctrl+F` | Open Search |
| `Ctrl+L` | Focus Search Bar |
| `Ctrl+K` | Command Palette |

## General
| Key | Action |
|-----|--------|
| `Ctrl+E` | Toggle Expand Mode |
| `Ctrl+,` | Open Settings |

## Form & Dropdowns
| Key | Action |
|-----|--------|
| `↓` | Next option |
| `↑` | Previous option |
| `Enter` | Select option |
| `Escape` | Close dropdown |

---

## 💡 Pro Tips

- **? always available** - Press ? anywhere to see all shortcuts
- **Keyboard + Mouse mix** - Use arrow keys to navigate, mouse to confirm
- **Smart detection** - Shortcuts disabled when typing in inputs
- **Global everywhere** - Same shortcuts work on every page

## 🔧 For Developers

Add new shortcuts to your component:

```jsx
import { useGlobalKeyboard } from '../hooks/useGlobalKeyboard';

function MyComponent() {
  const { registerShortcut } = useGlobalKeyboard();

  useEffect(() => {
    const unregister = registerShortcut(
      'Ctrl+X',        // Shortcut
      () => { },       // Action
      {
        description: 'Do something',  // Show in help
        category: 'Custom',            // Group in help
      }
    );
    
    return unregister; // Cleanup
  }, [registerShortcut]);
}
```

See `KEYBOARD_EXAMPLES.jsx` for more examples.

---

## 📚 Full Documentation
See `KEYBOARD_SHORTCUTS_GUIDE.md` for complete documentation.
