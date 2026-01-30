import React, { useState, useEffect } from 'react';
import {
  Trophy, Target, Users, TrendingUp, Award, Medal,
  BarChart3, Activity, Star, Crown, Zap
} from 'lucide-react';
import { Card } from '@/design-system/components/Card';
import { profileService } from '@/services/profileService';

interface PlayerStats {
  // General stats
  tournaments_played: number;
  tournaments_won: number;
  matches_played: number;
  matches_won: number;
  win_rate: number;
  
  // Futsal-specific stats
  total_goals?: number;
  total_assists?: number;
  goals_per_match?: number;
  assists_per_match?: number;
  futsal_ranking?: number;
  
  // Badminton-specific stats
  sets_won?: number;
  sets_lost?: number;
  set_win_rate?: number;
  singles_ranking?: number;
  doubles_ranking?: number;
  
  // Rankings
  overall_ranking?: number;
  sport_rankings?: {
    [sport: string]: {
      ranking: number;
      total_players: number;
      percentile: number;
    };
  };
}

interface PlayerStatsCardProps {
  playerId?: string;
  sport?: 'FUTSAL' | 'BADMINTON' | 'ALL';
  showRankings?: boolean;
}

export default function PlayerStatsCard({ 
  playerId, 
  sport = 'ALL', 
  showRankings = true 
}: PlayerStatsCardProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlayerStats();
  }, [playerId, sport]);

  const loadPlayerStats = async () => {
    try {
      setLoading(true);
      const response = await profileService.getPlayerStats(playerId, sport);
      setStats(response.stats);
    } catch (err: any) {
      setError(err.message || 'Failed to load player statistics');
    } finally {
      setLoading(false);
    }
  };

  const getRankingColor = (ranking: number, total: number) => {
    const percentile = ((total - ranking + 1) / total) * 100;
    if (percentile >= 90) return 'text-yellow-600 bg-yellow-50';
    if (percentile >= 75) return 'text-purple-600 bg-purple-50';
    if (percentile >= 50) return 'text-blue-600 bg-blue-50';
    if (percentile >= 25) return 'text-green-600 bg-green-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getRankingIcon = (ranking: number, total: number) => {
    const percentile = ((total - ranking + 1) / total) * 100;
    if (percentile >= 90) return <Crown className="h-4 w-4" />;
    if (percentile >= 75) return <Trophy className="h-4 w-4" />;
    if (percentile >= 50) return <Medal className="h-4 w-4" />;
    return <Star className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <Activity className="h-8 w-8 mx-auto mb-2" />
          <p>No statistics available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Player Statistics</h3>
        <div className="flex items-center gap-2">
          {sport === 'ALL' && (
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
              All Sports
            </span>
          )}
          {sport !== 'ALL' && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
              {sport}
            </span>
          )}
        </div>
      </div>

      {/* General Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <Trophy className="h-6 w-6 text-purple-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-purple-600">
            {stats.tournaments_played}
          </div>
          <div className="text-xs text-gray-600">Tournaments</div>
        </div>

        <div className="text-center p-3 bg-green-50 rounded-lg">
          <Award className="h-6 w-6 text-green-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-green-600">
            {stats.tournaments_won}
          </div>
          <div className="text-xs text-gray-600">Won</div>
        </div>

        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <Target className="h-6 w-6 text-blue-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-blue-600">
            {stats.matches_played}
          </div>
          <div className="text-xs text-gray-600">Matches</div>
        </div>

        <div className="text-center p-3 bg-amber-50 rounded-lg">
          <TrendingUp className="h-6 w-6 text-amber-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-amber-600">
            {stats.win_rate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-600">Win Rate</div>
        </div>
      </div>

      {/* Sport-Specific Statistics */}
      {(sport === 'FUTSAL' || sport === 'ALL') && stats.total_goals !== undefined && (
        <div className="mb-6">
          <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-500" />
            Futsal Statistics
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-xl font-bold text-orange-600">
                {stats.total_goals}
              </div>
              <div className="text-xs text-gray-600">Total Goals</div>
            </div>
            <div className="text-center p-3 bg-cyan-50 rounded-lg">
              <div className="text-xl font-bold text-cyan-600">
                {stats.total_assists}
              </div>
              <div className="text-xs text-gray-600">Total Assists</div>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-lg">
              <div className="text-xl font-bold text-emerald-600">
                {stats.goals_per_match?.toFixed(1)}
              </div>
              <div className="text-xs text-gray-600">Goals/Match</div>
            </div>
            <div className="text-center p-3 bg-teal-50 rounded-lg">
              <div className="text-xl font-bold text-teal-600">
                {stats.assists_per_match?.toFixed(1)}
              </div>
              <div className="text-xs text-gray-600">Assists/Match</div>
            </div>
          </div>
        </div>
      )}

      {(sport === 'BADMINTON' || sport === 'ALL') && stats.sets_won !== undefined && (
        <div className="mb-6">
          <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-500" />
            Badminton Statistics
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="text-center p-3 bg-indigo-50 rounded-lg">
              <div className="text-xl font-bold text-indigo-600">
                {stats.sets_won}
              </div>
              <div className="text-xs text-gray-600">Sets Won</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-xl font-bold text-red-600">
                {stats.sets_lost}
              </div>
              <div className="text-xs text-gray-600">Sets Lost</div>
            </div>
            <div className="text-center p-3 bg-violet-50 rounded-lg">
              <div className="text-xl font-bold text-violet-600">
                {stats.set_win_rate?.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600">Set Win Rate</div>
            </div>
          </div>
        </div>
      )}

      {/* Rankings */}
      {showRankings && stats.sport_rankings && (
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Medal className="h-4 w-4 text-yellow-500" />
            Rankings
          </h4>
          <div className="space-y-2">
            {Object.entries(stats.sport_rankings).map(([sportName, ranking]) => (
              <div key={sportName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {getRankingIcon(ranking.ranking, ranking.total_players)}
                  <span className="font-medium text-gray-900">{sportName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-sm font-medium ${getRankingColor(ranking.ranking, ranking.total_players)}`}>
                    #{ranking.ranking}
                  </span>
                  <span className="text-sm text-gray-500">
                    of {ranking.total_players}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({ranking.percentile.toFixed(0)}th percentile)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Indicators */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Performance Level</span>
          <div className="flex items-center gap-2">
            {stats.win_rate >= 80 && <Crown className="h-4 w-4 text-yellow-500" />}
            {stats.win_rate >= 60 && stats.win_rate < 80 && <Trophy className="h-4 w-4 text-purple-500" />}
            {stats.win_rate >= 40 && stats.win_rate < 60 && <Medal className="h-4 w-4 text-blue-500" />}
            {stats.win_rate < 40 && <Star className="h-4 w-4 text-gray-500" />}
            <span className="font-medium">
              {stats.win_rate >= 80 ? 'Elite' :
               stats.win_rate >= 60 ? 'Advanced' :
               stats.win_rate >= 40 ? 'Intermediate' : 'Developing'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}