import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Calendar, ExternalLink } from 'lucide-react';

export default function PublicLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-slate-200">
      {/* Top Banner with Markaz Brand Blue */}
      <header className="bg-markaz-700 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="bg-white p-1 rounded-xl shadow-sm flex items-center justify-center w-10 h-10 overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
              <img src="/markaz-logo.png" alt="Jamia Markaz Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-lg md:text-xl tracking-tight leading-tight">
                Markaz Calendar Distribution
              </h1>
            </div>
          </Link>

          <nav className="flex items-center gap-2 text-sm font-medium">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-md transition ${
                location.pathname === '/'
                  ? 'bg-markaz-800 text-white shadow-inner'
                  : 'hover:bg-markaz-600 text-blue-50'
              }`}
            >
              Home
            </Link>
            
            
          </nav>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 py-6 px-3 md:px-6">
        <div className="max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 text-slate-300 py-6 text-sm text-center border-t border-slate-700">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Jamia Markaz. All Rights Reserved.</p>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>Markaz Karanthur, Calicut, Kerala</span>

          </div>
        </div>
      </footer>
    </div>
  );
}
