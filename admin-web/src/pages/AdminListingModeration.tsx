import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ParkingListing, ListingImage } from '../types';
import { 
  CheckSquare, 
  CheckCircle, 
  XCircle, 
  MapPin, 
  Camera, 
  ShieldCheck, 
  Eye, 
  X, 
  ZoomIn, 
  AlertTriangle, 
  HelpCircle, 
  FileCheck, 
  Phone, 
  Mail, 
  UserCheck, 
  Shield, 
  Sparkles, 
  AlertOctagon, 
  Info,
  Clock
} from 'lucide-react';

export const AdminListingModeration: React.FC = () => {
  const [listings, setListings] = useState<ParkingListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState<Record<number, string>>({});
  const [inspectImage, setInspectImage] = useState<{ url: string; caption?: string; title: string } | null>(null);

  const fetchPendingListings = () => {
    api.getPendingListings()
      .then(setListings)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPendingListings();
  }, []);

  const handleAction = async (id: number, status: 'ACTIVE' | 'REJECTED', customReason?: string) => {
    try {
      const reason = customReason !== undefined ? customReason : (rejectionReason[id] || '');
      await api.approveListing(id, status, reason);
      fetchPendingListings();
    } catch (err: any) {
      alert(err.message || 'Moderation action failed');
    }
  };

  const handleRequestMoreInfo = async (id: number) => {
    const rawReason = (rejectionReason[id] || '').trim();
    const finalReason = rawReason
      ? (rawReason.startsWith('MORE INFO NEEDED:') ? rawReason : `MORE INFO NEEDED: ${rawReason}`)
      : 'MORE INFO NEEDED: Please provide clearer on-site photos of parking boundaries and access clearance.';
    await handleAction(id, 'REJECTED', finalReason);
  };

  const getAngleInfo = (caption?: string) => {
    const c = (caption || '').toUpperCase();
    if (c.includes('ENTRANCE') || c.includes('ROAD')) {
      return { icon: '🛣️', label: 'Entrance from Road', badge: 'bg-blue-950/80 text-blue-300 border-blue-800' };
    }
    if (c.includes('SLOT') || c.includes('PARKING')) {
      return { icon: '🅿️', label: 'Actual Parking Slot', badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800' };
    }
    if (c.includes('SURROUNDING') || c.includes('WIDE') || c.includes('ACCESS')) {
      return { icon: '🌐', label: 'Surroundings & Access', badge: 'bg-purple-950/80 text-purple-300 border-purple-800' };
    }
    if (c.includes('ROOF') || c.includes('CLEARANCE') || c.includes('HEIGHT')) {
      return { icon: '📏', label: 'Roof / Height Clearance', badge: 'bg-amber-950/80 text-amber-300 border-amber-800' };
    }
    if (c.includes('GATE') || c.includes('BARRIER')) {
      return { icon: '🚪', label: 'Gate / Entry Area', badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-800' };
    }
    return { icon: '📷', label: caption || 'Space Photo', badge: 'bg-slate-800 text-slate-300 border-slate-700' };
  };

  const findPhoto = (images: ListingImage[] | undefined, keywords: string[]) => {
    if (!images || images.length === 0) return null;
    return images.find((img) => {
      const c = (img.caption || '').toUpperCase();
      return keywords.some((k) => c.includes(k.toUpperCase()));
    });
  };

  const getRiskFlags = (l: ParkingListing) => {
    const flags: string[] = [];
    const dist = l.location_verification_metadata?.distance_to_declared_m;
    if (dist !== undefined && dist > 350) {
      flags.push(`Proximity divergence: host verified ${Math.round(dist)}m away from declared map pin`);
    }
    if (!l.is_location_verified || !l.verification_photo_url) {
      flags.push('Physical on-site location proof missing or skipped');
    }
    if (!l.images || l.images.length < 3) {
      flags.push(`Only ${l.images?.length || 0} space photos uploaded (3 minimum required)`);
    }
    if (l.host && l.host.is_identity_verified === false) {
      flags.push('Host e-KYC identity documents pending verification');
    }
    return flags;
  };

  const formatParkingType = (typeStr: string) => {
    return typeStr
      .toLowerCase()
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center space-x-2.5">
            <ShieldCheck className="w-7 h-7 text-emerald-500" />
            <span className="tracking-tight">Space Listing Verification & Moderation Queue</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review host listings against physical presence proofs, GPS accuracy, legal identity, and multi-angle photos
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-300">
            Pending Queue: <strong className="text-amber-400">{listings.length}</strong>
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 text-sm">
          Loading space verification queue...
        </div>
      ) : listings.length === 0 ? (
        <div className="bg-slate-900 rounded-3xl p-14 text-center border border-slate-800 space-y-3">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Pending Approvals</h3>
          <p className="text-sm text-slate-400">All submitted parking spaces have been moderated.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {listings.map((l) => {
            const riskFlags = getRiskFlags(l);
            const isCoveredSpace = l.is_covered || l.is_indoor || l.parking_type.includes('COVERED') || l.parking_type.includes('GARAGE');
            const entrancePhoto = findPhoto(l.images, ['ENTRANCE', 'ROAD']);
            const slotPhoto = findPhoto(l.images, ['SLOT', 'PARKING']);
            const widePhoto = findPhoto(l.images, ['SURROUNDING', 'WIDE', 'ACCESS']);
            const clearancePhoto = findPhoto(l.images, ['ROOF', 'CLEARANCE', 'HEIGHT']);
            const gatePhoto = findPhoto(l.images, ['GATE', 'BARRIER']);

            const hostName = l.host?.legal_name || l.host?.full_name || 'Vasanth A.';
            const hostTypeDisplay = (l.host?.host_type || l.host_type) === 'BUSINESS' ? 'Commercial / Business Host' : 'Individual Host';

            return (
              <div 
                key={l.id} 
                className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl space-y-0"
              >
                {/* Top Dossier Brand Banner */}
                <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 px-6 py-3 border-b border-emerald-900/40 flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-mono text-xs font-black tracking-widest text-emerald-400 uppercase">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>PARKSHARE VERIFICATION DOSSIER</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Listing <strong className="text-white">#PS-{10000 + l.id}</strong>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Listing Meta Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
                    <div>
                      <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                        Listing
                      </div>
                      <h2 className="text-xl font-black text-white flex items-center space-x-2">
                        <span>ParkShare #PS-{10000 + l.id}</span>
                        <span className="text-slate-500 font-normal">—</span>
                        <span className="text-emerald-300 text-lg font-semibold">{l.title}</span>
                      </h2>
                      <div className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
                        <span>Submitted {new Date(l.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>•</span>
                        <span className="text-amber-400 font-bold bg-amber-950/80 border border-amber-800/80 px-2 py-0.5 rounded-full text-[10px]">
                          STATUS: {l.status}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-950 px-4 py-2.5 rounded-2xl border border-slate-800 text-right space-y-0.5 self-start sm:self-auto">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Pricing Rates</div>
                      <div className="text-base font-extrabold text-emerald-400">
                        ₹{l.pricing_rule?.hourly_price || 40}<span className="text-xs text-slate-400 font-normal">/hr</span>
                        <span className="text-slate-600 font-normal mx-1.5">•</span>
                        ₹{l.pricing_rule?.daily_price || 250}<span className="text-xs text-slate-400 font-normal">/day</span>
                      </div>
                    </div>
                  </div>

                  {/* 2-Column Main Dossier Sections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Host & Space */}
                    <div className="space-y-6">
                      {/* HOST SECTION */}
                      <div className="bg-slate-950/90 rounded-2xl p-5 border border-slate-800 space-y-3.5">
                        <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Host</span>
                          </span>
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-mono">
                            {hostTypeDisplay}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-white">{hostName}</h4>
                          <p className="text-xs text-slate-400">{hostTypeDisplay}</p>
                        </div>

                        <div className="font-mono text-xs space-y-2 pt-1 border-t border-slate-900">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Phone</span>
                            <span className="text-emerald-400 font-bold flex items-center space-x-1">
                              <span>✓</span>
                              <span>Verified</span>
                              {l.host?.phone_number && (
                                <span className="text-slate-500 font-sans text-[11px] ml-1">
                                  ({l.host.phone_number.slice(0, 4)}••••{l.host.phone_number.slice(-3)})
                                </span>
                              )}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Email</span>
                            <span className="text-emerald-400 font-bold flex items-center space-x-1">
                              <span>✓</span>
                              <span>Verified</span>
                              {l.host?.email && (
                                <span className="text-slate-500 font-sans text-[11px] ml-1 truncate max-w-[150px]">
                                  ({l.host.email})
                                </span>
                              )}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Identity</span>
                            <span className={`font-bold flex items-center space-x-1 ${l.host?.is_identity_verified !== false ? 'text-emerald-400' : 'text-amber-400'}`}>
                              <span>{l.host?.is_identity_verified !== false ? '✓' : '⏳'}</span>
                              <span>{l.host?.is_identity_verified !== false ? 'Verified' : 'Pending Review'}</span>
                              {l.host?.government_id_type && (
                                <span className="text-slate-500 font-sans text-[11px] ml-1">
                                  ({l.host.government_id_type.replace('_', ' ')})
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* SPACE SECTION */}
                      <div className="bg-slate-950/90 rounded-2xl p-5 border border-slate-800 space-y-3.5">
                        <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                            SPACE
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ──────────────────────────────
                          </span>
                        </div>

                        <div className="font-mono text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Type:</span>
                            <span className="text-white font-bold">{formatParkingType(l.parking_type)}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Capacity:</span>
                            <span className="text-white font-bold">{l.capacity} {l.capacity === 1 ? 'Car' : 'Cars'}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Access:</span>
                            <span className="text-white font-bold">{l.has_gated_access ? 'Gated' : 'Direct / Open'}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">24/7:</span>
                            <span className={`font-bold ${l.has_24_7_access !== false ? 'text-emerald-400' : 'text-slate-300'}`}>
                              {l.has_24_7_access !== false ? 'Yes' : 'Restricted Hours'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-slate-400">
                            <span>Features:</span>
                            <span className="text-slate-300 font-sans text-[11px]">
                              {[
                                l.is_covered ? 'Covered' : 'Open Air',
                                l.has_cctv ? 'CCTV' : null,
                                l.has_ev_charging ? 'EV Charger' : null,
                                l.has_security_guard ? 'Guard' : null,
                              ].filter(Boolean).join(' • ')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* DOCUMENTS SECTION */}
                      <div className="bg-slate-950/90 rounded-2xl p-5 border border-slate-800 space-y-3.5">
                        <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                            <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>DOCUMENTS</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ──────────────────────────────
                          </span>
                        </div>

                        <div className="font-mono text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Property Proof</span>
                            <span className="text-emerald-400 font-bold flex items-center space-x-1">
                              <span>✓</span>
                              <span className="text-[11px] font-sans text-slate-300">Verified</span>
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Authorization</span>
                            <span className="text-slate-300 font-bold">
                              {l.host?.authorization_status || ((l.host?.host_type || l.host_type) === 'BUSINESS' ? '✓ Verified' : 'N/A')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Location, Photos, & Risk Flags */}
                    <div className="space-y-6">
                      {/* LOCATION SECTION */}
                      <div className="bg-slate-950/90 rounded-2xl p-5 border border-slate-800 space-y-3.5">
                        <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                            <span>LOCATION</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ──────────────────────────────
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="text-[11px] text-slate-400 font-mono">Address:</div>
                          <div className="text-xs font-bold text-white bg-slate-900 p-2.5 rounded-xl border border-slate-800 leading-relaxed">
                            {l.exact_address || l.approximate_address}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono pt-1">
                            GPS: <strong className="text-emerald-400 font-mono">{l.latitude.toFixed(6)}, {l.longitude.toFixed(6)}</strong>
                          </div>
                        </div>

                        <div className="font-mono text-xs space-y-2 pt-2 border-t border-slate-900">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">GPS Verification</span>
                            <span className={`font-bold flex items-center space-x-1 ${l.is_location_verified ? 'text-emerald-400' : 'text-red-400'}`}>
                              <span>{l.is_location_verified ? '✓' : '✗'}</span>
                              <span className="text-[11px] font-sans text-slate-300">
                                {l.is_location_verified ? 'Captured on-site' : 'Not verified'}
                              </span>
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Address Match</span>
                            <span className={`font-bold flex items-center space-x-1 ${l.location_verification_metadata?.is_address_match !== false && l.is_location_verified ? 'text-emerald-400' : 'text-amber-400'}`}>
                              <span>{l.location_verification_metadata?.is_address_match !== false && l.is_location_verified ? '✓' : '⚠️'}</span>
                              <span className="text-[11px] font-sans text-slate-300">
                                {l.location_verification_metadata?.distance_to_declared_m !== undefined
                                  ? `${Math.round(l.location_verification_metadata.distance_to_declared_m)}m away`
                                  : 'Within tolerance'}
                              </span>
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Location Accuracy</span>
                            <span className="text-slate-200 font-bold font-mono">
                              {Math.round(l.location_verification_metadata?.gps_accuracy_m || 24)}m
                            </span>
                          </div>
                        </div>

                        {/* On-Site Verification Photo Zoom Preview */}
                        {l.verification_photo_url && (
                          <div className="pt-2 border-t border-slate-900">
                            <div className="text-[11px] text-slate-400 font-mono mb-1.5 flex items-center justify-between">
                              <span>📍 Live On-Site Photo Proof:</span>
                              <span className="text-[10px] text-emerald-400">Tamper-Proof Watermark</span>
                            </div>
                            <div
                              onClick={() => setInspectImage({ url: l.verification_photo_url!, caption: 'Physical Presence Live Verification Photo', title: l.title })}
                              className="group relative rounded-xl overflow-hidden border border-emerald-800/80 hover:border-emerald-400 cursor-pointer bg-black h-28 flex items-center justify-center transition"
                            >
                              <img
                                src={l.verification_photo_url}
                                alt="On-Site Proof"
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-1.5 text-xs font-bold text-white">
                                <ZoomIn className="w-4 h-4 text-emerald-400" />
                                <span>Inspect Physical Proof</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* PHOTOS SECTION */}
                      <div className="bg-slate-950/90 rounded-2xl p-5 border border-slate-800 space-y-3.5">
                        <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                            <Camera className="w-3.5 h-3.5 text-emerald-400" />
                            <span>PHOTOS</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ──────────────────────────────
                          </span>
                        </div>

                        <div className="font-mono text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Entrance</span>
                            <span className={`font-bold ${entrancePhoto ? 'text-emerald-400' : 'text-red-400'}`}>
                              {entrancePhoto ? '✓' : '✗'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Parking Slot</span>
                            <span className={`font-bold ${slotPhoto ? 'text-emerald-400' : 'text-red-400'}`}>
                              {slotPhoto ? '✓' : '✗'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Wide View</span>
                            <span className={`font-bold ${widePhoto ? 'text-emerald-400' : 'text-red-400'}`}>
                              {widePhoto ? '✓' : '✗'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Clearance</span>
                            <span className={`font-bold ${isCoveredSpace ? (clearancePhoto ? 'text-emerald-400' : 'text-red-400') : 'text-slate-400'}`}>
                              {isCoveredSpace ? (clearancePhoto ? '✓' : '✗') : 'N/A'}
                            </span>
                          </div>
                        </div>

                        {/* Photo Thumbnails Gallery */}
                        {l.images && l.images.length > 0 && (
                          <div className="pt-2 border-t border-slate-900 grid grid-cols-4 gap-2">
                            {l.images.map((img, idx) => {
                              const angle = getAngleInfo(img.caption);
                              return (
                                <div
                                  key={idx}
                                  onClick={() => setInspectImage({ url: img.image_url, caption: img.caption, title: l.title })}
                                  className="group relative rounded-lg overflow-hidden border border-slate-800 hover:border-emerald-400 cursor-pointer bg-black aspect-video transition"
                                  title={angle.label}
                                >
                                  <img
                                    src={img.image_url}
                                    alt={img.caption || `Photo ${idx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                    <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* RISK FLAGS SECTION */}
                      <div className="bg-slate-950/90 rounded-2xl p-5 border border-slate-800 space-y-3.5">
                        <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                            <AlertOctagon className={`w-3.5 h-3.5 ${riskFlags.length === 0 ? 'text-emerald-400' : 'text-amber-400'}`} />
                            <span>RISK FLAGS</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ──────────────────────────────
                          </span>
                        </div>

                        {riskFlags.length === 0 ? (
                          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 p-3 rounded-xl">
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            <span>No suspicious flags</span>
                          </div>
                        ) : (
                          <div className="space-y-1.5 bg-amber-950/30 border border-amber-900/50 p-3 rounded-xl">
                            {riskFlags.map((flag, idx) => (
                              <div key={idx} className="flex items-start space-x-2 text-xs text-amber-300 font-semibold">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                                <span>{flag}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <div className="text-[11px] text-slate-400 font-semibold">Preset Action Note:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Verified authentic space, approve immediately',
                        'Please provide clearer photo of road entrance',
                        'Please upload roof height clearance photo',
                        'Parking bay boundaries not clearly marked',
                        'GPS location mismatch: please re-verify standing on-site'
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setRejectionReason({ ...rejectionReason, [l.id]: preset })}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] transition"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reason Input Box */}
                  <div className="space-y-1">
                    <label className="block text-xs font-mono font-bold text-slate-400 uppercase">
                      Reason:
                    </label>
                    <input
                      type="text"
                      placeholder="Type reason or requirements here (shared directly with host if more info requested or rejected)..."
                      value={rejectionReason[l.id] || ''}
                      onChange={(e) => setRejectionReason({ ...rejectionReason, [l.id]: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans shadow-inner"
                    />
                  </div>

                  {/* Action Buttons: [ APPROVE ] [ REQUEST MORE INFORMATION ] [ REJECT ] */}
                  <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-3 font-mono">
                    <button
                      type="button"
                      onClick={() => handleAction(l.id, 'ACTIVE')}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs tracking-wider transition shadow-lg flex items-center justify-center space-x-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>[ APPROVE ]</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRequestMoreInfo(l.id)}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs tracking-wider transition shadow-lg flex items-center justify-center space-x-2"
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span>[ REQUEST MORE INFORMATION ]</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAction(l.id, 'REJECTED')}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-900 hover:bg-red-800 text-red-100 font-extrabold text-xs tracking-wider transition border border-red-700 shadow-lg flex items-center justify-center space-x-2"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>[ REJECT ]</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Inspection Zoom Modal */}
      {inspectImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl space-y-3 p-4">
            <div className="flex items-center justify-between text-white border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white">{inspectImage.title}</h4>
                <p className="text-xs text-emerald-400 font-mono">
                  Angle: {inspectImage.caption || 'Live Parking Photo'} • Full Resolution Inspection
                </p>
              </div>
              <button
                onClick={() => setInspectImage(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              <img
                src={inspectImage.url}
                alt="Enlarged space inspection"
                className="w-full h-auto max-h-[75vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
