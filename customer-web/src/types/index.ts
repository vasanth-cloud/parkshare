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

export interface HostVerification {
  identity_verified: boolean;
  phone_verified: boolean;
  payout_verified: boolean;
  ownership_verified: boolean;
  listing_approved: boolean;
  is_fully_verified: boolean;
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
  distance_km?: number;
  capacity: number;
  total_spaces?: number;
  dimensions_description?: string;
  max_length_m?: number;
  max_width_m?: number;
  max_height_m?: number;
  is_covered: boolean;
  is_indoor: boolean;
  has_cctv: boolean;
  has_ev_charging: boolean;
  has_disabled_access: boolean;
  has_24_7_access?: boolean;
  has_gated_access?: boolean;
  has_security_guard?: boolean;
  allowed_vehicle_types: string[];
  parking_rules?: string;
  booking_mode: 'INSTANT' | 'MANUAL_APPROVAL';
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'PAUSED' | 'REJECTED' | 'SUSPENDED';
  is_reserved?: boolean;
  available_spaces?: number;
  average_rating: number;
  total_reviews: number;
  images: ListingImage[];
  pricing_rule?: PricingRule;
  host_verification?: HostVerification;
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
  vehicle_id?: number;
  booking_product_type?: BookingProductType;
  space_number?: string;
  start_time: string;
  end_time: string;
  verification_code?: string;
  qr_token: string;
  parking_fee: number;
  platform_fee: number;
  tax: number;
  total_amount: number;
  status: BookingStatus;
  cancellation_reason?: string;
  cancelled_by?: string;
  cancellation_tier?: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'NO_REFUND';
  refund_amount?: number;
  cancelled_at?: string;
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
  listing?: ParkingListing;
  vehicle?: Vehicle;
  review?: Review;
  host_name?: string;
  host_phone?: string;
  payment_expires_at?: string;
  created_at: string;
}

export interface Review {
  id: number;
  booking_id: number;
  user_id: number;
  listing_id: number;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface CancellationPreview {
  booking_id: number;
  hours_until_start: number;
  cancellation_tier: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'NO_REFUND';
  total_paid: number;
  refund_percentage: number;
  refund_amount: number;
  cancellation_fee: number;
  policy_description: string;
}

