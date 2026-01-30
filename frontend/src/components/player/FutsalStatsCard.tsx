import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/components/Card';
import { Target, Users, Clock, TrendingUp, Award, AlertTriangle } from 'lucide-react';

interface FutsalStats {
  total_matches: number;
  total_goals: number;
  total_assists: number;
  total_minutes_played: number;
  goals_per_match: number;
  assists_per_match: number;
  minutes_per_match: number;
  shot_accuracy: number;
  pass_accuracy: number;
  total_shots_on_target: number;
  total_shots_off_target: number;
  total_tackles: number;
  total_interceptions: number;
  total_clearances: number;
  total_yellow_cards: number;
  total_red_cards: number;
  total_fouls_committed: number;
  total_fouls_suffered: number;
  recent_form: Array<{
    match_date: string;
    opponent: string;
    goals: number;
    assists: number;
    minutes_played: number;
    result: 'W' | 'L' | 'D';
  }>;
}

interface FutsalStatsCardProps {
  stats: FutsalStats;
  playerName: string;
}

export const FutsalStatsCard: React.FC<FutsalStatsCardProps> = ({ stats, playerName }) => {
  const StatItem = ({ 
    icon: Icon, 
    label, 
    value, 
    subValue, 
    color = 'text-gray-600' 
  }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    subValue?: string;
    color?: string;
  }) => (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className={`p-2 rounded-full bg-white ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="text-lg font-semibold text-gray-900">{value}</div>
        <div className="text-sm text-gray-600">{label}</div>
        {subValue && <div className="text-xs text-gray-500">{subValue}</div>}
      </div>
    </div>
  );

  const getFormColor = (result: 'W' | 'L' | 'D') => {
    switch (result) {
      case 'W': return 'bg-green-500';
      case 'L': return 'bg-red-500';
      case 'D': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-600" />
          {playerName} - Futsal Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Performance Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatItem
            icon={Target}
            label="Goals"
            value={stats.total_goals}
            subValue={`${stats.goals_per_match.toFixed(1)} per match`}
            color="text-green-600"
          />
          <StatItem
            icon={Users}
            label="Assists"
            value={stats.total_assists}
            subValue={`${stats.assists_per_match.toFixed(1)} per match`}
            color="text-blue-600"
          />
          <StatItem
            icon={Clock}
            label="Minutes"
            value={stats.total_minutes_played}
            subValue={`${stats.minutes_per_match.toFixed(0)} per match`}
            color="text-purple-600"
          />
          <StatItem
            icon={TrendingUp}
            label="Matches"
            value={stats.total_matches}
            subValue="Total played"
            color="text-orange-600"
          />
        </div>

        {/* Shooting & Passing Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Shooting Stats
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Shot Accuracy</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${Math.min(stats.shot_accuracy, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{stats.shot_accuracy.toFixed(1)}%</span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shots on Target</span>
                <span className="font-medium">{stats.total_shots_on_target}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shots off Target</span>
                <span className="font-medium">{stats.total_shots_off_target}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Passing Stats
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pass Accuracy</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${Math.min(stats.pass_accuracy, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{stats.pass_accuracy.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Defensive Stats */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Award className="h-4 w-4" />
            Defensive Stats
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-semibold text-blue-600">{stats.total_tackles}</div>
              <div className="text-xs text-blue-600">Tackles</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-semibold text-green-600">{stats.total_interceptions}</div>
              <div className="text-xs text-green-600">Interceptions</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-lg font-semibold text-purple-600">{stats.total_clearances}</div>
              <div className="text-xs text-purple-600">Clearances</div>
            </div>
          </div>
        </div>

        {/* Disciplinary Record */}
        {(stats.total_yellow_cards > 0 || stats.total_red_cards > 0) && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Disciplinary Record
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                <div>
                  <div className="text-lg font-semibold text-yellow-700">{stats.total_yellow_cards}</div>
                  <div className="text-xs text-yellow-600">Yellow Cards</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <div>
                  <div className="text-lg font-semibold text-red-700">{stats.total_red_cards}</div>
                  <div className="text-xs text-red-600">Red Cards</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Form */}
        {stats.recent_form && stats.recent_form.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Recent Form (Last 5 Matches)
            </h4>
            <div className="space-y-2">
              <div className="flex gap-1 mb-2">
                {stats.recent_form.slice(0, 5).map((match, index) => (
                  <div
                    key={index}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${getFormColor(match.result)}`}
                    title={`vs ${match.opponent}: ${match.goals}G ${match.assists}A (${match.minutes_played}min)`}
                  >
                    {match.result}
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                {stats.recent_form.slice(0, 3).map((match, index) => (
                  <div key={index} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">vs {match.opponent}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900">{match.goals}G {match.assists}A</span>
                      <div className={`w-4 h-4 rounded-full ${getFormColor(match.result)}`}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Performance Summary */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Performance Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Goal Contribution:</span>
              <span className="ml-2 font-medium">{(stats.total_goals + stats.total_assists)} G+A</span>
            </div>
            <div>
              <span className="text-gray-600">Avg. per 90min:</span>
              <span className="ml-2 font-medium">
                {((stats.total_goals + stats.total_assists) / (stats.total_minutes_played / 90)).toFixed(2)} G+A
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FutsalStatsCard;