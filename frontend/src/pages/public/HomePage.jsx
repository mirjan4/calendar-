import React from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  MapPin,
  Globe,
  CheckCircle2,
  ArrowRight,
  Calendar,
  UserCheck,
  Search
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-6">
      {/* Hero Welcome Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/90 overflow-hidden transition-all duration-300">
        {/* Banner with Markaz Primary Blue (#0c629e) with ambient glow & subtle depth */}
        <div className="bg-gradient-to-br from-markaz-800 via-markaz-700 to-markaz-900 text-white p-7 md:p-10 text-center relative overflow-hidden">
          {/* Subtle Ambient Radial Lighting Decor */}
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-markaz-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl md:text-4xl font-black tracking-tight drop-shadow-xs">
              Markaz Calendar Distribution
            </h2>
            
          </div>
        </div>

        {/* Notifications Section - Exact replica of original website's notifications section */}
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-center">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase bg-markaz-700 text-white shadow-sm shadow-markaz-900/10 border border-markaz-600/50">
              <Bell className="w-3.5 h-3.5 text-amber-300" />
              <span>Registration Notifications</span>
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-5">
            {/* Notification 1: Inside Kerala */}
            <Link
              to="/register?type=inside_kerala"
              className="group relative block p-5 md:p-6 rounded-2xl border-2 border-slate-200/90 bg-slate-50/70 hover:bg-gradient-to-br hover:from-markaz-700 hover:to-markaz-800 hover:border-markaz-700 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-markaz-800/15"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-blue-100 text-markaz-700 group-hover:bg-white group-hover:text-markaz-700 transition-colors shrink-0 shadow-xs mt-0.5">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-markaz-700 group-hover:text-blue-100 bg-blue-100/70 group-hover:bg-white/20 px-2 py-0.5 rounded-md transition">
                      Inside Kerala
                    </span>
                    <div className="w-6 h-6 rounded-full bg-slate-200/70 group-hover:bg-white/20 flex items-center justify-center transition">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-900 group-hover:text-white text-base leading-snug">
                    Kerala Field Work Registration
                  </h3>
                  <p className="text-xs md:text-sm text-slate-600 group-hover:text-blue-50 font-normal leading-relaxed">
                    കലണ്ടർ വിതരണത്തിനുള്ള രജിസ്ട്രേഷൻ ഫോം (കേരളത്തിനുള്ളിൽ ഫീൽഡ് വർക്ക് ഉദ്ദേശിക്കുന്നവർ ഇവിടെ ക്ലിക്ക് ചെയ്യുക)
                  </p>
                </div>
              </div>
            </Link>

            {/* Notification 2: Outside Kerala */}
            <Link
              to="/register?type=outside_kerala"
              className="group relative block p-5 md:p-6 rounded-2xl border-2 border-slate-200/90 bg-slate-50/70 hover:bg-gradient-to-br hover:from-markaz-700 hover:to-markaz-800 hover:border-markaz-700 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-markaz-800/15"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800 group-hover:bg-white group-hover:text-markaz-700 transition-colors shrink-0 shadow-xs mt-0.5">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 group-hover:text-blue-100 bg-emerald-100/70 group-hover:bg-white/20 px-2 py-0.5 rounded-md transition">
                      Outside Kerala
                    </span>
                    <div className="w-6 h-6 rounded-full bg-slate-200/70 group-hover:bg-white/20 flex items-center justify-center transition">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-900 group-hover:text-white text-base leading-snug">
                    Non-Kerala Student Registration
                  </h3>
                  <p className="text-xs md:text-sm text-slate-600 group-hover:text-blue-50 font-normal leading-relaxed">
                    കലണ്ടർ വിതരണത്തിനുള്ള രജിസ്ട്രേഷൻ ഫോം (കേരളത്തിന് പുറത്ത് ഫീൽഡ് വർക്ക് ഉദ്ദേശിക്കുന്നവർ ഇവിടെ ക്ലിക്ക് ചെയ്യുക) [OUTSIDE KERALA]
                  </p>
                </div>
              </div>
            </Link>
          </div>

          {/* Direct CTA Button */}
          <div className="text-center pt-2">
            
          </div>
        </div>
      </div>

      {/* Guidelines & Rules Card */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-2.5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 text-markaz-700 font-bold text-sm">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              <Search className="w-3.5 h-3.5 text-markaz-700" />
            </div>
            <span>Student Lookup</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Enter your <strong>Admission Number</strong> or <strong>Registration Number</strong> (e.g. 1602) to automatically fetch your verified records.
          </p>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-2.5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 text-markaz-700 font-bold text-sm">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
            </div>
            <span>Unit Allotment</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Inside Kerala units are limited to <strong>one student per unit</strong>. Once selected, confirmed units are reserved and locked immediately.
          </p>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-2.5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 text-markaz-700 font-bold text-sm">
            <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
              <Calendar className="w-3.5 h-3.5 text-amber-700" />
            </div>
            <span>Calendar Quota</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Each successfully registered student is allotted exactly <strong>100 Calendars</strong> (ഓരോ വിദ്യാർത്ഥിക്കും 100 കലണ്ടർ ലഭിക്കും).
          </p>
        </div>
      </div>
    </div>
  );
}
