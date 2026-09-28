import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CustomerLandingPage } from './pages/CustomerLandingPage';
import { CustomerAuthPage } from './pages/CustomerAuthPage';
import { CustomerSearchPage } from './pages/CustomerSearchPage';
import { CustomerListingDetail } from './pages/CustomerListingDetail';
import { CustomerBookingsPage } from './pages/CustomerBookingsPage';
import { CustomerVehiclesPage } from './pages/CustomerVehiclesPage';

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
          <Route path="/" element={<CustomerLandingPage />} />
          <Route path="/auth" element={<CustomerAuthPage />} />
          <Route path="/search" element={<CustomerSearchPage />} />
          <Route path="/listing/:id" element={<CustomerListingDetail />} />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <CustomerBookingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vehicles"
            element={
              <ProtectedRoute>
                <CustomerVehiclesPage />
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
