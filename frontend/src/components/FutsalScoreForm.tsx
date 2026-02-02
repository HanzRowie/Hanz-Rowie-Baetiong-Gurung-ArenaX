import React, { useState, useEffect } from 'react';
import { Button } from '@/design-system/components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/components/Card';
import { TeamService } from '@/services/teamService';
import { toast } from 'react-hot-toast';
import { Plus, Minus, Clock, Target, Users, AlertTriangle } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  full_name: string;
}

interface PlayerStat {
  player_id: string;
  player_name?: string;
  goals: number;
  assists: number;
  minutes_played: number;
  is_starter: boolean;
  shots_on_target: number;
  shots_off_target: number;
  tackles: number;
  interceptions: number;
  clearances: number;
  yellow_cards: number;
  red_cards: number;
  fouls_committed: number;
  fouls_suffered: number;
  passes_completed: number;
  passes_attempted: number;
}

interface GoalDetail {
  scorer_id: string;
  scorer_name?: string;
  assist_by_id?: string;
  assist_by_name?: string;
  minute: number;
  goal_type: 'REGULAR' | 'PENALTY' | 'FREE_KICK' | 'OWN_GOAL';
  description?: string;
}

interface CardDetail {
  player_id: string;
  card_type: 'YELLOW' | 'RED';
  reason: string;
  minute: number;
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
  player_stats: PlayerStat[];
  goal_details: GoalDetail[];
  card_details: CardDetail[];
}

interface FutsalScoreFormProps {
  match: any;
  onSubmit: (data: { homeTeamData: TeamData; awayTeamData: TeamData }) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isReadOnly?: boolean;
}

export const FutsalScoreForm: React.FC<FutsalScoreFormProps> = ({
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

  const [activeTab, setActiveTab] = useState<'basic' | 'goals' | 'cards' | 'advanced'>('basic');
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    loadTeamRosters();
    
    // Initialize form with existing data if match is completed
    if (match.status === 'COMPLETED' && match.futsal_scores) {
      loadExistingData();
    } else {
      // Initialize empty player stats for new matches
      initializePlayerStats();
    }
  }, [match]);

  const loadTeamRosters = async () => {
    try {
      // For now, skip loading team rosters due to permission restrictions
      // The organizer doesn't have access to team details
      console.log('Skipping team roster loading - using fallback player initialization');
      initializePlayerStats();
    } catch (error) {
      console.error('Failed to load team rosters:', error);
      toast.error('Failed to load team rosters');
      initializePlayerStats();
    }
  };

  const loadExistingData = () => {
    const homeScore = match.futsal_scores.find((score: any) => 
      score.team.id === match.team1?.id
    );
    const awayScore = match.futsal_scores.find((score: any) => 
      score.team.id === match.team2?.id
    );

    if (homeScore) {
      setHomeTeamData({
        goals: homeScore.goals,
        shots_on_target: homeScore.shots_on_target || 0,
        shots_off_target: homeScore.shots_off_target || 0,
        possession_percentage: homeScore.possession_percentage || 50,
        fouls: homeScore.fouls || 0,
        yellow_cards: homeScore.yellow_cards || 0,
        red_cards: homeScore.red_cards || 0,
        player_stats: homeScore.player_stats.map((stat: any) => ({
          player_id: stat.player.id,
          player_name: stat.player.name,
          goals: stat.goals,
          assists: stat.assists,
          minutes_played: stat.minutes_played,
          is_starter: stat.is_starter,
          shots_on_target: stat.shots_on_target || 0,
          shots_off_target: stat.shots_off_target || 0,
          tackles: stat.tackles || 0,
          interceptions: stat.interceptions || 0,
          clearances: stat.clearances || 0,
          yellow_cards: stat.yellow_cards || 0,
          red_cards: stat.red_cards || 0,
          fouls_committed: stat.fouls_committed || 0,
          fouls_suffered: stat.fouls_suffered || 0,
          passes_completed: stat.passes_completed || 0,
          passes_attempted: stat.passes_attempted || 0
        })),
        goal_details: homeScore.goal_details || [],
        card_details: homeScore.card_details || []
      });
    }

    if (awayScore) {
      setAwayTeamData({
        goals: awayScore.goals,
        shots_on_target: awayScore.shots_on_target || 0,
        shots_off_target: awayScore.shots_off_target || 0,
        possession_percentage: awayScore.possession_percentage || 50,
        fouls: awayScore.fouls || 0,
        yellow_cards: awayScore.yellow_cards || 0,
        red_cards: awayScore.red_cards || 0,
        player_stats: awayScore.player_stats.map((stat: any) => ({
          player_id: stat.player.id,
          player_name: stat.player.name,
          goals: stat.goals,
          assists: stat.assists,
          minutes_played: stat.minutes_played,
          is_starter: stat.is_starter,
          shots_on_target: stat.shots_on_target || 0,
          shots_off_target: stat.shots_off_target || 0,
          tackles: stat.tackles || 0,
          interceptions: stat.interceptions || 0,
          clearances: stat.clearances || 0,
          yellow_cards: stat.yellow_cards || 0,
          red_cards: stat.red_cards || 0,
          fouls_committed: stat.fouls_committed || 0,
          fouls_suffered: stat.fouls_suffered || 0,
          passes_completed: stat.passes_completed || 0,
          passes_attempted: stat.passes_attempted || 0
        })),
        goal_details: awayScore.goal_details || [],
        card_details: awayScore.card_details || []
      });
    }
  };

  const initializePlayerStatsWithRoster = (homePlayers: Player[], awayPlayers: Player[]) => {
    const createPlayerStats = (players: Player[]): PlayerStat[] => {
      return players.slice(0, 11).map((player, index) => ({
        player_id: player.id,
        player_name: player.full_name || player.name,
        goals: 0,
        assists: 0,
        minutes_played: index < 5 ? 90 : 0, // First 5 are starters
        is_starter: index < 5,
        shots_on_target: 0,
        shots_off_target: 0,
        tackles: 0,
        interceptions: 0,
        clearances: 0,
        yellow_cards: 0,
        red_cards: 0,
        fouls_committed: 0,
        fouls_suffered: 0,
        passes_completed: 0,
        passes_attempted: 0
      }));
    };

    setHomeTeamData(prev => ({ 
      ...prev, 
      player_stats: createPlayerStats(homePlayers)
    }));
    
    setAwayTeamData(prev => ({ 
      ...prev, 
      player_stats: createPlayerStats(awayPlayers)
    }));
  };

  const initializePlayerStats = () => {
    // Fallback for when team rosters aren't available
    const emptyStats = Array.from({ length: 5 }, (_, index) => ({
      player_id: '',
      player_name: `Player ${index + 1}`,
      goals: 0,
      assists: 0,
      minutes_played: 90,
      is_starter: true,
      shots_on_target: 0,
      shots_off_target: 0,
      tackles: 0,
      interceptions: 0,
      clearances: 0,
      yellow_cards: 0,
      red_cards: 0,
      fouls_committed: 0,
      fouls_suffered: 0,
      passes_completed: 0,
      passes_attempted: 0
    }));

    setHomeTeamData(prev => ({ ...prev, player_stats: emptyStats }));
    setAwayTeamData(prev => ({ ...prev, player_stats: emptyStats }));
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    // Validate home team
    const homePlayerGoals = homeTeamData.player_stats.reduce((sum, stat) => sum + stat.goals, 0);
    if (homePlayerGoals !== homeTeamData.goals) {
      newErrors.push(`Home team: Sum of player goals (${homePlayerGoals}) must equal team goals (${homeTeamData.goals})`);
    }

    // Validate away team
    const awayPlayerGoals = awayTeamData.player_stats.reduce((sum, stat) => sum + stat.goals, 0);
    if (awayPlayerGoals !== awayTeamData.goals) {
      newErrors.push(`Away team: Sum of player goals (${awayPlayerGoals}) must equal team goals (${awayTeamData.goals})`);
    }

    // Validate possession percentages add up to 100
    const totalPossession = (homeTeamData.possession_percentage || 0) + (awayTeamData.possession_percentage || 0);
    if (Math.abs(totalPossession - 100) > 0.1) {
      newErrors.push(`Possession percentages must add up to 100% (currently ${totalPossession}%)`);
    }

    // Validate player stats
    [...homeTeamData.player_stats, ...awayTeamData.player_stats].forEach((stat, index) => {
      if (stat.minutes_played > 90) {
        newErrors.push(`${stat.player_name} cannot play more than 90 minutes`);
      }
      if (stat.goals < 0 || stat.assists < 0 || stat.minutes_played < 0) {
        newErrors.push(`${stat.player_name} statistics cannot be negative`);
      }
      if (stat.passes_attempted > 0 && stat.passes_completed > stat.passes_attempted) {
        newErrors.push(`${stat.player_name} cannot have more completed passes than attempted`);
      }
    });

    // Validate goal details match team goals
    if (homeTeamData.goal_details.length !== homeTeamData.goals) {
      newErrors.push(`Home team: Number of goal details (${homeTeamData.goal_details.length}) must match team goals (${homeTeamData.goals})`);
    }
    if (awayTeamData.goal_details.length !== awayTeamData.goals) {
      newErrors.push(`Away team: Number of goal details (${awayTeamData.goal_details.length}) must match team goals (${awayTeamData.goals})`);
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Filter out empty player stats (players who didn't play)
    const filteredHomeStats = homeTeamData.player_stats.filter(stat => 
      stat.player_id && (stat.goals > 0 || stat.assists > 0 || stat.minutes_played > 0)
    );
    
    const filteredAwayStats = awayTeamData.player_stats.filter(stat => 
      stat.player_id && (stat.goals > 0 || stat.assists > 0 || stat.minutes_played > 0)
    );

    const submitData = {
      homeTeamData: {
        ...homeTeamData,
        player_stats: filteredHomeStats
      },
      awayTeamData: {
        ...awayTeamData,
        player_stats: filteredAwayStats
      }
    };

    onSubmit(submitData);
  };

  const updateTeamData = (team: 'home' | 'away', field: keyof TeamData, value: any) => {
    const setter = team === 'home' ? setHomeTeamData : setAwayTeamData;
    setter(prev => ({ ...prev, [field]: value }));
  };

  const updatePlayerStat = (
    team: 'home' | 'away',
    playerIndex: number,
    field: keyof PlayerStat,
    value: string | number | boolean
  ) => {
    const setter = team === 'home' ? setHomeTeamData : setAwayTeamData;
    
    setter(prev => ({
      ...prev,
      player_stats: prev.player_stats.map((stat, index) =>
        index === playerIndex
          ? { ...stat, [field]: typeof value === 'string' && field !== 'player_name' ? Number(value) || 0 : value }
          : stat
      )
    }));
  };

  const addGoalDetail = (team: 'home' | 'away') => {
    const setter = team === 'home' ? setHomeTeamData : setAwayTeamData;
    const teamData = team === 'home' ? homeTeamData : awayTeamData;
    
    setter(prev => ({
      ...prev,
      goal_details: [
        ...prev.goal_details,
        {
          scorer_id: '',
          scorer_name: '',
          assist_by_id: '',
          assist_by_name: '',
          minute: 1,
          goal_type: 'REGULAR' as const,
          description: ''
        }
      ]
    }));
  };

  const updateGoalDetail = (team: 'home' | 'away', goalIndex: number, field: keyof GoalDetail, value: any) => {
    const setter = team === 'home' ? setHomeTeamData : setAwayTeamData;
    
    setter(prev => ({
      ...prev,
      goal_details: prev.goal_details.map((goal, index) =>
        index === goalIndex ? { ...goal, [field]: value } : goal
      )
    }));
  };

  const removeGoalDetail = (team: 'home' | 'away', goalIndex: number) => {
    const setter = team === 'home' ? setHomeTeamData : setAwayTeamData;
    
    setter(prev => ({
      ...prev,
      goal_details: prev.goal_details.filter((_, index) => index !== goalIndex)
    }));
  };

  const addPlayerStat = (team: 'home' | 'away') => {
    const setter = team === 'home' ? setHomeTeamData : setAwayTeamData;
    const availablePlayersForTeam = team === 'home' ? availablePlayers.home : availablePlayers.away;
    const currentStats = team === 'home' ? homeTeamData.player_stats : awayTeamData.player_stats;
    
    // Find next available player
    const usedPlayerIds = currentStats.map(stat => stat.player_id);
    const nextPlayer = availablePlayersForTeam.find(player => !usedPlayerIds.includes(player.id));
    
    setter(prev => ({
      ...prev,
      player_stats: [
        ...prev.player_stats,
        {
          player_id: nextPlayer?.id || '',
          player_name: nextPlayer?.full_name || nextPlayer?.name || `Player ${prev.player_stats.length + 1}`,
          goals: 0,
          assists: 0,
          minutes_played: 0,
          is_starter: false,
          shots_on_target: 0,
          shots_off_target: 0,
          tackles: 0,
          interceptions: 0,
          clearances: 0,
          yellow_cards: 0,
          red_cards: 0,
          fouls_committed: 0,
          fouls_suffered: 0,
          passes_completed: 0,
          passes_attempted: 0
        }
      ]
    }));
  };

  const removePlayerStat = (team: 'home' | 'away', playerIndex: number) => {
    const setter = team === 'home' ? setHomeTeamData : setAwayTeamData;
    
    setter(prev => ({
      ...prev,
      player_stats: prev.player_stats.filter((_, index) => index !== playerIndex)
    }));
  };

  const renderTabNavigation = () => (
    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
      {[
        { id: 'basic', label: 'Basic Stats', icon: Target },
        { id: 'goals', label: 'Goal Details', icon: Target },
        { id: 'cards', label: 'Cards', icon: AlertTriangle },
        { id: 'advanced', label: 'Advanced', icon: Users }
      ].map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setActiveTab(id as any)}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === id
              ? 'bg-white text-purple-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );

  const renderBasicStatsTab = (
    teamData: TeamData,
    setTeamData: React.Dispatch<React.SetStateAction<TeamData>>,
    teamName: string,
    team: 'home' | 'away'
  ) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Team Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {teamName} - Team Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Goals</label>
              <input
                type="number"
                min="0"
                value={teamData.goals}
                onChange={(e) => updateTeamData(team, 'goals', Number(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isReadOnly}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Possession %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={teamData.possession_percentage || 50}
                onChange={(e) => updateTeamData(team, 'possession_percentage', Number(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isReadOnly}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shots on Target</label>
              <input
                type="number"
                min="0"
                value={teamData.shots_on_target}
                onChange={(e) => updateTeamData(team, 'shots_on_target', Number(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isReadOnly}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shots off Target</label>
              <input
                type="number"
                min="0"
                value={teamData.shots_off_target}
                onChange={(e) => updateTeamData(team, 'shots_off_target', Number(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isReadOnly}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fouls</label>
              <input
                type="number"
                min="0"
                value={teamData.fouls}
                onChange={(e) => updateTeamData(team, 'fouls', Number(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isReadOnly}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cards (Y/R)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Yellow"
                  value={teamData.yellow_cards}
                  onChange={(e) => updateTeamData(team, 'yellow_cards', Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isReadOnly}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Red"
                  value={teamData.red_cards}
                  onChange={(e) => updateTeamData(team, 'red_cards', Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Player Statistics
            </div>
            {!isReadOnly && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => addPlayerStat(team)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Player
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {teamData.player_stats.map((stat, index) => (
              <div key={index} className="grid grid-cols-6 gap-2 items-center p-3 border rounded-lg bg-gray-50">
                <div className="col-span-2">
                  {availablePlayers[team].length > 0 ? (
                    <select
                      value={stat.player_id}
                      onChange={(e) => {
                        const selectedPlayer = availablePlayers[team].find(p => p.id === e.target.value);
                        updatePlayerStat(team, index, 'player_id', e.target.value);
                        updatePlayerStat(team, index, 'player_name', selectedPlayer?.full_name || selectedPlayer?.name || '');
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="">Select Player</option>
                      {availablePlayers[team].map(player => (
                        <option key={player.id} value={player.id}>
                          {player.full_name || player.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Player name"
                      value={stat.player_name || ''}
                      onChange={(e) => updatePlayerStat(team, index, 'player_name', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      disabled={isReadOnly}
                    />
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  placeholder="G"
                  title="Goals"
                  value={stat.goals}
                  onChange={(e) => updatePlayerStat(team, index, 'goals', e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                  disabled={isReadOnly}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="A"
                  title="Assists"
                  value={stat.assists}
                  onChange={(e) => updatePlayerStat(team, index, 'assists', e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                  disabled={isReadOnly}
                />
                <input
                  type="number"
                  min="0"
                  max="90"
                  placeholder="Min"
                  title="Minutes Played"
                  value={stat.minutes_played}
                  onChange={(e) => updatePlayerStat(team, index, 'minutes_played', e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                  disabled={isReadOnly}
                />
                {!isReadOnly && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => removePlayerStat(team, index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          <div className="text-xs text-gray-500 mt-2">
            <div className="grid grid-cols-6 gap-2">
              <span className="col-span-2">Player Name</span>
              <span>Goals</span>
              <span>Assists</span>
              <span>Minutes</span>
              <span></span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderGoalsTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[
        { team: 'home' as const, data: homeTeamData, name: match.team1?.name || 'Home Team' },
        { team: 'away' as const, data: awayTeamData, name: match.team2?.name || 'Away Team' }
      ].map(({ team, data, name }) => (
        <Card key={team}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {name} Goals ({data.goals})
              </div>
              {!isReadOnly && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => addGoalDetail(team)}
                  disabled={data.goal_details.length >= data.goals}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Goal
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.goal_details.map((goal, index) => (
                <div key={index} className="p-3 border rounded-lg bg-gray-50">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Scorer</label>
                      {availablePlayers[team].length > 0 ? (
                        <select
                          value={goal.scorer_id}
                          onChange={(e) => updateGoalDetail(team, index, 'scorer_id', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          disabled={isReadOnly}
                        >
                          <option value="">Select Scorer</option>
                          {availablePlayers[team].map(player => (
                            <option key={player.id} value={player.id}>
                              {player.full_name || player.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder="Scorer name"
                          value={goal.scorer_name || ''}
                          onChange={(e) => updateGoalDetail(team, index, 'scorer_name', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          disabled={isReadOnly}
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Assist</label>
                      {availablePlayers[team].length > 0 ? (
                        <select
                          value={goal.assist_by_id || ''}
                          onChange={(e) => updateGoalDetail(team, index, 'assist_by_id', e.target.value || undefined)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          disabled={isReadOnly}
                        >
                          <option value="">No Assist</option>
                          {availablePlayers[team].map(player => (
                            <option key={player.id} value={player.id}>
                              {player.full_name || player.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder="Assist by (optional)"
                          value={goal.assist_by_name || ''}
                          onChange={(e) => updateGoalDetail(team, index, 'assist_by_name', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          disabled={isReadOnly}
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Minute</label>
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={goal.minute}
                        onChange={(e) => updateGoalDetail(team, index, 'minute', Number(e.target.value) || 1)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={isReadOnly}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={goal.goal_type}
                        onChange={(e) => updateGoalDetail(team, index, 'goal_type', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={isReadOnly}
                      >
                        <option value="REGULAR">Regular</option>
                        <option value="PENALTY">Penalty</option>
                        <option value="FREE_KICK">Free Kick</option>
                        <option value="OWN_GOAL">Own Goal</option>
                      </select>
                    </div>
                  </div>
                  {!isReadOnly && (
                    <div className="mt-2 flex justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => removeGoalDetail(team, index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Minus className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {data.goal_details.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No goals recorded yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {renderTabNavigation()}

      {activeTab === 'basic' && (
        <div className="space-y-6">
          {renderBasicStatsTab(homeTeamData, setHomeTeamData, match.team1?.name || 'Home Team', 'home')}
          {renderBasicStatsTab(awayTeamData, setAwayTeamData, match.team2?.name || 'Away Team', 'away')}
        </div>
      )}

      {activeTab === 'goals' && renderGoalsTab()}

      {activeTab === 'cards' && (
        <div className="text-center py-8 text-gray-500">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Card tracking feature coming soon</p>
        </div>
      )}

      {activeTab === 'advanced' && (
        <div className="text-center py-8 text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Advanced statistics feature coming soon</p>
        </div>
      )}

      {!isReadOnly && (
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
          >
            {isLoading ? 'Recording...' : 'Record Match Score'}
          </Button>
        </div>
      )}
    </form>
  );
};

export default FutsalScoreForm;