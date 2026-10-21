import {
  User, Vehicle, ParkingListing, Booking, Review, RentalVehicle, RentalBooking,
  DriverPublic, DriverPricing, DriverFareBreakdown, DriverBooking, DriverBookingCreate, DriverPaymentOrder, AppNotification,
} from '../types';

const rawApiUrl = (import.meta as any).env?.VITE_API_URL;

function resolveBackendBase(): string {
  // If running inside Capacitor Native Android/iOS App
  const isCapacitor = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.() || (window as any).Capacitor?.platform === 'android' || (window as any).Capacitor?.platform === 'ios');
  if (isCapacitor) {
    return 'https://parkshare-backend-9anh.onrender.com';
  }

  if (rawApiUrl) {
    return rawApiUrl.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const port = window.location.port;
    if (port === '5173' || port === '5174') {
      return '';
    }
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'https://parkshare-backend-9anh.onrender.com';
    }
    if (host === '10.0.2.2') {
      return 'http://10.0.2.2:8000';
    }
    if (/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(host)) {
      return `http://${host}:8000`;
    }
  }
  return 'https://parkshare-backend-9anh.onrender.com';
}

export const BACKEND_BASE = resolveBackendBase();
const API_BASE = `${BACKEND_BASE}/api/v1`;

export function getFullImageUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  const uploadsIdx = url.indexOf('/uploads/');
  if (uploadsIdx !== -1) {
    const uploadPath = url.substring(uploadsIdx);
    if (typeof window !== 'undefined') {
      const port = window.location.port;
      if (port === '5173' || port === '5174' || port === '5175') return uploadPath;
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') return uploadPath;
    }
    return `${BACKEND_BASE}${uploadPath}`;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BACKEND_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

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
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((err: any) => `${err.loc ? err.loc.slice(1).join('.') + ': ' : ''}${err.msg}`)
        .join(', ');
    }
    if (data.message && typeof data.message === 'string') return data.message;
  } catch {}
  const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (plain && plain.length < 180) return plain;
  return fallback;
}

async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (err: any) {
    if (err.name === 'TypeError' || err.message?.toLowerCase().includes('fetch')) {
      throw new Error(`Unable to reach ParkCo server at ${BACKEND_BASE}. Please verify that the backend is started.`);
    }
    throw err;
  }
}

