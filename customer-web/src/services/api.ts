import { User, Vehicle, ParkingListing, Booking } from '../types';

const rawApiUrl = (import.meta as any).env?.VITE_API_URL;
const API_BASE = rawApiUrl 
  ? `${rawApiUrl.replace(/\/+$/, '')}/api/v1` 
  : '/api/v1';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('parkshare_customer_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((err: any) => `${err.loc ? err.loc.slice(1).join('.') + ': ' : ''}${err.msg}`)
        .join(', ');
    }
    if (data.message && typeof data.message === 'string') return data.message;
  } catch {}
  return fallback;
}

export const api = {
  // Auth
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Login failed'));
    return res.json();
  },

  register: async (data: any) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, role: 'PARKER' }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Registration failed');
    return res.json();
  },

  getMe: async (): Promise<User> => {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Unauthorized');
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

  // Bookings
  calculatePrice: async (listing_id: number, start_time: string, end_time: string, booking_product_type?: string) => {
    const res = await fetch(`${API_BASE}/bookings/calculate-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id, start_time, end_time, booking_product_type }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Calculation failed');
    return res.json();
  },

  createBooking: async (data: { listing_id: number; vehicle_id: number; start_time: string; end_time: string; booking_product_type?: string }): Promise<Booking> => {
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

  getActiveBooking: async (): Promise<Booking | null> => {
    const res = await fetch(`${API_BASE}/bookings/active`, { headers: getHeaders() });
    if (!res.ok) return null;
    return res.json();
  },

  endParking: async (booking_id: number, otp?: string): Promise<Booking> => {
    const res = await fetch(`${API_BASE}/bookings/${booking_id}/end-parking`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(otp ? { otp } : {}),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to end parking session');
    return res.json();
  },

  previewCancellation: async (booking_id: number) => {
    const res = await fetch(`${API_BASE}/bookings/${booking_id}/cancellation-preview`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to load cancellation preview');
    return res.json();
  },

  cancelBooking: async (booking_id: number, reason?: string): Promise<Booking> => {
    const res = await fetch(`${API_BASE}/bookings/${booking_id}/cancel${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to cancel booking');
    return res.json();
  },

  createDispute: async (data: { booking_id: number; category: string; description: string }) => {
    const res = await fetch(`${API_BASE}/disputes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to submit report');
    return res.json();
  },

  getMyDisputes: async () => {
    const res = await fetch(`${API_BASE}/disputes/my`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch reported disputes');
    return res.json();
  },

  // Reviews
  createReview: async (data: { booking_id: number; rating: number; comment?: string }) => {
    const res = await fetch(`${API_BASE}/reviews`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to submit review');
    return res.json();
  },

  // Identity & OTP Verification
  sendMobileOtp: async (phone_number: string) => {
    const res = await fetch(`${API_BASE}/verification/send-mobile-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to send Mobile OTP'));
    return res.json();
  },

  verifyMobileOtp: async (phone_number: string, otp: string) => {
    const res = await fetch(`${API_BASE}/verification/verify-mobile-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number, otp }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Invalid Mobile OTP'));
    return res.json();
  },

  sendEmailOtp: async (email: string) => {
    const res = await fetch(`${API_BASE}/verification/send-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to send Email OTP'));
    return res.json();
  },

  verifyEmailOtp: async (email: string, otp: string) => {
    const res = await fetch(`${API_BASE}/verification/verify-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Invalid Email OTP'));
    return res.json();
  },

  // Vehicle Handover & Inspection
  uploadFile: async (file: File | Blob, filename: string = 'upload.jpg'): Promise<{ success: boolean; filename: string; url: string }> => {
    const formData = new FormData();
    formData.append('file', file, filename);
    const token = localStorage.getItem('parkshare_customer_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}/verification/upload-file`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to upload photo'));
    return res.json();
  },

  markDriverArrived: async (booking_id: number): Promise<Booking> => {
    const res = await fetch(`${API_BASE}/bookings/${booking_id}/driver-arrived`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to record arrival'));
    return res.json();
  },

  submitOdometer: async (
    booking_id: number,
    data: {
      odometer_photo_url: string;
      odometer_reading: number;
      odometer_ocr_text?: string;
      exterior_photos?: Record<string, string>;
      damage_notes?: string;
    }
  ): Promise<Booking> => {
    const res = await fetch(`${API_BASE}/bookings/${booking_id}/submit-odometer`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to submit odometer inspection'));
    return res.json();
  },

  requestVehicleCollection: async (booking_id: number): Promise<Booking> => {
    const res = await fetch(`${API_BASE}/bookings/${booking_id}/request-collection`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to request vehicle collection'));
    return res.json();
  },

  verifyReleaseOtp: async (booking_id: number, otp: string): Promise<Booking> => {
    const res = await fetch(`${API_BASE}/bookings/${booking_id}/verify-release-otp`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ otp }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Release OTP verification failed'));
    return res.json();
  },
};



