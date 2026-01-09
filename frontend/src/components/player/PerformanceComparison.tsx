import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Trophy,
  Target,
  BarChart3,
  PieChart,
  Award,
  Star,
  Crown,
  Medal,
  Zap,
  Activity,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { BarChart } from '@/components/charts/BarChart';
import { LineChart } from '@/components/charts/LineChart';
import { LinearProgress } from '@/components/charts/ProgressIndicator';

export interface PlayerComparison {
  playerId: string;
  playerName: string;
  avatar?: string;
  skillRating: number;
  winRate: number;
  totalTournaments: number;
  tournamentsWon: number;
  averageRank: number;
  totalPoints: number;
  recentForm: number[]; // Last 10 tournament results (1-10 ranking)
  strongestSports: Array<{
    sport: string;
    winRate: number;
    tournaments: number;
  }>;
  achievements: number;
  currentStreak: number;
  bestStreak: number;
}

export interface BenchmarkData {
  category: string;
  playerValue: number;
  averageValue: number;
  topPercentileValue: number;
  playerPercentile: number;
  trend: 'up' | 'down' | 'stable';
  improvement: number;
}

interface PerformanceComparisonProps {
  currentPlayer: PlayerComparison;
  comparisonPlayers?: PlayerComparison[];
  benchmarkData: BenchmarkData[];
  timeframe?: '1M' | '3M' | '6M' | '1Y';
  onTimeframeChange?: (timeframe: string) => void;
  onPlayerSelect?: (playerId: string) => void;
}

