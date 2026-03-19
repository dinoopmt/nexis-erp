import {
  BrowserRouter as Router,
  Routes as Routers,
  Route,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Home, Login } from "./pages";
import { ProductFormProvider } from "./context/ProductFormContext";
import GlobalProductFormModal from "./components/shared/GlobalProductFormModal";

function App() {
  return (
    <ProductFormProvider>
      <>
        <Toaster position="top-center" reverseOrder={false} />
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


