import { useState } from 'react';
import {
  Trophy,
  Star,
  Calendar,
  Clock,
  MapPin,
  Camera,
  Play,
  Eye,
  Share2,
  Award,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Heart,
  MessageCircle,
} from 'lucide-react';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';

export interface MatchResult {
  id: string;
  tournamentId: string;
  tournamentTitle: string;
  matchNumber: number;
  round: string;
  date: string;
  time: string;
  venue: string;
  opponent: {
    id: string;
    name: string;
    avatar?: string;
    skillRating: number;
    skillLevel: string;
  };
  result: 'win' | 'loss' | 'draw';
  score: {
    player: number;
    opponent: number;
    details?: string; // e.g., "6-4, 6-2" for tennis
  };
  duration: string; // e.g., "1h 45m"
  skillRatingChange: number;
  pointsEarned: number;
  highlights: Array<{
    type: 'great_shot' | 'comeback' | 'milestone' | 'photo' | 'video';
    title: string;
    description: string;
    timestamp?: string;
    media?: string;
  }>;
  photos: Array<{
    id: string;
    url: string;
    caption?: string;
    timestamp: string;
  }>;
  videos: Array<{
    id: string;
    url: string;
    thumbnail: string;
    title: string;
    duration: string;
  }>;
  stats?: {
    accuracy?: number;
    powerShots?: number;
    defensivePlays?: number;
    [key: string]: number | undefined;
  };
  memorable: boolean;
  notes?: string;
}

interface MatchResultCardProps {
  match: MatchResult;
  viewMode?: 'compact' | 'detailed';
  onViewOpponent?: (opponentId: string) => void;
  onViewTournament?: (tournamentId: string) => void;
  onViewMedia?: (mediaId: string, type: 'photo' | 'video') => void;
  onShare?: (matchId: string) => void;
  onToggleMemorable?: (matchId: string) => void;
  onAddNote?: (matchId: string, note: string) => void;
}

