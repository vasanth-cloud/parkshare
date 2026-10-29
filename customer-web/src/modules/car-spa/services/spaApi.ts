import { api } from '../../../services/api';
import type { CarSpaBooking, CarSpaCenter, CarSpaPaymentOrder } from '../../../types';

/**
 * Thin module wrapper around the authenticated customer car-spa API.
 */
export const spaApi = {
  listCenters: (params?: { city?: string; lat?: number; lng?: number }): Promise<CarSpaCenter[]> =>
    api.listCarSpas(params),

  getCenter: (centerId: number): Promise<CarSpaCenter> => api.getCarSpa(centerId),

  createBooking: (data: {
    center_id: number;
    service_id: number;
    wanted_date: string;
    customer_note?: string;
  }): Promise<CarSpaBooking> => api.createCarSpaBooking(data),

  myBookings: (): Promise<CarSpaBooking[]> => api.getMyCarSpaBookings(),

  getBooking: (bookingId: number): Promise<CarSpaBooking> => api.getCarSpaBooking(bookingId),

  createPaymentOrder: (bookingId: number): Promise<CarSpaPaymentOrder> =>
    api.createCarSpaPaymentOrder(bookingId),

  verifyPayment: (
    bookingId: number,
    data: { order_id: string; payment_id: string; signature: string }
  ): Promise<CarSpaBooking> => api.verifyCarSpaPayment(bookingId, data),

  cancelBooking: (bookingId: number): Promise<CarSpaBooking> => api.cancelCarSpaBooking(bookingId),
};
