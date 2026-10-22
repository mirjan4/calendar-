import React from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import {
  CheckCircle,
  Printer,
  ArrowLeft,
  Calendar,
  User,
  MapPin,
  ChevronRight,
  ShieldCheck,
  Building2,
  Navigation
} from 'lucide-react';

export default function ConfirmationPage() {
  const location = useLocation();
  const { registration, student } = location.state || {};

  if (!registration || !student) {
    return <Navigate to="/" replace />;
  }

  const handlePrint = () => {
    window.print();
  };

  const regType = registration.registrationType || registration.registration_type || 'inside_kerala';
  const isInsideKerala = regType === 'inside_kerala';

  // Format registration date
  const submittedDate = registration.submitted_at || registration.submittedAt;
  const formattedDate = submittedDate
    ? new Date(submittedDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Printable Area Wrapper */}
      <div
        id="printable-area"
        className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6 md:p-8 space-y-6"
      >
        {/* Success Header */}
        <div className="text-center space-y-2 border-b border-slate-200 pb-5">
          <div className="flex items-center justify-center gap-3 mx-auto mb-2">
            <div className="w-14 h-14 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-center overflow-hidden">
              <img src="/markaz-logo.png" alt="Jamia Markaz Logo" className="w-full h-full object-contain" />
            </div>
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner">
              <CheckCircle className="w-8 h-8" />
            </div>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Registration Confirmed
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Markaz Calendar Distribution 2026
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Official Student Registration & Allotment Acknowledgement Slip
          </p>
        </div>

        {/* Registration Status Banner */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 text-center space-y-1">
          <span className="text-[11px] text-emerald-800 font-bold uppercase tracking-wider">
            Registration Status
          </span>
          <div className="text-xl md:text-2xl font-bold text-emerald-900">
            Successfully Registered & Verified
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-emerald-700 font-medium pt-1">
            <span>
              Student Reg No: <strong className="font-bold text-emerald-900">{student.regNo || student.reg_no}</strong>
            </span>
            {(student.admissionNo || student.admission_no) && (student.admissionNo || student.admission_no) !== (student.regNo || student.reg_no) && (
              <>
                <span className="text-emerald-300">|</span>
                <span>
                  Admission No: <strong className="font-bold text-emerald-900">{student.admissionNo || student.admission_no}</strong>
                </span>
              </>
            )}
            <span className="text-emerald-300">|</span>
            <span>Date: {formattedDate}</span>
          </div>
        </div>

        {/* Section 1: Candidate Information */}
        <div className="space-y-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
            <User className="w-4 h-4 text-markaz-700" />
            <span>Candidate Information</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs md:text-sm">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 text-[11px] block font-medium">Candidate Name</span>
              <span className="font-bold text-slate-900">{student.candidateName || student.candidate_name}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 text-[11px] block font-medium">Class / Hajer No (HN)</span>
              <span className="font-bold text-slate-900">
                {student.class || student.class_name} {student.hn || student.hajer_no || student.hall_no ? `(HN: ${student.hn || student.hajer_no || student.hall_no})` : ''}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 text-[11px] block font-medium">Registration Number</span>
              <span className="font-bold text-slate-900">{student.regNo || student.reg_no}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 text-[11px] block font-medium">Contact Mobile</span>
              <span className="font-bold text-slate-900">{student.mobile || 'N/A'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 text-[11px] block font-medium">Student Native Place</span>
              <span className="font-bold text-slate-900">{student.place || 'N/A'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 text-[11px] block font-medium">Calendars Required / Quota</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-bold text-markaz-700 text-base">
                  {registration.calendars_requested || registration.calendarsRequested || registration.calendars_allotted || registration.calendarsAllotted || 100}
                </span>
                <span className="text-xs font-semibold text-slate-500"></span>
              </div>
              {(registration.additional_calendars > 0 || registration.additionalCalendars > 0) && (
                <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                  +{registration.additional_calendars || registration.additionalCalendars} addl. (Total: {registration.calendars_allotted || registration.calendarsAllotted} )
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Allotted Place & Location Details */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-markaz-700" />
              <span>Allotted Place & Location Details</span>
            </h3>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-markaz-800 border border-blue-200">
              {isInsideKerala ? 'Inside Kerala' : 'Outside Kerala'}
            </span>
          </div>

          {/* Location Breadcrumb Trail */}
          

          {/* Place Details Grid */}
          {isInsideKerala ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs md:text-sm">
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200">
                <span className="text-slate-500 text-[11px] block font-semibold uppercase tracking-wider">
                  District
                </span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {registration.district_name || registration.district || 'N/A'}
                </span>
              </div>
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200">
                <span className="text-slate-500 text-[11px] block font-semibold uppercase tracking-wider">
                  Zone
                </span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {registration.zone_name || registration.zone || 'N/A'}
                </span>
              </div>
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200">
                <span className="text-slate-500 text-[11px] block font-semibold uppercase tracking-wider">
                  Circle
                </span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {registration.circle_name || registration.circle || 'N/A'}
                </span>
              </div>
              <div
                className="p-3 rounded-xl border border-amber-300 shadow-sm"
                style={{ backgroundColor: '#FBF7D5' }}
              >
                <span className="text-amber-800 text-[11px] block font-bold uppercase tracking-wider">
                  Allotted Unit
                </span>
                <span className="font-black text-amber-950 text-sm mt-0.5 block">
                  {registration.unit_name || registration.unit || 'N/A'}
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs md:text-sm">
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200">
                <span className="text-slate-500 text-[11px] block font-semibold uppercase tracking-wider">
                  State
                </span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {registration.state_name || registration.state || 'N/A'}
                </span>
              </div>
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200">
                <span className="text-slate-500 text-[11px] block font-semibold uppercase tracking-wider">
                  District
                </span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {registration.outside_district || registration.district_name || 'N/A'}
                </span>
              </div>
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200">
                <span className="text-slate-500 text-[11px] block font-semibold uppercase tracking-wider">
                  Zone
                </span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {registration.outside_zone || registration.zone_name || 'N/A'}
                </span>
              </div>
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200">
                <span className="text-slate-500 text-[11px] block font-semibold uppercase tracking-wider">
                  Circle
                </span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {registration.outside_circle || registration.circle_name || 'N/A'}
                </span>
              </div>
              <div
                className="p-3 rounded-xl border border-amber-300 shadow-sm"
                style={{ backgroundColor: '#FBF7D5' }}
              >
                <span className="text-amber-800 text-[11px] block font-bold uppercase tracking-wider">
                  Allotted Unit
                </span>
                <span className="font-black text-amber-950 text-sm mt-0.5 block">
                  {registration.outside_unit || registration.unit_name || 'N/A'}
                </span>
              </div>
            </div>
          )}

          {/* Unit Exclusivity Guarantee Callout */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800">Unit Allocation Verified: </span>
              {isInsideKerala ? (
                <span>
                  The unit <strong>{registration.unit_name || registration.unit}</strong> is locked and exclusively assigned to candidate <strong>{student.candidateName || student.candidate_name}</strong> for calendar distribution.
                </span>
              ) : (
                <span>
                  Allotted unit <strong>{registration.outside_unit || registration.unit_name}</strong> in {registration.state_name || 'State'} is designated for calendar distribution.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons (Excluded from print) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Home</span>
        </Link>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-markaz-700 hover:bg-markaz-800 text-white font-semibold text-xs shadow transition active:scale-95"
        >
          <Printer className="w-4 h-4" />
          <span>Print Registration Slip</span>
        </button>
      </div>
    </div>
  );
}
