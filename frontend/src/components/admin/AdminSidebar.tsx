import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, LogOut, User, Trophy, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LogoutDialog } from '@/components/ConfirmDialog';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onCollapseChange?: (collapsed: boolean) => void;
}

/**
 * AdminSidebar component provides navigation for admin pages.
 * Displays navigation menu and user profile section with responsive design.
 * 
 * Requirements: 8.2, 8.9
 * Mobile responsive: Slides in from left on mobile, fixed on desktop
 */
export default function AdminSidebar({ isOpen = false, onClose, onCollapseChange }: AdminSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = React.useState(false);

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      path: '/admin',
      active: location.pathname === '/admin' || location.pathname === '/admin/dashboard',
    },
    {
      id: 'users',
      label: 'User Management',
      icon: Users,
      path: '/admin/users',
      active: location.pathname.startsWith('/admin/users'),
    },

    {
      id: 'tournaments',
      label: 'Tournaments',
      icon: Trophy,
      path: '/admin/tournaments',
      active: location.pathname === '/admin/tournaments',
    },
    {
      id: 'venues',
      label: 'Venues',
      icon: MapPin,
      path: '/admin/venues',
      active: location.pathname === '/admin/venues',
    },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    // Close sidebar on mobile after navigation
    if (onClose) {
      onClose();
    }
  };

  const handleLogout = () => setShowLogoutDialog(true);

  const toggleCollapse = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    if (onCollapseChange) {
      onCollapseChange(newCollapsedState);
    }
  };

  return (
    <><aside
      className={`fixed top-0 left-0 h-screen bg-white border-r border-gray-200 z-50 shadow-sm transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'} ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header - Hidden on mobile (shown in AdminLayout mobile header) */}
        <div className="hidden lg:flex items-center justify-between p-6 border-b border-gray-100">
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-3">
                <img
                  src="/images/Logo.jpg"
                  alt="ArenaX Logo"
                  className="w-10 h-10 object-contain rounded-lg flex-shrink-0" />
                <div>
                  <span className="text-xl font-bold text-gray-900">ArenaX</span>
                  <p className="text-xs text-gray-500">Admin Panel</p>
                </div>
              </div>
              <button
                onClick={toggleCollapse}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Collapse sidebar"
              >
                <svg
                  className="h-5 w-5 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            </>
          ) : (
            <button
              onClick={toggleCollapse}
              className="w-full flex flex-col items-center gap-2"
              title="Expand sidebar"
            >
              <img
                src="/images/Logo.jpg"
                alt="ArenaX Logo"
                className="w-10 h-10 object-contain rounded-lg" />
              <svg
                className="h-5 w-5 text-gray-600 rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Mobile Header Spacer */}
        <div className="lg:hidden h-4" />

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${item.active
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'} ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.label : ''}
              >
                <IconComponent
                  className={`h-5 w-5 ${item.active ? 'text-white' : 'text-gray-500'} ${isCollapsed ? 'flex-shrink-0' : ''}`} />
                {!isCollapsed && (
                  <span
                    className={`font-medium ${item.active ? 'text-white' : 'text-gray-700'}`}
                  >
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-gray-100">
          {/* User Info */}
          {!isCollapsed ? (
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              {user?.profile_picture ? (
                <img
                  src={user.profile_picture}
                  alt={user.full_name}
                  className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.full_name}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center mb-2">
              {user?.profile_picture ? (
                <img
                  src={user.profile_picture}
                  alt={user.full_name}
                  className="h-10 w-10 rounded-full object-cover"
                  title={user.full_name} />
              ) : (
                <div
                  className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center"
                  title={user?.full_name}
                >
                  <User className="h-5 w-5 text-purple-600" />
                </div>
              )}
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? 'Logout' : ''}
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span className="font-medium">Logout</span>}
          </button>

          {/* Footer */}
          {!isCollapsed && (
            <div className="text-xs text-gray-500 text-center mt-4">
              © 2025 ArenaX Admin
            </div>
          )}
        </div>
      </div>
    </aside><LogoutDialog
        open={showLogoutDialog}
        onConfirm={() => { setShowLogoutDialog(false); logout(); } }
        onCancel={() => setShowLogoutDialog(false)} /></>
  );
}
