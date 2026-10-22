import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Filter,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  UploadCloud
} from 'lucide-react';
import api from '../../services/api';
import StudentImportPage from './StudentImportPage';

export default function StudentManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') === 'import' ? 'import' : 'directory';
  const handleTabChange = (tab) => {
    setSearchParams(tab === 'import' ? { tab: 'import' } : {});
  };

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedPlace, setSelectedPlace] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [viewStudent, setViewStudent] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    class_name: '',
    hajer_no: '',
    reg_no: '',
    admission_no: '',
    candidate_name: '',
    place: '',
    mobile: ''
  });
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  const fetchStudents = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 15,
        search,
        class: selectedClass,
        place: selectedPlace,
        status: selectedStatus
      });

      const res = await api.get(`/students?${params.toString()}`);
      if (res.data.success) {
        setStudents(res.data.students);
        setClasses(res.data.classes || []);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents(1);
  }, [selectedClass, selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents(1);
  };

  const handleDeleteStudent = async (student) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete student "${student.candidate_name}" (Reg No: ${student.reg_no})?\n\nThis will remove the student record and any linked calendar registrations.`
      )
    ) {
      return;
    }

    try {
      const res = await api.delete(`/students/${student.id}`);
      if (res.data.success) {
        fetchStudents(pagination.page);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete student record.';
      alert(msg);
    }
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSaving(true);

    try {
      if (editStudent) {
        await api.put(`/students/${editStudent.id}`, formData);
      } else {
        await api.post('/students', formData);
      }
      setAddModalOpen(false);
      setEditStudent(null);
      fetchStudents(pagination.page);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setFormError(err.response.data.message);
      } else {
        setFormError('Failed to save student record.');
      }
    } finally {
      setFormSaving(false);
    }
  };

  const openEditModal = (student) => {
    setEditStudent(student);
    setFormData({
      class_name: student.class_name || '',
      hajer_no: student.hajer_no || student.hall_no || '',
      reg_no: student.reg_no || '',
      admission_no: student.admission_no || '',
      candidate_name: student.candidate_name || '',
      place: student.place || '',
      mobile: student.mobile || ''
    });
    setFormError('');
    setAddModalOpen(true);
  };

  const openViewModal = async (id) => {
    try {
      const res = await api.get(`/students/${id}`);
      if (res.data.success) {
        setViewStudent(res.data);
      }
    } catch (err) {
      alert('Failed to load student details');
    }
  };

  const handleExport = () => {
    window.open(`/api/admin/reports/students?format=excel`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Student Master Management
          </h1>
          <p className="text-xs md:text-sm text-slate-500">
            View, search, edit, and bulk-import student records via spreadsheet
          </p>
        </div>

        {/* Tab Toggle Navigation */}
        <div className="flex items-center bg-slate-200/80 p-1 rounded-xl self-start sm:self-auto shadow-inner">
          <button
            type="button"
            onClick={() => handleTabChange('directory')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              currentTab === 'directory'
                ? 'bg-white text-markaz-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Students Directory</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('import')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              currentTab === 'import'
                ? 'bg-white text-markaz-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Excel & CSV Import Engine</span>
          </button>
        </div>
      </div>

      {currentTab === 'import' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 animate-in fade-in">
          <StudentImportPage
            onImportSuccess={() => {
              handleTabChange('directory');
              fetchStudents(1);
            }}
          />
        </div>
      ) : (
        <>
          {/* Action Header in Directory */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-slate-500 font-medium">
              Total <strong className="text-slate-800">{pagination.total}</strong> verified student master records
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleTabChange('import')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800 hover:bg-emerald-100 shadow-sm transition active:scale-95"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Import Excel / CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export List</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditStudent(null);
                  setFormData({
                    class_name: '',
                    hajer_no: '',
                    reg_no: '',
                    admission_no: '',
                    candidate_name: '',
                    place: '',
                    mobile: ''
                  });
                  setFormError('');
                  setAddModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-markaz-700 text-white text-xs font-semibold hover:bg-markaz-800 shadow-sm transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Student</span>
              </button>
            </div>
          </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Reg No, Admission No, Name, Mobile..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-markaz-600 focus:bg-white font-medium"
            />
          </div>

          <div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-markaz-600 focus:bg-white font-medium"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-5 py-2 bg-markaz-700 text-white rounded-lg text-xs font-semibold hover:bg-markaz-800 transition w-full sm:w-auto"
            >
              Search Students
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
                <th className="py-3 px-3.5">SL</th>
                <th className="py-3 px-3.5">Reg No</th>
                <th className="py-3 px-3.5">Candidate Name</th>
                <th className="py-3 px-3.5">Class</th>
                <th className="py-3 px-3.5">HN</th>
                <th className="py-3 px-3.5">Place</th>
                <th className="py-3 px-3.5">Mobile</th>
                <th className="py-3 px-3.5">Registration</th>
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
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    No student records found matching the criteria.
                  </td>
                </tr>
              ) : (
                students.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3.5 text-slate-500">{(pagination.page - 1) * pagination.limit + idx + 1}</td>
                    <td className="py-3 px-3.5 font-bold text-markaz-700">{s.reg_no}</td>
                    <td className="py-3 px-3.5 font-semibold text-slate-900">{s.candidate_name}</td>
                    <td className="py-3 px-3.5 text-slate-600">{s.class_name}</td>
                    <td className="py-3 px-3.5 text-slate-500">{s.hajer_no || s.hall_no || '-'}</td>
                    <td className="py-3 px-3.5 text-slate-600">{s.place || '-'}</td>
                    <td className="py-3 px-3.5 text-slate-600">{s.mobile || '-'}</td>
                    <td className="py-3 px-3.5">
                      {s.registration_code ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          Registered
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Not Registered</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openViewModal(s.id)}
                          title="View Details"
                          className="p-1.5 text-slate-500 hover:text-markaz-700 hover:bg-slate-100 rounded"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(s)}
                          title="Edit Student"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s)}
                          title="Delete Student"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
            <strong>{pagination.total}</strong> students
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchStudents(pagination.page - 1)}
              className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-semibold text-slate-700">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchStudents(pagination.page + 1)}
              className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Add / Edit Student Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {editStudent ? 'Edit Student Record' : 'Add New Student'}
              </h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStudent} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Registration No <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.reg_no}
                    onChange={(e) => setFormData({ ...formData, reg_no: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-markaz-600 focus:outline-none"
                    placeholder="e.g. 1612"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Admission No
                  </label>
                  <input
                    type="text"
                    value={formData.admission_no}
                    onChange={(e) => setFormData({ ...formData, admission_no: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-markaz-600 focus:outline-none"
                    placeholder="e.g. 1612"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Candidate Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.candidate_name}
                  onChange={(e) => setFormData({ ...formData, candidate_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-markaz-600 focus:outline-none uppercase"
                  placeholder="Full name as in registers"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Class <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-markaz-600 focus:outline-none uppercase"
                    placeholder="THQ / AALIYA"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    HN (Hajer No) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.hajer_no}
                    onChange={(e) => setFormData({ ...formData, hajer_no: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-markaz-600 focus:outline-none"
                    placeholder="Hajer #"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Place / Hometown
                  </label>
                  <input
                    type="text"
                    value={formData.place}
                    onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-markaz-600 focus:outline-none"
                    placeholder="City or Town"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Mobile Number <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-markaz-600 focus:outline-none"
                    placeholder="Optional 10-digit number"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-5 py-2 rounded-lg bg-markaz-700 text-white text-xs font-semibold hover:bg-markaz-800 transition disabled:opacity-50"
                >
                  {formSaving ? 'Saving...' : 'Save Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Student Details & Registration History Modal */}
      {viewStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {viewStudent.student.candidate_name}
                </h3>
                <span className="text-xs text-slate-500">
                  Reg No: {viewStudent.student.reg_no} • Class: {viewStudent.student.class_name}
                </span>
              </div>
              <button
                onClick={() => setViewStudent(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl">
              <div>
                <span className="text-slate-500 block">Admission No:</span>
                <span className="font-semibold text-slate-800">
                  {viewStudent.student.admission_no || viewStudent.student.reg_no}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Hajer No (HN):</span>
                <span className="font-semibold text-slate-800">{viewStudent.student.hajer_no || viewStudent.student.hall_no || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Place:</span>
                <span className="font-semibold text-slate-800">{viewStudent.student.place || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Mobile:</span>
                <span className="font-semibold text-slate-800">{viewStudent.student.mobile || 'N/A'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider">
                Registration History
              </h4>
              {viewStudent.registrations.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No registration records found for this student.</p>
              ) : (
                viewStudent.registrations.map((r) => (
                  <div key={r.id} className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-markaz-700">Registration Record #{r.id}</span>
                      <span className="capitalize px-2 py-0.5 bg-white rounded text-[11px] border border-blue-200">
                        {r.status}
                      </span>
                    </div>
                    <p className="text-slate-600">
                      Type: <strong className="capitalize">{r.registration_type.replace('_', ' ')}</strong> • Allotted: 100 Calendars
                    </p>
                    {r.registration_type === 'inside_kerala' ? (
                      <p className="text-slate-600">
                        {r.district_name} → {r.zone_name} → {r.circle_name} → <strong>{r.unit_name}</strong>
                      </p>
                    ) : (
                      <p className="text-slate-600">
                        {r.state_name}, {r.outside_district}, {r.outside_unit}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400">
                      Submitted: {new Date(r.submitted_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setViewStudent(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition"
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
