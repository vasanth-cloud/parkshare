import { User, ParkingListing, AdminStats, Dispute } from '../types';

const rawApiUrl = (import.meta as any).env?.VITE_API_URL;
const API_BASE = rawApiUrl 
  ? `${rawApiUrl.replace(/\/+$/, '')}/api/v1` 
  : 'https://parkshare-backend-9anh.onrender.com/api/v1';

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
};

