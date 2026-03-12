import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/auth.types';
import AdminSidebar from './AdminSidebar';
import BottomNav from './BottomNav';

/**
 * AdminLayout component provides the layout structure for admin pages.
 * Implements role-based access control to ensure only ADMIN users can access.
 * 
 * Requirements: 8.1, 8.9, 17.6, 17.7
 * Mobile responsive: Works on screens down to 320px width
 */
export default function AdminLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  // Role-based access control - redirect non-admins
  useEffect(() => {
    if (user && user.role !== UserRole.ADMIN) {
      // Redirect to dashboard if user is not an admin
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Don't render anything if user is not an admin
  if (!user || user.role !== UserRole.ADMIN) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex">
      {/* Mobile Header - Only visible on mobile */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <img 
            src="/images/Logo.jpg" 
            alt="ArenaX Logo" 
            className="w-8 h-8 object-contain rounded-lg flex-shrink-0"
          />
          <div>
            <span className="text-lg font-bold text-gray-900">ArenaX</span>
            <p className="text-xs text-gray-500">Admin</p>
          </div>
        </div>
      </div>

      {/* Admin Sidebar - Always visible on desktop, no mobile toggle */}
      <AdminSidebar
        isOpen={false}
        onClose={() => {}}
        onCollapseChange={setIsSidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col pt-16 lg:pt-0 transition-all duration-300 ${
        isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
      }`}>
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <BottomNav />
    </div>
  );
}
