import {
  User, ParkingListing, Booking, HostSummary, VerificationStatus, CarSpaCenter, Review, RentalPartnerVehicle, RcVerificationResult,
  DriverProfile, DriverRegistrationPayload, DriverEarnings, DriverPricing, DriverBooking,
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
    if (port === '5174' || port === '5173') {
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
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const uploadsIdx = url.indexOf('/uploads/');
  if (uploadsIdx !== -1) {
    const uploadPath = url.substring(uploadsIdx);
    if (typeof window !== 'undefined') {
      const port = window.location.port;
      if (port === '5174' || port === '5173') {
        return uploadPath;
      }
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') {
        return uploadPath;
      }
    }
    return `${BACKEND_BASE}${uploadPath}`;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${BACKEND_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('parkshare_host_token');
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
      body: JSON.stringify({ email, password, portal: 'host' }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Login failed'));
    return res.json();
  },

  registerHost: async (data: any) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, role: 'HOST', portal: 'host' }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Registration failed'));
    return res.json();
  },

  getMe: async (): Promise<User> => {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
    if (!res.ok) {
      const err = new Error(await extractErrorMessage(res, 'Unauthorized'));
      (err as any).status = res.status;
      throw err;
    }
    return res.json();
  },

  becomeHost: async (data: any) => {
    const res = await fetch(`${API_BASE}/auth/become-host`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Host profile setup failed'));
    return res.json();
  },

  getHostSummary: async (): Promise<HostSummary> => {
    const res = await fetch(`${API_BASE}/auth/host-summary`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch host summary');
    return res.json();
  },

  updateProfilePhoto: async (profile_photo_url: string): Promise<User> => {
    try {
      const res = await fetch(`${API_BASE}/auth/profile-photo`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ profile_photo_url }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Backend update profile photo:', err);
    }
    return {} as any;
  },



  // Listings
  createListing: async (data: any): Promise<ParkingListing> => {
    const res = await fetch(`${API_BASE}/listings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to create space listing'));
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

  updateListing: async (id: number, data: any): Promise<ParkingListing> => {
    const res = await fetch(`${API_BASE}/listings/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to update space listing'));
    return res.json();
  },

  resubmitListing: async (id: number): Promise<ParkingListing> => {
    const res = await fetch(`${API_BASE}/listings/${id}/resubmit`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to resubmit space listing'));
    return res.json();
  },

  deleteListing: async (id: number): Promise<{ message: string; id: number }> => {
    const res = await fetch(`${API_BASE}/listings/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to delete space listing'));
    return res.json();
  },

  // PIN Verification / Check-in Tool
  getHostBookings: async (): Promise<Booking[]> => {
    const res = await fetch(`${API_BASE}/bookings/host-bookings`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch host bookings');
    return res.json();
  },

  confirmKeyReceived: async (booking_id: number): Promise<Booking> => {
    const res = await fetch(`${API_BASE}/bookings/${booking_id}/confirm-key-received`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to confirm key handover'));
    return res.json();
  },

  generateReleaseOtp: async (booking_id: number): Promise<{ booking_id: number; release_otp: string; expires_at: string; message: string }> => {
    const res = await fetch(`${API_BASE}/bookings/${booking_id}/generate-release-otp`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to generate release OTP'));
    return res.json();
  },

  checkInSession: async (data: { booking_reference?: string; verification_code?: string; qr_token?: string }) => {
    const res = await fetch(`${API_BASE}/parking-sessions/check-in`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'PIN verification / Check-in failed');
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
    if (!res.ok) throw new Error('Failed to fetch disputes');
    return res.json();
  },

  getReviewsByListing: async (listing_id: number): Promise<Review[]> => {
    const res = await fetch(`${API_BASE}/reviews/listing/${listing_id}`);
    if (!res.ok) return [];
    return res.json();
  },

  // Host Identity Verification APIs
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

  submitHostIdentity: async (data: {
    legal_name: string;
    profile_photo_url: string;
    gov_id_type: string;
    gov_id_number: string;
    gov_id_document_url?: string;
  }): Promise<VerificationStatus> => {
    const res = await fetch(`${API_BASE}/verification/submit-identity`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Identity verification failed'));
    return res.json();
  },

  uploadFile: async (file: File | Blob, filename: string = 'upload.jpg'): Promise<{ success: boolean; filename: string; url: string }> => {
    const formData = new FormData();
    formData.append('file', file, filename);
    const token = localStorage.getItem('parkshare_host_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}/verification/upload-file`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to upload verification file'));
    const data = await res.json();
    return data;
  },

  getVerificationStatus: async (): Promise<VerificationStatus> => {
    const res = await fetch(`${API_BASE}/verification/status`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch verification status');
    return res.json();
  },

  // Acting Drivers Partner APIs
  registerDriver: async (data: DriverRegistrationPayload): Promise<DriverProfile> => {
    const res = await fetch(`${API_BASE}/drivers/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to submit driver registration'));
    return res.json();
  },

  /** Returns null when the logged-in user has not registered as a driver yet. */
  getMyDriverProfile: async (): Promise<DriverProfile | null> => {
    const res = await fetch(`${API_BASE}/drivers/me`, { headers: getHeaders() });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to load driver profile'));
    return res.json();
  },

  setDriverAvailability: async (is_available: boolean): Promise<DriverProfile> => {
    const res = await fetch(`${API_BASE}/drivers/me/availability`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ is_available }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to update availability'));
    return res.json();
  },

  getDriverEarnings: async (): Promise<DriverEarnings> => {
    const res = await fetch(`${API_BASE}/drivers/me/earnings`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to load earnings'));
    return res.json();
  },

  getDriverPricing: async (): Promise<DriverPricing> => {
    const res = await fetch(`${API_BASE}/drivers/pricing`);
    if (!res.ok) throw new Error('Failed to load driver pricing');
    return res.json();
  },

  getDriverOpenRequests: async (): Promise<DriverBooking[]> => {
    const res = await fetch(`${API_BASE}/drivers/me/requests`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to load trip requests'));
    return res.json();
  },

  getDriverTrips: async (): Promise<DriverBooking[]> => {
    const res = await fetch(`${API_BASE}/drivers/me/trips`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to load trips'));
    return res.json();
  },

  acceptDriverRequest: async (bookingId: number): Promise<DriverBooking> => {
    const res = await fetch(`${API_BASE}/drivers/bookings/${bookingId}/accept`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to accept request'));
    return res.json();
  },

  releaseDriverRequest: async (bookingId: number, reason?: string): Promise<DriverBooking> => {
    const res = await fetch(`${API_BASE}/drivers/bookings/${bookingId}/release`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason: reason || null }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to release trip'));
    return res.json();
  },

  startDriverTrip: async (bookingId: number, otp: string): Promise<DriverBooking> => {
    const res = await fetch(`${API_BASE}/drivers/bookings/${bookingId}/start`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ otp }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to start trip'));
    return res.json();
  },

  endDriverTrip: async (bookingId: number, otp: string): Promise<DriverBooking> => {
    const res = await fetch(`${API_BASE}/drivers/bookings/${bookingId}/end`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ otp }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to end trip'));
    return res.json();
  },

  // Car Spa & Detailing Partner APIs
  registerCarSpa: async (data: any): Promise<CarSpaCenter> => {
    const res = await fetch(`${API_BASE}/car-spa/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to submit car spa registration'));
    return res.json();
  },

  getCarSpas: async (): Promise<CarSpaCenter[]> => {
    const res = await fetch(`${API_BASE}/car-spa/all`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to load car spas directory');
    return res.json();
  },

  // Rental Vehicle Fleet Partner APIs
  registerRentalVehicle: async (data: any): Promise<RentalPartnerVehicle> => {
    const res = await fetch(`${API_BASE}/rentals/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to submit rental vehicle registration'));
    return res.json();
  },

  getRentalVehicles: async (): Promise<RentalPartnerVehicle[]> => {
    const res = await fetch(`${API_BASE}/rentals/all`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to load rental fleet directory');
    return res.json();
  },

  verifyRcNumber: async (reg: string): Promise<RcVerificationResult> => {
    const res = await fetch(`${API_BASE}/rentals/verify-rc`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reg, consent: true }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to verify vehicle RC number'));
    return res.json();
  },

  updateRentalVehicleStatus: async (vehicleId: string, status: string, reason?: string): Promise<RentalPartnerVehicle> => {
    const res = await fetch(`${API_BASE}/rentals/${vehicleId}/status`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ status, reason }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to update vehicle status'));
    return res.json();
  },
};

