import React, { useState, useEffect } from 'react';
import { X, Trophy, Clock, MapPin, AlertTriangle, FileText, User, Users, Flag } from 'lucide-react';
import { api } from '@/services/api';

interface Remark {
  id: string;
  remark_type: string;
  remark_type_display: string;
  severity: string;
  severity_display: string;
  team_name: string | null;
  player_name: string;
  minute: number | null;
  title: string;
  description: string;
  created_by_name: string;
  created_at: string;
}

interface MatchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  match: {
    id: string;
    round_number: number;
    match_number?: number;
    status: string;
    scheduled_time?: string;
    // bracket fields
    player1?: { id: string; name?: string; full_name?: string } | null;
    player2?: { id: string; name?: string; full_name?: string } | null;
    team1?: { id: string; name?: string } | null;
    team2?: { id: string; name?: string } | null;
    player1_score?: number | null;
    player2_score?: number | null;
    team1_score?: number | null;
    team2_score?: number | null;
    winner?: { id: string; name?: string; full_name?: string } | null;
    winning_team?: { id: string; name?: string } | null;
    notes?: string;
    // league fields
    home_team?: { id: string; name: string };
    away_team?: { id: string; name: string };
    home_score?: number;
    away_score?: number;
    venue?: string;
    match_venue_display?: string | null;
    match_venue_name?: string;
  };
  isTeamTournament?: boolean;
}

const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'bg-blue-100 text-blue-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-red-100 text-red-700',
};

const REMARK_ICONS: Record<string, string> = {
  PENALTY: '🟡',
  YELLOW_CARD: '🟨',
  RED_CARD: '🟥',
  FOUL: '⚠️',
  INJURY: '🩹',
  SUBSTITUTION: '🔄',
  DISPUTE: '❗',
  CUSTOM: '📝',
};

const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  isOpen, onClose, tournamentId, match, isTeamTournament = false,
}) => {
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !match?.id) return;
    setLoading(true);
    api.get(`/api/tournaments/${tournamentId}/matches/${match.id}/remarks/`)
      .then(res => setRemarks(res.data.remarks || []))
      .catch(() => setRemarks([]))
      .finally(() => setLoading(false));
  }, [isOpen, match?.id, tournamentId]);

  if (!isOpen) return null;

  // Resolve participant names — handles both bracket and league shapes
  const p1Name = isTeamTournament
    ? (match.team1?.name || match.home_team?.name || 'Team 1')
    : (match.player1?.full_name || match.player1?.name || 'Player 1');
  const p2Name = isTeamTournament
    ? (match.team2?.name || match.away_team?.name || 'Team 2')
    : (match.player2?.full_name || match.player2?.name || 'Player 2');

  const score1 = match.team1_score ?? match.player1_score ?? match.home_score;
  const score2 = match.team2_score ?? match.player2_score ?? match.away_score;

  const winnerName = isTeamTournament
    ? (match.winning_team?.name || match.winner?.name)
    : (match.winner?.full_name || match.winner?.name);

  const venue = match.match_venue_display || match.match_venue_name || match.venue;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Match Details</h2>
            <p className="text-sm text-gray-500">
              Round {match.round_number}{match.match_number ? ` · Match ${match.match_number}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {/* Score Card */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-5">
            <div className="flex items-center justify-between gap-4">
              {/* Team/Player 1 */}
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {isTeamTournament ? <Users className="h-4 w-4 text-purple-500" /> : <User className="h-4 w-4 text-purple-500" />}
                </div>
                <p className="font-semibold text-gray-900 text-sm leading-tight">{p1Name}</p>
              </div>

              {/* Score */}
              <div className="text-center flex-shrink-0">
                {score1 !== undefined && score1 !== null && score2 !== undefined && score2 !== null ? (
                  <div className="flex items-center gap-3">
                    <span className="text-4xl font-black text-gray-900">{score1}</span>
                    <span className="text-xl text-gray-400">–</span>
                    <span className="text-4xl font-black text-gray-900">{score2}</span>
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">No score</span>
                )}
                <div className="mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <Trophy className="h-3 w-3" />
                    {match.status}
                  </span>
                </div>
              </div>

              {/* Team/Player 2 */}
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {isTeamTournament ? <Users className="h-4 w-4 text-blue-500" /> : <User className="h-4 w-4 text-blue-500" />}
                </div>
                <p className="font-semibold text-gray-900 text-sm leading-tight">{p2Name}</p>
              </div>
            </div>

            {/* Winner */}
            {winnerName && (
              <div className="mt-3 text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                  🏆 Winner: {winnerName}
                </span>
              </div>
            )}
          </div>

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3">
            {match.scheduled_time && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span>{new Date(match.scheduled_time).toLocaleString()}</span>
              </div>
            )}
            {venue && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{venue}</span>
              </div>
            )}
          </div>

          {/* Match Notes */}
          {match.notes && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700">Match Notes</h3>
              </div>
              <p className="text-sm text-gray-600">{match.notes}</p>
            </div>
          )}

          {/* Remarks */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Flag className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700">
                Remarks & Incidents
                {remarks.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs">{remarks.length}</span>
                )}
              </h3>
            </div>

            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
              </div>
            ) : remarks.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-xl">
                <AlertTriangle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No remarks recorded for this match</p>
              </div>
            ) : (
              <div className="space-y-3">
                {remarks.map(remark => (
                  <div key={remark.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{REMARK_ICONS[remark.remark_type] || '📝'}</span>
                        <span className="font-semibold text-sm text-gray-900">{remark.remark_type_display}</span>
                        {remark.minute !== null && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {remark.minute}'
                          </span>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_COLORS[remark.severity] || 'bg-gray-100 text-gray-600'}`}>
                        {remark.severity_display}
                      </span>
                    </div>

                    {remark.title && (
                      <p className="text-sm font-medium text-gray-800 mb-1">{remark.title}</p>
                    )}
                    {remark.description && (
                      <p className="text-sm text-gray-600 mb-2">{remark.description}</p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                      {remark.team_name && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {remark.team_name}
                        </span>
                      )}
                      {remark.player_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {remark.player_name}
                        </span>
                      )}
                      <span>by {remark.created_by_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchDetailModal;
