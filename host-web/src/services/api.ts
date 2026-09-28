import { User, ParkingListing, Booking, HostSummary } from '../types';


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

  // PIN Verification / Check-in Tool
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
  }
};

