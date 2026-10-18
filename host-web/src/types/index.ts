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
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
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
  vehicle_license_plate?: string;
  initial_odometer_photo_url?: string;
  user?: {
    id?: number;
    full_name?: string;
    phone_number?: string;
    email?: string;
  };
  listing?: ParkingListing;
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
  user_name?: string;
  user_photo?: string;
}

export interface HostSummary {
  host_name: string;
  this_month_earnings: number;
  upcoming_bookings: number;
  active_parking: number;
  rating: number;
}

// ---------------------------------------------------------------------------
// Acting Driver partner (DB-backed, see backend /api/v1/drivers)
// ---------------------------------------------------------------------------
export type DriverStatus = 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED' | 'SUSPENDED';

export type DriverBookingStatus =
  | 'REQUESTED'
  | 'DRIVER_ACCEPTED'
  | 'CONFIRMED'
  | 'TRIP_STARTED'
  | 'PAYMENT_DUE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface DriverRegistrationPayload {
  full_name: string;
  phone: string;
  photo_url?: string | null;
  city: string;
  service_area?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  service_radius_km?: number;
  dl_number: string;
  dl_expiry_date?: string | null;
  dl_document_url: string;
  aadhaar_number?: string | null;
  aadhaar_document_url?: string | null;
  experience_years: number;
  transmissions: string[];
  vehicle_categories: string[];
  languages: string[];
  trip_types: string[];
}

export interface DriverProfile {
  id: number;
  user_id: number;
  full_name: string;
  phone: string;
  email?: string | null;
  photo_url?: string | null;
  city: string;
  service_area?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  service_radius_km: number;
  dl_number: string;
  dl_expiry_date?: string | null;
  dl_document_url?: string | null;
  dl_verified: boolean;
  aadhaar_number_masked: string;
  aadhaar_document_url?: string | null;
  aadhaar_verified: boolean;
  kyc_provider?: string | null;
  kyc_verified_at?: string | null;
  experience_years: number;
  transmissions: string[];
  vehicle_categories: string[];
  languages: string[];
  trip_types: string[];
  status: DriverStatus;
  rejection_reason?: string | null;
  is_available: boolean;
  approved_at?: string | null;
  rating: number;
  rating_count: number;
  total_trips: number;
  total_earnings: number;
  created_at: string;
}

export interface DriverEarnings {
  total_earnings: number;
  total_trips: number;
  this_month_earnings: number;
  this_month_trips: number;
  pending_requests: number;
  upcoming_trips: number;
  active_trip_id?: number | null;
  rating: number;
  rating_count: number;
}

export interface DriverPricing {
  hourly_rate: number;
  platform_fee_percent: number;
  tax_percent: number;
  min_billable_hours: number;
  night_surcharge_percent: number;
  night_start_hour: number;
  night_end_hour: number;
  outstation_hourly_rate: number;
  outstation_min_hours: number;
  car_type_multipliers: Record<string, number>;
  billing_increment_minutes: number;
}

export interface DriverTripCustomer {
  id: number;
  full_name: string;
  phone_number?: string | null;
}

export interface DriverBooking {
  id: number;
  booking_reference: string;
  customer_id: number;
  driver_id?: number | null;
  status: DriverBookingStatus;
  pickup_address: string;
  pickup_city: string;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  drop_address?: string | null;
  start_time: string;
  end_time: string;
  trip_type: string;
  car_type: string;
  transmission: string;
  seater: number;
  car_make_model?: string | null;
  car_registration?: string | null;
  notes?: string | null;
  hourly_rate: number;
  car_multiplier: number;
  platform_fee_percent: number;
  tax_percent: number;
  estimated_hours: number;
  estimated_driver_fee: number;
  estimated_platform_fee: number;
  estimated_tax: number;
  estimated_total: number;
  accepted_at?: string | null;
  paid_at?: string | null;
  trip_started_at?: string | null;
  trip_ended_at?: string | null;
  actual_hours?: number | null;
  billable_hours?: number | null;
  overtime_hours: number;
  final_driver_fee?: number | null;
  final_platform_fee?: number | null;
  final_tax?: number | null;
  final_total?: number | null;
  amount_paid: number;
  balance_due: number;
  driver_earning: number;
  cancellation_reason?: string | null;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  refund_amount: number;
  customer_rating?: number | null;
  customer_review?: string | null;
  customer?: DriverTripCustomer | null;
  live_elapsed_minutes?: number | null;
  live_running_total?: number | null;
  created_at: string;
  updated_at?: string | null;
}

export interface CarSpaCenter {
  id: string;
  centerName: string;
  ownerName: string;
  phone: string;
  city: string;
  address: string;
  serviceType: 'DOORSTEP_MOBILE' | 'WORKSHOP_BAY' | 'BOTH';
  bayCapacity: number;
  operatingHours: string;
  servicesOffered: string[];
  rating: number;
  totalOrders: number;
  isVerified: boolean;
  status: 'ACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED' | 'REJECTED';
  photo?: string;
  rejectionReason?: string;
  createdAt?: string;
}

export interface RentalPartnerVehicle {
  id: string;
  name: string;
  vehicleType: 'CAR' | 'BIKE';
  category: string;
  photo: string;
  rating: number;
  trips: number;
  transmission: 'AUTOMATIC' | 'MANUAL';
  fuelType: 'PETROL' | 'DIESEL' | 'ELECTRIC';
  seats: number;
  mileageOrRange: string;
  hourlyRate: number;
  dailyRate: number;
  securityDeposit: number;
  isAvailable: boolean;
  badge: string;
  features: string[];
  city: string;
  hubAddress: string;
  status: 'ACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED' | 'REJECTED';
  partnerName: string;
  rcNumber?: string;
  rcDocumentUrl?: string;
  rcOwnershipType?: string;
  insurancePolicyUrl?: string;
  insuranceExpiry?: string;
  payoutUpiId?: string;
}

export interface RcVerificationResult {
  valid: boolean;
  status?: string;
  registered?: string;
  owner?: string;
  masked?: boolean;
  ownerNumber?: string;
  category?: string;
  categoryDescription?: string;
  makerDescription?: string;
  makerModel?: string;
  bodyType?: string;
  fuelType?: string;
  colorType?: string;
  fitnessUpto?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceUpto?: string;
  commercial?: boolean;
  blacklistStatus?: string;
  rto?: string;
  seatingCapacity?: number;
  message?: string;
  source?: string;
}

