import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  ClipboardList,
  Clock,
  CheckCircle2,
  MapPin,
  Globe,
  CheckSquare,
  Sparkles,
  ArrowRight,
  Loader2,
  Calendar
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import api from '../../services/api';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const res = await api.get('/admin/dashboard');
        if (res.data.success) {
          setData(res.data);
        }
      } catch (err) {
        setError('Failed to load dashboard metrics. Check server connectivity.');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-markaz-700 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
        {error}
      </div>
    );
  }

  const { stats, charts, recentRegistrations } = data;

  const statCards = [
    { title: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { title: 'Total Registrations', value: stats.totalRegistrations, icon: ClipboardList, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { title: 'Balance Students', value: stats.balanceStudents ?? Math.max(0, (stats.totalStudents || 0) - (stats.totalRegistrations || 0)), icon: Users, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { title: 'Total Calendars', value: `${stats.totalCalendars || 0} `, icon: Calendar, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { title: 'Assigned Units', value: stats.assignedUnits, icon: CheckSquare, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { title: 'Available Units', value: stats.availableUnits, icon: Sparkles, color: 'text-rose-600 bg-rose-50 border-rose-200' }
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs md:text-sm text-slate-500">
            Dashboard Overview and calendar distribution metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/reports"
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            Generate Reports
          </Link>
          <Link
            to="/admin/registrations"
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-markaz-700 text-white hover:bg-markaz-800 shadow-sm transition"
          >
            View Registrations
          </Link>
        </div>
      </div>

      {/* 6 Metric Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3"
            >
              <div>
                <span className="text-xs text-slate-500 font-medium block">
                  {card.title}
                </span>
                <span className="text-xl md:text-2xl font-extrabold text-slate-900 mt-1 block">
                  {card.value}
                </span>
              </div>
              <div className={`p-2.5 rounded-xl border ${card.color} shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Full-Length Chart: Registrations by Student Class */}
      <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm md:text-base">
              Registrations by Student Class
            </h3>
            <p className="text-xs text-slate-500">Distribution of registered students across institutional classes</p>
          </div>
          <span className="text-xs font-semibold text-markaz-700 bg-markaz-50 px-2.5 py-1 rounded-lg border border-markaz-200">
            {charts.byClass?.length || 0} Classes
          </span>
        </div>
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.byClass} margin={{ top: 10, right: 20, left: -10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="class_name" tick={{ fontSize: 12, fill: '#64748b' }} interval={0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}
              />
              <Bar dataKey="count" fill="#0c629e" radius={[6, 6, 0, 0]} name="Students" barSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Full-Length Chart 2: Unit Distribution (Assigned vs Available) */}
      <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm md:text-base">
              Unit Distribution (Assigned vs Available)
            </h3>
            <p className="text-xs text-slate-500">
              Overview of claimed student units and remaining available quotas per district
            </p>
          </div>
          <span className="text-xs font-semibold text-markaz-700 bg-markaz-50 px-2.5 py-1 rounded-lg border border-markaz-200">
            {charts.unitAvailability?.length || 0} Districts
          </span>
        </div>
        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.unitAvailability} margin={{ top: 10, right: 20, left: -10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="district"
                tick={{ fontSize: 11, fill: '#64748b' }}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={50}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}
                formatter={(value, name) => [`${value} Units`, name]}
              />
              <Legend iconType="square" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="assigned" stackId="a" fill="#0c629e" name="Assigned Units" maxBarSize={36} />
              <Bar dataKey="available" stackId="a" fill="#cbd5e1" radius={[6, 6, 0, 0]} name="Available Units" maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Registrations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            Recent Registrations
          </h3>
          <Link
            to="/admin/registrations"
            className="text-xs font-semibold text-markaz-700 hover:text-markaz-900 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">SL No</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Reg No</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Calendars Allotted</th>
                <th className="py-3 px-4">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {recentRegistrations.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-6 text-center text-slate-400">
                    No registrations found.
                  </td>
                </tr>
              ) : (
                recentRegistrations.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-700">{idx + 1}</td>
                    <td className="py-3 px-4 text-slate-900 font-semibold">{r.candidate_name}</td>
                    <td className="py-3 px-4 text-slate-600">{r.reg_no}</td>
                    <td className="py-3 px-4 text-slate-600">{r.class_name}</td>
                    <td className="py-3 px-4">
                      <span className="capitalize">{r.registration_type.replace('_', ' ')}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-markaz-700">
                      {r.calendars_allotted || 100}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">
                      {new Date(r.submitted_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
