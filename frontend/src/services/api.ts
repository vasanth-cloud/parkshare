import { User, Vehicle, ParkingListing, Booking, AdminStats } from '../types';

const API_BASE = '/api/v1';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('parkshare_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Auth
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Login failed');
    return res.json();
  },

  register: async (data: any) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Registration failed');
    return res.json();
  },

  getMe: async (): Promise<User> => {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Unauthorized');
    return res.json();
  },

  becomeHost: async (data: any) => {
    const res = await fetch(`${API_BASE}/auth/become-host`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Host setup failed');
    return res.json();
  },

  // Vehicles
  getVehicles: async (): Promise<Vehicle[]> => {
    const res = await fetch(`${API_BASE}/vehicles`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch vehicles');
    return res.json();
  },

  addVehicle: async (data: any): Promise<Vehicle> => {
    const res = await fetch(`${API_BASE}/vehicles`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add vehicle');
    return res.json();
  },

  // Listings
  searchListings: async (params: { city?: string; area?: string; vehicle_type?: string; lat?: number; lng?: number; radius_km?: number }): Promise<ParkingListing[]> => {
    const query = new URLSearchParams();
    if (params.city) query.append('city', params.city);
    if (params.area) query.append('area', params.area);
    if (params.vehicle_type) query.append('vehicle_type', params.vehicle_type);
    if (params.lat !== undefined) query.append('lat', params.lat.toString());
    if (params.lng !== undefined) query.append('lng', params.lng.toString());
    if (params.radius_km !== undefined) query.append('radius_km', params.radius_km.toString());

    const res = await fetch(`${API_BASE}/listings/search?${query.toString()}`);
    if (!res.ok) throw new Error('Search failed');
    return res.json();
  },

  getListingDetail: async (id: number): Promise<ParkingListing> => {
    const res = await fetch(`${API_BASE}/listings/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to load listing detail');
    return res.json();
  },

  createListing: async (data: any): Promise<ParkingListing> => {
    const res = await fetch(`${API_BASE}/listings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create listing');
    return res.json();
  },

  getMyListings: async (): Promise<ParkingListing[]> => {
    const res = await fetch(`${API_BASE}/listings/my-listings`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch host listings');
    return res.json();
  },

  toggleListingStatus: async (id: number): Promise<ParkingListing> => {
    const res = await fetch(`${API_BASE}/listings/${id}/toggle-status`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to toggle status');
    return res.json();
  },

  // Bookings
  calculatePrice: async (listing_id: number, start_time: string, end_time: string) => {
    const res = await fetch(`${API_BASE}/bookings/calculate-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id, start_time, end_time }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Calculation failed');
    return res.json();
  },

  createBooking: async (data: { listing_id: number; vehicle_id: number; start_time: string; end_time: string }): Promise<Booking> => {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Booking failed');
    return res.json();
  },

  getMyBookings: async (): Promise<Booking[]> => {
    const res = await fetch(`${API_BASE}/bookings/my-bookings`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch bookings');
    return res.json();
  },

  // Payments
  createPaymentOrder: async (booking_id: number) => {
    const res = await fetch(`${API_BASE}/payments/create-order`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ booking_id }),
    });
    if (!res.ok) throw new Error('Failed to create payment order');
    return res.json();
  },

  verifyPayment: async (data: { booking_id: number; order_id: string; payment_id: string; signature: string }) => {
    const res = await fetch(`${API_BASE}/payments/verify`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Payment verification failed');
    return res.json();
  },

  // Check-in / Out
  checkInSession: async (data: { booking_reference?: string; verification_code?: string; qr_token?: string }) => {
    const res = await fetch(`${API_BASE}/parking-sessions/check-in`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Check-in failed');
    return res.json();
  },

  checkOutSession: async (booking_id: number) => {
    const res = await fetch(`${API_BASE}/parking-sessions/check-out/${booking_id}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Check-out failed');
    return res.json();
  },

  // Admin
  getAdminStats: async (): Promise<AdminStats> => {
    const res = await fetch(`${API_BASE}/admin/stats`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to load admin stats');
    return res.json();
  },

  getPendingListings: async (): Promise<ParkingListing[]> => {
    const res = await fetch(`${API_BASE}/admin/listings/pending`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to load pending listings');
    return res.json();
  },

  approveListing: async (listing_id: number, status: 'ACTIVE' | 'REJECTED', rejection_reason?: string) => {
    const res = await fetch(`${API_BASE}/admin/listings/${listing_id}/approve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ status, rejection_reason }),
    });
    if (!res.ok) throw new Error('Moderation failed');
    return res.json();
  },

  // Verification & OTP
  sendMobileOtp: async (phone_number: string) => {
    const res = await fetch(`${API_BASE}/verification/send-mobile-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to send Mobile OTP');
    return res.json();
  },

  verifyMobileOtp: async (phone_number: string, otp: string) => {
    const res = await fetch(`${API_BASE}/verification/verify-mobile-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number, otp }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to verify Mobile OTP');
    return res.json();
  },

  sendEmailOtp: async (email: string) => {
    const res = await fetch(`${API_BASE}/verification/send-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to send Email OTP');
    return res.json();
  },

  verifyEmailOtp: async (email: string, otp: string) => {
    const res = await fetch(`${API_BASE}/verification/verify-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to verify Email OTP');
    return res.json();
  },

  getVerificationStatus: async () => {
    const res = await fetch(`${API_BASE}/verification/status`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch verification status');
    return res.json();
  },

  submitHostIdentity: async (data: any) => {
    const res = await fetch(`${API_BASE}/verification/submit-identity`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Identity verification failed');
    return res.json();
  },

  uploadFile: async (file: Blob | File, filename?: string) => {
    const formData = new FormData();
    formData.append('file', file, filename || (file instanceof File ? file.name : 'upload.jpg'));
    const token = localStorage.getItem('parkshare_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/verification/upload-file`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to upload verification file');
    return res.json();
  }
};
