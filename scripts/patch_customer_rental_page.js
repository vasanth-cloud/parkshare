const fs = require('fs');

const file = 'customer-web/src/pages/SelfDriveRentalPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Building to lucide-react imports if not present
if (!content.includes('Building,')) {
  content = content.replace('  CheckCircle2,', '  CheckCircle2,\n  Building,');
  console.log('Added Building to lucide-react imports');
}

// 2. Update handleOpenBooking
const openBookingTarget = `  // Open Booking Dialog
  const handleOpenBooking = (vehicle: RentalVehicle) => {
    setSelectedVehicle(vehicle);
    setConfirmedBooking(null);
    setBookingError('');
    setDeliveryType('DOORSTEP_DELIVERY');
    setDoorstepAddress(currentLiveAddress);`;

const openBookingReplacement = `  // Open Booking Dialog
  const handleOpenBooking = (vehicle: RentalVehicle) => {
    setSelectedVehicle(vehicle);
    setConfirmedBooking(null);
    setBookingError('');
    const canDoorDeliver = vehicle.doorDeliveryAvailable !== false && !vehicle.features?.includes('Hub Pickup Only');
    setDeliveryType(canDoorDeliver ? 'DOORSTEP_DELIVERY' : 'HUB_PICKUP');
    setDoorstepAddress(canDoorDeliver ? currentLiveAddress : (vehicle.hubAddress || vehicle.city));`;

if (content.includes(openBookingTarget.replace(/\n/g, '\r\n'))) {
  content = content.replace(openBookingTarget.replace(/\n/g, '\r\n'), openBookingReplacement.replace(/\n/g, '\r\n'));
  console.log('Updated handleOpenBooking (CRLF)');
} else if (content.includes(openBookingTarget)) {
  content = content.replace(openBookingTarget, openBookingReplacement);
  console.log('Updated handleOpenBooking (LF)');
} else {
  console.error('handleOpenBooking target not found');
}

// 3. Update the modal delivery card with interactive selector
const modalCardTarget = `                {/* Delivery to Live Address */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Delivery to Live Address
                    </label>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      Free Doorstep Drop
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {currentLiveAddress}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live GPS Handover Location
                        </span>
                      </div>
                    </div>
                  </div>
                </div>`;

const modalSelectorReplacement = `                {/* Handover & Delivery Selection */}
                {(() => {
                  const canDoorDeliver = selectedVehicle.doorDeliveryAvailable !== false && !selectedVehicle.features?.includes('Hub Pickup Only');
                  if (canDoorDeliver) {
                    return (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Handover Method
                          </label>
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                            Free Handover
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <button
                            type="button"
                            onClick={() => {
                              setDeliveryType('DOORSTEP_DELIVERY');
                              setDoorstepAddress(currentLiveAddress);
                            }}
                            className={\`p-3 rounded-2xl border-2 text-left transition flex items-center space-x-2.5 cursor-pointer \${
                              deliveryType === 'DOORSTEP_DELIVERY'
                                ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-xs'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 opacity-70'
                            }\`}
                          >
                            <div className={\`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 \${
                              deliveryType === 'DOORSTEP_DELIVERY' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                            }\`}>
                              <MapPin className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="block text-xs font-black text-slate-800 dark:text-slate-100">Door Delivery</span>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">To Live Address</span>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDeliveryType('HUB_PICKUP');
                              setDoorstepAddress(selectedVehicle.hubAddress || selectedVehicle.city);
                            }}
                            className={\`p-3 rounded-2xl border-2 text-left transition flex items-center space-x-2.5 cursor-pointer \${
                              deliveryType === 'HUB_PICKUP'
                                ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-xs'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 opacity-70'
                            }\`}
                          >
                            <div className={\`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 \${
                              deliveryType === 'HUB_PICKUP' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                            }\`}>
                              <Building className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="block text-xs font-black text-slate-800 dark:text-slate-100">Hub Pickup</span>
                              <span className="text-[10px] text-slate-500 font-bold">Self Collect</span>
                            </div>
                          </button>
                        </div>

                        {deliveryType === 'DOORSTEP_DELIVERY' ? (
                          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <MapPin className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                  {currentLiveAddress}
                                </span>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Live GPS Handover Location (Free Doorstep Drop)
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <Building className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                  {selectedVehicle.hubAddress || selectedVehicle.city}
                                </span>
                                <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-0.5">
                                  Partner Hub / Garage Handover
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Handover Method
                        </label>
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/20">
                          Hub Pickup Only
                        </span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-500/30 flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Building className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                              {selectedVehicle.hubAddress || selectedVehicle.city}
                            </span>
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1 mt-0.5">
                              Host Hub / Garage Pickup (No Door Delivery for this vehicle)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}`;

