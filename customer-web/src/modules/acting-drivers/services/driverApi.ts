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
      console.warn('Using client fallback drivers:', err);
      return [
        {
          id: 'd1',
          name: 'Ramesh K. Kumar',
          photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
          rating: 4.96,
          trips: 1420,
          experienceYears: 9,
          transmission: ['Manual', 'Automatic', 'EV'],
          languages: ['Kannada', 'English', 'Hindi'],
          badge: 'Elite Chauffeur',
          eta: '8 mins away',
          hourlyRate: 149,
        },
        {
          id: 'd2',
          name: 'Suresh V. Gowda',
          photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
          rating: 4.92,
          trips: 980,
          experienceYears: 7,
          transmission: ['Automatic', 'Luxury SUV'],
          languages: ['Kannada', 'Telugu', 'English'],
          badge: 'Luxury Specialist',
          eta: '12 mins away',
          hourlyRate: 169,
        },
      ];
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
