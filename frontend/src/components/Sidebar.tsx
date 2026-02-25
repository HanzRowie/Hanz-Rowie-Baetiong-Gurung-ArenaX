import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Trophy, Search, MessageCircle, User, X, Users, Building2, Calendar, Gavel, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/auth.types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const getNavItems = () => {
    const commonItems = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: Home,
        path: '/dashboard',
        active: location.pathname === '/dashboard',
      },
      {
        id: 'profile',
        label: 'Profile',
        icon: User,
        path: '/profile',
        active: location.pathname === '/profile',
      },
    ];

    if (user?.role === UserRole.VENUE_OWNER) {
      return [
        commonItems[0], // Dashboard
        {
          id: 'venues',
          label: 'Venues',
          icon: Building2,
          path: '/venue-management',
          active: location.pathname.startsWith('/venue-management'),
        },
        {
          id: 'bookings',
          label: 'Bookings',
          icon: Calendar,
          path: '/venue-bookings',
          active: location.pathname.startsWith('/venue-bookings'),
        },
        {
          id: 'chats',
          label: 'My Chats',
          icon: MessageCircle,
          path: '/chats',
          active: location.pathname === '/chats',
        },
        commonItems[1], // Profile
      ];
    }

    if (user?.role === UserRole.REFEREE) {
      return [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: Home,
          path: '/referee/dashboard',
          active: location.pathname === '/referee/dashboard' || location.pathname === '/dashboard',
        },
        {
          id: 'management',
          label: 'Assignments',
          icon: Gavel,
          path: '/referee/management',
          active: location.pathname.startsWith('/referee/management') || location.pathname.startsWith('/referee/bookings'),
        },
        {
          id: 'availability',
          label: 'Availability',
          icon: Calendar,
          path: '/referee/availability',
          active: location.pathname.startsWith('/referee/availability'),
        },
        {
          id: 'chats',
          label: 'My Chats',
          icon: MessageCircle,
          path: '/chats',
          active: location.pathname === '/chats',
        },
        commonItems[1], // Profile
      ];
    }

    // Navigation for ORGANIZER role
    if (user?.role === UserRole.ORGANIZER) {
      return [
        commonItems[0], // Dashboard
        {
          id: 'my-tournaments',
          label: 'My Tournaments',
          icon: Trophy,
          path: '/my-tournaments',
          active: location.pathname === '/my-tournaments' || location.pathname.startsWith('/tournaments'),
        },
        {
          id: 'venues',
          label: 'Find Venues',
          icon: Building2,
          path: '/venues',
          active: location.pathname.startsWith('/venues') && !location.pathname.includes('/management'),
        },
        {
          id: 'chats',
          label: 'My Chats',
          icon: MessageCircle,
          path: '/chats',
          active: location.pathname === '/chats',
        },
        commonItems[1], // Profile
      ];
    }

    // Navigation for PLAYER role
    if (user?.role === UserRole.PLAYER) {
      return [
        commonItems[0], // Dashboard
        {
          id: 'tournaments',
          label: 'Tournaments',
          icon: Trophy,
          path: '/tournaments',
          active: location.pathname.startsWith('/tournaments') && !location.pathname.includes('/create'),
        },
        {
          id: 'teams',
          label: 'Teams',
          icon: Users,
          path: '/teams',
          active: location.pathname.startsWith('/teams'),
        },
        {
          id: 'player-statistics',
          label: 'Player Stats',
          icon: BarChart3,
          path: '/player-statistics',
          active: location.pathname === '/player-statistics',
        },
        {
          id: 'venues',
          label: 'Find Venues',
          icon: Building2,
          path: '/venues',
          active: location.pathname.startsWith('/venues') && !location.pathname.includes('/management'),
        },
        {
          id: 'find',
          label: 'Find Players',
          icon: Search,
          path: '/player-finder',
          active: location.pathname === '/player-finder',
        },
        {
          id: 'connections',
          label: 'My Connections',
          icon: Users,
          path: '/player-connections',
          active: location.pathname === '/player-connections',
        },
        {
          id: 'chats',
          label: 'My Chats',
          icon: MessageCircle,
          path: '/chats',
          active: location.pathname === '/chats',
        },
        commonItems[1], // Profile
      ];
    }

    // Default navigation for other roles
    return [
      commonItems[0], // Dashboard
      {
        id: 'tournaments',
        label: 'Tournaments',
        icon: Trophy,
        path: '/tournaments',
        active: location.pathname.startsWith('/tournaments') && !location.pathname.includes('/create'),
      },
      {
        id: 'venues',
        label: 'Find Venues',
        icon: Building2,
        path: '/venues',
        active: location.pathname.startsWith('/venues') && !location.pathname.includes('/management'),
      },
      {
        id: 'find',
        label: 'Find Players',
        icon: Search,
        path: '/player-finder',
        active: location.pathname === '/player-finder',
      },
      {
        id: 'connections',
        label: 'My Connections',
        icon: Users,
        path: '/player-connections',
        active: location.pathname === '/player-connections',
      },
      {
        id: 'chats',
        label: 'My Chats',
        icon: MessageCircle,
        path: '/chats',
        active: location.pathname === '/chats',
      },
      commonItems[1], // Profile
    ];
  };

  const navItems = getNavItems();

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
    // Restore body scroll when closing sidebar on mobile
    if (window.innerWidth < 1024) {
      document.body.style.overflow = '';
    }
  };

  const handleClose = () => {
    onClose();
    // Restore body scroll when closing sidebar on mobile
    if (window.innerWidth < 1024) {
      document.body.style.overflow = '';
    }
  };

  return (
    <>
      {/* Overlay - Only for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={handleClose}
          style={{ zIndex: 9998 }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } lg:shadow-none shadow-2xl`}
        style={{ zIndex: 9999 }}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-xl font-bold text-gray-900">ArenaX</span>
            </div>
            <button
              onClick={handleClose}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${item.active
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <IconComponent
                    className={`h-5 w-5 ${item.active ? 'text-white' : 'text-gray-500'
                      }`}
                  />
                  <span className={`font-medium ${item.active ? 'text-white' : 'text-gray-700'
                    }`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100">
            <div className="text-xs text-gray-500 text-center">
              © 2025 ArenaX
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

