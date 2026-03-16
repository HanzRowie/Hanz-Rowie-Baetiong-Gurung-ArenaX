import React, { useState } from 'react';
import { getAvatarUrl } from '@/utils/imageUtils';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { Trophy, Target, Users, TrendingUp, Award, Activity, Medal, BarChart3 } from 'lucide-react';

interface PlayerStat {
  rank: number;
  player_id: string;
  player_name: string;
  profile_picture: string | null;
  total_goals?: number;
  total_assists?: number;
  total_matches: number;
  avg_goals_per_match?: number;
  avg_assists_per_match?: number;
  goal_contribution?: number;
  total_minutes?: number;
  matches_won?: number;
  win_rate?: number;
  total_points_scored?: number;
  avg_points_per_match?: number;
}

interface OverallStats {
  total_matches: number;
  total_goals?: number;
  total_assists?: number;
  avg_goals_per_match?: number;
  avg_assists_per_match?: number;
  active_players: number;
  total_sets_played?: number;
}

interface Leaderboards {
  top_scorers?: PlayerStat[];
  top_assists?: PlayerStat[];
  most_matches?: PlayerStat[];
  best_contribution?: PlayerStat[];
  top_winners?: PlayerStat[];
  top_win_rate?: PlayerStat[];
}

interface SportStats {
  overall: OverallStats;
  leaderboards: Leaderboards;
}

interface StatisticsData {
  futsal: SportStats;
  badminton: SportStats;
}

