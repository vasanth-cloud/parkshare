export type TripCategory = 'CITY' | 'NIGHT' | 'OUTSTATION' | 'VALET';
export type TransmissionPreference = 'ANY' | 'MANUAL' | 'AUTOMATIC';

export interface DriverProfile {
  id: string;
  name: string;
  photo: string;
  rating: number;
  trips: number;
  experienceYears: number;
  transmission: string[];
  languages: string[];
  badge: string;
  eta: string;
  hourlyRate: number;
  phoneNumber?: string;
  isAvailable?: boolean;
}

export interface DriverBookingRequest {
  tripType: TripCategory;
  transmission: TransmissionPreference;
  pickupLocation: string;
  durationHours: number;
  bookingDate: string;
  bookingTime: string;
  driverId?: string;
  notes?: string;
}

export interface DriverBookingResponse {
  bookingId: string;
  driver: DriverProfile;
  tripType: TripCategory;
  pickupLocation: string;
  durationHours: number;
  totalFare: number;
  otp: number;
  status: 'PENDING' | 'ACCEPTED' | 'DRIVER_EN_ROUTE' | 'STARTED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}
