import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';
import { CustomerServicesHomePage } from './pages/CustomerServicesHomePage';
import { CustomerLandingPage } from './pages/CustomerLandingPage';
import { CustomerAuthPage } from './pages/CustomerAuthPage';
import { CustomerSearchPage } from './pages/CustomerSearchPage';
import { CustomerListingDetail } from './pages/CustomerListingDetail';
import { CustomerBookingsPage } from './pages/CustomerBookingsPage';
import { CustomerVehiclesPage } from './pages/CustomerVehiclesPage';
import { CustomerProfilePage } from './pages/CustomerProfilePage';
import { ActingDriversPage } from './pages/ActingDriversPage';
import { CarSpaPage } from './pages/CarSpaPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="text-center py-20 text-sm text-gray-500">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

import { ParkBotModal } from './components/ParkBotModal';
import { Bot, Sparkles } from 'lucide-react';

export const AppContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const isChatOpenRef = React.useRef(isChatOpen);
  isChatOpenRef.current = isChatOpen;

  useEffect(() => {
    let listenerHandle: any = null;
    try {
      CapApp.addListener('backButton', () => {
        if (isChatOpenRef.current) {
          setIsChatOpen(false);
        } else if (location.pathname === '/' || location.pathname === '') {
          CapApp.exitApp();
        } else {
          navigate(-1);
        }
      }).then((handle) => {
        listenerHandle = handle;
      }).catch(() => {});
    } catch {
      // standard web fallback
    }

    return () => {
      if (listenerHandle && typeof listenerHandle.remove === 'function') {
        listenerHandle.remove();
      }
    };
  }, [location.pathname, navigate]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors relative">
      <Navbar onOpenChat={() => setIsChatOpen(true)} />
      <main className="flex-grow pb-16 md:pb-0">
        <Routes>
          <Route path="/" element={<CustomerLandingPage onOpenChat={() => setIsChatOpen(true)} />} />
          <Route path="/dashboard" element={<CustomerLandingPage onOpenChat={() => setIsChatOpen(true)} />} />
          <Route path="/services" element={<CustomerServicesHomePage />} />
          <Route path="/parking" element={<CustomerLandingPage onOpenChat={() => setIsChatOpen(true)} />} />
          <Route path="/auth" element={<CustomerAuthPage />} />
          <Route path="/search" element={<CustomerLandingPage onOpenChat={() => setIsChatOpen(true)} />} />
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
          <Route path="/profile" element={<CustomerProfilePage />} />
          <Route path="/services/drivers" element={<ActingDriversPage />} />
          <Route path="/drivers" element={<ActingDriversPage />} />
          <Route path="/services/car-spa" element={<CarSpaPage />} />
          <Route path="/car-spa" element={<CarSpaPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Floating ParkBot AI Concierge Trigger (Desktop only, mobile uses BottomNav tab) */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="hidden md:flex fixed bottom-8 right-6 z-40 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white p-3.5 sm:px-4 sm:py-3.5 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all items-center space-x-2 border-2 border-white/20 group cursor-pointer"
        aria-label="Open ParkBot AI Assistant"
      >
        <div className="relative">
          <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full" />
        </div>
        <span className="text-xs sm:text-sm font-black tracking-tight">
          Ask ParkBot AI
        </span>
      </button>

      {/* ParkBot Modal */}
      <ParkBotModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      <BottomNav onOpenChat={() => setIsChatOpen(true)} />
      <Footer />
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