if (content.includes(modalCardTarget.replace(/\n/g, '\r\n'))) {
  content = content.replace(modalCardTarget.replace(/\n/g, '\r\n'), modalSelectorReplacement.replace(/\n/g, '\r\n'));
  console.log('Updated modal delivery card (CRLF)');
} else if (content.includes(modalCardTarget)) {
  content = content.replace(modalCardTarget, modalSelectorReplacement);
  console.log('Updated modal delivery card (LF)');
} else {
  console.error('modalCardTarget not found');
}

// 4. Update Price breakdown text for delivery
const priceBreakdownTarget = `                      <div className="flex justify-between">
                        <span>Delivery to Live Address</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">FREE</span>
                      </div>`;

const priceBreakdownReplacement = `                      <div className="flex justify-between">
                        <span>{deliveryType === 'DOORSTEP_DELIVERY' ? 'Doorstep Delivery' : 'Hub Pickup'}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">FREE</span>
                      </div>`;

if (content.includes(priceBreakdownTarget.replace(/\n/g, '\r\n'))) {
  content = content.replace(priceBreakdownTarget.replace(/\n/g, '\r\n'), priceBreakdownReplacement.replace(/\n/g, '\r\n'));
  console.log('Updated price breakdown (CRLF)');
} else if (content.includes(priceBreakdownTarget)) {
  content = content.replace(priceBreakdownTarget, priceBreakdownReplacement);
  console.log('Updated price breakdown (LF)');
} else {
  console.error('priceBreakdownTarget not found');
}

// 5. Update vehicle card in fleet listing with badge
const vehicleCardTarget = `              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1 mt-0.5">
                <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                <span className="truncate">{vehicle.hubAddress}</span>
              </p>`;

const vehicleCardReplacement = `              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1 mt-0.5">
                <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                <span className="truncate">{vehicle.hubAddress}</span>
              </p>
              <div className="mt-1">
                <span className={\`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border \${
                  vehicle.doorDeliveryAvailable !== false && !vehicle.features?.includes('Hub Pickup Only')
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-500/20'
                }\`}>
                  {vehicle.doorDeliveryAvailable !== false && !vehicle.features?.includes('Hub Pickup Only')
                    ? '🚚 Door Delivery Available'
                    : '🏢 Hub Pickup Only'}
                </span>
              </div>`;

if (content.includes(vehicleCardTarget.replace(/\n/g, '\r\n'))) {
  content = content.replace(vehicleCardTarget.replace(/\n/g, '\r\n'), vehicleCardReplacement.replace(/\n/g, '\r\n'));
  console.log('Updated vehicle card in fleet listing (CRLF)');
} else if (content.includes(vehicleCardTarget)) {
  content = content.replace(vehicleCardTarget, vehicleCardReplacement);
  console.log('Updated vehicle card in fleet listing (LF)');
} else {
  console.error('vehicleCardTarget not found');
}

fs.writeFileSync(file, content, 'utf8');
console.log('Finished updating SelfDriveRentalPage.tsx');

