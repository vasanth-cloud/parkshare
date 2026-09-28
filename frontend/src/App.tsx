import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

import { LandingPage } from './pages/LandingPage';
import { DriverAuthPage } from './pages/DriverAuthPage';
import { CaptainAuthPage } from './pages/CaptainAuthPage';
import { SearchPage } from './pages/SearchPage';
import { ListingDetailPage } from './pages/ListingDetailPage';
import { ParkerDashboard } from './pages/ParkerDashboard';
import { CaptainDashboard } from './pages/CaptainDashboard';
import { CreateListingPage } from './pages/CreateListingPage';
import { AdminDashboard } from './pages/AdminDashboard';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Landing & Dual App Selector */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/welcome" element={<LandingPage />} />

              {/* Dedicated Rapido-Style Separated App Entryways */}
              <Route path="/driver/auth" element={<DriverAuthPage />} />
              <Route path="/captain/auth" element={<CaptainAuthPage />} />

              {/* Backwards Compatible Auth Redirects */}
              <Route path="/login" element={<Navigate to="/driver/auth" replace />} />
              <Route path="/register" element={<Navigate to="/driver/auth?mode=signup" replace />} />

              {/* Driver App Routes */}
              <Route path="/search" element={<SearchPage />} />
              <Route path="/listings/:id" element={<ListingDetailPage />} />
              <Route path="/dashboard" element={<ParkerDashboard />} />
              <Route path="/driver/dashboard" element={<ParkerDashboard />} />

              {/* Rapido Captain (Host App) Routes */}
              <Route path="/captain" element={<CaptainDashboard />} />
              <Route path="/captain/dashboard" element={<CaptainDashboard />} />
              <Route path="/captain/spaces/new" element={<CreateListingPage />} />
              <Route path="/host/dashboard" element={<Navigate to="/captain" replace />} />
              <Route path="/host/listings/new" element={<CreateListingPage />} />

              {/* Admin Control Center */}
              <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
