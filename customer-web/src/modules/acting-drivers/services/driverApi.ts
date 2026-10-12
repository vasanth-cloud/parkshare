import { DriverProfile, DriverBookingRequest, DriverBookingResponse } from '../types';

const API_BASE = '/api/v1/drivers';

/**
 * Acting Drivers API client
 * Use this service to interact with the backend Acting Drivers endpoints.
 */
export const driverApi = {
  /**
   * Fetch available drivers around a specific city/location
   */
  async getAvailableDrivers(params?: { city?: string; transmission?: string }): Promise<DriverProfile[]> {
    try {
      const query = new URLSearchParams(params as any).toString();
      const res = await fetch(`${API_BASE}/available?${query}`);
      if (!res.ok) throw new Error('Failed to fetch available drivers');
      return await res.json();
    } catch (err) {
      console.warn('Could not fetch drivers from API:', err);
      return [];
    }
  },

  /**
   * Create a new driver booking
   */
  async createBooking(data: DriverBookingRequest): Promise<DriverBookingResponse> {
    const res = await fetch(`${API_BASE}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error('Failed to book driver');
    }
    return await res.json();
  },

  /**
   * Get booking status by ID
   */
  async getBookingStatus(bookingId: string): Promise<DriverBookingResponse> {
    const res = await fetch(`${API_BASE}/bookings/${bookingId}`);
    if (!res.ok) throw new Error('Booking not found');
    return await res.json();
  },
};
