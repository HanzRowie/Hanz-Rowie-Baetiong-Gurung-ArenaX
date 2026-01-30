import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Trophy, Calendar, Search, Crown, Shield, Star } from 'lucide-react';
import TeamService from '@/services/teamService';
import { TeamCreationForm } from '@/components/team/TeamCreationForm';
import { InvitationList } from '@/components/team/InvitationList';
import { TeamTournamentRegistration } from '@/components/team/TeamTournamentRegistration';
import { PlayerSelectionModal } from '@/components/team/PlayerSelectionModal';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { useAuth } from '@/hooks/useAuth';
import { tournamentService, toastService } from '@/services';
import type { Team, TeamMembership } from '@/types/team.types';
import type { Tournament } from '@/types/tournament.types';

interface TeamsPageProps {}

export const TeamsPage: React.FC<TeamsPageProps> = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'my-teams' | 'invitations' | 'discover'>('my-teams');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sportFilter, setSportFilter] = useState<string>('all');
  
  // Tournament registration states
  const [showTournamentRegistration, setShowTournamentRegistration] = useState(false);
  const [showTournamentSelection, setShowTournamentSelection] = useState(false);
  const [showPlayerSelection, setShowPlayerSelection] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [teamForRegistration, setTeamForRegistration] = useState<Team | null>(null);
  const [availableTournaments, setAvailableTournaments] = useState<Tournament[]>([]);

  // Fetch user's teams
  const { data: myTeamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams', 'my-teams'],
    queryFn: () => TeamService.getMyTeams(),
    enabled: !!user,
  });

  // Fetch invitations
  const { data: invitationsData, isLoading: invitationsLoading } = useQuery({
    queryKey: ['teams', 'invitations'],
    queryFn: () => TeamService.getPendingInvitations(),
    enabled: !!user,
  });

  // Fetch discoverable teams
  const { data: discoverableTeamsData, isLoading: discoverLoading } = useQuery({
    queryKey: ['teams', 'discover', searchQuery, sportFilter],
    queryFn: () => TeamService.searchTeams(searchQuery, sportFilter === 'all' ? undefined : sportFilter as any),
    enabled: activeTab === 'discover' && !!user,
  });

  const myTeams = myTeamsData?.data || [];
  const invitations = invitationsData?.data || [];
  const discoverableTeams = discoverableTeamsData?.data || [];

  const handleCreateTeam = () => {
    setShowCreateForm(false);
    queryClient.invalidateQueries({ queryKey: ['teams'] });
  };

  const handleViewTeamDetails = (team: Team) => {
    navigate(`/teams/${team.id}`);
  };

  const handleRegisterForTournament = async (team: Team) => {
    try {
      // Fetch available tournaments for this team
      const response = await tournamentService.getAvailableTournamentsForTeam(team.id);
      if (response && response.length > 0) {
        setAvailableTournaments(response);
        setTeamForRegistration(team);
        // If only one tournament, go directly to registration
        if (response.length === 1) {
          setSelectedTournament(response[0]);
          setShowTournamentRegistration(true);
        } else {
          // Show tournament selection modal (we'll create this)
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

  const handleRegistrationComplete = () => {
    setShowPlayerSelection(false);
    setSelectedTournament(null);
    setTeamForRegistration(null);
    queryClient.invalidateQueries({ queryKey: ['teams'] });
    toastService.success('Team successfully registered for tournament!');
  };

  const handleRequestToJoin = async (teamId: string) => {
    try {
      // For now, we'll show an alert. In a full implementation, this would send a join request
      alert('Join request functionality will be implemented soon. Please contact the team owner directly.');
      
      // TODO: Implement actual join request functionality
      // await TeamService.requestToJoin(teamId);
      // queryClient.invalidateQueries({ queryKey: ['teams'] });
      
      console.log('Join request for team:', teamId); // Use teamId to avoid warning
    } catch (error) {
      console.error('Error requesting to join team:', error);
      alert('Failed to send join request. Please try again.');
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

  const TeamCard: React.FC<{ team: Team; membership?: TeamMembership }> = ({ team, membership }) => (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            {team.sport_types.map((sport) => (
              <span
                key={sport}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {sport}
              </span>
            ))}
          </div>
        </div>
        {membership && getRoleBadge(membership.role)}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {team.member_count}/{team.max_size} members
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Created {new Date(team.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <Users className="w-4 h-4 text-gray-600" />
          </div>
          <span className="text-sm text-gray-600">
            Owner: {team.owner?.full_name || 'Unknown'}
          </span>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => handleViewTeamDetails(team)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            View Details
          </button>
          {membership?.role === 'OWNER' || membership?.role === 'LEADER' ? (
            <button 
              onClick={() => handleRegisterForTournament(team)}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              <Trophy className="w-4 h-4 inline mr-1" />
              Register
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  const DiscoverableTeamCard: React.FC<{ team: Team }> = ({ team }) => (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            {team.sport_types.map((sport) => (
              <span
                key={sport}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {sport}
              </span>
            ))}
          </div>
        </div>
        {team.is_full && (
          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
            Full
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {team.member_count}/{team.max_size} members
          </span>
          <span className="flex items-center gap-1">
            <Star className="w-4 h-4" />
            Looking for players
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <Users className="w-4 h-4 text-gray-600" />
          </div>
          <span className="text-sm text-gray-600">
            Owner: {team.owner?.full_name || 'Unknown'}
          </span>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => handleViewTeamDetails(team)}
            className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            View Details
          </button>
          {!team.is_full && (
            <button 
              onClick={() => handleRequestToJoin(team.id)}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Request to Join
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
            <p className="text-gray-600 mt-1">
              Create and manage your teams, or join existing ones
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Team
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          {[
            { key: 'my-teams', label: 'My Teams', count: myTeams?.length || 0 },
            { key: 'invitations', label: 'Invitations', count: invitations?.length || 0 },
            { key: 'discover', label: 'Discover Teams', count: null },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.key
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search and Filters for Discover tab */}
        {activeTab === 'discover' && (
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Sports</option>
              <option value="FUTSAL">Futsal</option>
              <option value="BADMINTON">Badminton</option>
            </select>
          </div>
        )}

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'my-teams' && (
            <div>
              {teamsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <LoadingSkeleton key={i} className="h-48" />
                  ))}
                </div>
              ) : myTeams && myTeams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myTeams.map((team: any) => (
                    <TeamCard
                      key={team.id}
                      team={team}
                      membership={team.membership}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No teams yet</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first team or join an existing one to get started.
                  </p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Team
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'invitations' && (
            <div>
              {invitationsLoading ? (
                <LoadingSkeleton className="h-64" />
              ) : (
                <InvitationList showPending={true} />
              )}
            </div>
          )}

          {activeTab === 'discover' && (
            <div>
              {discoverLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <LoadingSkeleton key={i} className="h-48" />
                  ))}
                </div>
              ) : discoverableTeams && discoverableTeams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {discoverableTeams.map((team: any) => (
                    <DiscoverableTeamCard key={team.id} team={team} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No teams found</h3>
                  <p className="text-gray-600">
                    Try adjusting your search criteria or create a new team.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateForm && (
        <TeamCreationForm
          isOpen={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          onTeamCreated={handleCreateTeam}
        />
      )}

      {/* Tournament Selection Modal */}
      {showTournamentSelection && teamForRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Select Tournament</h2>
              <button
                onClick={() => {
                  setShowTournamentSelection(false);
                  setTeamForRegistration(null);
                  setAvailableTournaments([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-gray-600 mb-6">
              Choose a tournament to register {teamForRegistration.name} for:
            </p>
            
            <div className="space-y-4">
              {availableTournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedTournament(tournament);
                    setShowTournamentSelection(false);
                    setShowTournamentRegistration(true);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{tournament.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{tournament.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Trophy className="w-4 h-4" />
                          {tournament.sport_type}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(tournament.date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {tournament.registered_count}/{tournament.max_participants}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Entry Fee</p>
                      <p className="font-semibold text-gray-900">${tournament.entry_fee}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tournament Registration Modal */}
      {showTournamentRegistration && selectedTournament && (
        <TeamTournamentRegistration
          isOpen={showTournamentRegistration}
          onClose={() => {
            setShowTournamentRegistration(false);
            setSelectedTournament(null);
            setTeamForRegistration(null);
          }}
          tournament={selectedTournament}
          onRegistrationComplete={handleRegistrationComplete}
          onOpenPlayerSelection={(team, tournament) => {
            setTeamForRegistration(team);
            setSelectedTournament(tournament);
            setShowTournamentRegistration(false);
            setShowPlayerSelection(true);
          }}
        />
      )}

      {/* Player Selection Modal */}
      {showPlayerSelection && teamForRegistration && selectedTournament && (
        <PlayerSelectionModal
          isOpen={showPlayerSelection}
          onClose={() => {
            setShowPlayerSelection(false);
            setSelectedTournament(null);
            setTeamForRegistration(null);
          }}
          team={teamForRegistration}
          tournament={selectedTournament}
          onRegistrationComplete={handleRegistrationComplete}
        />
      )}
    </div>
  );
};

export default TeamsPage;