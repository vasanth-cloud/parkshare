import os

file_path = os.path.join("customer-web", "src", "pages", "SelfDriveRentalPage.tsx")
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read().replace("\r\n", "\n")

# 1. Update handleOpenBooking to prevent opening for booked vehicles
old_handle_open = """  const handleOpenBooking = (vehicle: RentalVehicle) => {
    setSelectedVehicle(vehicle);"""

new_handle_open = """  const handleOpenBooking = (vehicle: RentalVehicle) => {
    if (!vehicle.isAvailable) {
      alert('This vehicle has been booked by another customer and is currently unavailable.');
      return;
    }
    setSelectedVehicle(vehicle);"""

if old_handle_open in content:
    content = content.replace(old_handle_open, new_handle_open)
    print("Updated handleOpenBooking")
else:
    print("Could not find old_handle_open")

# 2. Update Top Badges on vehicle photo to show "BOOKED" badge
old_badge = """            {/* Top Badges */}
            <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
              <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-black text-amber-300 border border-white/20">
                {vehicle.badge}
              </span>
            </div>"""

new_badge = """            {/* Top Badges */}
            <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1 z-10">
              {!vehicle.isAvailable ? (
                <span className="px-2.5 py-1 rounded-full bg-rose-600/95 backdrop-blur-md text-[10px] font-black text-white border border-rose-300/40 shadow-sm flex items-center gap-1">
                  <Lock className="w-3 h-3 text-white" />
                  <span>BOOKED</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-black text-amber-300 border border-white/20">
                  {vehicle.badge}
                </span>
              )}
            </div>"""

if old_badge in content:
    content = content.replace(old_badge, new_badge)
    print("Updated vehicle photo Top Badges to show BOOKED")
else:
    print("Could not find old_badge")

# 3. Update vehicle card details tag to show Booked / Reserved
old_delivery_tag = """              <div className="mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                  vehicle.doorDeliveryAvailable !== false && !vehicle.features?.includes('Hub Pickup Only')
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-500/20'
                }`}>
                  {vehicle.doorDeliveryAvailable !== false && !vehicle.features?.includes('Hub Pickup Only')
                    ? '🚚 Door Delivery Available'
                    : '🏢 Hub Pickup Only'}
                </span>
              </div>"""

new_delivery_tag = """              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                {!vehicle.isAvailable ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                    <Lock className="w-3 h-3 text-rose-500" />
                    <span>Booked by Customer</span>
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    vehicle.doorDeliveryAvailable !== false && !vehicle.features?.includes('Hub Pickup Only')
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  }`}>
                    {vehicle.doorDeliveryAvailable !== false && !vehicle.features?.includes('Hub Pickup Only')
                      ? '🚚 Door Delivery Available'
                      : '🏢 Hub Pickup Only'}
                  </span>
                )}
              </div>"""

if old_delivery_tag in content:
    content = content.replace(old_delivery_tag, new_delivery_tag)
    print("Updated delivery tag to show Booked by Customer")
else:
    print("Could not find old_delivery_tag")

# 4. Update the CTA Button (Booked vs Book Now vs Booked by You)
old_cta = """          <button
            onClick={() => handleOpenBooking(vehicle)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-xs hover:shadow-md transition-all active:scale-95 flex items-center space-x-1 cursor-pointer"
          >
            <KeyRound className="w-3 h-3" />
            <span>Book Now</span>
          </button>"""

new_cta = """          {(() => {
            const isMyActiveBooking = rentalBookings.some(
              b => b.vehicle.id === vehicle.id && (b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS')
            );

            if (!vehicle.isAvailable) {
              if (isMyActiveBooking) {
                return (
                  <button
                    type="button"
                    onClick={() => handleTabChange('bookings')}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-xs hover:shadow-md transition-all active:scale-95 flex items-center space-x-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Booked (View)</span>
                  </button>
                );
              }
              return (
                <button
                  type="button"
                  disabled
                  className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-black border border-slate-300 dark:border-slate-700 flex items-center space-x-1 cursor-not-allowed opacity-90 shadow-none"
                  title="This vehicle is currently booked by a customer"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Booked</span>
                </button>
              );
            }

            return (
              <button
                type="button"
                onClick={() => handleOpenBooking(vehicle)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-xs hover:shadow-md transition-all active:scale-95 flex items-center space-x-1 cursor-pointer"
              >
                <KeyRound className="w-3 h-3" />
                <span>Book Now</span>
              </button>
            );
          })()}"""

if old_cta in content:
    content = content.replace(old_cta, new_cta)
    print("Updated CTA button to handle Booked state")
else:
    print("Could not find old_cta")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated customer-web/src/pages/SelfDriveRentalPage.tsx")

