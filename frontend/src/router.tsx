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
  VenueListPage,
  VenueManagementPage,
  VenueBookingsPage,
  CreateVenuePage,
  EditVenuePage,
  VenueDetailsPage,
  NotificationsPage,
  GlobalSearchPage
} from './pages';
import TournamentsPage from './pages/TournamentsPage';
import TournamentDetailPage from './pages/TournamentDetailPage';
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
