import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { Modal } from '@/design-system/components/Modal';
import { TeamService } from '@/services/teamService';
import { FutsalScoreForm } from './FutsalScoreForm';
import { BadmintonScoreForm } from './BadmintonScoreForm';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';

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
  const [matchDetails, setMatchDetails] = useState<Match | null>(null);

  // Check if user is authorized to score matches
  const canScoreMatch = user?.role === 'ORGANIZER' && match.status !== 'COMPLETED';

  useEffect(() => {
    if (isOpen) {
      loadMatchDetails();
    }
  }, [isOpen, match.id]);

  const loadMatchDetails = async () => {
    try {
      const response = await TeamService.getMatchDetails(match.id);
      if (response.success) {
        setMatchDetails(response.data);
      }
    } catch (error) {
      console.error('Failed to load match details:', error);
      toast.error('Failed to load match details');
    }
  };

  const handleScoreSubmit = async (scoreData: any) => {
    if (!canScoreMatch) {
      toast.error('You are not authorized to score this match');
      return;
    }

    setIsLoading(true);
    try {
      let response;
      
      if (match.tournament.sport_type === 'FUTSAL') {
        response = await TeamService.recordFutsalMatchScore(
          match.id,
          scoreData.homeTeamData,
          scoreData.awayTeamData
        );
      } else if (match.tournament.sport_type === 'BADMINTON') {
        response = await TeamService.recordBadmintonMatchScore(
          match.id,
          scoreData.setsData
        );
      }

      if (response?.success) {
        toast.success('Match score recorded successfully');
        setIsOpen(false);
        if (onScoreRecorded) {
          onScoreRecorded(response.data);
        }
      } else {
        toast.error(response?.error || 'Failed to record match score');
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

    setIsLoading(true);
    try {
      const response = await TeamService.updateMatchScore(match.id, scoreData);
      
      if (response?.success) {
        toast.success('Match score updated successfully');
        setIsOpen(false);
        if (onScoreRecorded) {
          onScoreRecorded(response.data);
        }
      } else {
        toast.error(response?.error || 'Failed to update match score');
      }
    } catch (error: any) {
      console.error('Failed to update match score:', error);
      toast.error(error.response?.data?.error || 'Failed to update match score');
    } finally {
      setIsLoading(false);
    }
  };

  const getMatchTitle = () => {
    if (match.tournament.registration_type === 'TEAM') {
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
    
    if (match.tournament.registration_type === 'TEAM') {
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
                {match.tournament.title} - Round {match.round_number}, Match {match.match_number}
              </p>
              {getScoreDisplay() && (
                <p className="text-lg font-bold text-blue-600 mt-1">
                  Score: {getScoreDisplay()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                match.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                match.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                match.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {match.status}
              </span>
              <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                {match.tournament.sport_type}
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
                  onClick={() => setIsOpen(true)}
                  variant={match.status === 'COMPLETED' ? 'secondary' : 'primary'}
                  size="sm"
                >
                  {match.status === 'COMPLETED' ? 'Update Score' : 'Record Score'}
                </Button>
              )}
              {match.status === 'COMPLETED' && (
                <Button
                  onClick={() => setIsOpen(true)}
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
        title={`${match.status === 'COMPLETED' ? 'Match Details' : 'Record Match Score'} - ${getMatchTitle()}`}
        size="lg"
      >
        <div className="space-y-4">
          {match.tournament.sport_type === 'FUTSAL' ? (
            <FutsalScoreForm
              match={matchDetails || match}
              onSubmit={match.status === 'COMPLETED' ? handleUpdateScore : handleScoreSubmit}
              onCancel={() => setIsOpen(false)}
              isLoading={isLoading}
              isReadOnly={!canScoreMatch}
            />
          ) : (
            <BadmintonScoreForm
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