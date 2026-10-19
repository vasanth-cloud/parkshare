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
  account?: 'customer' | 'host' | 'admin';
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

export interface ServiceFinancialClassification {
  service_id: 'PARKING' | 'DRIVERS' | 'CAR_SPA' | string;
  service_name: string;
  short_name: string;
  category: string;
  icon: string;
  gross_collected: number;
  platform_commission: number;
  partner_payouts: number;
  total_bookings: number;
  active_units: number;
  contribution_percentage: number;
  avg_ticket_size: number;
  status: 'ACTIVE' | 'GROWING' | 'PENDING' | string;
}

export interface ClassifiedTransaction {
  id: string;
  service: 'PARKING' | 'DRIVERS' | 'CAR_SPA' | string;
  service_label: string;
  service_icon: string;
  booking_reference: string;
  customer_name: string;
  gross_amount: number;
  commission: number;
  net_payout: number;
  status: 'PAID' | 'COMPLETED' | 'REFUNDED' | string;
  date: string;
  payment_method: string;
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
  total_drivers?: number;
  total_car_spas?: number;
  services_classification?: ServiceFinancialClassification[];
  classified_transactions?: ClassifiedTransaction[];
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

export type DriverStatus = 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED' | 'SUSPENDED';

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

export interface DriverAdminSummary {
  total_drivers: number;
  active_drivers: number;
  pending_drivers: number;
  suspended_drivers: number;
  online_drivers: number;
  total_bookings: number;
  open_requests: number;
  live_trips: number;
  completed_trips: number;
  gross_collected: number;
  platform_commission: number;
  driver_payouts: number;
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
  updated_at?: string | null;
}

export interface DriverBooking {
  id: number;
  booking_reference: string;
  customer_id: number;
  driver_id?: number | null;
  status: string;
  pickup_address: string;
  pickup_city: string;
  drop_address?: string | null;
  start_time: string;
  end_time: string;
  trip_type: string;
  car_type: string;
  transmission: string;
  seater: number;
  car_make_model?: string | null;
  estimated_hours: number;
  estimated_total: number;
  final_total?: number | null;
  amount_paid: number;
  balance_due: number;
  driver_earning: number;
  overtime_hours: number;
  billable_hours?: number | null;
  customer?: { id: number; full_name: string; phone_number?: string | null } | null;
  driver?: { id: number; display_name: string; city: string } | null;
  created_at: string;
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

export interface RentalVehicle {
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
  rcOwnershipType?: 'PRIVATE' | 'COMMERCIAL';
  insurancePolicyUrl?: string;
  insuranceExpiry?: string;
  payoutUpiId?: string;
}

