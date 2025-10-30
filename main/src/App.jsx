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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete Report</h3>
          <p className="text-sm text-gray-500 text-center mb-6">
            Are you sure you want to delete this report? This action cannot be undone.
          </p>
          <div className="bg-gray-50 p-3 rounded-md mb-6 text-sm">
            <div className="flex justify-between mb-1">
              <span className="font-medium text-gray-700">Report ID:</span>
              <span className="text-gray-600">{report.report_id}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="font-medium text-gray-700">Patient ID:</span>
              <span className="text-gray-600">{report.patient_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">File:</span>
              <span className="text-gray-600 truncate ml-2">{report.fileName}</span>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="py-2 px-4 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="py-2 px-4 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-400"
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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      {/* This is the modal content */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Edit Extracted Data</h2>
            <p className="text-sm text-gray-500">Report ID: {report.report_id}</p>

            {/* PII Fields */}
            <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <legend className="text-lg font-medium text-gray-700 col-span-full">Patient Information (PII)</legend>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-600">Name</label>
                <input type="text" id="name" name="name" value={phi.name || ''} onChange={handlePhiChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-600">Age</label>
                <input type="text" id="age" name="age" value={phi.age || ''} onChange={handlePhiChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-600">Gender</label>
                <input type="text" id="gender" name="gender" value={phi.gender || ''} onChange={handlePhiChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label htmlFor="dob" className="block text-sm font-medium text-gray-600">Date of Birth</label>
                <input type="text" id="dob" name="dob" value={phi.dob || ''} onChange={handlePhiChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="patient_id" className="block text-sm font-medium text-gray-600">Patient ID (UHID)</label>
                <input type="text" id="patient_id" name="patient_id" value={phi.patient_id || ''} onChange={handlePhiChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
            </fieldset>

            {/* Medical Terms Field */}
            <div>
              <label htmlFor="medical_terms" className="block text-sm font-medium text-gray-600">Medical Terms (comma-separated)</label>
              <textarea id="medical_terms" name="medical_terms" rows="4" value={termsString} onChange={handleTermsChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"></textarea>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-xl">
            <button typeD="button" onClick={onClose} disabled={isSaving} className="py-2 px-4 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="py-2 px-4 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400">
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
    <div className="bg-gray-50 min-h-screen font-sans">
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
        <header className="text-center mb-8">
          <div className="flex justify-between items-center">
            <div className="flex-1"></div>
            <h1 className="text-4xl font-bold text-gray-800 flex-1">PulseCloud Dashboard</h1>
            <div className="flex-1 flex justify-end items-center gap-4">
              <span className="text-sm text-gray-600">
                {sessionStorage.getItem('username')}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 justify-center">
              <button
                onClick={() => setActiveTab('upload')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'upload'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Upload Report
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'reports'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Patient Reports
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'stats'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Statistics
              </button>
            </nav>
          </div>
        </div>

        <main>
          {/* Upload Tab Content */}
          {activeTab === 'upload' && (
            <div className="max-w-2xl mx-auto">
              <section className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">Upload New Report</h2>
                <form id="uploadForm" onSubmit={handleUpload} className="space-y-4">
                  <div>
                    <label htmlFor="fileInput" className="block text-sm font-medium text-gray-600">File</label>
                    <input type="file" id="fileInput" onChange={(e) => setFile(e.target.files[0])} required className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400">
                    Upload
                  </button>
                </form>
                {status.message && (
                  <div className={`mt-4 p-3 rounded-md text-sm ${status.type === 'success' ? 'bg-green-100 text-green-800' :
                    status.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                    {status.message}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Reports Tab Content */}
          {activeTab === 'reports' && (
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-2xl font-semibold text-gray-700">Patient Reports</h2>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Search by name, ID, age, terms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm w-full sm:w-64"
                  />
                  <button
                    onClick={fetchReports}
                    disabled={isLoading}
                    className="text-sm bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300 disabled:opacity-50 whitespace-nowrap"
                  >
                    Refresh
                  </button>
                </div>
              </div>
              {status.message && activeTab === 'reports' && (
                <div className={`mb-4 p-3 rounded-md text-sm ${status.type === 'success' ? 'bg-green-100 text-green-800' :
                  status.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                  {status.message}
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('patient_id')}
                      >
                        <div className="flex items-center gap-1">
                          Patient ID
                          {sortConfig.key === 'patient_id' && (
                            <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          Name
                          {sortConfig.key === 'name' && (
                            <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('age')}
                      >
                        <div className="flex items-center gap-1">
                          Age
                          {sortConfig.key === 'age' && (
                            <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('date')}
                      >
                        <div className="flex items-center gap-1">
                          Date
                          {sortConfig.key === 'date' && (
                            <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isLoading ? (
                      <tr><td colSpan="6" className="text-center py-4">Loading reports...</td></tr>
                    ) : filteredReports.length > 0 ? (
                      filteredReports.map(report => {
                        const phi = report.extracted_data?.phi;
                        const terms = report.extracted_data?.medical_terms?.join(', ');
                        const isExpanded = expandedReportId === report.report_id;

                        return (
                          <React.Fragment key={report.report_id}>
                            <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpandRow(report.report_id)}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <svg
                                  className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{report.patient_id}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{phi?.name || '--'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{phi?.age || '--'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(report.uploadTimestamp).toLocaleDateString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleOpenEditModal(report)}
                                  className="text-indigo-600 hover:text-indigo-900 disabled:text-gray-300"
                                  disabled={!report.extracted_data}
                                  title={report.extracted_data ? "Edit extracted data" : "No extracted data to edit"}
                                >
                                  Edit
                                </button>
                                <button onClick={() => handleDelete(report)} className="text-red-600 hover:text-red-900">Delete</button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan="6" className="px-6 py-4 bg-gray-50">
                                  <div className="space-y-3">
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-700 mb-1">File Name:</h4>
                                      <a
                                        href={report.s3Url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-indigo-600 hover:text-indigo-900 text-sm"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {report.fileName}
                                      </a>
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Medical Terms:</h4>
                                      {report.extracted_data?.medical_terms?.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                          {report.extracted_data.medical_terms.map((term, index) => (
                                            <span
                                              key={index}
                                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200"
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
                                      <div>
                                        <h4 className="text-sm font-semibold text-gray-700 mb-1">Additional Patient Information:</h4>
                                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                          {phi.gender && <div><span className="font-medium">Gender:</span> {phi.gender}</div>}
                                          {phi.dob && <div><span className="font-medium">DOB:</span> {phi.dob}</div>}
                                          {phi.patient_id && <div><span className="font-medium">UHID:</span> {phi.patient_id}</div>}
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
                      <tr><td colSpan="6" className="text-center py-4">
                        {searchQuery ? 'No reports match your search.' : 'No reports found.'}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Statistics Tab Content */}
          {activeTab === 'stats' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-700">Medical Terms Statistics</h2>
                  <button
                    onClick={fetchReports}
                    disabled={isLoading}
                    className="text-sm bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300 disabled:opacity-50"
                  >
                    Refresh
                  </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <p className="text-sm text-indigo-600 font-medium">Total Reports</p>
                    <p className="text-3xl font-bold text-indigo-900">{reports.length}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-sm text-green-600 font-medium">Processed Reports</p>
                    <p className="text-3xl font-bold text-green-900">
                      {reports.filter(r => r.extracted_data).length}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-600 font-medium">Unique Medical Terms</p>
                    <p className="text-3xl font-bold text-purple-900">
                      {Object.keys(getMedicalTermStats().reduce((acc, { term }) => ({ ...acc, [term]: true }), {})).length}
                    </p>
                  </div>
                </div>

                {/* Chart */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Top 10 Most Common Medical Terms</h3>
                  {topMedicalTerms.length > 0 ? (
                    <div className="space-y-3">
                      {topMedicalTerms.map(({ term, count }, index) => (
                        <div key={term} className="flex items-center gap-3">
                          <div className="w-8 text-right text-sm font-medium text-gray-500">
                            {index + 1}.
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700 capitalize">{term}</span>
                              <span className="text-sm text-gray-500">{count} occurrence{count !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                              <div
                                className="bg-indigo-600 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                                style={{ width: `${(count / maxCount) * 100}%` }}
                              >
                                <span className="text-xs font-semibold text-white">
                                  {((count / maxCount) * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <p className="text-sm italic">No medical terms data available yet.</p>
                      <p className="text-xs mt-1">Upload and process reports to see statistics.</p>
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

