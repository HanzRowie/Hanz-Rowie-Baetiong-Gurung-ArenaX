import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { api } from '@/services/api';

interface Player {
  id: string;
  name: string;
  full_name: string;
}

interface GoalEvent {
  scorer_id: string;
  scorer_name?: string;
  assist_by_id?: string;
  assist_by_name?: string;
  minute: number;
  goal_type: 'REGULAR' | 'PENALTY' | 'FREE_KICK' | 'OWN_GOAL';
  description?: string;
}

interface TeamData {
  goals: number;
  shots_on_target: number;
  shots_off_target: number;
  possession_percentage?: number;
  fouls: number;
  yellow_cards: number;
  red_cards: number;
  player_stats: any[];
  goal_details: GoalEvent[];
  card_details: any[];
}

interface ModernFutsalScorerProps {
  match: any;
  onSubmit: (data: { home_team_data: TeamData; away_team_data: TeamData; is_final?: boolean }) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isReadOnly?: boolean;
}

export const ModernFutsalScorer: React.FC<ModernFutsalScorerProps> = ({
  match,
  onSubmit,
  onCancel,
  isLoading = false,
  isReadOnly = false
}) => {
  const [homeTeamData, setHomeTeamData] = useState<TeamData>({
    goals: 0,
    shots_on_target: 0,
    shots_off_target: 0,
    possession_percentage: 50,
    fouls: 0,
    yellow_cards: 0,
    red_cards: 0,
    player_stats: [],
    goal_details: [],
    card_details: []
  });

  const [awayTeamData, setAwayTeamData] = useState<TeamData>({
    goals: 0,
    shots_on_target: 0,
    shots_off_target: 0,
    possession_percentage: 50,
    fouls: 0,
    yellow_cards: 0,
    red_cards: 0,
    player_stats: [],
    goal_details: [],
    card_details: []
  });

  const [availablePlayers, setAvailablePlayers] = useState<{
    home: Player[];
    away: Player[];
  }>({
    home: [],
    away: []
  });

  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    loadTeamRosters();
  }, [match]);

  const loadTeamRosters = async () => {
    try {
      console.log('Loading team rosters for match:', match);

      // Use match details endpoint which includes team members for organizers
      if (match.team1_members && match.team2_members &&
        match.team1_members.length > 0 && match.team2_members.length > 0) {
        // Members already loaded from match details
        const homePlayers = match.team1_members.map((m: any) => ({
          id: m.id,
          name: m.full_name,
          full_name: m.full_name
        }));

        const awayPlayers = match.team2_members.map((m: any) => ({
          id: m.id,
          name: m.full_name,
          full_name: m.full_name
        }));

        console.log('Home players from match:', homePlayers);
        console.log('Away players from match:', awayPlayers);

        setAvailablePlayers({
          home: homePlayers,
          away: awayPlayers
        });

        // toast.success(`Loaded ${homePlayers.length} home players and ${awayPlayers.length} away players`);
      } else {
        console.warn('Team member data missing:', {
          team1_members: match.team1_members,
          team2_members: match.team2_members
        });
        
        let fetchedHomePlayers: Player[] = [];
        let fetchedAwayPlayers: Player[] = [];
        try {
          if (match.team1?.id) {
            const res1 = await api.get(`/api/teams/${match.team1.id}/members/`);
            const membersData1 = res1.data.data || res1.data.members || (Array.isArray(res1.data) ? res1.data : []);
            fetchedHomePlayers = membersData1.map((m: any) => ({
              id: m.player?.id || m.id,
              name: m.player?.full_name || m.full_name || m.name,
              full_name: m.player?.full_name || m.full_name || m.name,
            })).filter((p: Player) => p.id && p.name);
          }
          if (match.team2?.id) {
            const res2 = await api.get(`/api/teams/${match.team2.id}/members/`);
            const membersData2 = res2.data.data || res2.data.members || (Array.isArray(res2.data) ? res2.data : []);
            fetchedAwayPlayers = membersData2.map((m: any) => ({
              id: m.player?.id || m.id,
              name: m.player?.full_name || m.full_name || m.name,
              full_name: m.player?.full_name || m.full_name || m.name,
            })).filter((p: Player) => p.id && p.name);
          }
          
          setAvailablePlayers({
            home: fetchedHomePlayers,
            away: fetchedAwayPlayers
          });
        } catch (err) {
          console.error('Failed to fetch fallback team members', err);
          if (!match.team1_members || !match.team2_members) {
            toast.error('Team member information not available. Please refresh the page.');
          }
        }
      }

      // Load existing scores if available
      if (match.futsal_scores && match.futsal_scores.length > 0) {
        console.log('[DEBUG] Found existing futsal scores:', match.futsal_scores);
        console.log('[DEBUG] Current Team IDs:', {
          home: match.team1?.id,
          away: match.team2?.id
        });

        match.futsal_scores.forEach((score: any) => {
          console.log('[DEBUG] Processing score for team:', score.team.id, score.team.name);

          const teamData: TeamData = {
            goals: score.goals,
            shots_on_target: score.shots_on_target,
            shots_off_target: score.shots_off_target,
            possession_percentage: score.possession_percentage,
            fouls: score.fouls,
            yellow_cards: score.yellow_cards,
            red_cards: score.red_cards,
            player_stats: [], // derived on save
            goal_details: score.goal_details.map((g: any) => ({
              scorer_id: g.scorer.id,
              scorer_name: g.scorer.name,
              assist_by_id: g.assist_by?.id,
              assist_by_name: g.assist_by?.name,
              minute: g.minute,
              goal_type: g.goal_type,
              description: g.description
            })),
            card_details: []
          };

          const scoreTeamId = String(score.team.id);
          const homeTeamId = match.team1 ? String(match.team1.id) : '';
          const awayTeamId = match.team2 ? String(match.team2.id) : '';

          console.log(`[DEBUG] Comparing IDs: ScoreTeam=${scoreTeamId} vs Home=${homeTeamId} / Away=${awayTeamId}`);

          if (homeTeamId && scoreTeamId === homeTeamId) {
            console.log('[DEBUG] Setting home team data', teamData);
            setHomeTeamData(teamData);
          } else if (awayTeamId && scoreTeamId === awayTeamId) {
            console.log('[DEBUG] Setting away team data', teamData);
            setAwayTeamData(teamData);
          } else {
            console.warn('[DEBUG] Score team ID did not match either home or away team!');
          }
        });
      } else {
        console.log('[DEBUG] No existing futsal scores found in match object', {
          hasFutsalScores: !!match.futsal_scores,
          length: match.futsal_scores?.length,
          keys: Object.keys(match)
        });
      }
    } catch (error) {
      console.error('Failed to load team rosters:', error);
      toast.error('Failed to load team rosters. Please try again.');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    // Validate goal details match team goals
    if (homeTeamData.goal_details.length !== homeTeamData.goals) {
      newErrors.push(`Home team: Goal details (${homeTeamData.goal_details.length}) must match goals (${homeTeamData.goals})`);
    }
    if (awayTeamData.goal_details.length !== awayTeamData.goals) {
      newErrors.push(`Away team: Goal details (${awayTeamData.goal_details.length}) must match goals (${awayTeamData.goals})`);
    }

    // Validate all goals have scorers
    homeTeamData.goal_details.forEach((goal, index) => {
      if (!goal.scorer_id && !goal.scorer_name) {
        newErrors.push(`Home team goal ${index + 1}: Scorer is required`);
      }
    });
    awayTeamData.goal_details.forEach((goal, index) => {
      if (!goal.scorer_id && !goal.scorer_name) {
        newErrors.push(`Away team goal ${index + 1}: Scorer is required`);
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent, isFinal: boolean = false) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix validation errors');
      return;
    }

    // Calculate player stats from goal details
    const calculatePlayerStats = (goalDetails: GoalEvent[], players: Player[]) => {
      const statsMap = new Map();

      goalDetails.forEach(goal => {
        // Count goals
        if (goal.scorer_id) {
          const current = statsMap.get(goal.scorer_id) || {
            player_id: goal.scorer_id,
            player_name: goal.scorer_name || players.find(p => p.id === goal.scorer_id)?.full_name || '',
            goals: 0,
            assists: 0,
            minutes_played: 90,
            is_starter: true
          };
          current.goals += 1;
          statsMap.set(goal.scorer_id, current);
        }

        // Count assists
        if (goal.assist_by_id) {
          const current = statsMap.get(goal.assist_by_id) || {
            player_id: goal.assist_by_id,
            player_name: goal.assist_by_name || players.find(p => p.id === goal.assist_by_id)?.full_name || '',
            goals: 0,
            assists: 0,
            minutes_played: 90,
            is_starter: true
          };
          current.assists += 1;
          statsMap.set(goal.assist_by_id, current);
        }
      });

      return Array.from(statsMap.values());
    };

    const homePlayerStats = calculatePlayerStats(homeTeamData.goal_details, availablePlayers.home);
    const awayPlayerStats = calculatePlayerStats(awayTeamData.goal_details, availablePlayers.away);

    onSubmit({
      home_team_data: {
        ...homeTeamData,
        player_stats: homePlayerStats
      },
      away_team_data: {
        ...awayTeamData,
        player_stats: awayPlayerStats
      },
      is_final: isFinal
    });
  };

  const incrementScore = (team: 'home' | 'away') => {
    const setter = team === 'home' ? setHomeTeamData : setAwayTeamData;
    setter(prev => ({
      ...prev,
      goals: prev.goals + 1,
      goal_details: [
        ...prev.goal_details,
        {
          scorer_id: '',
          scorer_name: '',
          assist_by_id: '',
          assist_by_name: '',
          minute: 1,
          goal_type: 'REGULAR' as const
        }
      ]
    }));
  };

  const decrementScore = (team: 'home' | 'away') => {
    const setter = team === 'home' ? setHomeTeamData : setAwayTeamData;
    const data = team === 'home' ? homeTeamData : awayTeamData;

    if (data.goals > 0) {
      setter(prev => ({
        ...prev,
        goals: Math.max(0, prev.goals - 1),
        goal_details: prev.goal_details.slice(0, -1)
      }));
    }
  };

  const updateGoalDetail = (team: 'home' | 'away', goalIndex: number, field: keyof GoalEvent, value: any) => {
    const setter = team === 'home' ? setHomeTeamData : setAwayTeamData;

    setter(prev => ({
      ...prev,
      goal_details: prev.goal_details.map((goal, index) => {
        if (index === goalIndex) {
          const updated = { ...goal, [field]: value };

          // Auto-fill names when IDs are selected
          if (field === 'scorer_id' && value) {
            const player = availablePlayers[team].find(p => p.id === value);
            if (player) {
              updated.scorer_name = player.full_name || player.name;
            }
          }
          if (field === 'assist_by_id' && value) {
            const player = availablePlayers[team].find(p => p.id === value);
            if (player) {
              updated.assist_by_name = player.full_name || player.name;
            }
          }

          return updated;
        }
        return goal;
      })
    }));
  };

  const removeGoalDetail = (team: 'home' | 'away', goalIndex: number) => {
    const setter = team === 'home' ? setHomeTeamData : setAwayTeamData;

    setter(prev => ({
      ...prev,
      goals: Math.max(0, prev.goals - 1),
      goal_details: prev.goal_details.filter((_, index) => index !== goalIndex)
    }));
  };

  const renderTeamScoreCard = (
    team: 'home' | 'away',
    teamName: string,
    teamData: TeamData,
    isWinner: boolean
  ) => (
    <div className={`relative bg-white rounded-2xl p-6 shadow-sm border-2 ${isWinner ? 'border-purple-500' : 'border-gray-200'
      }`}>
      {isWinner && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-purple-600 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wide">
            Winner
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-sm font-medium text-purple-600 uppercase tracking-wide mb-2">
          {teamName} {team === 'home' ? '(HOME)' : '(AWAY)'}
        </h3>

        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => decrementScore(team)}
            disabled={isReadOnly || teamData.goals === 0}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <Minus className="h-5 w-5 text-gray-700" />
          </button>

          <div className="text-6xl font-bold text-gray-900 min-w-[80px]">
            {teamData.goals}
          </div>

          <button
            type="button"
            onClick={() => incrementScore(team)}
            disabled={isReadOnly}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <Plus className="h-5 w-5 text-gray-700" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderGoalEvents = (team: 'home' | 'away', teamName: string, teamData: TeamData) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-900">{teamName} Events</h4>
        <button
          type="button"
          onClick={() => incrementScore(team)}
          disabled={isReadOnly}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          Add Goal
        </button>
      </div>

      <div className="space-y-3">
        {availablePlayers[team].length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-3">
            <p className="text-sm text-yellow-800">
              ⚠️ No players found for this team. Make sure the team has registered members.
            </p>
          </div>
        )}

        {teamData.goal_details.map((goal, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="grid grid-cols-12 gap-3 items-start">
              {/* Scorer */}
              <div className="col-span-4">
                <label className="block text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">
                  Scorer
                </label>
                <select
                  value={goal.scorer_id}
                  onChange={(e) => updateGoalDetail(team, index, 'scorer_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isReadOnly}
                >
                  <option value="">Select player</option>
                  {availablePlayers[team].map(player => (
                    <option key={player.id} value={player.id}>
                      {player.full_name || player.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assist */}
              <div className="col-span-4">
                <label className="block text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">
                  Assist
                </label>
                <select
                  value={goal.assist_by_id || ''}
                  onChange={(e) => updateGoalDetail(team, index, 'assist_by_id', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isReadOnly}
                >
                  <option value="">None</option>
                  {availablePlayers[team]
                    .filter(p => !goal.scorer_id || p.id !== goal.scorer_id)
                    .map(player => (
                      <option key={player.id} value={player.id}>
                        {player.full_name || player.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Time */}
              <div className="col-span-3">
                <label className="block text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">
                  Time
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={goal.minute}
                  onChange={(e) => updateGoalDetail(team, index, 'minute', Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isReadOnly}
                />
              </div>

              {/* Delete */}
              <div className="col-span-1 flex items-end justify-center">
                <button
                  type="button"
                  onClick={() => removeGoalDetail(team, index)}
                  disabled={isReadOnly}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Remove goal"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {teamData.goal_details.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-sm">Add {teamName}'s {teamData.goals > 0 ? `${teamData.goals} ` : ''}goal{teamData.goals !== 1 ? 's' : ''} to tie the game</p>
          </div>
        )}
      </div>
    </div>
  );

  const homeTeamName = match.team1?.name || 'Titans';
  const awayTeamName = match.team2?.name || 'Wizards';
  const isHomeWinner = homeTeamData.goals > awayTeamData.goals;
  const isAwayWinner = awayTeamData.goals > homeTeamData.goals;

  return (
    <div className="flex flex-col h-[85vh] max-h-[800px]">
      {/* Fixed Header */}
      <div className="flex-none p-6 border-b border-gray-200 bg-white">
        <div className="text-sm text-gray-600 mb-1">
          <span>ArenaX</span>
          <span className="mx-2">/</span>
          <span>{match.tournament?.title || 'Futsal League Winter \'24'}</span>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">Match #{match.match_number || '482'} Scoring</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {homeTeamName} vs. {awayTeamName}
          </h1>
          <p className="text-gray-500 text-sm">
            Record goals, assists, and timing for precise statistics.
          </p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <form id="futsal-score-form" onSubmit={handleSubmit} className="space-y-6">
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

          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderTeamScoreCard('home', homeTeamName, homeTeamData, isHomeWinner)}
            {renderTeamScoreCard('away', awayTeamName, awayTeamData, isAwayWinner)}
          </div>

          {/* Goal Events */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderGoalEvents('home', homeTeamName, homeTeamData)}
            {renderGoalEvents('away', awayTeamName, awayTeamData)}
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

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => handleSubmit(e, false)}
                disabled={isLoading}
                className="px-6 py-2.5 bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : 'Update Score'}
              </button>

              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={isLoading}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30 flex items-center gap-2"
              >
                <span>End Match</span>
                <span className="bg-purple-500 rounded px-1.5 py-0.5 text-xs">Final</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernFutsalScorer;
