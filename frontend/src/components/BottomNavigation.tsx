import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Trophy, Search, MessageCircle, User, Building2, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/auth.types';

export default function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const getNavItems = () => {
    if (user?.role === UserRole.VENUE_OWNER) {
      return [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: Home,
          path: '/dashboard',
          active: location.pathname === '/dashboard',
        },
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
          label: 'Chats',
          icon: MessageCircle,
          path: '/chats',
          active: location.pathname === '/chats',
        },
        {
          id: 'profile',
          label: 'Profile',
          icon: User,
          path: '/profile',
          active: location.pathname === '/profile',
        },
      ];
    }

    // Default navigation for other roles
    return [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: Home,
        path: '/dashboard',
        active: location.pathname === '/dashboard',
      },
      {
        id: 'tournaments',
        label: 'Tournaments',
        icon: Trophy,
        path: '/tournaments',
        active: location.pathname.startsWith('/tournaments') && !location.pathname.includes('/create'),
      },
      {
        id: 'find',
        label: 'Find',
        icon: Search,
        path: '/players',
        active: location.pathname === '/players',
      },
      {
        id: 'chats',
        label: 'Chats',
        icon: MessageCircle,
        path: '/chats',
        active: location.pathname === '/chats',
      },
      {
        id: 'profile',
        label: 'Profile',
        icon: User,
        path: '/profile',
        active: location.pathname === '/profile',
      },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2 z-50 md:hidden">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 ${item.active
                  ? 'text-purple-600 bg-purple-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
              <IconComponent
                className={`h-6 w-6 mb-1 ${item.active ? 'text-purple-600' : 'text-gray-500'
                  }`}
              />
              <span className={`text-xs font-medium ${item.active ? 'text-purple-600' : 'text-gray-500'
                }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}