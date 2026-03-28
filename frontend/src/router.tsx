import { createBrowserRouter } from 'react-router-dom';
import {
  LandingPage,
  LoginPage,
  RegisterPage,
  VerifyEmailPage,
  AccountPendingApprovalPage,
  DashboardPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  CreateTournamentPage,
  EditTournamentPage,
  TournamentsPage,
  TournamentDetailPage,
  MyTournamentsPage,
  MatchScoringPage,
  ProfilePage,
  AccountSettingsPage,
  ChatsPage,
  NotificationsPage,
  PlayerFinderPage,
  PlayerConnectionsPage,
  PlayersPage,
  TeamsPage,
  TeamDetailsPage,
  EditTeamPage,
  TeamAnalyticsPage,
  MyStatsPage,
  PlayerStatisticsPage,
  RefereeAvailabilityPage,
  RefereeBookingsPage,
  RefereePaymentsPage,
  RefereeManagementPage,
  RefereeSchedulePage,
  RefereeSelectionPage,
  RefereeDashboardPage,
  VenueManagementPage,
  VenueBookingsPage,
  CreateVenuePage,
  EditVenuePage,
  VenueDetailsPage,
  VenueSearchPage,
  BookingsPage,
  GlobalSearchPage,
  WalletPage,
  PublicTournamentPage,
} from './pages';


import AccountStatusPage from './pages/AccountStatusPage';
import PaymentCallbackPage from './pages/PaymentCallbackPage';
import PaymentHistoryPage from './pages/PaymentHistoryPage';
import OrganizerRefundPage from './pages/OrganizerRefundPage';
import RefereeRatingsPage from './pages/RefereeRatingsPage';
import VenueBookingPage from './pages/VenueBookingPage';


import TournamentManagementPage from './pages/admin/TournamentManagementPage';
import AdminVenueManagementPage from './pages/admin/VenueManagementPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import AdminLayout from './components/admin/AdminLayout';

// Router configuration
export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/verify-email',
    element: <VerifyEmailPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/account-pending-approval',
    element: <AccountPendingApprovalPage />,
  },
  {
    path: '/account-status',
    element: <AccountStatusPage />,
  },
  {
    path: '/payment/success',
    element: <PaymentCallbackPage />,
  },
  {
    path: '/t/:shareToken',
    element: <PublicTournamentPage />,
  },
  // Admin routes with role-based access control
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '',
        element: <AdminDashboardPage />, // Default admin page is dashboard
      },
      {
        path: 'dashboard',
        element: <AdminDashboardPage />,
      },
      {
        path: 'users',
        element: <UserManagementPage />,
      },
      {
        path: 'referees',
        element: <UserManagementPage />, // Use UserManagementPage for referees too
      },
      {
        path: 'tournaments',
        element: <TournamentManagementPage />,
      },
      {
        path: 'venues',
        element: <AdminVenueManagementPage />,
      },
    ],
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'my-stats',
        element: <MyStatsPage />,
      },
      {
        path: 'player-statistics',
        element: <PlayerStatisticsPage />,
      },
      // Tournament routes
      {
        path: 'tournaments',
        element: <TournamentsPage />,
      },
      {
        path: 'tournaments/create',
        element: <CreateTournamentPage />,
      },
      {
        path: 'tournaments/:tournamentId',
        element: <TournamentDetailPage />,
      },
      {
        path: 'tournaments/:tournamentId/edit',
        element: <EditTournamentPage />,
      },
      {
        path: 'my-tournaments',
        element: <MyTournamentsPage />,
      },
      {
        path: 'match-scoring',
        element: <MatchScoringPage />,
      },
      // Player routes
      {
        path: 'players',
        element: <PlayersPage />,
      },
      {
        path: 'player-finder',
        element: <PlayerFinderPage />,
      },
      {
        path: 'player-connections',
        element: <PlayerConnectionsPage />,
      },
      {
        path: 'connections',
        element: <PlayerConnectionsPage />,
      },
      // Team routes
      {
        path: 'teams',
        element: <TeamsPage />,
      },
      {
        path: 'teams/:teamId',
        element: <TeamDetailsPage />,
      },
      {
        path: 'teams/:teamId/edit',
        element: <EditTeamPage />,
      },
      {
        path: 'teams/analytics',
        element: <TeamAnalyticsPage />,
      },
      // Profile routes
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'profile/:userId',
        element: <ProfilePage />,
      },
      {
        path: 'account-settings',
        element: <AccountSettingsPage />,
      },
      // Referee routes
      {
        path: 'referee/dashboard',
        element: <RefereeDashboardPage />,
      },
      {
        path: 'referee/management',
        element: <RefereeManagementPage />,
      },
      {
        path: 'referee/availability',
        element: <RefereeAvailabilityPage />,
      },
      {
        path: 'referee/bookings',
        element: <RefereeBookingsPage />,
      },
      {
        path: 'referee/payments',
        element: <RefereePaymentsPage />,
      },
      {
        path: 'referee/ratings',
        element: <RefereeRatingsPage />,
      },
      {
        path: 'referee/schedule',
        element: <RefereeSchedulePage />,
      },
      {
        path: 'referee/wallet',
        element: <WalletPage />,
      },
      {
        path: 'tournaments/:tournamentId/select-referee',
        element: <RefereeSelectionPage />,
      },
      // Venue routes
      {
        path: 'venues',
        element: <VenueSearchPage />,
      },
      {
        path: 'venues/create',
        element: <CreateVenuePage />,
      },
      {
        path: 'venues/:venueId',
        element: <VenueDetailsPage />,
      },
      {
        path: 'venues/:venueId/edit',
        element: <EditVenuePage />,
      },
      {
        path: 'venues/:venueId/book',
        element: <VenueBookingPage />,
      },
      {
        path: 'venue-management',
        element: <VenueManagementPage />,
      },
      {
        path: 'venue-bookings',
        element: <VenueBookingsPage />,
      },
      {
        path: 'bookings',
        element: <BookingsPage />,
      },
      // Communication routes
      {
        path: 'chat',
        element: <ChatsPage />,
      },
      {
        path: 'chat/:userId',
        element: <ChatsPage />,
      },
      {
        path: 'chats',
        element: <ChatsPage />,
      },
      {
        path: 'chats/:userId',
        element: <ChatsPage />,
      },
      {
        path: 'notifications',
        element: <NotificationsPage />,
      },
      // Payment routes
      {
        path: 'payments',
        element: <PaymentHistoryPage />,
      },
      {
        path: 'payment-history',
        element: <PaymentHistoryPage />,
      },
      {
        path: 'refunds',
        element: <OrganizerRefundPage />,
      },
      // Search routes
      {
        path: 'search',
        element: <GlobalSearchPage />,
      },
    ],
  },
]);
