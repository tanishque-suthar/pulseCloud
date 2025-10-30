import React, { useState, useEffect, useCallback } from 'react';
import Login from './Login';

// --- Configuration ---
const UPLOAD_API_URL = 'https://sqs8nswnp6.execute-api.us-east-1.amazonaws.com/default/s3-via-lambda';
const GET_REPORTS_API_URL = 'https://79k7ybmsql.execute-api.us-east-1.amazonaws.com/default/get-reports';
const DELETE_REPORT_API_URL = 'https://855fw25yl9.execute-api.us-east-1.amazonaws.com/default/delete-report';
const UPDATE_REPORT_API_URL = 'https://aslyy20vsh.execute-api.us-east-1.amazonaws.com/default/update-report';

// --- Delete Confirmation Modal Component ---
function DeleteConfirmModal({ report, onClose, onConfirm, isDeleting }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all animate-fadeIn">
        <div className="p-8">
          <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gradient-to-br from-red-100 to-red-50 rounded-full mb-6 shadow-lg">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-3">Delete Report</h3>
          <p className="text-sm text-gray-600 text-center mb-6">
            Are you sure you want to delete this report? This action cannot be undone.
          </p>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl mb-6 text-sm border border-gray-200">
            <div className="flex justify-between mb-2">
              <span className="font-semibold text-gray-700">Report ID:</span>
              <span className="text-gray-900 font-medium">{report.report_id}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="font-semibold text-gray-700">Patient ID:</span>
              <span className="text-gray-900 font-medium">{report.patient_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-700">File:</span>
              <span className="text-gray-900 font-medium truncate ml-2">{report.fileName}</span>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-8 py-5 flex justify-end space-x-3 rounded-b-2xl border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="py-2.5 px-6 text-sm font-semibold text-gray-700 bg-white rounded-lg border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="py-2.5 px-6 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 rounded-lg hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:from-gray-400 disabled:to-gray-400 shadow-lg hover:shadow-xl transition-all"
          >
            {isDeleting ? 'Deleting...' : 'Delete Report'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Edit Modal Component ---
// We create a separate component for the pop-up form
function EditReportModal({ report, onClose, onSave, setStatus }) {
  // This state is temporary, only for the form
  const [data, setData] = useState(report.extracted_data || { phi: {}, medical_terms: [] });
  const [isSaving, setIsSaving] = useState(false);

  const handlePhiChange = (e) => {
    const { name, value } = e.target;
    setData(prevData => ({
      ...prevData,
      phi: {
        ...prevData.phi,
        [name]: value === '' ? null : value // Store empty strings as null
      }
    }));
  };

  const handleTermsChange = (e) => {
    // Split by comma, trim whitespace, and remove empty strings
    const termsArray = e.target.value.split(',').map(term => term.trim()).filter(Boolean);
    setData(prevData => ({
      ...prevData,
      medical_terms: termsArray
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatus({ message: 'Saving changes...', type: 'info' });
    try {
      if (!UPDATE_REPORT_API_URL.startsWith('https')) {
        throw new Error("Update Report API URL is not configured.");
      }

      const payload = {
        patient_id: report.patient_id,
        report_id: report.report_id,
        extracted_data: data // Send the updated data object
      };

      const response = await fetch(UPDATE_REPORT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Save failed with status: ${response.status}`);
      }

      setStatus({ message: 'Save successful!', type: 'success' });
      onSave(); // This will close the modal and refresh the main list
    } catch (error) {
      console.error('Save Error:', error);
      setStatus({ message: `Save failed: ${error.message}`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Convert medical_terms array back to a comma-separated string for the textarea
  const termsString = data.medical_terms ? data.medical_terms.join(', ') : '';
  const phi = data.phi || {};

  return (
    // This is the modal backdrop
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      {/* This is the modal content */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all animate-fadeIn">
        <form onSubmit={handleSubmit}>
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Edit Extracted Data</h2>
                <p className="text-sm text-gray-500 mt-1">Report ID: <span className="font-semibold text-indigo-600">{report.report_id}</span></p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <legend className="text-xl font-bold text-gray-800 col-span-full mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Patient Information
              </legend>
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={phi.name || ''}
                  onChange={handlePhiChange}
                  className="block w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label htmlFor="age" className="block text-sm font-semibold text-gray-700 mb-1">Age</label>
                <input
                  type="text"
                  id="age"
                  name="age"
                  value={phi.age || ''}
                  onChange={handlePhiChange}
                  className="block w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label htmlFor="gender" className="block text-sm font-semibold text-gray-700 mb-1">Gender</label>
                <input
                  type="text"
                  id="gender"
                  name="gender"
                  value={phi.gender || ''}
                  onChange={handlePhiChange}
                  className="block w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label htmlFor="dob" className="block text-sm font-semibold text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="text"
                  id="dob"
                  name="dob"
                  value={phi.dob || ''}
                  onChange={handlePhiChange}
                  className="block w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="patient_id" className="block text-sm font-semibold text-gray-700 mb-1">Patient ID (UHID)</label>
                <input
                  type="text"
                  id="patient_id"
                  name="patient_id"
                  value={phi.patient_id || ''}
                  onChange={handlePhiChange}
                  className="block w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </fieldset>

            <div>
              <label htmlFor="medical_terms" className="block text-sm font-semibold text-gray-700 mb-1 flex items-center">
                <svg className="w-4 h-4 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Medical Terms (comma-separated)
              </label>
              <textarea
                id="medical_terms"
                name="medical_terms"
                rows="4"
                value={termsString}
                onChange={handleTermsChange}
                className="block w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              ></textarea>
            </div>
          </div>

          <div className="bg-gray-50 px-8 py-5 flex justify-end space-x-3 rounded-b-2xl border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="py-2.5 px-6 text-sm font-semibold text-gray-700 bg-white rounded-lg border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="py-2.5 px-6 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:from-gray-400 disabled:to-gray-400 shadow-lg hover:shadow-xl transition-all"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// --- Main App Component ---
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [reports, setReports] = useState([]);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [editingReport, setEditingReport] = useState(null);
  const [deletingReport, setDeletingReport] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('upload'); // Changed default to 'upload'
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'report_id', direction: 'desc' });

  // --- Data Fetching ---
  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setStatus({ message: 'Fetching reports...', type: 'info' });
    try {
      if (!GET_REPORTS_API_URL.startsWith('https')) {
        throw new Error("Get Reports API URL is not configured.");
      }
      const response = await fetch(GET_REPORTS_API_URL);
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();
      setReports(data.sort((a, b) => b.report_id - a.report_id));
      setStatus({ message: '', type: '' });
    } catch (error) {
      console.error("Failed to fetch reports:", error);
      setStatus({ message: `Error fetching reports: ${error.message}`, type: 'error' });
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // --- Event Handlers ---
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setStatus({ message: 'Please select a file.', type: 'error' });
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setStatus({ message: 'Error: File is too large (Max 6MB).', type: 'error' });
      return;
    }

    // Auto-generate a unique numeric patient ID using timestamp
    const autoGeneratedPatientId = Date.now();

    setStatus({ message: 'Uploading...', type: 'info' });

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64Data = reader.result.split(',')[1];
        const response = await fetch(UPLOAD_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            patientId: autoGeneratedPatientId,
            fileData: base64Data,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Upload failed with status: ${response.status}`);
        }

        setStatus({ message: 'Upload successful! Refreshing list...', type: 'success' });
        setFile(null);
        document.getElementById('uploadForm').reset();
        setTimeout(fetchReports, 1000);
      } catch (error) {
        console.error('Upload Error:', error);
        setStatus({ message: `Upload failed: ${error.message}`, type: 'error' });
      }
    };
    reader.onerror = () => {
      setStatus({ message: 'Error reading file.', type: 'error' });
    };
  };

  const handleDelete = (report) => {
    setDeletingReport(report);
  };

  const handleCancelDelete = () => {
    setDeletingReport(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingReport) return;

    setIsDeleting(true);
    setStatus({ message: `Deleting report ${deletingReport.report_id}...`, type: 'info' });

    try {
      if (!DELETE_REPORT_API_URL.startsWith('https')) {
        throw new Error("Delete Report API URL is not configured.");
      }
      const payload = {
        patient_id: deletingReport.patient_id,
        report_id: deletingReport.report_id,
        s3Key: deletingReport.s3Url.split('.com/')[1]
      };

      const response = await fetch(DELETE_REPORT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Failed to delete with status: ${response.status}`);

      setStatus({ message: 'Report deleted successfully. Refreshing...', type: 'success' });
      setDeletingReport(null);
      setTimeout(fetchReports, 1000);
    } catch (error) {
      console.error('Delete Error:', error);
      setStatus({ message: `Failed to delete report: ${error.message}`, type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  // --- 3. ADD HANDLERS FOR THE MODAL ---
  const handleOpenEditModal = (report) => {
    // Only allow editing if it's a processed PDF
    if (report.extracted_data) {
      setEditingReport(report);
    } else {
      setStatus({ message: 'Only processed PDF reports can be edited.', type: 'error' });
    }
  };

  const handleCloseEditModal = () => {
    setEditingReport(null);
  };

  const handleSaveEditModal = () => {
    setEditingReport(null); // Close the modal
    setTimeout(fetchReports, 500); // Refresh the list from the DB
  };

  // Toggle expanded row
  const toggleExpandRow = (reportId) => {
    setExpandedReportId(expandedReportId === reportId ? null : reportId);
  };

  // Filter and sort reports
  const getFilteredAndSortedReports = () => {
    let filteredReports = [...reports];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredReports = filteredReports.filter(report => {
        const phi = report.extracted_data?.phi;
        const terms = report.extracted_data?.medical_terms?.join(' ').toLowerCase() || '';

        return (
          report.patient_id.toString().includes(query) ||
          phi?.name?.toLowerCase().includes(query) ||
          phi?.age?.toString().includes(query) ||
          phi?.gender?.toLowerCase().includes(query) ||
          report.fileName?.toLowerCase().includes(query) ||
          terms.includes(query)
        );
      });
    }

    // Apply sorting
    filteredReports.sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case 'patient_id':
          aValue = a.patient_id;
          bValue = b.patient_id;
          break;
        case 'name':
          aValue = a.extracted_data?.phi?.name || '';
          bValue = b.extracted_data?.phi?.name || '';
          break;
        case 'age':
          aValue = parseInt(a.extracted_data?.phi?.age) || 0;
          bValue = parseInt(b.extracted_data?.phi?.age) || 0;
          break;
        case 'date':
          aValue = new Date(a.uploadTimestamp).getTime();
          bValue = new Date(b.uploadTimestamp).getTime();
          break;
        default:
          aValue = a.report_id;
          bValue = b.report_id;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filteredReports;
  };

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredReports = getFilteredAndSortedReports();

  // Calculate medical term statistics
  const getMedicalTermStats = () => {
    const termCounts = {};

    reports.forEach(report => {
      const terms = report.extracted_data?.medical_terms || [];
      terms.forEach(term => {
        const normalizedTerm = term.trim().toLowerCase();
        if (normalizedTerm) {
          termCounts[normalizedTerm] = (termCounts[normalizedTerm] || 0) + 1;
        }
      });
    });

    // Convert to array and sort by count
    const sortedTerms = Object.entries(termCounts)
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 terms

    return sortedTerms;
  };

  const topMedicalTerms = getMedicalTermStats();
  const maxCount = topMedicalTerms.length > 0 ? topMedicalTerms[0].count : 1;

  // Calculate age distribution statistics
  const getAgeDistribution = () => {
    const ageGroups = {
      '0-18': 0,
      '19-30': 0,
      '31-45': 0,
      '46-60': 0,
      '61-75': 0,
      '76+': 0
    };

    reports.forEach(report => {
      const age = parseInt(report.extracted_data?.phi?.age);
      if (!isNaN(age)) {
        if (age <= 18) ageGroups['0-18']++;
        else if (age <= 30) ageGroups['19-30']++;
        else if (age <= 45) ageGroups['31-45']++;
        else if (age <= 60) ageGroups['46-60']++;
        else if (age <= 75) ageGroups['61-75']++;
        else ageGroups['76+']++;
      }
    });

    const maxGroupCount = Math.max(...Object.values(ageGroups));
    return { ageGroups, maxGroupCount };
  };

  const { ageGroups, maxGroupCount } = getAgeDistribution();

  // Check authentication on mount
  useEffect(() => {
    const authStatus = sessionStorage.getItem('isAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('username');
    setIsAuthenticated(false);
    setReports([]);
    setActiveTab('upload');
    setStatus({ message: '', type: '' });
  };

  // If not authenticated, show login page
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // --- UI Rendering ---
  return (
    <div className="bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 min-h-screen font-sans">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>

      {editingReport && (
        <EditReportModal
          report={editingReport}
          onClose={handleCloseEditModal}
          onSave={handleSaveEditModal}
          setStatus={setStatus}
        />
      )}

      {deletingReport && (
        <DeleteConfirmModal
          report={deletingReport}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />
      )}

      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex justify-between items-center">
              <div className="flex-1"></div>
              <div className="flex-1 flex flex-col items-center">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    PulseCloud
                  </h1>
                </div>
                <p className="text-sm text-gray-500 font-medium">Healthcare Data Management Platform</p>
              </div>
              <div className="flex-1 flex justify-end items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-gray-500 font-medium">Logged in as</p>
                  <p className="text-sm text-gray-800 font-semibold">
                    {sessionStorage.getItem('username')}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm bg-gradient-to-r from-gray-100 to-gray-200 px-5 py-2.5 rounded-lg hover:from-gray-200 hover:to-gray-300 transition-all font-semibold text-gray-700 shadow-md hover:shadow-lg"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-2 border border-gray-100">
            <nav className="flex space-x-2">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-3.5 px-6 text-sm font-semibold rounded-xl transition-all ${activeTab === 'upload'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload Report
                </div>
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`flex-1 py-3.5 px-6 text-sm font-semibold rounded-xl transition-all ${activeTab === 'reports'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Patient Reports
                </div>
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`flex-1 py-3.5 px-6 text-sm font-semibold rounded-xl transition-all ${activeTab === 'stats'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 012 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Statistics
                </div>
              </button>
            </nav>
          </div>
        </div>

        <main>
          {/* Upload Tab Content */}
          {activeTab === 'upload' && (
            <div className="max-w-2xl mx-auto">
              <section className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl mb-4 shadow-lg">
                    <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Upload New Report</h2>
                  <p className="text-gray-600">Upload a medical report for processing and analysis</p>
                </div>
                <form id="uploadForm" onSubmit={handleUpload} className="space-y-6">
                  <div>
                    <label htmlFor="fileInput" className="block text-sm font-semibold text-gray-700 mb-2">Select File</label>
                    <div className="relative">
                      <input
                        type="file"
                        id="fileInput"
                        onChange={(e) => setFile(e.target.files[0])}
                        required
                        className="block w-full text-sm text-gray-600 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-indigo-50 file:to-purple-50 file:text-indigo-700 hover:file:from-indigo-100 hover:file:to-purple-100 cursor-pointer border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-indigo-400 transition-all"
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Maximum file size: 6MB</p>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3.5 px-6 rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:from-gray-400 disabled:to-gray-400 font-semibold shadow-lg hover:shadow-xl transition-all text-lg"
                  >
                    Upload Report
                  </button>
                </form>
                {status.message && (
                  <div className={`mt-6 p-4 rounded-xl text-sm font-medium border-2 ${status.type === 'success'
                    ? 'bg-green-50 text-green-800 border-green-200'
                    : status.type === 'error'
                      ? 'bg-red-50 text-red-800 border-red-200'
                      : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}>
                    <div className="flex items-center gap-2">
                      {status.type === 'success' && (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {status.type === 'error' && (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {status.message}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Reports Tab Content */}
          {activeTab === 'reports' && (
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-1">Patient Reports</h2>
                  <p className="text-gray-600">Manage and view all patient medical reports</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search reports..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm w-full sm:w-64 transition-all"
                    />
                  </div>
                  <button
                    onClick={fetchReports}
                    disabled={isLoading}
                    className="text-sm bg-gradient-to-r from-gray-100 to-gray-200 px-5 py-2.5 rounded-xl hover:from-gray-200 hover:to-gray-300 disabled:opacity-50 font-semibold shadow-md hover:shadow-lg transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </div>
                  </button>
                </div>
              </div>
              {status.message && activeTab === 'reports' && (
                <div className={`mb-6 p-4 rounded-xl text-sm font-medium border-2 ${status.type === 'success'
                  ? 'bg-green-50 text-green-800 border-green-200'
                  : status.type === 'error'
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-blue-50 text-blue-800 border-blue-200'
                  }`}>
                  {status.message}
                </div>
              )}
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-12"></th>
                      <th
                        className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={() => handleSort('patient_id')}
                      >
                        <div className="flex items-center gap-2">
                          Patient ID
                          {sortConfig.key === 'patient_id' && (
                            <span className="text-indigo-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-2">
                          Name
                          {sortConfig.key === 'name' && (
                            <span className="text-indigo-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={() => handleSort('age')}
                      >
                        <div className="flex items-center gap-2">
                          Age
                          {sortConfig.key === 'age' && (
                            <span className="text-indigo-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={() => handleSort('date')}
                      >
                        <div className="flex items-center gap-2">
                          Date
                          {sortConfig.key === 'date' && (
                            <span className="text-indigo-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isLoading ? (
                      <tr><td colSpan="6" className="text-center py-12 text-gray-500">
                        <div className="flex flex-col items-center gap-3">
                          <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Loading reports...
                        </div>
                      </td></tr>
                    ) : filteredReports.length > 0 ? (
                      filteredReports.map(report => {
                        const phi = report.extracted_data?.phi;
                        const terms = report.extracted_data?.medical_terms?.join(', ');
                        const isExpanded = expandedReportId === report.report_id;

                        return (
                          <React.Fragment key={report.report_id}>
                            <tr className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 cursor-pointer transition-all" onClick={() => toggleExpandRow(report.report_id)}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <svg
                                  className={`w-5 h-5 transition-transform text-indigo-600 ${isExpanded ? 'rotate-90' : ''}`}
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path d="M9 5l7 7-7 7"></path>
                                </svg>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-gray-900">{report.patient_id}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{phi?.name || '--'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-700">{phi?.age || '--'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-700">{new Date(report.uploadTimestamp).toLocaleDateString()}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold space-x-4" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleOpenEditModal(report)}
                                  className="text-indigo-600 hover:text-indigo-900 disabled:text-gray-300 transition-colors"
                                  disabled={!report.extracted_data}
                                  title={report.extracted_data ? "Edit extracted data" : "No extracted data to edit"}
                                >
                                  Edit
                                </button>
                                <button onClick={() => handleDelete(report)} className="text-red-600 hover:text-red-900 transition-colors">Delete</button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan="6" className="px-6 py-6 bg-gradient-to-br from-gray-50 to-indigo-50 border-t border-indigo-100">
                                  <div className="space-y-5">
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                      <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                                        <svg className="w-4 h-4 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        File Name:
                                      </h4>
                                      <a
                                        href={report.s3Url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {report.fileName}
                                      </a>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                      <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                                        <svg className="w-4 h-4 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        Medical Terms:
                                      </h4>
                                      {report.extracted_data?.medical_terms?.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                          {report.extracted_data.medical_terms.map((term, index) => (
                                            <span
                                              key={index}
                                              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 border border-indigo-200 shadow-sm"
                                            >
                                              {term}
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-sm text-gray-500 italic">No medical terms extracted</p>
                                      )}
                                    </div>
                                    {phi && (
                                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                        <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                                          <svg className="w-4 h-4 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                          </svg>
                                          Additional Patient Information:
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                          {phi.gender && <div className="bg-gray-50 p-2 rounded-lg"><span className="font-semibold text-gray-700">Gender:</span> <span className="text-gray-900">{phi.gender}</span></div>}
                                          {phi.dob && <div className="bg-gray-50 p-2 rounded-lg"><span className="font-semibold text-gray-700">DOB:</span> <span className="text-gray-900">{phi.dob}</span></div>}
                                          {phi.patient_id && <div className="bg-gray-50 p-2 rounded-lg"><span className="font-semibold text-gray-700">UHID:</span> <span className="text-gray-900">{phi.patient_id}</span></div>}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })
                    ) : (
                      <tr><td colSpan="6" className="text-center py-12">
                        <div className="flex flex-col items-center gap-3 text-gray-500">
                          <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <p className="font-medium">{searchQuery ? 'No reports match your search.' : 'No reports found.'}</p>
                        </div>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Statistics Tab Content */}
          {activeTab === 'stats' && (
            <div className="max-w-5xl mx-auto">
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-1">Medical Insights</h2>
                    <p className="text-gray-600">Analytics and statistics from medical reports</p>
                  </div>
                  <button
                    onClick={fetchReports}
                    disabled={isLoading}
                    className="text-sm bg-gradient-to-r from-gray-100 to-gray-200 px-5 py-2.5 rounded-xl hover:from-gray-200 hover:to-gray-300 disabled:opacity-50 font-semibold shadow-md hover:shadow-lg transition-all"
                  >
                    Refresh
                  </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-2xl border-2 border-indigo-200 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-indigo-700 font-bold uppercase tracking-wide">Total Reports</p>
                      <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-4xl font-bold text-indigo-900">{reports.length}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border-2 border-green-200 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-green-700 font-bold uppercase tracking-wide">Processed</p>
                      <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-4xl font-bold text-green-900">
                      {reports.filter(r => r.extracted_data).length}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border-2 border-purple-200 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-purple-700 font-bold uppercase tracking-wide">Unique Terms</p>
                      <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <p className="text-4xl font-bold text-purple-900">
                      {Object.keys(getMedicalTermStats().reduce((acc, { term }) => ({ ...acc, [term]: true }), {})).length}
                    </p>
                  </div>
                </div>

                {/* Chart */}
                <div className="bg-gradient-to-br from-gray-50 to-indigo-50 p-6 rounded-2xl border border-gray-200 mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 012 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Top 10 Most Common Medical Terms
                  </h3>
                  {topMedicalTerms.length > 0 ? (
                    <div className="space-y-4">
                      {topMedicalTerms.map(({ term, count }, index) => (
                        <div key={term} className="flex items-center gap-4 group">
                          <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl font-bold shadow-lg group-hover:shadow-xl transition-shadow">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-bold text-gray-800 capitalize">{term}</span>
                              <span className="text-sm font-semibold text-indigo-700 bg-indigo-100 px-3 py-1 rounded-lg">
                                {count} occurrence{count !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden shadow-inner">
                              <div
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 h-full rounded-full transition-all duration-700 flex items-center justify-end pr-3 group-hover:from-indigo-700 group-hover:to-purple-700"
                                style={{ width: `${(count / maxCount) * 100}%` }}
                              >
                                <span className="text-xs font-bold text-white">
                                  {((count / maxCount) * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-gray-500">
                      <svg className="mx-auto h-20 w-20 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 012 2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <p className="text-base font-medium italic">No medical terms data available yet.</p>
                      <p className="text-sm mt-2">Upload and process reports to see statistics.</p>
                    </div>
                  )}
                </div>

                {/* Age Distribution Chart */}
                <div className="bg-gradient-to-br from-gray-50 to-purple-50 p-6 rounded-2xl border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Patient Age Distribution
                  </h3>
                  {maxGroupCount > 0 ? (
                    <div className="h-80 flex items-end justify-around gap-4 px-4">
                      {Object.entries(ageGroups).map(([ageRange, count], index) => {
                        const colors = [
                          { gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-500', label: 'bg-blue-100 text-blue-700' },
                          { gradient: 'from-green-500 to-green-600', bg: 'bg-green-500', label: 'bg-green-100 text-green-700' },
                          { gradient: 'from-yellow-500 to-yellow-600', bg: 'bg-yellow-500', label: 'bg-yellow-100 text-yellow-700' },
                          { gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-500', label: 'bg-orange-100 text-orange-700' },
                          { gradient: 'from-red-500 to-red-600', bg: 'bg-red-500', label: 'bg-red-100 text-red-700' },
                          { gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-500', label: 'bg-purple-100 text-purple-700' }
                        ];
                        const color = colors[index % colors.length];
                        const heightPercentage = maxGroupCount > 0 ? (count / maxGroupCount) * 100 : 0;

                        return (
                          <div key={ageRange} className="flex flex-col items-center flex-1 group">
                            {/* Count label above bar */}
                            <div className={`mb-2 px-3 py-1 rounded-lg text-xs font-bold ${color.label} transition-all ${count > 0 ? 'opacity-100' : 'opacity-0'}`}>
                              {count > 0 && `${count}`}
                            </div>

                            {/* Bar */}
                            <div className="w-full flex flex-col justify-end items-center" style={{ height: '240px' }}>
                              <div
                                className={`w-full bg-gradient-to-t ${color.gradient} rounded-t-xl shadow-lg group-hover:shadow-2xl transition-all duration-500 flex items-start justify-center pt-3 relative`}
                                style={{ height: `${heightPercentage}%`, minHeight: count > 0 ? '40px' : '0px' }}
                              >
                                {count > 0 && (
                                  <span className="text-xs font-bold text-white">
                                    {heightPercentage.toFixed(0)}%
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Age range label */}
                            <div className="mt-3 text-center">
                              <div className="text-sm font-bold text-gray-800">{ageRange}</div>
                              <div className="text-xs text-gray-500 mt-1">years</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-gray-500">
                      <svg className="mx-auto h-20 w-20 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-base font-medium italic">No age data available yet.</p>
                      <p className="text-sm mt-2">Upload and process reports to see age distribution.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
