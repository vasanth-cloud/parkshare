const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'customer-web', 'src', 'pages', 'SelfDriveRentalPage.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add currentLiveAddress computation right after activeLocationDisplay
const oldLocationDef = `  const currentHub = BENGALURU_HUBS.find(h => h.id === selectedArea) || BENGALURU_HUBS[0];
  const activeLocationDisplay = gpsAddressName || currentHub.name;`;

const newLocationDef = `  const currentHub = BENGALURU_HUBS.find(h => h.id === selectedArea) || BENGALURU_HUBS[0];
  const activeLocationDisplay = gpsAddressName || currentHub.name;

  // Live address resolved from GPS or selected customer location
  const currentLiveAddress = useMemo(() => {
    try {
      const saved = localStorage.getItem('parkshare_customer_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title && parsed.subtitle) {
          return \`\${parsed.title}, \${parsed.subtitle}\`;
        }
        if (parsed.title) return parsed.title;
      }
    } catch {}
    return gpsAddressName || activeLocationDisplay || 'Indiranagar, Bengaluru, Karnataka';
  }, [gpsAddressName, activeLocationDisplay]);`;

// 2. Update handleOpenBooking
const oldHandleOpen = `  const handleOpenBooking = (vehicle: RentalVehicle) => {
    setSelectedVehicle(vehicle);
    setConfirmedBooking(null);
    setBookingError('');
    if (user) {
      if (!customerName) setCustomerName(user.full_name || '');
      if (!customerPhone) setCustomerPhone(user.phone_number || '');
    }
  };`;

const newHandleOpen = `  const handleOpenBooking = (vehicle: RentalVehicle) => {
    setSelectedVehicle(vehicle);
    setConfirmedBooking(null);
    setBookingError('');
    setDeliveryType('DOORSTEP_DELIVERY');
    setDoorstepAddress(currentLiveAddress);
    if (user) {
      if (!customerName) setCustomerName(user.full_name || '');
      if (!customerPhone) setCustomerPhone(user.phone_number || '');
    }
  };`;

// 3. Update calculateTotal
const oldCalcTotal = `    const delivery = deliveryType === 'DOORSTEP_DELIVERY' ? 149 : 0;`;
const newCalcTotal = `    const delivery = 0; // Free delivery to customer live address`;

// 4. Update the modal section: remove Handover Method & text input, show only Live Address card
const oldModalSection = `                {/* Handover Method */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Handover Method
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setDeliveryType('HUB_PICKUP')}
                      className={\`p-2.5 rounded-2xl border text-left transition \${
                        deliveryType === 'HUB_PICKUP'
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }\`}
                    >
                      <span className="block font-black text-xs">Hub Pickup</span>
                      <span className="text-[10px] text-slate-400 block">Self pickup (Free)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryType('DOORSTEP_DELIVERY')}
                      className={\`p-2.5 rounded-2xl border text-left transition \${
                        deliveryType === 'DOORSTEP_DELIVERY'
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }\`}
                    >
                      <span className="block font-black text-xs">Doorstep Delivery</span>
                      <span className="text-[10px] text-slate-400 block">Drop to address (+₹149)</span>
                    </button>
                  </div>
                </div>

                {deliveryType === 'DOORSTEP_DELIVERY' && (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Complete Delivery Address
                    </label>
                    <input
                      type="text"
                      placeholder="House No, Street, Landmark..."
                      value={doorstepAddress}
                      onChange={(e) => setDoorstepAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                      required
                    />
                  </div>
                )}`;

const newModalSection = `                {/* Delivery to Live Address */}
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

const norm = (s) => s.replace(/\\r\\n/g, '\\n');

let normalizedCode = norm(code);

if (normalizedCode.includes(norm(oldLocationDef))) {
  normalizedCode = normalizedCode.replace(norm(oldLocationDef), norm(newLocationDef));
  console.log('Replaced oldLocationDef');
} else {
  console.error('Failed to match oldLocationDef');
}

if (normalizedCode.includes(norm(oldHandleOpen))) {
  normalizedCode = normalizedCode.replace(norm(oldHandleOpen), norm(newHandleOpen));
  console.log('Replaced oldHandleOpen');
} else {
  console.error('Failed to match oldHandleOpen');
}

if (normalizedCode.includes(norm(oldCalcTotal))) {
  normalizedCode = normalizedCode.replace(norm(oldCalcTotal), norm(newCalcTotal));
  console.log('Replaced oldCalcTotal');
} else {
  console.error('Failed to match oldCalcTotal');
}

if (normalizedCode.includes(norm(oldModalSection))) {
  normalizedCode = normalizedCode.replace(norm(oldModalSection), norm(newModalSection));
  console.log('Replaced oldModalSection');
} else {
  console.error('Failed to match oldModalSection');
}

// In price breakdown, replace Doorstep Delivery line
const oldDeliveryLine = `{fare.delivery > 0 && (
                        <div className="flex justify-between">
                          <span>Doorstep Delivery</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">₹{fare.delivery}</span>
                        </div>
                      )}`;

const newDeliveryLine = `<div className="flex justify-between">
                        <span>Delivery to Live Address</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">FREE</span>
                      </div>`;

if (normalizedCode.includes(norm(oldDeliveryLine))) {
  normalizedCode = normalizedCode.replace(norm(oldDeliveryLine), norm(newDeliveryLine));
  console.log('Replaced oldDeliveryLine');
}

fs.writeFileSync(filePath, normalizedCode, 'utf8');
console.log('Done patching SelfDriveRentalPage.tsx');

