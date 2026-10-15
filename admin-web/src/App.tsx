import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AdminAuthPage } from './pages/AdminAuthPage';
import { AdminServicesHomePage } from './pages/AdminServicesHomePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminListingModeration } from './pages/AdminListingModeration';
import { AdminUserDirectory } from './pages/AdminUserDirectory';
import { AdminDisputesPage } from './pages/AdminDisputesPage';
import { AdminDriversPage } from './pages/AdminDriversPage';
import { AdminCarSpaPage } from './pages/AdminCarSpaPage';
import { AdminRentalsPage } from './pages/AdminRentalsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="text-center py-20 text-sm text-slate-500">Loading...</div>;
  if (!user || !user.roles.includes('ADMIN')) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

export const AppContent: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/auth" element={<AdminAuthPage />} />
          
          {/* Services Home Page - Displays ONLY the 3 services initially */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminServicesHomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/services"
            element={
              <ProtectedRoute>
                <AdminServicesHomePage />
              </ProtectedRoute>
            }
          />

          {/* Service 1: Parking Space Moderation & Approvals */}
          <Route
            path="/approvals"
            element={
              <ProtectedRoute>
                <AdminListingModeration />
              </ProtectedRoute>
            }
          />

          {/* Service 2: Acting Drivers Fleet Operations */}
          <Route
            path="/drivers"
            element={
              <ProtectedRoute>
                <AdminDriversPage />
              </ProtectedRoute>
            }
          />

          {/* Service 3: Car Spa Detailing & Workshops */}
          <Route
            path="/car-spas"
            element={
              <ProtectedRoute>
                <AdminCarSpaPage />
              </ProtectedRoute>
            }
          />

          {/* Service 4: Self-Drive Fleet & Vehicle Approvals */}
          <Route
            path="/rentals"
            element={
              <ProtectedRoute>
                <AdminRentalsPage />
              </ProtectedRoute>
            }
          />

          {/* Platform Financials & KPIs Overview */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Disputes & Moderation */}
          <Route
            path="/disputes"
            element={
              <ProtectedRoute>
                <AdminDisputesPage />
              </ProtectedRoute>
            }
          />

          {/* User Directory */}
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <AdminUserDirectory />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
