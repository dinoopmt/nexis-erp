/**
 * EXAMPLE: How to Use Global Keyboard Shortcuts in Your Components
 * 
 * This file shows practical examples of registering keyboard shortcuts
 * in different components throughout the app.
 */

// ============================================
// EXAMPLE 1: Simple Keyboard Shortcut in a Component
// ============================================

import { useGlobalKeyboard } from '../hooks/useGlobalKeyboard';
import { useEffect } from 'react';

function ExampleComponent1() {
  const { registerShortcut } = useGlobalKeyboard();

  useEffect(() => {
    // Register: Ctrl+G to do something
    const unregister = registerShortcut(
      'Ctrl+G',
      () => {
        console.log('Ctrl+G was pressed!');
        // Your action here
      },
      {
        description: 'Do something with G',
        category: 'Custom',
      }
    );

    // Cleanup: unregister when component unmounts
    return unregister;
  }, [registerShortcut]);

  return <div>Example 1</div>;
}

// ============================================
// EXAMPLE 2: Multiple Shortcuts in One Component
// ============================================

function ExampleComponent2() {
  const { registerShortcut } = useGlobalKeyboard();

  useEffect(() => {
    const shortcuts = [];

    // Shortcut 1
    shortcuts.push(
      registerShortcut('Ctrl+A', () => {
        console.log('Select all');
      }, {
        description: 'Select all items',
        category: 'Selection',
      })
    );

    // Shortcut 2
    shortcuts.push(
      registerShortcut('Ctrl+D', () => {
        console.log('Delete selected');
      }, {
        description: 'Delete selected items',
        category: 'Selection',
      })
    );

    // Shortcut 3
    shortcuts.push(
      registerShortcut('Ctrl+Shift+A', () => {
        console.log('Deselect all');
      }, {
        description: 'Deselect all items',
        category: 'Selection',
      })
    );

    // Cleanup: unregister all shortcuts
    return () => {
      shortcuts.forEach(fn => fn?.());
    };
  }, [registerShortcut]);

  return <div>Example 2</div>;
}

// ============================================
// EXAMPLE 3: Product Page Shortcuts
// ============================================

function ProductPageExample() {
  const { registerShortcut } = useGlobalKeyboard();

  useEffect(() => {
    const shortcuts = [];

    // Ctrl+N: Create new (can be overridden here for specific behavior)
    shortcuts.push(
      registerShortcut('Ctrl+N', () => {
        alert('Create new product in Products page');
        // navigateTo('/products/new');
      }, {
        description: 'Create new product',
        category: 'Product',
      })
    );

    // Ctrl+R: Refresh products
    shortcuts.push(
      registerShortcut('Ctrl+R', (e) => {
        e.preventDefault(); // Prevent browser refresh
        console.log('Refreshing products...');
        // await fetchProducts();
      }, {
        description: 'Refresh products list',
        category: 'Product',
      })
    );

    // Ctrl+E: Export products
    shortcuts.push(
      registerShortcut('Ctrl+E', () => {
        console.log('Exporting products...');
        // exportProducts();
      }, {
        description: 'Export products',
        category: 'Product',
      })
    );

    return () => shortcuts.forEach(fn => fn?.());
  }, [registerShortcut]);

  return <div>Product Page</div>;
}

// ============================================
// EXAMPLE 4: Form Shortcuts
// ============================================

function FormExample() {
  const { registerShortcut } = useGlobalKeyboard();

  useEffect(() => {
    const shortcuts = [];

    // Alt+S: Submit form (global: false = works even when typing)
    shortcuts.push(
      registerShortcut('Alt+S', () => {
        console.log('Submitting form...');
        // document.querySelector('form').submit();
      }, {
        description: 'Submit form',
        category: 'Form',
        global: false, // Works even when typing in inputs
      })
    );

    // Alt+R: Reset form
    shortcuts.push(
      registerShortcut('Alt+R', () => {
        console.log('Resetting form...');
        // document.querySelector('form').reset();
      }, {
        description: 'Reset form',
        category: 'Form',
        global: false,
      })
    );

    // Ctrl+Shift+Delete: Clear all fields
    shortcuts.push(
      registerShortcut('Ctrl+Shift+Delete', () => {
        if (confirm('Clear all fields?')) {
          console.log('Clearing form...');
          // clearForm();
        }
      }, {
        description: 'Clear all form fields',
        category: 'Form',
        global: false,
      })
    );

    return () => shortcuts.forEach(fn => fn?.());
  }, [registerShortcut]);

  return <form>Form Example</form>;
}

