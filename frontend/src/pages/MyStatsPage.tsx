import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { dashboardService } from '@/services/dashboardService';
import { FutsalStatsCard } from '@/components/player/FutsalStatsCard';
import SportRankingsCard from '@/components/player/SportRankingsCard';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/components/Card';
import { 
  Target, 
  Trophy, 
  TrendingUp, 
  ArrowLeft,
  BarChart3,
  Award
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StatsData {
  sport_rankings?: Record<string, any>;
  total_matches?: number;
  total_goals?: number;
  total_assists?: number;
  total_minutes_played?: number;
  goals_per_match?: number;
  assists_per_match?: number;
  minutes_per_match?: number;
  shot_accuracy?: number;
  pass_accuracy?: number;
  total_shots_on_target?: number;
  total_shots_off_target?: number;
  total_tackles?: number;
  total_interceptions?: number;
  total_clearances?: number;
  total_yellow_cards?: number;
  total_red_cards?: number;
  total_fouls_committed?: number;
  total_fouls_suffered?: number;
  recent_form?: Array<any>;
  matchesWon?: number;
  matchesPlayed?: number;
  winRate?: number;
}

export const MyStatsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatsData>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'futsal' | 'badminton' | 'rankings'>('overview');

  useEffect(() => {
    loadPlayerStats();
  }, []);

  const loadPlayerStats = async () => {
    try {
      setLoading(true);
      const [dashboardStats] = await Promise.all([
        dashboardService.getDashboardStats().catch(() => ({
          upcomingMatches: 0,
          totalTournaments: 0,
          totalParticipants: 0,
          winRate: 0,
          matchesWon: 0,
          matchesPlayed: 0,
        }))
      ]);

      setStats(dashboardStats);
    } catch (error) {
      console.error('Failed to load player stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const TabButton = ({ 
    id, 
    label, 
    icon: Icon, 
    isActive 
  }: { 
    id: string; 
    label: string; 
    icon: React.ElementType; 
    isActive: boolean;
  }) => (
    <button
      onClick={() => setActiveTab(id as any)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-purple-600 text-white shadow-md'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to Dashboard
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">My Statistics</h1>
                <p className="text-sm text-gray-500">{user?.full_name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-lg shadow-sm">
          <TabButton
            id="overview"
            label="Overview"
            icon={BarChart3}
            isActive={activeTab === 'overview'}
          />
          <TabButton
            id="futsal"
            label="Futsal Stats"
            icon={Target}
            isActive={activeTab === 'futsal'}
          />
          <TabButton
            id="badminton"
            label="Badminton Stats"
            icon={Trophy}
            isActive={activeTab === 'badminton'}
          />
          <TabButton
            id="rankings"
            label="Rankings"
            icon={Award}
            isActive={activeTab === 'rankings'}
          />
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Overall Performance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-600" />
                    Tournament Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Matches Played</span>
                      <span className="font-semibold">{stats.matchesPlayed || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Matches Won</span>
                      <span className="font-semibold text-green-600">{stats.matchesWon || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Win Rate</span>
                      <span className="font-semibold text-purple-600">{(stats.winRate || 0).toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-600" />
                    Futsal Highlights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Goals</span>
                      <span className="font-semibold text-green-600">{stats.total_goals || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Assists</span>
                      <span className="font-semibold text-blue-600">{stats.total_assists || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Goals per Match</span>
                      <span className="font-semibold">{(stats.goals_per_match || 0).toFixed(1)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Recent Form</span>
                      <div className="flex gap-1">
                        {stats.recent_form?.slice(0, 5).map((match, index) => (
                          <div
                            key={index}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                              match.result === 'W' ? 'bg-green-500' :
                              match.result === 'L' ? 'bg-red-500' : 'bg-yellow-500'
                            }`}
                          >
                            {match.result}
                          </div>
                        )) || <span className="text-gray-400">No recent matches</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sport Rankings */}
            {stats.sport_rankings && Object.keys(stats.sport_rankings).length > 0 && (
              <SportRankingsCard sportRankings={stats.sport_rankings} />
            )}
          </div>
        )}

        {activeTab === 'futsal' && (
          <div className="space-y-6">
            {stats.sport_rankings?.FUTSAL ? (
              <FutsalStatsCard 
                stats={{
                  total_matches: stats.total_matches || 0,
                  total_goals: stats.total_goals || 0,
                  total_assists: stats.total_assists || 0,
                  total_minutes_played: stats.total_minutes_played || 0,
                  goals_per_match: stats.goals_per_match || 0,
                  assists_per_match: stats.assists_per_match || 0,
                  minutes_per_match: stats.minutes_per_match || 90,
                  shot_accuracy: stats.shot_accuracy || 0,
                  pass_accuracy: stats.pass_accuracy || 0,
                  total_shots_on_target: stats.total_shots_on_target || 0,
                  total_shots_off_target: stats.total_shots_off_target || 0,
                  total_tackles: stats.total_tackles || 0,
                  total_interceptions: stats.total_interceptions || 0,
                  total_clearances: stats.total_clearances || 0,
                  total_yellow_cards: stats.total_yellow_cards || 0,
                  total_red_cards: stats.total_red_cards || 0,
                  total_fouls_committed: stats.total_fouls_committed || 0,
                  total_fouls_suffered: stats.total_fouls_suffered || 0,
                  recent_form: stats.recent_form || []
                }}
                playerName={user?.full_name || 'Player'}
              />
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Target className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Futsal Statistics</h3>
                  <p className="text-gray-500">Play some futsal matches to see your statistics here.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'badminton' && (
          <div className="space-y-6">
            <Card>
              <CardContent className="text-center py-12">
                <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Badminton Statistics</h3>
                <p className="text-gray-500">Detailed badminton statistics coming soon.</p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'rankings' && (
          <div className="space-y-6">
            {stats.sport_rankings && Object.keys(stats.sport_rankings).length > 0 ? (
              <SportRankingsCard sportRankings={stats.sport_rankings} />
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Award className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Rankings Available</h3>
                  <p className="text-gray-500">Play some matches to see your rankings here.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyStatsPage;