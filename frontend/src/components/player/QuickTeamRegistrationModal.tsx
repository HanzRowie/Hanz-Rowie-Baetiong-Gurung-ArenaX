import { useState, useEffect } from 'react';
import { X, Users, AlertCircle } from 'lucide-react';
import TeamService from '@/services/teamService';
import api from '@/services/api';
import toastService from '@/services/toastService';
import type { Team as TeamType, TeamMembership } from '@/types/team.types';

interface TeamWithRole extends TeamType {
  role?: string;
}

interface PlayerRequirements {
  min: number;
  max: number;
  starters: number;
  substitutes: number;
  description: string;
}

interface QuickTeamRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: {
    id: string;
    title: string;
    sport_type: string;
    registration_type: string;
  };
  onSuccess: () => void;
}

export default function QuickTeamRegistrationModal({
  isOpen,
  onClose,
  tournament,
  onSuccess
}: QuickTeamRegistrationModalProps) {
  const [teams, setTeams] = useState<TeamWithRole[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<TeamWithRole | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMembership[]>([]);
  const [starterPlayers, setStarterPlayers] = useState<string[]>([]);
  const [substitutePlayers, setSubstitutePlayers] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<'team-selection' | 'player-selection'>('team-selection');
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string>('');

  const getPlayerRequirements = (): PlayerRequirements => {
    const sport = tournament.sport_type.toUpperCase();
    
    switch (sport) {
      case 'FUTSAL':
        return {
          min: 5,
          max: 11,
          starters: 5,
          substitutes: 6,
          description: '5 starting players + up to 6 substitutes'
        };
      case 'BADMINTON':
        return {
          min: 2,
          max: 4,
          starters: 2,
          substitutes: 2,
          description: '2 main players + up to 2 substitutes'
        };
      default:
        return {
          min: 1,
          max: 5,
          starters: 1,
          substitutes: 4,
          description: 'Check tournament rules for player requirements'
        };
    }
  };

  const requirements = getPlayerRequirements();

  useEffect(() => {
    if (isOpen) {
      loadTeams();
      setCurrentStep('team-selection');
      setSelectedTeamId('');
      setSelectedTeam(null);
      setStarterPlayers([]);
      setSubstitutePlayers([]);
      setError('');
    }
  }, [isOpen, tournament.sport_type]);

  const loadTeamMembers = async (teamId: string) => {
    try {
      setLoading(true);
      const response = await TeamService.getTeam(teamId);
      if (response.success && response.data) {
        const members = response.data.memberships.filter((m: TeamMembership) => m.is_active);
        console.log('Loaded team members:', members.map(m => ({ 
          id: m.player.id, 
          name: m.player.full_name, 
          role: m.role,
          idType: typeof m.player.id 
        })));
        setTeamMembers(members);
      }
    } catch (error: any) {
      console.error('Error loading team members:', error);
      setError('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!selectedTeamId) {
      setError('Please select a team');
      return;
    }

    if (!validateSelection()) {
      return;
    }

    try {
      setRegistering(true);
      const selectedPlayerIds = [...starterPlayers, ...substitutePlayers];
      
      console.log('Registering team:', {
        team_id: selectedTeamId,
        selected_players: selectedPlayerIds,
        team_members: teamMembers.map(m => ({ id: m.player.id, name: m.player.full_name, role: m.role }))
      });
      
      await api.post(`/api/tournaments/${tournament.id}/register-team/`, {
        team_id: selectedTeamId,
        selected_players: selectedPlayerIds
      });
      
      toastService.success('Team registered successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error registering team:', error);
      console.error('Error details:', error.response?.data);
      setError(error.response?.data?.error || error.message || 'Failed to register team');
    } finally {
      setRegistering(false);
    }
  };

  const handleBack = () => {
    setCurrentStep('team-selection');
    setSelectedTeam(null);
    setTeamMembers([]);
    setStarterPlayers([]);
    setSubstitutePlayers([]);
    setError('');
  };

  const loadTeams = async () => {
    try {
      setLoading(true);
      const response = await TeamService.getMyTeams();
      
      // Filter teams by sport and where user is owner/leader (not captain)
      const eligibleTeams = response.data.filter((team: TeamWithRole) => {
        const teamSport = team.sport_types?.[0] || '';
        const userRole = team.role || (team.owner ? 'OWNER' : 'MEMBER');
        return teamSport.toUpperCase() === tournament.sport_type.toUpperCase() &&
          (userRole === 'OWNER' || userRole === 'LEADER');
      });
      
      setTeams(eligibleTeams);
      
      if (eligibleTeams.length === 1) {
        setSelectedTeamId(eligibleTeams[0].id);
      }
    } catch (error: any) {
      console.error('Error loading teams:', error);
      toastService.error('Failed to load your teams');
    } finally {
      setLoading(false);
    }
  };

  const handleTeamSelect = async (teamId: string) => {
    setSelectedTeamId(teamId);
    const team = teams.find(t => t.id === teamId);
    setSelectedTeam(team || null);
    
    if (team && team.member_count >= requirements.min) {
      await loadTeamMembers(teamId);
      setCurrentStep('player-selection');
    }
  };

  const handlePlayerToggle = (playerId: string, isStarter: boolean) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {currentStep === 'team-selection' ? 'Register Team' : 'Select Players'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {currentStep === 'team-selection' 
                ? tournament.title 
                : `${selectedTeam?.name} - ${tournament.title}`
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 'team-selection' ? (
            // Team Selection Step
            <>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
                </div>
              ) : teams.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Eligible Teams</h3>
                  <p className="text-gray-600 mb-6">
                    You don't have any {tournament.sport_type.toLowerCase()} teams where you're the owner or captain.
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      window.location.href = '/teams';
                    }}
                    className="bg-purple-600 text-white px-6 py-2.5 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    Create a Team
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select Your Team
                    </label>
                    <div className="space-y-2">
                      {teams.map((team) => {
                        const hasEnoughPlayers = team.member_count >= requirements.min;
                        
                        return (
                          <button
                            key={team.id}
                            onClick={() => hasEnoughPlayers && handleTeamSelect(team.id)}
                            disabled={!hasEnoughPlayers}
                            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                              selectedTeamId === team.id
                                ? 'border-purple-600 bg-purple-50'
                                : hasEnoughPlayers
                                ? 'border-gray-200 hover:border-gray-300 bg-white'
                                : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  selectedTeamId === team.id ? 'bg-purple-600' : 'bg-gray-200'
                                }`}>
                                  <Users className={`h-5 w-5 ${
                                    selectedTeamId === team.id ? 'text-white' : 'text-gray-600'
                                  }`} />
                                </div>
                                <div>
                                  <h4 className={`font-semibold ${hasEnoughPlayers ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {team.name}
                                  </h4>
                                  <p className={`text-sm ${hasEnoughPlayers ? 'text-gray-600' : 'text-gray-400'}`}>
                                    {team.member_count} members • {team.role || 'OWNER'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                {hasEnoughPlayers ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Eligible
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Need {requirements.min - team.member_count} more
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {!hasEnoughPlayers && (
                              <p className="text-xs text-red-600 mt-2">
                                This team needs at least {requirements.min} members to register for {tournament.sport_type} tournaments.
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Requirements Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-blue-900 font-medium mb-1">Player Requirements</p>
                        <p className="text-sm text-blue-800">
                          {requirements.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            // Player Selection Step
            <>
              {/* Requirements Info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                <p className="text-sm font-medium text-blue-800">Player Requirements</p>
                <p className="text-sm text-blue-700 mt-1">{requirements.description}</p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-blue-600">
                  <span>Starters: {starterPlayers.length}/{requirements.starters}</span>
                  <span>Substitutes: {substitutePlayers.length}/{requirements.substitutes}</span>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Available Players</h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {teamMembers.map((membership) => {
                        const playerSelection = isPlayerSelected(membership.player.id);
                        const canBeStarter = canSelectAsStarter(membership.player.id);
                        const canBeSubstitute = canSelectAsSubstitute(membership.player.id);
                        
                        return (
                          <div
                            key={membership.id}
                            className={`p-4 border rounded-lg ${
                              playerSelection ? 'border-purple-500 bg-purple-50' : 'border-gray-300'
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
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                {/* Starter Button */}
                                <button
                                  type="button"
                                  disabled={!canBeStarter && playerSelection !== 'starter'}
                                  onClick={() => handlePlayerToggle(membership.player.id, true)}
                                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                    playerSelection === 'starter'
                                      ? 'bg-purple-600 text-white'
                                      : canBeStarter
                                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                  }`}
                                >
                                  {playerSelection === 'starter' ? 'Starter ✓' : 'Starter'}
                                </button>

                                {/* Substitute Button */}
                                <button
                                  type="button"
                                  disabled={!canBeSubstitute && playerSelection !== 'substitute'}
                                  onClick={() => handlePlayerToggle(membership.player.id, false)}
                                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                    playerSelection === 'substitute'
                                      ? 'bg-purple-600 text-white'
                                      : canBeSubstitute
                                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                  }`}
                                >
                                  {playerSelection === 'substitute' ? 'Sub ✓' : 'Sub'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selection Summary */}
                  <div className="p-4 bg-gray-50 rounded-lg mb-6">
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
                </>
              )}
            </>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {currentStep === 'player-selection' && (
              <button
                onClick={handleBack}
                disabled={registering}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
              >
                Back
              </button>
            )}
            <button
              onClick={onClose}
              disabled={registering}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
            >
              Cancel
            </button>
            {currentStep === 'player-selection' && (
              <button
                onClick={handleRegister}
                disabled={starterPlayers.length < requirements.starters || registering}
                className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {registering ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Registering...
                  </div>
                ) : (
                  'Register Team'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