// ============================================
// EXAMPLE 5: Search/Filter Shortcuts
// ============================================

function SearchPageExample() {
  const { registerShortcut } = useGlobalKeyboard();

  useEffect(() => {
    const shortcuts = [];

    // Ctrl+F: Focus search (might conflict, use custom event)
    shortcuts.push(
      registerShortcut('Ctrl+F', (e) => {
        e.preventDefault(); // Prevent browser find dialog
        const searchInput = document.querySelector('[data-role="search-input"]');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }, {
        description: 'Focus search input',
        category: 'Search',
      })
    );

    // // : Open advanced search
    shortcuts.push(
      registerShortcut('/', () => {
        console.log('Opening advanced search...');
        // openAdvancedSearch();
      }, {
        description: 'Open advanced search',
        category: 'Search',
        global: true, // Usually safe since / is rarely typed
      })
    );

    return () => shortcuts.forEach(fn => fn?.());
  }, [registerShortcut]);

  return <div>Search Page</div>;
}

// ============================================
// EXAMPLE 6: Using Custom Events
// ============================================

function ComponentListeningToEvents() {
  useEffect(() => {
    const handleOpenHelp = () => {
      alert('Help requested!');
    };

    // Listen for custom keyboard events
    window.addEventListener('openKeyboardHelp', handleOpenHelp);

    return () => {
      window.removeEventListener('openKeyboardHelp', handleOpenHelp);
    };
  }, []);

  return <div>Listening for events</div>;
}

// ============================================
// ADVANCED EXAMPLE: Context-Aware Shortcuts
// ============================================

function ContextAwareExample() {
  const { registerShortcut } = useGlobalKeyboard();
  const [isEditMode, setIsEditMode] = React.useState(false);

  useEffect(() => {
    const shortcuts = [];

    if (isEditMode) {
      // Only register these shortcuts when in edit mode
      shortcuts.push(
        registerShortcut('Escape', () => {
          console.log('Exiting edit mode');
          setIsEditMode(false);
        }, {
          description: 'Exit edit mode',
          category: 'Editing',
          global: false,
        })
      );

      shortcuts.push(
        registerShortcut('Ctrl+S', () => {
          console.log('Saving changes...');
          // saveChanges();
        }, {
          description: 'Save changes',
          category: 'Editing',
          global: false,
        })
      );
    }

    return () => shortcuts.forEach(fn => fn?.());
  }, [registerShortcut, isEditMode]);

  return (
    <div>
      Edit Mode: {isEditMode ? 'ON' : 'OFF'}
      <button onClick={() => setIsEditMode(!isEditMode)}>
        Toggle Edit
      </button>
    </div>
  );
}

// ============================================
// BEST PRACTICES CHECKLIST
// ============================================

/**
 * When creating keyboard shortcuts:
 * 
 * ✅ DO:
 * - Use standard shortcuts (Ctrl+N, Ctrl+S, Ctrl+F)
 * - Always provide description and category
 * - Unregister shortcuts in cleanup (return statement)
 * - Use global: false for destructive actions
 * - Test shortcuts don't conflict with others
 * - Document your shortcuts
 * 
 * ❌ DON'T:
 * - Use single keys like 'A' or '1' (conflicts with typing)
 * - Forget cleanup functions (memory leaks!)
 * - Hardcode global: false without reason
 * - Register too many shortcuts (overwhelming)
 * - Register shortcuts in render method
 * - Use reserved browser shortcuts without e.preventDefault()
 * - Forget error handling in handlers
 */

export {
  ExampleComponent1,
  ExampleComponent2,
  ProductPageExample,
  FormExample,
  SearchPageExample,
  ComponentListeningToEvents,
  ContextAwareExample,
};
