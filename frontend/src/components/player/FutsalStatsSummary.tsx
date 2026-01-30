import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/components/Card';
import { Target, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FutsalStats {
  total_matches: number;
  total_goals: number;
  total_assists: number;
  goals_per_match: number;
  assists_per_match: number;
  recent_form: Array<{
    result: 'W' | 'L' | 'D';
  }>;
}

interface FutsalStatsSummaryProps {
  stats: FutsalStats;
}

export const FutsalStatsSummary: React.FC<FutsalStatsSummaryProps> = ({ stats }) => {
  const navigate = useNavigate();

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
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Futsal Stats Summary
          </div>
          <button
            onClick={() => navigate('/my-stats')}
            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            View Details
            <ArrowRight className="h-4 w-4" />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.total_goals}</div>
            <div className="text-xs text-green-600">Goals</div>
            <div className="text-xs text-gray-500">{stats.goals_per_match.toFixed(1)}/match</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.total_assists}</div>
            <div className="text-xs text-blue-600">Assists</div>
            <div className="text-xs text-gray-500">{stats.assists_per_match.toFixed(1)}/match</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{stats.total_matches}</div>
            <div className="text-xs text-purple-600">Matches</div>
            <div className="text-xs text-gray-500">Played</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{stats.total_goals + stats.total_assists}</div>
            <div className="text-xs text-orange-600">G+A</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
        </div>

        {/* Recent Form */}
        {stats.recent_form && stats.recent_form.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">Recent Form</h4>
              <div className="flex gap-1">
                {stats.recent_form.slice(0, 5).map((match, index) => (
                  <div
                    key={index}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${getFormColor(match.result)}`}
                  >
                    {match.result}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Action */}
        <button
          onClick={() => navigate('/my-stats')}
          className="w-full mt-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 px-4 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <TrendingUp className="h-4 w-4" />
          View Detailed Statistics
        </button>
      </CardContent>
    </Card>
  );
};

export default FutsalStatsSummary;