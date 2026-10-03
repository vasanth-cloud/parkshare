import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HostLandingPage } from './pages/HostLandingPage';
import { HostAuthPage } from './pages/HostAuthPage';
import { HostDashboard } from './pages/HostDashboard';
import { CreateListingPage } from './pages/CreateListingPage';
import { HostPinVerificationPage } from './pages/HostPinVerificationPage';
import { HostEarningsPage } from './pages/HostEarningsPage';
import { HostVerificationPage } from './pages/HostVerificationPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="text-center py-20 text-sm text-gray-500">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

export const AppContent: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HostLandingPage />} />
          <Route path="/auth" element={<HostAuthPage />} />
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
