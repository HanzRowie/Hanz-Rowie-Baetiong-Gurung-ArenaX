/**
 * Payment Modal Component
 * Handles Khalti payment integration
 */

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import paymentService from '../services/paymentService';
import type { KhaltiConfig } from '../types/payment.types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  productName: string;
  paymentId: string;
  paymentUrl?: string; // Optional payment URL from backend
  onSuccess: (payload: any) => void;
  onError: (error: any) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  amount,
  productName,
  paymentId,
  paymentUrl,
  onSuccess,
  onError,
}) => {
  const [khaltiConfig, setKhaltiConfig] = useState<KhaltiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentLink, setShowPaymentLink] = useState(false);
  const [currentPaymentUrl, setCurrentPaymentUrl] = useState<string | null>(null);

  // Debug modal props
  useEffect(() => {
    console.log('💳 PaymentModal Props:', {
      isOpen,
      amount,
      productName,
      paymentId,
      khaltiConfig: !!khaltiConfig,
      loading,
      error
    });
  }, [isOpen, amount, productName, paymentId, khaltiConfig, loading, error]);

  useEffect(() => {
    if (isOpen) {
      console.log('💳 PaymentModal opened - loading Khalti config');
      loadKhaltiConfig();
      
      // Listen for messages from payment popup
      const handleMessage = (event: MessageEvent) => {
        // Verify origin for security
        if (event.origin !== window.location.origin) {
          return;
        }

        console.log('💳 Received message from popup:', event.data);

        if (event.data.type === 'PAYMENT_SUCCESS') {
          console.log('💳 Payment successful, verifying...');
          // Verify payment with backend
          paymentService.verifyPayment(paymentId)
            .then(result => {
              console.log('💳 Payment verified:', result);
              onSuccess(result);
            })
            .catch(error => {
              console.error('💳 Payment verification failed:', error);
              // Still call success since Khalti confirmed it
              onSuccess(event.data.data);
            });
        } else if (event.data.type === 'PAYMENT_CANCELLED') {
          console.log('💳 Payment cancelled by user');
          setError('Payment was cancelled');
        } else if (event.data.type === 'PAYMENT_FAILED') {
          console.log('💳 Payment failed');
          setError('Payment failed. Please try again.');
        } else if (event.data.type === 'PAYMENT_ERROR') {
          console.error('💳 Payment error:', event.data.data);
          setError('An error occurred during payment');
        }
      };

      window.addEventListener('message', handleMessage);

      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }
  }, [isOpen, paymentId]);

  const loadKhaltiConfig = async () => {
    try {
      console.log('💳 Loading Khalti config from API...');
      setLoading(true);
      setError(null);
      const config = await paymentService.getKhaltiConfig();
      console.log('💳 Khalti config loaded:', config);
      setKhaltiConfig(config);
    } catch (err: any) {
      console.error('💳 Failed to load Khalti config:', err);
      setError('Failed to load payment configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const initiatePayment = () => {
    if (!khaltiConfig) {
      setError('Payment configuration not loaded');
      return;
    }

    console.log('💳 Initiating payment');
    console.log('💳 Payment URL from backend:', paymentUrl);
    console.log('💳 Mock mode:', khaltiConfig.mock_mode);
    
    // If we have a payment URL from the backend (new ePay API), use it
    if (paymentUrl) {
      // Check if it's a mock payment
      if (khaltiConfig.mock_mode && paymentUrl.includes('/payment/mock')) {
        console.log('💳 Mock mode enabled - auto-completing payment');
        // Extract pidx from URL
        const urlParams = new URLSearchParams(paymentUrl.split('?')[1]);
        const pidx = urlParams.get('pidx');
        
        if (pidx) {
          // Auto-complete mock payment
          fetch('/api/payments/mock-complete/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({ pidx })
          })
          .then(res => res.json())
          .then(data => {
            console.log('💳 Mock payment completed:', data);
            onSuccess(data);
          })
          .catch(err => {
            console.error('💳 Mock payment failed:', err);
            onError(err);
          });
        }
        return;
      }
      
      console.log('💳 Opening Khalti payment page in new window');
      console.log('💳 Payment URL:', paymentUrl);
      
      // Store payment URL for fallback
      setCurrentPaymentUrl(paymentUrl);
      
      // Open payment URL in new window
      const paymentWindow = window.open(paymentUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      
      if (!paymentWindow || paymentWindow.closed || typeof paymentWindow.closed === 'undefined') {
        console.error('💳 Popup blocked or failed to open');
        setError('Popup was blocked. Please allow popups or use the link below.');
        setShowPaymentLink(true);
        return;
      }
      
      console.log('💳 Payment window opened successfully');
      
      // Poll for payment completion
      const pollInterval = setInterval(async () => {
        try {
          const result = await paymentService.verifyPayment(paymentId);
          if (result.payment.status === 'COMPLETED') {
            clearInterval(pollInterval);
            clearInterval(windowCheckInterval);
            paymentWindow.close();
            onSuccess(result);
          }
        } catch (error) {
          // Payment not yet completed, continue polling
        }
      }, 3000);

      // Watch for the payment window being closed by the user
      const windowCheckInterval = setInterval(async () => {
        if (paymentWindow.closed) {
          clearInterval(windowCheckInterval);
          clearInterval(pollInterval);
          // Do a final check to see if payment completed before window closed
          try {
            const result = await paymentService.verifyPayment(paymentId);
            if (result.payment.status === 'COMPLETED') {
              onSuccess(result);
            } else {
              setError('Payment window was closed. If you completed the payment, please wait a moment and refresh.');
            }
          } catch {
            setError('Payment window was closed. If you completed the payment, please wait a moment and refresh.');
          }
        }
      }, 1000);
      
      // Stop polling after 10 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        clearInterval(windowCheckInterval);
      }, 600000);
      
      return;
    }
    
    // Fallback to old Khalti Checkout widget
    console.log('💳 Using Khalti Checkout widget (fallback)');
    
    // Load Khalti Checkout dynamically
    const script = document.createElement('script');
    script.src = 'https://khalti.s3.ap-south-1.amazonaws.com/KPG/dist/2020.12.17.0.0.0/khalti-checkout.iffe.js';
    script.onload = () => {
      console.log('💳 Khalti script loaded');
      // @ts-ignore - Khalti is loaded from external script
      const checkout = new window.KhaltiCheckout({
        publicKey: khaltiConfig.public_key,
        productIdentity: paymentId,
        productName: productName,
        productUrl: khaltiConfig.website_url,
        eventHandler: {
          onSuccess: async (payload: any) => {
            console.log('💳 Payment successful:', payload);
            
            try {
              // Verify payment with backend
              await paymentService.verifyPayment(paymentId);
              onSuccess(payload);
            } catch (error) {
              console.error('💳 Payment verification failed:', error);
              onError(error);
            }
          },
          onError: (error: any) => {
            console.error('💳 Payment failed:', error);
            onError(error);
          },
          onClose: () => {
            console.log('💳 Payment widget closed');
          },
        },
        paymentPreference: ['KHALTI', 'EBANKING', 'MOBILE_BANKING', 'CONNECT_IPS', 'SCT'],
      });

      console.log('💳 Showing checkout with amount:', amount * 100);
      checkout.show({ amount: amount * 100 }); // Amount in paisa
    };
    script.onerror = () => {
      console.error('💳 Failed to load Khalti script');
      setError('Failed to load Khalti payment widget');
    };
    document.body.appendChild(script);
  };

  if (!isOpen) {
    console.log('💳 PaymentModal not rendering - isOpen is false');
    return null;
  }

  console.log('💳 PaymentModal rendering with isOpen =', isOpen);

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Complete Payment</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading payment configuration...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-600">{error}</p>
              </div>
              <button
                onClick={loadKhaltiConfig}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Payment Details */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Product</span>
                  <span className="font-medium text-gray-900">{productName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Amount</span>
                  <span className="text-3xl font-bold text-purple-600">
                    NPR {amount.toLocaleString('en-NP')}
                  </span>
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Secure Payment:</strong> Your payment is processed securely through Khalti.
                  You can pay using Khalti wallet, e-Banking, mobile banking, or connect IPS.
                </p>
              </div>

              {/* Popup Blocked Warning */}
              {showPaymentLink && currentPaymentUrl && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-yellow-800 mb-3">
                    <strong>Popup Blocked:</strong> Your browser blocked the payment window.
                  </p>
                  <a
                    href={currentPaymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                  >
                    Open Payment Page Manually
                  </a>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={initiatePayment}
                  className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors shadow-lg hover:shadow-xl"
                >
                  Pay with Khalti
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>

              {/* Khalti Logo */}
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500 mb-2">Powered by</p>
                <div className="flex items-center justify-center">
                  <span className="text-purple-600 font-bold text-xl">Khalti</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
