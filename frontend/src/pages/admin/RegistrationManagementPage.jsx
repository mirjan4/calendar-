import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Trash2,
  Printer,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  AlertCircle,
  Plus,
  Minus,
  Check,
  Edit2,
  Calendar
} from 'lucide-react';
import api from '../../services/api';

export default function RegistrationManagementPage() {
  const [registrations, setRegistrations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Location Hierarchy Filters
  const [districts, setDistricts] = useState([]);
  const [zones, setZones] = useState([]);
  const [circles, setCircles] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedCircle, setSelectedCircle] = useState('');

  // Selected Detail Modal
  const [selectedReg, setSelectedReg] = useState(null);




  // Calendar Quota Management State
  const [updatingQuotaIds, setUpdatingQuotaIds] = useState(new Set());
  const [editingQuotaId, setEditingQuotaId] = useState(null);
  const [customQuotaInput, setCustomQuotaInput] = useState('');
  const [quotaToast, setQuotaToast] = useState(null); // { type: 'success' | 'error', text: '' }

  // Auto-dismiss toast notification
  useEffect(() => {
    if (quotaToast) {
      const timer = setTimeout(() => setQuotaToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [quotaToast]);

  // Load districts for filter dropdown
  useEffect(() => {
    async function loadDistricts() {
      try {
        const res = await api.get('/locations/districts');
        if (res.data.success) setDistricts(res.data.districts);
      } catch (err) {
        console.error('Failed to load districts:', err);
      }
    }
    loadDistricts();
  }, []);

  // Load zones when district changes
  useEffect(() => {
    if (!selectedDistrict) {
      setZones([]);
      setSelectedZone('');
      setCircles([]);
      setSelectedCircle('');
      return;
    }
    async function loadZones() {
      try {
        const res = await api.get(`/locations/zones?districtId=${selectedDistrict}`);
        if (res.data.success) {
          setZones(res.data.zones);
          setSelectedZone('');
          setCircles([]);
          setSelectedCircle('');
        }
      } catch (err) {
        console.error('Failed to load zones:', err);
      }
    }
    loadZones();
  }, [selectedDistrict]);

  // Load circles when zone changes
  useEffect(() => {
    if (!selectedZone) {
      setCircles([]);
      setSelectedCircle('');
      return;
    }
    async function loadCircles() {
      try {
        const res = await api.get(`/locations/circles?zoneId=${selectedZone}`);
        if (res.data.success) {
          setCircles(res.data.circles);
          setSelectedCircle('');
        }
      } catch (err) {
        console.error('Failed to load circles:', err);
      }
    }
    loadCircles();
  }, [selectedZone]);

  const fetchRegistrations = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 15,
        search,
        registration_type: category,
        from_date: fromDate,
        to_date: toDate
      });

      if (selectedDistrict) params.append('district_id', selectedDistrict);
      if (selectedZone) params.append('zone_id', selectedZone);
      if (selectedCircle) params.append('circle_id', selectedCircle);

      const res = await api.get(`/registrations?${params.toString()}`);
      if (res.data.success) {
        setRegistrations(res.data.registrations);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load registrations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations(1);
  }, [category, selectedDistrict, selectedZone, selectedCircle]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRegistrations(1);
  };

  /**
   * Calendar Quota Handler: Increment/Decrement or Direct Edit
   * Ensures changes are immediately persisted in MySQL database
   */
  const handleQuotaChange = async (regId, delta, explicitValue) => {
    let reg = registrations.find((r) => r.id === regId);
    if (!reg && selectedReg && selectedReg.id === regId) {
      reg = selectedReg;
    }
    if (!reg) return;

    const previousQuota = reg.calendars_allotted ?? 100;
    const previousRequested = reg.calendars_requested ?? 100;
    const previousAdditional = reg.additional_calendars ?? 0;
    let targetQuota;

    if (delta !== undefined) {
      targetQuota = Math.max(0, previousQuota + delta);
    } else {
      const parsed = parseInt(explicitValue, 10);
      if (isNaN(parsed) || parsed < 0) {
        setQuotaToast({ type: 'error', text: 'Please enter a valid non-negative calendar quota.' });
        return;
      }
      targetQuota = parsed;
    }

    if (targetQuota === previousQuota && delta === 0) {
      setEditingQuotaId(null);
      return;
    }

    // 1. Optimistic instant UI update
    setRegistrations((prev) =>
      prev.map((item) => {
        if (item.id === regId) {
          return {
            ...item,
            calendars_allotted: targetQuota,
            calendars_requested: targetQuota,
            additional_calendars: 0,
            _justUpdated: true
          };
        }
        return item;
      })
    );

    // Also update selectedReg if open in modal
    if (selectedReg && selectedReg.id === regId) {
      setSelectedReg((prev) => ({
        ...prev,
        calendars_allotted: targetQuota,
        calendars_requested: targetQuota,
        additional_calendars: 0,
        _justUpdated: true
      }));
    }

    setEditingQuotaId(null);

    // Prevent accidental duplicate requests while preserving instant feedback
    setUpdatingQuotaIds((prev) => new Set(prev).add(regId));

    try {
      const payload = delta !== undefined 
        ? { delta } 
        : { calendars_allotted: targetQuota, calendars_requested: targetQuota };
      const res = await api.patch(`/registrations/${regId}/quota`, payload);

      if (res.data.success) {
        setQuotaToast({
          type: 'success',
          text: `Saved to database: ${reg.candidate_name} Calendars Quota updated to ${res.data.calendars_allotted} .`
        });

        setRegistrations((prev) =>
          prev.map((item) =>
            item.id === regId
              ? {
                  ...item,
                  calendars_requested: res.data.calendars_requested,
                  additional_calendars: res.data.additional_calendars,
                  calendars_allotted: res.data.calendars_allotted,
                  _justUpdated: true
                }
              : item
          )
        );

        if (selectedReg && selectedReg.id === regId) {
          setSelectedReg((prev) => ({
            ...prev,
            calendars_requested: res.data.calendars_requested,
            additional_calendars: res.data.additional_calendars,
            calendars_allotted: res.data.calendars_allotted,
            _justUpdated: true
          }));
        }

        // Clear pulse highlight after 1.2 seconds
        setTimeout(() => {
          setRegistrations((prev) =>
            prev.map((item) => (item.id === regId ? { ...item, _justUpdated: false } : item))
          );
        }, 1200);
      }
    } catch (err) {
      // Revert optimistic update on failure
      setRegistrations((prev) =>
        prev.map((item) =>
          item.id === regId
            ? { ...item, calendars_allotted: previousQuota, calendars_requested: previousRequested, additional_calendars: previousAdditional, _justUpdated: false }
            : item
        )
      );
      if (selectedReg && selectedReg.id === regId) {
        setSelectedReg((prev) => ({
          ...prev,
          calendars_allotted: previousQuota,
          calendars_requested: previousRequested,
          additional_calendars: previousAdditional,
          _justUpdated: false
        }));
      }
      setQuotaToast({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update calendar quota in database.'
      });
    } finally {
      setUpdatingQuotaIds((prev) => {
        const nextSet = new Set(prev);
        nextSet.delete(regId);
        return nextSet;
      });
    }
  };

  const handleDeleteRegistration = async (reg) => {
    const candidate = reg.candidate_name || 'student';
    const regNo = reg.reg_no || reg.registration_code || '';
    const unitLabel = reg.unit_name ? ` (${reg.unit_name})` : '';

    if (!window.confirm(`Are you sure you want to cancel and delete the registration for "${candidate}" (${regNo})?\n\nThis will immediately release the assigned unit${unitLabel} and allow the student to register again.`)) {
      return;
    }

    try {
      const res = await api.delete(`/registrations/${reg.id}`);
      setQuotaToast({
        type: 'success',
        text: res.data?.message || `Registration for "${candidate}" has been cancelled and deleted.`
      });
      fetchRegistrations(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel and delete registration.');
    }
  };

  const handleExport = () => {
    window.open(`/api/admin/reports/registrations?format=excel`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Calendar Allotments
          </h1>
        </div>

        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Excel</span>
        </button>
      </div>

      {/* Quota Toast Notification */}
      {quotaToast && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between border shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
            quotaToast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-red-50 text-red-900 border-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {quotaToast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{quotaToast.text}</span>
          </div>
          <button
            onClick={() => setQuotaToast(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          <div className="relative sm:col-span-2 md:col-span-1 lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code, candidate, reg no, mobile..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-markaz-600 focus:bg-white font-medium"
            />
          </div>

          <div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-markaz-600 focus:bg-white font-medium"
            >
              <option value="">All Categories</option>
              <option value="inside_kerala">Inside Kerala</option>
              <option value="outside_kerala">Outside Kerala</option>
            </select>
          </div>

          {/* District Dropdown */}
          <div>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-markaz-600 focus:bg-white font-medium"
            >
              <option value="">All Districts</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Zone Dropdown */}
          <div>
            <select
              disabled={!selectedDistrict}
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-markaz-600 focus:bg-white font-medium disabled:opacity-50"
            >
              <option value="">{selectedDistrict ? 'All Zones' : 'Select District First'}</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>

          {/* Circle Dropdown */}
          <div>
            <select
              disabled={!selectedZone}
              value={selectedCircle}
              onChange={(e) => setSelectedCircle(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-markaz-600 focus:bg-white font-medium disabled:opacity-50"
            >
              <option value="">{selectedZone ? 'All Circles' : 'Select Zone First'}</option>
              {circles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </form>

        {/* Clear Filters Indicator */}
        {(search || category || selectedDistrict || selectedZone || selectedCircle) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">
              Filtered results active
            </span>
            <button
              onClick={() => {
                setSearch('');
                setCategory('');
                setStatus('');
                setSelectedDistrict('');
                setSelectedZone('');
                setSelectedCircle('');
              }}
              className="text-red-600 hover:text-red-800 font-semibold underline"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">SL No</th>
                <th className="py-3 px-3.5">Student Name</th>
                <th className="py-3 px-3.5">Reg Number</th>
                <th className="py-3 px-3.5">District</th>
                <th className="py-3 px-3.5">Zone</th>
                <th className="py-3 px-3.5">Circle</th>
                <th className="py-3 px-3.5">Unit</th>
                <th className="py-3 px-3.5 text-center">Calendars</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-markaz-700" />
                  </td>
                </tr>
              ) : registrations.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    No registrations found matching the filters.
                  </td>
                </tr>
              ) : (
                registrations.map((r, idx) => {
                  const slNo = (pagination.page - 1) * pagination.limit + idx + 1;
                  const quotaVal = r.calendars_allotted ?? 100;
                  const isUpdating = updatingQuotaIds.has(r.id);

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3.5 font-bold text-slate-700">{slNo}</td>
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-900">{r.candidate_name}</div>
                        <div className="text-[11px] text-slate-400 capitalize">
                          {r.registration_type.replace('_', ' ')} • {r.class_name}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 font-bold text-slate-800">{r.reg_no}</td>
                      <td className="py-3 px-3.5 text-slate-700">
                        {r.registration_type === 'inside_kerala'
                          ? r.district_name || '—'
                          : r.outside_district || r.state_name || '—'}
                      </td>
                      <td className="py-3 px-3.5 text-slate-700">
                        {r.registration_type === 'inside_kerala'
                          ? r.zone_name || '—'
                          : r.outside_zone || '—'}
                      </td>
                      <td className="py-3 px-3.5 text-slate-700">
                        {r.registration_type === 'inside_kerala'
                          ? r.circle_name || '—'
                          : r.outside_circle || '—'}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="font-bold text-amber-950 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-300 shadow-2xs block truncate max-w-[150px]">
                          {r.registration_type === 'inside_kerala'
                            ? r.unit_name || '—'
                            : r.outside_unit || '—'}
                        </span>
                      </td>

                      {/* FEATURE: CALENDARS REQUIRED / QUOTA WITH [+] AND [-] */}
                      <td className="py-3 px-3.5 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <div className="inline-flex items-center gap-1.5 p-1 bg-slate-50 rounded-lg border border-slate-200 shadow-2xs">
                            {/* Minus Button [-] */}
                            <button
                              type="button"
                              disabled={quotaVal <= 0}
                              onClick={() => handleQuotaChange(r.id, -1)}
                              title="Decrease quota by 1 (-)"
                              className="w-7 h-7 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition active:scale-90 font-bold"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>

                            {/* Quota Value / Editable Display */}
                            {editingQuotaId === r.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  autoFocus
                                  value={customQuotaInput}
                                  onChange={(e) => setCustomQuotaInput(e.target.value)}
                                  onBlur={() => handleQuotaChange(r.id, undefined, customQuotaInput)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleQuotaChange(r.id, undefined, customQuotaInput);
                                    if (e.key === 'Escape') setEditingQuotaId(null);
                                  }}
                                  className="w-16 px-1.5 py-0.5 text-center font-bold text-xs bg-white border border-markaz-600 rounded focus:outline-none ring-2 ring-markaz-200"
                                />
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleQuotaChange(r.id, undefined, customQuotaInput);
                                  }}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                  title="Save Quota in Database"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setEditingQuotaId(null);
                                  }}
                                  className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingQuotaId(r.id);
                                  setCustomQuotaInput(String(quotaVal));
                                }}
                                title="Click to edit quota directly"
                                className={`min-w-14 px-2 py-0.5 rounded text-xs font-black transition-all duration-300 ${
                                  r._justUpdated
                                    ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500 scale-105'
                                    : 'bg-white hover:bg-amber-50 text-slate-900 border border-slate-200'
                                }`}
                              >
                                {isUpdating ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto text-markaz-700" />
                                ) : (
                                  `${quotaVal} `
                                )}
                              </button>
                            )}

                            {/* Plus Button [+] */}
                            <button
                              type="button"
                              onClick={() => handleQuotaChange(r.id, 1)}
                              title="Increase quota by 1 (+)"
                              className="w-7 h-7 flex items-center justify-center rounded-md bg-markaz-700 hover:bg-markaz-800 text-white shadow-2xs transition active:scale-90 font-bold"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Breakdown: Requested by student & Additional granted */}
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                            <span>Req: <strong className="text-slate-700">{r.calendars_requested ?? 100}</strong></span>
                            {(r.additional_calendars !== undefined && r.additional_calendars !== 0) && (
                              <span className={r.additional_calendars > 0 ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>
                                ({r.additional_calendars > 0 ? `+${r.additional_calendars}` : r.additional_calendars})
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedReg(r)}
                            title="View Details"
                            className="p-1.5 text-slate-500 hover:text-markaz-700 hover:bg-slate-100 rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRegistration(r)}
                            title="Cancel & Delete Registration"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <strong>{(pagination.page - 1) * pagination.limit + 1}</strong> to{' '}
            <strong>{Math.min(pagination.page * pagination.limit, pagination.total)}</strong> of{' '}
            <strong>{pagination.total}</strong> registrations
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchRegistrations(pagination.page - 1)}
              className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-semibold text-slate-700">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchRegistrations(pagination.page + 1)}
              className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Registration Details Modal */}
      {selectedReg && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-markaz-700 uppercase tracking-wider block">
                  Registration Details
                </span>
                <h3 className="font-bold text-lg text-slate-900">
                  {selectedReg.candidate_name} ({selectedReg.reg_no})
                </h3>
              </div>
              <button
                onClick={() => setSelectedReg(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-500 block font-medium">Candidate Name:</span>
                <span className="font-bold text-slate-900 text-sm">{selectedReg.candidate_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Class / Hajer No (HN):</span>
                <span className="font-bold text-slate-900">
                  {selectedReg.class_name} {selectedReg.hajer_no || selectedReg.hall_no ? `(HN: ${selectedReg.hajer_no || selectedReg.hall_no})` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Reg No:</span>
                <span className="font-bold text-slate-900">{selectedReg.reg_no}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Mobile:</span>
                <span className="font-bold text-slate-900">{selectedReg.mobile || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Category:</span>
                <span className="font-bold text-slate-900 capitalize">
                  {selectedReg.registration_type.replace('_', ' ')}
                </span>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-200/80">
                <span className="text-slate-600 block font-bold text-xs mb-1.5">
                  Calendars Required / Quota Review:
                </span>
                <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[11px] text-slate-500 block font-medium">Student Requested:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {selectedReg.calendars_requested ?? 100} 
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block font-medium">Additional Granted:</span>
                    <span className={`font-bold text-sm ${
                      (selectedReg.additional_calendars ?? 0) > 0 ? 'text-emerald-700' : 'text-slate-700'
                    }`}>
                      {(selectedReg.additional_calendars ?? 0) > 0 ? `+${selectedReg.additional_calendars}` : (selectedReg.additional_calendars ?? 0)} 
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block font-medium">Final Approved / Quota:</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <button
                        type="button"
                        disabled={(selectedReg.calendars_allotted ?? 100) <= 0}
                        onClick={() => handleQuotaChange(selectedReg.id, -1)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition active:scale-90 font-bold"
                        title="Decrease quota (-1)"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        key={selectedReg.calendars_allotted}
                        defaultValue={selectedReg.calendars_allotted ?? 100}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val !== selectedReg.calendars_allotted) {
                            handleQuotaChange(selectedReg.id, undefined, val);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                        }}
                        className="w-16 px-1.5 py-0.5 text-center font-black text-markaz-700 text-xs bg-white border border-slate-300 rounded focus:border-markaz-600 focus:ring-1 focus:ring-markaz-600 focus:outline-none"
                        title="Edit quota directly (saves on blur or Enter)"
                      />
                      <button
                        type="button"
                        onClick={() => handleQuotaChange(selectedReg.id, 1)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-markaz-700 text-white hover:bg-markaz-800 transition active:scale-90 font-bold"
                        title="Grant additional calendar (+1)"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200 text-xs space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-markaz-700 block">
                Allotted Field Work Location
              </span>
              {selectedReg.registration_type === 'inside_kerala' ? (
                <div className="space-y-0.5 text-slate-800 font-semibold">
                  <p>District: {selectedReg.district_name}</p>
                  <p>Zone: {selectedReg.zone_name}</p>
                  <p>Circle: {selectedReg.circle_name}</p>
                  <p className="text-markaz-800 font-bold">Unit: {selectedReg.unit_name}</p>
                </div>
              ) : (
                <div className="space-y-0.5 text-slate-800 font-semibold">
                  <p>State: {selectedReg.state_name}</p>
                  <p>District: {selectedReg.outside_district}</p>
                  <p>Zone: {selectedReg.outside_zone}</p>
                  <p>Circle: {selectedReg.outside_circle}</p>
                  <p className="text-markaz-800 font-bold">Unit: {selectedReg.outside_unit}</p>
                </div>
              )}
            </div>

            {selectedReg.rejection_reason && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                <strong>Status Reason:</strong> {selectedReg.rejection_reason}
              </div>
            )}

            <div className="pt-2 flex justify-between items-center border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const toDelete = selectedReg;
                    setSelectedReg(null);
                    handleDeleteRegistration(toDelete);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold transition"
                  title="Cancel & Delete Registration"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Cancel & Delete</span>
                </button>
              </div>
              <button
                onClick={() => setSelectedReg(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
