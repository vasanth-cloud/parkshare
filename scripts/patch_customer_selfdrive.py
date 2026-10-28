import os

file_path = os.path.join("customer-web", "src", "pages", "SelfDriveRentalPage.tsx")
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read().replace("\r\n", "\n")

# 1. Add component imports
imports_anchor = "import { CustomerProfilePage } from './CustomerProfilePage';"
new_imports = """import { CustomerProfilePage } from './CustomerProfilePage';
import { RentalRouteNavigationMap } from '../components/RentalRouteNavigationMap';
import { LiveRentalTimer } from '../components/LiveRentalTimer';"""

if imports_anchor in content:
    content = content.replace(imports_anchor, new_imports)
    print("Added RentalRouteNavigationMap and LiveRentalTimer imports")
else:
    print("Could not find imports_anchor")

# 2. Add userCoords state & geolocation on mount
state_anchor = "  const [vehicles, setVehicles] = useState<RentalVehicle[]>(DEFAULT_RENTAL_FLEET);"
new_state = """  const [vehicles, setVehicles] = useState<RentalVehicle[]>(DEFAULT_RENTAL_FLEET);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);"""

if state_anchor in content:
    content = content.replace(state_anchor, new_state)
    print("Added userCoords state")
else:
    print("Could not find state_anchor")

# 3. Update fetchVehicles to accept lat, lng, and query, and request geolocation
old_fetch_vehicles = """  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const data = await api.getRentalVehicles();
      if (Array.isArray(data)) {
        setVehicles(data);
      } else {
        setVehicles([]);
      }
    } catch {
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };"""

new_fetch_vehicles = """  const fetchVehicles = async (lat?: number, lng?: number, queryStr?: string) => {
    setLoading(true);
    try {
      const effLat = lat !== undefined ? lat : userCoords?.lat;
      const effLng = lng !== undefined ? lng : userCoords?.lng;
      const effQuery = queryStr !== undefined ? queryStr : searchQuery;
      const data = await api.getRentalVehicles({
        lat: effLat,
        lng: effLng,
        query: effQuery,
        type: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        transmission: transmissionFilter !== 'ANY' ? transmissionFilter : undefined,
      });
      if (Array.isArray(data)) {
        setVehicles(data);
      } else {
        setVehicles([]);
      }
    } catch {
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  // Live Location & GPS permission on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserCoords(coords);
          fetchVehicles(coords.lat, coords.lng, searchQuery);
        },
        (err) => {
          console.warn('Geolocation access:', err.message);
          fetchVehicles();
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      fetchVehicles();
    }
  }, []);

  // Search input debounce re-fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVehicles(userCoords?.lat, userCoords?.lng, searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, categoryFilter, transmissionFilter]);

  // Active booking status polling (checks every 2.5 seconds if host verified OTP)
  useEffect(() => {
    const activeBookingId = confirmedBooking?.bookingId;
    const interval = setInterval(async () => {
      if (activeBookingId) {
        try {
          const res = await api.getRentalBookings({ bookingId: activeBookingId });
          if (Array.isArray(res) && res.length > 0) {
            const latest = res[0];
            if (latest.status !== confirmedBooking?.status || latest.tripStartedAt !== confirmedBooking?.tripStartedAt) {
              setConfirmedBooking(latest);
              setRentalBookings(prev => prev.map(b => b.bookingId === latest.bookingId ? latest : b));
            }
          }
        } catch {}
      }
      if (activeTab === 'bookings' && customerPhone) {
        try {
          const list = await api.getRentalBookings({ phone: customerPhone });
          if (Array.isArray(list) && list.length > 0) {
            setRentalBookings(list);
          }
        } catch {}
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [confirmedBooking?.bookingId, confirmedBooking?.status, activeTab, customerPhone]);"""

if old_fetch_vehicles in content:
    content = content.replace(old_fetch_vehicles, new_fetch_vehicles)
    print("Replaced fetchVehicles and added geolocation/polling hooks")
else:
    print("Could not find old_fetch_vehicles")

# 4. In vehiclesWithProximity, use vehicle.distanceKm if provided by backend
old_prox = """  const vehiclesWithProximity = useMemo(() => {
    return vehicles.map(v => {
      const dist = getProximityKm(v, selectedArea);
      return { ...v, distance_km: dist };
    });
  }, [vehicles, selectedArea]);"""

new_prox = """  const vehiclesWithProximity = useMemo(() => {
    return vehicles.map(v => {
      const dist = v.distanceKm !== undefined && v.distanceKm !== null ? v.distanceKm : getProximityKm(v, selectedArea);
      return { ...v, distance_km: dist, distanceKm: dist };
    });
  }, [vehicles, selectedArea]);"""

if old_prox in content:
    content = content.replace(old_prox, new_prox)
    print("Replaced vehiclesWithProximity")
else:
    print("Could not find old_prox")