export const api = {
  // Auth
  login: async (email: string, password: string) => {
    const res = await safeFetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password, portal: 'customer' }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Login failed. Please check your email and password.'));
    return res.json();
  },

  register: async (data: any) => {
    const res = await safeFetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, role: 'PARKER' }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Registration failed.'));
    return res.json();
  },

  getMe: async (): Promise<User> => {
    const res = await safeFetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Unauthorized');
    return res.json();
  },

  updateProfilePhoto: async (profile_photo_url: string): Promise<User> => {
    const res = await fetch(`${API_BASE}/auth/profile-photo`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ profile_photo_url }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to update profile photo'));
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

  deleteVehicle: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/vehicles/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to remove vehicle');
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
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Payment verification failed');
    }
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

  getReviewsByListing: async (listing_id: number): Promise<Review[]> => {
    const res = await fetch(`${API_BASE}/reviews/listing/${listing_id}`);
    if (!res.ok) return [];
    return res.json();
  },

  // Identity & OTP Verification
  sendMobileOtp: async (phone_number: string) => {
    const res = await safeFetch(`${API_BASE}/verification/send-mobile-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to send Mobile OTP'));
    return res.json();
  },

  verifyMobileOtp: async (phone_number: string, otp: string) => {
    const res = await safeFetch(`${API_BASE}/verification/verify-mobile-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number, otp }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Invalid Mobile OTP'));
    return res.json();
  },

  sendEmailOtp: async (email: string) => {
    const res = await safeFetch(`${API_BASE}/verification/send-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to send Email OTP'));
    return res.json();
  },

  verifyEmailOtp: async (email: string, otp: string) => {
    const res = await safeFetch(`${API_BASE}/verification/verify-email-otp`, {
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

  // AI Chatbot Assistant
  sendChatMessage: async (message: string, history: { role: string; content: string }[] = []): Promise<{
    reply: string;
    recommended_listings: ParkingListing[];
    suggestions: string[];
  }> => {
    const res = await fetch(`${API_BASE}/chatbot/message`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message, history }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'AI assistant unavailable right now'));
    return res.json();
  },

  getChatSuggestions: async (): Promise<string[]> => {
    try {
      const res = await fetch(`${API_BASE}/chatbot/suggestions`, {
        headers: getHeaders(),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.suggestions || [];
    } catch {
      return [
        "I am going to Whitefield and need parking space",
        "Show spots with EV charging",
        "Find parking near BTM Layout",
        "How do I check in with QR pass?"
      ];
    }
  },

  getRentalVehicles: async (params?: { type?: string; transmission?: string; city?: string }): Promise<RentalVehicle[]> => {
    const query = new URLSearchParams();
    if (params?.type && params.type !== 'ALL') query.set('type', params.type);
    if (params?.transmission && params.transmission !== 'ANY') query.set('transmission', params.transmission);
    if (params?.city) query.set('city', params.city);

    const res = await fetch(`${API_BASE}/rentals/available?${query.toString()}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to fetch rental vehicles'));
    return res.json();
  },

  bookRentalVehicle: async (payload: {
    vehicleId: string;
    customerName: string;
    customerPhone: string;
    pickupDate: string;
    returnDate: string;
    pickupTime: string;
    returnTime?: string;
    deliveryType?: string;
    doorstepAddress?: string;
    withInsurance?: boolean;
    city?: string;
  }): Promise<RentalBooking> => {
    const res = await fetch(`${API_BASE}/rentals/book`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to create rental reservation'));
    return res.json();
  },

  getMyNotifications: async (): Promise<AppNotification[]> => {
    const res = await fetch(`${API_BASE}/bookings/notifications/my`, { headers: getHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  // Acting Drivers (customer)
  getDriverPricing: async (): Promise<DriverPricing> => {
    const res = await fetch(`${API_BASE}/drivers/pricing`);
    if (!res.ok) throw new Error('Failed to load driver pricing');
    return res.json();
  },

  estimateDriverFare: async (data: {
    start_time: string;
    end_time: string;
    car_type: string;
    pickup_city?: string;
  }): Promise<DriverFareBreakdown> => {
    const res = await fetch(`${API_BASE}/drivers/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to estimate fare'));
    return res.json();
  },

  getAvailableDrivers: async (params?: {
    city?: string;
    transmission?: string;
    car_type?: string;
  }): Promise<DriverPublic[]> => {
    const q = new URLSearchParams();
    if (params?.city) q.set('city', params.city);
    if (params?.transmission) q.set('transmission', params.transmission);
    if (params?.car_type) q.set('car_type', params.car_type);
    const res = await fetch(`${API_BASE}/drivers/available?${q.toString()}`);
    if (!res.ok) return [];
    return res.json();
  },

  createDriverBooking: async (data: DriverBookingCreate): Promise<DriverBooking> => {
    const res = await fetch(`${API_BASE}/drivers/bookings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to request a driver'));
    return res.json();
  },

  getMyDriverBookings: async (): Promise<DriverBooking[]> => {
    const res = await fetch(`${API_BASE}/drivers/bookings/my`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to load driver trips'));
    return res.json();
  },

  getDriverBooking: async (bookingId: number): Promise<DriverBooking> => {
    const res = await fetch(`${API_BASE}/drivers/bookings/${bookingId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Driver trip not found'));
    return res.json();
  },

  cancelDriverBooking: async (bookingId: number, reason?: string): Promise<DriverBooking> => {
    const res = await fetch(`${API_BASE}/drivers/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason: reason || null }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to cancel trip'));
    return res.json();
  },

  createDriverPaymentOrder: async (bookingId: number): Promise<DriverPaymentOrder> => {
    const res = await fetch(`${API_BASE}/drivers/bookings/${bookingId}/pay/create-order`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to start payment'));
    return res.json();
  },

  verifyDriverPayment: async (
    bookingId: number,
    data: { order_id: string; payment_id: string; signature: string }
  ): Promise<DriverBooking> => {
    const res = await fetch(`${API_BASE}/drivers/bookings/${bookingId}/pay/verify`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Payment verification failed'));
    return res.json();
  },

  rateDriverTrip: async (bookingId: number, rating: number, comment?: string): Promise<DriverBooking> => {
    const res = await fetch(`${API_BASE}/drivers/bookings/${bookingId}/rate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ rating, comment: comment || null }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to submit rating'));
    return res.json();
  },
};



