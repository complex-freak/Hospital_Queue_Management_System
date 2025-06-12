
import { Toaster } from "@/components/ui/toaster";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth-context";
import { LanguageProvider } from "@/contexts/language-context";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/NotFound";

const App = () => (
  <LanguageProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  </LanguageProvider>
);

export default App;