# 5. In filteredVehicles, default sort is nearest first
old_sort = """    if (sortBy === 'PRICE_ASC') {
      result = [...result].sort((a, b) => a.dailyRate - b.dailyRate);
    } else if (sortBy === 'PRICE_DESC') {
      result = [...result].sort((a, b) => b.dailyRate - a.dailyRate);
    } else if (sortBy === 'RATING') {
      result = [...result].sort((a, b) => (b.rating || 5) - (a.rating || 5));
    }

    return result;"""

new_sort = """    if (sortBy === 'PRICE_ASC') {
      result = [...result].sort((a, b) => a.dailyRate - b.dailyRate);
    } else if (sortBy === 'PRICE_DESC') {
      result = [...result].sort((a, b) => b.dailyRate - a.dailyRate);
    } else if (sortBy === 'RATING') {
      result = [...result].sort((a, b) => (b.rating || 5) - (a.rating || 5));
    } else {
      // Default: sort nearest first!
      result = [...result].sort((a, b) => {
        const distA = a.distanceKm ?? a.distance_km ?? 999;
        const distB = b.distanceKm ?? b.distance_km ?? 999;
        return distA - distB;
      });
    }

    return result;"""

if old_sort in content:
    content = content.replace(old_sort, new_sort)
    print("Replaced sorting to nearest first")
else:
    print("Could not find old_sort")

# 6. In handleConfirmBooking, call fetchVehicles immediately after booking so vehicle is hidden
old_booking_success = """      setConfirmedBooking(enrichedBooking);

      // Prepend to saved bookings list
      const updatedList = [enrichedBooking, ...rentalBookings];
      saveRentalBookings(updatedList);"""

new_booking_success = """      setConfirmedBooking(enrichedBooking);
      // Immediately refresh fleet so this booked vehicle is hidden for other customers!
      fetchVehicles();

      // Prepend to saved bookings list
      const updatedList = [enrichedBooking, ...rentalBookings];
      saveRentalBookings(updatedList);"""

if old_booking_success in content:
    content = content.replace(old_booking_success, new_booking_success)
    print("Added instant fleet refresh on booking")
else:
    print("Could not find old_booking_success")

# 7. Update Confirmation Modal with OTP, LiveRentalTimer, and RentalRouteNavigationMap
old_confirmed_modal = """            {confirmedBooking ? (
              /* Success / Reservation Confirmed State */
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/30 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-black text-emerald-800 dark:text-emerald-300">
                    Rental Reservation Confirmed!
                  </h4>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    Booking ID: <strong className="font-mono">{confirmedBooking.bookingId}</strong>
                  </p>
                </div>

                {/* Big OTP Handover Pass */}
                <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-500 text-center space-y-1 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider">
                    Show this OTP at Handover
                  </span>
                  <div className="text-3xl font-black font-mono text-slate-900 dark:text-white tracking-widest">
                    {confirmedBooking.otp}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Present this OTP to host upon vehicle pickup
                  </span>
                </div>

                {/* Host Details Unlocked */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-2 text-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Host & Pickup Location
                  </span>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Host: {confirmedBooking.ownerName}
                    </span>
                    <a
                      href={`tel:${confirmedBooking.ownerPhone}`}
                      className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{confirmedBooking.ownerPhone}</span>
                    </a>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    📍 {confirmedBooking.doorstepAddress || confirmedBooking.ownerAddress}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVehicle(null);
                      setConfirmedBooking(null);
                      handleTabChange('bookings');
                    }}
                    className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition text-center"
                  >
                    View in Bookings Tab →
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVehicle(null);
                      setConfirmedBooking(null);
                    }}
                    className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : ("""

