import React, { useState } from 'react';
import { MapPin, Navigation, Star, X, Check } from 'lucide-react';
import { ParkingListing } from '../types';
import { Link } from 'react-router-dom';

interface MapViewProps {
  listings: ParkingListing[];
}

export const MapView: React.FC<MapViewProps> = ({ listings }) => {
  const [selectedListing, setSelectedListing] = useState<ParkingListing | null>(null);

  return (
    <div className="relative w-full h-[600px] bg-slate-100 rounded-3xl overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center">
      
      {/* Simulated Interactive Map Grid SVG Layer */}
      <svg className="absolute inset-0 w-full h-full text-slate-200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        {/* Simulated Road Paths */}
        <path d="M -50 150 Q 200 120 400 300 T 900 450" fill="none" stroke="#cbd5e1" strokeWidth="24" />
        <path d="M 200 -50 L 350 700" fill="none" stroke="#cbd5e1" strokeWidth="18" />
        <path d="M 600 -50 L 500 700" fill="none" stroke="#e2e8f0" strokeWidth="14" />
      </svg>

      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 flex items-center space-x-1.5 shadow-sm z-10">
        <Navigation className="w-3.5 h-3.5 text-emerald-600" />
        <span>Approximate Map Boundaries (Privacy Shield Active)</span>
      </div>

      {/* Markers */}
      <div className="relative w-full h-full max-w-4xl max-h-[500px]">
        {listings.map((item, idx) => {
          // Spread pins across map relative positions
          const xPos = 20 + (idx * 28) % 70;
          const yPos = 25 + (idx * 35) % 65;
          const isSelected = selectedListing?.id === item.id;
          const price = item.pricing_rule?.hourly_price || 30;

          return (
            <button
              key={item.id}
              onClick={() => setSelectedListing(item)}
              style={{ top: `${yPos}%`, left: `${xPos}%` }}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-20 group transition-all duration-300 ${
                isSelected ? 'scale-125 z-30' : 'hover:scale-110'
              }`}
            >
              <div className={`px-2.5 py-1 rounded-full font-bold text-xs shadow-md border flex items-center space-x-1 ${
                isSelected 
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-200' 
                  : 'bg-white text-slate-900 border-slate-300 hover:border-emerald-500'
              }`}>
                <MapPin className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                <span>₹{price}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Listing Preview Drawer */}
      {selectedListing && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-2xl p-4 shadow-2xl border border-slate-200 z-40 animate-in slide-in-from-bottom duration-300">
          <button
            onClick={() => setSelectedListing(null)}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex space-x-3">
            <img
              src={selectedListing.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&auto=format&fit=crop'}
              alt={selectedListing.title}
              className="w-20 h-20 rounded-xl object-cover"
            />
            <div className="flex-1 pr-4">
              <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{selectedListing.title}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{selectedListing.area}, {selectedListing.city}</p>
              
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-bold text-emerald-700">
                  ₹{selectedListing.pricing_rule?.hourly_price}/hr
                </span>
                <Link
                  to={`/listings/${selectedListing.id}`}
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-emerald-600 transition-colors"
                >
                  View Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
