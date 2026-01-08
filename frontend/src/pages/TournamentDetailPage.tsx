import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Calendar, MapPin, Users, Trophy, DollarSign, 
  UserPlus, ArrowLeft, Settings, Play, Award, Info,
  CheckCircle, XCircle, AlertCircle, Download, Share2,
  Edit, UserCheck, UserX, MessageCircle
} from 'lucide-react';
import { tournamentService } from '@/services/tournamentService';
import type { Tournament } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import BottomNavigation from '@/components/BottomNavigation';
import BracketVisualization from '@/components/BracketVisualization';
import toastService from '@/services/toastService';

export default function TournamentDetailPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'participants' | 'bracket' | 'rules'>('overview');
  const [showShareModal, setShowShareModal] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  useEffect(() => {
    if (tournamentId) {
      loadTournament();
    }
  }, [tournamentId]);

  const loadTournament = async () => {
    try {
      setLoading(true);
      const response = await tournamentService.getTournamentDetail(tournamentId!);
      setTournament(response.tournament);
    } catch (err: any) {
      setError(err.message || 'Failed to load tournament details');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      setRegistering(true);
      await tournamentService.registerForTournament(tournamentId!);
      await loadTournament(); // Reload to update registration status
      toastService.success('Successfully registered for tournament!');
    } catch (err: any) {
      toastService.error(err.message || 'Failed to register for tournament');
    } finally {
      setRegistering(false);
    }
  };

  const handleWithdraw = async () => {
    if (confirm('Are you sure you want to withdraw from this tournament?')) {
      try {
        await tournamentService.withdrawFromTournament(tournamentId!);
        await loadTournament();
        toastService.success('Successfully withdrawn from tournament');
      } catch (err: any) {
        toastService.error(err.message || 'Failed to withdraw from tournament');
      }
    }
  };

  const handleGenerateBracket = async () => {
    if (confirm('Generate tournament bracket? This cannot be undone.')) {
      try {
        await tournamentService.generateBracket(tournamentId!);
        await loadTournament();
        toastService.success('Tournament bracket generated successfully!');
      } catch (err: any) {
        toastService.error(err.message || 'Failed to generate bracket');
      }
    }
  };

  const handleShareTournament = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: tournament?.title,
        text: `Check out this tournament: ${tournament?.title}`,
        url: url,
      });
    } else {
      navigator.clipboard.writeText(url);
      toastService.success('Tournament link copied to clipboard!');
    }
    setShowShareModal(false);
  };

  const handleExportParticipants = () => {
    if (!tournament?.registered_players) return;
    
    const csvContent = [
      ['Name', 'Skill Level', 'Registration Date'],
      ...tournament.registered_players.map(player => [
        player.name,
        player.skill_level || 'Not specified',
        player.registered_at || 'Unknown'
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tournament.title}_participants.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredParticipants = tournament?.registered_players?.filter(player =>
    player.name.toLowerCase().includes(participantSearch.toLowerCase()) ||
    (player.skill_level && player.skill_level.toLowerCase().includes(participantSearch.toLowerCase()))
  ) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UPCOMING': return 'bg-blue-100 text-blue-800';
      case 'ONGOING': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const isUserRegistered = () => {
    return tournament?.registered_players?.some(player => player.id === user?.id);
  };

  const canUserRegister = () => {
    return user?.role === 'PLAYER' && 
           tournament?.is_registration_open && 
           !isUserRegistered();
  };

  const isOrganizer = () => {
    return user?.id === tournament?.organizer.id;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tournament details...</p>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Tournament Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'The tournament you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/tournaments')}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/tournaments')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Tournaments
            </button>
            
            {isOrganizer() && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
                
                {tournament.status === 'UPCOMING' && tournament.registered_count >= tournament.min_participants && (
                  <button
                    onClick={handleGenerateBracket}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Play className="h-4 w-4" />
                    Generate Bracket
                  </button>
                )}
                
                <button 
                  onClick={() => navigate(`/tournaments/${tournament.id}/edit`)}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                
                <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100">
                  <Settings className="h-4 w-4" />
                  Manage
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative">
        {tournament.tournament_image ? (
          <div className="h-64 bg-cover bg-center" style={{ backgroundImage: `url(${tournament.tournament_image})` }}>
            <div className="absolute inset-0 bg-black bg-opacity-50"></div>
          </div>
        ) : (
          <div className="h-64 bg-gradient-to-br from-purple-600 to-purple-800">
            <div className="absolute inset-0 bg-black bg-opacity-20"></div>
          </div>
        )}
        
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full">
            <div className="flex items-end justify-between">
              <div className="text-white">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(tournament.status)}`}>
                    {tournament.status}
                  </span>
                  <span className="text-sm opacity-90">{tournament.sport_type}</span>
                </div>
                <h1 className="text-4xl font-bold mb-2">{tournament.title}</h1>
                <p className="text-lg opacity-90">Organized by {tournament.organizer.name}</p>
              </div>
              
              <div className="flex flex-col gap-2">
                {canUserRegister() && (
                  <button
                    onClick={handleRegister}
                    disabled={registering}
                    className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    <UserPlus className="h-5 w-5" />
                    {registering ? 'Registering...' : 'Register Now'}
                  </button>
                )}
                
                {isUserRegistered() && tournament.status === 'UPCOMING' && (
                  <button
                    onClick={handleWithdraw}
                    className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <XCircle className="h-5 w-5" />
                    Withdraw
                  </button>
                )}
                
                {isUserRegistered() && (
                  <div className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg">
                    <CheckCircle className="h-5 w-5" />
                    Registered
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: 'overview', label: 'Overview', icon: Info },
                    { id: 'participants', label: 'Participants', icon: Users },
                    { id: 'bracket', label: 'Bracket', icon: Trophy },
                    { id: 'rules', label: 'Rules', icon: AlertCircle },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? 'border-purple-500 text-purple-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {tournament.description && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                        <p className="text-gray-600 leading-relaxed">{tournament.description}</p>
                      </div>
                    )}

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Tournament Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Calendar className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Date & Time</p>
                            <p className="font-medium">{formatDate(tournament.date)}</p>
                            <p className="text-sm text-gray-600">{formatTime(tournament.start_time)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <MapPin className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Venue</p>
                            <p className="font-medium">{tournament.venue}</p>
                            {tournament.venue_address && (
                              <p className="text-sm text-gray-600">{tournament.venue_address}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <DollarSign className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Entry Fee</p>
                            <p className="font-medium">
                              {tournament.entry_fee === '0.00' ? 'Free' : `NPR ${tournament.entry_fee}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Award className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Prize Pool</p>
                            <p className="font-medium">
                              {tournament.prize_pool ? `NPR ${tournament.prize_pool}` : 'Not specified'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Participants Tab */}
                {activeTab === 'participants' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Participants ({tournament.registered_count}/{tournament.max_participants})
                        </h3>
                        <div className="w-full max-w-md bg-gray-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${Math.min((tournament.registered_count / tournament.max_participants) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {isOrganizer() && tournament.registered_players && tournament.registered_players.length > 0 && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleExportParticipants}
                            className="flex items-center gap-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <Download className="h-4 w-4" />
                            Export
                          </button>
                          
                          {selectedParticipants.length > 0 && (
                            <div className="flex items-center gap-2">
                              <button className="flex items-center gap-2 px-3 py-2 text-green-600 border border-green-300 rounded-lg hover:bg-green-50 transition-colors">
                                <UserCheck className="h-4 w-4" />
                                Accept ({selectedParticipants.length})
                              </button>
                              <button className="flex items-center gap-2 px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors">
                                <UserX className="h-4 w-4" />
                                Reject ({selectedParticipants.length})
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Participant Search */}
                    {tournament.registered_players && tournament.registered_players.length > 5 && (
                      <div className="mb-4">
                        <div className="relative">
                          <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search participants..."
                            value={participantSearch}
                            onChange={(e) => setParticipantSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {filteredParticipants.length > 0 ? (
                      <div className="space-y-3">
                        {filteredParticipants.map((player, index) => (
                          <div key={player.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            {isOrganizer() && (
                              <input
                                type="checkbox"
                                checked={selectedParticipants.includes(player.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedParticipants([...selectedParticipants, player.id]);
                                  } else {
                                    setSelectedParticipants(selectedParticipants.filter(id => id !== player.id));
                                  }
                                }}
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                              />
                            )}
                            
                            <div className="flex items-center gap-3 flex-1">
                              <div className="relative">
                                {player.profile_picture ? (
                                  <img
                                    src={player.profile_picture}
                                    alt={player.name}
                                    className="h-12 w-12 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                                    <span className="text-lg font-medium text-purple-600">
                                      {player.name.charAt(0)}
                                    </span>
                                  </div>
                                )}
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center border-2 border-gray-200">
                                  <span className="text-xs font-bold text-gray-600">#{index + 1}</span>
                                </div>
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900">{player.name}</p>
                                  {player.skill_level && (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                      {player.skill_level}
                                    </span>
                                  )}
                                </div>
                                {player.registered_at && (
                                  <p className="text-sm text-gray-500">
                                    Registered {new Date(player.registered_at).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {user?.role === 'PLAYER' && player.id !== user.id && (
                                <button className="flex items-center gap-2 px-3 py-2 text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors">
                                  <MessageCircle className="h-4 w-4" />
                                  Message
                                </button>
                              )}
                              
                              {isOrganizer() && (
                                <div className="flex items-center gap-1">
                                  <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                    <UserCheck className="h-4 w-4" />
                                  </button>
                                  <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                    <UserX className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : tournament.registered_players && tournament.registered_players.length > 0 ? (
                      <div className="text-center py-8">
                        <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-600">No participants match your search</p>
                        <button
                          onClick={() => setParticipantSearch('')}
                          className="mt-2 text-purple-600 hover:text-purple-700"
                        >
                          Clear search
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-600">No participants registered yet</p>
                        {isOrganizer() && (
                          <p className="text-sm text-gray-500 mt-2">
                            Share your tournament link to get participants
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Bracket Tab */}
                {activeTab === 'bracket' && (
                  <BracketVisualization
                    tournament={tournament}
                    onMatchUpdate={loadTournament}
                    isOrganizer={isOrganizer()}
                  />
                )}

                {/* Rules Tab */}
                {activeTab === 'rules' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Tournament Rules</h3>
                    {tournament.rules ? (
                      <div className="prose prose-gray max-w-none">
                        <pre className="whitespace-pre-wrap text-gray-600 leading-relaxed">
                          {tournament.rules}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-600">No specific rules have been set for this tournament</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Info</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Format</span>
                  <span className="font-medium">{tournament.tournament_type.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Participants</span>
                  <span className="font-medium">{tournament.registered_count}/{tournament.max_participants}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Registration</span>
                  <span className={`font-medium ${tournament.is_registration_open ? 'text-green-600' : 'text-red-600'}`}>
                    {tournament.is_registration_open ? 'Open' : 'Closed'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Deadline</span>
                  <span className="font-medium text-sm">
                    {new Date(tournament.registration_deadline).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Organizer Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Organizer</h3>
              <div className="flex items-center gap-3">
                {tournament.organizer.profile_picture ? (
                  <img
                    src={tournament.organizer.profile_picture}
                    alt={tournament.organizer.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-lg font-medium text-purple-600">
                      {tournament.organizer.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">{tournament.organizer.name}</p>
                  <p className="text-sm text-gray-600">Tournament Organizer</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Share Tournament</h3>
            <p className="text-gray-600 mb-4">Share this tournament with others</p>
            
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={window.location.href}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toastService.success('Link copied!');
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Copy
              </button>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleShareTournament}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}
      
      <BottomNavigation />
    </div>
  );
}