import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { Modal } from '@/design-system/components/Modal';
import { tournamentService } from '@/services/tournamentService';
import { LeagueMatchScorer } from './LeagueMatchScorer';
import { BracketMatchScorer } from './BracketMatchScorer';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';

interface Match {
  id: string;
  tournament: {
    id: string;
    title: string;
    sport_type: 'FUTSAL' | 'BADMINTON';
    registration_type?: 'TEAM' | 'INDIVIDUAL';
    tournament_type?: string;
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

interface MatchScorerProps {
  match: Match;
  onScoreRecorded?: (match: Match) => void;
  onClose?: () => void;
}

export const MatchScorer: React.FC<MatchScorerProps> = ({
  match,
  onScoreRecorded,
  onClose
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [matchDetails, setMatchDetails] = useState<Match | null>(null);

  // Check if user is authorized to score matches
  const canScoreMatch = user?.role === 'ORGANIZER' && match.status !== 'COMPLETED';

  useEffect(() => {
    if (isOpen) {
      loadMatchDetails();
    }
  }, [isOpen, match.id]);

  const loadMatchDetails = async () => {
    setIsDetailsLoading(true);
    try {
      if (!match.tournament?.id) {
        toast.error('Tournament information not available');
        return;
      }

      const response = await tournamentService.getMatchDetails(match.tournament.id, match.id);
      if (response.success) {
        setMatchDetails(response.data);
      }
    } catch (error) {
      console.error('Failed to load match details:', error);
      toast.error('Failed to load match details');
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const handleScoreSubmit = async (scoreData: any) => {
    if (!canScoreMatch) {
      toast.error('You are not authorized to score this match');
      return;
    }

    if (match.status === 'COMPLETED') {
      toast.error('This match has already been completed and cannot be edited.');
      return;
    }

    if (!match.tournament?.id) {
      toast.error('Tournament information not available');
      return;
    }

    setIsLoading(true);
    try {
      let response;

      // Check if this is a league tournament
      const isLeagueTournament = match.tournament.tournament_type === 'league';

      if (isLeagueTournament) {
        // Use league match result submission endpoint
        response = await tournamentService.submitMatchResult(
          match.tournament.id,
          match.id,
          scoreData
        );
      } else if (match.tournament.sport_type === 'FUTSAL') {
        response = await tournamentService.recordFutsalMatchScore(
          match.tournament.id,
          match.id,
          scoreData
        );
      } else if (match.tournament.sport_type === 'BADMINTON') {
        // Transform set data into match result format
        const { setsData } = scoreData;
        const homeSetsWon = setsData.filter((s: any) => s.home_score > s.away_score).length;
        const awaySetsWon = setsData.filter((s: any) => s.away_score > s.home_score).length;
        const isTeam = match.tournament.registration_type === 'TEAM';
        const winnerId = homeSetsWon > awaySetsWon
          ? (isTeam ? match.team1?.id : match.player1?.id)
          : (isTeam ? match.team2?.id : match.player2?.id);

        const badmintonPayload = isTeam
          ? { team1_score: homeSetsWon, team2_score: awaySetsWon, winner_id: winnerId }
          : { player1_score: homeSetsWon, player2_score: awaySetsWon, winner_id: winnerId };

        response = await tournamentService.updateMatchResult(
          match.tournament.id,
          match.id,
          badmintonPayload
        );
      }

      if (response?.success) {
        toast.success('Match score recorded successfully');
        setIsOpen(false);
        if (onScoreRecorded) {
          onScoreRecorded(response.match);
        }
      } else {
        toast.error(response?.message || 'Failed to record match score');
      }
    } catch (error: any) {
      console.error('Failed to record match score:', error);
      toast.error(error.response?.data?.error || 'Failed to record match score');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateScore = async (scoreData: any) => {
    if (!canScoreMatch) {
      toast.error('You are not authorized to update this match');
      return;
    }

    if (match.status === 'COMPLETED') {
      toast.error('This match has already been completed and cannot be edited.');
      return;
    }

    if (!match.tournament?.id) {
      toast.error('Tournament information not available');
      return;
    }

    setIsLoading(true);
    try {
      let response;

      // Check if this is a league tournament
      const isLeagueTournament = match.tournament.tournament_type === 'league';

      if (isLeagueTournament) {
        // Use league match result submission endpoint
        response = await tournamentService.submitMatchResult(
          match.tournament.id,
          match.id,
          scoreData
        );
      } else if (match.tournament.sport_type === 'FUTSAL') {
        response = await tournamentService.recordFutsalMatchScore(
          match.tournament.id,
          match.id,
          scoreData
        );
      } else if (match.tournament.sport_type === 'BADMINTON') {
        const { setsData } = scoreData;
        const homeSetsWon = setsData.filter((s: any) => s.home_score > s.away_score).length;
        const awaySetsWon = setsData.filter((s: any) => s.away_score > s.home_score).length;
        const isTeam = match.tournament.registration_type === 'TEAM';
        const winnerId = homeSetsWon > awaySetsWon
          ? (isTeam ? match.team1?.id : match.player1?.id)
          : (isTeam ? match.team2?.id : match.player2?.id);

        const badmintonPayload = isTeam
          ? { team1_score: homeSetsWon, team2_score: awaySetsWon, winner_id: winnerId }
          : { player1_score: homeSetsWon, player2_score: awaySetsWon, winner_id: winnerId };

        response = await tournamentService.updateMatchResult(
          match.tournament.id,
          match.id,
          badmintonPayload
        );
      } else {
        // For non-futsal tournaments, use the basic update method
        response = await tournamentService.updateMatchResult(
          match.tournament.id,
          match.id,
          scoreData
        );
      }

      if ((response as any)?.success || (response as any)?.match) {
        toast.success('Match score updated successfully');
        setIsOpen(false);
        if (onScoreRecorded) {
          onScoreRecorded((response as any).match || (response as any).data);
        }
      } else {
        toast.error(response?.message || 'Failed to update match score');
      }
    } catch (error: any) {
      console.error('Failed to update match score:', error);
      toast.error(error.response?.data?.error || 'Failed to update match score');
    } finally {
      setIsLoading(false);
    }
  };

  const getMatchTitle = () => {
    // Check if it's a team tournament by looking for team1/team2 properties
    const isTeamTournament = match.team1 || match.team2;

    if (isTeamTournament) {
      const team1Name = match.team1?.name || 'TBD';
      const team2Name = match.team2?.name || 'TBD';
      return `${team1Name} vs ${team2Name}`;
    } else {
      const player1Name = match.player1?.name || 'TBD';
      const player2Name = match.player2?.name || 'TBD';
      return `${player1Name} vs ${player2Name}`;
    }
  };

  const getScoreDisplay = () => {
    if (match.status !== 'COMPLETED') return null;

    // Check if it's a team tournament by looking for team scores
    const isTeamTournament = match.team1_score !== undefined || match.team2_score !== undefined;

    if (isTeamTournament) {
      return `${match.team1_score || 0} - ${match.team2_score || 0}`;
    } else {
      return `${match.player1_score || 0} - ${match.player2_score || 0}`;
    }
  };

  if (!canScoreMatch && match.status !== 'COMPLETED') {
    return null;
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{getMatchTitle()}</h3>
              <p className="text-sm text-gray-600">
                {match.tournament?.title || 'Tournament'} - Round {match.round_number}, Match {match.match_number}
              </p>
              {getScoreDisplay() && (
                <p className="text-lg font-bold text-blue-600 mt-1">
                  Score: {getScoreDisplay()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${match.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                match.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                  match.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                }`}>
                {match.status}
              </span>
              <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                {match.tournament?.sport_type || 'UNKNOWN'}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {match.scheduled_time && (
                <p>Scheduled: {new Date(match.scheduled_time).toLocaleString()}</p>
              )}
              {match.actual_start_time && (
                <p>Started: {new Date(match.actual_start_time).toLocaleString()}</p>
              )}
              {match.actual_end_time && (
                <p>Ended: {new Date(match.actual_end_time).toLocaleString()}</p>
              )}
            </div>
            <div className="flex gap-2">
              {canScoreMatch && (
                <Button
                  onClick={() => {
                    setIsDetailsLoading(true);
                    setIsOpen(true);
                  }}
                  variant={match.status === 'COMPLETED' ? 'secondary' : 'primary'}
                  size="sm"
                >
                  {match.status === 'COMPLETED' ? 'Update Score' : 'Record Score'}
                </Button>
              )}
              {match.status === 'COMPLETED' && (
                <Button
                  onClick={() => {
                    setIsDetailsLoading(true);
                    setIsOpen(true);
                  }}
                  variant="secondary"
                  size="sm"
                >
                  View Details
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          if (onClose) onClose();
        }}
        title=""
        size="xl"
      >
        <div className="space-y-4">
          {isDetailsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Loading match details...</span>
            </div>
          ) : match.tournament?.tournament_type === 'league' ? (
            <LeagueMatchScorer
              match={matchDetails || match}
              onSubmit={match.status === 'COMPLETED' ? handleUpdateScore : handleScoreSubmit}
              onCancel={() => setIsOpen(false)}
              isLoading={isLoading}
              isReadOnly={!canScoreMatch}
            />
          ) : (
            <BracketMatchScorer
              match={matchDetails || match}
              onSubmit={match.status === 'COMPLETED' ? handleUpdateScore : handleScoreSubmit}
              onCancel={() => setIsOpen(false)}
              isLoading={isLoading}
              isReadOnly={!canScoreMatch}
            />
          )}
        </div>
      </Modal>
    </>
  );
};

export default MatchScorer;