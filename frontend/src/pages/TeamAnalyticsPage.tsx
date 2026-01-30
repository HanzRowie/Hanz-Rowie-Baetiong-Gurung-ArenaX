import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Settings } from 'lucide-react';
import { TeamAnalyticsDashboard, ActivityHistoryTimeline } from '@/components/team';
import { TeamService } from '@/services/teamService';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import type { Team } from '@/types/team.types';

const TeamAnalyticsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get('teamId');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'analytics' | 'activity'>('analytics');

  // Fetch team data
  const {
    data: team,
    isLoading: teamLoading,
    error: teamError
  } = useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      if (!teamId) throw new Error('Team ID is required');
      const response = await TeamService.getTeam(teamId);
      return response.data as Team;
    },
    enabled: !!teamId
  });

  if (!teamId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Team</h1>
          <p className="text-gray-600 mb-4">No team ID provided</p>
          <button
            onClick={() => navigate('/teams')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Teams
          </button>
        </div>
      </div>
    );
  }

  if (teamLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <LoadingSkeleton className="h-8 w-64 mb-4" />
            <LoadingSkeleton className="h-6 w-96" />
          </div>
          <div className="space-y-6">
            <LoadingSkeleton className="h-12 w-full" />
            <LoadingSkeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (teamError || !team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Team Not Found</h1>
            <p className="text-gray-600 mb-4">The requested team could not be found</p>
          </div>
          <button
            onClick={() => navigate('/teams')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Teams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/teams/${teamId}`)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
                <p className="text-gray-600">
                  Analytics & Activity • {team.sport_types.join(', ')} • {team.member_count} members
                </p>
              </div>
            </div>
            
            <button
              onClick={() => navigate(`/teams/${teamId}/settings`)}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('analytics')}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === 'analytics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                Analytics Dashboard
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === 'activity'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                Activity History
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'analytics' && (
            <TeamAnalyticsDashboard team={team} />
          )}
          
          {activeTab === 'activity' && (
            <ActivityHistoryTimeline
              teamId={teamId}
              showSearch={true}
              showFilters={true}
              groupByDate={true}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamAnalyticsPage;