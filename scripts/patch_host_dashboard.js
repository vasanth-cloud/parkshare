const fs = require('fs');
const file = 'host-web/src/pages/RentalDashboardPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `                              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{vehicle.hubAddress || vehicle.city}</span>
                              </p>`;

const replacement = `                              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{vehicle.hubAddress || vehicle.city}</span>
                              </p>
                              <div className="mt-1">
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

const isCRLF = content.includes('\r\n');
const normalizedTarget = isCRLF ? target.replace(/\n/g, '\r\n') : target;
const normalizedReplacement = isCRLF ? replacement.replace(/\n/g, '\r\n') : replacement;

if (content.includes(normalizedTarget)) {
  content = content.replace(normalizedTarget, normalizedReplacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully patched RentalDashboardPage.tsx');
} else {
  console.error('Target not found in RentalDashboardPage.tsx');
}

