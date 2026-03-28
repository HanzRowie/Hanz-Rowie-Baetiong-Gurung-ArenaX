import React, { useState, useEffect } from 'react';
import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { api } from '../services/api';
import { DollarSign, Calendar, CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';

interface PaymentRecord {
  id: string;
  referee: string;
  referee_name: string;
  tournament: string | null;
  tournament_title: string | null;
  match: string | null;
  match_details: {
    id: string;
    round_number: number;
    match_number: number;
    scheduled_time: string | null;
  } | null;
  amount: string;
  currency: string;
  payment_status: string;
  description: string;
  notes: string;
  created_at: string;
  paid_at: string | null;
}

interface PaymentSummary {
  summary: {
    total_earned: number;
    pending_amount: number;
    held_in_escrow: number;
    total_payments: number;
  };
  by_status: {
    [key: string]: {
      count: number;
      amount: number;
      label: string;
    };
  };
  recent_payments: PaymentRecord[];
}

const RefereePaymentsPage: React.FC = () => {
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [allPayments, setAllPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch payment summary
      const summaryResponse = await api.get('/api/referees/payment-summary/');
      setPaymentSummary(summaryResponse.data);
      
      // Fetch all payment records
      const paymentsResponse = await api.get('/api/referees/payment-records/');
      const paymentsData = paymentsResponse.data.results || paymentsResponse.data;
      setAllPayments(Array.isArray(paymentsData) ? paymentsData : []);
    } catch (err: any) {
      console.error('Fetch payment data error:', err);
      setError(err.response?.data?.error || 'Failed to fetch payment data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'HELD_IN_ESCROW':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PROCESSING':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'FAILED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle className="w-4 h-4" />;
      case 'PENDING':
        return <Clock className="w-4 h-4" />;
      case 'HELD_IN_ESCROW':
        return <DollarSign className="w-4 h-4" />;
      case 'FAILED':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const filteredPayments = filterStatus === 'ALL' 
    ? allPayments 
    : allPayments.filter(p => p.payment_status === filterStatus);

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!paymentSummary) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No payment data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Tracking</h1>
          <p className="text-gray-600 mt-1">
            Track your earnings and payment status
          </p>
        </div>
        <Button 
          onClick={fetchPaymentData}
          variant="secondary"
          className="flex items-center space-x-2"
        >
          <TrendingUp className="w-4 h-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Total Earned</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                NPR {paymentSummary.summary.total_earned.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-green-200 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-700" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Held in Escrow</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                NPR {paymentSummary.summary.held_in_escrow.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-blue-200 rounded-full">
              <DollarSign className="w-6 h-6 text-blue-700" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">Pending</p>
              <p className="text-2xl font-bold text-yellow-900 mt-1">
                NPR {paymentSummary.summary.pending_amount.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-yellow-200 rounded-full">
              <Clock className="w-6 h-6 text-yellow-700" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Total Payments</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                {paymentSummary.summary.total_payments}
              </p>
            </div>
            <div className="p-3 bg-purple-200 rounded-full">
              <TrendingUp className="w-6 h-6 text-purple-700" />
            </div>
          </div>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Status Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(paymentSummary.by_status).map(([status, data]) => (
            <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">{data.label}</p>
              <p className="text-lg font-bold text-gray-900">{data.count}</p>
              <p className="text-sm text-gray-600 mt-1">
                NPR {data.amount.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Payment Records */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Payment Records</h2>
          <div className="flex space-x-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="ALL">All Status</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="HELD_IN_ESCROW">Held in Escrow</option>
              <option value="PROCESSING">Processing</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No payment records found</p>
            <p className="text-sm text-gray-500">
              {filterStatus !== 'ALL' ? 'Try changing the filter' : 'Payment records will appear here once created'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPayments.map((payment) => (
              <div
                key={payment.id}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {payment.tournament_title || 'Payment Record'}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full border flex items-center space-x-1 ${getStatusColor(payment.payment_status)}`}>
                        {getStatusIcon(payment.payment_status)}
                        <span>{payment.payment_status.replace(/_/g, ' ')}</span>
                      </span>
                    </div>
                    
                    {payment.description && (
                      <p className="text-sm text-gray-600 mb-2">{payment.description}</p>
                    )}
                    
                    {payment.match_details && (
                      <p className="text-sm text-gray-500">
                        Round {payment.match_details.round_number}, Match {payment.match_details.match_number}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(payment.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      {payment.paid_at && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span>
                            Paid on {new Date(payment.paid_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {payment.amount}
                    </p>
                    <p className="text-sm text-gray-500">{payment.currency}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default RefereePaymentsPage;
