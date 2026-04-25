import {
  HashRouter as Router,
  Routes as Routers,
  Route,
} from "react-router-dom";
import { Home, Login } from "./pages";
import { ProductFormProvider } from "./context/ProductFormContext";
import { GlobalKeyboardProvider } from "./context/GlobalKeyboardContext";
import { TerminalProvider } from "./context/TerminalContext";
import { StoreProvider } from "./context/StoreContext";
import GlobalProductFormModal from "./components/shared/GlobalProductFormModal";
import { AnimatedCenteredToast } from "./components/shared/AnimatedCenteredToast.jsx";
import KeyboardHelpModal from "./components/keyboard/KeyboardHelpModal";
import DefaultKeyboardShortcuts from "./components/keyboard/DefaultKeyboardShortcuts";
import KeyboardHelpListener from "./components/keyboard/KeyboardHelpListener";
import { useAuth } from "./context/AuthContext";

function App() {
  const { user, isLoading } = useAuth();

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5',
      }}>
        <div style={{
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '18px',
            color: '#666',
            marginBottom: '20px',
          }}>
            Loading...
          </div>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #ddd',
            borderTop: '4px solid #1890ff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto',
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <GlobalKeyboardProvider>
      <ProductFormProvider>
        <TerminalProvider>
          <StoreProvider>
            <>
              {/* ✅ Global Keyboard System */}
              <DefaultKeyboardShortcuts />
              <KeyboardHelpListener />
              <KeyboardHelpModal />

              <AnimatedCenteredToast />
              <Router>
                <Routers>
                  {/* ✅ Login route first - shows login if not authenticated */}
                  <Route path="/login" element={<Login />} />
                  {/* ✅ Protected routes - only show if user is authenticated */}
                  {user && <Route path="/*" element={<Home />} />}
                  {/* ✅ Redirect to login if not authenticated and trying to access protected routes */}
                  {!user && <Route path="/*" element={<Login />} />}
                </Routers>
              </Router>
              {/* ✅ Global Product Form Modal - Available everywhere */}
              <GlobalProductFormModal />
            </>
          </StoreProvider>
        </TerminalProvider>
      </ProductFormProvider>
    </GlobalKeyboardProvider>
  );
}

export default App;


