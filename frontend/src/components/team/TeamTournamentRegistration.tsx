import React, { useState, useEffect } from 'react';
import { Button } from '@/design-system/components/Button';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/design-system/components/Modal';
import { TeamService } from '@/services';
import type { Team, SportType } from '@/types/team.types';
import type { Tournament } from '@/types/tournament.types';

interface TeamTournamentRegistrationProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  onRegistrationComplete?: () => void;
  onOpenPlayerSelection?: (team: Team, tournament: Tournament) => void;
  preSelectedTeam?: Team; // Add this prop for when we already know which team to register
}

export const TeamTournamentRegistration: React.FC<TeamTournamentRegistrationProps> = ({
  isOpen,
  onClose,
  tournament,
  onRegistrationComplete,
  onOpenPlayerSelection,
  preSelectedTeam,
}) => {
  const [eligibleTeams, setEligibleTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [registering, setRegistering] = useState(false);

  const loadEligibleTeams = async () => {
    setLoading(true);
    setError('');

    try {
      // If we have a pre-selected team, just use that
      if (preSelectedTeam) {
        // Validate that the pre-selected team is eligible
        const sportMatch = preSelectedTeam.sport_types.includes(tournament.sport_type.toUpperCase() as SportType);
        
        if (sportMatch && preSelectedTeam.is_active) {
          setEligibleTeams([preSelectedTeam]);
          setSelectedTeam(preSelectedTeam);
        } else {
          setError(`Team "${preSelectedTeam.name}" is not eligible for this ${tournament.sport_type} tournament.`);
        }
        setLoading(false);
        return;
      }

      // Get teams where user is owner or leader and sport matches tournament
      const response = await TeamService.getMyTeams();
      
      if (response.success && response.data) {
        const teams = response.data.filter(team => {
          // Check if user can register team for tournaments
          const userMembership = team.memberships.find(m => m.is_active);
          const canRegister = userMembership?.role === 'OWNER' || userMembership?.role === 'LEADER';
          
          // Check if team supports the tournament sport
          const sportMatch = team.sport_types.includes(tournament.sport_type.toUpperCase() as SportType);
          
          return canRegister && sportMatch && team.is_active;
        });
        
        setEligibleTeams(teams);
        
        if (teams.length === 0) {
          setError(`No eligible teams found for ${tournament.sport_type} tournaments. You need to be a team owner or leader of a team that supports this sport.`);
        }
      } else {
        setError('Failed to load teams');
      }
    } catch (error: any) {
      console.error('Error loading teams:', error);
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadEligibleTeams();
    }
  }, [isOpen, tournament.sport_type]);

  const getRequiredPlayerCount = (): { min: number; max: number; description: string } => {
    const sport = tournament.sport_type.toUpperCase();
    
    switch (sport) {
      case 'FUTSAL':
        return {
          min: 5,
          max: 11, // 5 starters + 6 substitutes
          description: '5 starting players + up to 6 substitutes'
        };
      case 'BADMINTON':
        // Assume doubles for team tournaments
        return {
          min: 2,
          max: 4, // 2 main players + 2 substitutes
          description: '2 main players + up to 2 substitutes'
        };
      default:
        return {
          min: 1,
          max: 5,
          description: 'Check tournament rules for player requirements'
        };
    }
  };

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
    setError('');
  };

  const handleProceedToPlayerSelection = () => {
    if (selectedTeam) {
      onOpenPlayerSelection?.(selectedTeam, tournament);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedTeam(null);
    setError('');
    setRegistering(false);
    onClose();
  };

  const playerRequirements = getRequiredPlayerCount();

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      closeOnOverlayClick={!registering}
      closeOnEscape={!registering}
    >
      <ModalHeader>
        <ModalTitle>Register Team for Tournament</ModalTitle>
        <ModalDescription>
          Select a team to register for {tournament.title}
        </ModalDescription>
      </ModalHeader>

      <div className="space-y-6">
        {/* Tournament Info */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">{tournament.title}</p>
              <p className="text-sm text-gray-600">{tournament.sport_type}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Entry Fee</p>
              <p className="text-sm font-medium text-gray-900">{tournament.entry_fee}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Player Requirements:</span> {playerRequirements.description}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Registration Deadline:</span> {new Date(tournament.registration_deadline).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-3">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
              <div className="space-y-2">
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Team Selection */}
        {!loading && !error && eligibleTeams.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {preSelectedTeam ? 'Team to Register' : 'Select Team to Register'}
            </label>
            <div className="space-y-3">
              {eligibleTeams.map((team) => {
                const hasEnoughPlayers = team.member_count >= playerRequirements.min;
                
                return (
                  <label
                    key={team.id}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedTeam?.id === team.id
                        ? 'border-primary-500 bg-primary-50'
                        : hasEnoughPlayers
                        ? 'border-gray-300 hover:border-gray-400'
                        : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                    }`}
                  >
                    <input
                      type="radio"
                      name="team"
                      value={team.id}
                      checked={selectedTeam?.id === team.id}
                      onChange={() => handleTeamSelect(team)}
                      disabled={!hasEnoughPlayers}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`font-medium ${hasEnoughPlayers ? 'text-gray-900' : 'text-gray-500'}`}>
                            {team.name}
                          </p>
                          <p className={`text-sm ${hasEnoughPlayers ? 'text-gray-600' : 'text-gray-400'}`}>
                            {team.sport_types.join(', ')} • {team.member_count} members
                          </p>
                        </div>
                        <div className="text-right">
                          {hasEnoughPlayers ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Eligible
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Need {playerRequirements.min - team.member_count} more
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {!hasEnoughPlayers && (
                        <p className="text-xs text-red-600 mt-2">
                          This team needs at least {playerRequirements.min} members to register for {tournament.sport_type} tournaments.
                        </p>
                      )}
                    </div>
                    
                    {selectedTeam?.id === team.id && hasEnoughPlayers && (
                      <svg className="w-5 h-5 text-primary-500 ml-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Next Steps Info */}
        {selectedTeam && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex">
              <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-800">Next Step</p>
                <p className="text-sm text-blue-700 mt-1">
                  You'll select which players from {selectedTeam.name} will participate in this tournament.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <ModalFooter>
        <Button
          type="button"
          variant="secondary"
          onClick={handleClose}
          disabled={registering}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={handleProceedToPlayerSelection}
          disabled={!selectedTeam || registering}
          loading={registering}
        >
          Select Players
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default TeamTournamentRegistration;