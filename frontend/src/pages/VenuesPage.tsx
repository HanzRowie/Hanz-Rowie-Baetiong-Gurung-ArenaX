import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '@/types/auth.types';
import VenueManagementPage from './VenueManagementPage';
import VenueSearchPage from './VenueSearchPage';

export default function VenuesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  // Show different pages based on user role
  if (user.role === UserRole.VENUE_OWNER) {
    return <VenueManagementPage />;
  } else if (user.role === UserRole.ORGANIZER) {
    return <VenueSearchPage />;
  } else {
    // For other roles, redirect to dashboard
    navigate('/dashboard');
    return null;
  }
}