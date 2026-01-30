import { Trophy, TrendingUp, Target, Award } from 'lucide-react';

interface SportRanking {
  ranking: number;
  total_players: number;
  percentile: number;
  matches_played: number;
  matches_won: number;
  win_rate: number;
  total_goals?: number;
  total_assists?: number;
  goals_per_match?: number;
  assists_per_match?: number;
  sets_won?: number;
  sets_lost?: number;
  set_win_rate?: number;
}

interface SportRankingsCardProps {
  sportRankings: Record<string, SportRanking>;
}

export default function SportRankingsCard({ sportRankings }: SportRankingsCardProps) {
  if (!sportRankings || Object.keys(sportRankings).length === 0) {
    return null;
  }

  const getSportIcon = (sport: string) => {
    switch (sport) {
      case 'FUTSAL':
        return '⚽';
      case 'BADMINTON':
        return '🏸';
      default:
        return '🏆';
    }
  };

  const getSportName = (sport: string) => {
    return sport.charAt(0) + sport.slice(1).toLowerCase();
  };

  const getRankColor = (percentile: number) => {
    if (percentile >= 90) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (percentile >= 75) return 'text-purple-600 bg-purple-50 border-purple-200';
    if (percentile >= 50) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Sport Rankings</h3>
          <p className="text-xs text-gray-500 mt-0.5">Your performance across different sports</p>
        </div>
        <Trophy className="h-6 w-6 text-purple-600" />
      </div>

      <div className="space-y-4">
        {Object.entries(sportRankings).map(([sport, ranking]) => (
          <div key={sport} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            {/* Sport Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{getSportIcon(sport)}</div>
                <div>
                  <h4 className="font-semibold text-gray-900">{getSportName(sport)}</h4>
                  <p className="text-xs text-gray-500">{ranking.matches_played} matches played</p>
                </div>
              </div>
              <div className={`px-3 py-1.5 rounded-lg border ${getRankColor(ranking.percentile)}`}>
                <div className="text-center">
                  <p className="text-lg font-bold">#{ranking.ranking}</p>
                  <p className="text-xs">of {ranking.total_players}</p>
                </div>
              </div>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-gray-600">Win Rate</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{ranking.win_rate.toFixed(1)}%</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="h-4 w-4 text-purple-600" />
                  <span className="text-xs text-gray-600">Wins</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{ranking.matches_won}</p>
              </div>
            </div>

            {/* Sport-Specific Stats */}
            {sport === 'FUTSAL' && ranking.total_goals !== undefined && (
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-600">⚽ Goals</span>
                  </div>
                  <p className="text-base font-semibold text-gray-900">
                    {ranking.total_goals}
                    <span className="text-xs text-gray-500 ml-1">
                      ({ranking.goals_per_match?.toFixed(1)}/match)
                    </span>
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-600">🎯 Assists</span>
                  </div>
                  <p className="text-base font-semibold text-gray-900">
                    {ranking.total_assists}
                    <span className="text-xs text-gray-500 ml-1">
                      ({ranking.assists_per_match?.toFixed(1)}/match)
                    </span>
                  </p>
                </div>
              </div>
            )}

            {sport === 'BADMINTON' && ranking.sets_won !== undefined && (
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-600">🏸 Sets Won</span>
                  </div>
                  <p className="text-base font-semibold text-gray-900">{ranking.sets_won}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-600">📊 Set Win Rate</span>
                  </div>
                  <p className="text-base font-semibold text-gray-900">
                    {ranking.set_win_rate?.toFixed(1)}%
                  </p>
                </div>
              </div>
            )}

            {/* Percentile Badge */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Performance Percentile</span>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-600">
                    Top {(100 - ranking.percentile).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
