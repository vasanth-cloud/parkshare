import { SpaPackage, SpaBookingRequest, SpaBookingResponse } from '../types';

const API_BASE = '/api/v1/car-spa';

/**
 * Car Spa API client
 * Use this service to interact with the backend Car Spa Detailing endpoints.
 */
export const spaApi = {
  /**
   * Fetch available spa & detailing packages
   */
  async getPackages(): Promise<SpaPackage[]> {
    try {
      const res = await fetch(`${API_BASE}/packages`);
      if (!res.ok) throw new Error('Failed to fetch spa packages');
      return await res.json();
    } catch (err) {
      console.warn('Spa packages unavailable:', err);
      return [];
    }
  },

  /**
   * Create a new car spa appointment
   */
  async createBooking(data: SpaBookingRequest): Promise<SpaBookingResponse> {
    const res = await fetch(`${API_BASE}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error('Failed to book spa appointment');
    }
    return await res.json();
  },

  /**
   * Get appointment status by ID
   */
  async getBookingStatus(bookingId: string): Promise<SpaBookingResponse> {
    const res = await fetch(`${API_BASE}/bookings/${bookingId}`);
    if (!res.ok) throw new Error('Appointment not found');
    return await res.json();
  },
};
