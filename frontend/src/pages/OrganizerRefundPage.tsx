import React, { useState, useEffect, useCallback } from 'react';
import paymentService from '../services/paymentService';
import type { Refund, InitiateRefundRequest } from '../types/payment.types';

type RefundStatus = Refund['status'] | 'ALL';

const STATUS_OPTIONS: { label: string; value: RefundStatus }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PROCESSING: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  };
  return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[s] ?? 'bg-gray-100 text-gray-800'}`;
};

// ── Initiate Refund Modal ────────────────────────────────────────────────────
interface InitiateModalProps {
  readonly onClose: () => void;
  readonly onSuccess: () => void;
}

function InitiateRefundModal({ onClose, onSuccess }: InitiateModalProps) {
  const [form, setForm] = useState<InitiateRefundRequest>({
    payment_id: '',
    reason: '',
    amount: '',
    registration_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload: InitiateRefundRequest = {
        payment_id: form.payment_id.trim(),
        reason: form.reason.trim(),
      };
      if (form.amount) payload.amount = form.amount;
      if (form.registration_id) payload.registration_id = form.registration_id.trim();

      await paymentService.initiateRefund(payload);
      onSuccess();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data && typeof data === 'object') {
        const msgs = Object.values(data).flat().join(' ');
        setError(msgs);
      } else {
        setError('Failed to initiate refund. Please check the payment ID and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/20 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Initiate Refund</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="payment-id" className="block text-sm font-medium text-gray-700 mb-1">
              Payment ID <span className="text-red-500">*</span>
            </label>
            <input
              id="payment-id"
              type="text"
              required
              placeholder="UUID of the completed payment"
              value={form.payment_id}
              onChange={e => setForm(f => ({ ...f, payment_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="refund-amount" className="block text-sm font-medium text-gray-700 mb-1">
              Refund Amount (leave blank for full refund)
            </label>
            <input
              id="refund-amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g. 500.00"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="refund-reason" className="block text-sm font-medium text-gray-700 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="refund-reason"
              required
              rows={3}
              placeholder="Reason for the refund..."
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div>
            <label htmlFor="registration-id" className="block text-sm font-medium text-gray-700 mb-1">
              Registration ID (optional)
            </label>
            <input
              id="registration-id"
              type="text"
              placeholder="UUID of the tournament registration"
              value={form.registration_id}
              onChange={e => setForm(f => ({ ...f, registration_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Initiating…' : 'Initiate Refund'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Complete Refund Modal ────────────────────────────────────────────────────
interface CompleteModalProps {
  readonly refund: Refund;
  readonly onClose: () => void;
  readonly onSuccess: () => void;
}

function CompleteRefundModal({ refund, onClose, onSuccess }: CompleteModalProps) {
  const [txnId, setTxnId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await paymentService.completeRefund(refund.id, { refund_transaction_id: txnId });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to complete refund.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/20 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Mark Refund as Completed</h2>
        <p className="text-sm text-gray-500 mb-4">
          Confirm you have transferred{' '}
          <span className="font-medium text-gray-800">
            {refund.original_payment_details?.currency ?? 'NPR'} {Number.parseFloat(refund.amount).toLocaleString()}
          </span>{' '}
          to <span className="font-medium text-gray-800">{refund.player_name}</span>.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="txn-id" className="block text-sm font-medium text-gray-700 mb-1">
              Transaction / Reference ID (optional)
            </label>
            <input
              id="txn-id"
              type="text"
              placeholder="e.g. bank transfer ref"
              value={txnId}
              onChange={e => setTxnId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Confirm Complete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function OrganizerRefundPage() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<RefundStatus>('ALL');
  const [showInitiate, setShowInitiate] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<Refund | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'ALL' ? { status: statusFilter } : undefined;
      const data = await paymentService.getOrganizerRefunds(params);
      setRefunds(data);
    } catch {
      showToast('Failed to load refunds.', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchRefunds(); }, [fetchRefunds]);

  const handleCancel = async (refund: Refund) => {
    // eslint-disable-next-line no-alert
    const confirmed = globalThis.confirm('Cancel this refund? The original payment will be restored to COMPLETED.');
    if (!confirmed) return;
    setActionLoading(refund.id);
    try {
      await paymentService.cancelRefund(refund.id);
      showToast('Refund cancelled.');
      fetchRefunds();
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to cancel refund.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      {showInitiate && (
        <InitiateRefundModal
          onClose={() => setShowInitiate(false)}
          onSuccess={() => { setShowInitiate(false); showToast('Refund initiated.'); fetchRefunds(); }}
        />
      )}
      {completeTarget && (
        <CompleteRefundModal
          refund={completeTarget}
          onClose={() => setCompleteTarget(null)}
          onSuccess={() => { setCompleteTarget(null); showToast('Refund marked as completed.'); fetchRefunds(); }}
        />
      )}

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Refund Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage refunds for your tournament registrations</p>
          </div>
          <button
            onClick={() => setShowInitiate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <span>+</span> Initiate Refund
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                statusFilter === opt.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
              Loading refunds…
            </div>
          )}
          {!loading && refunds.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <svg className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 14l-4-4m0 0l4-4m-4 4h16M15 10l4 4m0 0l-4 4" />
              </svg>
              <p className="text-sm">No refunds found</p>
            </div>
          )}
          {!loading && refunds.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Player', 'Tournament', 'Amount', 'Reason', 'Status', 'Requested', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {refunds.map(refund => (
                    <tr key={refund.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {refund.player_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px] truncate">
                        {refund.original_payment_details?.tournament
                          ? <span title={String(refund.original_payment_details.tournament)}>
                              {String(refund.original_payment_details.tournament).slice(0, 8)}…
                            </span>
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {refund.original_payment_details?.currency ?? 'NPR'}{' '}
                        {Number.parseFloat(refund.amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px]">
                        <span className="line-clamp-2" title={refund.reason}>{refund.reason}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={statusBadge(refund.status)}>{refund.status}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {new Date(refund.requested_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {refund.status === 'PENDING' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setCompleteTarget(refund)}
                              disabled={actionLoading === refund.id}
                              className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => handleCancel(refund)}
                              disabled={actionLoading === refund.id}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                        {refund.status === 'COMPLETED' && refund.processed_at && (
                          <span className="text-xs text-gray-400">
                            {new Date(refund.processed_at).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        {!loading && refunds.length > 0 && (
          <div className="mt-4 flex gap-4 text-sm text-gray-500">
            <span>Total: {refunds.length}</span>
            <span>Pending: {refunds.filter(r => r.status === 'PENDING').length}</span>
            <span>Completed: {refunds.filter(r => r.status === 'COMPLETED').length}</span>
          </div>
        )}
      </div>
    </div>
  );
}
