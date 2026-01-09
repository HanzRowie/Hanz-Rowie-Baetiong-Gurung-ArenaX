import React, { useState } from 'react';
import {
  User,
  MapPin,
  Trophy,
  Star,
  Users,
  Calendar,
  Award,
  Target,
  Heart,
  MessageCircle,
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  Zap,
  Shield,
  Crown,
  Medal,
  Activity,
  TrendingUp,
  Eye,
} from 'lucide-react';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import { LinearProgress } from '@/components/charts/ProgressIndicator';

export interface PlayerProfile {
  id: string;
  name: string;
  avatar?: string;
  location: string;
  skillRating: number;
  skillLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Master';
  preferredSports: string[];
  totalTournaments: number;
  tournamentsWon: number;
  winRate: number;
  averageRank: number;
  recentActivity: string;
  joinedDate: string;
  achievements: Array<{
    id: string;
    title: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
  }>;
  mutualConnections: number;
  connectionStatus: 'none' | 'pending_sent' | 'pending_received' | 'connected' | 'blocked';
  compatibilityScore: number;
  compatibilityFactors: Array<{
    factor: string;
    score: number;
    description: string;
  }>;
  isOnline: boolean;
  lastSeen?: string;
  bio?: string;
  playStyle?: string;
  availability?: {
    weekdays: boolean;
    weekends: boolean;
    evenings: boolean;
    mornings: boolean;
  };
}

interface PlayerProfileCardProps {
  player: PlayerProfile;
  viewMode?: 'compact' | 'detailed';
  showCompatibility?: boolean;
  onConnect?: (playerId: string) => void;
  onMessage?: (playerId: string) => void;
  onViewProfile?: (playerId: string) => void;
  onBlock?: (playerId: string) => void;
}

