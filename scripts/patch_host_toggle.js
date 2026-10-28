const fs = require('fs');

// 1. Update host-web/src/services/api.ts
let apiCode = fs.readFileSync('host-web/src/services/api.ts', 'utf8');

// Add safeFetch if not present
if (!apiCode.includes('async function safeFetch')) {
  const safeFetchCode = `async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  const isCapacitor = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.() || (window as any).Capacitor?.platform === 'android' || (window as any).Capacitor?.platform === 'ios');

  try {
    return await fetch(url, options);
  } catch (err: any) {
    if (isCapacitor && (err.name === 'TypeError' || err.message?.toLowerCase().includes('fetch'))) {
      const candidates = [
        'http://localhost:8000',
        'http://192.168.1.17:8000',
      ];
      for (const cand of candidates) {
        if (!url.startsWith(cand)) {
          const altUrl = url.replace(BACKEND_BASE, cand);
          try {
            const res = await fetch(altUrl, options);
            return res;
          } catch {}
        }
      }
    }
    if (err.name === 'TypeError' || err.message?.toLowerCase().includes('fetch')) {
      throw new Error(\`Unable to reach ParkCo server at \${BACKEND_BASE}. Please ensure your PC backend is running and USB or Wi-Fi is connected.\`);
    }
    throw err;
  }
}\n\n`;

  apiCode = apiCode.replace('async function extractErrorMessage', safeFetchCode + 'async function extractErrorMessage');
  console.log('Added safeFetch to host-web/src/services/api.ts');
}

// Add updateVehicleDoorDelivery to api
if (!apiCode.includes('updateVehicleDoorDelivery:')) {
  const target = `  updateRentalVehicleStatus: async (vehicleId: string, status: string, reason?: string): Promise<RentalPartnerVehicle> => {`;
  const addition = `  updateVehicleDoorDelivery: async (vehicleId: string, doorDeliveryAvailable: boolean): Promise<RentalPartnerVehicle> => {
    const res = await (typeof safeFetch !== 'undefined' ? safeFetch : fetch)(\`\${API_BASE}/rentals/\${vehicleId}/door-delivery\`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ doorDeliveryAvailable }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Failed to update doorstep delivery status'));
    return res.json();
  },

`;
  apiCode = apiCode.replace(target, addition + target);
  console.log('Added updateVehicleDoorDelivery to host-web/src/services/api.ts');
}

fs.writeFileSync('host-web/src/services/api.ts', apiCode, 'utf8');

// 2. Update host-web/src/pages/RentalDashboardPage.tsx
let dashCode = fs.readFileSync('host-web/src/pages/RentalDashboardPage.tsx', 'utf8');

// Add state and handler if not present
if (!dashCode.includes('handleToggleDoorDelivery')) {
  const handlerTarget = `  const handleToggleStatus = async (vehicle: RentalPartnerVehicle) => {`;
  const handlerAddition = `  const [updatingDeliveryId, setUpdatingDeliveryId] = useState<string | null>(null);

  const handleToggleDoorDelivery = async (vehicle: RentalPartnerVehicle) => {
    const currentStatus = vehicle.doorDeliveryAvailable !== false && !vehicle.features?.includes('Hub Pickup Only');
    const newStatus = !currentStatus;
    setUpdatingDeliveryId(vehicle.id);
    try {
      await api.updateVehicleDoorDelivery(vehicle.id, newStatus);
      setVehicles(prev => prev.map(v => {
        if (v.id === vehicle.id) {
          const updatedFeatures = (v.features || []).filter(f => f !== 'Doorstep Delivery Available' && f !== 'Hub Pickup Only');
          updatedFeatures.push(newStatus ? 'Doorstep Delivery Available' : 'Hub Pickup Only');
          return {
            ...v,
            doorDeliveryAvailable: newStatus,
            features: updatedFeatures
          };
        }
        return v;
      }));
    } catch (err: any) {
      alert(err.message || 'Failed to update doorstep delivery setting');
    } finally {
      setUpdatingDeliveryId(null);
    }
  };\n\n`;

  dashCode = dashCode.replace(handlerTarget, handlerAddition + handlerTarget);
  console.log('Added handleToggleDoorDelivery to RentalDashboardPage.tsx');
}

// Add the interactive toggle in the card JSX
const oldBadgeTarget = `<div className="mt-1">
                                <span className={\`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border \${
                                  vehicle.doorDeliveryAvailable !== false && !vehicle.features?.includes('Hub Pickup Only')
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                }\`}>
                                  {vehicle.doorDeliveryAvailable !== false && !vehicle.features?.includes('Hub Pickup Only')
                                    ? '🚚 Door Delivery Enabled'
                                    : '🏢 Hub Pickup Only'}
                                </span>
                              </div>`;

const newInteractiveDeliveryBlock = `<div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                <span className={\`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border \${
                                  vehicle.doorDeliveryAvailable !== false && !vehicle.features?.includes('Hub Pickup Only')
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                }\`}>
                                  {vehicle.doorDeliveryAvailable !== false && !vehicle.features?.includes('Hub Pickup Only')
                                    ? '🚚 Door Delivery: ON'
                                    : '🏢 Hub Pickup Only'}
                                </span>
                                <button
                                  type="button"
                                  disabled={updatingDeliveryId === vehicle.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleDoorDelivery(vehicle);
                                  }}
                                  className={\`px-2.5 py-1 rounded-xl text-[10px] font-extrabold border transition cursor-pointer flex items-center gap-1 \${
                                    vehicle.doorDeliveryAvailable !== false && !vehicle.features?.includes('Hub Pickup Only')
                                      ? 'border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                      : 'border-emerald-500/30 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300'
                                  }\`}
                                  title="Change whether you can deliver to customer or need hub pickup"
                                >
                                  {updatingDeliveryId === vehicle.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Sliders className="w-3 h-3" />
                                  )}
                                  <span>
                                    {vehicle.doorDeliveryAvailable !== false && !vehicle.features?.includes('Hub Pickup Only')
                                      ? 'Switch to Hub Only'
                                      : 'Enable Door Delivery'}
                                  </span>
                                </button>
                              </div>`;

if (dashCode.includes(oldBadgeTarget)) {
  dashCode = dashCode.replace(oldBadgeTarget, newInteractiveDeliveryBlock);
  console.log('Replaced badge with interactive toggle block in RentalDashboardPage.tsx');
} else if (dashCode.includes(oldBadgeTarget.replace(/\n/g, '\r\n'))) {
  dashCode = dashCode.replace(oldBadgeTarget.replace(/\n/g, '\r\n'), newInteractiveDeliveryBlock.replace(/\n/g, '\r\n'));
  console.log('Replaced badge with interactive toggle block in RentalDashboardPage.tsx (CRLF)');
} else {
  console.error('oldBadgeTarget not found in RentalDashboardPage.tsx');
}

fs.writeFileSync('host-web/src/pages/RentalDashboardPage.tsx', dashCode, 'utf8');
console.log('Finished updating RentalDashboardPage.tsx');

