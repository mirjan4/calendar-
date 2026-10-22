import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Search,
  Filter,
  Unlock,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  X,
  History
} from 'lucide-react';
import api from '../../services/api';

export default function UnitAssignmentPage() {
  const [assignments, setAssignments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  // Release Modal
  const [releaseModal, setReleaseModal] = useState({ open: false, assignment: null });
  const [releaseReason, setReleaseReason] = useState('');
  const [releaseSaving, setReleaseSaving] = useState(false);
  const [releaseError, setReleaseError] = useState('');

  const fetchAssignments = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 15,
        search,
        status
      });

      const res = await api.get(`/admin/unit-assignments?${params.toString()}`);
      if (res.data.success) {
        setAssignments(res.data.assignments);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load unit assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments(1);
  }, [status]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchAssignments(1);
  };

  const handleOpenReleaseModal = (assignment) => {
    setReleaseModal({ open: true, assignment });
    setReleaseReason('');
    setReleaseError('');
  };

  const handleConfirmRelease = async (e) => {
    e.preventDefault();
    if (!releaseReason.trim()) {
      setReleaseError('A detailed reason is required to release an assigned unit.');
      return;
    }

    setReleaseSaving(true);
    setReleaseError('');

    try {
      const res = await api.post(`/admin/unit-assignments/${releaseModal.assignment.id}/release`, {
        release_reason: releaseReason.trim()
      });

      if (res.data.success) {
        setReleaseModal({ open: false, assignment: null });
        fetchAssignments(pagination.page);
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setReleaseError(err.response.data.message);
      } else {
        setReleaseError('Failed to release unit assignment.');
      }
    } finally {
      setReleaseSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
          Unit Assignment Management
        </h1>
        <p className="text-xs md:text-sm text-slate-500">
          Track active claims, release unit assignments with mandatory justification, and inspect assignment history
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, reg no, admission no, or unit..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-markaz-600 focus:bg-white font-medium"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-markaz-600 focus:bg-white font-medium"
            >
              <option value="all">All Assignments</option>
              <option value="active">Active (Claimed)</option>
              <option value="released">Released</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-markaz-700 text-white rounded-lg text-xs font-semibold hover:bg-markaz-800 transition"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">Unit Name</th>
                <th className="py-3 px-3.5">Hierarchy (Circle / Zone / District)</th>
                <th className="py-3 px-3.5">Assigned Student</th>
                <th className="py-3 px-3.5">Reg No</th>
                <th className="py-3 px-3.5">Class</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">Assigned Date</th>
                <th className="py-3 px-3.5">Release Details</th>
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
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    No unit assignment records found.
                  </td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3.5 font-bold text-markaz-800">{a.unit_name}</td>
                    <td className="py-3 px-3.5 text-xs text-slate-600">
                      {a.circle_name} → {a.zone_name} → {a.district_name}
                    </td>
                    <td className="py-3 px-3.5 font-semibold text-slate-900">{a.candidate_name}</td>
                    <td className="py-3 px-3.5 text-slate-600">{a.reg_no}</td>
                    <td className="py-3 px-3.5 text-slate-600">{a.class_name}</td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          a.status === 'active'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {a.status === 'active' ? 'Active Claim' : 'Released'}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-xs text-slate-500">
                      {new Date(a.assigned_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3.5 text-xs text-slate-600">
                      {a.status === 'released' ? (
                        <div>
                          <span className="font-semibold text-slate-800 block">
                            Reason: {a.release_reason}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            By {a.released_by_name || 'Admin'} on {new Date(a.released_at).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      {a.status === 'active' ? (
                        <button
                          onClick={() => handleOpenReleaseModal(a)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 transition"
                          title="Release this unit back to available pool"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Release</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Released</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <strong>{(pagination.page - 1) * pagination.limit + 1}</strong> to{' '}
            <strong>{Math.min(pagination.page * pagination.limit, pagination.total)}</strong> of{' '}
            <strong>{pagination.total}</strong> assignments
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchAssignments(pagination.page - 1)}
              className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-semibold text-slate-700">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchAssignments(pagination.page + 1)}
              className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Release Assignment Modal */}
      {releaseModal.open && releaseModal.assignment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Unlock className="w-4 h-4 text-rose-600" />
                <span>Release Unit Assignment</span>
              </h3>
              <button
                onClick={() => setReleaseModal({ open: false, assignment: null })}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <p>
                You are about to release unit <strong>"{releaseModal.assignment.unit_name}"</strong> currently assigned to student <strong>"{releaseModal.assignment.candidate_name}"</strong> ({releaseModal.assignment.reg_no}).
              </p>
              <p className="font-semibold">
                Releasing this unit will immediately make it available for selection by other students.
              </p>
            </div>

            {releaseError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{releaseError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmRelease} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Reason for Releasing Unit <span className="text-red-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={releaseReason}
                  onChange={(e) => setReleaseReason(e.target.value)}
                  placeholder="e.g. Student requested unit change due to relocation..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-markaz-600 font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReleaseModal({ open: false, assignment: null })}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={releaseSaving}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                >
                  {releaseSaving ? 'Releasing...' : 'Confirm & Release Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
