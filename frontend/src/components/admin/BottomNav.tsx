/**
 * BottomNav - Mobile bottom navigation for admin pages
 * 
 * Provides quick access to main admin sections with badge indicators
 * for pending items. Hidden on desktop (lg breakpoint and above).
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, Trophy, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/adminService';
import { adminTournamentService } from '@/services/adminTournamentService';
import { adminVenueService } from '@/services/adminVenueService';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch stats for badge counts
  const { data: userStats } = useQuery({
    queryKey: ['admin', 'users', 'stats'],
    queryFn: () => adminService.getUserStats(),
    staleTime: 30 * 1000,
  });

  const { data: tournamentStats } = useQuery({
    queryKey: ['admin', 'tournaments', 'stats'],
    queryFn: () => adminTournamentService.getTournamentStats(),
    staleTime: 30 * 1000,
  });

  const { data: venueStats } = useQuery({
    queryKey: ['admin', 'venues', 'stats'],
    queryFn: () => adminVenueService.getVenueStats(),
    staleTime: 30 * 1000,
  });

  const pendingUsers = userStats?.pending_approvals || 0;
  const pendingTournaments = tournamentStats?.pending || 0;
  const pendingVenues = venueStats?.pending || 0;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      path: '/admin',
      active: location.pathname === '/admin' || location.pathname === '/admin/dashboard',
      badge: 0,
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      path: '/admin/users',
      active: location.pathname === '/admin/users',
      badge: pendingUsers,
    },
    {
      id: 'tournaments',
      label: 'Events',
      icon: Trophy,
      path: '/admin/tournaments',
      active: location.pathname === '/admin/tournaments',
      badge: pendingTournaments,
    },
    {
      id: 'venues',
      label: 'Venues',
      icon: MapPin,
      path: '/admin/venues',
      active: location.pathname === '/admin/venues',
      badge: pendingVenues,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-50 shadow-lg safe-area-inset-bottom">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-1 transition-all relative ${
                item.active
                  ? 'text-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
              }`}
            >
              <IconComponent className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
              
              {/* Badge for pending items */}
              {item.badge > 0 && (
                <span className="absolute top-1.5 right-1/4 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
