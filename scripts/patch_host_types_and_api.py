import os

# 1. Update host-web/src/types/index.ts
types_file = os.path.join("host-web", "src", "types", "index.ts")
with open(types_file, "r", encoding="utf-8") as f:
    types_content = f.read().replace("\r\n", "\n")

booking_interface = """
export interface RentalPartnerBooking {
  bookingId: string;
  vehicle: RentalPartnerVehicle;
  customerName: string;
  customerPhone: string;
  pickupDate: string;
  returnDate: string;
  pickupTime: string;
  returnTime?: string;
  deliveryType: 'HUB_PICKUP' | 'DOORSTEP_DELIVERY';
  doorstepAddress?: string;
  totalFare: number;
  securityDeposit: number;
  insuranceFee: number;
  grandTotal: number;
  otp: number;
  status: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  tripStartedAt?: string | null;
  tripCompletedAt?: string | null;
  hostLat?: number | null;
  hostLng?: number | null;
  customerLat?: number | null;
  customerLng?: number | null;
  ownerName?: string;
  ownerPhone?: string;
  ownerAddress?: string;
  paymentStatus?: string;
}
"""

if "RentalPartnerBooking" not in types_content:
    types_content += "\n" + booking_interface.strip() + "\n"
    with open(types_file, "w", encoding="utf-8") as f:
        f.write(types_content)
    print("Added RentalPartnerBooking to host-web/src/types/index.ts")

# 2. Update host-web/src/services/api.ts
api_file = os.path.join("host-web", "src", "services", "api.ts")
with open(api_file, "r", encoding="utf-8") as f:
    api_content = f.read().replace("\r\n", "\n")

target = """  updateRentalVehicleStatus: async (vehicleId: string, status: string, reason?: string): Promise<RentalPartnerVehicle> => {
    const res = await fetch(`${API_BASE}/rentals/${vehicleId}/status`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ status, reason }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to update vehicle status'));
    return res.json();
  },"""

replacement = """  updateRentalVehicleStatus: async (vehicleId: string, status: string, reason?: string): Promise<RentalPartnerVehicle> => {
    const res = await fetch(`${API_BASE}/rentals/${vehicleId}/status`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ status, reason }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to update vehicle status'));
    return res.json();
  },

  getRentalBookings: async (params?: { partnerPhone?: string }): Promise<any[]> => {
    const q = new URLSearchParams();
    if (params?.partnerPhone) q.set('partner_phone', params.partnerPhone);
    const res = await (typeof safeFetch !== 'undefined' ? safeFetch : fetch)(`${API_BASE}/rentals/bookings?${q.toString()}`, {
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  },

  verifyRentalHandoverOtp: async (bookingId: string, otp: number): Promise<any> => {
    const res = await (typeof safeFetch !== 'undefined' ? safeFetch : fetch)(`${API_BASE}/rentals/bookings/${bookingId}/verify-otp`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ otp }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Invalid Handover OTP'));
    return res.json();
  },

  completeRentalTrip: async (bookingId: string, returnNotes?: string, finalOdometer?: number): Promise<any> => {
    const res = await (typeof safeFetch !== 'undefined' ? safeFetch : fetch)(`${API_BASE}/rentals/bookings/${bookingId}/complete`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ returnNotes, finalOdometer }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to complete rental trip'));
    return res.json();
  },"""

if target in api_content:
    api_content = api_content.replace(target, replacement)
    with open(api_file, "w", encoding="utf-8") as f:
        f.write(api_content)
    print("Successfully patched host-web/src/services/api.ts")
else:
    print("Target not found in host api.ts")

