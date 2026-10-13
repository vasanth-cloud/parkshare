import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, getFullImageUrl } from '../services/api';
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
  Clock,
  ArrowLeft,
  ShieldAlert,
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  Car,
  Layers,
  Check,
  LayoutList,
  LayoutGrid,
  Hash
} from 'lucide-react';

export const AdminListingModeration: React.FC = () => {
  const [listings, setListings] = useState<ParkingListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListingId, setSelectedListingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [rejectionReason, setRejectionReason] = useState<Record<number, string>>({});
  const [inspectImage, setInspectImage] = useState<{ url: string; caption?: string; title: string } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetchPendingListings = () => {
    setLoading(true);
    api.getPendingListings()
      .then((data) => {
        setListings(data);
        // If selected listing was approved/rejected, clear selection
        if (selectedListingId && !data.some(l => l.id === selectedListingId)) {
          setSelectedListingId(null);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPendingListings();
  }, []);

  const handleAction = async (id: number, status: 'ACTIVE' | 'REJECTED', customReason?: string) => {
    setActionLoadingId(id);
    try {
      const reason = customReason !== undefined ? customReason : (rejectionReason[id] || '');
      await api.approveListing(id, status, reason);
      // Deselect after action
      setSelectedListingId(null);
      fetchPendingListings();
    } catch (err: any) {
      alert(err.message || 'Moderation action failed');
    } finally {
      setActionLoadingId(null);
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

  // Filter listings by search query
  const filteredListings = listings.filter((l) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const titleMatch = l.title?.toLowerCase().includes(q);
    const hostMatch = (l.host?.legal_name || l.host?.full_name || '').toLowerCase().includes(q);
    const addressMatch = (l.approximate_address || l.exact_address || l.city || '').toLowerCase().includes(q);
    const idMatch = `ps-${10000 + l.id}`.includes(q) || `${l.id}`.includes(q);
    return titleMatch || hostMatch || addressMatch || idMatch;
  });

  // Pagination computations
  const totalItems = filteredListings.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedListings = filteredListings.slice(startIndex, endIndex);

  // Auto-reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize]);

  const selectedListing = listings.find((l) => l.id === selectedListingId);
  const selectedIndex = selectedListing ? listings.findIndex((l) => l.id === selectedListingId) : -1;

  // Render pagination navigation component
  const renderPaginationControls = () => {
    if (totalItems === 0) return null;
    return (
      <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs shadow-xs">
        {/* Left: Summary */}
        <div className="text-slate-400 font-mono flex items-center space-x-2">
          <span>
            Showing S.No. <strong className="text-emerald-400 font-bold">#{String(startIndex + 1).padStart(2, '0')}</strong> to{' '}
            <strong className="text-emerald-400 font-bold">#{String(endIndex).padStart(2, '0')}</strong> of{' '}
            <strong className="text-white font-bold">{totalItems}</strong> spaces
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">
            Page <strong className="text-white font-mono">{safeCurrentPage}</strong> of{' '}
            <strong className="text-white font-mono">{totalPages}</strong>
          </span>
        </div>

        {/* Center: Page Navigation Buttons */}
        <div className="flex items-center space-x-1">
          <button
            disabled={safeCurrentPage <= 1}
            onClick={() => setCurrentPage(1)}
            className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
            title="First Page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            disabled={safeCurrentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Numbered Page Pills */}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 2)
            .map((p, idx, arr) => {
              const prevP = arr[idx - 1];
              const showEllipsis = prevP && p - prevP > 1;
              return (
                <React.Fragment key={p}>
                  {showEllipsis && <span className="px-1 text-slate-600 font-mono">...</span>}
                  <button
                    onClick={() => setCurrentPage(p)}
                    className={`min-w-[32px] h-8 px-2.5 rounded-xl font-mono text-xs font-bold transition ${
                      p === safeCurrentPage
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {p}
                  </button>
                </React.Fragment>
              );
            })}

          <button
            disabled={safeCurrentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            disabled={safeCurrentPage >= totalPages}
            onClick={() => setCurrentPage(totalPages)}
            className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
            title="Last Page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Page Size Selector */}
        <div className="flex items-center space-x-2 text-slate-400 font-mono">
          <span className="text-[11px]">Rows / Page:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
      {/* Back to Services Navigation */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl transition shadow-xs hover:border-slate-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>← Back to Services</span>
        </Link>
      </div>

      {/* Page Title & Queue Meta Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center space-x-2.5">
            <ShieldCheck className="w-7 h-7 text-emerald-500" />
            <span className="tracking-tight">Space Listing Verification & Moderation</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review host listings against physical presence proofs, GPS accuracy, legal identity, and multi-angle photos
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/disputes?service=parking"
            className="text-xs font-bold bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 px-3.5 py-1.5 rounded-xl text-slate-300 hover:text-white transition flex items-center space-x-1.5 shadow-xs"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Parking Disputes</span>
          </Link>
          <span className="text-xs font-mono bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl text-slate-300">
            Pending Queue: <strong className="text-amber-400">{listings.length}</strong>
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* VIEW 1: SERIAL-NUMBER WISE & PAGINATED LISTING QUEUE           */}
      {/* ============================================================== */}
      {!selectedListing ? (
        <div className="space-y-4">
          {/* Search, Layout Switcher & Quick Stats Bar */}
          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by title, host name, area, address, or #PS-ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
            </div>

            {/* View Switcher: Table vs Cards */}
            <div className="flex items-center space-x-2 self-stretch md:self-auto justify-between md:justify-start">
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    viewMode === 'table'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Serial Number Tabular View"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  <span>Table View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    viewMode === 'cards'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Cards View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards View</span>
                </button>
              </div>

              <div className="text-xs text-slate-400 font-mono bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl">
                <span>{filteredListings.length} spaces</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-slate-500 text-sm">
              Loading space verification queue...
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="bg-slate-900 rounded-3xl p-14 text-center border border-slate-800 space-y-3">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-lg font-bold text-white">No Pending Approvals</h3>
              <p className="text-sm text-slate-400">
                {searchQuery ? `No pending spaces match "${searchQuery}".` : 'All submitted parking spaces have been moderated.'}
              </p>
            </div>
          ) : (
            <>
              {/* Top Pagination Summary */}
              {renderPaginationControls()}

              {/* MODE A: SERIAL NUMBER WISE TABLE LISTING */}
              {viewMode === 'table' && (
                <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
                        <tr>
                          <th className="px-4 py-4 text-center w-16">S.No</th>
                          <th className="px-4 py-4 w-28">Listing ID</th>
                          <th className="px-5 py-4 min-w-[220px]">Space / Property</th>
                          <th className="px-4 py-4 min-w-[160px]">Host</th>
                          <th className="px-4 py-4 min-w-[180px]">Location & Proof</th>
                          <th className="px-4 py-4 min-w-[130px]">Rates & Slots</th>
                          <th className="px-4 py-4 min-w-[130px]">Risk Flags</th>
                          <th className="px-5 py-4 text-right min-w-[130px]">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {paginatedListings.map((l, index) => {
                          const sNo = startIndex + index + 1;
                          const riskFlags = getRiskFlags(l);
                          const hostName = l.host?.legal_name || l.host?.full_name || 'Individual Host';
                          const hostTypeDisplay = (l.host?.host_type || l.host_type) === 'BUSINESS' ? 'Commercial' : 'Individual';
                          const previewImg = l.verification_photo_url || (l.images && l.images.length > 0 ? l.images[0].image_url : null);
                          const photosCount = l.images?.length || 0;

                          return (
                            <tr
                              key={l.id}
                              onClick={() => setSelectedListingId(l.id)}
                              className="hover:bg-slate-800/60 cursor-pointer transition group"
                            >
                              {/* S.No. */}
                              <td className="px-4 py-4 text-center">
                                <span className="inline-block font-mono font-black text-xs text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-1 rounded-lg">
                                  #{String(sNo).padStart(2, '0')}
                                </span>
                              </td>

                              {/* Listing ID */}
                              <td className="px-4 py-4">
                                <span className="font-mono font-bold text-slate-300 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-md">
                                  #PS-{10000 + l.id}
                                </span>
                                <div className="text-[10px] text-amber-400 font-mono mt-1 font-semibold">
                                  PENDING
                                </div>
                              </td>

                              {/* Space / Property with Thumbnail */}
                              <td className="px-5 py-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-black border border-slate-800 flex-shrink-0 group-hover:border-emerald-500/50 transition">
                                    {previewImg ? (
                                      <img
                                        src={getFullImageUrl(previewImg)}
                                        alt={l.title}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                                        <Car className="w-5 h-5" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-white text-sm group-hover:text-emerald-300 transition truncate max-w-[200px]">
                                      {l.title}
                                    </div>
                                    <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                                      <span className="text-slate-500 font-mono">📷 {photosCount} photos</span>
                                      <span>•</span>
                                      <span>{formatParkingType(l.parking_type)}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Host Details */}
                              <td className="px-4 py-4">
                                <div className="font-medium text-slate-200 truncate max-w-[140px] flex items-center space-x-1">
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                  <span className="truncate">{hostName}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {hostTypeDisplay} Host
                                </div>
                              </td>

                              {/* Location & GPS Proof */}
                              <td className="px-4 py-4">
                                <div className="text-slate-300 flex items-center space-x-1 truncate max-w-[180px]">
                                  <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                                  <span className="truncate">{l.approximate_address || l.exact_address || l.city}</span>
                                </div>
                                <div className="mt-1">
                                  {l.is_location_verified ? (
                                    <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full font-mono">
                                      <CheckCircle className="w-2.5 h-2.5" />
                                      <span>GPS On-site Verified</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center space-x-1 text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full font-mono">
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      <span>GPS Unverified</span>
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Rates & Slots */}
                              <td className="px-4 py-4">
                                <div className="font-bold text-emerald-400 font-mono">
                                  ₹{l.pricing_rule?.hourly_price || 40}/hr
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  ₹{l.pricing_rule?.daily_price || 250}/day • {l.capacity} Car
                                </div>
                              </td>

                              {/* Risk Flags */}
                              <td className="px-4 py-4">
                                {riskFlags.length === 0 ? (
                                  <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full font-bold">
                                    <CheckCircle className="w-3 h-3" />
                                    <span>Low Risk</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 text-[10px] text-amber-300 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full font-bold">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>{riskFlags.length} Risk Flag{riskFlags.length > 1 ? 's' : ''}</span>
                                  </span>
                                )}
                              </td>

                              {/* Action */}
                              <td className="px-5 py-4 text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedListingId(l.id);
                                  }}
                                  className="inline-flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition shadow-xs"
                                >
                                  <span>Review</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MODE B: SERIAL NUMBER WISE CARDS LISTING */}
              {viewMode === 'cards' && (
                <div className="space-y-3.5">
                  {paginatedListings.map((l, index) => {
                    const sNo = startIndex + index + 1;
                    const riskFlags = getRiskFlags(l);
                    const hostName = l.host?.legal_name || l.host?.full_name || 'Individual Host';
                    const hostTypeDisplay = (l.host?.host_type || l.host_type) === 'BUSINESS' ? 'Commercial Host' : 'Individual Host';
                    const previewImg = l.verification_photo_url || (l.images && l.images.length > 0 ? l.images[0].image_url : null);
                    const photosCount = l.images?.length || 0;

                    return (
                      <div
                        key={l.id}
                        onClick={() => setSelectedListingId(l.id)}
                        className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800/80 hover:border-emerald-500/60 rounded-3xl p-5 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-5 group"
                      >
                        {/* Left: S.No + Thumbnail Preview & Icon */}
                        <div className="flex items-center space-x-4 min-w-0 flex-1">
                          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-black border border-slate-800 flex-shrink-0 group-hover:border-emerald-500/40 transition">
                            {previewImg ? (
                              <img
                                src={getFullImageUrl(previewImg)}
                                alt={l.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 space-y-1">
                                <Car className="w-6 h-6" />
                                <span className="text-[10px]">No Photo</span>
                              </div>
                            )}
                            <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs text-[10px] font-mono text-emerald-400 font-bold border border-emerald-900/50">
                              📷 {photosCount}
                            </span>
                          </div>

                          {/* Main Details */}
                          <div className="space-y-2 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* S.No. Badge */}
                              <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-950/90 border border-emerald-800/80 px-2.5 py-1 rounded-xl shadow-xs">
                                S.No #{String(sNo).padStart(2, '0')}
                              </span>

                              <span className="text-xs font-mono font-bold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                                #PS-{10000 + l.id}
                              </span>

                              <span className="text-amber-400 font-bold bg-amber-950/80 border border-amber-800/80 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
                                Pending Review
                              </span>

                              {riskFlags.length === 0 ? (
                                <span className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full text-[10px] flex items-center space-x-1">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Low Risk / Clean</span>
                                </span>
                              ) : (
                                <span className="text-amber-300 font-bold bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full text-[10px] flex items-center space-x-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{riskFlags.length} Risk Flag{riskFlags.length > 1 ? 's' : ''}</span>
                                </span>
                              )}
                            </div>

                            <div>
                              <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition truncate">
                                {l.title}
                              </h3>
                              <p className="text-xs text-slate-400 flex items-center space-x-1.5 mt-0.5 truncate">
                                <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                                <span className="truncate">{l.approximate_address || l.exact_address || l.city}</span>
                              </p>
                            </div>

                            {/* Host & Meta Info */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                              <span className="flex items-center space-x-1 text-slate-300 font-medium">
                                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{hostName}</span>
                                <span className="text-slate-500 font-normal">({hostTypeDisplay})</span>
                              </span>
                              <span>•</span>
                              <span className="font-semibold text-emerald-400">
                                ₹{l.pricing_rule?.hourly_price || 40}/hr <span className="text-slate-500 font-normal">(₹{l.pricing_rule?.daily_price || 250}/day)</span>
                              </span>
                              <span>•</span>
                              <span>{formatParkingType(l.parking_type)} • {l.capacity} Car</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Action Button */}
                        <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800/80 flex-shrink-0">
                          <div className="text-right hidden md:block">
                            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Submission Date</span>
                            <span className="text-xs text-slate-300 font-mono">
                              {new Date(l.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedListingId(l.id);
                            }}
                            className="w-full md:w-auto bg-emerald-600 group-hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center justify-center space-x-1.5 shadow-sm"
                          >
                            <span>Review Full Dossier</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom Pagination Controls */}
              {renderPaginationControls()}
            </>
          )}
        </div>
      ) : (
        /* ============================================================== */
        /* VIEW 2: FOCUSED FULL-DETAIL DOSSIER & VERIFICATION DECISION    */
        /* ============================================================== */
        <div className="space-y-6">
          {/* Dossier Header & Back Button Bar */}
          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setSelectedListingId(null)}
              className="inline-flex items-center space-x-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 px-3.5 py-2 rounded-xl transition shadow-xs w-fit"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span>← Back to Queue (Page {safeCurrentPage})</span>
            </button>

            {/* Stepper Navigation with S.No. */}
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl font-mono">
                <span className="text-slate-400">Reviewing S.No.</span>
                <strong className="text-emerald-400 font-bold">#{String(selectedIndex + 1).padStart(2, '0')}</strong>
                <span className="text-slate-500">of</span>
                <strong className="text-white">{listings.length}</strong>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  disabled={selectedIndex <= 0}
                  onClick={() => {
                    if (selectedIndex > 0) setSelectedListingId(listings[selectedIndex - 1].id);
                  }}
                  className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 hover:text-white disabled:opacity-40 transition"
                  title="Previous S.No."
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={selectedIndex >= listings.length - 1}
                  onClick={() => {
                    if (selectedIndex < listings.length - 1) setSelectedListingId(listings[selectedIndex + 1].id);
                  }}
                  className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 hover:text-white disabled:opacity-40 transition"
                  title="Next S.No."
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Full Detailed Dossier Card */}
          {(() => {
            const l = selectedListing;
            const riskFlags = getRiskFlags(l);
            const isCoveredSpace = l.is_covered || l.is_indoor || l.parking_type.includes('COVERED') || l.parking_type.includes('GARAGE');
            const entrancePhoto = findPhoto(l.images, ['ENTRANCE', 'ROAD']);
            const slotPhoto = findPhoto(l.images, ['SLOT', 'PARKING']);
            const widePhoto = findPhoto(l.images, ['SURROUNDING', 'WIDE', 'ACCESS']);
            const clearancePhoto = findPhoto(l.images, ['ROOF', 'CLEARANCE', 'HEIGHT']);
            const gatePhoto = findPhoto(l.images, ['GATE', 'BARRIER']);

            const hostName = l.host?.legal_name || l.host?.full_name || 'Individual Host';
            const hostTypeDisplay = (l.host?.host_type || l.host_type) === 'BUSINESS' ? 'Commercial / Business Host' : 'Individual Host';

            return (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl space-y-0">
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
                        Listing Under Moderation
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
                            <span className="text-slate-200">
                              {l.host?.phone_verified ? (
                                <span className="text-emerald-400 font-semibold">✓ Verified ({l.host?.phone_number || '6381****759'})</span>
                              ) : (
                                <span className="text-amber-400">Pending Phone OTP</span>
                              )}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Email</span>
                            <span className="text-slate-200">
                              {l.host?.email_verified ? (
                                <span className="text-emerald-400 font-semibold">✓ Verified ({l.host?.email || 'host@gmail.com'})</span>
                              ) : (
                                <span className="text-amber-400">Pending Email Link</span>
                              )}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Identity</span>
                            <span className="text-slate-200">
                              {l.host?.is_identity_verified ? (
                                <span className="text-emerald-400 font-semibold">✓ Verified ({l.host?.government_id_type || 'AADHAAR'})</span>
                              ) : (
                                <span className="text-amber-400">ID Verification Pending</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* SPACE SECTION */}
                      <div className="bg-slate-950/90 rounded-2xl p-5 border border-slate-800 space-y-3.5">
                        <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                            <Car className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Space Specifications</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ──────────────────────────────
                          </span>
                        </div>

                        <div className="font-mono text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Type:</span>
                            <span className="text-slate-200 font-bold">{formatParkingType(l.parking_type)}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Capacity:</span>
                            <span className="text-slate-200 font-bold">{l.capacity} Car</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Access:</span>
                            <span className="text-slate-200 font-bold">
                              {l.has_gated_access ? 'Gated Access / Barrier' : 'Direct / Open'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">24/7 Availability:</span>
                            <span className="text-slate-200 font-bold">{l.has_24_7_access ? 'Yes' : 'Restricted Hours'}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Features:</span>
                            <span className="text-slate-200 font-bold">
                              {[
                                isCoveredSpace ? 'Covered Roof' : 'Open Air',
                                l.has_cctv ? 'CCTV Monitored' : null,
                                l.has_security_guard ? 'Security Guard' : null,
                                l.has_ev_charging ? 'EV Charging' : null
                              ].filter(Boolean).join(', ')}
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
                            <span className={`font-bold ${l.host?.property_proof_verified ? 'text-emerald-400' : 'text-slate-200'}`}>
                              {l.host?.property_proof_verified ? '✓ Verified' : '✓ Verified On-Site'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Authorization</span>
                            <span className="text-slate-400 font-bold">
                              {l.host?.authorization_status || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Location, Photos, Risk Flags */}
                    <div className="space-y-6">
                      {/* LOCATION SECTION */}
                      <div className="bg-slate-950/90 rounded-2xl p-5 border border-slate-800 space-y-3.5">
                        <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                            <span>LOCATION VERIFICATION</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ──────────────────────────────
                          </span>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-500 font-mono uppercase mb-1">Declared Address:</div>
                          <p className="text-xs text-white font-mono bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                            {l.exact_address || l.approximate_address}
                          </p>
                        </div>

                        <div className="font-mono text-xs space-y-2 pt-1 border-t border-slate-900">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">GPS Coordinates:</span>
                            <span className="text-emerald-400 font-bold">
                              {l.latitude?.toFixed(5)}, {l.longitude?.toFixed(5)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">GPS Physical Verification</span>
                            <span className="text-slate-200 font-bold">
                              {l.is_location_verified ? '✓ Captured on-site' : 'Pending'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Address Match Distance</span>
                            <span className="text-slate-200 font-bold font-mono">
                              ✓ {Math.round(l.location_verification_metadata?.distance_to_declared_m || 0)}m away
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
                              onClick={() => setInspectImage({ url: getFullImageUrl(l.verification_photo_url!), caption: 'Physical Presence Live Verification Photo', title: l.title })}
                              className="group relative rounded-xl overflow-hidden border border-emerald-800/80 hover:border-emerald-400 cursor-pointer bg-black h-32 flex items-center justify-center transition"
                            >
                              <img
                                src={getFullImageUrl(l.verification_photo_url)}
                                alt="On-Site Proof"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  const uploadsIdx = l.verification_photo_url?.indexOf('/uploads/');
                                  if (uploadsIdx !== undefined && uploadsIdx !== -1) {
                                    const path = l.verification_photo_url!.substring(uploadsIdx);
                                    if (!target.src.includes('localhost:8000')) {
                                      target.src = `http://localhost:8000${path}`;
                                    }
                                  }
                                }}
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
                            <span>MULTI-ANGLE PHOTOS</span>
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
                                  onClick={() => setInspectImage({ url: getFullImageUrl(img.image_url), caption: img.caption, title: l.title })}
                                  className="group relative rounded-lg overflow-hidden border border-slate-800 hover:border-emerald-400 cursor-pointer bg-black aspect-video transition"
                                  title={angle.label}
                                >
                                  <img
                                    src={getFullImageUrl(img.image_url)}
                                    alt={img.caption || `Photo ${idx + 1}`}
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      const uploadsIdx = img.image_url?.indexOf('/uploads/');
                                      if (uploadsIdx !== undefined && uploadsIdx !== -1) {
                                        const path = img.image_url.substring(uploadsIdx);
                                        if (!target.src.includes('localhost:8000')) {
                                          target.src = `http://localhost:8000${path}`;
                                        }
                                      }
                                    }}
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
                            <span>RISK FLAGS & COMPLIANCE</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ──────────────────────────────
                          </span>
                        </div>

                        {riskFlags.length === 0 ? (
                          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 p-3 rounded-xl">
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            <span>No suspicious flags detected. Safe to approve.</span>
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

                  {/* Decision Controls: Presets, Custom Reason, Action Buttons */}
                  <div className="pt-6 border-t border-slate-800 space-y-4 bg-slate-950/60 p-5 rounded-2xl border">
                    {/* Quick Preset Buttons */}
                    <div className="space-y-2">
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
                        Action Notes / Requirements:
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
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3 font-mono">
                      <button
                        type="button"
                        disabled={actionLoadingId === l.id}
                        onClick={() => handleAction(l.id, 'ACTIVE')}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs tracking-wider transition shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>[ APPROVE LISTING ]</span>
                      </button>

                      <button
                        type="button"
                        disabled={actionLoadingId === l.id}
                        onClick={() => handleRequestMoreInfo(l.id)}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs tracking-wider transition shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        <HelpCircle className="w-4 h-4" />
                        <span>[ REQUEST MORE INFO ]</span>
                      </button>

                      <button
                        type="button"
                        disabled={actionLoadingId === l.id}
                        onClick={() => handleAction(l.id, 'REJECTED')}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-900 hover:bg-red-800 text-red-100 font-extrabold text-xs tracking-wider transition border border-red-700 shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>[ REJECT ]</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
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
                src={getFullImageUrl(inspectImage.url)}
                alt="Enlarged space inspection"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const uploadsIdx = inspectImage.url?.indexOf('/uploads/');
                  if (uploadsIdx !== undefined && uploadsIdx !== -1) {
                    const path = inspectImage.url.substring(uploadsIdx);
                    if (!target.src.includes('localhost:8000')) {
                      target.src = `http://localhost:8000${path}`;
                    }
                  }
                }}
                className="w-full h-auto max-h-[75vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
