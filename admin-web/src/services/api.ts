import { User, ParkingListing, AdminStats, Dispute, DriverProfile, CarSpaCenter } from '../types';

function resolveBackendBase(): string {
  const rawApiUrl = (import.meta as any).env?.VITE_API_URL;
  if (rawApiUrl) {
    return `${rawApiUrl.replace(/\/+$/, '')}/api/v1`;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:8000/api/v1';
    }
  }
  return 'https://parkshare-backend-9anh.onrender.com/api/v1';
}

const API_BASE = resolveBackendBase();

export function getFullImageUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  
  // Extract upload path if URL contains /uploads/ (even if prefixed with an unreachable LAN IP or other domain)
  const uploadsIdx = url.indexOf('/uploads/');
  if (uploadsIdx !== -1) {
    const uploadPath = url.substring(uploadsIdx); // e.g. "/uploads/kyc_84a8b2f85cf0.jpg"
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      // In local dev on localhost, use relative path which Vite proxies to port 8000
      if (host === 'localhost' || host === '127.0.0.1') {
        return uploadPath;
      }
    }
    const backendOrigin = API_BASE.replace(/\/api\/v1\/?$/, '');
    return `${backendOrigin}${uploadPath}`;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return cleanPath;
}

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('parkshare_admin_token');
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

  getMe: async (): Promise<User> => {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Unauthorized');
    return res.json();
  },

  // Admin Controls
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

  getAllListings: async (): Promise<ParkingListing[]> => {
    const res = await fetch(`${API_BASE}/admin/listings/all`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to load listings');
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

  getAllUsers: async (role?: string, search?: string): Promise<User[]> => {
    const query = new URLSearchParams();
    if (role) query.append('role', role);
    if (search) query.append('search', search);

    const res = await fetch(`${API_BASE}/admin/users?${query.toString()}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch user directory');
    return res.json();
  },

  toggleUserStatus: async (user_id: number) => {
    const res = await fetch(`${API_BASE}/admin/users/${user_id}/toggle-status`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to toggle user status');
    return res.json();
  },

  // Dispute & Report Moderation
  getAdminDisputes: async (status?: string): Promise<Dispute[]> => {
    const query = status ? `?status=${status}` : '';
    const res = await fetch(`${API_BASE}/admin/disputes${query}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to load disputes');
    return res.json();
  },

  resolveAdminDispute: async (dispute_id: number, status: 'UNDER_INVESTIGATION' | 'RESOLVED' | 'REJECTED', resolution_notes: string): Promise<Dispute> => {
    const res = await fetch(`${API_BASE}/admin/disputes/${dispute_id}/resolve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ status, resolution_notes }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to update dispute');
    return res.json();
  },

  // Acting Drivers Administration
  getDrivers: async (status?: string, city?: string): Promise<DriverProfile[]> => {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);
    if (city) params.append('city', city);
    const query = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`${API_BASE}/drivers/all${query}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to load drivers directory');
    return res.json();
  },

  registerDriver: async (data: any): Promise<DriverProfile> => {
    const res = await fetch(`${API_BASE}/drivers/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to register driver');
    return res.json();
  },

  updateDriverStatus: async (driverId: string, status: string, reason?: string): Promise<DriverProfile> => {
    const res = await fetch(`${API_BASE}/drivers/${driverId}/status`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ status, reason }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to update driver status');
    return res.json();
  },

  // Car Spa & Detailing Administration
  getCarSpas: async (status?: string, city?: string): Promise<CarSpaCenter[]> => {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);
    if (city) params.append('city', city);
    const query = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`${API_BASE}/car-spa/all${query}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to load car spas directory');
    return res.json();
  },

  registerCarSpa: async (data: any): Promise<CarSpaCenter> => {
    const res = await fetch(`${API_BASE}/car-spa/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to register car spa');
    return res.json();
  },

  updateCarSpaStatus: async (spaId: string, status: string, reason?: string): Promise<CarSpaCenter> => {
    const res = await fetch(`${API_BASE}/car-spa/${spaId}/status`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ status, reason }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to update car spa status');
    return res.json();
  },
};

