import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nProvider } from "./i18n/I18nContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import App from "./App";
import ToolPage from "./pages/ToolPage";
import StaticPage from "./pages/StaticPage";
import StatusPage from "./pages/StatusPage";
import ContactPage from "./pages/ContactPage";
import PricingPage from "./pages/PricingPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import CheckoutPage from "./pages/CheckoutPage";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/tool/:toolId" element={<ToolPage />} />
            <Route path="/about" element={<StaticPage pageId="about" />} />
            <Route path="/security" element={<StaticPage pageId="security" />} />
            <Route path="/blog" element={<StaticPage pageId="blog" />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/checkout/:orderId" element={<CheckoutPage />} />
            <Route path="/privacy" element={<StaticPage pageId="privacy" />} />
            <Route path="/terms" element={<StaticPage pageId="terms" />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>
);
