import { Toaster } from "@/components/ui/toaster";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/use-auth-context";
import { LanguageProvider } from "@/contexts/language-context";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import RoleBasedRoute from "@/components/auth/RoleBasedRoute";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import NotFound from "@/pages/NotFound";

// Doctor features
import DoctorDashboard from "@/features/doctor/pages/Dashboard";

// Receptionist features
import ReceptionistDashboard from "@/features/receptionist/pages/Dashboard";
import PatientRegistration from "@/features/receptionist/pages/PatientRegistration";

// Admin features
import AdminDashboard from "@/features/admin/pages/Dashboard";
import UserManagement from "@/features/admin/pages/UserManagement";
import Analytics from "@/features/admin/pages/Analytics";
import QueueConfiguration from "@/features/admin/pages/QueueConfiguration";
import SystemSettings from "@/features/admin/pages/SystemSettings";
import ReportingTools from "@/features/admin/pages/ReportingTools";

// Shared features
import Profile from "@/pages/Profile";

const App = () => (
  <LanguageProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            {/* Doctor routes */}
            <Route 
              path="/doctor/dashboard" 
              element={
                <RoleBasedRoute allowedRoles={['doctor']}>
                  <DoctorDashboard />
                </RoleBasedRoute>
              } 
            />
            
            {/* Receptionist routes */}
            <Route 
              path="/receptionist/dashboard" 
              element={
                <RoleBasedRoute allowedRoles={['receptionist']}>
                  <ReceptionistDashboard />
                </RoleBasedRoute>
              } 
            />
            <Route 
              path="/register-patient" 
              element={
                <RoleBasedRoute allowedRoles={['receptionist']}>
                  <PatientRegistration />
                </RoleBasedRoute>
              } 
            />
            
            {/* Admin routes */}
            <Route 
              path="/admin/dashboard" 
              element={
                <RoleBasedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </RoleBasedRoute>
              } 
            />
            <Route 
              path="/admin/users" 
              element={
                <RoleBasedRoute allowedRoles={['admin']}>
                  <UserManagement />
                </RoleBasedRoute>
              } 
            />
            <Route 
              path="/admin/analytics" 
              element={
                <RoleBasedRoute allowedRoles={['admin']}>
                  <Analytics />
                </RoleBasedRoute>
              } 
            />
            <Route 
              path="/admin/queue-configuration" 
              element={
                <RoleBasedRoute allowedRoles={['admin']}>
                  <QueueConfiguration />
                </RoleBasedRoute>
              } 
            />
            <Route 
              path="/admin/system-settings" 
              element={
                <RoleBasedRoute allowedRoles={['admin']}>
                  <SystemSettings />
                </RoleBasedRoute>
              } 
            />
            <Route 
              path="/admin/reporting" 
              element={
                <RoleBasedRoute allowedRoles={['admin']}>
                  <ReportingTools />
                </RoleBasedRoute>
              } 
            />
            
            {/* Shared routes */}
            <Route path="/profile" element={<Profile />} />
            
            {/* Legacy route - redirect to role-specific dashboard */}
            <Route 
              path="/dashboard" 
              element={<DashboardRouter />} 
            />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  </LanguageProvider>
);

// Helper component to redirect to the appropriate dashboard based on user role
const DashboardRouter = () => {
  const { user } = useAuth();
  
  if (user?.role === 'doctor') {
    return <Navigate to="/doctor/dashboard" replace />;
  }
  
  if (user?.role === 'receptionist') {
    return <Navigate to="/receptionist/dashboard" replace />;
  }
  
  if (user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  // Default fallback
  return <Navigate to="/login" replace />;
};

export default App;
