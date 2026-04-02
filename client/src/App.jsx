import {
  BrowserRouter as Router,
  Routes as Routers,
  Route,
} from "react-router-dom";
import { Home, Login } from "./pages";
import { ProductFormProvider } from "./context/ProductFormContext";
import GlobalProductFormModal from "./components/shared/GlobalProductFormModal";
import { AnimatedCenteredToast } from "./components/shared/AnimatedCenteredToast.jsx";

function App() {
  return (
    <ProductFormProvider>
      <>
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
  );
}

export default App;


