# Global Barcode Print Modal Setup Guide

## Overview
The global barcode print modal allows any component in your application to trigger barcode printing without passing props through multiple levels. It uses React Context API for state management.

## Files Created

1. **`client/src/context/BarcodePrintContext.jsx`**
   - Context provider for managing barcode print modal state
   - Provides: `isOpen`, `printData`, `openBarcodePrint()`, `closeBarcodePrint()`

2. **`client/src/hooks/useBarcodePrint.js`**
   - Custom hook to access the barcode print context from any component

3. **`client/src/components/modals/GlobalBarcodePrintModal.jsx`**
   - Global barcode print modal component
   - Renders everything: preview, settings, printer selection, etc.

---

## Setup Instructions

### Step 1: Wrap Your App with BarcodePrintProvider

In your main App.jsx or index.jsx:

```jsx
import { BarcodePrintProvider } from "./context/BarcodePrintContext";
import GlobalBarcodePrintModal from "./components/modals/GlobalBarcodePrintModal";

function App() {
  return (
    <BarcodePrintProvider>
      <YourApp>
        {/* Your app components */}
      </YourApp>
      
      {/* Place the global modal at app root */}
      <GlobalBarcodePrintModal />
    </BarcodePrintProvider>
  );
}

export default App;
```

### Step 2: Use in Any Component

From any component, import and use the hook:

```jsx
import { useBarcodePrint } from "../hooks/useBarcodePrint";

function MyComponent() {
  const { openBarcodePrint } = useBarcodePrint();

  const handlePrintBarcode = () => {
    openBarcodePrint({
      barcode: "123456789",
      productName: "My Product",
      pricingLines: [
        { 
          barcode: "123456789", 
          unit: "unit_id_1",
          price: 99.99 
        }
      ],
      units: [
        { 
          _id: "unit_id_1", 
          unitName: "Box", 
          unitSymbol: "BOX" 
        }
      ]
    });
  };

  return (
    <button onClick={handlePrintBarcode}>
      Print Barcode
    </button>
  );
}
```

---

## API Reference

### openBarcodePrint(data)

Opens the barcode print modal with the provided data.

**Parameters:**
- `data` (Object)
  - `barcode` (String): Default barcode value
  - `productName` (String): Name of the product
  - `pricingLines` (Array): Array of pricing lines with variants
    - `barcode` (String): Barcode for this variant
    - `unit` (String): Unit ID
    - `price` (Number): Price for this variant
  - `units` (Array): Array of unit objects
    - `_id` (String): Unique identifier
    - `unitName` (String): Display name (e.g., "Box")
    - `unitSymbol` (String): Symbol (e.g., "BOX")

**Example:**
```jsx
const { openBarcodePrint } = useBarcodePrint();

openBarcodePrint({
  barcode: "8901234567890",
  productName: "Premium Coffee",
  pricingLines: [
    { 
      barcode: "8901234567890", 
      unit: "unit_1",
      price: 150.00 
    },
    { 
      barcode: "8901234567907", 
      unit: "unit_2",
      price: 450.00 
    }
  ],
  units: [
    { _id: "unit_1", unitName: "Pack", unitSymbol: "PCK" },
    { _id: "unit_2", unitName: "Carton", unitSymbol: "CTN" }
  ]
});
```

### closeBarcodePrint()

Closes the barcode print modal.

**Example:**
```jsx
const { closeBarcodePrint } = useBarcodePrint();

closeBarcodePrint();
```

---

## Component Features

✅ **Multiple Format Options:**
- Price Tag Label
- Shelf Edge Label
- Barcode Only
- Small Sticker

✅ **Customizable Printing:**
- Print quantity (1-1000)
- Label sizes (small, standard, large, XL)
- Layout configuration (columns × rows)
- Content options (show/hide price, product name)

✅ **Printer Selection:**
- Default Printer
- Thermal printers (Zebra ZD410)
- Label printers (Brother QL-710W)
- Laser printers (HP LaserJet Pro)
- Multifunction devices (Canon)

✅ **Live Preview:**
- Format-specific preview rendering
- Real-time settings updates

---

## Migration: Replace Old BarcodePrintModal Usage

Old way (local component prop):
```jsx
<BarcodePrintModal
  isOpen={isOpen}
  onClose={handleClose}
  barcode={barcode}
  productName={name}
  pricingLines={lines}
  units={units}
/>
```

New way (global context):
```jsx
// 1. Get the hook
const { openBarcodePrint } = useBarcodePrint();

// 2. Open modal from anywhere
openBarcodePrint({
  barcode,
  productName: name,
  pricingLines: lines,
  units
});

// 3. Modal is globally available - no need to render locally
```

---

## Benefits

✅ **No Prop Drilling** - Access from any component without passing through parent components
✅ **Single Instance** - One modal instance for the entire app
✅ **Clean Code** - Simpler component code, less boilerplate
✅ **Global State** - Consistent barcode printing experience across app
✅ **Easy to Extend** - Add more features to context and modal as needed

---

## Next Steps

1. ✅ Update App.jsx/index.jsx with BarcodePrintProvider wrapper
2. ✅ Place GlobalBarcodePrintModal at app root level
3. ✅ Replace all local BarcodePrintModal imports with useBarcodePrint hook
4. ✅ Test barcode printing from different components
5. ✅ (Optional) Delete old local BarcodePrintModal component usage

