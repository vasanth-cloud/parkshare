export type VehicleCategory = 'HATCHBACK' | 'SEDAN' | 'SUV' | 'BIKE';
export type SpaLocationType = 'DOORSTEP' | 'PARKSHARE_BAY';

export interface SpaPackage {
  id: string;
  name: string;
  tagline: string;
  price: number;
  durationMinutes: number;
  popular?: boolean;
  features: string[];
  recommendedFor: string;
}

export interface SpaBookingRequest {
  packageId: string;
  vehicleCategory: VehicleCategory;
  locationType: SpaLocationType;
  address: string;
  parkingListingId?: number;
  date: string;
  timeSlot: string;
  notes?: string;
}

export interface SpaBookingResponse {
  bookingId: string;
  package: SpaPackage;
  vehicleCategory: VehicleCategory;
  locationType: SpaLocationType;
  address: string;
  date: string;
  timeSlot: string;
  finalPrice: number;
  otp: number;
  status: 'PENDING' | 'CONFIRMED' | 'SPECIALIST_ASSIGNED' | 'WASH_IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}
