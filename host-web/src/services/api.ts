import { User, ParkingListing, Booking, HostSummary, VerificationStatus } from '../types';


const rawApiUrl = (import.meta as any).env?.VITE_API_URL;
const API_BASE = rawApiUrl 
  ? `${rawApiUrl.replace(/\/+$/, '')}/api/v1` 
  : '/api/v1';

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
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Login failed'));
    return res.json();
  },

  registerHost: async (data: any) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, role: 'HOST' }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Registration failed'));
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
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Host profile setup failed'));
    return res.json();
  },

  getHostSummary: async (): Promise<HostSummary> => {
    const res = await fetch(`${API_BASE}/auth/host-summary`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch host summary');
    return res.json();
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
    return res.json();
  },

  getVerificationStatus: async (): Promise<VerificationStatus> => {
    const res = await fetch(`${API_BASE}/verification/status`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch verification status');
    return res.json();
  }
};

