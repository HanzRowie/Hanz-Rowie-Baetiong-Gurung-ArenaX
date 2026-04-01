import { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';

type Variant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
  /** Optional text input — if provided, shows an input and passes the value to onConfirm */
  inputLabel?: string;
  inputPlaceholder?: string;
  onConfirm: (inputValue?: string) => void;
  onCancel: () => void;
}

const icons: Record<Variant, React.ReactNode> = {
  danger: <Trash2 className="h-6 w-6 text-red-500" />,
  warning: <AlertTriangle className="h-6 w-6 text-purple-500" />,
  info: <Info className="h-6 w-6 text-purple-500" />,
};

const confirmColors: Record<Variant, string> = {
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  warning: 'bg-purple-600 hover:bg-purple-700 text-white',
  info: 'bg-purple-600 hover:bg-purple-700 text-white',
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
  inputLabel,
  inputPlaceholder,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 p-2 rounded-full bg-purple-50">
            {icons[variant]}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-500">{message}</p>
          </div>
        </div>

        {inputLabel && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">{inputLabel}</label>
            <textarea
              ref={inputRef}
              placeholder={inputPlaceholder}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
            />
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => onConfirm(inputRef.current?.value)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${confirmColors[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Specialised logout dialog */
export function LogoutDialog({ open, onConfirm, onCancel }: { open: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <ConfirmDialog
      open={open}
      title="Log out"
      message="Are you sure you want to log out of your account?"
      confirmLabel="Log out"
      cancelLabel="Stay"
      variant="warning"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

/** Specialised team-players info dialog (replaces alert) */
export function TeamPlayersDialog({
  open,
  teamName,
  players,
  onClose,
}: {
  open: boolean;
  teamName: string;
  players: { full_name: string }[];
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
          <X className="h-4 w-4" />
        </button>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{teamName}</h3>
        <p className="text-sm text-gray-500 mb-4">Selected players</p>
        <ul className="space-y-2">
          {players.map((p, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
              {p.full_name}
            </li>
          ))}
        </ul>
        <button onClick={onClose} className="mt-5 w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors">
          Close
        </button>
      </div>
    </div>
  );
}
