import React, { useState } from 'react';
import {
  Users,
  User,
  MessageCircle,
  UserPlus,
  Eye,
  ChevronRight,
  Network,
  Star,
  Trophy,
  MapPin,
  Calendar,
  Activity,
} from 'lucide-react';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';

export interface MutualConnection {
  id: string;
  name: string;
  avatar?: string;
  location: string;
  skillRating: number;
  skillLevel: string;
  connectionDate: string;
  mutualSports: string[];
  recentActivity: string;
  isOnline: boolean;
  relationshipType: 'friend' | 'teammate' | 'opponent' | 'mentor' | 'student';
  sharedTournaments: number;
  connectionStrength: number; // 1-5 scale
}

export interface ConnectionPath {
  targetPlayerId: string;
  targetPlayerName: string;
  path: Array<{
    playerId: string;
    playerName: string;
    avatar?: string;
    relationshipType: string;
  }>;
  pathStrength: number;
  commonInterests: string[];
}

interface MutualConnectionsProps {
  currentPlayerId: string;
  targetPlayerId: string;
  targetPlayerName: string;
  mutualConnections: MutualConnection[];
  connectionPaths?: ConnectionPath[];
  onViewConnection?: (connectionId: string) => void;
  onMessageConnection?: (connectionId: string) => void;
  onConnectViaConnection?: (connectionId: string, targetPlayerId: string) => void;
}

export default function MutualConnections({
  currentPlayerId,
  targetPlayerId,
  targetPlayerName,
  mutualConnections,
  connectionPaths = [],
  onViewConnection,
  onMessageConnection,
  onConnectViaConnection
}: MutualConnectionsProps) {
  const [showAllConnections, setShowAllConnections] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<MutualConnection | null>(null);
  const [showConnectionPaths, setShowConnectionPaths] = useState(false);

  const getRelationshipIcon = (type: string) => {
    switch (type) {
      case 'friend': return <Users className="h-4 w-4 text-blue-500" />;
      case 'teammate': return <Trophy className="h-4 w-4 text-emerald-500" />;
      case 'opponent': return <Star className="h-4 w-4 text-red-500" />;
      case 'mentor': return <User className="h-4 w-4 text-purple-500" />;
      case 'student': return <User className="h-4 w-4 text-orange-500" />;
      default: return <Users className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRelationshipLabel = (type: string) => {
    switch (type) {
      case 'friend': return 'Friend';
      case 'teammate': return 'Teammate';
      case 'opponent': return 'Opponent';
      case 'mentor': return 'Mentor';
      case 'student': return 'Student';
      default: return 'Connection';
    }
  };

  const getConnectionStrengthColor = (strength: number) => {
    if (strength >= 4) return 'text-emerald-600';
    if (strength >= 3) return 'text-blue-600';
    if (strength >= 2) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getConnectionStrengthLabel = (strength: number) => {
    if (strength >= 4) return 'Close';
    if (strength >= 3) return 'Good';
    if (strength >= 2) return 'Casual';
    return 'Distant';
  };

  const displayedConnections = showAllConnections 
    ? mutualConnections 
    : mutualConnections.slice(0, 6);

  const strongestConnections = mutualConnections
    .filter(conn => conn.connectionStrength >= 3)
    .sort((a, b) => b.connectionStrength - a.connectionStrength)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Network className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Mutual Connections</h2>
              <p className="text-gray-600">
                You and {targetPlayerName} have {mutualConnections.length} mutual connections
              </p>
            </div>
          </div>

          {connectionPaths.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => setShowConnectionPaths(!showConnectionPaths)}
              className="flex items-center gap-2"
            >
              <Network className="h-4 w-4" />
              Connection Paths
            </Button>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{mutualConnections.length}</div>
            <div className="text-sm text-blue-700">Mutual Connections</div>
          </div>
          
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <div className="text-2xl font-bold text-emerald-600">{strongestConnections.length}</div>
            <div className="text-sm text-emerald-700">Strong Connections</div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(mutualConnections.reduce((sum, conn) => sum + conn.sharedTournaments, 0) / mutualConnections.length) || 0}
            </div>
            <div className="text-sm text-purple-700">Avg Shared Tournaments</div>
          </div>
        </div>
      </Card>

      {/* Connection Paths */}
      {showConnectionPaths && connectionPaths.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">How You're Connected</h3>
          <div className="space-y-4">
            {connectionPaths.map((path, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    Path {index + 1} ({path.path.length} degrees)
                  </span>
                  <span className="text-sm text-gray-500">
                    Strength: {path.pathStrength}/5
                  </span>
                </div>
                
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">You</span>
                    </div>
                    <span className="text-sm text-gray-600">You</span>
                  </div>
                  
                  {path.path.map((connection, connIndex) => (
                    <React.Fragment key={connection.playerId}>
                      <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {connection.avatar ? (
                          <img
                            src={connection.avatar}
                            alt={connection.playerName}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-white">
                              {connection.playerName.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{connection.playerName}</div>
                          <div className="text-gray-500 text-xs">{connection.relationshipType}</div>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                  
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">
                        {targetPlayerName.charAt(0)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-600">{targetPlayerName}</span>
                  </div>
                </div>
                
                {path.commonInterests.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">Common interests:</div>
                    <div className="flex flex-wrap gap-1">
                      {path.commonInterests.map((interest, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Strongest Connections */}
      {strongestConnections.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Strongest Mutual Connections</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {strongestConnections.map((connection) => (
              <div key={connection.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  {connection.avatar ? (
                    <img
                      src={connection.avatar}
                      alt={connection.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center">
                      <span className="text-lg font-bold text-white">
                        {connection.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{connection.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {getRelationshipIcon(connection.relationshipType)}
                      <span>{getRelationshipLabel(connection.relationshipType)}</span>
                    </div>
                  </div>
                  
                  <div className={`text-right ${getConnectionStrengthColor(connection.connectionStrength)}`}>
                    <div className="text-sm font-medium">
                      {getConnectionStrengthLabel(connection.connectionStrength)}
                    </div>
                    <div className="text-xs">
                      {connection.connectionStrength}/5
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    <span>{connection.location}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Trophy className="h-3 w-3" />
                    <span>{connection.sharedTournaments} shared tournaments</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Activity className="h-3 w-3" />
                    <span>{connection.recentActivity}</span>
                  </div>
                </div>
                
                {connection.mutualSports.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500 mb-2">Mutual sports:</div>
                    <div className="flex flex-wrap gap-1">
                      {connection.mutualSports.slice(0, 3).map((sport, idx) => (
                        <span key={idx} className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                          {sport}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onViewConnection?.(connection.id)}
                    className="flex-1"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onMessageConnection?.(connection.id)}
                  >
                    <MessageCircle className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* All Mutual Connections */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">All Mutual Connections</h3>
          
          {mutualConnections.length > 6 && (
            <Button
              variant="ghost"
              onClick={() => setShowAllConnections(!showAllConnections)}
            >
              {showAllConnections ? 'Show Less' : `Show All (${mutualConnections.length})`}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedConnections.map((connection) => (
            <div key={connection.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="relative">
                {connection.avatar ? (
                  <img
                    src={connection.avatar}
                    alt={connection.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-lg font-bold text-white">
                      {connection.name.charAt(0)}
                    </span>
                  </div>
                )}
                
                {connection.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-gray-900 truncate">{connection.name}</h4>
                  <div className="flex items-center gap-1">
                    {getRelationshipIcon(connection.relationshipType)}
                    <span className={`text-sm ${getConnectionStrengthColor(connection.connectionStrength)}`}>
                      {connection.connectionStrength}/5
                    </span>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 mb-2">
                  {connection.skillLevel} • {connection.location}
                </div>
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Connected {new Date(connection.connectionDate).toLocaleDateString()}</span>
                  <span>{connection.sharedTournaments} shared tournaments</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onViewConnection?.(connection.id)}
                >
                  <Eye className="h-3 w-3" />
                </Button>
                
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onMessageConnection?.(connection.id)}
                >
                  <MessageCircle className="h-3 w-3" />
                </Button>
                
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onConnectViaConnection?.(connection.id, targetPlayerId)}
                >
                  <UserPlus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {mutualConnections.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Mutual Connections</h3>
            <p className="text-gray-600">
              You and {targetPlayerName} don't have any mutual connections yet.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}