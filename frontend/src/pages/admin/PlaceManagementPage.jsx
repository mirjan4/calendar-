import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MapPin,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Download,
  User,
  CheckCircle2,
  Clock,
  Layers,
  Building2,
  Navigation,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Eye,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Loader2,
  CheckSquare,
  Sparkles,
  UploadCloud,
  FileSpreadsheet,
  Check
} from 'lucide-react';
import api from '../../services/api';

export default function PlaceManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get('view') || 'places'; // 'places' | 'hierarchy'
  const currentTab = searchParams.get('tab') || 'districts'; // 'districts' | 'zones' | 'circles' | 'units'

  // View state helper
  const setView = (newView, newTab = null) => {
    const params = { view: newView };
    if (newView === 'hierarchy') {
      params.tab = newTab || currentTab || 'districts';
    }
    setSearchParams(params);
  };

  const setHierarchyTab = (tab) => {
    setSearchParams({ view: 'hierarchy', tab });
  };

  /* =======================================================================
     VIEW 1: PLACES & STUDENT ALLOTMENTS DIRECTORY
     ======================================================================= */
  const [places, setPlaces] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  // Filter options for Places view
  const [filterDistricts, setFilterDistricts] = useState([]);
  const [filterZones, setFilterZones] = useState([]);
  const [filterCircles, setFilterCircles] = useState([]);

  // Active filters
  const [search, setSearch] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedCircle, setSelectedCircle] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'assigned' | 'unassigned'

  // Sorting
  const [sortBy, setSortBy] = useState('district');
  const [sortOrder, setSortOrder] = useState('ASC');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 1
  });

  // Modals for Places
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [releaseTarget, setReleaseTarget] = useState(null);
  const [releaseReason, setReleaseReason] = useState('');
  const [releasing, setReleasing] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Bulk Import Places Modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');

  // Load initial districts for the filter dropdowns
  useEffect(() => {
    async function loadDistricts() {
      try {
        const res = await api.get('/locations/districts');
        if (res.data.success) {
          setFilterDistricts(res.data.districts);
        }
      } catch (err) {
        console.error('Failed to load filter districts:', err);
      }
    }
    loadDistricts();
  }, []);

  // Load zones when district filter changes
  useEffect(() => {
    if (!selectedDistrict) {
      setFilterZones([]);
      setSelectedZone('');
      setFilterCircles([]);
      setSelectedCircle('');
      return;
    }
    async function loadZones() {
      try {
        const res = await api.get(`/locations/zones?districtId=${selectedDistrict}`);
        if (res.data.success) {
          setFilterZones(res.data.zones);
          setSelectedZone('');
          setFilterCircles([]);
          setSelectedCircle('');
        }
      } catch (err) {
        console.error('Failed to load filter zones:', err);
      }
    }
    loadZones();
  }, [selectedDistrict]);

  // Load circles when zone filter changes
  useEffect(() => {
    if (!selectedZone) {
      setFilterCircles([]);
      setSelectedCircle('');
      return;
    }
    async function loadCircles() {
      try {
        const res = await api.get(`/locations/circles?zoneId=${selectedZone}`);
        if (res.data.success) {
          setFilterCircles(res.data.circles);
          setSelectedCircle('');
        }
      } catch (err) {
        console.error('Failed to load filter circles:', err);
      }
    }
    loadCircles();
  }, [selectedZone]);

  // Fetch Combined Places (5 columns: District | Zone | Circle | Unit | Assigned Student)
  const fetchPlaces = useCallback(async () => {
    try {
      setPlacesLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder
      });

      if (search.trim()) params.append('search', search.trim());
      if (selectedDistrict) params.append('districtId', selectedDistrict);
      if (selectedZone) params.append('zoneId', selectedZone);
      if (selectedCircle) params.append('circleId', selectedCircle);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await api.get(`/locations/admin/places?${params.toString()}`);
      if (res.data.success) {
        setPlaces(res.data.places);
        setPagination(res.data.pagination);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err) {
      console.error('Failed to fetch places:', err);
      setActionMessage({ type: 'error', text: 'Failed to load place directory records.' });
    } finally {
      setPlacesLoading(false);
    }
  }, [page, limit, search, selectedDistrict, selectedZone, selectedCircle, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    if (currentView === 'places') {
      fetchPlaces();
    }
  }, [currentView, fetchPlaces]);

  // Column sort toggle
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortOrder('ASC');
    }
    setPage(1);
  };

  const renderSortIcon = (column) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 inline ml-1" />;
    }
    return sortOrder === 'ASC' ? (
      <ArrowUp className="w-3.5 h-3.5 text-markaz-700 inline ml-1" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-markaz-700 inline ml-1" />
    );
  };

  const resetFilters = () => {
    setSearch('');
    setSelectedDistrict('');
    setSelectedZone('');
    setSelectedCircle('');
    setStatusFilter('all');
    setSortBy('district');
    setSortOrder('ASC');
    setPage(1);
  };

  // Export filtered places to CSV
  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams({
        limit: 'all',
        sortBy,
        sortOrder
      });
      if (search.trim()) params.append('search', search.trim());
      if (selectedDistrict) params.append('districtId', selectedDistrict);
      if (selectedZone) params.append('zoneId', selectedZone);
      if (selectedCircle) params.append('circleId', selectedCircle);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await api.get(`/locations/admin/places?${params.toString()}`);
      if (!res.data.success || !res.data.places.length) {
        alert('No place records to export.');
        return;
      }

      const rows = res.data.places;
      const headers = ['District', 'Zone', 'Circle', 'Unit', 'Assigned Student', 'Reg No', 'Class', 'Mobile', 'Status'];
      const csvContent = [
        headers.join(','),
        ...rows.map(r => [
          `"${(r.district_name || '').replace(/"/g, '""')}"`,
          `"${(r.zone_name || '').replace(/"/g, '""')}"`,
          `"${(r.circle_name || '').replace(/"/g, '""')}"`,
          `"${(r.unit_name || '').replace(/"/g, '""')}"`,
          `"${(r.assigned_student_name || 'Unassigned').replace(/"/g, '""')}"`,
          `"${(r.reg_no || '').replace(/"/g, '""')}"`,
          `"${(r.class_name || '').replace(/"/g, '""')}"`,
          `"${(r.mobile || '').replace(/"/g, '""')}"`,
          `"${r.assignment_status}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Markaz_Place_Management_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export places to CSV.');
    }
  };

  const handleDownloadPlacesTemplate = () => {
    const csvContent = "District,Zone,Circle,Unit\nKozhikode,Calicut,Kallai,Kallai South Unit\nKozhikode,Calicut,Kallai,Kallai North Unit\nMalappuram,Manjeri,Manjeri Town,Kacherippadi Unit\nKannur,Kannur City,Kannur Town,City Central Unit\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_places_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportPlacesSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      setImportError('Please select a CSV or Excel file.');
      return;
    }

    setImporting(true);
    setImportError('');
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const res = await api.post('/locations/admin/places/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setImportResult(res.data);
        fetchPlaces();
        // Refresh districts
        const dRes = await api.get('/locations/districts');
        if (dRes.data.success) setFilterDistricts(dRes.data.districts);
      }
    } catch (err) {
      console.error('Import failed:', err);
      setImportError(err.response?.data?.message || 'Failed to import places file. Please check formatting.');
    } finally {
      setImporting(false);
    }
  };

  // Release Unit Assignment (Directly unassigns unit and returns it to pool)
  const handleConfirmRelease = async (e) => {
    e.preventDefault();
    if (!releaseTarget || !releaseReason.trim()) {
      alert('Please provide a mandatory release reason.');
      return;
    }
    setReleasing(true);
    try {
      const res = await api.post(`/admin/unit-assignments/${releaseTarget.assignment_id}/release`, {
        reason: releaseReason.trim()
      });
      if (res.data.success) {
        setActionMessage({
          type: 'success',
          text: `Unit "${releaseTarget.unit_name}" released successfully. The place is now Unassigned and returned to the student available pool.`
        });
        setReleaseTarget(null);
        setReleaseReason('');
        fetchPlaces();
      }
    } catch (err) {
      console.error('Release failed:', err);
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to release unit assignment.'
      });
    } finally {
      setReleasing(false);
    }
  };

  /* =======================================================================
     VIEW 2: HIERARCHY MASTER (DISTRICTS, ZONES, CIRCLES, UNITS CRUD)
     ======================================================================= */
  const [districtsList, setDistrictsList] = useState([]);
  const [zonesList, setZonesList] = useState([]);
  const [circlesList, setCirclesList] = useState([]);
  const [unitsList, setUnitsList] = useState([]);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [hierarchySearch, setHierarchySearch] = useState('');

  // Hierarchy Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [modalFormData, setModalFormData] = useState({
    name: '',
    district_id: '',
    zone_id: '',
    circle_id: ''
  });
  const [modalError, setModalError] = useState('');
  const [modalSaving, setModalSaving] = useState(false);

  // Parents for modal dropdowns
  const [modalDistricts, setModalDistricts] = useState([]);
  const [modalZones, setModalZones] = useState([]);
  const [modalCircles, setModalCircles] = useState([]);

  // Fetch Hierarchy Data
  const fetchHierarchyData = useCallback(async () => {
    try {
      setHierarchyLoading(true);
      if (currentTab === 'districts') {
        const res = await api.get('/locations/admin/districts');
        if (res.data.success) setDistrictsList(res.data.districts);
      } else if (currentTab === 'zones') {
        const res = await api.get('/locations/admin/zones');
        if (res.data.success) setZonesList(res.data.zones);
      } else if (currentTab === 'circles') {
        const res = await api.get('/locations/admin/circles');
        if (res.data.success) setCirclesList(res.data.circles);
      } else if (currentTab === 'units') {
        const res = await api.get('/locations/admin/units');
        if (res.data.success) setUnitsList(res.data.units);
      }
    } catch (err) {
      console.error('Error fetching hierarchy data:', err);
    } finally {
      setHierarchyLoading(false);
    }
  }, [currentTab]);

  useEffect(() => {
    if (currentView === 'hierarchy') {
      fetchHierarchyData();
    }
  }, [currentView, currentTab, fetchHierarchyData]);

  // Preload parent options for modal
  const loadParentOptions = async () => {
    try {
      const dRes = await api.get('/locations/districts');
      if (dRes.data.success) setModalDistricts(dRes.data.districts);

      if (currentTab === 'circles' || currentTab === 'units') {
        const zRes = await api.get('/locations/admin/zones');
        if (zRes.data.success) setModalZones(zRes.data.zones);
      }

      if (currentTab === 'units') {
        const cRes = await api.get('/locations/admin/circles');
        if (cRes.data.success) setModalCircles(cRes.data.circles);
      }
    } catch (e) {
      console.error('Error preloading parent options:', e);
    }
  };

  const handleOpenAdd = async () => {
    setEditItem(null);
    setModalError('');
    await loadParentOptions();

    setModalFormData({
      name: '',
      district_id: modalDistricts[0]?.id || filterDistricts[0]?.id || '',
      zone_id: '',
      circle_id: ''
    });
    setModalOpen(true);
  };

  const handleOpenEdit = async (item) => {
    setEditItem(item);
    setModalError('');
    await loadParentOptions();

    setModalFormData({
      name: item.name,
      district_id: item.district_id || '',
      zone_id: item.zone_id || '',
      circle_id: item.circle_id || ''
    });
    setModalOpen(true);
  };

  // Save Add/Edit
  const handleSaveHierarchy = async (e) => {
    e.preventDefault();
    if (!modalFormData.name.trim()) {
      setModalError('Name is required.');
      return;
    }
    setModalSaving(true);
    setModalError('');

    try {
      if (currentTab === 'districts') {
        if (editItem) {
          await api.put(`/locations/admin/districts/${editItem.id}`, { name: modalFormData.name.trim() });
        } else {
          await api.post('/locations/admin/districts', { name: modalFormData.name.trim() });
        }
      } else if (currentTab === 'zones') {
        if (editItem) {
          await api.put(`/locations/admin/zones/${editItem.id}`, {
            name: modalFormData.name.trim(),
            district_id: modalFormData.district_id
          });
        } else {
          await api.post('/locations/admin/zones', {
            name: modalFormData.name.trim(),
            district_id: modalFormData.district_id
          });
        }
      } else if (currentTab === 'circles') {
        if (editItem) {
          await api.put(`/locations/admin/circles/${editItem.id}`, {
            name: modalFormData.name.trim(),
            zone_id: modalFormData.zone_id
          });
        } else {
          await api.post('/locations/admin/circles', {
            name: modalFormData.name.trim(),
            zone_id: modalFormData.zone_id
          });
        }
      } else if (currentTab === 'units') {
        if (editItem) {
          await api.put(`/locations/admin/units/${editItem.id}`, {
            name: modalFormData.name.trim(),
            circle_id: modalFormData.circle_id
          });
        } else {
          await api.post('/locations/admin/units', {
            name: modalFormData.name.trim(),
            circle_id: modalFormData.circle_id
          });
        }
      }

      setModalOpen(false);
      setActionMessage({
        type: 'success',
        text: `${currentTab.slice(0, -1)} "${modalFormData.name.trim()}" saved successfully.`
      });
      fetchHierarchyData();
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setModalError(err.response.data.message);
      } else {
        setModalError('Failed to save location details.');
      }
    } finally {
      setModalSaving(false);
    }
  };

  // Delete hierarchy item
  const handleDeleteItem = async (item) => {
    const typeLabel = currentTab.slice(0, -1);
    if (!window.confirm(`Are you sure you want to permanently delete ${typeLabel} "${item.name}"?`)) return;

    try {
      await api.delete(`/locations/admin/${currentTab}/${item.id}`);

      setActionMessage({
        type: 'success',
        text: `"${item.name}" has been deleted successfully.`
      });
      fetchHierarchyData();
      fetchPlaces();
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        alert(err.response.data.message);
      } else {
        alert('Failed to delete item.');
      }
    }
  };

  // Filtered lists for Hierarchy search
  const filteredHierarchyItems = () => {
    const q = hierarchySearch.toLowerCase().trim();
    if (currentTab === 'districts') {
      return districtsList.filter(d => !q || d.name?.toLowerCase().includes(q));
    }
    if (currentTab === 'zones') {
      return zonesList.filter(z => !q || z.name?.toLowerCase().includes(q) || z.district_name?.toLowerCase().includes(q));
    }
    if (currentTab === 'circles') {
      return circlesList.filter(c => !q || c.name?.toLowerCase().includes(q) || c.zone_name?.toLowerCase().includes(q) || c.district_name?.toLowerCase().includes(q));
    }
    if (currentTab === 'units') {
      return unitsList.filter(u =>
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.circle_name?.toLowerCase().includes(q) ||
        u.zone_name?.toLowerCase().includes(q) ||
        u.district_name?.toLowerCase().includes(q) ||
        u.assigned_student_name?.toLowerCase().includes(q)
      );
    }
    return [];
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Page Header with Dual View Switcher */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-markaz-50 rounded-xl text-markaz-700 shadow-sm">
              <MapPin className="w-6 h-6 text-markaz-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                  Place & Location Management
                </h1>
               
              </div>
            
            </div>
          </div>

          {/* Action buttons (Refresh / CSV / Add New) */}
          <div className="flex items-center gap-2">
            {currentView === 'places' ? (
              <>
                <button
                  onClick={() => fetchPlaces()}
                  title="Refresh place allotments"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${placesLoading ? 'animate-spin text-markaz-700' : ''}`} />
                  <span>Refresh</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  title="Export filtered places to CSV"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={() => {
                    setImportModalOpen(true);
                    setImportFile(null);
                    setImportResult(null);
                    setImportError('');
                  }}
                  title="Import Places (District, Zone, Circle, Unit) from CSV / Excel"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition active:scale-95"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Import Places CSV</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-markaz-700 hover:bg-markaz-800 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New {currentTab.slice(0, -1)}</span>
              </button>
            )}
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-100 pt-3 gap-3">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl gap-1">
            <button
              onClick={() => setView('places')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                currentView === 'places'
                  ? 'bg-white text-markaz-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Navigation className="w-4 h-4" />
              <span>Places & Student Allotments</span>
              {summary && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  currentView === 'places' ? 'bg-markaz-50 text-markaz-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {summary.total_units} Units
                </span>
              )}
            </button>

            <button
              onClick={() => setView('hierarchy')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                currentView === 'hierarchy'
                  ? 'bg-white text-markaz-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Location Hierarchy Master</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                currentView === 'hierarchy' ? 'bg-markaz-50 text-markaz-700' : 'bg-slate-200 text-slate-600'
              }`}>
                Districts / Zones / Circles / Units
              </span>
            </button>
          </div>

          <div className="text-xs text-slate-400 font-medium">
            {currentView === 'places' ? (
              <span>Viewing unified 5-column table with student claims</span>
            ) : (
              <span>Configure hierarchy records and active status</span>
            )}
          </div>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs md:text-sm animate-in fade-in ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="p-1 hover:bg-black/5 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ===================================================================
          VIEW 1 CONTENT: PLACES & STUDENT ALLOTMENTS
          =================================================================== */}
      {currentView === 'places' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Units / Places</span>
                  <Layers className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {summary.total_units}
                </div>
                <div className="text-[11px] text-slate-500">
                  Across {summary.total_districts} Districts & {summary.total_zones} Zones
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-emerald-700">
                  <span className="text-xs font-semibold uppercase tracking-wider">Assigned Units</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-emerald-800 tracking-tight">
                  {summary.assigned_units}
                </div>
                <div className="text-[11px] text-emerald-700 font-medium">
                  Confirmed with active students
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-blue-700">
                  <span className="text-xs font-semibold uppercase tracking-wider">Available (Unassigned)</span>
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-blue-800 tracking-tight">
                  {summary.unassigned_units}
                </div>
                <div className="text-[11px] text-blue-600 font-medium">
                  Ready for student selection
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-purple-700">
                  <span className="text-xs font-semibold uppercase tracking-wider">Allotment Rate</span>
                  <Building2 className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-2xl font-black text-purple-800 tracking-tight">
                  {summary.total_units > 0
                    ? `${Math.round((summary.assigned_units / summary.total_units) * 100)}%`
                    : '0%'}
                </div>
                <div className="text-[11px] text-purple-600 font-medium">
                  Overall field coverage
                </div>
              </div>
            </div>
          )}

          {/* Filter and Search Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Universal Search Input */}
              <div className="relative sm:col-span-2 lg:col-span-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search Unit, Circle, Zone, District, or Student Name..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-markaz-600"
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* District Filter Dropdown */}
              <div>
                <select
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-markaz-600"
                >
                  <option value="">All Districts</option>
                  {filterDistricts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Zone Filter Dropdown */}
              <div>
                <select
                  value={selectedZone}
                  disabled={!selectedDistrict}
                  onChange={(e) => {
                    setSelectedZone(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-markaz-600 disabled:opacity-50"
                >
                  <option value="">{selectedDistrict ? 'All Zones' : 'Select District First'}</option>
                  {filterZones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Circle Filter Dropdown */}
              <div>
                <select
                  value={selectedCircle}
                  disabled={!selectedZone}
                  onChange={(e) => {
                    setSelectedCircle(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-markaz-600 disabled:opacity-50"
                >
                  <option value="">{selectedZone ? 'All Circles' : 'Select Zone First'}</option>
                  {filterCircles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignment Status Filter Dropdown */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-markaz-600"
                >
                  <option value="all">All Allotments</option>
                  <option value="assigned">Assigned Only</option>
                  <option value="unassigned">Unassigned (Available) Only</option>
                </select>
              </div>
            </div>

            {/* Active Filters Pill Bar */}
            {(search || selectedDistrict || selectedZone || selectedCircle || statusFilter !== 'all') && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs border-t border-slate-100">
                <span className="text-slate-500 font-semibold flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-markaz-700" />
                  Active Filters:
                </span>

                {search && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    Keyword: "{search}"
                    <button onClick={() => setSearch('')}><X className="w-3 h-3 hover:text-red-600" /></button>
                  </span>
                )}

                {selectedDistrict && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    District: {filterDistricts.find(d => d.id === parseInt(selectedDistrict))?.name}
                    <button onClick={() => setSelectedDistrict('')}><X className="w-3 h-3 hover:text-red-600" /></button>
                  </span>
                )}

                {selectedZone && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Zone: {filterZones.find(z => z.id === parseInt(selectedZone))?.name}
                    <button onClick={() => setSelectedZone('')}><X className="w-3 h-3 hover:text-red-600" /></button>
                  </span>
                )}

                {statusFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 capitalize">
                    Status: {statusFilter}
                    <button onClick={() => setStatusFilter('all')}><X className="w-3 h-3 hover:text-red-600" /></button>
                  </span>
                )}

                <button
                  onClick={resetFilters}
                  className="text-xs text-red-600 hover:text-red-800 font-semibold underline ml-auto"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>

          {/* COMBINED 5-COLUMN TABLE */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="bg-slate-50 text-slate-700 uppercase text-[11px] font-bold border-b border-slate-200 tracking-wider">
                  <tr>
                    {/* 1. District Column */}
                    <th
                      onClick={() => handleSort('district')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition select-none group"
                    >
                      <div className="flex items-center gap-1">
                        <span>District</span>
                        {renderSortIcon('district')}
                      </div>
                    </th>

                    {/* 2. Zone Column */}
                    <th
                      onClick={() => handleSort('zone')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition select-none group"
                    >
                      <div className="flex items-center gap-1">
                        <span>Zone</span>
                        {renderSortIcon('zone')}
                      </div>
                    </th>

                    {/* 3. Circle Column */}
                    <th
                      onClick={() => handleSort('circle')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition select-none group"
                    >
                      <div className="flex items-center gap-1">
                        <span>Circle</span>
                        {renderSortIcon('circle')}
                      </div>
                    </th>

                    {/* 4. Unit Column */}
                    <th
                      onClick={() => handleSort('unit')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition select-none group"
                    >
                      <div className="flex items-center gap-1">
                        <span>Unit</span>
                        {renderSortIcon('unit')}
                      </div>
                    </th>

                    {/* 5. Assigned Student Column */}
                    <th
                      onClick={() => handleSort('student')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition select-none group"
                    >
                      <div className="flex items-center gap-1">
                        <span>Assigned Student</span>
                        {renderSortIcon('student')}
                      </div>
                    </th>

                    {/* Actions */}
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-medium">
                  {placesLoading ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-markaz-700 mb-2" />
                        <span>Loading combined place records...</span>
                      </td>
                    </tr>
                  ) : places.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400">
                        <MapPin className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-700 text-sm">No places found matching the filters.</p>
                        <p className="text-xs text-slate-400 mt-1">Try resetting search or location criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    places.map((place) => {
                      const isAssigned = place.assignment_status === 'Assigned';
                      return (
                        <tr
                          key={place.unit_id}
                          className="hover:bg-slate-50/80 transition duration-150"
                        >
                          {/* 1. District */}
                          <td className="py-3 px-4 text-slate-900 font-semibold">
                            {place.district_name}
                          </td>

                          {/* 2. Zone */}
                          <td className="py-3 px-4 text-slate-700">
                            {place.zone_name}
                          </td>

                          {/* 3. Circle */}
                          <td className="py-3 px-4 text-slate-700">
                            {place.circle_name}
                          </td>

                          {/* 4. Unit */}
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <span className="inline-flex items-center gap-1.5">
                              <span>{place.unit_name}</span>
                              {!place.unit_is_active && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-medium">
                                  Inactive
                                </span>
                              )}
                            </span>
                          </td>

                          {/* 5. Assigned Student Name */}
                          <td className="py-3 px-4">
                            {isAssigned ? (
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                                <div>
                                  <span className="font-bold text-slate-900 block leading-tight">
                                    {place.assigned_student_name}
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-normal">
                                    Reg: {place.reg_no} • {place.class_name}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                Unassigned
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            {isAssigned ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedStudent(place)}
                                  title="View student allotment details"
                                  className="p-1.5 text-slate-500 hover:text-markaz-700 hover:bg-slate-100 rounded-lg transition"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setReleaseTarget(place);
                                    setReleaseReason('');
                                  }}
                                  title="Release unit assignment"
                                  className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition"
                                >
                                  Release
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Available Pool
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination & Counter Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>
                  Showing{' '}
                  <strong className="text-slate-900">
                    {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
                  </strong>{' '}
                  to{' '}
                  <strong className="text-slate-900">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </strong>{' '}
                  of <strong className="text-slate-900">{pagination.total}</strong> places
                </span>

                <span className="text-slate-300">|</span>

                <div className="flex items-center gap-1">
                  <span>Per page:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(parseInt(e.target.value, 10));
                      setPage(1);
                    }}
                    className="px-2 py-1 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none"
                  >
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={pagination.page <= 1 || placesLoading}
                  title="First Page"
                  className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1 || placesLoading}
                  title="Previous Page"
                  className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-3 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-800">
                  Page {pagination.page} of {pagination.totalPages || 1}
                </span>

                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages || placesLoading}
                  title="Next Page"
                  className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(pagination.totalPages)}
                  disabled={pagination.page >= pagination.totalPages || placesLoading}
                  title="Last Page"
                  className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          VIEW 2 CONTENT: LOCATION HIERARCHY MASTER
          =================================================================== */}
      {currentView === 'hierarchy' && (
        <div className="space-y-4">
          {/* Sub-tab Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200">
            <div className="flex gap-1">
              {[
                { key: 'districts', label: 'Districts', count: districtsList.length },
                { key: 'zones', label: 'Zones', count: zonesList.length },
                { key: 'circles', label: 'Circles', count: circlesList.length },
                { key: 'units', label: 'Units', count: unitsList.length }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setHierarchyTab(tab.key)}
                  className={`px-4 py-3 text-xs font-bold capitalize transition border-b-2 -mb-px flex items-center gap-1.5 ${
                    currentTab === tab.key
                      ? 'border-markaz-700 text-markaz-700 bg-slate-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      currentTab === tab.key ? 'bg-markaz-100 text-markaz-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* In-tab Search */}
            <div className="relative pb-2 sm:pb-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={hierarchySearch}
                onChange={(e) => setHierarchySearch(e.target.value)}
                placeholder={`Search in ${currentTab}...`}
                className="pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-markaz-600 w-full sm:w-64"
              />
              {hierarchySearch && (
                <button
                  onClick={() => setHierarchySearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Table Container for Hierarchy */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="bg-slate-50 text-slate-700 uppercase text-[11px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4"># ID</th>
                    <th className="py-3 px-4">Name</th>
                    {currentTab === 'zones' && <th className="py-3 px-4">District</th>}
                    {currentTab === 'circles' && <th className="py-3 px-4">Zone / District</th>}
                    {currentTab === 'units' && <th className="py-3 px-4">Circle / Zone / District</th>}
                    {currentTab === 'districts' && <th className="py-3 px-4">Zones Count</th>}
                    {currentTab === 'zones' && <th className="py-3 px-4">Circles Count</th>}
                    {currentTab === 'circles' && <th className="py-3 px-4">Units Count</th>}
                    {currentTab === 'units' && <th className="py-3 px-4">Assignment Status</th>}
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-medium">
                  {hierarchyLoading ? (
                    <tr>
                      <td colSpan="6" className="py-10 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-markaz-700 mb-1" />
                        <span>Loading {currentTab}...</span>
                      </td>
                    </tr>
                  ) : filteredHierarchyItems().length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-10 text-center text-slate-400">
                        <p className="font-semibold text-slate-600">No {currentTab} found.</p>
                      </td>
                    </tr>
                  ) : currentTab === 'districts' ? (
                    filteredHierarchyItems().map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-400">{d.id}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{d.name}</td>
                        <td className="py-3 px-4 text-slate-600 font-semibold">{d.total_zones} Zones</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenEdit(d)}
                            title="Edit District"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded mr-1 transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(d)}
                            title="Delete District"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : currentTab === 'zones' ? (
                    filteredHierarchyItems().map((z) => (
                      <tr key={z.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-400">{z.id}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{z.name}</td>
                        <td className="py-3 px-4 text-markaz-700 font-semibold">{z.district_name}</td>
                        <td className="py-3 px-4 text-slate-600 font-semibold">{z.total_circles} Circles</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenEdit(z)}
                            title="Edit Zone"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded mr-1 transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(z)}
                            title="Delete Zone"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : currentTab === 'circles' ? (
                    filteredHierarchyItems().map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-400">{c.id}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                        <td className="py-3 px-4 text-slate-600 font-semibold">
                          {c.zone_name} ({c.district_name})
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-semibold">{c.total_units} Units</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenEdit(c)}
                            title="Edit Circle"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded mr-1 transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(c)}
                            title="Delete Circle"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    filteredHierarchyItems().map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-400">{u.id}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{u.name}</td>
                        <td className="py-3 px-4 text-slate-600 text-xs">
                          {u.circle_name} → {u.zone_name} → {u.district_name}
                        </td>
                        <td className="py-3 px-4">
                          {u.active_assignment_id ? (
                            <div className="space-y-0.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                Claimed
                              </span>
                              <span className="block text-xs font-bold text-slate-800">
                                {u.assigned_student_name} ({u.assigned_student_reg_no})
                              </span>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Available
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            title="Edit Unit"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded mr-1 transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(u)}
                            title="Delete Unit"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: STUDENT DETAILS PREVIEW
          =================================================================== */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-markaz-50 rounded-lg text-markaz-700">
                  <User className="w-5 h-5 text-markaz-700" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 leading-snug">
                    {selectedStudent.candidate_name || selectedStudent.assigned_student_name}
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    Allotted Student Information
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-500 block font-medium">Candidate Name:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selectedStudent.candidate_name || selectedStudent.assigned_student_name}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Class:</span>
                <span className="font-bold text-slate-900">{selectedStudent.class_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Student Reg No:</span>
                <span className="font-bold text-slate-900">{selectedStudent.reg_no || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Admission No:</span>
                <span className="font-bold text-slate-900">{selectedStudent.admission_no || selectedStudent.reg_no}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Mobile Contact:</span>
                <span className="font-bold text-slate-900">{selectedStudent.mobile || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Calendar Quota:</span>
                <span className="font-bold text-markaz-700">
                  {selectedStudent.calendars_allotted || selectedStudent.calendar_quota ? `${selectedStudent.calendars_allotted || selectedStudent.calendar_quota} ` : '100 '}
                </span>
                {selectedStudent.calendars_requested && (
                  <span className="text-[10px] text-slate-500 block">
                    (Req: {selectedStudent.calendars_requested}{selectedStudent.additional_calendars > 0 ? ` +${selectedStudent.additional_calendars}` : ''})
                  </span>
                )}
              </div>
            </div>

            <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1">
              <span className="font-bold block text-markaz-800">Confirmed Location Hierarchy:</span>
              <p>
                {selectedStudent.district_name} → {selectedStudent.zone_name} → {selectedStudent.circle_name} → <strong>{selectedStudent.unit_name}</strong>
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: RELEASE UNIT ASSIGNMENT
          =================================================================== */}
      {releaseTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Release Unit Assignment
                </h3>
              </div>
              <button
                onClick={() => setReleaseTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to release the assignment for unit{' '}
              <strong className="text-slate-900">{releaseTarget.unit_name}</strong> currently assigned to{' '}
              <strong className="text-slate-900">{releaseTarget.assigned_student_name}</strong>?
            </p>

            <form onSubmit={handleConfirmRelease} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Justification / Release Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={releaseReason}
                  onChange={(e) => setReleaseReason(e.target.value)}
                  placeholder="Enter the official reason for releasing this unit..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-markaz-600"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReleaseTarget(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={releasing}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-400 text-white text-xs font-bold rounded-lg shadow transition"
                >
                  {releasing ? 'Releasing...' : 'Confirm Release'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: ADD / EDIT HIERARCHY ENTITY
          =================================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 capitalize">
                {editItem ? `Edit ${currentTab.slice(0, -1)}` : `Add New ${currentTab.slice(0, -1)}`}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveHierarchy} className="space-y-3">
              {currentTab === 'zones' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    District <span className="text-red-600">*</span>
                  </label>
                  <select
                    required
                    value={modalFormData.district_id}
                    onChange={(e) => setModalFormData({ ...modalFormData, district_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-markaz-600"
                  >
                    <option value="">Select District</option>
                    {modalDistricts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {currentTab === 'circles' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Zone <span className="text-red-600">*</span>
                  </label>
                  <select
                    required
                    value={modalFormData.zone_id}
                    onChange={(e) => setModalFormData({ ...modalFormData, zone_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-markaz-600"
                  >
                    <option value="">Select Zone</option>
                    {modalZones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} ({z.district_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {currentTab === 'units' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Circle <span className="text-red-600">*</span>
                  </label>
                  <select
                    required
                    value={modalFormData.circle_id}
                    onChange={(e) => setModalFormData({ ...modalFormData, circle_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-markaz-600"
                  >
                    <option value="">Select Circle</option>
                    {modalCircles.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.zone_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={modalFormData.name}
                  onChange={(e) => setModalFormData({ ...modalFormData, name: e.target.value })}
                  placeholder={`Enter ${currentTab.slice(0, -1)} name`}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-markaz-600 font-medium"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="px-5 py-2 bg-markaz-700 hover:bg-markaz-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {modalSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Places Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Import Places from CSV / Excel
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bulk import District, Zone, Circle, and Unit in one time
                  </p>
                </div>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Required CSV Columns:</span>
                <button
                  type="button"
                  onClick={handleDownloadPlacesTemplate}
                  className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample Template</span>
                </button>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Your CSV or Excel file must contain four headers: <strong>District</strong>, <strong>Zone</strong>, <strong>Circle</strong>, and <strong>Unit</strong>.
              </p>
              <div className="bg-white p-2 rounded border border-slate-200 font-mono text-[11px] text-slate-700">
                District,Zone,Circle,Unit<br />
                Kozhikode,Calicut,Kallai,Kallai South Unit<br />
                Malappuram,Manjeri,Manjeri Town,Kacherippadi Unit
              </div>
            </div>

            {importError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {importResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Import Completed Successfully!</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1 font-medium">
                  <div className="bg-white p-2.5 rounded border border-emerald-100 shadow-2xs">
                    <span className="text-slate-500 block text-[11px]">Rows Processed</span>
                    <strong className="text-slate-900 text-sm">{importResult.stats.processedRows}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-emerald-100 shadow-2xs">
                    <span className="text-slate-500 block text-[11px]">Districts Created</span>
                    <strong className="text-emerald-700 text-sm">+{importResult.stats.createdDistricts}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-emerald-100 shadow-2xs">
                    <span className="text-slate-500 block text-[11px]">Zones Created</span>
                    <strong className="text-emerald-700 text-sm">+{importResult.stats.createdZones}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-emerald-100 shadow-2xs">
                    <span className="text-slate-500 block text-[11px]">Circles Created</span>
                    <strong className="text-emerald-700 text-sm">+{importResult.stats.createdCircles}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-emerald-100 shadow-2xs">
                    <span className="text-slate-500 block text-[11px]">Units Created</span>
                    <strong className="text-emerald-700 text-sm">+{importResult.stats.createdUnits}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-emerald-100 shadow-2xs">
                    <span className="text-slate-500 block text-[11px]">Units Already Existed</span>
                    <strong className="text-slate-600 text-sm">{importResult.stats.skippedUnits}</strong>
                  </div>
                </div>
              </div>
            )}

            {!importResult ? (
              <form onSubmit={handleImportPlacesSubmit} className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50/50 transition">
                  <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    required
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setImportFile(e.target.files[0]);
                        setImportError('');
                      }
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-markaz-50 file:text-markaz-700 hover:file:bg-markaz-100 cursor-pointer"
                  />
                  {importFile && (
                    <p className="text-xs text-slate-600 mt-2 font-semibold">
                      Selected: <span className="text-markaz-800 font-bold">{importFile.name}</span> ({(importFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setImportModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={importing || !importFile}
                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Importing Places...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Upload & Import Places</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-5 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
