import { Upload, X, FileText } from 'lucide-react';
import type { ChangeEvent } from 'react';

interface FileUploadProps {
  id: string;
  label: string;
  required?: boolean;
  helpText?: string;
  accept?: string;
  file: File | null;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  disabled?: boolean;
}

export default function FileUpload({
  id,
  label,
  required = false,
  helpText,
  accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png',
  file,
  onChange,
  onRemove,
  disabled = false,
}: FileUploadProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
        {helpText && <span className="text-xs text-gray-500 ml-2">({helpText})</span>}
      </label>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-purple-400 transition-colors">
        <input
          type="file"
          id={id}
          accept={accept}
          onChange={onChange}
          className="hidden"
          disabled={disabled}
        />
        <label
          htmlFor={id}
          className="flex flex-col items-center justify-center cursor-pointer"
        >
          <Upload className="h-8 w-8 text-gray-400 mb-2" />
          <span className="text-sm text-gray-600">
            {file ? file.name : `Click to upload ${label.toLowerCase()}`}
          </span>
          <span className="text-xs text-gray-500 mt-1">
            PDF, DOC, or Image files
          </span>
        </label>
      </div>
      {file && (
        <div className="mt-2 flex items-center justify-between bg-purple-50 p-2 rounded-lg">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-purple-600" />
            <span className="text-sm text-gray-700">{file.name}</span>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700"
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
