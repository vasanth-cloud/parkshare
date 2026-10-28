import os

file_path = os.path.join("customer-web", "src", "services", "api.ts")
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """  getRentalVehicles: async (params?: { type?: string; transmission?: string; city?: string }): Promise<RentalVehicle[]> => {
    const query = new URLSearchParams();
    if (params?.type && params.type !== 'ALL') query.set('type', params.type);
    if (params?.transmission && params.transmission !== 'ANY') query.set('transmission', params.transmission);
    if (params?.city) query.set('city', params.city);

    const res = await safeFetch(`${API_BASE}/rentals/available?${query.toString()}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to fetch rental vehicles'));
    return res.json();
  },"""

replacement = """  getRentalVehicles: async (params?: { type?: string; transmission?: string; city?: string; lat?: number; lng?: number; query?: string }): Promise<RentalVehicle[]> => {
    const query = new URLSearchParams();
    if (params?.type && params.type !== 'ALL') query.set('type', params.type);
    if (params?.transmission && params.transmission !== 'ANY') query.set('transmission', params.transmission);
    if (params?.city) query.set('city', params.city);
    if (params?.lat !== undefined && params?.lat !== null) query.set('lat', params.lat.toString());
    if (params?.lng !== undefined && params?.lng !== null) query.set('lng', params.lng.toString());
    if (params?.query) query.set('query', params.query);

    const res = await safeFetch(`${API_BASE}/rentals/available?${query.toString()}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to fetch rental vehicles'));
    return res.json();
  },

  getRentalBookings: async (params?: { phone?: string; bookingId?: string }): Promise<RentalBooking[]> => {
    const q = new URLSearchParams();
    if (params?.phone) q.set('phone', params.phone);
    if (params?.bookingId) q.set('booking_id', params.bookingId);

    const res = await safeFetch(`${API_BASE}/rentals/bookings?${q.toString()}`, {
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  },"""

# Normalize both to \n
norm_content = content.replace("\r\n", "\n")
norm_target = target.replace("\r\n", "\n")
norm_replacement = replacement.replace("\r\n", "\n")

if norm_target in norm_content:
    updated = norm_content.replace(norm_target, norm_replacement)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(updated)
    print("Successfully patched customer-web/src/services/api.ts")
else:
    print("Could not find norm_target in content")

