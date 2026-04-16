import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { PlayerStatsInput, type PlayerStat } from './PlayerStatsInput';
import { api } from '@/services/api';

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
  team1?: { id: string; name: string };
  team2?: { id: string; name: string };
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
  isReadOnly = false,
}) => {
  const [homePlayerStats, setHomePlayerStats] = useState<PlayerStat[]>([]);
  const [awayPlayerStats, setAwayPlayerStats] = useState<PlayerStat[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [homePlayers, setHomePlayers] = useState<Player[]>(match.team1_members || []);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>(match.team2_members || []);

  const homeTeamName = match.team1?.name || 'Home Team';
  const awayTeamName = match.team2?.name || 'Away Team';

  // Derive scores from player stats — single source of truth
  const homeScore = homePlayerStats.reduce((sum, s) => sum + s.goals, 0);
  const awayScore = awayPlayerStats.reduce((sum, s) => sum + s.goals, 0);

  // Fetch team members if not provided
  useEffect(() => {
    const isFutsal = match.tournament?.sport_type === 'FUTSAL';
    if (!isFutsal) return;

    const fetchMembers = async (teamId: string, setter: (p: Player[]) => void) => {
      try {
        const res = await api.get(`/api/teams/${teamId}/members/`);
        const membersData = res.data.data || res.data.members || (Array.isArray(res.data) ? res.data : []);
        const members = membersData
          .map((m: any) => ({
            id: m.player?.id || m.id,
            name: m.player?.full_name || m.full_name || m.name,
            full_name: m.player?.full_name || m.full_name || m.name,
          }))
          .filter((p: Player) => p.id && p.name);
        if (members.length > 0) setter(members);
      } catch {
        // silently fail — user can still add stats manually
      }
    };

    if (match.team1?.id && (match.team1_members || []).length === 0) {
      fetchMembers(match.team1.id, setHomePlayers);
    }
    if (match.team2?.id && (match.team2_members || []).length === 0) {
      fetchMembers(match.team2.id, setAwayPlayers);
    }
  }, [match.team1?.id, match.team2?.id]);

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    homePlayerStats.forEach((stat, i) => {
      if (!stat.player_id) newErrors.push(`Home team player ${i + 1}: Select a player`);
      if (stat.goals < 0) newErrors.push(`Home team player ${i + 1}: Goals cannot be negative`);
      if (stat.assists < 0) newErrors.push(`Home team player ${i + 1}: Assists cannot be negative`);
    });

    awayPlayerStats.forEach((stat, i) => {
      if (!stat.player_id) newErrors.push(`Away team player ${i + 1}: Select a player`);
      if (stat.goals < 0) newErrors.push(`Away team player ${i + 1}: Goals cannot be negative`);
      if (stat.assists < 0) newErrors.push(`Away team player ${i + 1}: Assists cannot be negative`);
    });

    const homeIds = homePlayerStats.map(s => s.player_id).filter(Boolean);
    const awayIds = awayPlayerStats.map(s => s.player_id).filter(Boolean);
    if (new Set(homeIds).size !== homeIds.length) newErrors.push('Home team: Each player can only appear once');
    if (new Set(awayIds).size !== awayIds.length) newErrors.push('Away team: Each player can only appear once');

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix validation errors');
      return;
    }
    onSubmit({
      home_score: homeScore,
      away_score: awayScore,
      player_stats: [...homePlayerStats, ...awayPlayerStats],
    });
  };

  return (
    <div className="flex flex-col h-[85vh] max-h-[800px]">
      {/* Fixed Header */}
      <div className="flex-none p-6 border-b border-gray-200 bg-white">
        <div className="text-xs text-gray-500 mb-2">
          {match.tournament?.title || 'League Tournament'}
          <span className="mx-1.5">·</span>
          Round {match.round_number}, Match #{match.match_number}
        </div>

        {/* Live scoreboard */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-lg font-bold text-gray-900 truncate flex-1 text-right">{homeTeamName}</span>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-3xl font-black text-purple-700 tabular-nums w-8 text-center">{homeScore}</span>
            <span className="text-lg font-semibold text-gray-400">–</span>
            <span className="text-3xl font-black text-purple-700 tabular-nums w-8 text-center">{awayScore}</span>
          </div>
          <span className="text-lg font-bold text-gray-900 truncate flex-1 text-left">{awayTeamName}</span>
        </div>
        <p className="text-xs text-gray-400 text-center mt-1">Score updates as you add player goals below</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <form id="league-match-score-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Player Statistics — two columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <PlayerStatsInput
                teamName={homeTeamName}
                teamScore={homeScore}
                availablePlayers={homePlayers}
                playerStats={homePlayerStats}
                onChange={setHomePlayerStats}
                disabled={isReadOnly}
              />
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
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

          {/* Match Notes */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Match Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Add any notes about this match…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              disabled={isReadOnly}
            />
          </div>
        </form>
      </div>

      {/* Fixed Footer */}
      {!isReadOnly && (
        <div className="flex-none px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-between">
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
            {isLoading ? 'Submitting…' : 'Submit Result'}
          </button>
        </div>
      )}
    </div>
  );
};

export default LeagueMatchScorer;
