export type UserRole = 'PARKER' | 'HOST' | 'ADMIN';
export type HostType = 'INDIVIDUAL' | 'BUSINESS';
export type BookingProductType = 'HOURLY' | 'DAILY' | 'MULTI_DAY' | 'MONTHLY_FULL' | 'MONTHLY_COMMUTER';

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

export interface VerificationStatus {
  is_identity_verified: boolean;
  can_submit_space: boolean;
  legal_name?: string;
  has_legal_name: boolean;
  email?: string;
  email_verified: boolean;
  phone_number?: string;
  phone_verified: boolean;
  profile_photo_url?: string;
  has_profile_photo: boolean;
  gov_id_type?: 'AADHAAR' | 'DRIVING_LICENCE' | 'PASSPORT';
  gov_id_number?: string;
  gov_id_document_url?: string;
  has_gov_id: boolean;
  id_verification_provider?: string;
  id_verified_at?: string;
  missing_requirements: string[];
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
  rejection_reason?: string;
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
  average_rating: number;
  total_reviews: number;
  images: ListingImage[];
  pricing_rule?: PricingRule;
  created_at: string;
}

export type BookingStatus = 
  | 'PENDING_APPROVAL'
  | 'PENDING_PAYMENT'
  | 'BOOKING_CREATED'
  | 'CONFIRMED'
  | 'DRIVER_ARRIVED'
  | 'ODOMETER_PHOTO_SUBMITTED'
  | 'KEY_HANDOVER_PENDING'
  | 'KEY_RECEIVED'
  | 'PARKING_ACTIVE'
  | 'ACTIVE'
  | 'VEHICLE_COLLECTION_REQUESTED'
  | 'RELEASE_OTP_VERIFIED'
  | 'VEHICLE_RELEASED'
  | 'COMPLETED'
  | 'DISPUTE_OPENED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

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
  status: BookingStatus;
  odometer_reading?: number;
  odometer_photo_url?: string;
  odometer_submitted_at?: string;
  odometer_ocr_text?: string;
  exterior_photos?: string;
  damage_notes?: string;
  driver_arrived_at?: string;
  key_received_at?: string;
  collection_requested_at?: string;
  vehicle_released_at?: string;
  vehicle?: {
    id?: number;
    registration_number?: string;
    vehicle_type?: string;
    make?: string;
    model?: string;
    color?: string;
  };
  listing?: ParkingListing;
  payment_expires_at?: string;
  created_at: string;
}

export interface HostSummary {
  host_name: string;
  this_month_earnings: number;
  upcoming_bookings: number;
  active_parking: number;
  rating: number;
}

