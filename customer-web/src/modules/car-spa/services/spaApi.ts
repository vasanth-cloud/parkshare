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
      console.warn('Using client fallback spa packages:', err);
      return [
        {
          id: 'ECO_EXPRESS',
          name: 'Eco Waterless Express',
          tagline: 'Quick 30-min exterior shine',
          price: 199,
          durationMinutes: 30,
          features: [
            'Polymer waterless foam wash',
            'Scratch-free microfiber buffing',
            'Windshield & mirror de-greasing',
            'Tire dress & rim wipe',
          ],
          recommendedFor: 'Daily maintenance & dusty cars',
        },
        {
          id: 'FOAM_PRESSURE',
          name: 'Signature Foam Wash',
          tagline: 'Deep active foam & wheel care',
          price: 399,
          durationMinutes: 45,
          popular: true,
          features: [
            'High-pressure water rinse',
            'pH-neutral snow foam bath',
            'Deep alloy rim & brake dust removal',
            'Door jamb cleaning & wiper blade degrease',
            'Tire conditioning gloss',
          ],
          recommendedFor: 'Weekly wash & highway trips',
        },
      ];
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
