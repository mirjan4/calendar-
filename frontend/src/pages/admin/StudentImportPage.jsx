import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  Loader2,
  History,
  AlertCircle,
  ArrowRight,
  Database,
  FileText,
  Users
} from 'lucide-react';
import api from '../../services/api';

export default function StudentImportPage({ onImportSuccess }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Preview Data
  const [previewData, setPreviewData] = useState(null);
  const [importMode, setImportMode] = useState('insert_and_update'); // 'insert_only', 'update_only', 'insert_and_update'
  const [confirmed, setConfirmed] = useState(false);

  // Execution State
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [executionError, setExecutionError] = useState('');

  // History State
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get('/admin/students/import/history');
      if (res.data.success) {
        setHistory(res.data.history);
      }
    } catch (err) {
      console.error('Failed to load import history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setUploadError('');
      setPreviewData(null);
      setExecutionResult(null);
    }
  };

  const handlePreviewUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setUploadError('');
    setPreviewData(null);
    setExecutionResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await api.post('/admin/students/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setPreviewData(res.data);
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setUploadError(err.response.data.message);
      } else {
        setUploadError('Failed to parse spreadsheet file.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!previewData || !confirmed) return;

    setExecuting(true);
    setExecutionError('');

    try {
      const res = await api.post('/admin/students/import/confirm', {
        fileKey: previewData.fileKey,
        importMode
      });
      if (res.data.success) {
        setExecutionResult(res.data.summary);
        setPreviewData(null);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchHistory();
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setExecutionError(err.response.data.message);
      } else {
        setExecutionError('Database import transaction failed.');
      }
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
          Excel & CSV Student Import Engine
        </h1>
        <p className="text-xs md:text-sm text-slate-500">
          Bulk import or update student records using spreadsheet files with duplicate detection
        </p>
      </div>

      {/* Upload Box */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-markaz-700" />
          <span>Select Student Spreadsheet</span>
        </h2>

        <form onSubmit={handlePreviewUpload} className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition cursor-pointer"
               onClick={() => fileInputRef.current && fileInputRef.current.click()}>
            <FileSpreadsheet className="w-10 h-10 mx-auto text-markaz-700 mb-2 opacity-80" />
            <p className="text-xs md:text-sm font-bold text-slate-700">
              {selectedFile ? selectedFile.name : 'Click to select or drag & drop .xlsx, .xls, or .csv file'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Columns: <strong>SL, CLASS, HN, REG, CANDIDATE NAME, PLACE, MOBILE</strong> — Compulsory: <strong className="text-slate-800">CLASS, HN, REG, CANDIDATE NAME</strong> (Mobile, Place, and SL are optional)
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
          </div>

          {uploadError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-markaz-700 hover:bg-markaz-800 text-white font-semibold text-xs transition disabled:opacity-50 shadow-sm"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Parsing & Validating...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Preview Spreadsheet</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Execution Result Banner */}
      {executionResult && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-6 text-emerald-900 space-y-3">
          <div className="flex items-center gap-2 font-bold text-base text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Import Completed Successfully!</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-3 bg-white rounded-xl border border-emerald-200">
              <span className="text-slate-500 block">Total Rows</span>
              <span className="text-base font-bold text-slate-800">{executionResult.totalRows}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-emerald-200">
              <span className="text-slate-500 block">New Inserted</span>
              <span className="text-base font-bold text-emerald-700">{executionResult.imported}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-emerald-200">
              <span className="text-slate-500 block">Updated</span>
              <span className="text-base font-bold text-blue-700">{executionResult.updated}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-emerald-200">
              <span className="text-slate-500 block">Skipped</span>
              <span className="text-base font-bold text-amber-700">{executionResult.skipped}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-emerald-200">
              <span className="text-slate-500 block">Failed / Rejected</span>
              <span className="text-base font-bold text-red-700">{executionResult.failed}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            {onImportSuccess && (
              <button
                type="button"
                onClick={onImportSuccess}
                className="inline-flex items-center gap-2 px-4 py-2 bg-markaz-700 hover:bg-markaz-800 text-white rounded-lg text-xs font-semibold shadow-sm transition active:scale-95"
              >
                <Users className="w-4 h-4" />
                <span>View Updated Student Directory</span>
              </button>
            )}

            {executionResult.failed > 0 && (
              <a
                href={`/api/admin/students/import/${executionResult.importId}/errors`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
              >
                <Download className="w-4 h-4" />
                <span>Download {executionResult.failed} Rejected Rows (.xlsx)</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Preview Section */}
      {previewData && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Pre-Import Data Validation Summary
              </h3>
              <p className="text-xs text-slate-500">File: {previewData.originalName}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                Total: {previewData.totalRows}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                Valid: {previewData.validRows}
              </span>
              {previewData.invalidRows > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                  Invalid: {previewData.invalidRows}
                </span>
              )}
            </div>
          </div>

          {/* Validation Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block">New Students</span>
              <span className="text-lg font-bold text-emerald-700">{previewData.newStudents}</span>
              <span className="text-[11px] text-slate-400 block">Not in database yet</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block">Existing Students</span>
              <span className="text-lg font-bold text-blue-700">{previewData.existingStudents}</span>
              <span className="text-[11px] text-slate-400 block">Already in database</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block">Valid Rows</span>
              <span className="text-lg font-bold text-slate-800">{previewData.validRows}</span>
              <span className="text-[11px] text-slate-400 block">Ready to process</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block">Rejected / Flawed</span>
              <span className="text-lg font-bold text-red-600">{previewData.invalidRows}</span>
              <span className="text-[11px] text-slate-400 block">Missing info / bad mobile</span>
            </div>
          </div>

          {/* Import Mode Radio Group */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <label className="text-xs font-bold text-slate-800 block uppercase tracking-wider">
              Select Import Mode:
            </label>
            <div className="grid sm:grid-cols-3 gap-3 text-xs">
              <label
                className={`p-3 rounded-lg border cursor-pointer transition ${
                  importMode === 'insert_only'
                    ? 'bg-blue-50 border-markaz-700 text-markaz-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  value="insert_only"
                  checked={importMode === 'insert_only'}
                  onChange={(e) => setImportMode(e.target.value)}
                  className="mr-2"
                />
                <span>Insert New Students Only</span>
                <p className="text-[11px] text-slate-500 font-normal mt-1">
                  Skips existing registration numbers.
                </p>
              </label>

              <label
                className={`p-3 rounded-lg border cursor-pointer transition ${
                  importMode === 'update_only'
                    ? 'bg-blue-50 border-markaz-700 text-markaz-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  value="update_only"
                  checked={importMode === 'update_only'}
                  onChange={(e) => setImportMode(e.target.value)}
                  className="mr-2"
                />
                <span>Update Existing Only</span>
                <p className="text-[11px] text-slate-500 font-normal mt-1">
                  Updates matching students; ignores new records.
                </p>
              </label>

              <label
                className={`p-3 rounded-lg border cursor-pointer transition ${
                  importMode === 'insert_and_update'
                    ? 'bg-blue-50 border-markaz-700 text-markaz-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  value="insert_and_update"
                  checked={importMode === 'insert_and_update'}
                  onChange={(e) => setImportMode(e.target.value)}
                  className="mr-2"
                />
                <span>Insert New & Update Existing</span>
                <p className="text-[11px] text-slate-500 font-normal mt-1">
                  Complete sync: updates existing, creates new.
                </p>
              </label>
            </div>
          </div>

          {/* Sample Preview Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700">Preview (First 25 Rows):</h4>
            <div className="overflow-x-auto max-h-72 border border-slate-200 rounded-xl custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Row</th>
                    <th className="py-2 px-3">Reg No</th>
                    <th className="py-2 px-3">Candidate Name</th>
                    <th className="py-2 px-3">Class</th>
                    <th className="py-2 px-3">HN</th>
                    <th className="py-2 px-3">Mobile</th>
                    <th className="py-2 px-3">DB Status</th>
                    <th className="py-2 px-3">Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.sampleRows.map((r) => (
                    <tr key={r.rowNumber} className={r.isValid ? 'hover:bg-slate-50' : 'bg-red-50/50'}>
                      <td className="py-2 px-3 font-semibold text-slate-500">{r.rowNumber}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{r.regNo || '-'}</td>
                      <td className="py-2 px-3 font-medium text-slate-900">{r.candidateName || '-'}</td>
                      <td className="py-2 px-3 text-slate-600">{r.className || '-'}</td>
                      <td className="py-2 px-3 text-slate-500">{r.hn || '-'}</td>
                      <td className="py-2 px-3 text-slate-600">{r.mobile || '-'}</td>
                      <td className="py-2 px-3">
                        {r.isExistingInDb ? (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                            Existing
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            New
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {r.isValid ? (
                          <span className="text-emerald-600 font-bold">Valid</span>
                        ) : (
                          <span className="text-red-600 font-bold text-[11px]">{r.errors.join(', ')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="w-4 h-4 rounded text-markaz-700 focus:ring-markaz-600"
              />
              <span className="text-xs font-semibold text-amber-900">
                I verify that I have previewed the spreadsheet and authorize modifying the student database.
              </span>
            </label>
          </div>

          {executionError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{executionError}</span>
            </div>
          )}

          {/* Confirm Button */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setPreviewData(null)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={!confirmed || executing}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-markaz-700 hover:bg-markaz-800 disabled:bg-slate-400 text-white rounded-lg text-xs font-bold transition shadow-sm"
            >
              {executing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importing Records with Transaction...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>Execute Safe Import</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Past Import History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-markaz-700" />
            <h3 className="font-bold text-sm text-slate-900">
              Student Import History
            </h3>
          </div>
          <button
            onClick={fetchHistory}
            className="text-xs text-markaz-700 hover:underline font-semibold"
          >
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">File Name</th>
                <th className="py-2.5 px-4">Mode</th>
                <th className="py-2.5 px-4">Total</th>
                <th className="py-2.5 px-4">Imported</th>
                <th className="py-2.5 px-4">Updated</th>
                <th className="py-2.5 px-4">Failed</th>
                <th className="py-2.5 px-4">Uploaded By</th>
                <th className="py-2.5 px-4 text-right">Rejected File</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingHistory ? (
                <tr>
                  <td colSpan="9" className="py-6 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-markaz-700" />
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-6 text-center text-slate-400">
                    No past spreadsheet imports recorded yet.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 text-slate-500">
                      {new Date(h.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">{h.file_name}</td>
                    <td className="py-2.5 px-4 capitalize">{h.import_mode.replace(/_/g, ' ')}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-700">{h.total_rows}</td>
                    <td className="py-2.5 px-4 text-emerald-700 font-bold">{h.imported_rows}</td>
                    <td className="py-2.5 px-4 text-blue-700 font-bold">{h.updated_rows}</td>
                    <td className="py-2.5 px-4 text-red-600 font-bold">{h.failed_rows}</td>
                    <td className="py-2.5 px-4 text-slate-600">{h.uploaded_by_name || 'Admin'}</td>
                    <td className="py-2.5 px-4 text-right">
                      {h.failed_rows > 0 ? (
                        <a
                          href={`/api/admin/students/import/${h.id}/errors`}
                          className="text-xs text-red-600 hover:underline font-semibold inline-flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Rejected (.xlsx)</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400">None</span>
                      )}
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
