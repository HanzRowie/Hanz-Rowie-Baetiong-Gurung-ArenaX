import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, AlertCircle, XCircle, CheckCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/utils/constants';

type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface ApprovalInfo {
  approval_status: ApprovalStatus;
  rejection_reason?: string;
}

export default function AccountPendingApprovalPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [approvalInfo, setApprovalInfo] = useState<ApprovalInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If user is not authenticated, redirect to login
    if (!user) {
      navigate(ROUTES.LOGIN);
      return;
    }

    // Simulate fetching approval status (in real implementation, this would be an API call)
    // For now, we'll use the user object if it has approval_status
    const fetchApprovalStatus = async () => {
      try {
        // In a real implementation, you would fetch from API:
        // const response = await api.get('/api/users/me/approval-status');
        // setApprovalInfo(response.data);
        
        // For now, use user data if available
        const status: ApprovalInfo = {
          approval_status: (user as any).approval_status || 'PENDING',
          rejection_reason: (user as any).rejection_reason,
        };
        
        setApprovalInfo(status);
        
        // If approved, redirect to dashboard
        if (status.approval_status === 'APPROVED') {
          navigate(ROUTES.DASHBOARD);
        }
      } catch (error) {
        console.error('Failed to fetch approval status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApprovalStatus();
  }, [user, navigate]);

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (approvalInfo?.approval_status) {
      case 'PENDING':
        return <Clock className="h-16 w-16 text-yellow-500" />;
      case 'REJECTED':
        return <XCircle className="h-16 w-16 text-red-500" />;
      case 'APPROVED':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      default:
        return <AlertCircle className="h-16 w-16 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (approvalInfo?.approval_status) {
      case 'PENDING':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'REJECTED':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'APPROVED':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getStatusTitle = () => {
    switch (approvalInfo?.approval_status) {
      case 'PENDING':
        return 'Account Pending Approval';
      case 'REJECTED':
        return 'Account Registration Not Approved';
      case 'APPROVED':
        return 'Account Approved';
      default:
        return 'Account Status Unknown';
    }
  };

  const getStatusMessage = () => {
    switch (approvalInfo?.approval_status) {
      case 'PENDING':
        return (
          <>
            <p className="mb-3">
              Your account is currently under review by our administrators. This process typically takes 24-48 hours.
            </p>
            <p className="mb-3">
              You will receive an email notification once your account has been reviewed. Please check your email regularly.
            </p>
            <p className="text-sm">
              Thank you for your patience!
            </p>
          </>
        );
      case 'REJECTED':
        return (
          <>
            <p className="mb-3">
              Unfortunately, your account registration was not approved by our administrators.
            </p>
            {approvalInfo.rejection_reason && (
              <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                <p className="font-semibold text-sm mb-1">Reason:</p>
                <p className="text-sm">{approvalInfo.rejection_reason}</p>
              </div>
            )}
            <p className="mt-4 text-sm">
              If you believe this is an error, please contact our support team.
            </p>
          </>
        );
      case 'APPROVED':
        return (
          <p>
            Your account has been approved! You can now access all features of the platform.
          </p>
        );
      default:
        return (
          <p>
            Unable to determine your account status. Please contact support for assistance.
          </p>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-8">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <img 
            src="/images/Logo.jpg" 
            alt="ArenaX Logo" 
            className="h-10 w-10 object-contain rounded-lg mr-3"
          />
          <span className="text-2xl font-bold text-gray-900">ArenaX</span>
        </div>

        {/* Status Icon */}
        <div className="flex justify-center mb-6">
          {getStatusIcon()}
        </div>

        {/* Status Card */}
        <div className={`p-6 border-2 rounded-xl mb-6 ${getStatusColor()}`}>
          <h1 className="text-2xl font-bold mb-4 text-center">
            {getStatusTitle()}
          </h1>
          <div className="text-center">
            {getStatusMessage()}
          </div>
        </div>

        {/* User Info */}
        {user && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Logged in as:</p>
            <p className="font-semibold text-gray-900">{user.full_name}</p>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {approvalInfo?.approval_status === 'APPROVED' && (
            <Link
              to={ROUTES.DASHBOARD}
              className="block w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all font-semibold text-center shadow-lg"
            >
              Go to Dashboard
            </Link>
          )}
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-all font-semibold"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Need help? Contact us at support@arenax.com</p>
        </div>
      </div>
    </div>
  );
}
