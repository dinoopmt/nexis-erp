import {
  BrowserRouter as Router,
  Routes as Routers,
  Route,
} from "react-router-dom";
import { Home, Login } from "./pages";
import { ProductFormProvider } from "./context/ProductFormContext";
import { GlobalKeyboardProvider } from "./context/GlobalKeyboardContext";
import GlobalProductFormModal from "./components/shared/GlobalProductFormModal";
import { AnimatedCenteredToast } from "./components/shared/AnimatedCenteredToast.jsx";
import KeyboardHelpModal from "./components/keyboard/KeyboardHelpModal";
import DefaultKeyboardShortcuts from "./components/keyboard/DefaultKeyboardShortcuts";
import KeyboardHelpListener from "./components/keyboard/KeyboardHelpListener";

function App() {
  return (
    <GlobalKeyboardProvider>
      <ProductFormProvider>
        <>
          {/* ✅ Global Keyboard System */}
          <DefaultKeyboardShortcuts />
          <KeyboardHelpListener />
          <KeyboardHelpModal />

          <AnimatedCenteredToast />
          <Router>
            <Routers>
              <Route path="/*" element={<Home />} />
              <Route path="/login" element={<Login />} />
            </Routers>
          </Router>
          {/* ✅ Global Product Form Modal - Available everywhere */}
          <GlobalProductFormModal />
        </>
      </ProductFormProvider>
    </GlobalKeyboardProvider>
  );
}

export default App;


