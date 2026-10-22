import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  Loader2,
  X,
  AlertCircle,
  Building2,
  Layers,
  CheckCircle2
} from 'lucide-react';
import api from '../../services/api';

export default function LocationManagementPage() {
  const [activeTab, setActiveTab] = useState('districts'); // 'districts', 'zones', 'circles', 'units'

  // Data States
  const [districts, setDistricts] = useState([]);
  const [zones, setZones] = useState([]);
  const [circles, setCircles] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add/Edit Modal
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

  const fetchLocations = async () => {
    try {
      setLoading(true);
      if (activeTab === 'districts') {
        const res = await api.get('/locations/admin/districts');
        if (res.data.success) setDistricts(res.data.districts);
      } else if (activeTab === 'zones') {
        const res = await api.get('/locations/admin/zones');
        if (res.data.success) setZones(res.data.zones);
      } else if (activeTab === 'circles') {
        const res = await api.get('/locations/admin/circles');
        if (res.data.success) setCircles(res.data.circles);
      } else if (activeTab === 'units') {
        const res = await api.get('/locations/admin/units');
        if (res.data.success) setUnits(res.data.units);
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Preload parent entities for modal dropdowns
  const [allDistricts, setAllDistricts] = useState([]);
  const [allZones, setAllZones] = useState([]);
  const [allCircles, setAllCircles] = useState([]);

  useEffect(() => {
    async function loadParents() {
      try {
        const dRes = await api.get('/locations/districts');
        if (dRes.data.success) setAllDistricts(dRes.data.districts);
      } catch (e) {}
    }
    loadParents();
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [activeTab]);

  const handleOpenAdd = async () => {
    setEditItem(null);
    setModalFormData({ name: '', district_id: allDistricts[0]?.id || '', zone_id: '', circle_id: '' });
    setModalError('');

    // Preload dependencies
    if (activeTab === 'circles' || activeTab === 'units') {
      try {
        const zRes = await api.get('/locations/admin/zones');
        if (zRes.data.success) {
          setAllZones(zRes.data.zones);
          if (zRes.data.zones.length > 0) {
            setModalFormData(prev => ({ ...prev, zone_id: zRes.data.zones[0].id }));
          }
        }
      } catch (e) {}
    }

    if (activeTab === 'units') {
      try {
        const cRes = await api.get('/locations/admin/circles');
        if (cRes.data.success) {
          setAllCircles(cRes.data.circles);
          if (cRes.data.circles.length > 0) {
            setModalFormData(prev => ({ ...prev, circle_id: cRes.data.circles[0].id }));
          }
        }
      } catch (e) {}
    }

    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditItem(item);
    setModalFormData({
      name: item.name,
      district_id: item.district_id || '',
      zone_id: item.zone_id || '',
      circle_id: item.circle_id || ''
    });
    setModalError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setModalSaving(true);
    setModalError('');

    try {
      if (activeTab === 'districts') {
        if (editItem) {
          await api.put(`/locations/admin/districts/${editItem.id}`, { name: modalFormData.name });
        } else {
          await api.post('/locations/admin/districts', { name: modalFormData.name });
        }
      } else if (activeTab === 'zones') {
        if (editItem) {
          await api.put(`/locations/admin/zones/${editItem.id}`, {
            name: modalFormData.name,
            district_id: modalFormData.district_id
          });
        } else {
          await api.post('/locations/admin/zones', {
            name: modalFormData.name,
            district_id: modalFormData.district_id
          });
        }
      } else if (activeTab === 'circles') {
        if (editItem) {
          await api.put(`/locations/admin/circles/${editItem.id}`, {
            name: modalFormData.name,
            zone_id: modalFormData.zone_id
          });
        } else {
          await api.post('/locations/admin/circles', {
            name: modalFormData.name,
            zone_id: modalFormData.zone_id
          });
        }
      } else if (activeTab === 'units') {
        if (editItem) {
          await api.put(`/locations/admin/units/${editItem.id}`, {
            name: modalFormData.name,
            circle_id: modalFormData.circle_id
          });
        } else {
          await api.post('/locations/admin/units', {
            name: modalFormData.name,
            circle_id: modalFormData.circle_id
          });
        }
      }
      setModalOpen(false);
      fetchLocations();
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

  const handleDeleteItem = async (item) => {
    const typeLabel = activeTab.slice(0, -1);
    if (!window.confirm(`Are you sure you want to permanently delete ${typeLabel} "${item.name}"?`)) return;

    try {
      await api.delete(`/locations/admin/${activeTab}/${item.id}`);
      fetchLocations();
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        alert(err.response.data.message);
      } else {
        alert('Failed to delete item.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Location & Unit Management
          </h1>
          <p className="text-xs md:text-sm text-slate-500">
            Configure Inside Kerala four-tier hierarchy: District → Zone → Circle → Unit
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-markaz-700 text-white rounded-lg text-xs font-semibold hover:bg-markaz-800 shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add New {activeTab.slice(0, -1)}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        {[
          { key: 'districts', label: 'Districts' },
          { key: 'zones', label: 'Zones' },
          { key: 'circles', label: 'Circles' },
          { key: 'units', label: 'Units' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-xs font-bold capitalize transition border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-markaz-700 text-markaz-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4"># ID</th>
                <th className="py-3 px-4">Name</th>
                {activeTab === 'zones' && <th className="py-3 px-4">District</th>}
                {activeTab === 'circles' && <th className="py-3 px-4">Zone / District</th>}
                {activeTab === 'units' && <th className="py-3 px-4">Circle / Zone / District</th>}
                {activeTab === 'districts' && <th className="py-3 px-4">Zones Count</th>}
                {activeTab === 'zones' && <th className="py-3 px-4">Circles Count</th>}
                {activeTab === 'circles' && <th className="py-3 px-4">Units Count</th>}
                {activeTab === 'units' && <th className="py-3 px-4">Assignment Status</th>}
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-markaz-700" />
                  </td>
                </tr>
              ) : activeTab === 'districts' ? (
                districts.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-400">{d.id}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{d.name}</td>
                    <td className="py-3 px-4 text-slate-600 font-semibold">{d.total_zones} Zones</td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => handleOpenEdit(d)} title="Edit District" className="p-1.5 text-slate-500 hover:text-blue-600 rounded mr-1">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteItem(d)} title="Delete District" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : activeTab === 'zones' ? (
                zones.map((z) => (
                  <tr key={z.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-400">{z.id}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{z.name}</td>
                    <td className="py-3 px-4 text-markaz-700 font-semibold">{z.district_name}</td>
                    <td className="py-3 px-4 text-slate-600 font-semibold">{z.total_circles} Circles</td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => handleOpenEdit(z)} title="Edit Zone" className="p-1.5 text-slate-500 hover:text-blue-600 rounded mr-1">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteItem(z)} title="Delete Zone" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : activeTab === 'circles' ? (
                circles.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-400">{c.id}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                    <td className="py-3 px-4 text-slate-600 font-semibold">{c.zone_name} ({c.district_name})</td>
                    <td className="py-3 px-4 text-slate-600 font-semibold">{c.total_units} Units</td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => handleOpenEdit(c)} title="Edit Circle" className="p-1.5 text-slate-500 hover:text-blue-600 rounded mr-1">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteItem(c)} title="Delete Circle" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                units.map((u) => (
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
                      <button onClick={() => handleOpenEdit(u)} title="Edit Unit" className="p-1.5 text-slate-500 hover:text-blue-600 rounded mr-1">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteItem(u)} title="Delete Unit" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition">
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

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 capitalize">
                {editItem ? `Edit ${activeTab.slice(0, -1)}` : `Add New ${activeTab.slice(0, -1)}`}
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

            <form onSubmit={handleSave} className="space-y-3">
              {activeTab === 'zones' && (
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
                    {allDistricts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === 'circles' && (
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
                    {allZones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} ({z.district_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === 'units' && (
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
                    {allCircles.map((c) => (
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
                  placeholder={`Enter ${activeTab.slice(0, -1)} name`}
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
    </div>
  );
}