export default function PlayerProfileCard({
  player,
  viewMode = 'compact',
  showCompatibility = true,
  onConnect,
  onMessage,
  onViewProfile,
  onBlock
}: PlayerProfileCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'Master': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Expert': return 'bg-red-100 text-red-800 border-red-200';
      case 'Advanced': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Intermediate': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCompatibilityColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getCompatibilityLabel = (score: number) => {
    if (score >= 90) return 'Excellent Match';
    if (score >= 75) return 'Great Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Fair Match';
    return 'Poor Match';
  };

  const getConnectionButtonProps = () => {
    switch (player.connectionStatus) {
      case 'connected':
        return {
          icon: UserCheck,
          text: 'Connected',
          variant: 'secondary' as const,
          disabled: true,
        };
      case 'pending_sent':
        return {
          icon: Clock,
          text: 'Pending',
          variant: 'secondary' as const,
          disabled: true,
        };
      case 'pending_received':
        return {
          icon: UserPlus,
          text: 'Accept',
          variant: 'primary' as const,
          disabled: false,
        };
      case 'blocked':
        return {
          icon: UserX,
          text: 'Blocked',
          variant: 'secondary' as const,
          disabled: true,
        };
      default:
        return {
          icon: UserPlus,
          text: 'Connect',
          variant: 'primary' as const,
          disabled: false,
        };
    }
  };

  const handleAction = async (action: string, playerId: string) => {
    setActionLoading(action);
    try {
      switch (action) {
        case 'connect':
          await onConnect?.(playerId);
          break;
        case 'message':
          await onMessage?.(playerId);
          break;
        case 'view':
          await onViewProfile?.(playerId);
          break;
        case 'block':
          await onBlock?.(playerId);
          break;
      }
    } finally {
      setActionLoading(null);
    }
  };

  const connectionButton = getConnectionButtonProps();

  if (viewMode === 'compact') {
    return (
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {player.avatar ? (
              <img
                src={player.avatar}
                alt={player.name}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-emerald-500 flex items-center justify-center">
                <span className="text-xl font-bold text-white">
                  {player.name.charAt(0)}
                </span>
              </div>
            )}
            
            {/* Online Status */}
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
              player.isOnline ? 'bg-emerald-500' : 'bg-gray-400'
            }`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 truncate">{player.name}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-3 w-3" />
                  <span>{player.location}</span>
                  {!player.isOnline && player.lastSeen && (
                    <>
                      <span>•</span>
                      <span>Last seen {player.lastSeen}</span>
                    </>
                  )}
                </div>
              </div>
              
              {showCompatibility && (
                <div className="text-right">
                  <div className={`text-lg font-bold ${getCompatibilityColor(player.compatibilityScore)}`}>
                    {player.compatibilityScore}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {getCompatibilityLabel(player.compatibilityScore)}
                  </div>
                </div>
              )}
            </div>

            {/* Skill Level & Stats */}
            <div className="flex items-center gap-3 mb-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSkillLevelColor(player.skillLevel)}`}>
                {player.skillLevel}
              </span>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Star className="h-3 w-3 text-yellow-500" />
                <span>{player.skillRating}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Trophy className="h-3 w-3 text-amber-500" />
                <span>{player.winRate}%</span>
              </div>
            </div>

            {/* Sports */}
            <div className="flex flex-wrap gap-1 mb-3">
              {player.preferredSports.slice(0, 3).map((sport, index) => (
                <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                  {sport}
                </span>
              ))}
              {player.preferredSports.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                  +{player.preferredSports.length - 3} more
                </span>
              )}
            </div>

            {/* Mutual Connections */}
            {player.mutualConnections > 0 && (
              <div className="flex items-center gap-1 text-sm text-blue-600 mb-3">
                <Users className="h-3 w-3" />
                <span>{player.mutualConnections} mutual connections</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={connectionButton.variant}
                disabled={connectionButton.disabled || actionLoading === 'connect'}
                onClick={() => handleAction('connect', player.id)}
                className="flex-1"
              >
                <connectionButton.icon className="h-4 w-4 mr-1" />
                {actionLoading === 'connect' ? 'Loading...' : connectionButton.text}
              </Button>
              
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleAction('message', player.id)}
                disabled={actionLoading === 'message'}
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
              
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleAction('view', player.id)}
                disabled={actionLoading === 'view'}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Detailed view
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-6">
          <div className="relative">
            {player.avatar ? (
              <img
                src={player.avatar}
                alt={player.name}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-emerald-500 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {player.name.charAt(0)}
                </span>
              </div>
            )}
            
            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white ${
              player.isOnline ? 'bg-emerald-500' : 'bg-gray-400'
            }`} />
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{player.name}</h2>
                <div className="flex items-center gap-2 text-gray-600 mt-1">
                  <MapPin className="h-4 w-4" />
                  <span>{player.location}</span>
                  <span>•</span>
                  <span>Joined {new Date(player.joinedDate).toLocaleDateString()}</span>
                </div>
              </div>
              
              {showCompatibility && (
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getCompatibilityColor(player.compatibilityScore)}`}>
                    {player.compatibilityScore}%
                  </div>
                  <div className="text-sm text-gray-600">
                    {getCompatibilityLabel(player.compatibilityScore)}
                  </div>
                </div>
              )}
            </div>

            {/* Bio */}
            {player.bio && (
              <p className="text-gray-600 mb-4">{player.bio}</p>
            )}

            {/* Status */}
            <div className="flex items-center gap-4 text-sm">
              <div className={`flex items-center gap-1 ${player.isOnline ? 'text-emerald-600' : 'text-gray-500'}`}>
                <div className={`w-2 h-2 rounded-full ${player.isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                <span>{player.isOnline ? 'Online now' : `Last seen ${player.lastSeen}`}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Activity className="h-3 w-3" />
                <span>{player.recentActivity}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Star className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="text-xl font-bold text-gray-900">{player.skillRating}</div>
            <div className="text-sm text-gray-600">Skill Rating</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Trophy className="h-5 w-5 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-gray-900">{player.winRate}%</div>
            <div className="text-sm text-gray-600">Win Rate</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Target className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-gray-900">{player.totalTournaments}</div>
            <div className="text-sm text-gray-600">Tournaments</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Award className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-gray-900">{player.tournamentsWon}</div>
            <div className="text-sm text-gray-600">Wins</div>
          </div>
        </div>

        {/* Skill Level & Sports */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Skill Level</h3>
            <span className={`inline-block px-3 py-2 rounded-lg text-sm font-medium border ${getSkillLevelColor(player.skillLevel)}`}>
              {player.skillLevel}
            </span>
            {player.playStyle && (
              <p className="text-sm text-gray-600 mt-2">Play Style: {player.playStyle}</p>
            )}
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Preferred Sports</h3>
            <div className="flex flex-wrap gap-2">
              {player.preferredSports.map((sport, index) => (
                <span key={index} className="px-3 py-1 bg-emerald-100 text-emerald-800 text-sm rounded-full">
                  {sport}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Availability */}
        {player.availability && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Availability</h3>
            <div className="flex flex-wrap gap-2">
              {player.availability.weekdays && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">Weekdays</span>
              )}
              {player.availability.weekends && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">Weekends</span>
              )}
              {player.availability.mornings && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">Mornings</span>
              )}
              {player.availability.evenings && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">Evenings</span>
              )}
            </div>
          </div>
        )}

        {/* Achievements */}
        {player.achievements.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Recent Achievements</h3>
            <div className="flex gap-3">
              {player.achievements.slice(0, 5).map((achievement) => {
                const rarityColors = {
                  common: 'bg-gray-100 text-gray-600',
                  rare: 'bg-blue-100 text-blue-600',
                  epic: 'bg-purple-100 text-purple-600',
                  legendary: 'bg-orange-100 text-orange-600',
                };
                
                return (
                  <div
                    key={achievement.id}
                    className={`p-2 rounded-lg ${rarityColors[achievement.rarity]}`}
                    title={achievement.title}
                  >
                    <Award className="h-5 w-5" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Compatibility Breakdown */}
        {showCompatibility && player.compatibilityFactors.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Compatibility Breakdown</h3>
            <div className="space-y-3">
              {player.compatibilityFactors.map((factor, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{factor.factor}</span>
                    <span className="text-sm text-gray-600">{factor.score}%</span>
                  </div>
                  <LinearProgress
                    value={factor.score}
                    max={100}
                    color="success"
                    size="sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">{factor.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mutual Connections */}
        {player.mutualConnections > 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-blue-800">
              You have {player.mutualConnections} mutual connections
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <Button
            variant={connectionButton.variant}
            disabled={connectionButton.disabled || actionLoading === 'connect'}
            onClick={() => handleAction('connect', player.id)}
            className="flex-1"
          >
            <connectionButton.icon className="h-4 w-4 mr-2" />
            {actionLoading === 'connect' ? 'Loading...' : connectionButton.text}
          </Button>
          
          <Button
            variant="secondary"
            onClick={() => handleAction('message', player.id)}
            disabled={actionLoading === 'message'}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Message
          </Button>
          
          <Button
            variant="secondary"
            onClick={() => handleAction('view', player.id)}
            disabled={actionLoading === 'view'}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Profile
          </Button>
        </div>
      </div>
    </Card>
  );
}