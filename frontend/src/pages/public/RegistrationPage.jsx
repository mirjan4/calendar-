import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
  Globe,
  Phone,
  BookOpen,
  Building,
  Home,
  Check,
  RotateCcw,
  Printer,
  X
} from 'lucide-react';
import api from '../../services/api';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Lakshadweep', 'Puducherry', 'Ladakh'
];

export default function RegistrationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Search State
  const [searchNumber, setSearchNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [student, setStudent] = useState(null);
  const [existingRegistration, setExistingRegistration] = useState(null);

  // Real-time Live Search State (triggers when 3 or more characters are entered)
  const [liveSuggestions, setLiveSuggestions] = useState([]);
  const [searchingLive, setSearchingLive] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Workflow Category: 'inside_kerala' or 'outside_kerala'
  const [registrationType, setRegistrationType] = useState(() => {
    return searchParams.get('type') === 'outside_kerala' ? 'outside_kerala' : 'inside_kerala';
  });

  // Inside Kerala Location State
  const [districts, setDistricts] = useState([]);
  const [zones, setZones] = useState([]);
  const [circles, setCircles] = useState([]);
  const [units, setUnits] = useState([]);

  const [selectedDistrictId, setSelectedDistrictId] = useState(null);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [selectedCircleId, setSelectedCircleId] = useState(null);
  const [selectedUnitId, setSelectedUnitId] = useState(null);

  // In-box filter search terms
  const [districtFilter, setDistrictFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [circleFilter, setCircleFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');

  // Loading states for hierarchy
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingZones, setLoadingZones] = useState(false);
  const [loadingCircles, setLoadingCircles] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Outside Kerala Form State
  const [outsideForm, setOutsideForm] = useState({
    state_name: 'Karnataka',
    outside_district: '',
    outside_zone: '',
    outside_circle: '',
    outside_unit: ''
  });

  // Submission State
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Calendar Quantity State (student-selectable, default 100 Nos)
  const [calendarQuantity, setCalendarQuantity] = useState(100);
  const [quantityError, setQuantityError] = useState('');

  // Load districts on mount
  useEffect(() => {
    async function loadDistricts() {
      try {
        setLoadingDistricts(true);
        const res = await api.get('/locations/districts');
        if (res.data.success) {
          setDistricts(res.data.districts);
        }
      } catch (err) {
        console.error('Failed to load districts:', err);
      } finally {
        setLoadingDistricts(false);
      }
    }
    loadDistricts();
  }, []);

  // Fetch zones when district changes
  useEffect(() => {
    if (!selectedDistrictId) {
      setZones([]);
      setSelectedZoneId(null);
      setCircles([]);
      setSelectedCircleId(null);
      setUnits([]);
      setSelectedUnitId(null);
      return;
    }

    async function loadZones() {
      try {
        setLoadingZones(true);
        setSelectedZoneId(null);
        setCircles([]);
        setSelectedCircleId(null);
        setUnits([]);
        setSelectedUnitId(null);

        const res = await api.get(`/locations/zones?districtId=${selectedDistrictId}`);
        if (res.data.success) {
          setZones(res.data.zones);
        }
      } catch (err) {
        console.error('Failed to load zones:', err);
      } finally {
        setLoadingZones(false);
      }
    }
    loadZones();
  }, [selectedDistrictId]);

  // Fetch circles when zone changes
  useEffect(() => {
    if (!selectedZoneId) {
      setCircles([]);
      setSelectedCircleId(null);
      setUnits([]);
      setSelectedUnitId(null);
      return;
    }

    async function loadCircles() {
      try {
        setLoadingCircles(true);
        setSelectedCircleId(null);
        setUnits([]);
        setSelectedUnitId(null);

        const res = await api.get(`/locations/circles?zoneId=${selectedZoneId}`);
        if (res.data.success) {
          setCircles(res.data.circles);
        }
      } catch (err) {
        console.error('Failed to load circles:', err);
      } finally {
        setLoadingCircles(false);
      }
    }
    loadCircles();
  }, [selectedZoneId]);

  // Fetch available units when circle changes
  useEffect(() => {
    if (!selectedCircleId) {
      setUnits([]);
      setSelectedUnitId(null);
      return;
    }

    async function loadUnits() {
      try {
        setLoadingUnits(true);
        setSelectedUnitId(null);

        const res = await api.get(`/locations/units/available?circleId=${selectedCircleId}`);
        if (res.data.success) {
          setUnits(res.data.units);
        }
      } catch (err) {
        console.error('Failed to load units:', err);
      } finally {
        setLoadingUnits(false);
      }
    }
    loadUnits();
  }, [selectedCircleId]);

  // Execute student lookup by number/regNo
  const executeStudentLookup = async (queryNumber) => {
    const query = (queryNumber !== undefined ? queryNumber : searchNumber).trim();

    if (!query) {
      setSearchError('Please enter an Admission Number or Registration Number.');
      return;
    }

    setSearching(true);
    setSearchError('');
    setStudent(null);
    setExistingRegistration(null);
    setSubmitError('');

    try {
      const res = await api.get(`/students/lookup?number=${encodeURIComponent(query)}`);
      if (res.data.success) {
        setStudent(res.data.student);
        if (res.data.isAlreadyRegistered) {
          setExistingRegistration(res.data.existingRegistration);
        }
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setSearchError(err.response.data.message);
      } else {
        setSearchError('No student record found. Please verify your number.');
      }
    } finally {
      setSearching(false);
      setShowDropdown(false);
    }
  };

  // Form submit button search handler
  const handleStudentSearch = async (e) => {
    if (e) e.preventDefault();
    setShowDropdown(false);
    await executeStudentLookup();
  };

  // Select student from real-time live suggestions
  const selectStudent = async (item) => {
    setShowDropdown(false);
    setLiveSuggestions([]);
    setSearchNumber(item.regNo || item.admissionNo);
    await executeStudentLookup(item.regNo || item.admissionNo);
  };

  // Debounced Real-time Live Search Effect (triggers on >= 3 characters)
  useEffect(() => {
    const trimmed = searchNumber.trim();

    if (trimmed.length < 3) {
      setLiveSuggestions([]);
      setShowDropdown(false);
      setSearchingLive(false);
      setSelectedIndex(-1);
      return;
    }

    // If currently loaded student already matches, don't reopen dropdown
    if (student && (student.regNo === trimmed || student.admissionNo === trimmed)) {
      setShowDropdown(false);
      return;
    }

    setSearchingLive(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/students/live-search?q=${encodeURIComponent(trimmed)}`);
        if (res.data.success) {
          setLiveSuggestions(res.data.results || []);
          setShowDropdown(true);
          setSelectedIndex(-1);
        }
      } catch (err) {
        console.error('Real-time student search error:', err);
      } finally {
        setSearchingLive(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchNumber, student]);

  // Handle outside click to close suggestions dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation for dropdown
  const handleKeyDown = (e) => {
    if (!showDropdown || liveSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < liveSuggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < liveSuggestions.length) {
        e.preventDefault();
        selectStudent(liveSuggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!student) {
      setSubmitError('Please search and verify your student details first.');
      return;
    }

    if (existingRegistration) {
      setSubmitError('You have already submitted a registration. Duplicate submissions are not allowed.');
      return;
    }

    if (!confirmed) {
      setSubmitError('Please check the confirmation box: "Complete and make sure all details before submit".');
      return;
    }

    const parsedQuantity = parseInt(calendarQuantity, 10);
    if (!parsedQuantity || isNaN(parsedQuantity) || parsedQuantity < 100 || !Number.isInteger(Number(calendarQuantity))) {
      setSubmitError('Minimum 100 calendars required (e.g., 100 Nos or more).');
      return;
    }

    let payload = {
      student_id: student.id,
      registration_type: registrationType,
      calendars_requested: parsedQuantity,
      confirmed: true
    };

    if (registrationType === 'inside_kerala') {
      if (!selectedDistrictId || !selectedZoneId || !selectedCircleId || !selectedUnitId) {
        setSubmitError('Please select District, Zone, Circle, and Unit.');
        return;
      }
      payload.district_id = selectedDistrictId;
      payload.zone_id = selectedZoneId;
      payload.circle_id = selectedCircleId;
      payload.unit_id = selectedUnitId;
    } else {
      if (
        !outsideForm.state_name ||
        !outsideForm.outside_district.trim() ||
        !outsideForm.outside_zone.trim() ||
        !outsideForm.outside_circle.trim() ||
        !outsideForm.outside_unit.trim()
      ) {
        setSubmitError('Please fill out all required location fields (State, District, Zone, Circle, Unit).');
        return;
      }
      payload.state_name = outsideForm.state_name;
      payload.outside_district = outsideForm.outside_district.trim();
      payload.outside_zone = outsideForm.outside_zone.trim();
      payload.outside_circle = outsideForm.outside_circle.trim();
      payload.outside_unit = outsideForm.outside_unit.trim();
    }

    setSubmitting(true);
    try {
      const res = await api.post('/registrations', payload);
      if (res.data.success) {
        const districtObj = districts.find(d => d.id === selectedDistrictId);
        const zoneObj = zones.find(z => z.id === selectedZoneId);
        const circleObj = circles.find(c => c.id === selectedCircleId);
        const unitObj = units.find(u => u.id === selectedUnitId);

        const regWithPlaces = {
          ...res.data.registration,
          calendars_requested: res.data.registration.calendarsRequested || parsedQuantity,
          additional_calendars: res.data.registration.additionalCalendars || 0,
          calendars_allotted: res.data.registration.calendarsAllotted || parsedQuantity,
          district_name: res.data.registration.district_name || districtObj?.name,
          zone_name: res.data.registration.zone_name || zoneObj?.name,
          circle_name: res.data.registration.circle_name || circleObj?.name,
          unit_name: res.data.registration.unit_name || unitObj?.name,
          state_name: res.data.registration.state_name || outsideForm.state_name,
          outside_district: res.data.registration.outside_district || outsideForm.outside_district,
          outside_zone: res.data.registration.outside_zone || outsideForm.outside_zone,
          outside_circle: res.data.registration.outside_circle || outsideForm.outside_circle,
          outside_unit: res.data.registration.outside_unit || outsideForm.outside_unit
        };

        navigate('/confirmation', {
          state: {
            registration: regWithPlaces,
            student
          }
        });
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setSubmitError(err.response.data.message);
      } else {
        setSubmitError('Failed to submit registration. Please check your network and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
      {/* Header Banner with Markaz Primary Blue (#0c629e) */}
      <div className="bg-markaz-700 text-white p-5 md:p-6 text-center">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">
          Markaz Calender Distribution 2026
        </h2>
        <p className="text-xs md:text-sm text-blue-100 mt-1">
          {registrationType === 'inside_kerala'
            ? 'Inside Kerala Student Registration Form'
            : 'Registration for Non-Kerala Students (Outside Kerala)'}
        </p>
      </div>

      <div className="p-5 md:p-8 space-y-8">
        {/* STEP 1: AUTOMATIC STUDENT LOOKUP */}
        <div className="bg-slate-50 p-5 md:p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-markaz-700 text-white text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h3 className="font-bold text-slate-900 text-base">
                Student Identification / Search
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">
                Enter Admission Number or Registration Number
              </span>

            </div>
          </div>

          <div className="relative">
            <form onSubmit={handleStudentSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchNumber}
                  onChange={(e) => setSearchNumber(e.target.value)}
                  onFocus={() => {
                    if (searchNumber.trim().length >= 3 && liveSuggestions.length > 0) {
                      setShowDropdown(true);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter RegNo / Admn No or Name (e.g. 1602)..."
                  className="w-full pl-10 pr-24 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-markaz-600 focus:border-transparent font-medium shadow-xs"
                  required
                  autoComplete="off"
                />

                {/* Right inside input controls: live spinner, clear X, real-time indicator */}
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
                  {searchingLive && (
                    <Loader2 className="w-4 h-4 text-cyan-600 animate-spin" />
                  )}
                  {searchNumber && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchNumber('');
                        setLiveSuggestions([]);
                        setShowDropdown(false);
                        setStudent(null);
                        setExistingRegistration(null);
                        setSearchError('');
                        searchInputRef.current?.focus();
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {searchNumber.trim().length >= 3 ? (
                    <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                      Live
                    </span>
                  ) : searchNumber.trim().length > 0 ? (
                    <span className="hidden sm:inline-flex text-[10px] font-medium text-slate-400">
                      {3 - searchNumber.trim().length} more
                    </span>
                  ) : null}
                </div>
              </div>

              <button
                type="submit"
                disabled={searching}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-markaz-700 hover:bg-markaz-800 disabled:bg-slate-400 text-white text-sm font-semibold shadow-sm transition active:scale-95 shrink-0"
              >
                {searching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Search Student</span>
                  </>
                )}
              </button>
            </form>

            {/* Real-time live suggestions dropdown */}
            {showDropdown && searchNumber.trim().length >= 3 && (
              <div
                ref={dropdownRef}
                className="absolute top-full left-0 right-0 sm:right-36 mt-1.5 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150"
              >
                <div className="px-3.5 py-2 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                    <span> matches ({liveSuggestions.length})</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Use ↑↓ arrows or click to select
                  </span>
                </div>

                {liveSuggestions.length > 0 ? (
                  liveSuggestions.map((item, idx) => {
                    const isSelected = selectedIndex === idx;
                    const isExactMatch =
                      item.regNo?.toLowerCase() === searchNumber.trim().toLowerCase() ||
                      item.admissionNo?.toLowerCase() === searchNumber.trim().toLowerCase();

                    return (
                      <div
                        key={item.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectStudent(item);
                        }}
                        onClick={() => selectStudent(item)}
                        className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-markaz-50 border-l-4 border-markaz-600'
                            : isExactMatch
                            ? 'bg-cyan-50/60 hover:bg-cyan-100/60 border-l-4 border-cyan-500'
                            : 'hover:bg-slate-50 border-l-4 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isExactMatch
                                ? 'bg-cyan-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <User className="w-4 h-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm truncate">
                                {item.candidateName}
                              </span>
                              {isExactMatch && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-black uppercase tracking-wider bg-cyan-500 text-white">
                                  Exact Match
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold text-[11px]">
                                Reg: {item.regNo}
                              </span>
                              {item.admissionNo && item.admissionNo !== item.regNo && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold text-[11px]">
                                  Admn: {item.admissionNo}
                                </span>
                              )}
                              {item.class && (
                                <span className="text-slate-400">• Class {item.class}</span>
                              )}
                              {item.place && (
                                <span className="text-slate-400 truncate max-w-[140px]">• {item.place}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status Tag */}
                        <div className="shrink-0 text-right">
                          {item.isAlreadyRegistered ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              <span>Already Registered</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Ready</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500 space-y-1">
                    <p className="font-semibold text-slate-700">No matching student found</p>
                    <p className="text-[11px] text-slate-400">
                      Check your Admission Number, Registration Number, or name spelling.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search Error Message */}
          {searchError && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs md:text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{searchError}</span>
            </div>
          )}

          {/* Student Information Card (Populated after successful lookup) */}
          {student && (
            <div className="mt-4 bg-white rounded-xl border-2 border-markaz-600 p-4 md:p-5 shadow-sm space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-markaz-50 rounded-lg text-markaz-700">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">
                      {student.candidateName}
                    </h4>
                    <span className="text-xs text-slate-500 font-medium">
                      Verified Student Record
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified</span>
                </span>
              </div>

              {/* Student Fields Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs md:text-sm">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">
                    REG NO
                  </span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                    {student.regNo}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">
                    ADMISSION NO
                  </span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                    {student.admissionNo || student.regNo}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">
                    CLASS
                  </span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                    {student.class}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">
                    HN (HAJER NO)
                  </span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                    {student.hn || 'N/A'}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">
                    PLACE
                  </span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                    {student.place || 'N/A'}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">
                    MOBILE
                  </span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                    {student.mobile || 'N/A'}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">
                    CALENDARS ALLOTTED
                  </span>
                  <span className="font-bold text-markaz-700 text-sm mt-0.5 block">
                    100
                  </span>
                </div>
              </div>

              {/* Already Registered Alert */}
              {existingRegistration && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs md:text-sm space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>This Student is Already Registered</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    This student record has already been registered on{' '}
                    <strong>{new Date(existingRegistration.submitted_at).toLocaleDateString()}</strong>.
                    {existingRegistration.registration_type === 'inside_kerala' ? (
                      <> Allotted Location: {existingRegistration.district_name} → {existingRegistration.zone_name} → {existingRegistration.circle_name} → <strong>{existingRegistration.unit_name}</strong>.</>
                    ) : (
                      <> Outside Kerala Location: {existingRegistration.state_name}, {existingRegistration.outside_district}, {existingRegistration.outside_unit}.</>
                    )}
                  </p>
                  <p className="text-[11px] text-amber-700 font-medium">
                    Duplicate submissions are blocked by institutional policy. If you need modifications, please reach out to the Markaz Administration.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        navigate('/confirmation', {
                          state: {
                            registration: existingRegistration,
                            student
                          }
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold shadow-sm transition active:scale-95"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>View & Print Confirmation Slip</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* STEP 2: REGISTRATION CATEGORY SELECTOR */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <span className="w-6 h-6 rounded-full bg-markaz-700 text-white text-xs font-bold flex items-center justify-center">
              2
            </span>
            <h3 className="font-bold text-slate-900 text-base">
              Select Registration Category
            </h3>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setRegistrationType('inside_kerala')}
              className={`p-4 rounded-xl border text-left transition flex items-start gap-3 ${
                registrationType === 'inside_kerala'
                  ? 'border-markaz-700 bg-blue-50/70 ring-2 ring-markaz-600 ring-offset-1'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div
                className={`p-2.5 rounded-lg shrink-0 ${
                  registrationType === 'inside_kerala'
                    ? 'bg-markaz-700 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Inside Kerala Registration
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                 District, Zone, Circle, and Unit.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRegistrationType('outside_kerala')}
              className={`p-4 rounded-xl border text-left transition flex items-start gap-3 ${
                registrationType === 'outside_kerala'
                  ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500 ring-offset-1'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div
                className={`p-2.5 rounded-lg shrink-0 ${
                  registrationType === 'outside_kerala'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Outside Kerala Registration
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Manual text input entry for non-Kerala  locations.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* STEP 3: REGISTRATION FORM */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <span className="w-6 h-6 rounded-full bg-markaz-700 text-white text-xs font-bold flex items-center justify-center">
              3
            </span>
            <h3 className="font-bold text-slate-900 text-base">
              {registrationType === 'inside_kerala'
                ? 'Inside Kerala Location Hierarchy'
                : 'Outside Kerala Location Details'}
            </h3>
          </div>

          {/* ========================================================
              CATEGORY A: INSIDE KERALA (CHECKBOX HIERARCHY WORKFLOW)
              Design tokens:
              - District background: #CCE1F2
              - Zone background:     #CCE1F2
              - Circle background:   #CCE1F2
              - Unit background:     #FBF7D5
             ======================================================== */}
          {registrationType === 'inside_kerala' ? (
            <div className="space-y-6">
              {/* Row 1: District, Zone, Circle as Cascading Dropdowns */}
              <div
                className="rounded-2xl border border-blue-300 p-5 shadow-sm space-y-4"
                style={{ backgroundColor: '#CCE1F2' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-blue-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-markaz-700" />
                    <span className="font-bold text-slate-900 text-sm">
                      Select District, Zone & Circle
                    </span>
                  </div>
                  <span className="text-xs text-blue-900 font-medium">
                    Cascade selection: District → Zone → Circle
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 1. SELECT DISTRICT DROPDOWN */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-900 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        Select District <span className="text-red-600">*</span>
                      </span>
                      {selectedDistrictId && (
                        <span className="text-[10px] font-bold text-white bg-markaz-700 px-2 py-0.5 rounded-full">
                          Selected
                        </span>
                      )}
                    </label>
                    <select
                      value={selectedDistrictId || ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value, 10) : null;
                        setSelectedDistrictId(val);
                      }}
                      className="w-full px-3 py-2.5 bg-white border border-blue-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-markaz-600 shadow-xs cursor-pointer"
                    >
                      <option value="">-- Choose District --</option>
                      {districts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. SELECT ZONE DROPDOWN */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-900 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        Select Zone <span className="text-red-600">*</span>
                      </span>
                      {selectedZoneId && (
                        <span className="text-[10px] font-bold text-white bg-markaz-700 px-2 py-0.5 rounded-full">
                          Selected
                        </span>
                      )}
                    </label>
                    <select
                      disabled={!selectedDistrictId || loadingZones}
                      value={selectedZoneId || ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value, 10) : null;
                        setSelectedZoneId(val);
                      }}
                      className="w-full px-3 py-2.5 bg-white border border-blue-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-markaz-600 shadow-xs disabled:opacity-50 disabled:bg-slate-100 cursor-pointer"
                    >
                      <option value="">
                        {!selectedDistrictId
                          ? '-- Select District First --'
                          : loadingZones
                          ? 'Loading zones...'
                          : zones.length === 0
                          ? 'No zones available'
                          : '-- Choose Zone --'}
                      </option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. SELECT CIRCLE DROPDOWN */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-900 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        Select Circle <span className="text-red-600">*</span>
                      </span>
                      {selectedCircleId && (
                        <span className="text-[10px] font-bold text-white bg-markaz-700 px-2 py-0.5 rounded-full">
                          Selected
                        </span>
                      )}
                    </label>
                    <select
                      disabled={!selectedZoneId || loadingCircles}
                      value={selectedCircleId || ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value, 10) : null;
                        setSelectedCircleId(val);
                      }}
                      className="w-full px-3 py-2.5 bg-white border border-blue-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-markaz-600 shadow-xs disabled:opacity-50 disabled:bg-slate-100 cursor-pointer"
                    >
                      <option value="">
                        {!selectedZoneId
                          ? '-- Select Zone First --'
                          : loadingCircles
                          ? 'Loading circles...'
                          : circles.length === 0
                          ? 'No circles available'
                          : '-- Choose Circle --'}
                      </option>
                      {circles.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 2: SELECT UNIT (Dedicated row with background #FBF7D5) */}
              <div
                className="rounded-xl border border-amber-300 p-5 shadow-sm space-y-3"
                style={{ backgroundColor: '#FBF7D5' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-amber-200 pb-2">
                  <div className="space-y-0.5">
                    <label className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <span>Select Unit</span>
                      <span className="text-red-600">*</span>
                    </label>
                    {/* Exact Malayalam instruction from original Markaz portal */}
                    <p className="text-xs text-amber-900 font-medium">
                      ഒരു യൂണിറ്റ് ഒരു വിദ്യാർത്ഥിക്ക് മാത്രമേ സെലക്ട് ചെയ്യാൻ സാധിക്കുകയുള്ളൂ. സെലക്ട് ചെയ്ത യൂണിറ്റ് ഇവിടെ കാണിക്കുകയില്ല*
                    </p>
                  </div>
                  {selectedUnitId && (
                    <span className="text-xs font-bold text-amber-900 bg-amber-200 px-3 py-1 rounded-full self-start sm:self-auto">
                      1 Unit Selected
                    </span>
                  )}
                </div>

                {/* Dropdown or quick search for units */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                     Filter Available Units
                    </label>
                    <input
                      type="text"
                      disabled={!selectedCircleId}
                      value={unitFilter}
                      onChange={(e) => setUnitFilter(e.target.value)}
                      placeholder={selectedCircleId ? 'Filter available units...' : 'Select a circle first'}
                      className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-amber-300 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50 font-medium"
                    />
                  </div>
                </div>

                {/* Available Units Grid / Checkbox list */}
                <div className="max-h-60 overflow-y-auto custom-scrollbar p-2 bg-white/60 rounded-xl border border-amber-200">
                  {!selectedCircleId ? (
                    <div className="p-6 text-center text-xs text-slate-600">
                      Please select a Circle above to view currently available units.
                    </div>
                  ) : loadingUnits ? (
                    <div className="p-6 text-center text-xs text-slate-600 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading available units from database...
                    </div>
                  ) : units.length === 0 ? (
                    <div className="p-6 text-center text-xs text-amber-900">
                      No units available in this circle. All units may already have been confirmed by other students.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {units
                        .filter((u) => u.name.toLowerCase().includes(unitFilter.toLowerCase()))
                        .map((u) => {
                          const isChecked = selectedUnitId === u.id;
                          return (
                            <label
                              key={u.id}
                              className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition text-xs font-bold border ${
                                isChecked
                                  ? 'bg-amber-600 border-amber-700 text-white shadow-sm'
                                  : 'bg-white border-amber-200 hover:bg-amber-100/50 text-slate-900'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  // Enforce strict single-selection logic: clicking another replaces current
                                  setSelectedUnitId(isChecked ? null : u.id);
                                }}
                                className="w-4 h-4 rounded text-amber-600 focus:ring-0 cursor-pointer"
                              />
                              <span className="truncate">{u.name}</span>
                            </label>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================
               CATEGORY B: OUTSIDE KERALA (TEXT INPUT ENTRY WORKFLOW)
               Exact replica of https://fr.markaz.in/reg-form-non-kerala-jamia-students.php
               Does NOT use checkbox hierarchy. Uses manual text inputs.
               ======================================================== */
            <div className="bg-slate-50 p-5 md:p-6 rounded-xl border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* State Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <span>State</span>
                    <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={outsideForm.state_name}
                    onChange={(e) => setOutsideForm({ ...outsideForm, state_name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-markaz-600 font-medium"
                    required
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* District Text Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <span>District</span>
                    <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={outsideForm.outside_district}
                    onChange={(e) => setOutsideForm({ ...outsideForm, outside_district: e.target.value })}
                    placeholder="Enter district name"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-markaz-600 font-medium"
                    required
                  />
                </div>

                {/* Zone Text Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <span>Zone</span>
                    <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={outsideForm.outside_zone}
                    onChange={(e) => setOutsideForm({ ...outsideForm, outside_zone: e.target.value })}
                    placeholder="Enter zone name"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-markaz-600 font-medium"
                    required
                  />
                </div>

                {/* Circle Text Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <span>Circle</span>
                    <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={outsideForm.outside_circle}
                    onChange={(e) => setOutsideForm({ ...outsideForm, outside_circle: e.target.value })}
                    placeholder="Enter circle name"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-markaz-600 font-medium"
                    required
                  />
                </div>

                {/* Unit Text Input */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <span>Unit</span>
                    <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={outsideForm.outside_unit}
                    onChange={(e) => setOutsideForm({ ...outsideForm, outside_unit: e.target.value })}
                    placeholder="Enter unit name"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-markaz-600 font-medium"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Calendars Wanted Notice (Student Selectable Quota) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <label htmlFor="calendarQuantityInput" className="text-xs font-bold text-markaz-700 block cursor-pointer">
                Calendars Required / Quota <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-slate-600 font-medium">
                ഓരോ വിദ്യാർത്ഥിക്കും 100 കലണ്ടർ ലഭിക്കും.
              </p>
            </div>
            <div className="flex flex-col sm:items-end gap-1 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-markaz-600 focus-within:border-markaz-600">
                  <button
                    type="button"
                    disabled={(parseInt(calendarQuantity, 10) || 100) <= 100}
                    onClick={() => {
                      const current = parseInt(calendarQuantity, 10) || 100;
                      const next = Math.max(100, current - 10);
                      setCalendarQuantity(next);
                      setQuantityError('');
                    }}
                    title="Decrease by 10 (minimum 100)"
                    className="px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed border-r border-slate-200 font-bold transition select-none"
                  >
                    -10
                  </button>
                  <button
                    type="button"
                    disabled={(parseInt(calendarQuantity, 10) || 100) <= 100}
                    onClick={() => {
                      const current = parseInt(calendarQuantity, 10) || 100;
                      const next = Math.max(100, current - 1);
                      setCalendarQuantity(next);
                      setQuantityError('');
                    }}
                    title="Decrease by 1 (minimum 100)"
                    className="px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed border-r border-slate-200 font-bold transition select-none"
                  >
                    -
                  </button>
                  <input
                    id="calendarQuantityInput"
                    type="number"
                    min="100"
                    step="1"
                    value={calendarQuantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCalendarQuantity(val);
                      const num = parseInt(val, 10);
                      if (!val || isNaN(num) || num < 100 || !Number.isInteger(Number(val))) {
                        setQuantityError('Minimum 100 calendars required');
                      } else {
                        setQuantityError('');
                      }
                    }}
                    className={`w-20 px-2 py-1.5 text-center font-bold text-base bg-white text-slate-900 focus:outline-none ${
                      quantityError ? 'text-red-700 bg-red-50/50' : ''
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseInt(calendarQuantity, 10) || 100;
                      setCalendarQuantity(current + 1);
                      setQuantityError('');
                    }}
                    title="Increase by 1"
                    className="px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-l border-slate-200 font-bold transition select-none"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseInt(calendarQuantity, 10) || 100;
                      setCalendarQuantity(current + 10);
                      setQuantityError('');
                    }}
                    title="Increase by 10"
                    className="px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-l border-slate-200 font-bold transition select-none"
                  >
                    +10
                  </button>
                </div>
                <span className="text-xs font-semibold text-slate-500"></span>
              </div>
              {quantityError && (
                <span className="text-[11px] font-semibold text-red-600">{quantityError}</span>
              )}
            </div>
          </div>

          {/* Selected Place & Location Confirmation Summary */}
          {(registrationType === 'inside_kerala' ? selectedUnitId : (outsideForm.outside_unit || outsideForm.outside_district)) && (
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-markaz-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-markaz-700" />
                <span>Selected Place & Location Summary for Confirmation</span>
              </span>
              {registrationType === 'inside_kerala' ? (
                <div className="flex flex-wrap items-center gap-1.5 text-slate-800 text-xs font-medium">
                  <span className="text-slate-500">District:</span>
                  <span className="font-bold text-slate-900">{districts.find(d => d.id === selectedDistrictId)?.name || '—'}</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-slate-500">Zone:</span>
                  <span className="font-bold text-slate-900">{zones.find(z => z.id === selectedZoneId)?.name || '—'}</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-slate-500">Circle:</span>
                  <span className="font-bold text-slate-900">{circles.find(c => c.id === selectedCircleId)?.name || '—'}</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-amber-900 font-bold">Unit:</span>
                  <span className="font-black px-2 py-0.5 rounded bg-amber-200 text-amber-950 border border-amber-300">
                    {units.find(u => u.id === selectedUnitId)?.name || '—'}
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5 text-slate-800 text-xs font-medium">
                  <span className="text-slate-500">State:</span>
                  <span className="font-bold text-slate-900">{outsideForm.state_name || '—'}</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-slate-500">District:</span>
                  <span className="font-bold text-slate-900">{outsideForm.outside_district || '—'}</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-slate-500">Zone:</span>
                  <span className="font-bold text-slate-900">{outsideForm.outside_zone || '—'}</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-slate-500">Circle:</span>
                  <span className="font-bold text-slate-900">{outsideForm.outside_circle || '—'}</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-amber-900 font-bold">Unit:</span>
                  <span className="font-black px-2 py-0.5 rounded bg-amber-200 text-amber-950 border border-amber-300">
                    {outsideForm.outside_unit || '—'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Confirmation Checkbox (Exact original label) */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-markaz-700 focus:ring-markaz-600 cursor-pointer"
                required
              />
              <span className="text-xs md:text-sm font-semibold text-red-600">
                Complete and make sure all details before submit*
              </span>
            </label>
          </div>

          {/* Submit Error Banner */}
          {submitError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-700 text-xs md:text-sm flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="text-center pt-2">
            <button
              type="submit"
              disabled={submitting || !student || !!existingRegistration}
              className="inline-flex items-center justify-center gap-2 px-10 py-3.5 rounded-xl bg-markaz-700 hover:bg-markaz-800 disabled:bg-slate-400 text-white font-bold text-sm shadow-md hover:shadow-lg transition active:scale-95"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Registration...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Submit Registration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