const PlayerStatisticsPage: React.FC = () => {
  const [activeSport, setActiveSport] = useState<'futsal' | 'badminton'>('futsal');

  // Fetch global statistics
  const { data: statistics, isLoading, error } = useQuery<StatisticsData>({
    queryKey: ['globalStatistics'],
    queryFn: async () => {
      const response = await api.get('/api/accounts/statistics/global/');
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <p className="text-red-800">Failed to load statistics. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  const currentStats = activeSport === 'futsal' ? statistics?.futsal : statistics?.badminton;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Player Statistics</h1>
          <p className="text-gray-600 text-sm mt-1">
            Real-time performance data and leaderboards across all sports
          </p>
        </div>

        {/* Sport Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveSport('futsal')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeSport === 'futsal'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Activity className="w-4 h-4" />
              Futsal
            </button>
            <button
              onClick={() => setActiveSport('badminton')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeSport === 'badminton'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Target className="w-4 h-4" />
              Badminton
            </button>
          </div>
        </div>

        {/* Overall Statistics Cards */}
        {currentStats && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <StatCard
                icon={<Activity className="w-5 h-5" />}
                label="Total Matches"
                value={currentStats.overall.total_matches.toLocaleString()}
                color="purple"
              />
              {activeSport === 'futsal' && currentStats.overall.total_goals !== undefined && (
                <StatCard
                  icon={<Target className="w-5 h-5" />}
                  label="Total Goals"
                  value={currentStats.overall.total_goals.toLocaleString()}
                  color="green"
                />
              )}
              {activeSport === 'futsal' && currentStats.overall.total_assists !== undefined && (
                <StatCard
                  icon={<TrendingUp className="w-5 h-5" />}
                  label="Total Assists"
                  value={currentStats.overall.total_assists.toLocaleString()}
                  color="blue"
                />
              )}
              <StatCard
                icon={<Users className="w-5 h-5" />}
                label="Active Players"
                value={currentStats.overall.active_players.toLocaleString()}
                color="orange"
              />
            </div>

            {/* Average Statistics for Futsal */}
            {activeSport === 'futsal' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Avg Goals per Match
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {currentStats.overall.avg_goals_per_match?.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Target className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Avg Assists per Match
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {currentStats.overall.avg_assists_per_match?.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboards */}
            <div className="space-y-6">
              {activeSport === 'futsal' ? (
                <>
                  <LeaderboardSection
                    title="Top Goal Scorers"
                    icon={<Trophy className="w-5 h-5" />}
                    data={currentStats.leaderboards.top_scorers || []}
                    columns={[
                      { key: 'total_goals', label: 'Goals' },
                      { key: 'total_matches', label: 'Matches' },
                      { key: 'avg_goals_per_match', label: 'Avg/Match' },
                    ]}
                  />
                  <LeaderboardSection
                    title="Top Assist Providers"
                    icon={<TrendingUp className="w-5 h-5" />}
                    data={currentStats.leaderboards.top_assists || []}
                    columns={[
                      { key: 'total_assists', label: 'Assists' },
                      { key: 'total_matches', label: 'Matches' },
                      { key: 'avg_assists_per_match', label: 'Avg/Match' },
                    ]}
                  />
                  <LeaderboardSection
                    title="Most Matches Played"
                    icon={<Activity className="w-5 h-5" />}
                    data={currentStats.leaderboards.most_matches || []}
                    columns={[
                      { key: 'total_matches', label: 'Matches' },
                      { key: 'total_goals', label: 'Goals' },
                      { key: 'total_assists', label: 'Assists' },
                    ]}
                  />
                  <LeaderboardSection
                    title="Best Goal Contribution"
                    icon={<Award className="w-5 h-5" />}
                    data={currentStats.leaderboards.best_contribution || []}
                    columns={[
                      { key: 'goal_contribution', label: 'G+A' },
                      { key: 'total_goals', label: 'Goals' },
                      { key: 'total_assists', label: 'Assists' },
                    ]}
                  />
                </>
              ) : (
                <>
                  <LeaderboardSection
                    title="Most Wins"
                    icon={<Trophy className="w-5 h-5" />}
                    data={currentStats.leaderboards.top_winners || []}
                    columns={[
                      { key: 'matches_won', label: 'Wins' },
                      { key: 'total_matches', label: 'Matches' },
                      { key: 'win_rate', label: 'Win %', suffix: '%' },
                    ]}
                  />
                  <LeaderboardSection
                    title="Best Win Rate"
                    icon={<BarChart3 className="w-5 h-5" />}
                    data={currentStats.leaderboards.top_win_rate || []}
                    columns={[
                      { key: 'win_rate', label: 'Win %', suffix: '%' },
                      { key: 'matches_won', label: 'Wins' },
                      { key: 'total_matches', label: 'Matches' },
                    ]}
                    subtitle="Minimum 5 matches played"
                  />
                  <LeaderboardSection
                    title="Most Matches Played"
                    icon={<Activity className="w-5 h-5" />}
                    data={currentStats.leaderboards.most_matches || []}
                    columns={[
                      { key: 'total_matches', label: 'Matches' },
                      { key: 'matches_won', label: 'Wins' },
                      { key: 'win_rate', label: 'Win %', suffix: '%' },
                    ]}
                  />
                  <LeaderboardSection
                    title="Top Point Scorers"
                    icon={<Target className="w-5 h-5" />}
                    data={currentStats.leaderboards.top_scorers || []}
                    columns={[
                      { key: 'total_points_scored', label: 'Points' },
                      { key: 'avg_points_per_match', label: 'Avg/Match' },
                      { key: 'total_matches', label: 'Matches' },
                    ]}
                  />
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'purple' | 'green' | 'blue' | 'orange';
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => {
  const colorClasses = {
    purple: 'text-purple-600',
    green: 'text-green-600',
    blue: 'text-blue-600',
    orange: 'text-orange-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <div className={colorClasses[color]}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
};

// Leaderboard Section Component
interface LeaderboardSectionProps {
  title: string;
  icon: React.ReactNode;
  data: PlayerStat[];
  columns: { key: string; label: string; suffix?: string }[];
  subtitle?: string;
}

const LeaderboardSection: React.FC<LeaderboardSectionProps> = ({ title, icon, data, columns, subtitle }) => {
  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800';
    if (rank === 2) return 'bg-gray-200 text-gray-800';
    if (rank === 3) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-50 text-gray-700';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Player
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((player) => (
              <tr
                key={player.player_id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold ${getRankColor(player.rank)}`}>
                    {getRankBadge(player.rank)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {player.profile_picture ? (
                        <img
                          className="h-10 w-10 rounded-full object-cover"
                          src={getAvatarUrl(player.profile_picture)!}
                          alt={player.player_name}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                          {player.player_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {player.player_name}
                      </div>
                    </div>
                  </div>
                </td>
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-semibold text-gray-900">
                      {(player as any)[col.key]?.toLocaleString() || 0}
                      {col.suffix || ''}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="p-12 text-center">
          <Medal className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No data available yet</p>
        </div>
      )}
    </div>
  );
};

export default PlayerStatisticsPage;
