import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Trophy, 
  Calendar, 
  Crown, 
  Shield, 
  Star,
  Settings,
  UserPlus,
  ArrowLeft,
  Mail,
  Phone,
  Award,
  TrendingUp,
  Activity
} from 'lucide-react';
import TeamService from '@/services/teamService';
import { tournamentService, toastService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { PlayerSelectionModal } from '@/components/team/PlayerSelectionModal';
import { TournamentSelectionModal } from '@/components/team/TournamentSelectionModal';
import { InvitationSender } from '@/components/team/InvitationSender';
import type { Team } from '@/types/team.types';
import type { Tournament } from '@/types/tournament.types';

interface TeamDetailsPageProps {}

export const TeamDetailsPage: React.FC<TeamDetailsPageProps> = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'tournaments' | 'stats'>('overview');
  
  // Modal states
  const [showTournamentSelection, setShowTournamentSelection] = useState(false);
  const [showPlayerSelection, setShowPlayerSelection] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [availableTournaments, setAvailableTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  useEffect(() => {
    if (teamId) {
      loadTeamDetails();
    }
  }, [teamId]);

  const loadTeamDetails = async () => {
    if (!teamId) return;
    
    setLoading(true);
    try {
      const response = await TeamService.getTeam(teamId);
      if (response.success && response.data) {
        setTeam(response.data);
      } else {
        setError('Failed to load team details');
      }
    } catch (error: any) {
      console.error('Error loading team details:', error);
      setError('Failed to load team details');
    } finally {
      setLoading(false);
    }
  };

  const getUserRole = (): string | null => {
    if (!team || !user) return null;
    const membership = team.memberships.find(m => m.player.id === user.id && m.is_active);
    return membership?.role || null;
  };

  const handleRegisterForTournament = async () => {
    if (!team) return;
    
    try {
      // Fetch available tournaments for this team
      const response = await tournamentService.getAvailableTournamentsForTeam(team.id);
      
      if (response && response.length > 0) {
        setAvailableTournaments(response);
        if (response.length === 1) {
          // If only one tournament, skip selection and go directly to player selection
          setSelectedTournament(response[0]);
          setShowPlayerSelection(true);
        } else {
          // If multiple tournaments, show tournament selection modal
          setShowTournamentSelection(true);
        }
      } else {
        toastService.info('No tournaments available for this team at the moment.');
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      toastService.error('Failed to load available tournaments.');
    }
  };

  const handleTournamentSelect = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setShowTournamentSelection(false);
    setShowPlayerSelection(true);
  };

  const handleInvitePlayers = () => {
    setShowInviteModal(true);
  };

  const handleTeamSettings = () => {
    // For now, navigate to team analytics page or show a simple alert
    // In a full implementation, this would open a comprehensive team settings modal
    navigate(`/teams/analytics?teamId=${team?.id}`);
  };

  const handleRegistrationComplete = () => {
    setShowPlayerSelection(false);
    setSelectedTournament(null);
    setAvailableTournaments([]);
    loadTeamDetails(); // Refresh team data
  };

  const handleInvitationSent = () => {
    setShowInviteModal(false);
    loadTeamDetails(); // Refresh team data
    toastService.success('Invitation sent successfully!');
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'LEADER':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      OWNER: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      LEADER: 'bg-blue-100 text-blue-800 border-blue-200',
      MEMBER: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${colors[role as keyof typeof colors] || colors.MEMBER}`}>
        {getRoleIcon(role)}
        {role}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingSkeleton className="h-64 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <LoadingSkeleton className="h-96" />
            </div>
            <div>
              <LoadingSkeleton className="h-96" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Team Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The team you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/teams')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Teams
          </button>
        </div>
      </div>
    );
  }

  const userRole = getUserRole();
  const canManage = userRole === 'OWNER' || userRole === 'LEADER';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/teams')}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
                <div className="flex items-center gap-3 mt-2">
                  {team.sport_types.map((sport) => (
                    <span
                      key={sport}
                      className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium"
                    >
                      {sport}
                    </span>
                  ))}
                  {userRole && getRoleBadge(userRole)}
                </div>
              </div>
            </div>
            
            {canManage && (
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleInvitePlayers}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite Players
                </button>
                <button 
                  onClick={handleTeamSettings}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Manage Team
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Navigation Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {[
                    { key: 'overview', label: 'Overview', icon: Activity },
                    { key: 'members', label: 'Members', icon: Users },
                    { key: 'tournaments', label: 'Tournaments', icon: Trophy },
                    { key: 'stats', label: 'Statistics', icon: TrendingUp },
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key as any)}
                      className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === key
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Overview</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-600">Team Size</p>
                              <p className="font-medium text-gray-900">
                                {team.member_count} / {team.max_size} members
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-600">Created</p>
                              <p className="font-medium text-gray-900">
                                {new Date(team.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <Crown className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-600">Team Owner</p>
                              <p className="font-medium text-gray-900">
                                {team.owner?.full_name || 'Unknown'}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <Trophy className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-600">Tournaments Played</p>
                              <p className="font-medium text-gray-900">{team.tournament_count || 0}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <Award className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-600">Wins</p>
                              <p className="font-medium text-gray-900">{team.wins || 0}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <Star className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-600">Team Rating</p>
                              <p className="font-medium text-gray-900">
                                {team.rating ? `${team.rating}/5.0` : 'Not rated'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                      <div className="bg-gray-50 rounded-lg p-6 text-center">
                        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-600">No recent activity</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'members' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
                      <span className="text-sm text-gray-600">
                        {team.member_count} members
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      {team.memberships
                        .filter(m => m.is_active)
                        .sort((a, b) => {
                          const roleOrder = { OWNER: 0, LEADER: 1, MEMBER: 2 };
                          return roleOrder[a.role as keyof typeof roleOrder] - roleOrder[b.role as keyof typeof roleOrder];
                        })
                        .map((membership) => (
                          <div
                            key={membership.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">
                                  {membership.player.full_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {membership.player.full_name}
                                </p>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Mail className="w-3 h-3" />
                                  {membership.player.email}
                                </div>
                                <p className="text-xs text-gray-500">
                                  Joined {new Date(membership.joined_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              {getRoleBadge(membership.role)}
                              {canManage && membership.role !== 'OWNER' && (
                                <button className="text-gray-400 hover:text-gray-600">
                                  <Settings className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {activeTab === 'tournaments' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Tournament History</h3>
                    {team.tournament_history && team.tournament_history.length > 0 ? (
                      <div className="space-y-4">
                        {team.tournament_history.map((tournament: any, index: number) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-gray-900">{tournament.name}</h4>
                                <p className="text-sm text-gray-600 mt-1">{tournament.sport_type}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(tournament.date).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  tournament.result === 'WON' 
                                    ? 'bg-green-100 text-green-800'
                                    : tournament.result === 'LOST'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {tournament.result || 'Participated'}
                                </span>
                                {tournament.placement && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {tournament.placement} place
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-6 text-center">
                        <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-600">No tournaments played yet</p>
                        {canManage && (
                          <button
                            onClick={handleRegisterForTournament}
                            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Register for Tournament
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'stats' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">Team Statistics</h3>
                    
                    {team.tournament_count && team.tournament_count > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Performance Stats */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3">Performance</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Win Rate</span>
                              <span className="font-medium">
                                {team.wins && team.tournament_count 
                                  ? `${Math.round((team.wins / team.tournament_count) * 100)}%`
                                  : '0%'
                                }
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Tournaments Won</span>
                              <span className="font-medium">{team.wins || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total Tournaments</span>
                              <span className="font-medium">{team.tournament_count || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Team Rating</span>
                              <span className="font-medium">
                                {team.rating ? `${team.rating}/5.0` : 'Not rated'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Team Composition */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3">Team Composition</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Active Members</span>
                              <span className="font-medium">{team.member_count}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Team Capacity</span>
                              <span className="font-medium">{team.max_size}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Available Spots</span>
                              <span className="font-medium">{team.max_size - team.member_count}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Sports</span>
                              <span className="font-medium">{team.sport_types.length}</span>
                            </div>
                          </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-gray-50 rounded-lg p-4 md:col-span-2">
                          <h4 className="font-semibold text-gray-900 mb-3">Recent Activity</h4>
                          {team.recent_activity && team.recent_activity.length > 0 ? (
                            <div className="space-y-2">
                              {team.recent_activity.slice(0, 5).map((activity: any, index: number) => (
                                <div key={index} className="flex items-center gap-3 text-sm">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <span className="text-gray-600">{activity.description}</span>
                                  <span className="text-gray-400 ml-auto">
                                    {new Date(activity.date).toLocaleDateString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-600 text-sm">No recent activity</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-6 text-center">
                        <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-600">Statistics will appear after playing tournaments</p>
                        {canManage && (
                          <button
                            onClick={handleRegisterForTournament}
                            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Register for Tournament
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Members</span>
                  <span className="font-medium text-gray-900">
                    {team.member_count}/{team.max_size}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Sports</span>
                  <span className="font-medium text-gray-900">
                    {team.sport_types.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Active</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    team.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {team.is_active ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            {canManage && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Actions</h3>
                <div className="space-y-3">
                  <button 
                    onClick={handleRegisterForTournament}
                    className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Trophy className="w-4 h-4" />
                    Register for Tournament
                  </button>
                  <button 
                    onClick={handleInvitePlayers}
                    className="w-full flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    Invite Players
                  </button>
                  <button 
                    onClick={handleTeamSettings}
                    className="w-full flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Team Settings
                  </button>
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {team.owner?.email || 'No contact email'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Contact via team owner
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tournament Selection Modal */}
      {showTournamentSelection && (
        <TournamentSelectionModal
          isOpen={showTournamentSelection}
          onClose={() => {
            setShowTournamentSelection(false);
            setAvailableTournaments([]);
          }}
          tournaments={availableTournaments}
          onTournamentSelect={handleTournamentSelect}
        />
      )}

      {/* Player Selection Modal */}
      {showPlayerSelection && team && selectedTournament && (
        <PlayerSelectionModal
          isOpen={showPlayerSelection}
          onClose={() => {
            setShowPlayerSelection(false);
            setSelectedTournament(null);
            setAvailableTournaments([]);
          }}
          team={team}
          tournament={selectedTournament}
          onRegistrationComplete={handleRegistrationComplete}
        />
      )}

      {/* Invite Players Modal */}
      {showInviteModal && team && (
        <InvitationSender
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          team={team}
          onInvitationSent={handleInvitationSent}
        />
      )}
    </div>
  );
};

export default TeamDetailsPage;