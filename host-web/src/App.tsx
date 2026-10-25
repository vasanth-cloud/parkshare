import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';
import { HostServicesHomePage } from './pages/HostServicesHomePage';
import { HostLandingPage } from './pages/HostLandingPage';
import { HostAuthPage } from './pages/HostAuthPage';
import { HostDashboard } from './pages/HostDashboard';
import { CreateListingPage } from './pages/CreateListingPage';
import { HostPinVerificationPage } from './pages/HostPinVerificationPage';
import { HostEarningsPage } from './pages/HostEarningsPage';
import { HostVerificationPage } from './pages/HostVerificationPage';
import { RegisterDriverPage } from './pages/RegisterDriverPage';
import { DriverDashboardPage } from './pages/DriverDashboardPage';
import { RegisterCarSpaPage } from './pages/RegisterCarSpaPage';
import { RegisterRentalVehiclePage } from './pages/RegisterRentalVehiclePage';
import { RentalDashboardPage } from './pages/RentalDashboardPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="text-center py-20 text-sm text-gray-500">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

export const AppContent: React.FC = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/auth';
  const isHomePage = location.pathname === '/' || location.pathname === '/services';
  const isRentalDashboard = location.pathname === '/rental' || location.pathname === '/rental-dashboard' || location.pathname === '/partner/rental/dashboard';
  const isParkingHostPage = [
    '/dashboard',
    '/parking',
    '/verification',
    '/kyc',
    '/create-listing',
    '/pin-verify',
    '/earnings'
  ].includes(location.pathname);
  const showNav = !isAuthPage && !isHomePage && !isRentalDashboard;
  const { user } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors duration-200">
      {showNav && <Navbar />}
      <main className={`flex-grow ${user && showNav && isParkingHostPage ? 'pb-24' : 'pb-8'}`}>
        <Routes>
          <Route path="/" element={<HostServicesHomePage />} />
          <Route path="/services" element={<HostServicesHomePage />} />
          <Route path="/landing" element={<HostLandingPage />} />
          <Route path="/auth" element={<HostAuthPage />} />
          <Route path="/register/driver" element={<RegisterDriverPage />} />
          <Route path="/partner/driver" element={<RegisterDriverPage />} />
          <Route
            path="/driver"
            element={
              <ProtectedRoute>
                <DriverDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="/register/car-spa" element={<RegisterCarSpaPage />} />
          <Route path="/partner/car-spa" element={<RegisterCarSpaPage />} />
          <Route path="/register/rental" element={<RegisterRentalVehiclePage />} />
          <Route path="/partner/rental" element={<RegisterRentalVehiclePage />} />
          <Route path="/register/fleet" element={<RegisterRentalVehiclePage />} />
          <Route
            path="/rental"
            element={
              <ProtectedRoute>
                <RentalDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rental-dashboard"
            element={
              <ProtectedRoute>
                <RentalDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/partner/rental/dashboard"
            element={
              <ProtectedRoute>
                <RentalDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <HostDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parking"
            element={
              <ProtectedRoute>
                <HostDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/verification"
            element={
              <ProtectedRoute>
                <HostVerificationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kyc"
            element={
              <ProtectedRoute>
                <HostVerificationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-listing"
            element={
              <ProtectedRoute>
                <CreateListingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pin-verify"
            element={
              <ProtectedRoute>
                <HostPinVerificationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/earnings"
            element={
              <ProtectedRoute>
                <HostEarningsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {showNav && user && isParkingHostPage && <BottomNav />}
      {showNav && !user && <Footer />}
    </div>
  );
};

import { ErrorBoundary } from './components/ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
