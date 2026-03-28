import React, { useState, useEffect } from 'react';
import { 
  Target, Clock, Users, AlertCircle, Undo2, CheckCircle,
  Trophy, Shirt, Flag, Zap, Shield, Save as SaveIcon, MessageSquare
} from 'lucide-react';
import { MatchRemarksPanel } from './MatchRemarksPanel';
import { toast } from 'react-hot-toast';
import { api } from '@/services/api';

interface Player {
  id: string;
  full_name: string;
  name?: string;
}

interface Team {
  id: string;
  name: string;
}

interface Match {
  id: string;
  tournament: {
    id: string;
    title: string;
    sport_type: 'FUTSAL' | 'BADMINTON';
  };
  team1: Team;
  team2: Team;
  team1_score?: number;
  team2_score?: number;
  status: string;
  match_number: number;
  round_number: number;
}

interface MatchEvent {
  id: string;
  event_type: 'GOAL' | 'YELLOW_CARD' | 'RED_CARD';
  team_id: string;
  team_name: string;
  player_id: string;
  player_name: string;
  minute: number;
  description: string;
  created_at: string;
  goal_type?: string;
  assist_by_name?: string;
  card_type?: string;
}

interface LiveMatchScorerProps {
  match: Match;
  onMatchUpdated?: (match: Match) => void;
  onClose?: () => void;
}

type EventType = 'GOAL' | 'ASSIST' | 'YELLOW_CARD' | 'RED_CARD' | 'FOUL' | 'CORNER' | 'FREE_KICK' | 'PENALTY' | 'SAVE';

