import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, MapPin, ShieldCheck, Car, Key, DollarSign, Calendar, ChevronRight, CheckCircle2, ArrowRight, Navigation, Loader2, Zap } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [city, setCity] = useState('');
  const [detectingGps, setDetectingGps] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?city=${encodeURIComponent(city)}`);
  };

  const handleNearbyMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingGps(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setDetectingGps(false);
        navigate(`/search?lat=${lat}&lng=${lng}&radius_km=10`);
      },
      (err) => {
        setDetectingGps(false);
        alert('Location access denied or unavailable.');
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-16 pb-16">
      
      {/* HERO SECTION WITH DUAL APP SELECTION (Rapido Style) */}
      <section className="relative pt-12 pb-20 overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          <div className="inline-flex items-center space-x-2 bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3.5 py-1 rounded-full mb-6 border border-emerald-500/30">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ParkShare — 2-Sided Parking Marketplace</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight">
            One Platform. <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-400 bg-clip-text text-transparent">
              Two Separated Apps.
            </span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-medium">
            Like Rapido, ParkShare provides dedicated apps for Drivers seeking parking and Captains earning from unused spaces.
          </p>

          {/* DUAL APP SELECTOR CARDS (Rapido Style) */}
          <div className="mt-10 max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            
            {/* 1. Driver App Card */}
            <div className="bg-slate-900/90 rounded-3xl p-6 border-2 border-emerald-500/60 shadow-xl shadow-emerald-500/10 flex flex-col justify-between space-y-5 hover:border-emerald-400 transition-all group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-md group-hover:scale-105 transition-transform">
                  <Car className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-800">
                    For Drivers / Parkers
                  </span>
                  <h3 className="text-2xl font-black text-white mt-1">ParkShare Driver App</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Search nearby parking spots, reserve instantly, unlock exact location after payment, and scan QR pass to park.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <Link
                  to="/driver/auth"
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs text-center transition-all shadow-md shadow-emerald-500/20"
                >
                  Sign In / Register as Driver
                </Link>
                <Link
                  to="/search"
                  className="px-3 py-3 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl text-xs font-bold transition-all"
                  title="Find Parking"
                >
                  <Search className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* 2. Captain App Card */}
            <div className="bg-slate-900/90 rounded-3xl p-6 border-2 border-amber-500/60 shadow-xl shadow-amber-500/10 flex flex-col justify-between space-y-5 hover:border-amber-400 transition-all group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md group-hover:scale-105 transition-transform">
                  <Zap className="w-7 h-7 fill-slate-950" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider bg-amber-950 px-2 py-0.5 rounded-md border border-amber-800">
                    For Space Owners
                  </span>
                  <h3 className="text-2xl font-black text-white mt-1">ParkShare Captain App</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    List driveways, garages, or apartment spots. Use live PIN/QR scanner at entry and earn daily passive income.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <Link
                  to="/captain/auth"
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs text-center transition-all shadow-md shadow-amber-500/20"
                >
                  Sign In / Register as Captain
                </Link>
                <Link
                  to="/captain"
                  className="px-3 py-3 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-bold transition-all"
                  title="Captain Portal"
                >
                  <Zap className="w-4 h-4" />
                </Link>
              </div>
            </div>

          </div>

          {/* Quick Search Bar */}
          <div className="mt-10 max-w-3xl mx-auto bg-white p-3 sm:p-4 rounded-3xl shadow-xl space-y-3 text-left">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 flex items-center space-x-3 px-4 py-3 bg-slate-50 rounded-2xl w-full">
                <MapPin className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Where do you want to park? (e.g. Koramangala)"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="bg-transparent text-sm w-full outline-none text-slate-900 placeholder-slate-400"
                />
              </div>

              <div className="flex w-full sm:w-auto space-x-2">
                <button
                  type="submit"
                  className="flex-1 sm:flex-none px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 text-sm"
                >
                  <Search className="w-5 h-5" />
                  <span>Search Spaces</span>
                </button>

                <button
                  type="button"
                  onClick={handleNearbyMe}
                  disabled={detectingGps}
                  className="px-4 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all shadow-md flex items-center justify-center space-x-1.5 text-xs"
                >
                  {detectingGps ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  ) : (
                    <Navigation className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                  )}
                  <span>📍 Nearby Me</span>
                </button>
              </div>
            </form>
          </div>

        </div>
      </section>

      {/* POPULAR CITIES / LOCATIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Popular Parking Hubs</h2>
            <p className="text-sm text-slate-600">Discover top-rated spaces in high-demand areas</p>
          </div>
          <Link to="/search" className="text-sm font-extrabold text-emerald-600 hover:text-emerald-700 flex items-center">
            <span>Explore all listings</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <Link to="/search?area=Koramangala" className="group relative rounded-3xl overflow-hidden h-48 shadow-sm hover:shadow-md transition-all">
            <img src="https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&auto=format&fit=crop" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Koramangala" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent p-5 flex flex-col justify-end text-white">
              <h3 className="font-extrabold text-lg">Koramangala</h3>
              <p className="text-xs text-slate-300">Bengaluru • Driveways & Commercial</p>
            </div>
          </Link>

          <Link to="/search?area=Indiranagar" className="group relative rounded-3xl overflow-hidden h-48 shadow-sm hover:shadow-md transition-all">
            <img src="https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800&auto=format&fit=crop" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Indiranagar" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent p-5 flex flex-col justify-end text-white">
              <h3 className="font-extrabold text-lg">Indiranagar 100ft Rd</h3>
              <p className="text-xs text-slate-300">Bengaluru • Apartment Basements</p>
            </div>
          </Link>

          <Link to="/search?area=Whitefield" className="group relative rounded-3xl overflow-hidden h-48 shadow-sm hover:shadow-md transition-all">
            <img src="https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=800&auto=format&fit=crop" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Whitefield" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent p-5 flex flex-col justify-end text-white">
              <h3 className="font-extrabold text-lg">Whitefield IT Hub</h3>
              <p className="text-xs text-slate-300">Bengaluru • Office & Gated Parking</p>
            </div>
          </Link>
        </div>
      </section>

    </div>
  );
};
