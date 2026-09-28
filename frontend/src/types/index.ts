export type UserRole = 'PARKER' | 'HOST' | 'ADMIN';

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone_number?: string;
  is_active: boolean;
  is_verified: boolean;
  roles: UserRole[];
  created_at: string;
}

export interface Vehicle {
  id: number;
  user_id: number;
  registration_number: string;
  vehicle_type: 'CAR' | 'SUV' | 'BIKE' | 'SCOOTER' | 'VAN';
  make?: string;
  model?: string;
  color?: string;
  is_default: boolean;
}

export interface PricingRule {
  id: number;
  hourly_price: number;
  daily_price?: number;
  monthly_price?: number;
  minimum_duration_hours: number;
  maximum_duration_hours: number;
  security_deposit: number;
}

export interface ListingImage {
  id: number;
  image_url: string;
  caption?: string;
  is_cover: boolean;
}

export interface ParkingListing {
  id: number;
  host_profile_id: number;
  title: string;
  description?: string;
  parking_type: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  approximate_address: string;
  exact_address?: string; // Revealed only if booking is confirmed
  access_instructions?: string;
  latitude: number;
  longitude: number;
  distance_km?: number;
  capacity: number;
  dimensions_description?: string;
  is_covered: boolean;
  is_indoor: boolean;
  has_cctv: boolean;
  has_ev_charging: boolean;
  has_disabled_access: boolean;
  allowed_vehicle_types: string[];
  booking_mode: 'INSTANT' | 'MANUAL_APPROVAL';
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'PAUSED' | 'REJECTED' | 'SUSPENDED';
  average_rating: number;
  total_reviews: number;
  images: ListingImage[];
  pricing_rule?: PricingRule;
  created_at: string;
}

export interface Booking {
  id: number;
  booking_reference: string;
  user_id: number;
  listing_id: number;
  vehicle_id?: number;
  start_time: string;
  end_time: string;
  verification_code?: string;
  qr_token: string;
  parking_fee: number;
  platform_fee: number;
  tax: number;
  total_amount: number;
  status: 'PENDING_APPROVAL' | 'PENDING_PAYMENT' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED';
  listing?: ParkingListing;
  vehicle?: Vehicle;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  total_hosts: number;
  total_listings: number;
  pending_listings: number;
  total_bookings: number;
  active_bookings: number;
  total_revenue: number;
  platform_commission_earned: number;
  total_payouts: number;
}
