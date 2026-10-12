import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';
import { HostLandingPage } from './pages/HostLandingPage';
import { HostAuthPage } from './pages/HostAuthPage';
import { HostDashboard } from './pages/HostDashboard';
import { CreateListingPage } from './pages/CreateListingPage';
import { HostPinVerificationPage } from './pages/HostPinVerificationPage';
import { HostEarningsPage } from './pages/HostEarningsPage';
import { HostVerificationPage } from './pages/HostVerificationPage';
import { RegisterDriverPage } from './pages/RegisterDriverPage';
import { RegisterCarSpaPage } from './pages/RegisterCarSpaPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="text-center py-20 text-sm text-gray-500">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

export const AppContent: React.FC = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/auth';
  const { user } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors duration-200">
      {!isAuthPage && <Navbar />}
      <main className={`flex-grow ${user && !isAuthPage ? 'pb-24' : ''}`}>
        <Routes>
          <Route path="/" element={<HostLandingPage />} />
          <Route path="/auth" element={<HostAuthPage />} />
          <Route path="/register/driver" element={<RegisterDriverPage />} />
          <Route path="/partner/driver" element={<RegisterDriverPage />} />
          <Route path="/register/car-spa" element={<RegisterCarSpaPage />} />
          <Route path="/partner/car-spa" element={<RegisterCarSpaPage />} />
          <Route
            path="/dashboard"
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
      {!isAuthPage && user && <BottomNav />}
      {!isAuthPage && !user && <Footer />}
    </div>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
