import { useState, useEffect } from 'react';
import { getAvatarUrl } from '@/utils/imageUtils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { profileService } from '@/services/profileService';
import type { ExtendedUserProfile } from '@/types';
import type { JoinRequest, JoinRequestResponse } from '@/services/profileService';
import { 
  ArrowLeft, 
  Users, 
  UserPlus, 
  UserMinus, 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Search,
  TrendingUp,
  Star,
  MapPin
} from 'lucide-react';

export default function PlayerConnectionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'connections' | 'sent' | 'received'>('connections');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Connection data
  const [connections, setConnections] = useState<ExtendedUserProfile[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequestResponse>({
    sent_requests: [],
    received_requests: [],
    sent_count: 0,
    received_count: 0,
    pending_count: 0
  });

  // Statistics
  const [connectionStats, setConnectionStats] = useState({
    total_connections: 0,
    recent_connections: [] as ExtendedUserProfile[],
    mutual_connections: [] as ExtendedUserProfile[]
  });

  useEffect(() => {
    loadConnectionData();
  }, []);

  const loadConnectionData = async () => {
    setLoading(true);
    try {
      const [connectionsData, requestsData] = await Promise.all([
        profileService.getPlayerConnections(),
        profileService.getMyJoinRequests()
      ]);
      
      setConnections(connectionsData.connections);
      setConnectionStats({
        total_connections: connectionsData.total_connections,
        recent_connections: connectionsData.recent_connections || [],
        mutual_connections: connectionsData.mutual_connections || []
      });
      setJoinRequests(requestsData);
    } catch (error) {
      console.error('Failed to load connection data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToRequest = async (requestId: string, action: 'accept' | 'decline') => {
    try {
      await profileService.respondJoinRequest(requestId, action);
      // Reload data to reflect changes
      await loadConnectionData();
    } catch (error) {
      console.error(`Failed to ${action} request:`, error);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await profileService.cancelJoinRequest(requestId);
      // Reload data to reflect changes
      await loadConnectionData();
    } catch (error) {
      console.error('Failed to cancel request:', error);
    }
  };

  const filteredConnections = connections.filter(connection =>
    connection.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    connection.bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
    connection.preferred_sports.some(sport => 
      sport.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const filteredSentRequests = joinRequests.sent_requests.filter(request =>
    request.to_player.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredReceivedRequests = joinRequests.received_requests.filter(request =>
    request.from_player?.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderConnectionCard = (connection: ExtendedUserProfile) => (
    <div key={connection.id} className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0 relative">
          {connection.profile_picture ? (
            <img
              src={getAvatarUrl(connection.profile_picture)!}
              alt={connection.full_name}
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <span className="text-xl font-semibold text-white">
                {connection.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {connection.is_available_for_matches && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
          )}
        </div>

        {/* Connection Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {connection.full_name}
                </h3>
                {connection.is_available_for_matches && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Available
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-2">
                {connection.skill_level && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    {connection.skill_level}
                  </div>
                )}
                {connection.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    {connection.location}
                  </div>
                )}
              </div>

              {connection.preferred_sports && connection.preferred_sports.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {connection.preferred_sports.slice(0, 3).map((sport, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {sport}
                    </span>
                  ))}
                  {connection.preferred_sports.length > 3 && (
                    <span className="text-xs text-gray-500">+{connection.preferred_sports.length - 3} more</span>
                  )}
                </div>
              )}

              {connection.bio && (
                <p className="text-gray-700 text-sm line-clamp-2">
                  {connection.bio}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => navigate(`/profile/${connection.id}`)}
                className="flex items-center gap-1 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <Users className="h-4 w-4" />
                Profile
              </button>
              <button
                onClick={() => navigate(`/chats/${connection.id}`)}
                className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <MessageCircle className="h-4 w-4" />
                Message
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRequestCard = (request: JoinRequest, type: 'sent' | 'received') => (
    <div key={request.id} className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {(type === 'sent' ? request.to_player : request.from_player)?.profile_picture ? (
            <img
              src={getAvatarUrl((type === 'sent' ? request.to_player : request.from_player)?.profile_picture)!}
              alt={(type === 'sent' ? request.to_player : request.from_player)?.full_name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
              <span className="text-lg font-semibold text-white">
                {(type === 'sent' ? request.to_player : request.from_player)?.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Request Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {(type === 'sent' ? request.to_player : request.from_player)?.full_name}
              </h3>
              
              <div className="flex items-center gap-2 mb-2">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  request.status === 'PENDING' 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : request.status === 'ACCEPTED'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {request.status === 'PENDING' && <Clock className="h-3 w-3" />}
                  {request.status === 'ACCEPTED' && <CheckCircle className="h-3 w-3" />}
                  {request.status === 'DECLINED' && <XCircle className="h-3 w-3" />}
                  {request.status}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(request.created_at).toLocaleDateString()}
                </span>
              </div>

              <p className="text-sm text-gray-600">
                {type === 'sent' 
                  ? 'You sent a connection request'
                  : 'Sent you a connection request'
                }
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 ml-4">
              {type === 'received' && request.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => handleRespondToRequest(request.id, 'accept')}
                    className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleRespondToRequest(request.id, 'decline')}
                    className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    <XCircle className="h-4 w-4" />
                    Decline
                  </button>
                </>
              )}
              
              {type === 'sent' && request.status === 'PENDING' && (
                <button
                  onClick={() => handleCancelRequest(request.id)}
                  className="flex items-center gap-1 px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-sm"
                >
                  <UserMinus className="h-4 w-4" />
                  Cancel
                </button>
              )}

              <button
                onClick={() => navigate(`/profile/${(type === 'sent' ? request.to_player : request.from_player)?.id}`)}
                className="flex items-center gap-1 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <Users className="h-4 w-4" />
                Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to Dashboard
              </button>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">My Connections</h1>
              <p className="text-sm text-gray-600">Manage your player network and connection requests</p>
            </div>
            <div className="w-32"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Connections</p>
                <p className="text-2xl font-bold text-gray-900">{connectionStats.total_connections}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-full">
                <UserPlus className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Sent Requests</p>
                <p className="text-2xl font-bold text-gray-900">{joinRequests.sent_count}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold text-gray-900">{joinRequests.pending_count}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Recent Connections</p>
                <p className="text-2xl font-bold text-gray-900">{connectionStats.recent_connections.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Tabs */}
        <div className="bg-white p-6 rounded-xl shadow-md mb-6">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search connections and requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { key: 'connections', label: 'My Connections', count: connectionStats.total_connections },
              { key: 'received', label: 'Received Requests', count: joinRequests.received_count },
              { key: 'sent', label: 'Sent Requests', count: joinRequests.sent_count }
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
                {count > 0 && (
                  <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold ${
                    activeTab === key
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading connections...</p>
            </div>
          ) : (
            <>
              {activeTab === 'connections' && (
                <>
                  {filteredConnections.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl shadow-md">
                      <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {searchQuery ? 'No matching connections' : 'No connections yet'}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {searchQuery 
                          ? 'Try adjusting your search terms'
                          : 'Start connecting with other players to build your network'
                        }
                      </p>
                      {!searchQuery && (
                        <button
                          onClick={() => navigate('/player-finder')}
                          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Find Players
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">
                          Your Connections ({filteredConnections.length})
                        </h2>
                        <button
                          onClick={() => navigate('/player-finder')}
                          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <UserPlus className="h-4 w-4" />
                          Find More Players
                        </button>
                      </div>
                      {filteredConnections.map(renderConnectionCard)}
                    </>
                  )}
                </>
              )}

              {activeTab === 'received' && (
                <>
                  {filteredReceivedRequests.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl shadow-md">
                      <UserPlus className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {searchQuery ? 'No matching requests' : 'No received requests'}
                      </h3>
                      <p className="text-gray-600">
                        {searchQuery 
                          ? 'Try adjusting your search terms'
                          : 'When other players send you connection requests, they\'ll appear here'
                        }
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">
                          Received Requests ({filteredReceivedRequests.length})
                        </h2>
                      </div>
                      {filteredReceivedRequests.map(request => renderRequestCard(request, 'received'))}
                    </>
                  )}
                </>
              )}

              {activeTab === 'sent' && (
                <>
                  {filteredSentRequests.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl shadow-md">
                      <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {searchQuery ? 'No matching requests' : 'No sent requests'}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {searchQuery 
                          ? 'Try adjusting your search terms'
                          : 'Start connecting with players to see your sent requests here'
                        }
                      </p>
                      {!searchQuery && (
                        <button
                          onClick={() => navigate('/player-finder')}
                          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Find Players to Connect
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">
                          Sent Requests ({filteredSentRequests.length})
                        </h2>
                      </div>
                      {filteredSentRequests.map(request => renderRequestCard(request, 'sent'))}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}