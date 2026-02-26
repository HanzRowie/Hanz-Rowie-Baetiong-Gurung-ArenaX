import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  MessageCircle, Search, Settings, User, Menu
} from 'lucide-react';
import { UserRole } from '@/types/auth.types';
import Sidebar from './Sidebar';
import BottomNavigation from './BottomNavigation';
import { NotificationBell } from './NotificationBell';

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Handle sidebar toggle with body scroll prevention
  const toggleSidebar = (open: boolean) => {
    setSidebarOpen(open);
    // Prevent body scroll on mobile when sidebar is open
    if (window.innerWidth < 1024) {
      document.body.style.overflow = open ? 'hidden' : '';
    }
  };

  // Handle window resize to restore body scroll on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        document.body.style.overflow = '';
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get page title from location
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path.startsWith('/tournaments')) return 'Tournaments';
    if (path === '/players') return 'Find Players';
    if (path === '/chats') return 'Chats';
    if (path.startsWith('/profile')) return 'Profile';
    if (path.startsWith('/venues')) return 'Venues';
    if (path.startsWith('/bookings')) return 'Bookings';
    return 'ArenaX';
  };

  // Get header actions based on user role
  const getHeaderActions = () => {
    if (user?.role === UserRole.VENUE_OWNER) {
      return (
        <>
          {/* Settings Icon */}
          <button 
            onClick={() => navigate('/profile')}
            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </>
      );
    }

    if (user?.role === UserRole.REFEREE) {
      return (
        <>
          {/* Settings Icon */}
          <button 
            onClick={() => navigate('/profile')}
            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </>
      );
    }

    if (user?.role === UserRole.ORGANIZER) {
      return (
        <>
          {/* Settings Icon */}
          <button 
            onClick={() => navigate('/profile')}
            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </>
      );
    }

    // Player role - includes chat and search
    if (user?.role === UserRole.PLAYER) {
      return (
        <>
          {/* Chat Icon */}
          <button 
            onClick={() => navigate('/chats')}
            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Chats"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
          
          {/* Search Icon */}
          <button 
            onClick={() => navigate('/player-finder')}
            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Find Players"
          >
            <Search className="h-5 w-5" />
          </button>
          
          {/* Settings Icon */}
          <button 
            onClick={() => navigate('/profile')}
            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </>
      );
    }

    // Default fallback - minimal actions
    return (
      <>
        {/* Settings Icon */}
        <button 
          onClick={() => navigate('/profile')}
          className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </>
    );
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex ${sidebarOpen ? 'overflow-hidden lg:overflow-auto' : ''}`}>
      {/* Sidebar - Always visible on desktop, overlay on mobile */}
      <Sidebar isOpen={sidebarOpen} onClose={() => toggleSidebar(false)} />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col lg:ml-64 relative ${sidebarOpen ? 'pointer-events-none lg:pointer-events-auto' : ''}`}>
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-40 border-b border-gray-100">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              {/* Left side - Menu and Page title */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => toggleSidebar(!sidebarOpen)}
                  className="lg:hidden p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">{getPageTitle()}</h1>
              </div>
              
              {/* Right side - Actions and Profile - Hidden on mobile since we have bottom nav */}
              <div className="hidden md:flex items-center space-x-2">
                {getHeaderActions()}
                
                {/* Notifications - Available for all roles */}
                <NotificationBell />
                
                {/* Profile */}
                <button
                  onClick={() => navigate('/profile')}
                  className="flex items-center gap-2 hover:bg-gray-50 rounded-lg p-1 transition-colors"
                  title="Profile"
                >
                  {user?.profile_picture ? (
                    <img
                      src={user.profile_picture}
                      alt={user.full_name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-purple-600" />
                    </div>
                  )}
                </button>
                
                {/* Logout */}
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to logout?')) {
                      logout();
                    }
                  }}
                  className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                >
                  Logout
                </button>
              </div>

              {/* Mobile-only notifications and profile */}
              <div className="md:hidden flex items-center space-x-2">
                {/* Notifications */}
                <NotificationBell />
                
                {/* Profile */}
                <button
                  onClick={() => navigate('/profile')}
                  className="flex items-center gap-2 hover:bg-gray-50 rounded-lg p-1 transition-colors"
                  title="Profile"
                >
                  {user?.profile_picture ? (
                    <img
                      src={user.profile_picture}
                      alt={user.full_name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-purple-600" />
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className={`flex-1 overflow-y-auto relative z-10 ${sidebarOpen ? 'pointer-events-none lg:pointer-events-auto' : 'pointer-events-auto'}`}>
          <div className="px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-20 md:pb-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom Navigation - Only visible on mobile and tablet */}
      <div className="md:hidden">
        <BottomNavigation />
      </div>
    </div>
  );
}

