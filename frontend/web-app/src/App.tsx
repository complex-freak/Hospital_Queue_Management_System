import { Toaster } from "@/components/ui/toaster";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/use-auth-context";
import { LanguageProvider } from "@/contexts/language-context";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import RoleBasedRoute from "@/components/auth/RoleBasedRoute";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import NotFound from "@/pages/NotFound";
import LoadingScreen from "@/components/ui/loading-screen";

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

// Protected route component that requires authentication
const ProtectedRouteComponent = ({ requiredRoles = [] }: { requiredRoles?: string[] }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Show loading screen while authentication state is being determined
  if (isLoading) {
    return <LoadingScreen />;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If roles are specified and user doesn't have required role, redirect to appropriate dashboard
  if (requiredRoles.length > 0 && user?.role && !requiredRoles.includes(user.role)) {
    if (user.role === 'doctor') {
      return <Navigate to="/doctor/dashboard" replace />;
    } else if (user.role === 'receptionist' || user.role === 'staff') {
      return <Navigate to="/receptionist/dashboard" replace />;
    } else if (user.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // If authenticated and has required role, render the routes
  return <Outlet />;
};

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
          <Route element={<ProtectedRouteComponent requiredRoles={['doctor']} />}>
            {/* Doctor routes */}
            <Route 
              path="/doctor/*" 
              element={
                <RoleBasedRoute allowedRoles={['doctor']}>
                  <DoctorDashboard />
                </RoleBasedRoute>
              } 
            />
            
            {/* Receptionist routes */}
            <Route 
              path="/receptionist/*" 
              element={
                <RoleBasedRoute allowedRoles={['receptionist', 'staff']}>
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
              path="/admin/*" 
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
