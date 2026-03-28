import { useState } from 'react';
import {
  Trophy,
  Clock,
  Edit,
  Lock,
  Calendar,
  X,
  User,
  Crown,
  Medal,
  ChevronRight,
  Users,
  Play,
} from 'lucide-react';
import type { Match, Tournament } from '@/types';
import { tournamentService } from '@/services/tournamentService';
import toastService from '@/services/toastService';
import { MatchScorer } from './MatchScorer';

interface BracketVisualizationProps {
  tournament: Tournament;
  onMatchUpdate?: () => void;
  isOrganizer?: boolean;
}

interface MatchResultModalProps {
  match: Match;
  isOpen: boolean;
  onClose: () => void;
  onSave: (matchId: string, score1: number, score2: number, winnerId: string) => void;
  isTeamTournament: boolean;
}

const MatchResultModal = ({ match, isOpen, onClose, onSave, isTeamTournament }: MatchResultModalProps) => {
  const [score1, setScore1] = useState(
    isTeamTournament ? (match.team1_score || 0) : (match.player1_score || 0)
  );
  const [score2, setScore2] = useState(
    isTeamTournament ? (match.team2_score || 0) : (match.player2_score || 0)
  );
  const [selectedWinner, setSelectedWinner] = useState(match.winner?.id || '');

  const participant1 = isTeamTournament ? match.team1 : match.player1;
  const participant2 = isTeamTournament ? match.team2 : match.player2;

  const handleSave = () => {
    if (!selectedWinner) {
      toastService.error('Please select a winner');
      return;
    }

    onSave(match.id, score1, score2, selectedWinner);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Enter Match Result</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="text-center text-sm text-gray-600 mb-4">
            Match {match.match_number} - Round {match.round_number}
          </div>

          {/* Participant 1 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {isTeamTournament
                ? ((match.team1 as any)?.name || 'Team 1')
                : ((match.player1 as any)?.name || 'Player 1')
              }
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                value={score1}
                onChange={(e) => setScore1(parseInt(e.target.value) || 0)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="Score"
              />
              <label className="flex items-center">
                <input
                  type="radio"
                  name="winner"
                  value={participant1?.id || ''}
                  checked={selectedWinner === participant1?.id}
                  onChange={(e) => setSelectedWinner(e.target.value)}
                  className="mr-2"
                />
                Winner
              </label>
            </div>
          </div>

          {/* Participant 2 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {isTeamTournament
                ? ((match.team2 as any)?.name || 'Team 2')
                : ((match.player2 as any)?.name || 'Player 2')
              }
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                value={score2}
                onChange={(e) => setScore2(parseInt(e.target.value) || 0)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="Score"
              />
              <label className="flex items-center">
                <input
                  type="radio"
                  name="winner"
                  value={participant2?.id || ''}
                  checked={selectedWinner === participant2?.id}
                  onChange={(e) => setSelectedWinner(e.target.value)}
                  className="mr-2"
                />
                Winner
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Save Result
          </button>
        </div>
      </div>
    </div>
  );
};

interface ScheduleMatchModalProps {
  match: Match;
  tournamentId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const ScheduleMatchModal = ({ match, tournamentId, isOpen, onClose, onSaved }: ScheduleMatchModalProps) => {
  // Convert existing scheduled_time to local datetime-local input format
  const toLocalInput = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [datetime, setDatetime] = useState(toLocalInput(match.scheduled_time));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!datetime) {
      toastService.error('Please select a date and time');
      return;
    }
    // Convert local datetime-local value to ISO string
    const iso = new Date(datetime).toISOString();
    setSaving(true);
    try {
      await tournamentService.scheduleMatch(tournamentId, match.id, iso);
      toastService.success('Match scheduled successfully');
      onSaved();
      onClose();
    } catch (err: any) {
      toastService.error(err?.response?.data?.error || 'Failed to schedule match');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            Schedule Match
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Match {match.match_number} — Round {match.round_number}
        </p>

        <div className="space-y-3">
          <label htmlFor="match-schedule-dt" className="block text-sm font-medium text-gray-700">Date &amp; Time</label>
          <input
            id="match-schedule-dt"
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
          />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function BracketVisualization({ tournament, onMatchUpdate, isOrganizer = false }: BracketVisualizationProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showMatchScorer, setShowMatchScorer] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const isTeamTournament = tournament.participation_type === 'TEAM';

  const handleMatchClick = (match: Match) => {
    if (isOrganizer && match.status !== 'COMPLETED') {
      const hasParticipants = isTeamTournament
        ? (match.team1 && match.team2)
        : (match.player1 && match.player2);

      if (hasParticipants) {
        setSelectedMatch(match);

        // Use detailed scoring for futsal tournaments, basic modal for others
        if (tournament.sport_type === 'FUTSAL') {
          setShowMatchScorer(true);
        } else {
          setShowResultModal(true);
        }
      }
    }
  };

  const handleSaveResult = async (matchId: string, score1: number, score2: number, winnerId: string) => {
    try {
      // Prepare the data based on tournament type
      const updateData = isTeamTournament
        ? {
          team1_score: score1,
          team2_score: score2,
          winner_id: winnerId,
        }
        : {
          player1_score: score1,
          player2_score: score2,
          winner_id: winnerId,
        };

      await tournamentService.updateMatchResult(tournament.id, matchId, updateData);
      toastService.success('Match result updated successfully!');
      onMatchUpdate?.();
    } catch (err: any) {
      toastService.error(err.message || 'Failed to update match result');
    }
  };

  if (!tournament.matches || tournament.matches.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Bracket Generated</h3>
        <p className="text-gray-600 mb-6">Tournament bracket has not been generated yet.</p>

        {isOrganizer && tournament.status === 'UPCOMING' && tournament.registered_count >= (tournament.min_participants || 2) && (
          <button
            onClick={async () => {
              if (confirm('Generate tournament bracket? This cannot be undone.')) {
                try {
                  await tournamentService.generateBracket(tournament.id);
                  toastService.success('Tournament bracket generated successfully!');
                  onMatchUpdate?.();
                } catch (err: any) {
                  toastService.error(err.message || 'Failed to generate bracket');
                }
              }
            }}
            className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <Play className="h-5 w-5" />
            Generate Bracket
          </button>
        )}

        {isOrganizer && tournament.status === 'UPCOMING' && tournament.registered_count < (tournament.min_participants || 2) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-yellow-800 text-sm">
              Need at least {tournament.min_participants || 2} participants to generate bracket.
              Currently have {tournament.registered_count}.
            </p>
          </div>
        )}

        {!isOrganizer && (
          <p className="text-gray-500 text-sm">
            The tournament organizer will generate the bracket when ready.
          </p>
        )}
      </div>
    );
  }

  // Group matches by round
  const matchesByRound = tournament.matches.reduce((acc, match) => {
    if (!acc[match.round_number]) {
      acc[match.round_number] = [];
    }
    acc[match.round_number].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);
  const maxRound = Math.max(...rounds);

  const getRoundName = (round: number) => {
    if (round === maxRound) return 'Final';
    if (round === maxRound - 1) return 'Semi-Final';
    if (round === maxRound - 2) return 'Quarter-Final';
    return `Round ${round}`;
  };

  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'border-green-500 bg-green-50';
      case 'IN_PROGRESS': return 'border-yellow-500 bg-yellow-50';
      case 'SCHEDULED': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-300 bg-white';
    }
  };

  const getParticipantCardStyle = (match: Match, participantId?: string) => {
    if (match.status === 'COMPLETED' && match.winner?.id === participantId) {
      return 'bg-green-100 border-green-300 text-green-900';
    }
    if (match.status === 'COMPLETED' && match.winner?.id !== participantId) {
      return 'bg-red-50 border-red-200 text-red-700';
    }
    return 'bg-gray-50 border-gray-200 text-gray-900';
  };

  const renderParticipant = (participant: any, score: number | undefined, isWinner: boolean, participantType: 'team' | 'player', isByeMatch: boolean = false) => {
    if (!participant) {
      return (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
            {participantType === 'team' ? <Users className="h-4 w-4 text-gray-400" /> : <User className="h-4 w-4 text-gray-400" />}
          </div>
          <span className="font-medium text-gray-400">
            {isByeMatch ? 'BYE' : 'TBD'}
          </span>
        </div>
      );
    }

    // Handle team vs player name extraction - participant is the actual data from API
    const name = participant.name || 'Unknown';

    // Teams don't have profile pictures in our system
    const profilePicture = participantType === 'player' ? participant.profile_picture : null;

    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          {profilePicture ? (
            <img
              src={profilePicture}
              alt={name}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
              {participantType === 'team' ? <Users className="h-4 w-4 text-purple-600" /> : <User className="h-4 w-4 text-purple-600" />}
            </div>
          )}
          <div>
            <span className="font-medium">{name}</span>
            {participantType === 'team' && (
              <div className="text-xs text-gray-500">
                Team
              </div>
            )}
          </div>
          {isWinner && <Crown className="h-4 w-4 text-yellow-500" />}
        </div>
        {score !== null && score !== undefined && (
          <span className="text-xl font-bold">{score}</span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Tournament Progress Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Tournament Progress</h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Trophy className="h-4 w-4" />
            {tournament.tournament_type.replace('_', ' ')} Format
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {tournament.current_round || 1}
            </div>
            <div className="text-sm text-gray-600">Current Round</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {tournament.matches.filter(m => m.status === 'COMPLETED').length}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {tournament.matches.filter(m => m.status === 'IN_PROGRESS').length}
            </div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {Math.round((tournament.matches.filter(m => m.status === 'COMPLETED').length / tournament.matches.length) * 100)}%
            </div>
            <div className="text-sm text-gray-600">Complete</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${(tournament.matches.filter(m => m.status === 'COMPLETED').length / tournament.matches.length) * 100}%`
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Bracket Visualization */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Tournament Bracket</h3>
            {isOrganizer && (
              <div className="text-sm text-gray-600">
                Click on incomplete matches to enter results
              </div>
            )}
          </div>

          {/* Responsive Bracket Layout */}
          <div className="overflow-x-auto">
            <div className="flex gap-8 min-w-max">
              {rounds.map((round, roundIndex) => (
                <div key={round} className="flex flex-col space-y-4 min-w-[280px]">
                  {/* Round Header */}
                  <div className="text-center">
                    <h4 className="font-semibold text-gray-900 text-lg mb-2">
                      {getRoundName(round)}
                    </h4>
                    <div className="text-sm text-gray-500">
                      {matchesByRound[round].filter(m => m.status === 'COMPLETED').length}/
                      {matchesByRound[round].length} completed
                    </div>
                  </div>

                  {/* Matches in Round */}
                  <div className="space-y-6">
                    {matchesByRound[round]
                      .sort((a, b) => a.match_number - b.match_number)
                      .map((match) => {
                        // Check if this is a bye match (one participant is null)
                        const participant1 = isTeamTournament ? match.team1 : match.player1;
                        const participant2 = isTeamTournament ? match.team2 : match.player2;
                        const isByeMatch = (participant1 && !participant2) || (!participant1 && participant2);

                        return (
                          <div key={match.id} className="relative">
                            <div
                              className={`border-2 rounded-lg overflow-hidden transition-all duration-200 ${getMatchStatusColor(match.status)} ${isOrganizer && match.status !== 'COMPLETED' &&
                                (isTeamTournament ? (match.team1 && match.team2) : (match.player1 && match.player2))
                                ? 'cursor-pointer hover:shadow-md'
                                : ''
                                }`}
                              onClick={() => handleMatchClick(match)}
                            >
                              {/* Match Header */}
                              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-700">
                                    Match {match.match_number}
                                    {isByeMatch && <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">BYE</span>}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${match.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                      match.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                      {match.status.replace('_', ' ')}
                                    </span>
                                    {isOrganizer && match.status !== 'COMPLETED' &&
                                      (isTeamTournament ? (match.team1 && match.team2) : (match.player1 && match.player2)) && (
                                        <Edit className="h-3 w-3 text-gray-400" />
                                      )}
                                    {isOrganizer && match.status === 'COMPLETED' && (
                                      <span title="Match completed — locked">
                                        <Lock className="h-3 w-3 text-green-500" />
                                      </span>
                                    )}
                                    {isOrganizer && match.status !== 'COMPLETED' && match.status !== 'IN_PROGRESS' && (
                                      <button
                                        title="Schedule match"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedMatch(match);
                                          setShowScheduleModal(true);
                                        }}
                                        className="p-0.5 rounded hover:bg-purple-100 transition-colors"
                                      >
                                        <Calendar className="h-3 w-3 text-purple-500" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Participants */}
                              <div className="p-4 space-y-3">
                                {/* Participant 1 */}
                                <div className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${getParticipantCardStyle(match, isTeamTournament ? match.team1?.id : match.player1?.id)}`}>
                                  {renderParticipant(
                                    isTeamTournament ? match.team1 : match.player1,
                                    isTeamTournament ? match.team1_score : match.player1_score,
                                    match.winner?.id === (isTeamTournament ? match.team1?.id : match.player1?.id),
                                    isTeamTournament ? 'team' : 'player',
                                    isByeMatch && !participant1
                                  )}
                                </div>

                                {/* VS Divider */}
                                <div className="text-center">
                                  <span className="text-xs text-gray-400 font-medium bg-white px-2">
                                    {isByeMatch ? 'BYE' : 'VS'}
                                  </span>
                                </div>

                                {/* Participant 2 */}
                                <div className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${getParticipantCardStyle(match, isTeamTournament ? match.team2?.id : match.player2?.id)}`}>
                                  {renderParticipant(
                                    isTeamTournament ? match.team2 : match.player2,
                                    isTeamTournament ? match.team2_score : match.player2_score,
                                    match.winner?.id === (isTeamTournament ? match.team2?.id : match.player2?.id),
                                    isTeamTournament ? 'team' : 'player',
                                    isByeMatch && !participant2
                                  )}
                                </div>
                              </div>

                              {/* Match Footer */}
                              {match.scheduled_time ? (
                                <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <Clock className="h-3 w-3" />
                                    {new Date(match.scheduled_time).toLocaleString()}
                                  </div>
                                </div>
                              ) : isOrganizer && match.status === 'SCHEDULED' ? (
                                <div className="bg-yellow-50 px-4 py-2 border-t border-yellow-100">
                                  <div className="flex items-center gap-2 text-xs text-yellow-700">
                                    <Calendar className="h-3 w-3" />
                                    No date set — click <Calendar className="h-3 w-3 inline" /> to schedule
                                  </div>
                                </div>
                              ) : null}
                            </div>

                            {/* Connection Line to Next Round */}
                            {roundIndex < rounds.length - 1 && (
                              <div className="absolute top-1/2 -right-4 transform -translate-y-1/2">
                                <ChevronRight className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tournament Winner */}
      {tournament.winner && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-8 border-2 border-yellow-200">
          <div className="text-center">
            <Trophy className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Tournament Champion</h3>
            <div className="flex items-center justify-center gap-4">
              <div className="h-20 w-20 rounded-full bg-yellow-100 flex items-center justify-center border-4 border-yellow-300">
                <Crown className="h-10 w-10 text-yellow-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{(tournament.winner as any)?.name || 'Champion'}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Medal className="h-5 w-5 text-yellow-600" />
                  <span className="text-yellow-600 font-medium">Tournament Champion</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Match Result Modal */}
      {selectedMatch && (
        <MatchResultModal
          match={selectedMatch}
          isOpen={showResultModal}
          onClose={() => {
            setShowResultModal(false);
            setSelectedMatch(null);
          }}
          onSave={handleSaveResult}
          isTeamTournament={isTeamTournament}
        />
      )}

      {/* Match Scorer for Futsal */}
      {selectedMatch && showMatchScorer && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Record Match Score - {selectedMatch.team1?.name} vs {selectedMatch.team2?.name}
                </h3>
                <button
                  onClick={() => {
                    setShowMatchScorer(false);
                    setSelectedMatch(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <MatchScorer
                match={{
                  ...selectedMatch,
                  tournament: {
                    id: tournament.id,
                    title: tournament.title,
                    sport_type: tournament.sport_type as 'FUTSAL' | 'BADMINTON',
                    registration_type: tournament.registration_type as 'TEAM' | 'INDIVIDUAL'
                  }
                }}
                onScoreRecorded={(updatedMatch) => {
                  setShowMatchScorer(false);
                  setSelectedMatch(null);
                  onMatchUpdate?.();
                }}
                onClose={() => {
                  setShowMatchScorer(false);
                  setSelectedMatch(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Schedule Match Modal */}
      {selectedMatch && showScheduleModal && (
        <ScheduleMatchModal
          match={selectedMatch}
          tournamentId={tournament.id}
          isOpen={showScheduleModal}
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedMatch(null);
          }}
          onSaved={() => {
            onMatchUpdate?.();
          }}
        />
      )}
    </div>
  );
}