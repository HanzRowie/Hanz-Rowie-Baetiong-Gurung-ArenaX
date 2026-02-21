/**
 * Payment Callback Page
 * Handles Khalti payment callback and communicates with parent window
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

const PaymentCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [message, setMessage] = useState('Processing payment...');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Get callback parameters from URL
      const pidx = searchParams.get('pidx');
      const txnId = searchParams.get('transaction_id');
      const amount = searchParams.get('amount');
      const callbackStatus = searchParams.get('status');
      const purchaseOrderId = searchParams.get('purchase_order_id');

      console.log('💳 Payment callback received:', {
        pidx,
        txnId,
        amount,
        status: callbackStatus,
        purchaseOrderId
      });

      // Check if payment was successful
      if (callbackStatus === 'Completed') {
        setStatus('success');
        setMessage('Payment completed successfully!');

        // If opened in popup, notify parent window
        if (window.opener) {
          console.log('💳 Notifying parent window of success');
          window.opener.postMessage({
            type: 'PAYMENT_SUCCESS',
            data: {
              pidx,
              txnId,
              amount,
              status: callbackStatus,
              purchaseOrderId
            }
          }, window.location.origin);

          // Close popup after 2 seconds
          setTimeout(() => {
            window.close();
          }, 2000);
        } else {
          // Not in popup, redirect to main app
          setTimeout(() => {
            navigate('/tournaments');
          }, 3000);
        }
      } else if (callbackStatus === 'User canceled') {
        setStatus('failed');
        setMessage('Payment was cancelled');

        if (window.opener) {
          window.opener.postMessage({
            type: 'PAYMENT_CANCELLED',
            data: { status: callbackStatus }
          }, window.location.origin);

          setTimeout(() => {
            window.close();
          }, 2000);
        } else {
          setTimeout(() => {
            navigate('/tournaments');
          }, 3000);
        }
      } else {
        setStatus('failed');
        setMessage('Payment failed. Please try again.');

        if (window.opener) {
          window.opener.postMessage({
            type: 'PAYMENT_FAILED',
            data: { status: callbackStatus }
          }, window.location.origin);

          setTimeout(() => {
            window.close();
          }, 2000);
        } else {
          setTimeout(() => {
            navigate('/tournaments');
          }, 3000);
        }
      }
    } catch (error) {
      console.error('💳 Error handling payment callback:', error);
      setStatus('failed');
      setMessage('Error processing payment callback');

      if (window.opener) {
        window.opener.postMessage({
          type: 'PAYMENT_ERROR',
          data: { error: String(error) }
        }, window.location.origin);

        setTimeout(() => {
          window.close();
        }, 2000);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <Loader className="w-16 h-16 text-purple-600 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Processing Payment</h1>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">
              {window.opener ? 'This window will close automatically...' : 'Redirecting to tournaments...'}
            </p>
          </>
        )}

        {status === 'failed' && (
          <>
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">
              {window.opener ? 'This window will close automatically...' : 'Redirecting to tournaments...'}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentCallbackPage;
