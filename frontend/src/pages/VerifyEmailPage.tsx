import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '@/services/api';
import { ROUTES, API_ENDPOINTS } from '@/utils/constants';

export default function VerifyEmailPage() {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await api.post(API_ENDPOINTS.AUTH.VERIFY_EMAIL, { email, otp });
      setSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate(ROUTES.LOGIN);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setResending(true);

    try {
      const response = await api.post(API_ENDPOINTS.AUTH.RESEND_VERIFICATION, { email });
      // Dev OTP: response.data.otp
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No email provided for verification.</p>
          <Link to={ROUTES.REGISTER} className="text-purple-600 hover:text-purple-700 font-semibold">
            Go to Registration
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <img 
            src="/images/Logo.jpg" 
            alt="ArenaX Logo" 
            className="h-10 w-10 object-contain rounded-lg mr-3"
          />
          <span className="text-2xl font-bold text-gray-900">ArenaX</span>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Verify Your Email
          </h1>
          <p className="text-gray-600">
            We've sent a 6-digit code to
          </p>
          <p className="text-purple-600 font-semibold">{email}</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700">
              <CheckCircle className="h-6 w-6" />
              <div>
                <p className="font-semibold">Email verified successfully!</p>
              </div>
            </div>
            
            {/* Approval Workflow Message */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Awaiting Admin Approval</h3>
              <div className="text-sm text-blue-800 space-y-2">
                <p>
                  Your account is currently pending administrator review. This process typically takes 24-48 hours.
                </p>
                <p>
                  You will receive an email notification once your account has been approved. Please check your email regularly.
                </p>
                <p className="text-xs text-blue-700 mt-3">
                  Redirecting to login...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* OTP Form */}
        {!success && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                className="w-full px-4 py-3 text-center text-2xl font-bold tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                maxLength={6}
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all font-semibold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>
        )}

        {/* Resend OTP */}
        {!success && (
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm mb-2">Didn't receive the code?</p>
            <button
              onClick={handleResendOTP}
              disabled={resending}
              className="text-purple-600 hover:text-purple-700 font-semibold text-sm disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Resend Code'}
            </button>
          </div>
        )}

        {/* Back to Login */}
        <div className="mt-8 text-center">
          <Link to={ROUTES.LOGIN} className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
