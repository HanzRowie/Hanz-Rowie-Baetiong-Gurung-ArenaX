import React, { useState } from 'react';
import { 
  User, 
  MapPin, 
  Star, 
  MessageCircle, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Clock,
  CheckCircle,
  XCircle,
  Trophy,
  Target,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ConnectionRequestCardProps {
  request: {
    id: string;
    type: 'sent' | 'received';
    player: {
      id: string;
      full_name: string;
      email: string;
      profile_picture?: string;
      skill_level?: string;
      location?: string;
      bio?: string;
      preferred_sports?: string[];
      matches_played?: number;
      matches_won?: number;
      win_rate?: number;
      is_available_for_matches?: boolean;
    };
    status: 'pending' | 'accepted' | 'declined';
    created_at: string;
  };
  onAccept?: (requestId: string) => void;
  onDecline?: (requestId: string) => void;
  onCancel?: (requestId: string) => void;
  onMessage?: (userId: string) => void;
  className?: string;
}

export const ConnectionRequestCard: React.FC<ConnectionRequestCardProps> = ({
  request,
  onAccept,
  onDecline,
  onCancel,
  onMessage,
  className = ''
}) => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const { player, type, status, created_at } = request;

  const handleAction = async (action: () => void) => {
    setIsProcessing(true);
    try {
      await action();
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'declined':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'declined':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100 overflow-hidden ${className}`}>
      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0 relative">
            {player.profile_picture ? (
              <img
                src={player.profile_picture}
                alt={player.full_name}
                className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-100"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center ring-2 ring-gray-100">
                <span className="text-xl font-semibold text-white">
                  {player.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {player.is_available_for_matches && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            )}
          </div>

          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {player.full_name}
                  </h3>
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
                    {getStatusIcon()}
                    {status.toUpperCase()}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                  {player.skill_level && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="capitalize">{player.skill_level.toLowerCase()}</span>
                    </div>
                  )}
                  {player.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{player.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{formatDate(created_at)}</span>
                  </div>
                </div>

                {/* Sports */}
                {player.preferred_sports && player.preferred_sports.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {player.preferred_sports.slice(0, 3).map((sport, index) => (
                      <span 
                        key={index} 
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {sport}
                      </span>
                    ))}
                    {player.preferred_sports.length > 3 && (
                      <span className="text-xs text-gray-500 px-2 py-1">
                        +{player.preferred_sports.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Stats */}
                {(player.matches_played !== undefined || player.win_rate !== undefined) && (
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    {player.matches_played !== undefined && (
                      <div className="flex items-center gap-1">
                        <Trophy className="h-4 w-4 text-orange-500" />
                        <span>{player.matches_played} matches</span>
                      </div>
                    )}
                    {player.win_rate !== undefined && (
                      <div className="flex items-center gap-1">
                        <Target className="h-4 w-4 text-green-500" />
                        <span>{player.win_rate.toFixed(1)}% win rate</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Bio */}
                {player.bio && (
                  <p className="text-gray-700 text-sm line-clamp-2 mb-3">
                    {player.bio}
                  </p>
                )}

                {/* Request Type Indicator */}
                <div className="text-sm text-gray-600">
                  {type === 'sent' ? (
                    <span>You sent a connection request</span>
                  ) : (
                    <span>Wants to connect with you</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
              {/* View Profile */}
              <button
                onClick={() => navigate(`/profile/${player.id}`)}
                className="flex items-center gap-1 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <User className="h-4 w-4" />
                Profile
              </button>

              {/* Message */}
              {status === 'accepted' && (
                <button
                  onClick={() => onMessage?.(player.id)}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <MessageCircle className="h-4 w-4" />
                  Message
                </button>
              )}

              {/* Request Actions */}
              {type === 'received' && status === 'pending' && (
                <>
                  <button
                    onClick={() => handleAction(() => onAccept?.(request.id))}
                    disabled={isProcessing}
                    className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    <UserCheck className="h-4 w-4" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleAction(() => onDecline?.(request.id))}
                    disabled={isProcessing}
                    className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    <UserX className="h-4 w-4" />
                    Decline
                  </button>
                </>
              )}

              {type === 'sent' && status === 'pending' && (
                <button
                  onClick={() => handleAction(() => onCancel?.(request.id))}
                  disabled={isProcessing}
                  className="flex items-center gap-1 px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  <UserX className="h-4 w-4" />
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      {status !== 'pending' && (
        <div className={`px-6 py-3 border-t ${
          status === 'accepted' 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-2 text-sm">
            {getStatusIcon()}
            <span className={`font-medium ${
              status === 'accepted' ? 'text-green-800' : 'text-red-800'
            }`}>
              {status === 'accepted' 
                ? 'Connection established! You can now message each other.' 
                : 'Connection request was declined.'
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionRequestCard;