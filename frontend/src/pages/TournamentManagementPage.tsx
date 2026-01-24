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
  DollarSign
} from 'lucide-react';
import { api } from '../services/api';

interface Tournament {
  id: string;
  title: string;
  description: string;
  sport_type: string;
  tournament_type: string;
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
      const [tournamentRes, participantsRes, refereesRes] = await Promise.all([
        api.get(`/api/tournaments/tournaments/${tournamentId}/`),
        api.get(`/api/tournaments/${tournamentId}/participants/`),
        api.get(`/api/tournaments/${tournamentId}/referees/`)
      ]);
      
      setTournament(tournamentRes.data);
      
      // Robust handling of participants data - handle various API response formats
      const participantsData = participantsRes.data;
      let participantsArray: Participant[] = [];
      
      if (Array.isArray(participantsData)) {
        participantsArray = participantsData;
      } else if (participantsData && typeof participantsData === 'object') {
        // Check for common pagination formats
        if (Array.isArray(participantsData.results)) {
          participantsArray = participantsData.results;
        } else if (Array.isArray(participantsData.participants)) {
          participantsArray = participantsData.participants;
        } else if (Array.isArray(participantsData.data)) {
          participantsArray = participantsData.data;
        } else {
          console.warn('Unexpected participants data format:', participantsData);
          participantsArray = [];
        }
      } else {
        console.warn('Participants data is not an array or object:', participantsData);
        participantsArray = [];
      }
      
      setParticipants(participantsArray);
      
      // Robust handling of referees data - handle various API response formats
      const refereesData = refereesRes.data;
      let refereesArray: RefereeAssignment[] = [];
      
      if (Array.isArray(refereesData)) {
        refereesArray = refereesData;
      } else if (refereesData && typeof refereesData === 'object') {
        // Check for common pagination formats
        if (Array.isArray(refereesData.results)) {
          refereesArray = refereesData.results;
        } else if (Array.isArray(refereesData.referees)) {
          refereesArray = refereesData.referees;
        } else if (Array.isArray(refereesData.data)) {
          refereesArray = refereesData.data;
        } else {
          console.warn('Unexpected referees data format:', refereesData);
          refereesArray = [];
        }
      } else {
        console.warn('Referees data is not an array or object:', refereesData);
        refereesArray = [];
      }
      
      setReferees(refereesArray);
    } catch (err: any) {
      console.error('Error fetching tournament data:', err);
      setError(err.response?.data?.error || 'Failed to fetch tournament data');
      // Set empty arrays on error to prevent crashes
      setParticipants([]);
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
              <h3 className="text-lg font-semibold text-gray-900">Participants</h3>
              <p className="text-sm text-gray-600">
                {participants ? participants.length : 0} of {tournament.max_participants} registered
              </p>
            </div>
            
            {participantsLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSkeleton variant="text" className="w-32" />
              </div>
            ) : participants && participants.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No participants yet</h4>
                <p className="text-gray-600">Participants will appear here once they register</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Array.isArray(participants) && participants.map((participant) => {
                  // Add null checks for participant data
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