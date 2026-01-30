import React, { useState, useEffect } from 'react';
import {
  Trophy, Medal, Crown, Target, Zap, BarChart3,
  TrendingUp, Users, Award, Star, ChevronDown, ChevronUp
} from 'lucide-react';
import { Card } from '@/design-system/components/Card';
import { profileService } from '@/services/profileService';

interface LeaderboardEntry {
  player_id: string;
  player_name: string;
  profile_picture?: string;
  rank: number;
  
  // General stats
  tournaments_played: number;
  tournaments_won: number;
  win_rate: number;
  
  // Futsal-specific
  total_goals?: number;
  total_assists?: number;
  goals_per_match?: number;
  assists_per_match?: number;
  
  // Badminton-specific
  sets_won?: number;
  sets_lost?: number;
  set_win_rate?: number;
  
  // Performance score for ranking
  performance_score: number;
}

interface SportLeaderboardProps {
  sport: 'FUTSAL' | 'BADMINTON';
  category?: 'overall' | 'goals' | 'assists' | 'wins' | 'sets';
  limit?: number;
  showFullRankings?: boolean;
}

export default function SportLeaderboard({
  sport,
  category = 'overall',
  limit = 10,
  showFullRankings = false
}: SportLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, [sport, category]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await profileService.getSportLeaderboard(sport, category, limit);
      setLeaderboard(response.leaderboard);
    } catch (err: any) {
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2: return <Trophy className="h-5 w-5 text-gray-400" />;
      case 3: return <Medal className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-sm font-bold text-gray-500">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 2: return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
      case 3: return 'bg-gradient-to-r from-amber-400 to-amber-600 text-white';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getCategoryIcon = () => {
    switch (category) {
      case 'goals': return <Target className="h-4 w-4" />;
      case 'assists': return <Users className="h-4 w-4" />;
      case 'wins': return <Trophy className="h-4 w-4" />;
      case 'sets': return <BarChart3 className="h-4 w-4" />;
      default: return <Award className="h-4 w-4" />;
    }
  };

  const getCategoryTitle = () => {
    const sportName = sport.charAt(0) + sport.slice(1).toLowerCase();
    switch (category) {
      case 'goals': return `${sportName} Top Scorers`;
      case 'assists': return `${sportName} Assist Leaders`;
      case 'wins': return `${sportName} Win Leaders`;
      case 'sets': return `${sportName} Set Win Leaders`;
      default: return `${sportName} Overall Rankings`;
    }
  };

  const getCategoryValue = (entry: LeaderboardEntry) => {
    switch (category) {
      case 'goals': return entry.total_goals || 0;
      case 'assists': return entry.total_assists || 0;
      case 'wins': return entry.tournaments_won;
      case 'sets': return entry.sets_won || 0;
      default: return entry.performance_score;
    }
  };

  const getCategoryLabel = () => {
    switch (category) {
      case 'goals': return 'Goals';
      case 'assists': return 'Assists';
      case 'wins': return 'Wins';
      case 'sets': return 'Sets Won';
      default: return 'Score';
    }
  };

  const displayedEntries = expanded || showFullRankings ? leaderboard : leaderboard.slice(0, 5);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="h-6 w-12 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (error || leaderboard.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <BarChart3 className="h-8 w-8 mx-auto mb-2" />
          <p>No leaderboard data available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {getCategoryIcon()}
          <h3 className="text-lg font-semibold text-gray-900">
            {getCategoryTitle()}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
            {sport}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {displayedEntries.map((entry, index) => (
          <div
            key={entry.player_id}
            className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
              entry.rank <= 3 ? 'bg-gradient-to-r from-gray-50 to-white border border-gray-200' : 'hover:bg-gray-50'
            }`}
          >
            {/* Rank */}
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${getRankBadgeColor(entry.rank)}`}>
              {getRankIcon(entry.rank)}
            </div>

            {/* Player Info */}
            <div className="flex items-center gap-3 flex-1">
              {entry.profile_picture ? (
                <img
                  src={entry.profile_picture}
                  alt={entry.player_name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-purple-600">
                    {entry.player_name.charAt(0)}
                  </span>
                </div>
              )}
              
              <div className="flex-1">
                <p className="font-medium text-gray-900">{entry.player_name}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{entry.tournaments_played} tournaments</span>
                  <span>{entry.win_rate.toFixed(1)}% win rate</span>
                  {sport === 'FUTSAL' && category === 'overall' && (
                    <>
                      <span>{entry.total_goals} goals</span>
                      <span>{entry.total_assists} assists</span>
                    </>
                  )}
                  {sport === 'BADMINTON' && category === 'overall' && (
                    <span>{entry.sets_won} sets won</span>
                  )}
                </div>
              </div>
            </div>

            {/* Category Value */}
            <div className="text-right">
              <div className="text-xl font-bold text-gray-900">
                {getCategoryValue(entry)}
              </div>
              <div className="text-xs text-gray-500">
                {getCategoryLabel()}
              </div>
            </div>

            {/* Performance Indicator */}
            {entry.rank <= 3 && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <Star className="h-4 w-4 text-yellow-500" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Expand/Collapse Button */}
      {!showFullRankings && leaderboard.length > 5 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 mx-auto px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show More ({leaderboard.length - 5} more)
              </>
            )}
          </button>
        </div>
      )}

      {/* Footer Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Total Players: {leaderboard.length}</span>
          <span>Updated: {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </Card>
  );
}