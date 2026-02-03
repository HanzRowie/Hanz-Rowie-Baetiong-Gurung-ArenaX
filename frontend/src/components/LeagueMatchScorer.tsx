import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { PlayerStatsInput, type PlayerStat } from './PlayerStatsInput';

interface Player {
  id: string;
  name: string;
  full_name: string;
}

interface Match {
  id: string;
  tournament: {
    id: string;
    title: string;
    sport_type: string;
    tournament_type?: string;
  };
  round_number: number;
  match_number: number;
  status: string;
  team1?: {
    id: string;
    name: string;
  };
  team2?: {
    id: string;
    name: string;
  };
  team1_score?: number;
  team2_score?: number;
  team1_members?: Player[];
  team2_members?: Player[];
}

interface LeagueMatchScorerProps {
  match: Match;
  onSubmit: (data: {
    home_score: number;
    away_score: number;
    player_stats: PlayerStat[];
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isReadOnly?: boolean;
}

export const LeagueMatchScorer: React.FC<LeagueMatchScorerProps> = ({
  match,
  onSubmit,
  onCancel,
  isLoading = false,
  isReadOnly = false
}) => {
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);
  const [homePlayerStats, setHomePlayerStats] = useState<PlayerStat[]>([]);
  const [awayPlayerStats, setAwayPlayerStats] = useState<PlayerStat[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const homeTeamName = match.team1?.name || 'Home Team';
  const awayTeamName = match.team2?.name || 'Away Team';
  const homePlayers: Player[] = match.team1_members || [];
  const awayPlayers: Player[] = match.team2_members || [];

  // Load existing scores if available
  useEffect(() => {
    if (match.team1_score !== undefined && match.team1_score !== null) {
      setHomeScore(match.team1_score);
    }
    if (match.team2_score !== undefined && match.team2_score !== null) {
      setAwayScore(match.team2_score);
    }
  }, [match]);

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    // Validate scores are non-negative integers
    if (homeScore < 0) {
      newErrors.push('Home score must be a non-negative number (0 or greater)');
    }
    if (awayScore < 0) {
      newErrors.push('Away score must be a non-negative number (0 or greater)');
    }
    if (!Number.isInteger(homeScore)) {
      newErrors.push('Home score must be a whole number');
    }
    if (!Number.isInteger(awayScore)) {
      newErrors.push('Away score must be a whole number');
    }

    // Validate player goals sum equals team score
    const homeGoalsSum = homePlayerStats.reduce((sum, stat) => sum + stat.goals, 0);
    const awayGoalsSum = awayPlayerStats.reduce((sum, stat) => sum + stat.goals, 0);

    if (homeGoalsSum !== homeScore) {
      newErrors.push(`Home team: Sum of player goals (${homeGoalsSum}) must equal team score (${homeScore})`);
    }
    if (awayGoalsSum !== awayScore) {
      newErrors.push(`Away team: Sum of player goals (${awayGoalsSum}) must equal team score (${awayScore})`);
    }

    // Validate all player stats have a player selected
    homePlayerStats.forEach((stat, index) => {
      if (!stat.player_id) {
        newErrors.push(`Home team player ${index + 1}: Player must be selected`);
      }
      // Validate non-negative goals and assists
      if (stat.goals < 0) {
        newErrors.push(`Home team player ${index + 1}: Goals cannot be negative`);
      }
      if (stat.assists < 0) {
        newErrors.push(`Home team player ${index + 1}: Assists cannot be negative`);
      }
    });
    awayPlayerStats.forEach((stat, index) => {
      if (!stat.player_id) {
        newErrors.push(`Away team player ${index + 1}: Player must be selected`);
      }
      // Validate non-negative goals and assists
      if (stat.goals < 0) {
        newErrors.push(`Away team player ${index + 1}: Goals cannot be negative`);
      }
      if (stat.assists < 0) {
        newErrors.push(`Away team player ${index + 1}: Assists cannot be negative`);
      }
    });

    // Validate no duplicate players
    const homePlayerIds = homePlayerStats.map(s => s.player_id).filter(id => id);
    const awayPlayerIds = awayPlayerStats.map(s => s.player_id).filter(id => id);
    
    if (new Set(homePlayerIds).size !== homePlayerIds.length) {
      newErrors.push('Home team: Each player can only be selected once');
    }
    if (new Set(awayPlayerIds).size !== awayPlayerIds.length) {
      newErrors.push('Away team: Each player can only be selected once');
    }

    // Validate that if there are player stats, at least one player is selected
    if (homeScore > 0 && homePlayerStats.length === 0) {
      newErrors.push('Home team: Please add player statistics for goals scored');
    }
    if (awayScore > 0 && awayPlayerStats.length === 0) {
      newErrors.push('Away team: Please add player statistics for goals scored');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix validation errors');
      return;
    }

    // Combine player stats from both teams
    const allPlayerStats = [...homePlayerStats, ...awayPlayerStats];

    onSubmit({
      home_score: homeScore,
      away_score: awayScore,
      player_stats: allPlayerStats
    });
  };

  return (
    <div className="flex flex-col h-[85vh] max-h-[800px]">
      {/* Fixed Header */}
      <div className="flex-none p-6 border-b border-gray-200 bg-white">
        <div className="text-sm text-gray-600 mb-1">
          <span>ArenaX</span>
          <span className="mx-2">/</span>
          <span>{match.tournament?.title || 'League Tournament'}</span>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">Match #{match.match_number} Scoring</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {homeTeamName} vs. {awayTeamName}
          </h1>
          <p className="text-gray-500 text-sm">
            Record match result with individual player statistics.
          </p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <form id="league-match-score-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Score Input Section */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Match Score</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Home Score */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {homeTeamName} Score
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={homeScore}
                  onChange={(e) => setHomeScore(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 text-2xl font-bold border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isReadOnly}
                />
              </div>

              {/* Away Score */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {awayTeamName} Score
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={awayScore}
                  onChange={(e) => setAwayScore(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 text-2xl font-bold border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>

          {/* Player Statistics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Home Team Player Stats */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <PlayerStatsInput
                teamName={homeTeamName}
                teamScore={homeScore}
                availablePlayers={homePlayers}
                playerStats={homePlayerStats}
                onChange={setHomePlayerStats}
                disabled={isReadOnly}
              />
            </div>

            {/* Away Team Player Stats */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <PlayerStatsInput
                teamName={awayTeamName}
                teamScore={awayScore}
                availablePlayers={awayPlayers}
                playerStats={awayPlayerStats}
                onChange={setAwayPlayerStats}
                disabled={isReadOnly}
              />
            </div>
          </div>
        </form>
      </div>

      {/* Fixed Footer Actions */}
      {!isReadOnly && (
        <div className="flex-none p-6 border-t border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>

            <button
              type="submit"
              form="league-match-score-form"
              disabled={isLoading}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30"
            >
              {isLoading ? 'Submitting...' : 'Submit Result'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeagueMatchScorer;
