import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { 
  Users, 
  Trophy,
  Settings,
  UserPlus,
  Eye,
  Edit,
  Trash2,
  Clock,
  DollarSign,
  Check,
  X,
  Play,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

interface Tournament {
  id: string;
  title: string;
  description: string;
  sport_type: string;
  tournament_type: string;
  registration_type: 'INDIVIDUAL' | 'TEAM';
  date: string;
  start_time: string;
  end_time: string;
  registration_deadline: string;
  max_participants: number;
  entry_fee: number;
  prize_pool: number;
  status: string;
  venue_name: string;
  venue_location: string;
  participants_count: number;
  created_by: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface Participant {
  id: string;
  user: {
    id: string;
    full_name: string;
    email: string;
  };
  registration_date: string;
  payment_status: string;
}

interface TeamRegistration {
  id: string;
  team: {
    id: string;
    name: string;
    owner: {
      id: string;
      full_name: string;
      email: string;
    };
  };
  selected_players: Array<{
    id: string;
    full_name: string;
    email: string;
  }>;
  registered_by: {
    id: string;
    full_name: string;
    email: string;
  };
  registered_at: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
}

interface RefereeAssignment {
  id: string;
  referee: {
    id: string;
    full_name: string;
    email: string;
  };
  match_date: string;
  fee: number;
  status: string;
}

const TournamentManagementPage: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [teamRegistrations, setTeamRegistrations] = useState<TeamRegistration[]>([]);
  const [referees, setReferees] = useState<RefereeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'participants' | 'referees' | 'settings'>('overview');
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [refereesLoading, setRefereesLoading] = useState(false);

  useEffect(() => {
    if (tournamentId) {
      fetchTournamentData();
    }
  }, [tournamentId]);

  const fetchTournamentData = async () => {
    try {
      setLoading(true);
      const [tournamentRes, refereesRes, participantsRes] = await Promise.all([
        api.get(`/api/tournaments/tournaments/${tournamentId}/`),
        api.get(`/api/tournaments/${tournamentId}/referees/`),
        api.get(`/api/tournaments/${tournamentId}/participants/`)
      ]);
      
      setTournament(tournamentRes.data);
      
      // Handle participants data based on registration type
      const participantsData = participantsRes.data;
      
      if (tournamentRes.data.registration_type === 'TEAM') {
        // Handle team registrations
        let teamArray: TeamRegistration[] = [];
        
        if (Array.isArray(participantsData.participants)) {
          // Map the backend team registration format to our frontend format
          teamArray = participantsData.participants.map((p: any) => ({
            id: p.id,
            team: {
              id: p.team.id,
              name: p.team.name,
              owner: {
                id: p.registered_by.id,
                full_name: p.registered_by.full_name,
                email: p.registered_by.email
              }
            },
            selected_players: p.selected_players || [],
            registered_by: p.registered_by,
            registered_at: p.registration_date,
            status: p.status === 'ACCEPTED' ? 'CONFIRMED' : 
                   p.status === 'REJECTED' ? 'CANCELLED' : 'PENDING'
          }));
        }
        
        setTeamRegistrations(teamArray);
        setParticipants([]);
      } else {
        // Handle individual participants
        let participantsArray: Participant[] = [];
        
        if (Array.isArray(participantsData.participants)) {
          participantsArray = participantsData.participants.map((p: any) => ({
            id: p.id,
            user: p.user,
            registration_date: p.registration_date,
            payment_status: p.payment_status || 'pending'
          }));
        }
        
        setParticipants(participantsArray);
        setTeamRegistrations([]);
      }
      
      // Handle referees data
      const refereesData = refereesRes.data;
      let refereesArray: RefereeAssignment[] = [];
      
      if (Array.isArray(refereesData)) {
        refereesArray = refereesData;
      }
      
      setReferees(refereesArray);
    } catch (err: any) {
      console.error('Error fetching tournament data:', err);
      setError(err.response?.data?.error || 'Failed to fetch tournament data');
      setParticipants([]);
      setTeamRegistrations([]);
      setReferees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReferee = () => {
    navigate(`/tournaments/${tournamentId}/select-referee`);
  };

  const handleRemoveParticipant = async (participantId: string) => {
    if (!confirm('Are you sure you want to remove this participant?')) return;
    
    try {
      setParticipantsLoading(true);
      await api.delete(`/api/tournaments/${tournamentId}/participants/${participantId}/`);
      await fetchTournamentData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to remove participant');
    } finally {
      setParticipantsLoading(false);
    }
  };

  const handleRemoveReferee = async (refereeId: string) => {
    if (!confirm('Are you sure you want to remove this referee assignment?')) return;
    
    try {
      setRefereesLoading(true);
      await api.delete(`/api/tournaments/${tournamentId}/referees/${refereeId}/`);
      await fetchTournamentData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to remove referee');
    } finally {
      setRefereesLoading(false);
    }
  };

  const handleAcceptTeamRegistration = async (registrationId: string) => {
    try {
      setParticipantsLoading(true);
      await api.put(`/api/tournaments/${tournamentId}/team-participants/${registrationId}/accept/`);
      await fetchTournamentData();
      alert('Team registration accepted successfully!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to accept team registration');
    } finally {
      setParticipantsLoading(false);
    }
  };

  const handleRejectTeamRegistration = async (registrationId: string) => {
    const reason = prompt('Enter reason for rejection (optional):');
    
    try {
      setParticipantsLoading(true);
      await api.put(`/api/tournaments/${tournamentId}/team-participants/${registrationId}/reject/`, { reason });
      await fetchTournamentData();
      alert('Team registration rejected successfully!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reject team registration');
    } finally {
      setParticipantsLoading(false);
    }
  };

  const handleGenerateBracket = async () => {
    if (!confirm('Generate tournament bracket? This will start the tournament and cannot be undone.')) return;
    
    try {
      setLoading(true);
      await api.post(`/api/tournaments/${tournamentId}/generate-bracket/`);
      await fetchTournamentData();
      alert('Tournament bracket generated successfully!');
      navigate(`/tournaments/${tournamentId}`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to generate bracket');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTournament = () => {
    navigate(`/tournaments/${tournamentId}/edit`);
  };

  const handleDeleteTournament = async () => {
    if (!confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) return;
    
    try {
      await api.delete(`/api/tournaments/tournaments/${tournamentId}/`);
      navigate('/my-tournaments');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete tournament');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Tournament not found'}</p>
          <Button 
            onClick={() => navigate('/my-tournaments')}
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            Back to Tournaments
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{tournament.title}</h1>
          <p className="text-gray-600">Manage your tournament</p>
        </div>
        <div className="flex space-x-3">
          <Button 
            onClick={() => navigate(`/tournaments/${tournamentId}`)}
            className="bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Public Page
          </Button>
          <Button 
            onClick={() => navigate('/my-tournaments')}
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            Back to Tournaments
          </Button>
        </div>
      </div>

      {/* Tournament Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Participants</p>
              <p className="text-2xl font-bold text-gray-900">
                {tournament.participants_count}/{tournament.max_participants}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <Trophy className="w-8 h-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Prize Pool</p>
              <p className="text-2xl font-bold text-gray-900">${tournament.prize_pool}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Entry Fee</p>
              <p className="text-2xl font-bold text-gray-900">${tournament.entry_fee}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-2xl font-bold text-gray-900 capitalize">{tournament.status}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <Card className="p-4 mb-6">
        <div className="flex space-x-1">
          {[
            { key: 'overview', label: 'Overview', icon: Eye },
            { key: 'participants', label: 'Participants', icon: Users },
            { key: 'referees', label: 'Referees', icon: UserPlus },
            { key: 'settings', label: 'Settings', icon: Settings }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tournament Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Sport Type</p>
                <p className="font-medium">{tournament.sport_type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Tournament Type</p>
                <p className="font-medium">{tournament.tournament_type.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Date & Time</p>
                <p className="font-medium">
                  {new Date(tournament.date).toLocaleDateString()} at {tournament.start_time}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Registration Deadline</p>
                <p className="font-medium">
                  {new Date(tournament.registration_deadline).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Venue</p>
                <p className="font-medium">{tournament.venue_name}</p>
                <p className="text-sm text-gray-500">{tournament.venue_location}</p>
              </div>
            </div>
            {tournament.description && (
              <div className="mt-6">
                <p className="text-sm text-gray-600 mb-2">Description</p>
                <p className="text-gray-900">{tournament.description}</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'participants' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {tournament?.registration_type === 'TEAM' ? 'Team Registrations' : 'Participants'}
              </h3>
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-600">
                  {tournament?.registration_type === 'TEAM' 
                    ? `${teamRegistrations.filter(t => t.status === 'CONFIRMED').length} of ${tournament.max_participants} confirmed`
                    : `${participants.length} of ${tournament.max_participants} registered`
                  }
                </p>
                {tournament?.registration_type === 'TEAM' && tournament.status === 'OPEN' && (
                  <Button 
                    onClick={handleGenerateBracket}
                    className="bg-green-600 text-white hover:bg-green-700"
                    disabled={teamRegistrations.filter(t => t.status === 'CONFIRMED').length < 2}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Generate Bracket
                  </Button>
                )}
              </div>
            </div>
            
            {participantsLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSkeleton variant="text" className="w-32" />
              </div>
            ) : tournament?.registration_type === 'TEAM' ? (
              // Team Registrations View
              <>
                {teamRegistrations.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">No team registrations yet</h4>
                    <p className="text-gray-600">Teams will appear here once they register</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Pending Registrations */}
                    {teamRegistrations.filter(reg => reg.status === 'PENDING').length > 0 && (
                      <div>
                        <h4 className="text-md font-semibold text-orange-600 mb-3 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Pending Approval ({teamRegistrations.filter(reg => reg.status === 'PENDING').length})
                        </h4>
                        <div className="space-y-3">
                          {teamRegistrations.filter(reg => reg.status === 'PENDING').map((registration) => (
                            <div key={registration.id} className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="font-medium text-gray-900">{registration.team.name}</h4>
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                    Pending
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600">
                                  Owner: {registration.team.owner.full_name} ({registration.team.owner.email})
                                </p>
                                <p className="text-sm text-gray-600">
                                  Registered by: {registration.registered_by.full_name}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Players: {registration.selected_players.length} selected
                                </p>
                                <p className="text-xs text-gray-500">
                                  Registered: {new Date(registration.registered_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleAcceptTeamRegistration(registration.id)}
                                  className="bg-green-600 text-white hover:bg-green-700"
                                  disabled={participantsLoading}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleRejectTeamRegistration(registration.id)}
                                  className="bg-red-600 text-white hover:bg-red-700"
                                  disabled={participantsLoading}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Confirmed Registrations */}
                    {teamRegistrations.filter(reg => reg.status === 'CONFIRMED').length > 0 && (
                      <div>
                        <h4 className="text-md font-semibold text-green-600 mb-3 flex items-center">
                          <UserCheck className="w-4 h-4 mr-2" />
                          Confirmed Teams ({teamRegistrations.filter(reg => reg.status === 'CONFIRMED').length})
                        </h4>
                        <div className="space-y-3">
                          {teamRegistrations.filter(reg => reg.status === 'CONFIRMED').map((registration) => (
                            <div key={registration.id} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                              <div>
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="font-medium text-gray-900">{registration.team.name}</h4>
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                    Confirmed
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600">
                                  Owner: {registration.team.owner.full_name}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Players: {registration.selected_players.length} selected
                                </p>
                                <p className="text-xs text-gray-500">
                                  Confirmed: {new Date(registration.registered_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cancelled Registrations */}
                    {teamRegistrations.filter(reg => reg.status === 'CANCELLED').length > 0 && (
                      <div>
                        <h4 className="text-md font-semibold text-red-600 mb-3">
                          Cancelled Teams ({teamRegistrations.filter(reg => reg.status === 'CANCELLED').length})
                        </h4>
                        <div className="space-y-3">
                          {teamRegistrations.filter(reg => reg.status === 'CANCELLED').map((registration) => (
                            <div key={registration.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                              <div>
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="font-medium text-gray-900">{registration.team.name}</h4>
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                    Cancelled
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600">
                                  Owner: {registration.team.owner.full_name}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              // Individual Participants View
              participants && participants.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">No participants yet</h4>
                  <p className="text-gray-600">Participants will appear here once they register</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.isArray(participants) && participants.map((participant) => {
                    if (!participant || !participant.id) {
                      return null;
                    }
                    
                    return (
                      <div key={participant.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {participant.user?.full_name || 'Unknown User'}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {participant.user?.email || 'No email'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Registered: {participant.registration_date 
                              ? new Date(participant.registration_date).toLocaleDateString() 
                              : 'Unknown date'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            participant.payment_status === 'paid' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {participant.payment_status || 'pending'}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => handleRemoveParticipant(participant.id)}
                            className="bg-red-600 text-white hover:bg-red-700"
                            disabled={participantsLoading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </Card>
        </div>
      )}

      {activeTab === 'referees' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Referee Assignments</h3>
              <Button 
                onClick={handleAddReferee}
                className="bg-purple-600 text-white hover:bg-purple-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Referee
              </Button>
            </div>
            
            {refereesLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSkeleton variant="text" className="w-32" />
              </div>
            ) : referees && referees.length === 0 ? (
              <div className="text-center py-8">
                <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No referees assigned</h4>
                <p className="text-gray-600 mb-4">Add referees to manage your tournament matches</p>
                <Button 
                  onClick={handleAddReferee}
                  className="bg-purple-600 text-white hover:bg-purple-700"
                >
                  Add First Referee
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {Array.isArray(referees) && referees.map((referee) => {
                  // Add null checks for referee data
                  if (!referee || !referee.id) {
                    return null;
                  }
                  
                  return (
                    <div key={referee.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {referee.referee?.full_name || 'Unknown Referee'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {referee.referee?.email || 'No email'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Match Date: {referee.match_date 
                            ? new Date(referee.match_date).toLocaleDateString() 
                            : 'TBD'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">${referee.fee || 0}</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            referee.status === 'accepted' 
                              ? 'bg-green-100 text-green-700' 
                              : referee.status === 'requested'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {referee.status || 'pending'}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleRemoveReferee(referee.id)}
                          className="bg-red-600 text-white hover:bg-red-700"
                          disabled={refereesLoading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tournament Settings</h3>
            <div className="space-y-4">
              <Button 
                onClick={handleEditTournament}
                className="w-full justify-start bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Tournament Details
              </Button>
              <Button 
                onClick={handleDeleteTournament}
                className="w-full justify-start bg-red-600 text-white hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Tournament
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TournamentManagementPage;