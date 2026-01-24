import { createBrowserRouter } from 'react-router-dom';
import {
  LandingPage,
  LoginPage,
  RegisterPage,
  VerifyEmailPage,
  DashboardPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  CreateTournamentPage,
  MyTournamentsPage,
  RefereeAvailabilityPage,
  RefereeBookingsPage,
  RefereeSchedulePage,
  VenueListPage,
  VenueManagementPage,
  VenueBookingsPage,
  CreateVenuePage,
  EditVenuePage,
  VenueDetailsPage,
  NotificationsPage,
  GlobalSearchPage,
  TournamentManagementPage
} from './pages';
import TournamentsPage from './pages/TournamentsPage';
import TournamentDetailPage from './pages/TournamentDetailPage';
import RefereeSelectionPage from './pages/RefereeSelectionPage';
import RefereeDashboardPage from './pages/RefereeDashboardPage';
import RefereeManagementPage from './pages/RefereeManagementPage';
import RefereeRatingsPage from './pages/RefereeRatingsPage';
import ProfilePage from './pages/ProfilePage';
import PlayersPage from './pages/PlayersPage';
import ChatsPage from './pages/ChatsPage';
import PlayerFinderPage from './pages/PlayerFinderPage';
import PlayerConnectionsPage from './pages/PlayerConnectionsPage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import VenueBookingPage from './pages/VenueBookingPage';
import VenuesPage from './pages/VenuesPage';
import VenueSearchPage from './pages/VenueSearchPage';
import BookingsPage from './pages/BookingsPage';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';

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
        path: 'tournaments/:tournamentId/manage',
        element: <TournamentManagementPage />,
      },
      {
        path: 'my-tournaments',
        element: <MyTournamentsPage />,
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
        element: <RefereeManagementPage />, // Redirect to management page
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
      // Search routes
      {
        path: 'search',
        element: <GlobalSearchPage />,
      },
    ],
  },
]);
