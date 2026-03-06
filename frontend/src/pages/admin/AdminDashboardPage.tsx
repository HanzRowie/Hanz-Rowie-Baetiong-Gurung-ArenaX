/**
 * AdminDashboardPage - Main dashboard for administrators
 * 
 * Provides an overview of platform activity with:
 * - Key statistics (users, tournaments, venues)
 * - Recent activity feed
 * - Pending approvals summary
 * - Quick actions
 * - Real-time WebSocket updates
 * 
 * Design inspired by OrganizerDashboardPage with admin-specific features
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, Trophy, MapPin, Activity,
  Clock, CheckCircle, XCircle, AlertCircle,
  TrendingUp, Eye, Shield
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { adminTournamentService } from '@/services/adminTournamentService';
import { adminVenueService } from '@/services/adminVenueService';
import { useAdminWebSocket } from '@/hooks/useAdminWebSocket';
import { Toast, type ToastMessage } from '@/components/admin/Toast';
import type {
  NewUserRegistrationMessage,
  TournamentSubmittedMessage,
  VenueSubmittedMessage,
} from '@/types/admin.types';

interface DashboardStats {
  totalUsers: number;
  pendingUsers: number;
  totalTournaments: number;
  pendingTournaments: number;
  totalVenues: number;
  pendingVenues: number;
  approvedToday: number;
  rejectedToday: number;
}

interface RecentActivity {
  id: string;
  type: 'user_registration' | 'tournament_submission' | 'venue_submission';
  title: string;
  description: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  // Toast management
  const showToast = useCallback((type: ToastMessage['type'], title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Fetch user stats
  const { data: userStats } = useQuery({
    queryKey: ['admin', 'users', 'stats'],
    queryFn: () => adminService.getUserStats(),
    staleTime: 30 * 1000,
  });

  // Fetch tournament stats
  const { data: tournamentStats } = useQuery({
    queryKey: ['admin', 'tournaments', 'stats'],
    queryFn: () => adminTournamentService.getTournamentStats(),
    staleTime: 30 * 1000,
  });

  // Log tournament stats when they change
  console.log('[AdminDashboard] Tournament stats received:', tournamentStats);

  // Fetch venue stats
  const { data: venueStats } = useQuery({
    queryKey: ['admin', 'venues', 'stats'],
    queryFn: () => adminVenueService.getVenueStats(),
    staleTime: 30 * 1000,
  });

  // Log venue stats when they change
  console.log('[AdminDashboard] Venue stats received:', venueStats);

  // WebSocket integration for real-time updates
  useAdminWebSocket({
    onNewUserRegistration: useCallback((message: NewUserRegistrationMessage) => {
      showToast('info', 'New User Registration', `${message.user_name} (${message.user_role}) has registered.`);
      
      // Add to recent activity
      setRecentActivity((prev) => [
        {
          id: message.user_id,
          type: 'user_registration',
          title: 'New User Registration',
          description: `${message.user_name} registered as ${message.user_role}`,
          timestamp: message.timestamp,
          status: 'pending',
        },
        ...prev.slice(0, 9), // Keep only 10 most recent
      ]);
    }, [showToast]),

    onTournamentSubmitted: useCallback((message: TournamentSubmittedMessage) => {
      showToast('info', 'New Tournament Submitted', `${message.tournament_name} by ${message.organizer_name} requires review.`);
      
      setRecentActivity((prev) => [
        {
          id: message.resource_id,
          type: 'tournament_submission',
          title: 'Tournament Submitted',
          description: `${message.tournament_name} (${message.sport_type})`,
          timestamp: message.timestamp,
          status: 'pending',
        },
        ...prev.slice(0, 9),
      ]);
    }, [showToast]),

    onVenueSubmitted: useCallback((message: VenueSubmittedMessage) => {
      showToast('info', 'New Venue Submitted', `${message.venue_name} by ${message.owner_name} requires review.`);
      
      setRecentActivity((prev) => [
        {
          id: message.resource_id,
          type: 'venue_submission',
          title: 'Venue Submitted',
          description: `${message.venue_name} (${message.sport_type})`,
          timestamp: message.timestamp,
          status: 'pending',
        },
        ...prev.slice(0, 9),
      ]);
    }, [showToast]),
  });

  // Aggregate stats
  const dashboardStats: DashboardStats = {
    totalUsers: userStats?.total_users || 0,
    pendingUsers: userStats?.pending_approvals || 0,
    totalTournaments: (tournamentStats?.total_pending || 0) + (tournamentStats?.total_approved || 0) + (tournamentStats?.total_rejected || 0) + (tournamentStats?.total_conditional_approval || 0),
    pendingTournaments: tournamentStats?.total_pending || 0,
    totalVenues: (venueStats?.total_pending || 0) + (venueStats?.total_approved || 0) + (venueStats?.total_rejected || 0) + (venueStats?.total_conditional_approval || 0),
    pendingVenues: venueStats?.total_pending || 0,
    approvedToday: (userStats?.approved_today || 0),
    rejectedToday: (userStats?.rejected_total || 0),
  };

  console.log('[AdminDashboard] Aggregated dashboard stats:', dashboardStats);
  console.log('[AdminDashboard] Raw stats objects:', {
    userStats,
    tournamentStats,
    venueStats
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'user_registration':
        return <Users className="h-5 w-5 text-blue-600" />;
      case 'tournament_submission':
        return <Trophy className="h-5 w-5 text-purple-600" />;
      case 'venue_submission':
        return <MapPin className="h-5 w-5 text-green-600" />;
    }
  };

  const getStatusBadge = (status: RecentActivity['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3" />
            Rejected
          </span>
        );
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      {/* Hero Section - Solid Purple */}
      <div className="bg-purple-600 rounded-3xl p-8 md:p-10 text-white mb-8 relative overflow-hidden shadow-xl">
            {/* Subtle Background Pattern */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full -ml-32 -mb-32"></div>
            <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-white/5 rounded-full"></div>
            
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                      <Shield className="h-7 w-7" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                      {getGreeting()}, {user?.full_name?.split(' ')[0] || 'Admin'}!
                    </h1>
                  </div>
                  <p className="text-purple-100 text-lg mb-6 max-w-2xl leading-relaxed">
                    Welcome back to your dashboard. You have <span className="font-bold text-white">{dashboardStats.pendingUsers + dashboardStats.pendingTournaments + dashboardStats.pendingVenues} items</span> pending review today.
                  </p>
                  
                  <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={() => navigate('/admin/users')}
                      className="bg-white text-purple-600 px-6 py-3 rounded-xl font-semibold hover:bg-purple-50 hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2"
                    >
                      <Users className="h-5 w-5" />
                      Review Users
                    </button>
                    <button 
                      onClick={() => navigate('/admin/tournaments')}
                      className="border-2 border-white/30 bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/20 hover:border-white/50 transition-all flex items-center gap-2"
                    >
                      <Trophy className="h-5 w-5" />
                      Tournaments
                    </button>
                    <button 
                      onClick={() => navigate('/admin/venues')}
                      className="border-2 border-white/30 bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/20 hover:border-white/50 transition-all flex items-center gap-2"
                    >
                      <MapPin className="h-5 w-5" />
                      Venues
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid - Enhanced Design */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Users Card */}
            <div 
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
              onClick={() => navigate('/admin/users')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl group-hover:from-blue-100 group-hover:to-blue-200 transition-colors">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                {dashboardStats.pendingUsers > 0 && (
                  <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full border border-yellow-200">
                    {dashboardStats.pendingUsers} pending
                  </span>
                )}
              </div>
              <h3 className="text-gray-500 text-sm font-medium mb-1">Total Users</h3>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-gray-900">{dashboardStats.totalUsers}</p>
                <span className="text-green-500 text-xs font-bold mb-1.5 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                  12%
                </span>
              </div>
              <div className="mt-4 flex items-center text-xs text-gray-400">
                <Activity className="h-3 w-3 mr-1" />
                <span>Active platform</span>
              </div>
            </div>

            {/* Tournaments Card */}
            <div 
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
              onClick={() => navigate('/admin/tournaments')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl group-hover:from-amber-100 group-hover:to-amber-200 transition-colors">
                  <Trophy className="h-6 w-6 text-amber-600" />
                </div>
                {dashboardStats.pendingTournaments > 0 && (
                  <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full border border-yellow-200">
                    {dashboardStats.pendingTournaments} pending
                  </span>
                )}
              </div>
              <h3 className="text-gray-500 text-sm font-medium mb-1">Tournaments</h3>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-gray-900">{dashboardStats.totalTournaments}</p>
                <span className="text-green-500 text-xs font-bold mb-1.5 flex items-center">
                  <Activity className="h-3 w-3 mr-0.5" />
                  High
                </span>
              </div>
              <div className="mt-4 flex items-center text-xs text-gray-400">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>Events managed</span>
              </div>
            </div>

            {/* Venues Card */}
            <div 
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
              onClick={() => navigate('/admin/venues')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl group-hover:from-emerald-100 group-hover:to-emerald-200 transition-colors">
                  <MapPin className="h-6 w-6 text-emerald-600" />
                </div>
                {dashboardStats.pendingVenues > 0 && (
                  <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full border border-yellow-200">
                    {dashboardStats.pendingVenues} pending
                  </span>
                )}
              </div>
              <h3 className="text-gray-500 text-sm font-medium mb-1">Total Venues</h3>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-gray-900">{dashboardStats.totalVenues}</p>
                <span className="text-emerald-500 text-xs font-bold mb-1.5 flex items-center">
                  <CheckCircle className="h-3 w-3 mr-0.5" />
                  Verified
                </span>
              </div>
              <div className="mt-4 flex items-center text-xs text-gray-400">
                <MapPin className="h-3 w-3 mr-1" />
                <span>Facilities listed</span>
              </div>
            </div>

            {/* Today's Activity Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl group-hover:from-indigo-100 group-hover:to-indigo-200 transition-colors">
                  <Activity className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
              <h3 className="text-gray-500 text-sm font-medium mb-1">Today's Activity</h3>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-gray-900">{dashboardStats.approvedToday}</p>
                <span className="text-gray-400 text-xs font-bold mb-1.5">approved</span>
              </div>
              <div className="mt-4 flex items-center text-xs text-gray-400">
                <CheckCircle className="h-3 w-3 mr-1 text-emerald-500" />
                <span>Processed today</span>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Activity - Takes 2 columns */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
                <button className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                  View All
                  <Eye className="h-4 w-4" />
                </button>
              </div>

              {recentActivity.length === 0 ? (
                <div className="text-center py-16 px-8">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Activity className="h-10 w-10 text-gray-300" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">No recent activity</h4>
                  <p className="text-sm text-gray-500 max-w-xs mx-auto">
                    New submissions and system events will appear here as they occur.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-6 hover:bg-gray-50 transition-colors cursor-pointer group"
                      onClick={() => {
                        if (activity.type === 'user_registration') navigate('/admin/users');
                        if (activity.type === 'tournament_submission') navigate('/admin/tournaments');
                        if (activity.type === 'venue_submission') navigate('/admin/venues');
                      }}
                    >
                      <div className="p-2.5 bg-gray-50 rounded-xl group-hover:bg-gray-100 transition-colors">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{activity.title}</h3>
                            <p className="text-sm text-gray-600 mt-1 leading-relaxed">{activity.description}</p>
                          </div>
                          {getStatusBadge(activity.status)}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">{formatTimeAgo(activity.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar - Takes 1 column */}
            <div className="space-y-6">
              {/* Pending Approvals Widget */}
              {(dashboardStats.pendingUsers > 0 || dashboardStats.pendingTournaments > 0 || dashboardStats.pendingVenues > 0) && (
                <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-amber-200/50 text-amber-700 flex items-center justify-center">
                        <AlertCircle className="h-5 w-5" />
                      </div>
                      <h4 className="font-bold text-amber-900">Pending Approvals</h4>
                    </div>
                    <p className="text-sm text-amber-800/80 mb-6 leading-relaxed">
                      There are items waiting for review. Use the quick actions below to manage them efficiently.
                    </p>
                    <div className="space-y-3">
                      {dashboardStats.pendingUsers > 0 && (
                        <button
                          onClick={() => navigate('/admin/users?status=PENDING')}
                          className="w-full flex items-center justify-between p-4 bg-white border border-amber-200 rounded-xl hover:shadow-md hover:scale-105 active:scale-95 transition-all group"
                        >
                          <span className="text-sm font-semibold text-amber-900">Review {dashboardStats.pendingUsers} Users</span>
                          <span className="text-amber-400 group-hover:translate-x-1 transition-transform">→</span>
                        </button>
                      )}
                      {dashboardStats.pendingTournaments > 0 && (
                        <button
                          onClick={() => navigate('/admin/tournaments?status=PENDING')}
                          className="w-full flex items-center justify-between p-4 bg-white border border-amber-200 rounded-xl hover:shadow-md hover:scale-105 active:scale-95 transition-all group"
                        >
                          <span className="text-sm font-semibold text-amber-900">Review {dashboardStats.pendingTournaments} Tournaments</span>
                          <span className="text-amber-400 group-hover:translate-x-1 transition-transform">→</span>
                        </button>
                      )}
                      {dashboardStats.pendingVenues > 0 && (
                        <button
                          onClick={() => navigate('/admin/venues?status=PENDING')}
                          className="w-full flex items-center justify-between p-4 bg-white border border-amber-200 rounded-xl hover:shadow-md hover:scale-105 active:scale-95 transition-all group"
                        >
                          <span className="text-sm font-semibold text-amber-900">Review {dashboardStats.pendingVenues} Venues</span>
                          <span className="text-amber-400 group-hover:translate-x-1 transition-transform">→</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Stats Widget */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6 relative overflow-hidden group">
                <div className="relative z-10">
                  <h4 className="font-bold text-gray-900 mb-2">Quick Stats</h4>
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                    Monitor platform activity in real-time. All pending items require your review and approval.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-indigo-600 font-semibold">
                    <Activity className="h-3 w-3" />
                    <span>Live Updates Active</span>
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 text-7xl text-indigo-100 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300">
                  📊
                </div>
              </div>
            </div>
          </div>

      {/* Toast Notifications */}
      <div
        className="fixed top-4 right-4 z-50 space-y-2"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </div>
  );
}
