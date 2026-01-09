import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Trophy,
  Target,
  Users,
  Calendar,
  Award,
  Zap,
  BarChart3,
  PieChart,
  Activity,
  Star,
  Medal,
  Crown,
} from 'lucide-react';
import { Card } from '@/design-system/components/Card';
import { LineChart } from '@/components/charts/LineChart';
import { BarChart } from '@/components/charts/BarChart';
import { PieChart as PieChartComponent } from '@/components/charts/PieChart';
import { LinearProgress } from '@/components/charts/ProgressIndicator';

export interface PlayerStats {
  totalTournaments: number;
  tournamentsWon: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  totalMatches: number;
  matchesWon: number;
  matchWinRate: number;
  averageRank: number;
  totalPoints: number;
  skillRating: number;
  skillTrend: 'up' | 'down' | 'stable';
  recentPerformance: Array<{
    date: string;
    tournament: string;
    rank: number;
    points: number;
  }>;
  sportBreakdown: Array<{
    sport: string;
    tournaments: number;
    winRate: number;
    points: number;
  }>;
  monthlyProgress: Array<{
    month: string;
    tournaments: number;
    wins: number;
    points: number;
  }>;
  achievements: {
    total: number;
    recent: Array<{
      title: string;
      unlockedAt: string;
      points: number;
    }>;
  };
}

interface PerformanceStatsCardProps {
  stats: PlayerStats;
  timeframe?: '1M' | '3M' | '6M' | '1Y' | 'ALL';
  onTimeframeChange?: (timeframe: string) => void;
}

export default function PerformanceStatsCard({
  stats,
  timeframe = '3M',
  onTimeframeChange
}: PerformanceStatsCardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'sports' | 'achievements'>('overview');
  const [animatedStats, setAnimatedStats] = useState({
    totalTournaments: 0,
    tournamentsWon: 0,
    winRate: 0,
    skillRating: 0,
  });

  // Animate numbers on mount
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);

      setAnimatedStats({
        totalTournaments: Math.round(stats.totalTournaments * easeOutQuart),
        tournamentsWon: Math.round(stats.tournamentsWon * easeOutQuart),
        winRate: Math.round(stats.winRate * easeOutQuart),
        skillRating: Math.round(stats.skillRating * easeOutQuart),
      });

      if (currentStep >= steps) {
        clearInterval(timer);
        setAnimatedStats({
          totalTournaments: stats.totalTournaments,
          tournamentsWon: stats.tournamentsWon,
          winRate: stats.winRate,
          skillRating: stats.skillRating,
        });
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [stats]);

  const getSkillRatingColor = (rating: number) => {
    if (rating >= 2000) return 'text-purple-600';
    if (rating >= 1500) return 'text-blue-600';
    if (rating >= 1000) return 'text-emerald-600';
    if (rating >= 500) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getSkillRatingLabel = (rating: number) => {
    if (rating >= 2000) return 'Master';
    if (rating >= 1500) return 'Expert';
    if (rating >= 1000) return 'Advanced';
    if (rating >= 500) return 'Intermediate';
    return 'Beginner';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const timeframeOptions = [
    { value: '1M', label: '1 Month' },
    { value: '3M', label: '3 Months' },
    { value: '6M', label: '6 Months' },
    { value: '1Y', label: '1 Year' },
    { value: 'ALL', label: 'All Time' },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'trends', label: 'Trends', icon: TrendingUp },
    { id: 'sports', label: 'Sports', icon: PieChart },
    { id: 'achievements', label: 'Achievements', icon: Award },
  ];

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Dashboard</h2>
          <p className="text-gray-600">Track your tournament progress and achievements</p>
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

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 rounded-lg">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-900">{animatedStats.totalTournaments}</p>
              <p className="text-sm text-emerald-700">Tournaments Played</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-900">{animatedStats.tournamentsWon}</p>
              <p className="text-sm text-amber-700">Tournaments Won</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-900">{animatedStats.winRate}%</p>
              <p className="text-sm text-blue-700">Win Rate</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Star className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${getSkillRatingColor(animatedStats.skillRating)}`}>
                {animatedStats.skillRating}
              </p>
              <p className="text-sm text-purple-700">
                {getSkillRatingLabel(stats.skillRating)} Rating
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
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
          {/* Current Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-emerald-500" />
                Current Performance
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Skill Rating</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${getSkillRatingColor(stats.skillRating)}`}>
                      {stats.skillRating}
                    </span>
                    {getTrendIcon(stats.skillTrend)}
                  </div>
                </div>
                <LinearProgress
                  value={stats.skillRating}
                  max={2500}
                  color="success"
                  showPercentage={false}
                />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Current Streak</span>
                  <span className="font-semibold text-gray-900">{stats.currentStreak} wins</span>
                </div>
                <LinearProgress
                  value={stats.currentStreak}
                  max={stats.bestStreak}
                  color="warning"
                  showPercentage={false}
                />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Match Win Rate</span>
                  <span className="font-semibold text-gray-900">{stats.matchWinRate}%</span>
                </div>
                <LinearProgress
                  value={stats.matchWinRate}
                  max={100}
                  color="primary"
                />
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Medal className="h-5 w-5 text-amber-500" />
                Recent Achievements
              </h3>
              <div className="space-y-3">
                {stats.achievements.recent.map((achievement, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <div className="p-1 bg-amber-100 rounded">
                      <Award className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{achievement.title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(achievement.unlockedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-emerald-600">
                      +{achievement.points}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Recent Performance */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Recent Tournament Results
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-gray-600">Date</th>
                    <th className="text-left py-2 text-gray-600">Tournament</th>
                    <th className="text-center py-2 text-gray-600">Rank</th>
                    <th className="text-right py-2 text-gray-600">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentPerformance.map((result, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 text-gray-600">
                        {new Date(result.date).toLocaleDateString()}
                      </td>
                      <td className="py-2 font-medium text-gray-900">{result.tournament}</td>
                      <td className="py-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          result.rank === 1 
                            ? 'bg-yellow-100 text-yellow-800'
                            : result.rank <= 3
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          #{result.rank}
                        </span>
                      </td>
                      <td className="py-2 text-right font-medium text-emerald-600">
                        +{result.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="space-y-6">
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Monthly Progress</h3>
            <LineChart
              data={{
                labels: stats.monthlyProgress.map(m => m.month),
                datasets: [
                  {
                    label: 'Tournaments',
                    data: stats.monthlyProgress.map(m => m.tournaments),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  },
                  {
                    label: 'Wins',
                    data: stats.monthlyProgress.map(m => m.wins),
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
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
                  },
                },
              }}
            />
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Points Earned</h3>
            <BarChart
              data={{
                labels: stats.monthlyProgress.map(m => m.month),
                datasets: [
                  {
                    label: 'Points',
                    data: stats.monthlyProgress.map(m => m.points),
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgb(16, 185, 129)',
                    borderWidth: 1,
                  }
                ]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </Card>
        </div>
      )}

      {activeTab === 'sports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Sport Distribution</h3>
              <PieChartComponent
                data={{
                  labels: stats.sportBreakdown.map(s => s.sport),
                  datasets: [
                    {
                      data: stats.sportBreakdown.map(s => s.tournaments),
                      backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                      ],
                      borderColor: [
                        'rgb(59, 130, 246)',
                        'rgb(16, 185, 129)',
                        'rgb(245, 158, 11)',
                        'rgb(239, 68, 68)',
                        'rgb(139, 92, 246)',
                      ],
                      borderWidth: 2,
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom' as const,
                    },
                  },
                }}
              />
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Performance by Sport</h3>
              <div className="space-y-4">
                {stats.sportBreakdown.map((sport, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{sport.sport}</span>
                      <span className="text-sm text-gray-600">{sport.winRate}% win rate</span>
                    </div>
                    <LinearProgress
                      value={sport.winRate}
                      max={100}
                      color="success"
                    />
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{sport.tournaments} tournaments</span>
                      <span>{sport.points} points</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <Award className="h-8 w-8 text-amber-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.achievements.total}</p>
              <p className="text-sm text-gray-600">Total Achievements</p>
            </Card>

            <Card className="p-4 text-center">
              <Star className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.totalPoints}</p>
              <p className="text-sm text-gray-600">Total Points</p>
            </Card>

            <Card className="p-4 text-center">
              <Trophy className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {getSkillRatingLabel(stats.skillRating)}
              </p>
              <p className="text-sm text-gray-600">Current Rank</p>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Recent Achievements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.achievements.recent.map((achievement, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Award className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{achievement.title}</p>
                    <p className="text-sm text-gray-500">
                      Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-emerald-600">
                    +{achievement.points}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
}