new_confirmed_modal = """            {confirmedBooking ? (
              /* Success / Reservation Confirmed State */
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/30 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-black text-emerald-800 dark:text-emerald-300">
                    {confirmedBooking.status === 'IN_PROGRESS' ? 'Rental Trip Active & In Progress!' : 'Rental Reservation Confirmed!'}
                  </h4>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    Booking ID: <strong className="font-mono">{confirmedBooking.bookingId}</strong>
                  </p>
                </div>

                {/* OTP or Live Trip Timer */}
                {confirmedBooking.status === 'IN_PROGRESS' ? (
                  <LiveRentalTimer
                    status={confirmedBooking.status}
                    tripStartedAt={confirmedBooking.tripStartedAt}
                    pickupTime={confirmedBooking.pickupTime}
                  />
                ) : (
                  <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-500 text-center space-y-2 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider block">
                      Show this OTP to Host to Start Rental
                    </span>
                    <div className="text-4xl font-black font-mono text-slate-900 dark:text-white tracking-widest py-1">
                      {confirmedBooking.otp}
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-400 block font-medium">
                      Show this 4-digit OTP to the host upon reaching the hub. Once the host enters this OTP, your rental timer will start.
                    </span>
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-800 dark:text-amber-300 font-bold bg-amber-100/70 dark:bg-amber-900/50 py-1.5 px-3 rounded-xl">
                      <Clock className="w-3.5 h-3.5 animate-spin text-amber-600" />
                      <span>Timer starts automatically when Host enters OTP</span>
                    </div>
                  </div>
                )}

                {/* Host Details Unlocked */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-2 text-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Host & Pickup Location
                  </span>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Host: {confirmedBooking.ownerName}
                    </span>
                    <a
                      href={`tel:${confirmedBooking.ownerPhone}`}
                      className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{confirmedBooking.ownerPhone}</span>
                    </a>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    📍 {confirmedBooking.doorstepAddress || confirmedBooking.ownerAddress}
                  </p>
                </div>

                {/* Route Map Section & Google Maps Navigation */}
                <RentalRouteNavigationMap
                  customerCoords={userCoords}
                  hostCoords={{ lat: confirmedBooking.hostLat || 12.9716, lng: confirmedBooking.hostLng || 77.6412 }}
                  hostAddress={confirmedBooking.doorstepAddress || confirmedBooking.ownerAddress || confirmedBooking.vehicle.hubAddress}
                  hostName={confirmedBooking.ownerName}
                  doorstepAddress={confirmedBooking.doorstepAddress}
                />

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVehicle(null);
                      setConfirmedBooking(null);
                      handleTabChange('bookings');
                    }}
                    className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition text-center cursor-pointer"
                  >
                    View in Bookings Tab →
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVehicle(null);
                      setConfirmedBooking(null);
                    }}
                    className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : ("""

if old_confirmed_modal in content:
    content = content.replace(old_confirmed_modal, new_confirmed_modal)
    print("Replaced confirmedBooking modal")
else:
    print("Could not find old_confirmed_modal")

# 8. Update renderVehicleCard to show distance badge
old_card_loc = """              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1 mt-0.5">
                <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                <span className="truncate">{vehicle.hubAddress}</span>
              </p>"""

new_card_loc = """              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1 truncate">
                  <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="truncate">{vehicle.hubAddress}</span>
                </p>
                {(vehicle.distanceKm !== undefined && vehicle.distanceKm !== null || vehicle.distance_km !== undefined) && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 font-extrabold text-[10px] border border-emerald-500/20 shrink-0">
                    📍 {((vehicle.distanceKm ?? vehicle.distance_km) as number).toFixed(1)} km away
                  </span>
                )}
              </div>"""

if old_card_loc in content:
    content = content.replace(old_card_loc, new_card_loc)
    print("Replaced vehicle card location and added distance badge")
else:
    print("Could not find old_card_loc")

# 9. Update Bookings Tab cards to show Timer, OTP, and Route Map
old_booking_card = """                {/* Pickup Handover OTP Box */}
                <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-500/30 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 block">
                        Pickup Verification OTP
                      </span>
                      <span className="text-sm font-black text-slate-900 dark:text-white font-mono tracking-wider">
                        {b.otp}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(b.otp)}
                    className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-white/80 dark:bg-slate-900/80 px-2.5 py-1 rounded-xl border border-amber-500/20 hover:bg-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedOtp === b.otp ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>"""

new_booking_card = """                {/* Handover OTP / Live Rental Timer */}
                {b.status === 'IN_PROGRESS' ? (
                  <LiveRentalTimer
                    status={b.status}
                    tripStartedAt={b.tripStartedAt}
                    pickupTime={b.pickupTime}
                  />
                ) : (
                  <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 block">
                            Show this OTP to Host Upon Arrival
                          </span>
                          <span className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-widest">
                            {b.otp}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(b.otp)}
                        className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-white/80 dark:bg-slate-900/80 px-2.5 py-1 rounded-xl border border-amber-500/20 hover:bg-white flex items-center gap-1 cursor-pointer"
                      >
                        {copiedOtp === b.otp ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Code</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1 font-medium bg-amber-100/60 dark:bg-amber-900/40 py-1 px-2.5 rounded-lg">
                      <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" />
                      <span>Timer starts once host enters this OTP at handover.</span>
                    </div>
                  </div>
                )}

                {/* Route Navigation Map */}
                <RentalRouteNavigationMap
                  customerCoords={userCoords}
                  hostCoords={{ lat: b.hostLat || 12.9716, lng: b.hostLng || 77.6412 }}
                  hostAddress={b.doorstepAddress || b.ownerAddress || b.vehicle.hubAddress}
                  hostName={b.ownerName}
                  doorstepAddress={b.doorstepAddress}
                />"""

if old_booking_card in content:
    content = content.replace(old_booking_card, new_booking_card)
    print("Replaced Bookings Tab card with Timer and Route Map")
else:
    print("Could not find old_booking_card")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated customer-web/src/pages/SelfDriveRentalPage.tsx")

