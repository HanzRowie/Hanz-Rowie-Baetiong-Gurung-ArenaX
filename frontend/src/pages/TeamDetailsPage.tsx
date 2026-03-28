import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users,
  Trophy,
  Calendar,
  Crown,
  Shield,
  Star,
  UserPlus,
  ArrowLeft,
  Mail,
  Phone,
  Award,
  TrendingUp,
  Activity,
  MoreVertical,
  UserMinus,
  LogOut,
  Edit,
  MessageSquare
} from 'lucide-react';
import TeamService from '@/services/teamService';
import { tournamentService, toastService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { PlayerSelectionModal } from '@/components/team/PlayerSelectionModal';
import { TournamentSelectionModal } from '@/components/team/TournamentSelectionModal';
import { InvitationSender } from '@/components/team/InvitationSender';
import { ConnectionSelector } from '@/components/team/ConnectionSelector';
import { RoleAssignmentModal } from '@/components/team/RoleAssignmentModal';
import GroupChatInterface from '@/components/chat/GroupChatInterface';
import type { Team, TeamMembership } from '@/types/team.types';
import type { Tournament } from '@/types/tournament.types';

interface TeamDetailsPageProps { }

export const TeamDetailsPage: React.FC<TeamDetailsPageProps> = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'tournaments' | 'stats' | 'chat'>('overview');

  // Modal states
  const [showTournamentSelection, setShowTournamentSelection] = useState(false);
  const [showPlayerSelection, setShowPlayerSelection] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showConnectionSelector, setShowConnectionSelector] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<TeamMembership | null>(null);
  const [availableTournaments, setAvailableTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [showMemberMenu, setShowMemberMenu] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showKickConfirm, setShowKickConfirm] = useState<TeamMembership | null>(null);

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

  const handleAddFromConnections = () => {
    setShowConnectionSelector(true);
  };

  const handleConnectionsSelected = async (playerIds: string[]) => {
    if (!team || playerIds.length === 0) return;

    try {
      const response = await TeamService.addMembers(team.id, playerIds);
      if (response.success) {
        const count = playerIds.length;
        toastService.success(`${count} player${count > 1 ? 's' : ''} added to the team!`);
        loadTeamDetails(); // Refresh team data
        
        // Show any failures if present
        if (response.failed && response.failed.length > 0) {
          toastService.warning(`${response.failed.length} player(s) could not be added`);
        }
      } else {
        toastService.error(response.error || 'Failed to add players');
      }
    } catch (error: any) {
      console.error('Error adding players:', error);
      toastService.error('Failed to add players to team');
    }
  };

  const handleManageMemberRole = (membership: TeamMembership) => {
    setSelectedMembership(membership);
    setShowRoleModal(true);
  };

  const handleRoleUpdated = (updatedTeam: Team) => {
    setTeam(updatedTeam);
    setShowRoleModal(false);
    setSelectedMembership(null);
    toastService.success('Member role updated successfully!');
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

  const handleLeaveTeam = async () => {
    if (!team || !user) return;

    try {
      const response = await TeamService.removeMember(team.id, user.id);
      if (response.success) {
        toastService.success('You have left the team successfully');
        navigate('/teams');
      } else {
        toastService.error(response.error || 'Failed to leave team');
      }
    } catch (error: any) {
      console.error('Error leaving team:', error);
      toastService.error('Failed to leave team');
    } finally {
      setShowLeaveConfirm(false);
    }
  };

  const handleKickMember = async (membership: TeamMembership) => {
    if (!team) return;

    try {
      const response = await TeamService.removeMember(team.id, membership.player.id);
      if (response.success) {
        toastService.success(`${membership.player.full_name} has been removed from the team`);
        loadTeamDetails(); // Refresh team data
      } else {
        toastService.error(response.error || 'Failed to remove member');
      }
    } catch (error: any) {
      console.error('Error removing member:', error);
      toastService.error('Failed to remove member');
    } finally {
      setShowKickConfirm(null);
      setShowMemberMenu(null);
    }
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

            <div className="flex items-center gap-3">
              {userRole === 'OWNER' && (
                <button
                  onClick={() => navigate(`/teams/${teamId}/edit`)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit Team
                </button>
              )}
              {canManage && (
                <>
                  <button
                    onClick={handleAddFromConnections}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    Add from Connections
                  </button>
                  <button
                    onClick={handleInvitePlayers}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    Invite by Email
                  </button>
                </>
              )}
            </div>
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
                    ...(userRole ? [{ key: 'chat', label: 'Chat', icon: MessageSquare }] : []),
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key as any)}
                      className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === key
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
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
                      <span className="text-sm text-gray-600">
                        {team.member_count} / {team.max_size} members
                      </span>
                    </div>

                    <div className="space-y-3">
                      {team.memberships
                        .filter(m => m.is_active)
                        .sort((a, b) => {
                          const roleOrder = { OWNER: 0, LEADER: 1, MEMBER: 2 };
                          return roleOrder[a.role as keyof typeof roleOrder] - roleOrder[b.role as keyof typeof roleOrder];
                        })
                        .map((membership) => {
                          const isCurrentUser = user?.id === membership.player.id;
                          const canKick = canManage && membership.role !== 'OWNER' && !isCurrentUser;
                          const canLeave = isCurrentUser && membership.role !== 'OWNER';

                          return (
                            <div
                              key={membership.id}
                              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                            >
                              <div className="flex items-center gap-4 flex-1">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-lg font-semibold text-white">
                                    {membership.player.full_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold text-gray-900 truncate">
                                      {membership.player.full_name}
                                      {isCurrentUser && (
                                        <span className="ml-2 text-xs text-blue-600">(You)</span>
                                      )}
                                    </p>
                                    {getRoleBadge(membership.role)}
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span className="truncate">{membership.player.email}</span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Joined {new Date(membership.joined_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>

                              {(canKick || canLeave || (canManage && membership.role !== 'OWNER')) && (
                                <div className="relative ml-4">
                                  <button
                                    onClick={() => setShowMemberMenu(showMemberMenu === membership.id ? null : membership.id)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Options"
                                  >
                                    <MoreVertical className="w-5 h-5" />
                                  </button>

                                  {showMemberMenu === membership.id && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowMemberMenu(null)}
                                      />
                                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                        {canManage && membership.role !== 'OWNER' && !isCurrentUser && (
                                          <button
                                            onClick={() => handleManageMemberRole(membership)}
                                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                          >
                                            <Shield className="w-4 h-4" />
                                            Change Role
                                          </button>
                                        )}

                                        {canKick && (
                                          <button
                                            onClick={() => {
                                              setShowKickConfirm(membership);
                                              setShowMemberMenu(null);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                          >
                                            <UserMinus className="w-4 h-4" />
                                            Remove Member
                                          </button>
                                        )}

                                        {canLeave && (
                                          <button
                                            onClick={() => {
                                              setShowLeaveConfirm(true);
                                              setShowMemberMenu(null);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                          >
                                            <LogOut className="w-4 h-4" />
                                            Leave Team
                                          </button>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>

                    {canManage && !team.is_full && (
                      <button
                        onClick={handleInvitePlayers}
                        className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
                      >
                        <UserPlus className="w-5 h-5" />
                        Invite More Players
                      </button>
                    )}
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
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${tournament.result === 'WON'
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

                {activeTab === 'chat' && userRole && (
                  <div className="h-[600px]">
                    <GroupChatInterface
                      teamId={team.id}
                      teamName={team.name}
                    />
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
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${team.is_active
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={handleRegisterForTournament}
                    className="w-full flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Trophy className="w-5 h-5" />
                    Register for Tournament
                  </button>
                  <button
                    onClick={handleInvitePlayers}
                    className="w-full flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    <UserPlus className="w-5 h-5" />
                    Invite Players
                  </button>
                </div>
              </div>
            )}

            {/* Leave Team Button for non-owners */}
            {userRole && userRole !== 'OWNER' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Membership</h3>
                <button
                  onClick={() => setShowLeaveConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium"
                >
                  <LogOut className="w-5 h-5" />
                  Leave Team
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  You can be invited back later
                </p>
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

      {/* Connection Selector Modal */}
      {showConnectionSelector && team && (
        <ConnectionSelector
          isOpen={showConnectionSelector}
          onClose={() => setShowConnectionSelector(false)}
          onPlayersSelected={handleConnectionsSelected}
          excludePlayerIds={team.memberships.filter(m => m.is_active).map(m => m.player.id)}
          sportFilter={team.sport_types[0]}
        />
      )}

      {/* Role Assignment Modal */}
      {showRoleModal && team && selectedMembership && (
        <RoleAssignmentModal
          isOpen={showRoleModal}
          onClose={() => {
            setShowRoleModal(false);
            setSelectedMembership(null);
          }}
          membership={selectedMembership}
          team={team}
          onRoleUpdated={handleRoleUpdated}
        />
      )}

      {/* Leave Team Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <LogOut className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Leave Team</h3>
                <p className="text-sm text-gray-600">Are you sure you want to leave this team?</p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> You will lose access to team tournaments and activities.
                You'll need to be invited again to rejoin.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveTeam}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Leave Team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kick Member Confirmation Modal */}
      {showKickConfirm && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <UserMinus className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Remove Member</h3>
                <p className="text-sm text-gray-600">
                  Remove {showKickConfirm.player.full_name} from the team?
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This member will be removed from all team activities
                and tournaments. They can be invited back later.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowKickConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleKickMember(showKickConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Remove Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamDetailsPage;