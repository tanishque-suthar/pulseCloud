import React, { useState, useEffect, useCallback } from 'react';

// --- Configuration ---
const UPLOAD_API_URL = 'https://sqs8nswnp6.execute-api.us-east-1.amazonaws.com/default/s3-via-lambda';
const GET_REPORTS_API_URL = 'https://79k7ybmsql.execute-api.us-east-1.amazonaws.com/default/get-reports';
const DELETE_REPORT_API_URL = 'https://855fw25yl9.execute-api.us-east-1.amazonaws.com/default/delete-report';

// --- Main App Component ---
export default function App() {
  const [reports, setReports] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [isLoading, setIsLoading] = useState(true);

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
    if (!file || !patientId) {
      setStatus({ message: 'Please provide a Patient ID and select a file.', type: 'error' });
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setStatus({ message: 'Error: File is too large (Max 6MB).', type: 'error' });
      return;
    }

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
            patientId: patientId,
            fileData: base64Data,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Upload failed with status: ${response.status}`);
        }

        setStatus({ message: 'Upload successful! Refreshing list...', type: 'success' });
        setFile(null);
        setPatientId('');
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

  const handleDelete = async (report) => {
    console.log("handleDelete called for report:", report);

    // --- THIS IS THE FIX ---
    // The window.confirm() line has been removed to prevent the sandbox error.
    // Deletion will now be immediate upon clicking.

    setStatus({ message: `Deleting report ${report.report_id}...`, type: 'info' });
    try {
      if (!DELETE_REPORT_API_URL.startsWith('https')) {
        throw new Error("Delete Report API URL is not configured.");
      }
      const payload = {
        patient_id: report.patient_id,
        report_id: report.report_id,
        s3Key: report.s3Url.split('.com/')[1]
      };

      console.log("Sending delete request with payload:", payload);

      const response = await fetch(DELETE_REPORT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Failed to delete with status: ${response.status}`);

      setStatus({ message: 'Report deleted successfully. Refreshing...', type: 'success' });
      setTimeout(fetchReports, 1000);
    } catch (error) {
      console.error('Delete Error:', error);
      setStatus({ message: `Failed to delete report: ${error.message}`, type: 'error' });
    }
  };

  // --- UI Rendering ---
  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Hospital Reports Dashboard</h1>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <section className="bg-white p-6 rounded-xl shadow-md">
              <h2 className="text-2xl font-semibold text-gray-700 mb-4">Upload New Report</h2>
              <form id="uploadForm" onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label htmlFor="patientId" className="block text-sm font-medium text-gray-600">Patient ID</label>
                  <input type="number" id="patientId" value={patientId} onChange={(e) => setPatientId(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
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

          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-700">Patient Reports</h2>
              <button onClick={fetchReports} disabled={isLoading} className="text-sm bg-gray-200 px-3 py-1 rounded-md hover:bg-gray-300 disabled:opacity-50">Refresh</button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr><td colSpan="4" className="text-center py-4">Loading reports...</td></tr>
                  ) : reports.length > 0 ? (
                    reports.map(report => (
                      <tr key={report.report_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{report.patient_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs">
                          <a href={report.s3Url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-900">{report.fileName}</a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(report.uploadTimestamp).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={() => handleDelete(report)} className="text-red-600 hover:text-red-900">Delete</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="4" className="text-center py-4">No reports found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
