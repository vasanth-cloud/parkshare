export type UserRole = 'PARKER' | 'HOST' | 'ADMIN';
export type HostType = 'INDIVIDUAL' | 'BUSINESS';
export type BookingProductType = 'HOURLY' | 'DAILY' | 'MULTI_DAY' | 'MONTHLY_FULL' | 'MONTHLY_COMMUTER';

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

export interface PricingRule {
  id: number;
  hourly_price: number;
  daily_price?: number;
  multi_day_discount_percent?: number;
  monthly_price?: number;
  monthly_commuter_price?: number;
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
  host_type?: HostType;
  parking_type: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  approximate_address: string;
  exact_address?: string;
  access_instructions?: string;
  latitude: number;
  longitude: number;
  capacity: number;
  total_spaces?: number;
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
  booking_product_type?: BookingProductType;
  space_number?: string;
  start_time: string;
  end_time: string;
  verification_code?: string;
  parking_fee: number;
  platform_fee: number;
  tax: number;
  total_amount: number;
  status: 'PENDING_APPROVAL' | 'PENDING_PAYMENT' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED';
  listing?: ParkingListing;
  created_at: string;
}

export interface HostSummary {
  host_name: string;
  this_month_earnings: number;
  upcoming_bookings: number;
  active_parking: number;
  rating: number;
}

