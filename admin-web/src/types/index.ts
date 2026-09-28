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
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'PAUSED' | 'REJECTED' | 'SUSPENDED';
  capacity: number;
  pricing_rule?: {
    hourly_price: number;
    daily_price?: number;
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

