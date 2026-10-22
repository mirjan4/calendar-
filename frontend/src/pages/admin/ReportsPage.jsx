import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  Calendar,
  Layers,
  Users,
  ClipboardList,
  MapPin,
  GraduationCap,
  CheckCircle2,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Building2,
  Eye
} from 'lucide-react';
import api from '../../services/api';

// Curated 5 Essential Institutional Reports (removed redundant/unnecessary reports)
const CURATED_REPORTS = [
  {
    id: 'registrations',
    label: 'Registrations & Calendar Allotments',
    shortLabel: 'Registrations & Allotments',
    icon: ClipboardList,
    description: 'Complete audit of student submissions, quotas, and assigned places',
    badge: 'Primary'
  },
  {
    id: 'students',
    label: 'Student Directory & Registration Coverage',
    shortLabel: 'Student Directory & Coverage',
    icon: Users,
    description: 'Master list tracking who has registered vs pending balance students',
    badge: 'Master'
  },
  {
    id: 'class-wise',
    label: 'Class-wise Distribution Summary',
    shortLabel: 'Class-wise Summary',
    icon: GraduationCap,
    description: 'Comparative breakdown of registered students and calendars per class',
    badge: 'Summary'
  },
  {
    id: 'district-wise',
    label: 'District-wise Place Distribution',
    shortLabel: 'District-wise Place',
    icon: MapPin,
    description: 'District breakdown of total units, allotments, and vacant quotas',
    badge: 'Geographic'
  },
  {
    id: 'available-units',
    label: 'Vacant / Available Units Directory',
    shortLabel: 'Vacant Units Directory',
    icon: CheckCircle2,
    description: 'Ready-to-allot open units across Districts, Zones, and Circles',
    badge: 'Allotment'
  }
];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState('registrations');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Interactive In-Page Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // for registrations
  const [classFilter, setClassFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError('');
      let url = `/admin/reports/${selectedReport}?format=json`;
      if (categoryFilter !== 'all') {
        url += `&category=${categoryFilter}`;
      }
      if (classFilter !== 'all') {
        url += `&class_name=${encodeURIComponent(classFilter)}`;
      }
      if (searchTerm.trim()) {
        url += `&search=${encodeURIComponent(searchTerm.trim())}`;
      }

      const res = await api.get(url);
      if (res.data.success) {
        setReportData(res.data);
        setCurrentPage(1); // Reset to first page
      }
    } catch (err) {
      setError('Failed to fetch institutional report data. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedReport, categoryFilter, classFilter]);

  // Client-side quick search filtering (if already loaded)
  const filteredRows = useMemo(() => {
    if (!reportData || !reportData.rows) return [];
    if (!searchTerm.trim()) return reportData.rows;

    const term = searchTerm.toLowerCase().trim();
    return reportData.rows.filter((row) =>
      Object.values(row).some((val) =>
        val !== null && val !== undefined && val.toString().toLowerCase().includes(term)
      )
    );
  }, [reportData, searchTerm]);

  // Pagination slicing
  const paginatedRows = useMemo(() => {
    if (rowsPerPage === -1) return filteredRows;
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, currentPage, rowsPerPage]);

  const totalPages = rowsPerPage === -1 ? 1 : Math.ceil(filteredRows.length / rowsPerPage) || 1;

  // Export handlers
  const handleExportExcel = () => {
    let url = `/api/admin/reports/${selectedReport}?format=excel`;
    if (categoryFilter !== 'all') url += `&category=${categoryFilter}`;
    if (classFilter !== 'all') url += `&class_name=${encodeURIComponent(classFilter)}`;
    if (searchTerm.trim()) url += `&search=${encodeURIComponent(searchTerm.trim())}`;
    window.open(url, '_blank');
  };

  const handleExportCsv = () => {
    let url = `/api/admin/reports/${selectedReport}?format=csv`;
    if (categoryFilter !== 'all') url += `&category=${categoryFilter}`;
    if (classFilter !== 'all') url += `&class_name=${encodeURIComponent(classFilter)}`;
    if (searchTerm.trim()) url += `&search=${encodeURIComponent(searchTerm.trim())}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const summary = reportData?.summary || {};

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
             Reports & Analytics
            </h1>

          </div>

        </div>

        {/* Action Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchReport}
            title="Refresh active report data"
            className="p-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg shadow-2xs transition"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin text-markaz-600' : ''}`} />
          </button>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-sm transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-markaz-700 hover:bg-markaz-800 text-white rounded-lg text-xs font-bold shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Modern Curated Report Selector Tabs (Excluded from print) */}
      <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-200 shadow-xs no-print">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
            Select Institutional Report (5 Curated Views):
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            Click to view instant dataset
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {CURATED_REPORTS.map((rep) => {
            const Icon = rep.icon;
            const isSelected = selectedReport === rep.id;

            return (
              <button
                key={rep.id}
                onClick={() => {
                  setSelectedReport(rep.id);
                  setSearchTerm('');
                  setCategoryFilter('all');
                  setClassFilter('all');
                }}
                className={`p-3 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-markaz-700 text-white border-markaz-700 shadow-md shadow-markaz-950/20 ring-2 ring-markaz-500/30'
                    : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-white text-markaz-700 shadow-2xs border border-slate-200 group-hover:bg-markaz-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {rep.badge}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-xs leading-snug truncate">
                    {rep.shortLabel}
                  </h3>
                  <p
                    className={`text-[10px] mt-1 line-clamp-2 leading-tight ${
                      isSelected ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    {rep.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Summary KPI Cards for Selected Report (Excluded from print) */}
      {!loading && reportData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
          {selectedReport === 'registrations' && (
            <>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Registrations
                </span>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  {summary.totalRegistrations || 0}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Calendars
                </span>
                <span className="text-xl font-black text-markaz-700 mt-1 block">
                  {summary.totalCalendars || 0}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Inside Kerala
                </span>
                <span className="text-xl font-black text-emerald-700 mt-1 block">
                  {summary.insideCount || 0}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Outside Kerala
                </span>
                <span className="text-xl font-black text-cyan-700 mt-1 block">
                  {summary.outsideCount || 0}
                </span>
              </div>
            </>
          )}

          {selectedReport === 'students' && (
            <>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Active Students
                </span>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  {summary.totalStudents || 0}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Registered Students
                </span>
                <span className="text-xl font-black text-emerald-700 mt-1 block">
                  {summary.registeredStudents || 0}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Balance / Pending
                </span>
                <span className="text-xl font-black text-amber-700 mt-1 block">
                  {summary.balanceStudents || 0}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Calendars
                </span>
                <span className="text-xl font-black text-markaz-700 mt-1 block">
                  {summary.totalCalendars || 0}
                </span>
              </div>
            </>
          )}

          {selectedReport === 'class-wise' && (
            <>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Classes
                </span>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  {summary.totalClasses || 0}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Students
                </span>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  {summary.totalStudents || 0}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Registered Students
                </span>
                <span className="text-xl font-black text-emerald-700 mt-1 block">
                  {summary.registeredStudents || 0}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Calendars
                </span>
                <span className="text-xl font-black text-markaz-700 mt-1 block">
                  {summary.totalCalendars || 0}
                </span>
              </div>
            </>
          )}

          {selectedReport === 'district-wise' && (
            <>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Districts
                </span>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  {summary.totalDistricts || 0}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Units
                </span>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  {summary.totalUnits || 0}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Allotted Units
                </span>
                <span className="text-xl font-black text-emerald-700 mt-1 block">
                  {summary.assignedUnits || 0}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Available Units
                </span>
                <span className="text-xl font-black text-cyan-700 mt-1 block">
                  {summary.availableUnits || 0}
                </span>
              </div>
            </>
          )}

          {selectedReport === 'available-units' && (
            <>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Vacant Units Available
                </span>
                <span className="text-xl font-black text-emerald-700 mt-1 block">
                  {summary.totalAvailableUnits || 0}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Districts With Open Units
                </span>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  {summary.districtsWithVacantUnits || 0}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Main Report Table Container */}
      <div id="printable-area" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 md:p-6 space-y-4">
        {/* Table Top Controls & Official Report Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-bold text-slate-900">
                {reportData?.title || 'Institutional Report'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Jamia Markaz Calendar Distribution • Generated on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/80">
              Total Records: {filteredRows.length}
            </span>
          </div>
        </div>

        {/* Live Filter Controls inside report (Excluded from print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student, reg no, place, unit..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-markaz-600 focus:bg-white"
            />
          </div>

          {/* Category Filter for Registrations */}
          {selectedReport === 'registrations' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Category:</span>
              <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-50 text-xs">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-2.5 py-1 rounded-md font-bold transition ${
                    categoryFilter === 'all'
                      ? 'bg-markaz-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setCategoryFilter('inside_kerala')}
                  className={`px-2.5 py-1 rounded-md font-bold transition ${
                    categoryFilter === 'inside_kerala'
                      ? 'bg-markaz-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Inside Kerala
                </button>
                <button
                  onClick={() => setCategoryFilter('outside_kerala')}
                  className={`px-2.5 py-1 rounded-md font-bold transition ${
                    categoryFilter === 'outside_kerala'
                      ? 'bg-markaz-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Outside Kerala
                </button>
              </div>
            </div>
          )}

          {/* Rows per page selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Show:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-md text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={-1}>All ({filteredRows.length})</option>
            </select>
          </div>
        </div>

        {/* Table Body / Loading / Empty */}
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-markaz-700" />
            <p className="text-xs mt-2.5 font-bold text-slate-600">Compiling institutional dataset...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl text-xs">{error}</div>
        ) : filteredRows.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs space-y-1">
            <p className="font-bold text-slate-600">No records found for this query</p>
            <p className="text-[11px] text-slate-400">Try adjusting your search terms or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-black border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5 text-center w-12">#</th>
                  {reportData.columns
                    .filter((c) => c.key !== 'sl_no' && c.key !== 'registration_code')
                    .map((col) => (
                      <th key={col.key} className="py-3 px-3.5 whitespace-nowrap">
                        {col.header}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedRows.map((row, idx) => {
                  const sl = rowsPerPage === -1 ? idx + 1 : (currentPage - 1) * rowsPerPage + idx + 1;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3.5 text-center text-slate-400 font-bold">
                        {sl}
                      </td>
                      {reportData.columns
                        .filter((c) => c.key !== 'sl_no' && c.key !== 'registration_code')
                        .map((col) => {
                          const val = row[col.key];

                          // Badge styling for Registration Status in Student Master List
                          if (col.key === 'reg_status') {
                            const isRegistered = val === 'Registered';
                            return (
                              <td key={col.key} className="py-2.5 px-3.5 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isRegistered
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}
                                >
                                  {isRegistered && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                  {val}
                                </span>
                              </td>
                            );
                          }

                          // Highlight Category badge
                          if (col.key === 'category_label') {
                            const isInside = val === 'Inside Kerala';
                            return (
                              <td key={col.key} className="py-2.5 px-3.5 whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isInside
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                                  }`}
                                >
                                  {val}
                                </span>
                              </td>
                            );
                          }

                          // Highlight Quota numbers
                          if (col.key === 'calendars_allotted' || col.key === 'total_calendars') {
                            return (
                              <td key={col.key} className="py-2.5 px-3.5 whitespace-nowrap font-bold text-slate-900">
                                {val || 0}
                              </td>
                            );
                          }

                          return (
                            <td key={col.key} className="py-2.5 px-3.5 text-slate-800 whitespace-nowrap">
                              {val !== null && val !== undefined && val !== '' ? val.toString() : '-'}
                            </td>
                          );
                        })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Bottom Pagination (Excluded from print) */}
        {!loading && filteredRows.length > 0 && rowsPerPage !== -1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-500 no-print">
            <div>
              Showing{' '}
              <span className="font-bold text-slate-800">
                {(currentPage - 1) * rowsPerPage + 1}
              </span>{' '}
              to{' '}
              <span className="font-bold text-slate-800">
                {Math.min(currentPage * rowsPerPage, filteredRows.length)}
              </span>{' '}
              of <span className="font-bold text-slate-800">{filteredRows.length}</span> records
            </div>

            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-bold text-slate-800">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

