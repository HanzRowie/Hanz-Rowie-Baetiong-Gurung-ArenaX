import React, { useState, useEffect } from 'react';
import { Button } from '@/design-system/components/Button';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/design-system/components/Modal';
import TeamService from '@/services/teamService';
import type { Team, TeamMembership } from '@/types/team.types';
import type { Tournament } from '@/types/tournament.types';

interface PlayerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team;
  tournament: Tournament;
  onRegistrationComplete?: () => void;
}

interface PlayerRequirements {
  min: number;
  max: number;
  starters: number;
  substitutes: number;
  description: string;
}

export const PlayerSelectionModal: React.FC<PlayerSelectionModalProps> = ({
  isOpen,
  onClose,
  team,
  tournament,
  onRegistrationComplete,
}) => {
  const [starterPlayers, setStarterPlayers] = useState<string[]>([]);
  const [substitutePlayers, setSubstitutePlayers] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [alreadyRegisteredPlayers, setAlreadyRegisteredPlayers] = useState<Set<string>>(new Set());
  const [registeredPlayersInfo, setRegisteredPlayersInfo] = useState<Map<string, string>>(new Map());

  // Load team members and already registered players when modal opens
  useEffect(() => {
    const loadData = async () => {
      if (!isOpen || !team.id || !tournament.id) return;
      
      setLoading(true);
      try {
        // Load team members
        const teamResponse = await TeamService.getTeam(team.id);
        if (teamResponse.success && teamResponse.data) {
          setTeamMembers(teamResponse.data.memberships.filter(m => m.is_active));
        }

        // Load already registered players for this tournament
        try {
          const registeredResponse = await fetch(
            `${import.meta.env.VITE_API_URL}/api/tournaments/${tournament.id}/registered-players/`,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
              },
            }
          );

          if (registeredResponse.ok) {
            const data = await registeredResponse.json();
            const playerIds = new Set<string>();
            const playerInfo = new Map<string, string>();
            
            data.registered_players.forEach((player: any) => {
              playerIds.add(player.player_id);
              playerInfo.set(player.player_id, player.team_name);
            });
            
            setAlreadyRegisteredPlayers(playerIds);
            setRegisteredPlayersInfo(playerInfo);
          }
        } catch (err) {
          console.error('Error loading registered players:', err);
          // Don't fail the whole modal if this fails
        }
      } catch (error) {
        console.error('Error loading team members:', error);
        setError('Failed to load team members');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, team.id, tournament.id]);

  const getPlayerRequirements = (): PlayerRequirements => {
    const sport = tournament.sport_type.toUpperCase();
    
    switch (sport) {
      case 'FUTSAL':
        return {
          min: 5,
          max: 11,
          starters: 5,
          substitutes: 6,
          description: '5 starting players (required) + up to 6 substitutes (optional)'
        };
      case 'BADMINTON':
        return {
          min: 2,
          max: 4,
          starters: 2,
          substitutes: 2,
          description: '2 main players (required) + up to 2 substitutes (optional)'
        };
      default:
        return {
          min: 1,
          max: 5,
          starters: 1,
          substitutes: 4,
          description: 'Check tournament rules for specific requirements'
        };
    }
  };

  const requirements = getPlayerRequirements();

  const handleClose = () => {
    setStarterPlayers([]);
    setSubstitutePlayers([]);
    setError('');
    setIsSubmitting(false);
    setTeamMembers([]);
    setLoading(true);
    onClose();
  };

  const handlePlayerToggle = (playerId: string, isStarter: boolean) => {
    // Check if player is already registered with another team
    if (alreadyRegisteredPlayers.has(playerId)) {
      const teamName = registeredPlayersInfo.get(playerId);
      setError(`This player is already registered for this tournament with ${teamName}`);
      return;
    }

    if (isStarter) {
      // Handle starter selection
      if (starterPlayers.includes(playerId)) {
        setStarterPlayers(prev => prev.filter(id => id !== playerId));
      } else if (starterPlayers.length < requirements.starters) {
        setStarterPlayers(prev => [...prev, playerId]);
        // Remove from substitutes if was there
        setSubstitutePlayers(prev => prev.filter(id => id !== playerId));
      }
    } else {
      // Handle substitute selection
      if (substitutePlayers.includes(playerId)) {
        setSubstitutePlayers(prev => prev.filter(id => id !== playerId));
      } else if (substitutePlayers.length < requirements.substitutes) {
        setSubstitutePlayers(prev => [...prev, playerId]);
        // Remove from starters if was there
        setStarterPlayers(prev => prev.filter(id => id !== playerId));
      }
    }
    
    setError('');
  };

  const validateSelection = (): boolean => {
    if (starterPlayers.length < requirements.starters) {
      setError(`Please select ${requirements.starters} starting players`);
      return false;
    }

    const totalSelected = starterPlayers.length + substitutePlayers.length;
    if (totalSelected < requirements.min) {
      setError(`Please select at least ${requirements.min} players`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSelection()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Here you would call the tournament registration API
      // For now, we'll simulate the registration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onRegistrationComplete?.();
      handleClose();
    } catch (error: any) {
      console.error('Error registering team:', error);
      setError('Failed to register team for tournament');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPlayerSelected = (playerId: string): 'starter' | 'substitute' | null => {
    if (starterPlayers.includes(playerId)) return 'starter';
    if (substitutePlayers.includes(playerId)) return 'substitute';
    return null;
  };

  const canSelectAsStarter = (playerId: string): boolean => {
    return starterPlayers.length < requirements.starters || starterPlayers.includes(playerId);
  };

  const canSelectAsSubstitute = (playerId: string): boolean => {
    return substitutePlayers.length < requirements.substitutes || substitutePlayers.includes(playerId);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      closeOnOverlayClick={!isSubmitting}
      closeOnEscape={!isSubmitting}
    >
      <ModalHeader>
        <ModalTitle>Select Players for Tournament</ModalTitle>
        <ModalDescription>
          Choose which players from {team.name} will participate in {tournament.title}
        </ModalDescription>
      </ModalHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Requirements Info */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-800">Player Requirements</p>
          <p className="text-sm text-blue-700 mt-1">{requirements.description}</p>
          <div className="flex items-center space-x-4 mt-2 text-sm text-blue-600">
            <span>Starters: {starterPlayers.length}/{requirements.starters}</span>
            <span>Substitutes: {substitutePlayers.length}/{requirements.substitutes}</span>
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
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        )}

        {/* Player Selection */}
        {!loading && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Available Players</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {teamMembers.map((membership) => {
                const playerSelection = isPlayerSelected(membership.player.id);
                const isAlreadyRegistered = alreadyRegisteredPlayers.has(membership.player.id);
                const registeredTeamName = registeredPlayersInfo.get(membership.player.id);
                const canBeStarter = !isAlreadyRegistered && (canSelectAsStarter(membership.player.id));
                const canBeSubstitute = !isAlreadyRegistered && (canSelectAsSubstitute(membership.player.id));
                
                return (
                  <div
                    key={membership.id}
                    className={`p-4 border rounded-lg ${
                      isAlreadyRegistered 
                        ? 'border-red-300 bg-red-50 opacity-60' 
                        : playerSelection 
                          ? 'border-primary-500 bg-primary-50' 
                          : 'border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {membership.player.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{membership.player.full_name}</p>
                          <p className="text-sm text-gray-600">{membership.player.email}</p>
                          <p className="text-xs text-gray-500">
                            {membership.role} • Joined {new Date(membership.joined_at).toLocaleDateString()}
                          </p>
                          {isAlreadyRegistered && (
                            <p className="text-xs text-red-600 font-medium mt-1">
                              ⚠️ Already registered with {registeredTeamName}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Starter Button */}
                        <Button
                          type="button"
                          variant={playerSelection === 'starter' ? 'primary' : 'secondary'}
                          size="sm"
                          disabled={isAlreadyRegistered || (!canBeStarter && playerSelection !== 'starter')}
                          onClick={() => handlePlayerToggle(membership.player.id, true)}
                        >
                          {playerSelection === 'starter' ? 'Starter ✓' : 'Starter'}
                        </Button>

                        {/* Substitute Button */}
                        <Button
                          type="button"
                          variant={playerSelection === 'substitute' ? 'primary' : 'ghost'}
                          size="sm"
                          disabled={isAlreadyRegistered || (!canBeSubstitute && playerSelection !== 'substitute')}
                          onClick={() => handlePlayerToggle(membership.player.id, false)}
                        >
                          {playerSelection === 'substitute' ? 'Sub ✓' : 'Sub'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Selection Summary */}
        {!loading && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Selection Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Starting Players</p>
                <p className="font-medium text-gray-900">
                  {starterPlayers.length}/{requirements.starters}
                  {starterPlayers.length >= requirements.starters && (
                    <span className="text-green-600 ml-1">✓</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Substitute Players</p>
                <p className="font-medium text-gray-900">
                  {substitutePlayers.length}/{requirements.substitutes}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting || loading || starterPlayers.length < requirements.starters}
          >
            Register Team
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default PlayerSelectionModal;