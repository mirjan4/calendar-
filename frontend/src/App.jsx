import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';

// Public Pages
import HomePage from './pages/public/HomePage';
import RegistrationPage from './pages/public/RegistrationPage';
import ConfirmationPage from './pages/public/ConfirmationPage';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import DashboardPage from './pages/admin/DashboardPage';
import StudentManagementPage from './pages/admin/StudentManagementPage';
import StudentImportPage from './pages/admin/StudentImportPage';
import RegistrationManagementPage from './pages/admin/RegistrationManagementPage';
import LocationManagementPage from './pages/admin/LocationManagementPage';
import PlaceManagementPage from './pages/admin/PlaceManagementPage';
import UnitAssignmentPage from './pages/admin/UnitAssignmentPage';
import ReportsPage from './pages/admin/ReportsPage';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-sm">
        Checking administrative authentication...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public Registration Routes */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="register" element={<RegistrationPage />} />
            <Route path="confirmation" element={<ConfirmationPage />} />
          </Route>

          {/* Admin Authentication */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="students" element={<StudentManagementPage />} />
            <Route path="import" element={<Navigate to="/admin/students?tab=import" replace />} />
            <Route path="registrations" element={<RegistrationManagementPage />} />
            <Route path="locations" element={<Navigate to="/admin/places?view=hierarchy" replace />} />
            <Route path="places" element={<PlaceManagementPage />} />
            <Route path="unit-assignments" element={<Navigate to="/admin/places?view=places" replace />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
