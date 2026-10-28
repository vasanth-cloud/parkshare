import os

file_path = os.path.join("host-web", "src", "pages", "RentalDashboardPage.tsx")
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read().replace("\r\n", "\n")

# 1. Add LiveRentalTimer import if not present
if "import { LiveRentalTimer }" not in content:
    content = "import { LiveRentalTimer } from '../components/LiveRentalTimer';\n" + content

# 2. Update bookings state and add fetchHostBookings
old_bookings_decl = """  // Active & Upcoming Bookings
  const [bookings, setBookings] = useState<MockRentalBooking[]>(INITIAL_BOOKINGS);"""

new_bookings_decl = """  // Active & Upcoming Bookings
  const [bookings, setBookings] = useState<any[]>(INITIAL_BOOKINGS);

  const fetchHostBookings = async () => {
    try {
      const data = await api.getRentalBookings();
      if (Array.isArray(data) && data.length > 0) {
        setBookings(data);
      }
    } catch (err) {
      console.warn('Failed to load host bookings:', err);
    }
  };"""

if old_bookings_decl in content:
    content = content.replace(old_bookings_decl, new_bookings_decl)
    print("Replaced bookings declaration")
else:
    print("Could not find old_bookings_decl")

# 3. Call fetchHostBookings in useEffect
old_use_effect = """  useEffect(() => {
    fetchFleet();
  }, []);"""

new_use_effect = """  useEffect(() => {
    fetchFleet();
    fetchHostBookings();
    const bInterval = setInterval(fetchHostBookings, 3000);
    return () => clearInterval(bInterval);
  }, []);"""

if old_use_effect in content:
    content = content.replace(old_use_effect, new_use_effect)
    print("Replaced useEffect for fetchHostBookings")
else:
    print("Could not find old_use_effect")

# 4. Update handleVerifyHandoverOtp & add handleCompleteTrip
old_verify = """  const handleVerifyHandoverOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForHandover) return;

    if (inputOtp.trim() === selectedBookingForHandover.handoverOtp) {
      setHandoverSuccess(true);
      setOtpError('');
      setBookings(prev =>
        prev.map(b =>
          b.id === selectedBookingForHandover.id
            ? { ...b, status: 'ACTIVE_TRIP' }
            : b
        )
      );
      setTimeout(() => {
        setHandoverSuccess(false);
        setSelectedBookingForHandover(null);
        setInputOtp('');
      }, 1600);
    } else {
      setOtpError('Invalid OTP. Please ask renter to show the 4-digit code in their ParkCo app.');
    }
  };"""

new_verify = """  const handleVerifyHandoverOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForHandover) return;

    const bId = selectedBookingForHandover.bookingId || selectedBookingForHandover.id;
    const enteredOtp = parseInt(inputOtp.trim(), 10);

    try {
      await api.verifyRentalHandoverOtp(bId, enteredOtp);
      setHandoverSuccess(true);
      setOtpError('');
      await fetchHostBookings();
      await fetchFleet();
      setTimeout(() => {
        setHandoverSuccess(false);
        setSelectedBookingForHandover(null);
        setInputOtp('');
      }, 1400);
    } catch (err: any) {
      // Check if fallback local match
      if (selectedBookingForHandover.handoverOtp && inputOtp.trim() === selectedBookingForHandover.handoverOtp) {
        setHandoverSuccess(true);
        setOtpError('');
        setTimeout(() => {
          setHandoverSuccess(false);
          setSelectedBookingForHandover(null);
          setInputOtp('');
        }, 1400);
      } else {
        setOtpError(err.message || 'Invalid Handover OTP. Please ask renter to check their ParkCo app.');
      }
    }
  };

  const handleCompleteTrip = async (bookingId: string) => {
    if (!window.confirm('Confirm vehicle return and complete this rental trip?')) return;
    try {
      await api.completeRentalTrip(bookingId);
      await fetchHostBookings();
      await fetchFleet();
    } catch (err: any) {
      alert(err.message || 'Failed to complete trip');
    }
  };"""

if old_verify in content:
    content = content.replace(old_verify, new_verify)
    print("Replaced handleVerifyHandoverOtp and added handleCompleteTrip")
else:
    print("Could not find old_verify")

# 5. Update the Bookings rendering
old_booking_render = """                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        booking.status === 'UPCOMING'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {booking.status === 'UPCOMING' ? 'Pending Key Handover' : 'Active In-Trip'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                          {booking.vehicleName}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Renter: <strong className="text-slate-800 dark:text-slate-200">{booking.customerName}</strong>
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{booking.doorstepAddress}</span>
                        </p>
                      </div>

                      <div className="space-y-1 sm:text-right">
                        <div className="text-xs text-slate-500">
                          Duration: <strong>{booking.pickupDate}</strong> → <strong>{booking.returnDate}</strong>
                        </div>
                        <div className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                          Total Fare: ₹{booking.totalFare.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Security Deposit: ₹0 (ParkCo Guaranteed)
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                      {booking.status === 'UPCOMING' ? (
                        <button
                          onClick={() => {
                            setSelectedBookingForHandover(booking);
                            setInputOtp('');
                            setOtpError('');
                          }}
                          className="px-4 py-2.5 rounded-xl bg-[#0F5132] hover:bg-[#0b3e27] text-white text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-2"
                        >
                          <KeyRound className="w-4 h-4" />
                          <span>Verify Handover Key OTP</span>
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Keys Verified & Handed Over</span>
                        </span>
                      )}"""

new_booking_render = """                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                        booking.status === 'CONFIRMED' || booking.status === 'UPCOMING'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : (booking.status === 'IN_PROGRESS' || booking.status === 'ACTIVE_TRIP')
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {(booking.status === 'IN_PROGRESS' || booking.status === 'ACTIVE_TRIP') && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        )}
                        <span>{booking.status === 'CONFIRMED' || booking.status === 'UPCOMING' ? 'Pending Key Handover' : (booking.status === 'IN_PROGRESS' || booking.status === 'ACTIVE_TRIP' ? 'Active In-Trip' : booking.status)}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                          {booking.vehicle?.name || booking.vehicleName}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Renter: <strong className="text-slate-800 dark:text-slate-200">{booking.customerName}</strong>
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{booking.doorstepAddress || booking.ownerAddress || booking.vehicle?.hubAddress || 'Hub Pickup'}</span>
                        </p>
                      </div>

                      <div className="space-y-1 sm:text-right">
                        <div className="text-xs text-slate-500">
                          Duration: <strong>{booking.pickupDate}</strong> → <strong>{booking.returnDate}</strong>
                        </div>
                        <div className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                          Total Fare: ₹{(booking.grandTotal || booking.totalFare || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Security Deposit: ₹0 (ParkCo Guaranteed)
                        </div>
                      </div>
                    </div>

                    {(booking.status === 'IN_PROGRESS' || booking.status === 'ACTIVE_TRIP') && (
                      <div className="pt-2">
                        <LiveRentalTimer status={booking.status} tripStartedAt={booking.tripStartedAt} />
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                      {(booking.status === 'CONFIRMED' || booking.status === 'UPCOMING') ? (
                        <button
                          onClick={() => {
                            setSelectedBookingForHandover(booking);
                            setInputOtp('');
                            setOtpError('');
                          }}
                          className="px-4 py-2.5 rounded-xl bg-[#0F5132] hover:bg-[#0b3e27] text-white text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-2"
                        >
                          <KeyRound className="w-4 h-4" />
                          <span>Enter Customer OTP to Start Trip</span>
                        </button>
                      ) : (booking.status === 'IN_PROGRESS' || booking.status === 'ACTIVE_TRIP') ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Trip Active</span>
                          </span>
                          <button
                            onClick={() => handleCompleteTrip(booking.bookingId || booking.id)}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                          >
                            Complete Return
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-500">Trip Completed</span>
                      )}"""

if old_booking_render in content:
    content = content.replace(old_booking_render, new_booking_render)
    print("Replaced old_booking_render")
else:
    print("Could not find old_booking_render")

# 6. Remove Demo Test OTP from modal
old_modal_otp = """              <div className="text-emerald-700 dark:text-emerald-400 text-[11px] font-mono font-bold pt-1">
                (Demo Test OTP: {selectedBookingForHandover.handoverOtp})
              </div>"""

if old_modal_otp in content:
    content = content.replace(old_modal_otp, "")
    print("Removed Demo Test OTP from modal")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated host-web/src/pages/RentalDashboardPage.tsx")

