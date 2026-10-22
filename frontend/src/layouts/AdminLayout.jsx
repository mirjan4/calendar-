import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  MapPin,
  BarChart3,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Sparkles,
  ShieldCheck,
  PanelLeftClose,
  PanelLeft,
  Compass,
  Settings,
  ChevronDown,
  Lock,
  User,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminLayout() {
  const { user, logout, updateProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Dropdown & Modal states
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Settings form states
  const [editFullName, setEditFullName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');

  // Mobile drawer state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Desktop collapse state (persisted)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('admin_sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenSettings = () => {
    setEditFullName(user?.fullName || '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSettingsError('');
    setSettingsSuccess('');
    setUserDropdownOpen(false);
    setSettingsModalOpen(true);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    const trimmedName = editFullName.trim();
    if (!trimmedName && !newPassword) {
      setSettingsError('Please provide a new name or a new password to save changes.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setSettingsError('New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setSettingsError('New password and confirmation password do not match.');
        return;
      }
    }

    try {
      setSavingSettings(true);
      await updateProfile({
        fullName: trimmedName || undefined,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined
      });
      setSettingsSuccess('Settings updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setSettingsModalOpen(false);
        setSettingsSuccess('');
      }, 1200);
    } catch (err) {
      setSettingsError(err.response?.data?.message || err.message || 'Failed to update settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Grouped Navigation for modern visual hierarchy
  const navSections = [
    {
      title: 'OVERVIEW',
      items: [
        {
          label: 'Dashboard',
          path: '/admin/dashboard',
          icon: LayoutDashboard,
          iconColor: 'text-sky-400 group-hover:text-sky-300',
          badge: null
        }
      ]
    },
    {
      title: 'STUDENTS & ALLOTMENTS',
      items: [
        {
          label: 'Student Directory',
          path: '/admin/students',
          icon: Users,
          iconColor: 'text-emerald-400 group-hover:text-emerald-300',
          badge: null
        },
        {
          label: 'Registrations ',
          path: '/admin/registrations',
          icon: ClipboardList,
          iconColor: 'text-amber-400 group-hover:text-amber-300',
          badge: ''
        },
        {
          label: 'Place & Unit Management',
          path: '/admin/places',
          icon: MapPin,
          iconColor: 'text-violet-400 group-hover:text-violet-300',
          badge: null
        }
      ]
    },
    {
      title: 'ANALYTICS & EXPORTS',
      items: [
        {
          label: 'Reports & Analytics',
          path: '/admin/reports',
          icon: BarChart3,
          iconColor: 'text-rose-400 group-hover:text-rose-300',
          badge: '5 Reports'
        }
      ]
    }
  ];

  // Helper for current page title
  const getPageTitle = () => {
    for (const section of navSections) {
      for (const item of section.items) {
        if (location.pathname.startsWith(item.path)) {
          return item.label;
        }
      }
    }
    return 'Console';
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out from the administrative session?')) {
      await logout();
      navigate('/admin/login');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'AD';
    return name
      .trim()
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row antialiased font-sans">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-slate-950 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 border-b border-slate-800 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shadow-md ring-1 ring-white/20 overflow-hidden shrink-0">
            <img src="/markaz-logo.png" alt="Jamia Markaz" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight block">Jamia Markaz</span>
            <span className="text-[10px] text-cyan-400 font-medium block -mt-0.5">Admin Console</span>
          </div>
        </div>
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          aria-label="Toggle navigation menu"
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95"
        >
          {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Backdrop for mobile drawer */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Enhanced Sidebar (collapsible on desktop, drawer on mobile) */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen bg-gradient-to-b from-[#090e17] via-[#0d1527] to-[#080d1a] text-slate-200 flex flex-col z-50 border-r border-slate-800/80 shadow-2xl transition-[width,transform] duration-300 ease-in-out ${
          mobileSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-20' : 'md:w-64 lg:w-72'}`}
      >
        {/* Subtle Ambient Background Mesh Glow */}
        <div className="absolute -top-16 -left-16 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-16 -right-16 w-40 h-40 bg-markaz-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Sidebar Brand Header */}
        <div className={`p-4 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md relative flex items-center ${
          isCollapsed ? 'justify-center' : 'justify-between'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-lg shadow-markaz-950/80 ring-1 ring-white/25 shrink-0 group hover:scale-105 transition-transform overflow-hidden">
              <img src="/markaz-logo.png" alt="Jamia Markaz" className="w-full h-full object-contain" />
            </div>

            {!isCollapsed && (
              <div className="min-w-0 animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-extrabold text-sm text-white tracking-tight truncate">
                    Jamia Markaz
                  </h2>
                </div>
                <p className="text-[11px] text-slate-400 font-medium truncate flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Calendar Distribution</span>
                </p>
              </div>
            )}
          </div>

          {/* Desktop Toggle Button */}
          {!isCollapsed && (
            <button
              onClick={toggleCollapse}
              title="Collapse sidebar to icon mode"
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4 custom-scrollbar relative z-10">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {/* Section Header */}
              {!isCollapsed ? (
                <div className="px-3 pt-1 pb-1 flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400/80 select-none">
                    {section.title}
                  </span>
                </div>
              ) : (
                <div className="w-8 h-px bg-slate-800/80 mx-auto my-2" />
              )}

              {/* Items List */}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.path);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`group relative flex items-center ${
                        isCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3 py-2.5'
                      } rounded-xl text-xs font-semibold transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-markaz-600/35 via-slate-800/90 to-slate-800/40 text-white shadow-md shadow-markaz-950/60 border-l-4 border-cyan-400 ring-1 ring-cyan-500/20'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border-l-4 border-transparent hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                            isActive ? 'text-cyan-300' : item.iconColor
                          }`}
                        />
                        {!isCollapsed && (
                          <span className="truncate transition-colors duration-150">
                            {item.label}
                          </span>
                        )}
                      </div>

                      {/* Right elements when expanded */}
                      {!isCollapsed && (
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {item.badge && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight ${
                                isActive
                                  ? 'bg-cyan-400/25 text-cyan-200 border border-cyan-400/40'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700/80 group-hover:text-slate-200'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                          {isActive && (
                            <ChevronRight className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                          )}
                        </div>
                      )}

                      {/* Floating tooltip when collapsed */}
                      {isCollapsed && (
                        <div className="hidden md:group-hover:flex absolute left-full ml-3 px-3 py-1.5 bg-slate-900/95 text-white text-xs font-bold rounded-lg shadow-2xl border border-slate-700 whitespace-nowrap z-50 items-center gap-2 pointer-events-none animate-in fade-in slide-in-from-left-1 duration-150">
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <div className="hidden md:flex justify-center py-2 border-t border-slate-800/80 bg-slate-950/40">
            <button
              onClick={toggleCollapse}
              title="Expand sidebar"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <PanelLeft className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
        )}

        {/* Footer Admin Profile Card */}
        <div className={`p-3 border-t border-slate-800/90 bg-slate-950/80 backdrop-blur-md relative z-10 ${
          isCollapsed ? 'flex flex-col items-center gap-2' : ''
        }`}>
          {!isCollapsed ? (
            <>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90 shadow-inner flex items-center justify-between gap-2.5 mb-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-markaz-700 to-cyan-600 text-white flex items-center justify-center font-bold text-xs ring-1 ring-white/20 shadow-sm">
                      {getInitials(user?.fullName)}
                    </div>
                    <span
                      title="Active Session"
                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-100 truncate leading-tight">
                      {user?.fullName || 'Administrator'}
                    </p>
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mt-0.5">
                      {user?.role?.replace('_', ' ') || 'Super Admin'}
                    </span>
                  </div>
                </div>

                <Link
                  to="/"
                  target="_blank"
                  title="Open Public Student Portal"
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-red-300 hover:text-white bg-red-950/30 hover:bg-red-900/80 rounded-xl border border-red-900/40 hover:border-red-700 transition active:scale-98 shadow-xs cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out Session</span>
              </button>
            </>
          ) : (
            <>
              {/* Compact collapsed profile avatar */}
              <div
                title={`${user?.fullName || 'Administrator'} (${user?.role || 'Super Admin'})`}
                className="relative group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-markaz-700 to-cyan-600 text-white flex items-center justify-center font-bold text-xs ring-1 ring-white/20 shadow-sm">
                  {getInitials(user?.fullName)}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />

                {/* Floating Tooltip */}
                <div className="hidden md:group-hover:flex absolute left-full ml-3 px-3 py-1.5 bg-slate-900/95 text-white text-xs font-bold rounded-lg shadow-2xl border border-slate-700 whitespace-nowrap z-50 flex-col pointer-events-none animate-in fade-in slide-in-from-left-1 duration-150">
                  <span>{user?.fullName || 'Administrator'}</span>
                  <span className="text-[10px] text-cyan-400">{user?.role || 'Super Admin'}</span>
                </div>
              </div>

              {/* Compact collapsed logout button */}
              <button
                onClick={handleLogout}
                title="Sign Out Session"
                className="p-2 text-red-400 hover:text-red-200 hover:bg-red-950/50 rounded-lg transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main Administrative Area with Desktop Header */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Desktop Sticky Header Bar */}
        <header className="hidden md:flex items-center justify-between h-16 px-6 lg:px-8 bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleCollapse}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <PanelLeft className="w-5 h-5 text-markaz-700" />
              ) : (
                <PanelLeftClose className="w-5 h-5 text-slate-600" />
              )}
            </button>

            {/* Breadcrumb path */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="text-slate-400">Admin</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="font-bold text-slate-800 text-sm tracking-tight">
                {getPageTitle()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Season Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Calendar Distribution</span>
            </div>

            {/* Quick Public Link */}
            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-markaz-700 bg-markaz-50 hover:bg-markaz-100 border border-markaz-200 transition shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Student Portal</span>
            </Link>

            {/* Admin Pill with Settings Dropdown */}
            <div className="relative pl-2 border-l border-slate-200" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full hover:bg-slate-100/90 transition border border-transparent hover:border-slate-200 group focus:outline-none"
                aria-expanded={userDropdownOpen}
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-markaz-700 to-cyan-600 text-white flex items-center justify-center font-bold text-xs ring-1 ring-slate-200 shrink-0">
                  {getInitials(user?.fullName)}
                </div>
                <span className="text-xs font-bold text-slate-700 hidden lg:inline max-w-[120px] truncate">
                  {user?.fullName || 'Administrator'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {user?.fullName || 'Administrator'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center gap-1.5">
                      <span>{user?.username ? `@${user.username}` : 'Administrator'}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span className="text-markaz-700 font-semibold">{user?.role || 'Admin'}</span>
                    </p>
                  </div>

                  <div className="p-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={handleOpenSettings}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-markaz-700 transition text-left"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Account Settings</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 rounded-xl hover:bg-red-50 transition text-left"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Account Settings Modal */}
        {settingsModalOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-markaz-50 border border-markaz-100 flex items-center justify-center text-markaz-700 shrink-0">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Account Settings</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Update your profile name and login password</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSettingsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveSettings} className="p-5 space-y-4">
                {settingsError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{settingsError}</span>
                  </div>
                )}

                {settingsSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{settingsSuccess}</span>
                  </div>
                )}

                {/* Full Name (Optional) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Full Name
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      (Optional)
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      placeholder="Leave unchanged to keep current name"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-markaz-600/30 focus:border-markaz-600 transition"
                    />
                  </div>
                </div>

                {/* Password Section */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Change Password
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      (Leave blank to keep current)
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Current Password */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Current Password
                        </label>
                        <span className="text-[10px] text-amber-600 font-medium">
                          (Leave blank if forgotten)
                        </span>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type={showCurrentPw ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Optional - leave blank if you forgot it"
                          className="w-full pl-9 pr-9 py-2 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-markaz-600/30 focus:border-markaz-600 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPw(!showCurrentPw)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                        >
                          {showCurrentPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type={showNewPw ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                          className="w-full pl-9 pr-9 py-2 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-markaz-600/30 focus:border-markaz-600 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPw(!showNewPw)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                        >
                          {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm New Password */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-markaz-600/30 focus:border-markaz-600 transition"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSettingsModalOpen(false)}
                    disabled={savingSettings}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-markaz-700 hover:bg-markaz-800 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
                  >
                    {savingSettings ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

