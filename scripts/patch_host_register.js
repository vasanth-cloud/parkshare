const fs = require('fs');

const file = 'host-web/src/pages/RegisterRentalVehiclePage.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. In submit payload: add doorDeliveryAvailable
const submitTarget = `hubAddress: hubAddress.trim(),\r\n        photoUrl: photoUrl.trim() || undefined,`;
const submitTargetLF = `hubAddress: hubAddress.trim(),\n        photoUrl: photoUrl.trim() || undefined,`;

const submitReplacement = `hubAddress: hubAddress.trim(),
        doorDeliveryAvailable: doorstepDeliveryAvailable,
        photoUrl: photoUrl.trim() || undefined,`;

if (content.includes(submitTarget)) {
  content = content.replace(submitTarget, submitReplacement.replace(/\n/g, '\r\n'));
  console.log('Added doorDeliveryAvailable to submit payload (CRLF)');
} else if (content.includes(submitTargetLF)) {
  content = content.replace(submitTargetLF, submitReplacement);
  console.log('Added doorDeliveryAvailable to submit payload (LF)');
} else {
  console.error('Submit target not found in RegisterRentalVehiclePage.tsx');
}

// 2. In Card 4: Add the interactive Doorstep Delivery Options selector
const card4Target = `                  <input
                    type="text"
                    placeholder="e.g. 100ft Road Metro Station Hub, Indiranagar"
                    value={hubAddress}
                    onChange={(e) => setHubAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    required
                  />
                </div>
              </div>

            </div>`;

const card4Replacement = `                  <input
                    type="text"
                    placeholder="e.g. 100ft Road Metro Station Hub, Indiranagar"
                    value={hubAddress}
                    onChange={(e) => setHubAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                    required
                  />
                </div>

                <div className="sm:col-span-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                      Doorstep Delivery to Customer *
                    </label>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      {doorstepDeliveryAvailable ? 'Door Delivery Enabled' : 'Hub Pickup Only'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    If customer books means whether you can do door delivery or no door delivery?
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDoorstepDeliveryAvailable(true)}
                      className={\`p-3.5 rounded-2xl border-2 text-left transition flex items-start space-x-3 cursor-pointer \${
                        doorstepDeliveryAvailable
                          ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 opacity-70 hover:opacity-100'
                      }\`}
                    >
                      <div className={\`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 \${
                        doorstepDeliveryAvailable ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }\`}>
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-black text-slate-900 dark:text-white">Yes, Door Delivery Available</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          Customers can choose free doorstep delivery to their live GPS location.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDoorstepDeliveryAvailable(false)}
                      className={\`p-3.5 rounded-2xl border-2 text-left transition flex items-start space-x-3 cursor-pointer \${
                        !doorstepDeliveryAvailable
                          ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 opacity-70 hover:opacity-100'
                      }\`}
                    >
                      <div className={\`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 \${
                        !doorstepDeliveryAvailable ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }\`}>
                        <Building className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-black text-slate-900 dark:text-white">No Door Delivery (Hub Only)</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          Customers must come to your hub/garage address to pick up the vehicle.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

            </div>`;

const isCRLF = content.includes('\r\n');
const normalizedCard4Target = isCRLF ? card4Target.replace(/\n/g, '\r\n') : card4Target;
const normalizedCard4Replacement = isCRLF ? card4Replacement.replace(/\n/g, '\r\n') : card4Replacement;

if (content.includes(normalizedCard4Target)) {
  content = content.replace(normalizedCard4Target, normalizedCard4Replacement);
  console.log('Added Door Delivery selector to Card 4 in RegisterRentalVehiclePage.tsx');
} else {
  console.error('Card 4 target not found');
}

fs.writeFileSync(file, content, 'utf8');
console.log('Finished processing RegisterRentalVehiclePage.tsx');