export const LiveMatchScorer: React.FC<LiveMatchScorerProps> = ({
  match,
  onMatchUpdated,
  onClose
}) => {
  const [selectedTeam, setSelectedTeam] = useState<'team1' | 'team2' | null>(null);
  const [currentMinute, setCurrentMinute] = useState<number>(1);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [team1Players, setTeam1Players] = useState<Player[]>([]);
  const [team2Players, setTeam2Players] = useState<Player[]>([]);
  const [localScore, setLocalScore] = useState({
    team1: match.team1_score || 0,
    team2: match.team2_score || 0
  });
  const [showRemarks, setShowRemarks] = useState(false);

  useEffect(() => {
    loadMatchEvents();
    loadTeamPlayers();
  }, [match.id]);

  const loadMatchEvents = async () => {
    try {
      const response = await api.get(`/api/tournaments/match-events/${match.id}/timeline/`);
      setEvents(response.data);
    } catch (error) {
      console.error('Failed to load match events:', error);
    }
  };

  const loadTeamPlayers = async () => {
    try {
      // For organizers scoring matches, we can get players from tournament registrations
      // This avoids the permission issue with team members endpoint
      const response = await api.get(`/api/tournaments/${match.tournament.id}/participants/`);
      const participants = response.data.participants || [];
      
      // Find registrations for both teams
      const team1Reg = participants.find((p: any) => p.team?.id === match.team1.id);
      const team2Reg = participants.find((p: any) => p.team?.id === match.team2.id);
      
      // Extract players from selected_players
      if (team1Reg && team1Reg.selected_players) {
        setTeam1Players(team1Reg.selected_players);
      }
      
      if (team2Reg && team2Reg.selected_players) {
        setTeam2Players(team2Reg.selected_players);
      }
      
      // Fallback: try team members endpoint (works for team owners/members)
      if (team1Players.length === 0) {
        try {
          const team1Response = await api.get(`/api/teams/${match.team1.id}/members/`);
          setTeam1Players(team1Response.data.members || []);
        } catch (err) {
          console.log('Could not load team1 members directly, using registration data');
        }
      }
      
      if (team2Players.length === 0) {
        try {
          const team2Response = await api.get(`/api/teams/${match.team2.id}/members/`);
          setTeam2Players(team2Response.data.members || []);
        } catch (err) {
          console.log('Could not load team2 members directly, using registration data');
        }
      }
    } catch (error) {
      console.error('Failed to load team players:', error);
      toast.error('Could not load team rosters. Some features may be limited.');
    }
  };

  const handleTeamSelect = (team: 'team1' | 'team2') => {
    setSelectedTeam(team);
  };

  const handleEventTypeSelect = (eventType: EventType) => {
    if (!selectedTeam) {
      toast.error('Please select a team first');
      return;
    }
    setSelectedEventType(eventType);
    setShowEventModal(true);
  };

  const handleAddGoal = async (playerId: string, assistById?: string, goalType: string = 'REGULAR') => {
    if (!selectedTeam) return;

    setIsLoading(true);
    try {
      const teamId = selectedTeam === 'team1' ? match.team1.id : match.team2.id;
      
      await api.post(`/api/tournaments/match-events/${match.id}/add-goal/`, {
        team_id: teamId,
        scorer_id: playerId,
        assist_by_id: assistById || null,
        minute: currentMinute,
        goal_type: goalType,
        description: ''
      });

      // Update local score
      setLocalScore(prev => ({
        ...prev,
        [selectedTeam]: prev[selectedTeam] + 1
      }));

      // Increment minute
      setCurrentMinute(prev => prev + 1);

      toast.success('Goal added!');
      await loadMatchEvents();
      setShowEventModal(false);
      setSelectedTeam(null);
    } catch (error: any) {
      console.error('Failed to add goal:', error);
      toast.error(error.response?.data?.error || 'Failed to add goal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCard = async (playerId: string, cardType: 'YELLOW' | 'RED', reason: string) => {
    if (!selectedTeam) return;

    setIsLoading(true);
    try {
      const teamId = selectedTeam === 'team1' ? match.team1.id : match.team2.id;
      
      await api.post(`/api/tournaments/match-events/${match.id}/add-card/`, {
        team_id: teamId,
        player_id: playerId,
        card_type: cardType,
        reason: reason,
        minute: currentMinute,
        description: ''
      });

      // Increment minute
      setCurrentMinute(prev => prev + 1);

      toast.success(`${cardType} card added!`);
      await loadMatchEvents();
      setShowEventModal(false);
      setSelectedTeam(null);
    } catch (error: any) {
      console.error('Failed to add card:', error);
      toast.error(error.response?.data?.error || 'Failed to add card');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async (event: MatchEvent) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    setIsLoading(true);
    try {
      if (event.event_type === 'GOAL') {
        await api.delete(`/api/tournaments/match-events/${match.id}/delete-goal/${event.id}/`);
        
        // Update local score
        const team = event.team_id === match.team1.id ? 'team1' : 'team2';
        setLocalScore(prev => ({
          ...prev,
          [team]: Math.max(0, prev[team] - 1)
        }));
      } else {
        await api.delete(`/api/tournaments/match-events/${match.id}/delete-card/${event.id}/`);
      }

      toast.success('Event deleted');
      await loadMatchEvents();
    } catch (error: any) {
      console.error('Failed to delete event:', error);
      toast.error(error.response?.data?.error || 'Failed to delete event');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteMatch = async () => {
    if (!confirm('Are you sure you want to complete this match? This action cannot be undone.')) return;

    setIsLoading(true);
    try {
      await api.post(`/api/tournaments/match-events/${match.id}/complete-match/`);
      toast.success('Match completed successfully!');
      if (onMatchUpdated) {
        onMatchUpdated({ ...match, status: 'COMPLETED' });
      }
      if (onClose) {
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to complete match:', error);
      toast.error(error.response?.data?.error || 'Failed to complete match');
    } finally {
      setIsLoading(false);
    }
  };

  const eventButtons: Array<{ type: EventType; icon: any; label: string; color: string }> = [
    { type: 'GOAL', icon: Target, label: 'Goal', color: 'bg-green-500 hover:bg-green-600' },
    { type: 'YELLOW_CARD', icon: Flag, label: 'Yellow', color: 'bg-yellow-400 hover:bg-yellow-500' },
    { type: 'RED_CARD', icon: Flag, label: 'Red', color: 'bg-red-500 hover:bg-red-600' },
  ];

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'GOAL': return <Target className="w-4 h-4" />;
      case 'YELLOW_CARD': return <Flag className="w-4 h-4 text-yellow-500" />;
      case 'RED_CARD': return <Flag className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header with Score Display */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              <span className="text-sm opacity-90">{match.tournament.title}</span>
            </div>
            <div className="flex items-center gap-2 text-sm opacity-90">
              <Clock className="w-4 h-4" />
              <span>Round {match.round_number} • Match {match.match_number}</span>
            </div>
          </div>

          {/* Score Display */}
          <div className="flex items-center justify-between gap-8">
            {/* Team 1 */}
            <button
              onClick={() => handleTeamSelect('team1')}
              className={`flex-1 p-6 rounded-xl transition-all ${
                selectedTeam === 'team1'
                  ? 'bg-white/20 ring-4 ring-white/40 scale-105'
                  : 'bg-white/10 hover:bg-white/15'
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                  <Shirt className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold">{match.team1.name}</h3>
                <div className="text-5xl font-bold">{localScore.team1}</div>
              </div>
            </button>

            {/* VS */}
            <div className="flex flex-col items-center gap-2">
              <div className="text-2xl font-light opacity-75">VS</div>
              <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
                {currentMinute}'
              </div>
            </div>

            {/* Team 2 */}
            <button
              onClick={() => handleTeamSelect('team2')}
              className={`flex-1 p-6 rounded-xl transition-all ${
                selectedTeam === 'team2'
                  ? 'bg-white/20 ring-4 ring-white/40 scale-105'
                  : 'bg-white/10 hover:bg-white/15'
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                  <Shirt className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold">{match.team2.name}</h3>
                <div className="text-5xl font-bold">{localScore.team2}</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Event Buttons */}
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="max-w-6xl mx-auto">
          {selectedTeam ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-700">
                    Selected: {selectedTeam === 'team1' ? match.team1.name : match.team2.name}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedTeam(null)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {eventButtons.map(({ type, icon: Icon, label, color }) => (
                  <button
                    key={type}
                    onClick={() => handleEventTypeSelect(type)}
                    disabled={isLoading}
                    className={`${color} text-white p-4 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-2`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="font-semibold">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">Select a team above to add events</p>
            </div>
          )}
        </div>
      </div>

      {/* Match Controls */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Clock className="w-4 h-4" />
              Minute:
              <input
                type="number"
                min="1"
                max="90"
                value={currentMinute}
                onChange={(e) => setCurrentMinute(Number(e.target.value) || 1)}
                className="w-16 px-2 py-1 border border-gray-300 rounded-md text-center"
              />
            </label>
          </div>
          
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
              >
                Cancel
              </button>
            )}
            <button
              onClick={() => setShowRemarks(v => !v)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 border transition-colors ${showRemarks ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              <MessageSquare className="w-4 h-4" />
              Remarks
            </button>
            <button
              onClick={handleCompleteMatch}
              disabled={isLoading}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              Complete Match
            </button>
          </div>
        </div>
      </div>

      {/* Event Timeline */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            Match Events ({events.length})
          </h3>

          {/* Remarks Panel */}
          {showRemarks && (
            <div className="mb-6">
              <MatchRemarksPanel
                tournamentId={match.tournament.id}
                matchId={match.id}
                team1={match.team1}
                team2={match.team2}
              />
            </div>
          )}

          {events.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No events yet. Start adding goals and cards!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                        {event.minute}'
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getEventIcon(event.event_type)}
                        <div>
                          <div className="font-semibold text-gray-900">
                            {event.player_name}
                            {event.assist_by_name && (
                              <span className="text-gray-500 font-normal text-sm ml-2">
                                (assist: {event.assist_by_name})
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {event.team_name} • {event.description}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleDeleteEvent(event)}
                      disabled={isLoading}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete event"
                    >
                      <Undo2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && selectedEventType && selectedTeam && (
        <EventModal
          eventType={selectedEventType}
          players={selectedTeam === 'team1' ? team1Players : team2Players}
          onSubmit={(data) => {
            if (selectedEventType === 'GOAL') {
              handleAddGoal(data.playerId, data.assistById, data.goalType);
            } else if (selectedEventType === 'YELLOW_CARD' || selectedEventType === 'RED_CARD') {
              const cardType = selectedEventType === 'YELLOW_CARD' ? 'YELLOW' : 'RED';
              handleAddCard(data.playerId, cardType as 'YELLOW' | 'RED', data.reason || 'UNSPORTING_BEHAVIOR');
            }
          }}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEventType(null);
          }}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

// Event Modal Component
interface EventModalProps {
  eventType: EventType;
  players: Player[];
  onSubmit: (data: any) => void;
  onClose: () => void;
  isLoading: boolean;
}

const EventModal: React.FC<EventModalProps> = ({
  eventType,
  players,
  onSubmit,
  onClose,
  isLoading
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [assistPlayer, setAssistPlayer] = useState('');
  const [goalType, setGoalType] = useState('REGULAR');
  const [cardReason, setCardReason] = useState('UNSPORTING_BEHAVIOR');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer) {
      toast.error('Please select a player');
      return;
    }

    onSubmit({
      playerId: selectedPlayer,
      assistById: assistPlayer || undefined,
      goalType,
      reason: cardReason
    });
  };

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Add {eventType.replace('_', ' ')}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Player Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Player
              </label>
              <select
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="">Choose a player...</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.full_name || player.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Goal-specific fields */}
            {eventType === 'GOAL' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assist By (Optional)
                  </label>
                  <select
                    value={assistPlayer}
                    onChange={(e) => setAssistPlayer(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">No assist</option>
                    {players
                      .filter((p) => p.id !== selectedPlayer)
                      .map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.full_name || player.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Goal Type
                  </label>
                  <select
                    value={goalType}
                    onChange={(e) => setGoalType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="REGULAR">Regular Goal</option>
                    <option value="PENALTY">Penalty</option>
                    <option value="FREE_KICK">Free Kick</option>
                    <option value="OWN_GOAL">Own Goal</option>
                  </select>
                </div>
              </>
            )}

            {/* Card-specific fields */}
            {(eventType === 'YELLOW_CARD' || eventType === 'RED_CARD') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason
                </label>
                <select
                  value={cardReason}
                  onChange={(e) => setCardReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="UNSPORTING_BEHAVIOR">Unsporting Behavior</option>
                  <option value="DISSENT">Dissent</option>
                  <option value="PERSISTENT_FOULING">Persistent Fouling</option>
                  <option value="DELAYING_GAME">Delaying Game</option>
                  <option value="SERIOUS_FOUL">Serious Foul Play</option>
                  <option value="VIOLENT_CONDUCT">Violent Conduct</option>
                  <option value="OFFENSIVE_LANGUAGE">Offensive Language</option>
                </select>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold disabled:opacity-50"
              >
                {isLoading ? 'Adding...' : 'Add Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LiveMatchScorer;
