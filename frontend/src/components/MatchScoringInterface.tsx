import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { MatchScorer } from './MatchScorer';
import { LiveMatchScorer } from './LiveMatchScorer';
import { tournamentService } from '@/services/tournamentService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { Zap, FileText } from 'lucide-react';

interface Match {
  id: string;
  tournament: {
    id: string;
    title: string;
    sport_type: 'FUTSAL' | 'BADMINTON';
    registration_type: 'TEAM' | 'INDIVIDUAL';
  };
  round_number: number;
  match_number: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  team1?: {
    id: string;
    name: string;
  };
  team2?: {
    id: string;
    name: string;
  };
  player1?: {
    id: string;
    name: string;
  };
  player2?: {
    id: string;
    name: string;
  };
  team1_score?: number;
  team2_score?: number;
  player1_score?: number;
  player2_score?: number;
  winning_team?: {
    id: string;
    name: string;
  };
  winner?: {
    id: string;
    name: string;
  };
  scheduled_time?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  notes?: string;
}

interface Tournament {
  id: string;
  title: string;
  sport_type: 'FUTSAL' | 'BADMINTON';
  tournament_type?: 'knockout' | 'league' | 'round_robin';
  registration_type: 'TEAM' | 'INDIVIDUAL';
  status: string;
}

interface MatchScoringInterfaceProps {
  tournamentId?: string;
  onMatchScored?: (match: Match) => void;
}

