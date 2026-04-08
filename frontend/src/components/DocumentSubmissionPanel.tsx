import { useState, useEffect } from 'react';
import { Upload, CheckCircle, FileText, AlertCircle, X } from 'lucide-react';
import api from '@/services/api';
import toastService from '@/services/toastService';

interface DocumentSubmissionPanelProps {
  resourceType: 'tournament' | 'venue';
  resourceId: string;
  onDocumentsSubmitted?: () => void;
}

interface DocStatus {
  approval_status: string;
  requested_documents: string[];
  verification_documents: Record<string, { file_url: string; file_name: string; uploaded_at: string }>;
  rejection_reason: string;
  approval_notes: string;
}

export default function DocumentSubmissionPanel({
  resourceType,
  resourceId,
  onDocumentsSubmitted,
}: DocumentSubmissionPanelProps) {
  const [docStatus, setDocStatus] = useState<DocStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});

  const statusUrl =
    resourceType === 'venue'
      ? `/api/venues/venues/${resourceId}/document-status/`
      : `/api/tournaments/${resourceId}/document-status/`;

  const uploadUrl =
    resourceType === 'venue'
      ? `/api/venues/venues/${resourceId}/upload-documents/`
      : `/api/tournaments/${resourceId}/upload-documents/`;

  useEffect(() => {
    fetchStatus();
  }, [resourceId]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get(statusUrl);
      setDocStatus(res.data);
    } catch {
      // not conditional approval or error — don't show panel
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (docType: string, file: File | null) => {
    if (!file) {
      const updated = { ...selectedFiles };
      delete updated[docType];
      setSelectedFiles(updated);
    } else {
      setSelectedFiles(prev => ({ ...prev, [docType]: file }));
    }
  };

  const handleUpload = async () => {
    if (Object.keys(selectedFiles).length === 0) {
      toastService.error('Please select at least one file to upload.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      Object.entries(selectedFiles).forEach(([docType, file]) => {
        // Use docType as both field name and type label
        const safeKey = docType.replace(/\s+/g, '_');
        formData.append(safeKey, file);
        formData.append(`${safeKey}_type`, docType);
      });

      await api.post(uploadUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toastService.success('Documents submitted. Admins have been notified.');
      setSelectedFiles({});
      await fetchStatus();
      onDocumentsSubmitted?.();
    } catch (err: any) {
      toastService.error(err.response?.data?.error || 'Failed to upload documents.');
    } finally {
      setUploading(false);
    }
  };

  if (loading || !docStatus) return null;
  if (docStatus.approval_status !== 'CONDITIONAL_APPROVAL') return null;

  const { requested_documents, verification_documents } = docStatus;
  const submittedKeys = Object.keys(verification_documents);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-semibold text-blue-900">Additional Documents Required</h3>
          <p className="text-sm text-blue-700 mt-1">
            An admin has requested the following documents before your{' '}
            {resourceType} can be approved. Please upload them below.
          </p>
        </div>
      </div>

      {/* Requested documents list with upload inputs */}
      <div className="space-y-3">
        {requested_documents.map((docType) => {
          const submitted = verification_documents[docType];
          const safeKey = docType.replace(/\s+/g, '_');
          const selectedFile = selectedFiles[docType];

          return (
            <div key={docType} className="bg-white rounded-lg border border-blue-100 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-800">{docType}</span>
                </div>
                {submitted ? (
                  <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                    <CheckCircle className="h-3 w-3" />
                    Submitted
                  </span>
                ) : (
                  <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
                    Pending
                  </span>
                )}
              </div>

              {submitted && (
                <p className="text-xs text-gray-500 mb-2">
                  {submitted.file_name} — uploaded {new Date(submitted.uploaded_at).toLocaleDateString()}
                </p>
              )}

              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => handleFileSelect(docType, e.target.files?.[0] ?? null)}
                  />
                  <div className="flex items-center gap-2 px-3 py-1.5 border border-dashed border-blue-300 rounded-lg text-xs text-blue-600 hover:bg-blue-50 transition-colors">
                    <Upload className="h-3 w-3" />
                    {selectedFile ? selectedFile.name : submitted ? 'Replace file' : 'Choose file'}
                  </div>
                </label>
                {selectedFile && (
                  <button
                    onClick={() => handleFileSelect(docType, null)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Already submitted docs not in requested list */}
      {submittedKeys.filter(k => !requested_documents.includes(k)).length > 0 && (
        <div className="text-xs text-gray-500">
          Additional submitted: {submittedKeys.filter(k => !requested_documents.includes(k)).join(', ')}
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={uploading || Object.keys(selectedFiles).length === 0}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Submit Documents
          </>
        )}
      </button>
    </div>
  );
}
