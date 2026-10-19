import { api } from '../../../services/api';
import { DriverBooking, DriverBookingCreate, DriverPublic } from '../../../types';

/**
 * Thin wrapper around the real ParkCo acting-driver APIs.
 * Kept so any leftover module imports continue to work.
 */
export const driverApi = {
  getAvailableDrivers(params?: { city?: string; transmission?: string; car_type?: string }): Promise<DriverPublic[]> {
    return api.getAvailableDrivers(params);
  },

  createBooking(data: DriverBookingCreate): Promise<DriverBooking> {
    return api.createDriverBooking(data);
  },

  getBookingStatus(bookingId: number | string): Promise<DriverBooking> {
    return api.getDriverBooking(Number(bookingId));
  },
};
