import React from 'react';
import MainLayout from '@/components/MainLayout';
import { MatchScoringInterface } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

const MatchScoringPage: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Redirect non-organizers
  if (!user || user.role !== 'ORGANIZER') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Match Scoring</h1>
          <p className="text-gray-600">
            Record and manage match scores for your tournaments. Select a tournament to view and score matches.
          </p>
        </div>

        <MatchScoringInterface />
      </div>
    </MainLayout>
  );
};

export default MatchScoringPage;