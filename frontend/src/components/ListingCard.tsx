import React from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Shield, Zap, Car, CheckCircle2 } from 'lucide-react';
import { ParkingListing } from '../types';

interface ListingCardProps {
  listing: ParkingListing;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing }) => {
  const coverImage = listing.images && listing.images.length > 0 
    ? listing.images[0].image_url 
    : 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&auto=format&fit=crop';

  const hourlyPrice = listing.pricing_rule ? listing.pricing_rule.hourly_price : 30;

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col group">
      
      {/* Cover Image & Badges */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        <img
          src={coverImage}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Price Tag */}
        <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md text-white px-3 py-1 rounded-xl text-sm font-bold shadow-md">
          ₹{hourlyPrice} <span className="text-xs font-normal text-slate-300">/ hr</span>
        </div>

        {/* Feature Badges */}
        <div className="absolute top-3 right-3 flex flex-col space-y-1 items-end">
          {listing.is_covered && (
            <span className="bg-emerald-600/90 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-0.5 rounded-lg shadow-sm">
              Covered
            </span>
          )}
          {listing.has_ev_charging && (
            <span className="bg-amber-500/90 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-0.5 rounded-lg shadow-sm flex items-center space-x-1">
              <Zap className="w-3 h-3 fill-white" />
              <span>EV</span>
            </span>
          )}
        </div>
      </div>

      {/* Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-semibold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-md">
              {listing.parking_type.replace('_', ' ')}
            </span>

            <div className="flex items-center space-x-1 font-semibold text-slate-700">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{listing.average_rating > 0 ? listing.average_rating.toFixed(1) : 'New'}</span>
              {listing.total_reviews > 0 && <span className="text-slate-400 font-normal">({listing.total_reviews})</span>}
            </div>
          </div>

          <h3 className="text-base font-bold text-slate-900 line-clamp-1 group-hover:text-emerald-600 transition-colors">
            {listing.title}
          </h3>

          <p className="flex items-center text-xs text-slate-500 mt-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1 flex-shrink-0" />
            <span className="truncate">{listing.approximate_address}</span>
          </p>

          {/* Privacy Shield Disclaimer */}
          <div className="mt-3 text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">Exact address revealed after booking</span>
          </div>

          {/* Vehicle Types Supported */}
          <div className="mt-3 flex items-center space-x-1.5 flex-wrap">
            {listing.allowed_vehicle_types.map((vt) => (
              <span key={vt} className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                {vt}
              </span>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
          {listing.distance_km !== undefined && (
            <span className="text-xs text-slate-500 font-medium">
              {listing.distance_km} km away
            </span>
          )}

          <Link
            to={`/listings/${listing.id}`}
            className="ml-auto px-4 py-2 bg-slate-900 text-white hover:bg-emerald-600 text-xs font-semibold rounded-xl transition-colors shadow-sm"
          >
            Reserve Parking
          </Link>
        </div>

      </div>

    </div>
  );
};