export default function PerformanceComparison({
  currentPlayer,
  comparisonPlayers = [],
  benchmarkData,
  timeframe = '3M',
  onTimeframeChange,
  onPlayerSelect
}: PerformanceComparisonProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed' | 'trends'>('overview');
  const [selectedMetric, setSelectedMetric] = useState<string>('skillRating');

  const getPerformanceColor = (percentile: number) => {
    if (percentile >= 90) return 'text-emerald-600';
    if (percentile >= 75) return 'text-blue-600';
    if (percentile >= 50) return 'text-yellow-600';
    if (percentile >= 25) return 'text-orange-600';
    return 'text-red-600';
  };

  const getPerformanceBadge = (percentile: number) => {
    if (percentile >= 95) return { label: 'Elite', color: 'bg-purple-100 text-purple-800 border-purple-200' };
    if (percentile >= 90) return { label: 'Excellent', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    if (percentile >= 75) return { label: 'Good', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    if (percentile >= 50) return { label: 'Average', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    if (percentile >= 25) return { label: 'Below Average', color: 'bg-orange-100 text-orange-800 border-orange-200' };
    return { label: 'Needs Improvement', color: 'bg-red-100 text-red-800 border-red-200' };
  };

  const getTrendIcon = (trend: string, improvement: number) => {
    if (trend === 'up') return <ArrowUp className="h-4 w-4 text-emerald-500" />;
    if (trend === 'down') return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getRecentFormTrend = (form: number[]) => {
    if (form.length < 2) return 'stable';
    const recent = form.slice(-3);
    const earlier = form.slice(-6, -3);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
    
    if (recentAvg < earlierAvg - 0.5) return 'up'; // Lower rank numbers are better
    if (recentAvg > earlierAvg + 0.5) return 'down';
    return 'stable';
  };

  const formatRecentForm = (form: number[]) => {
    return form.map(rank => {
      if (rank === 1) return 'W';
      if (rank <= 3) return 'P';
      if (rank <= 5) return 'A';
      return 'B';
    }).join('');
  };

  const timeframeOptions = [
    { value: '1M', label: '1 Month' },
    { value: '3M', label: '3 Months' },
    { value: '6M', label: '6 Months' },
    { value: '1Y', label: '1 Year' },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'detailed', label: 'Detailed', icon: Target },
    { id: 'trends', label: 'Trends', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Performance Comparison</h2>
            <p className="text-gray-600">Compare your performance against other players and benchmarks</p>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-2">
            {timeframeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onTimeframeChange?.(option.value)}
                className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                  timeframe === option.value
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Player Summary */}
        <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          {currentPlayer.avatar ? (
            <img
              src={currentPlayer.avatar}
              alt={currentPlayer.playerName}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-emerald-500 flex items-center justify-center">
              <span className="text-xl font-bold text-white">
                {currentPlayer.playerName.charAt(0)}
              </span>
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">{currentPlayer.playerName}</h3>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium text-gray-700">
                  {currentPlayer.skillRating} Rating
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-gray-700">
                  {currentPlayer.winRate}% Win Rate
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">
                  {currentPlayer.achievements} Achievements
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Recent Form</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-sm font-medium">
                {formatRecentForm(currentPlayer.recentForm)}
              </span>
              {getTrendIcon(getRecentFormTrend(currentPlayer.recentForm), 0)}
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Benchmark Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {benchmarkData.map((benchmark, index) => {
              const badge = getPerformanceBadge(benchmark.playerPercentile);
              
              return (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">{benchmark.category}</h3>
                    {getTrendIcon(benchmark.trend, benchmark.improvement)}
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-2xl font-bold text-gray-900">{benchmark.playerValue}</p>
                    <p className="text-xs text-gray-500">
                      Avg: {benchmark.averageValue} | Top 10%: {benchmark.topPercentileValue}
                    </p>
                  </div>

                  <div className="mb-3">
                    <LinearProgress
                      value={benchmark.playerPercentile}
                      max={100}
                      color="success"
                      size="sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {benchmark.playerPercentile}th percentile
                    </p>
                  </div>

                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
                    {badge.label}
                  </span>
                </Card>
              );
            })}
          </div>

          {/* Player Comparison */}
          {comparisonPlayers.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Player Comparison</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 text-gray-600">Player</th>
                      <th className="text-center py-3 text-gray-600">Rating</th>
                      <th className="text-center py-3 text-gray-600">Win Rate</th>
                      <th className="text-center py-3 text-gray-600">Tournaments</th>
                      <th className="text-center py-3 text-gray-600">Wins</th>
                      <th className="text-center py-3 text-gray-600">Avg Rank</th>
                      <th className="text-center py-3 text-gray-600">Recent Form</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Current Player */}
                    <tr className="border-b border-gray-100 bg-emerald-50">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          {currentPlayer.avatar ? (
                            <img
                              src={currentPlayer.avatar}
                              alt={currentPlayer.playerName}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center">
                              <span className="text-xs font-bold text-white">
                                {currentPlayer.playerName.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{currentPlayer.playerName}</p>
                            <p className="text-xs text-emerald-600">You</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-3 font-medium">{currentPlayer.skillRating}</td>
                      <td className="text-center py-3 font-medium">{currentPlayer.winRate}%</td>
                      <td className="text-center py-3">{currentPlayer.totalTournaments}</td>
                      <td className="text-center py-3">{currentPlayer.tournamentsWon}</td>
                      <td className="text-center py-3">{currentPlayer.averageRank.toFixed(1)}</td>
                      <td className="text-center py-3">
                        <span className="font-mono text-xs">
                          {formatRecentForm(currentPlayer.recentForm)}
                        </span>
                      </td>
                    </tr>

                    {/* Comparison Players */}
                    {comparisonPlayers.map((player) => (
                      <tr key={player.playerId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            {player.avatar ? (
                              <img
                                src={player.avatar}
                                alt={player.playerName}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center">
                                <span className="text-xs font-bold text-white">
                                  {player.playerName.charAt(0)}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{player.playerName}</p>
                              <p className="text-xs text-gray-500">Similar skill level</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-center py-3">
                          <span className={
                            player.skillRating > currentPlayer.skillRating 
                              ? 'text-red-600' 
                              : player.skillRating < currentPlayer.skillRating 
                              ? 'text-emerald-600' 
                              : 'text-gray-900'
                          }>
                            {player.skillRating}
                          </span>
                        </td>
                        <td className="text-center py-3">
                          <span className={
                            player.winRate > currentPlayer.winRate 
                              ? 'text-red-600' 
                              : player.winRate < currentPlayer.winRate 
                              ? 'text-emerald-600' 
                              : 'text-gray-900'
                          }>
                            {player.winRate}%
                          </span>
                        </td>
                        <td className="text-center py-3">{player.totalTournaments}</td>
                        <td className="text-center py-3">{player.tournamentsWon}</td>
                        <td className="text-center py-3">{player.averageRank.toFixed(1)}</td>
                        <td className="text-center py-3">
                          <span className="font-mono text-xs">
                            {formatRecentForm(player.recentForm)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'detailed' && (
        <div className="space-y-6">
          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Breakdown</h3>
              
              <BarChart
                data={{
                  labels: benchmarkData.map(b => b.category),
                  datasets: [
                    {
                      label: 'Your Performance',
                      data: benchmarkData.map(b => b.playerPercentile),
                      backgroundColor: 'rgba(16, 185, 129, 0.8)',
                      borderColor: 'rgb(16, 185, 129)',
                      borderWidth: 1,
                    },
                    {
                      label: 'Average',
                      data: benchmarkData.map(() => 50),
                      backgroundColor: 'rgba(156, 163, 175, 0.5)',
                      borderColor: 'rgb(156, 163, 175)',
                      borderWidth: 1,
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      title: {
                        display: true,
                        text: 'Percentile'
                      }
                    },
                  },
                }}
              />
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Strengths & Weaknesses</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-emerald-700 mb-2">Strengths</h4>
                  <div className="space-y-2">
                    {benchmarkData
                      .filter(b => b.playerPercentile >= 75)
                      .map((benchmark, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
                          <span className="text-sm font-medium text-emerald-800">{benchmark.category}</span>
                          <span className="text-sm text-emerald-600">{benchmark.playerPercentile}th percentile</span>
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-red-700 mb-2">Areas for Improvement</h4>
                  <div className="space-y-2">
                    {benchmarkData
                      .filter(b => b.playerPercentile < 50)
                      .map((benchmark, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                          <span className="text-sm font-medium text-red-800">{benchmark.category}</span>
                          <span className="text-sm text-red-600">{benchmark.playerPercentile}th percentile</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Sport-specific Performance */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sport-specific Performance</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentPlayer.strongestSports.map((sport, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">{sport.sport}</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Win Rate</span>
                      <span className="font-medium">{sport.winRate}%</span>
                    </div>
                    <LinearProgress
                      value={sport.winRate}
                      max={100}
                      color="success"
                      size="sm"
                    />
                    <p className="text-xs text-gray-500">{sport.tournaments} tournaments played</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
            
            <LineChart
              data={{
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [
                  {
                    label: 'Your Rating',
                    data: [1200, 1250, 1180, 1320, 1380, 1420],
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                  },
                  {
                    label: 'Average Rating',
                    data: [1100, 1120, 1110, 1150, 1160, 1170],
                    borderColor: 'rgb(156, 163, 175)',
                    backgroundColor: 'rgba(156, 163, 175, 0.1)',
                    tension: 0.4,
                  }
                ]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: false,
                    title: {
                      display: true,
                      text: 'Skill Rating'
                    }
                  },
                },
              }}
            />
          </Card>

          {/* Improvement Suggestions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Improvement Suggestions</h3>
            
            <div className="space-y-4">
              {benchmarkData
                .filter(b => b.playerPercentile < 75)
                .map((benchmark, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{benchmark.category}</h4>
                      <span className="text-sm text-gray-500">{benchmark.playerPercentile}th percentile</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      You're currently at {benchmark.playerValue}. The average is {benchmark.averageValue} and top performers achieve {benchmark.topPercentileValue}.
                    </p>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-blue-600">
                        Focus on improving this metric to reach the {Math.min(benchmark.playerPercentile + 25, 90)}th percentile
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}