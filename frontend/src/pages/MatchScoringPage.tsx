import React from 'react';
import { MatchScoringInterface } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const MatchScoringPage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get tournamentId from URL query parameters
  const tournamentId = searchParams.get('tournamentId') || undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect non-organizers
  if (!user || user.role !== 'ORGANIZER') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleBack = () => {
    if (tournamentId) {
      // If we came from a specific tournament, go back to it
      navigate(`/tournaments/${tournamentId}`);
    } else {
      // Otherwise go to my tournaments
      navigate('/tournaments/my');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to {tournamentId ? 'Tournament' : 'My Tournaments'}</span>
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Match Scoring</h1>
        <p className="text-gray-600">
          Record and manage match scores for your tournaments. Select a tournament to view and score matches.
        </p>
      </div>

      <MatchScoringInterface 
        tournamentId={tournamentId}
      />
    </div>
  );
};

export default MatchScoringPage;