export const MatchScoringInterface: React.FC<MatchScoringInterfaceProps> = ({
  tournamentId,
  onMatchScored
}) => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>(tournamentId || '');
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [liveMatchId, setLiveMatchId] = useState<string | null>(null);
  const [scoringMode, setScoringMode] = useState<'live' | 'detailed'>('live');

  // Check if user is an organizer
  const isOrganizer = user?.role === 'ORGANIZER';

  useEffect(() => {
    if (isOrganizer) {
      loadTournaments();
    }
  }, [isOrganizer]);

  useEffect(() => {
    if (selectedTournament) {
      loadMatches();
    }
  }, [selectedTournament]);

  const loadTournaments = async () => {
    try {
      const response = await tournamentService.getMyTournaments();
      const organizedTournaments = response.organized_tournaments || [];
      
      // Map to our Tournament interface
      const mappedTournaments: Tournament[] = organizedTournaments.map(t => ({
        id: t.id,
        title: t.title,
        sport_type: t.sport_type as 'FUTSAL' | 'BADMINTON',
        tournament_type: (t as any).tournament_type,
        registration_type: (t as any).registration_type || 'INDIVIDUAL',
        status: t.status
      }));
      
      setTournaments(mappedTournaments);
      
      if (!selectedTournament && mappedTournaments.length > 0) {
        setSelectedTournament(mappedTournaments[0].id);
      }
    } catch (error) {
      console.error('Failed to load tournaments:', error);
      toast.error('Failed to load tournaments');
    }
  };

  const loadMatches = async () => {
    if (!selectedTournament) return;
    
    setIsLoading(true);
    try {
      // Get the selected tournament to check its type
      const selectedTournamentData = tournaments.find(t => t.id === selectedTournament);
      
      console.log('Loading matches for tournament:', selectedTournamentData);
      
      let tournamentMatches = [];
      
      // Use different endpoint based on tournament type
      if (selectedTournamentData?.tournament_type === 'league' || selectedTournamentData?.tournament_type === 'round_robin') {
        // For league/round-robin tournaments, use the matches endpoint
        console.log('Using matches endpoint for league/round-robin tournament');
        const response = await tournamentService.getTournamentMatches(selectedTournament);
        tournamentMatches = response.matches || [];
      } else {
        // For knockout tournaments, use the bracket endpoint
        console.log('Using bracket endpoint for knockout tournament');
        try {
          const response = await tournamentService.getTournamentBracket(selectedTournament);
          tournamentMatches = response.matches || [];
        } catch (error: any) {
          // If bracket endpoint fails, fall back to matches endpoint
          console.log('Bracket endpoint failed, falling back to matches endpoint');
          const response = await tournamentService.getTournamentMatches(selectedTournament);
          tournamentMatches = response.matches || [];
        }
      }
      
      // Map to our Match interface
      const mappedMatches: Match[] = tournamentMatches.map((m: any) => ({
        id: m.id,
        tournament: {
          id: selectedTournament,
          title: tournaments.find(t => t.id === selectedTournament)?.title || '',
          sport_type: tournaments.find(t => t.id === selectedTournament)?.sport_type || 'FUTSAL',
          registration_type: tournaments.find(t => t.id === selectedTournament)?.registration_type || 'INDIVIDUAL'
        },
        round_number: m.round_number,
        match_number: m.match_number,
        status: m.status,
        team1: m.team1,
        team2: m.team2,
        player1: m.player1,
        player2: m.player2,
        team1_score: m.team1_score,
        team2_score: m.team2_score,
        player1_score: m.player1_score,
        player2_score: m.player2_score,
        winning_team: m.winning_team,
        winner: m.winner,
        scheduled_time: m.scheduled_time,
        actual_start_time: m.actual_start_time,
        actual_end_time: m.actual_end_time,
        notes: m.notes
      }));
      
      setMatches(mappedMatches);
    } catch (error) {
      console.error('Failed to load matches:', error);
      toast.error('Failed to load matches');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMatchScored = (updatedMatch: Match) => {
    setMatches(prev => prev.map(match => 
      match.id === updatedMatch.id ? updatedMatch : match
    ));
    
    if (onMatchScored) {
      onMatchScored(updatedMatch);
    }
    
    // Close live scorer if match is completed
    if (updatedMatch.status === 'COMPLETED') {
      setLiveMatchId(null);
    }
    
    toast.success('Match score updated successfully');
  };

  const handleOpenLiveScorer = (matchId: string) => {
    setLiveMatchId(matchId);
  };

  const handleCloseLiveScorer = () => {
    setLiveMatchId(null);
    loadMatches(); // Refresh matches
  };

  const getFilteredMatches = () => {
    switch (filter) {
      case 'pending':
        return matches.filter(match => match.status !== 'COMPLETED' && match.status !== 'CANCELLED');
      case 'completed':
        return matches.filter(match => match.status === 'COMPLETED');
      default:
        return matches;
    }
  };

  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOrganizer) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-600">Only tournament organizers can access match scoring.</p>
        </CardContent>
      </Card>
    );
  }

  // Show live scorer if a match is selected
  const selectedMatch = matches.find(m => m.id === liveMatchId);
  if (selectedMatch && scoringMode === 'live') {
    return (
      <LiveMatchScorer
        match={selectedMatch}
        onMatchUpdated={handleMatchScored}
        onClose={handleCloseLiveScorer}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Match Scoring Interface</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Tournament
              </label>
              <select
                value={selectedTournament}
                onChange={(e) => setSelectedTournament(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a tournament...</option>
                {tournaments.map(tournament => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.title} ({tournament.sport_type})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter Matches
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'pending' | 'completed')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Matches</option>
                <option value="pending">Pending Matches</option>
                <option value="completed">Completed Matches</option>
              </select>
            </div>
          </div>
          
          {selectedTournament && (
            <div className="flex justify-end">
              <Button
                onClick={loadMatches}
                variant="secondary"
                size="sm"
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Refresh Matches'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTournament && (
        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-600">Loading matches...</p>
              </CardContent>
            </Card>
          ) : getFilteredMatches().length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-600">
                  {filter === 'pending' ? 'No pending matches found.' :
                   filter === 'completed' ? 'No completed matches found.' :
                   'No matches found for this tournament.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {filter === 'pending' ? 'Pending Matches' :
                   filter === 'completed' ? 'Completed Matches' :
                   'All Matches'} ({getFilteredMatches().length})
                </h3>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Scoring Mode:</span>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setScoringMode('live')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                        scoringMode === 'live'
                          ? 'bg-white text-purple-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Zap className="w-4 h-4" />
                      Live
                    </button>
                    <button
                      onClick={() => setScoringMode('detailed')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                        scoringMode === 'detailed'
                          ? 'bg-white text-purple-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      Detailed
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                {getFilteredMatches().map(match => (
                  scoringMode === 'live' ? (
                    <Card key={match.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-500">
                                Round {match.round_number} • Match {match.match_number}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMatchStatusColor(match.status)}`}>
                                {match.status}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900">
                                  {match.team1?.name || match.player1?.name || 'TBD'}
                                </div>
                                <div className="font-semibold text-gray-900 mt-1">
                                  {match.team2?.name || match.player2?.name || 'TBD'}
                                </div>
                              </div>
                              <div className="text-center px-6">
                                <div className="text-3xl font-bold text-gray-900">
                                  {match.team1_score ?? match.player1_score ?? 0}
                                </div>
                                <div className="text-sm text-gray-400 my-1">-</div>
                                <div className="text-3xl font-bold text-gray-900">
                                  {match.team2_score ?? match.player2_score ?? 0}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="ml-6">
                            <button
                              onClick={() => handleOpenLiveScorer(match.id)}
                              disabled={match.status === 'COMPLETED'}
                              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Zap className="w-4 h-4" />
                              {match.status === 'COMPLETED' ? 'Completed' : 'Score Live'}
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <MatchScorer
                      key={match.id}
                      match={match}
                      onScoreRecorded={handleMatchScored}
                    />
                  )
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MatchScoringInterface;