export default function MatchResultCard({
  match,
  viewMode = 'compact',
  onViewOpponent,
  onViewTournament,
  onViewMedia,
  onShare,
  onToggleMemorable,
  onAddNote
}: MatchResultCardProps) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState(match.notes || '');

  const getResultColor = (result: string) => {
    switch (result) {
      case 'win': return 'text-emerald-600 bg-emerald-100 border-emerald-200';
      case 'loss': return 'text-red-600 bg-red-100 border-red-200';
      case 'draw': return 'text-gray-600 bg-gray-100 border-gray-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'win': return Trophy;
      case 'loss': return Target;
      case 'draw': return Minus;
      default: return Target;
    }
  };

  const getSkillRatingTrend = (change: number) => {
    if (change > 0) return { icon: TrendingUp, color: 'text-emerald-500', text: `+${change}` };
    if (change < 0) return { icon: TrendingDown, color: 'text-red-500', text: `${change}` };
    return { icon: Minus, color: 'text-gray-500', text: '0' };
  };

  const formatDateTime = (date: string, time: string) => {
    const matchDate = new Date(`${date}T${time}`);
    return {
      date: matchDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }),
      time: matchDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  const handleSaveNote = () => {
    onAddNote?.(match.id, noteText);
    setShowNoteInput(false);
  };

  const dateTime = formatDateTime(match.date, match.time);
  const skillTrend = getSkillRatingTrend(match.skillRatingChange);
  const resultColor = getResultColor(match.result);
  const ResultIcon = getResultIcon(match.result);

  if (viewMode === 'compact') {
    return (
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-4">
          {/* Result Badge */}
          <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${resultColor}`}>
            <ResultIcon className="h-4 w-4" />
          </div>

          {/* Match Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900 truncate">
                vs {match.opponent.name}
              </h3>
              <div className="flex items-center gap-2">
                {match.memorable && (
                  <Heart className="h-4 w-4 text-red-500 fill-current" />
                )}
                <span className="text-sm text-gray-500">{dateTime.date}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="font-medium">
                  {match.score.player} - {match.score.opponent}
                </span>
                <span>{match.tournamentTitle}</span>
                <span>{match.round}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <skillTrend.icon className={`h-3 w-3 ${skillTrend.color}`} />
                  <span className={`text-sm font-medium ${skillTrend.color}`}>
                    {skillTrend.text}
                  </span>
                </div>
                <span className="text-sm text-emerald-600">+{match.pointsEarned}</span>
              </div>
            </div>
          </div>

          {/* Media Indicators */}
          <div className="flex items-center gap-2">
            {match.photos.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Camera className="h-3 w-3" />
                <span>{match.photos.length}</span>
              </div>
            )}
            {match.videos.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Play className="h-3 w-3" />
                <span>{match.videos.length}</span>
              </div>
            )}
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </Card>
    );
  }

  // Detailed view
  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`flex items-center justify-center w-16 h-16 rounded-full border-2 ${resultColor}`}>
                <ResultIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {match.result.toUpperCase()}
                </h2>
                <p className="text-gray-600">vs {match.opponent.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{dateTime.date}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{dateTime.time}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{match.venue}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onToggleMemorable?.(match.id)}
              className={match.memorable ? 'text-red-500' : 'text-gray-400'}
            >
              <Heart className={`h-4 w-4 ${match.memorable ? 'fill-current' : ''}`} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onShare?.(match.id)}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Score & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Score */}
          <Card className="p-4 text-center">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Final Score</h3>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {match.score.player} - {match.score.opponent}
            </div>
            {match.score.details && (
              <p className="text-sm text-gray-600">{match.score.details}</p>
            )}
            <p className="text-xs text-gray-500 mt-2">Duration: {match.duration}</p>
          </Card>

          {/* Performance */}
          <Card className="p-4 text-center">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Performance</h3>
            <div className="flex items-center justify-center gap-2 mb-1">
              <skillTrend.icon className={`h-5 w-5 ${skillTrend.color}`} />
              <span className={`text-2xl font-bold ${skillTrend.color}`}>
                {skillTrend.text}
              </span>
            </div>
            <p className="text-sm text-gray-600">Rating Change</p>
            <p className="text-xs text-emerald-600 mt-2">+{match.pointsEarned} points</p>
          </Card>

          {/* Tournament Info */}
          <Card className="p-4 text-center">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Tournament</h3>
            <p className="font-semibold text-gray-900 mb-1">{match.tournamentTitle}</p>
            <p className="text-sm text-gray-600">{match.round}</p>
            <p className="text-xs text-gray-500 mt-2">Match #{match.matchNumber}</p>
          </Card>
        </div>

        {/* Opponent Info */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Opponent</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {match.opponent.avatar ? (
                <img
                  src={match.opponent.avatar}
                  alt={match.opponent.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">
                    {match.opponent.name.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <h4 className="font-semibold text-gray-900">{match.opponent.name}</h4>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{match.opponent.skillLevel}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    <span>{match.opponent.skillRating}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onViewOpponent?.(match.opponent.id)}
              >
                <Eye className="h-4 w-4 mr-1" />
                View Profile
              </Button>
              <Button
                size="sm"
                variant="secondary"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Match Stats */}
        {match.stats && Object.keys(match.stats).length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Match Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(match.stats).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{value}</div>
                  <div className="text-sm text-gray-600 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Highlights */}
        {match.highlights.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Match Highlights</h3>
            <div className="space-y-3">
              {match.highlights.map((highlight, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-1 bg-emerald-100 rounded">
                    {highlight.type === 'photo' && <Camera className="h-4 w-4 text-emerald-600" />}
                    {highlight.type === 'video' && <Play className="h-4 w-4 text-emerald-600" />}
                    {highlight.type === 'great_shot' && <Star className="h-4 w-4 text-emerald-600" />}
                    {highlight.type === 'comeback' && <TrendingUp className="h-4 w-4 text-emerald-600" />}
                    {highlight.type === 'milestone' && <Award className="h-4 w-4 text-emerald-600" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{highlight.title}</h4>
                    <p className="text-sm text-gray-600">{highlight.description}</p>
                    {highlight.timestamp && (
                      <p className="text-xs text-gray-500 mt-1">{highlight.timestamp}</p>
                    )}
                  </div>
                  {highlight.media && (
                    <img
                      src={highlight.media}
                      alt={highlight.title}
                      className="w-16 h-16 rounded-lg object-cover cursor-pointer hover:opacity-80"
                      onClick={() => onViewMedia?.(highlight.media!, 'photo')}
                    />
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Photos */}
        {match.photos.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Match Photos</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {match.photos.map((photo) => (
                <div key={photo.id} className="relative group cursor-pointer">
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Match photo'}
                    className="w-full h-24 object-cover rounded-lg group-hover:opacity-80 transition-opacity"
                    onClick={() => onViewMedia?.(photo.id, 'photo')}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all" />
                  <div className="absolute bottom-2 left-2 right-2">
                    {photo.caption && (
                      <p className="text-xs text-white bg-black bg-opacity-50 rounded px-2 py-1 truncate">
                        {photo.caption}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Videos */}
        {match.videos.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Match Videos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {match.videos.map((video) => (
                <div key={video.id} className="relative group cursor-pointer">
                  <div className="relative">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-32 object-cover rounded-lg group-hover:opacity-80 transition-opacity"
                      onClick={() => onViewMedia?.(video.id, 'video')}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-black bg-opacity-50 rounded-full flex items-center justify-center group-hover:bg-opacity-70 transition-all">
                        <Play className="h-6 w-6 text-white ml-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                      {video.duration}
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-2">{video.title}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Notes */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Match Notes</h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowNoteInput(!showNoteInput)}
            >
              {match.notes || showNoteInput ? 'Edit' : 'Add Note'}
            </Button>
          </div>
          
          {showNoteInput ? (
            <div className="space-y-3">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add your thoughts about this match..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveNote}>
                  Save Note
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={() => {
                    setShowNoteInput(false);
                    setNoteText(match.notes || '');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : match.notes ? (
            <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{match.notes}</p>
          ) : (
            <p className="text-gray-500 italic">No notes added yet</p>
          )}
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={() => onViewTournament?.(match.tournamentId)}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Tournament
          </Button>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onShare?.(match.id)}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}