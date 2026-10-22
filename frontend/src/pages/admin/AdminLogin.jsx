import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, User, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminLogin() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (isAuthenticated) {
    navigate('/admin/dashboard', { replace: true });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(username.trim(), password);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Authentication failed. Please verify your credentials.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle Ambient Decorative Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[550px] h-[280px] bg-gradient-to-b from-markaz-500/10 to-transparent blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-xl shadow-slate-900/5 border border-slate-200/90 space-y-6">
          {/* Logo & Header */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-white p-1.5 shadow-sm border border-slate-200/90 mx-auto flex items-center justify-center overflow-hidden">
              <img src="/markaz-logo.png" alt="Jamia Markaz Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Jamia Markaz Admin
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Calendar Distribution & Student Console
              </p>
            </div>
          </div>

          {/* Session Expired Notice */}
          {location.search.includes('expired=1') && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Your session has expired. Please sign in again.</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="admin"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-markaz-600/30 focus:border-markaz-600 font-semibold transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-markaz-600/30 focus:border-markaz-600 font-semibold transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-markaz-700 hover:bg-markaz-800 text-white font-bold text-sm shadow-md shadow-markaz-900/15 hover:shadow-lg hover:shadow-markaz-900/25 transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </div>
          </form>

          {/* Footer Navigation */}
          <div className="border-t border-slate-100 pt-4 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-markaz-700 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Public Website</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
