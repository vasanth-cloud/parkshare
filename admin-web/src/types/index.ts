export type UserRole = 'PARKER' | 'HOST' | 'ADMIN';

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone_number?: string;
  profile_photo_url?: string;
  is_active: boolean;
  is_verified: boolean;
  phone_verified?: boolean;
  email_verified?: boolean;
  is_identity_verified?: boolean;
  roles: UserRole[];
  created_at: string;
}

export interface ListingImage {
  id?: number;
  image_url: string;
  caption?: string;
  is_cover: boolean;
  display_order?: number;
}

export interface ParkingListing {
  id: number;
  host_profile_id: number;
  title: string;
  description?: string;
  parking_type: string;
  area: string;
  city: string;
  approximate_address: string;
  exact_address?: string;
  latitude: number;
  longitude: number;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'PAUSED' | 'REJECTED' | 'SUSPENDED';
  capacity: number;
  is_covered?: boolean;
  is_indoor?: boolean;
  has_gated_access?: boolean;
  has_cctv?: boolean;
  images?: ListingImage[];
  is_location_verified?: boolean;
  verified_latitude?: number;
  verified_longitude?: number;
  verified_at?: string;
  verification_photo_url?: string;
  location_verification_metadata?: {
    gps_captured?: boolean;
    verified_lat?: number;
    verified_lng?: number;
    declared_lat?: number;
    declared_lng?: number;
    distance_to_declared_m?: number;
    is_address_match?: boolean;
    gps_accuracy_m?: number;
    verified_at_iso?: string;
  };
  pricing_rule?: {
    hourly_price: number;
    daily_price?: number;
  };
  host_type?: string;
  max_length_m?: number;
  max_width_m?: number;
  max_height_m?: number;
  has_24_7_access?: boolean;
  has_security_guard?: boolean;
  has_ev_charging?: boolean;
  rejection_reason?: string;
  host?: {
    id: number;
    full_name: string;
    legal_name?: string;
    email?: string;
    phone_number?: string;
    host_type?: string;
    email_verified?: boolean;
    phone_verified?: boolean;
    is_identity_verified?: boolean;
    government_id_type?: string;
    property_proof_verified?: boolean;
    authorization_status?: string;
  };
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

export interface Dispute {
  id: number;
  dispute_reference: string;
  booking_id: number;
  reporter_id: number;
  reported_user_id: number;
  reporter_role: 'PARKER' | 'HOST';
  category: string;
  description: string;
  status: 'OPEN' | 'UNDER_INVESTIGATION' | 'RESOLVED' | 'REJECTED';
  resolution_notes?: string;
  resolved_by_admin_id?: number;
  resolved_at?: string;
  created_at: string;
  reporter_name?: string;
  reported_user_name?: string;
  booking_reference?: string;
  listing_title?: string;
}

