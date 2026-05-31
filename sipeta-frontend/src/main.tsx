import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "leaflet/dist/leaflet.css";
import { AuthProvider } from "./context/AuthContext"; 
import { Toaster } from "sonner";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider> 
        <App />
        <Toaster position="bottom-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);