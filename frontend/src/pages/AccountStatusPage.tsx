import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface StatusInfo {
  title: string;
  message: string;
  icon: string;
  color: string;
  showLogout: boolean;
  showContactSupport: boolean;
}

const AccountStatusPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [statusInfo, setStatusInfo] = useState<StatusInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wait a bit for auth to load
    const timer = setTimeout(() => {
      if (!user) {
        navigate('/login');
        return;
      }

      console.log('AccountStatusPage - User:', user);
      console.log('AccountStatusPage - User approval_status:', user.approval_status);

      // Determine status info based on approval status
      let info: StatusInfo;
      
      // Default to PENDING if approval_status is not set (for safety)
      const status = user.approval_status || 'PENDING';
      
      if (status === 'PENDING') {
        info = {
          title: 'Account Pending Approval',
          message: 'Your account is currently under review by our administrators. You will receive an email notification once your account has been approved. This process typically takes 24-48 hours.',
          icon: '⏳',
          color: 'bg-yellow-500',
          showLogout: true,
          showContactSupport: false,
        };
      } else if (status === 'REJECTED') {
        info = {
          title: 'Account Not Approved',
          message: user.rejection_reason || 'Your account registration was not approved. Please contact our support team for more information about this decision.',
          icon: '❌',
          color: 'bg-red-500',
          showLogout: true,
          showContactSupport: true,
        };
      } else {
        // User is APPROVED - this page shouldn't be shown
        // But don't redirect to avoid loops
        info = {
          title: 'Account Approved',
          message: 'Your account has been approved! You can access the dashboard.',
          icon: '✅',
          color: 'bg-green-500',
          showLogout: true,
          showContactSupport: false,
        };
      }

      setStatusInfo(info);
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [user, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleContactSupport = () => {
    window.location.href = 'mailto:support@auraconnect.com?subject=Account Approval Inquiry';
  };

  if (isLoading || !statusInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <img 
            src="/images/Logo.jpg" 
            alt="ArenaX Logo" 
            className="h-10 w-10 object-contain rounded-lg mr-3"
          />
          <span className="text-2xl font-bold text-gray-900">ArenaX</span>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header with colored bar */}
          <div className={`${statusInfo.color} h-2`}></div>
          
          {/* Content */}
          <div className="p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className={`${statusInfo.color} bg-opacity-10 rounded-full p-6`}>
                <span className="text-6xl">{statusInfo.icon}</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-4">
              {statusInfo.title}
            </h1>

            {/* Message */}
            <p className="text-gray-600 text-center mb-8 leading-relaxed">
              {statusInfo.message}
            </p>

            {/* User Info */}
            {user && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Account:</span>
                  <span className="font-medium text-gray-900">{user.email}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-500">Role:</span>
                  <span className="font-medium text-gray-900 capitalize">
                    {user.role.toLowerCase().replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-500">Status:</span>
                  <span className={`font-medium capitalize ${
                    user.approval_status === 'PENDING' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {user.approval_status?.toLowerCase()}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              {statusInfo.showContactSupport && (
                <button
                  onClick={handleContactSupport}
                  className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Contact Support
                </button>
              )}
              
              {statusInfo.showLogout && (
                <button
                  onClick={handleLogout}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Need help?{' '}
            <a href="mailto:support@auraconnect.com" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccountStatusPage;
