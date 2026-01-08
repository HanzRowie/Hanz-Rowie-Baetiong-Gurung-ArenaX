import { useState } from 'react';
import {
  Trophy,
  Clock,
  Edit,
  X,
  User,
  Crown,
  Medal,
  ChevronRight,
} from 'lucide-react';
import type { Match, Tournament } from '@/types';
import { tournamentService } from '@/services/tournamentService';
import toastService from '@/services/toastService';

interface BracketVisualizationProps {
  tournament: Tournament;
  onMatchUpdate?: () => void;
  isOrganizer?: boolean;
}

interface MatchResultModalProps {
  match: Match;
  isOpen: boolean;
  onClose: () => void;
  onSave: (matchId: string, player1Score: number, player2Score: number, winnerId: string) => void;
}

const MatchResultModal = ({ match, isOpen, onClose, onSave }: MatchResultModalProps) => {
  const [player1Score, setPlayer1Score] = useState(match.player1_score || 0);
  const [player2Score, setPlayer2Score] = useState(match.player2_score || 0);
  const [selectedWinner, setSelectedWinner] = useState(match.winner?.id || '');

  const handleSave = () => {
    if (!selectedWinner) {
      toastService.error('Please select a winner');
      return;
    }
    onSave(match.id, player1Score, player2Score, selectedWinner);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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

          {/* Player 1 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {match.player1?.name || 'Player 1'}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                value={player1Score}
                onChange={(e) => setPlayer1Score(parseInt(e.target.value) || 0)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="Score"
              />
              <label className="flex items-center">
                <input
                  type="radio"
                  name="winner"
                  value={match.player1?.id || ''}
                  checked={selectedWinner === match.player1?.id}
                  onChange={(e) => setSelectedWinner(e.target.value)}
                  className="mr-2"
                />
                Winner
              </label>
            </div>
          </div>

          {/* Player 2 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {match.player2?.name || 'Player 2'}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                value={player2Score}
                onChange={(e) => setPlayer2Score(parseInt(e.target.value) || 0)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="Score"
              />
              <label className="flex items-center">
                <input
                  type="radio"
                  name="winner"
                  value={match.player2?.id || ''}
                  checked={selectedWinner === match.player2?.id}
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

export default function BracketVisualization({ tournament, onMatchUpdate, isOrganizer = false }: BracketVisualizationProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  const handleMatchClick = (match: Match) => {
    if (isOrganizer && match.status !== 'COMPLETED' && match.player1 && match.player2) {
      setSelectedMatch(match);
      setShowResultModal(true);
    }
  };

  const handleSaveResult = async (matchId: string, player1Score: number, player2Score: number, winnerId: string) => {
    try {
      await tournamentService.updateMatchResult(tournament.id, matchId, {
        player1_score: player1Score,
        player2_score: player2Score,
        winner_id: winnerId,
      });
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
        <p className="text-gray-600">Tournament bracket has not been generated yet.</p>
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

  const getPlayerCardStyle = (match: Match, playerId?: string) => {
    if (match.status === 'COMPLETED' && match.winner?.id === playerId) {
      return 'bg-green-100 border-green-300 text-green-900';
    }
    if (match.status === 'COMPLETED' && match.winner?.id !== playerId) {
      return 'bg-red-50 border-red-200 text-red-700';
    }
    return 'bg-gray-50 border-gray-200 text-gray-900';
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
                Click on matches to enter results
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
                      .map((match) => (
                      <div key={match.id} className="relative">
                        <div
                          className={`border-2 rounded-lg overflow-hidden transition-all duration-200 ${getMatchStatusColor(match.status)} ${
                            isOrganizer && match.status !== 'COMPLETED' && match.player1 && match.player2
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
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  match.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                  match.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {match.status.replace('_', ' ')}
                                </span>
                                {isOrganizer && match.status !== 'COMPLETED' && match.player1 && match.player2 && (
                                  <Edit className="h-3 w-3 text-gray-400" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Players */}
                          <div className="p-4 space-y-3">
                            {/* Player 1 */}
                            <div className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${getPlayerCardStyle(match, match.player1?.id)}`}>
                              <div className="flex items-center gap-3">
                                {match.player1?.profile_picture ? (
                                  <img
                                    src={match.player1.profile_picture}
                                    alt={match.player1.name}
                                    className="h-8 w-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                                    <User className="h-4 w-4 text-purple-600" />
                                  </div>
                                )}
                                <span className="font-medium">
                                  {match.player1?.name || 'TBD'}
                                </span>
                                {match.winner?.id === match.player1?.id && (
                                  <Crown className="h-4 w-4 text-yellow-500" />
                                )}
                              </div>
                              {match.player1_score !== null && (
                                <span className="text-xl font-bold">{match.player1_score}</span>
                              )}
                            </div>
                            
                            {/* VS Divider */}
                            <div className="text-center">
                              <span className="text-xs text-gray-400 font-medium bg-white px-2">VS</span>
                            </div>
                            
                            {/* Player 2 */}
                            <div className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${getPlayerCardStyle(match, match.player2?.id)}`}>
                              <div className="flex items-center gap-3">
                                {match.player2?.profile_picture ? (
                                  <img
                                    src={match.player2.profile_picture}
                                    alt={match.player2.name}
                                    className="h-8 w-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                                    <User className="h-4 w-4 text-purple-600" />
                                  </div>
                                )}
                                <span className="font-medium">
                                  {match.player2?.name || 'TBD'}
                                </span>
                                {match.winner?.id === match.player2?.id && (
                                  <Crown className="h-4 w-4 text-yellow-500" />
                                )}
                              </div>
                              {match.player2_score !== null && (
                                <span className="text-xl font-bold">{match.player2_score}</span>
                              )}
                            </div>
                          </div>

                          {/* Match Footer */}
                          {match.scheduled_time && (
                            <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <Clock className="h-3 w-3" />
                                {new Date(match.scheduled_time).toLocaleString()}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Connection Line to Next Round */}
                        {roundIndex < rounds.length - 1 && (
                          <div className="absolute top-1/2 -right-4 transform -translate-y-1/2">
                            <ChevronRight className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                    ))}
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
              {tournament.winner.profile_picture ? (
                <img
                  src={tournament.winner.profile_picture}
                  alt={tournament.winner.name}
                  className="h-20 w-20 rounded-full object-cover border-4 border-yellow-300"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-yellow-100 flex items-center justify-center border-4 border-yellow-300">
                  <Crown className="h-10 w-10 text-yellow-600" />
                </div>
              )}
              <div>
                <p className="text-3xl font-bold text-gray-900">{tournament.winner.name}</p>
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
        />
      )}
    </div>
  );
}