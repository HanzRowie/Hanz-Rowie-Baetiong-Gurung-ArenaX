import { useState } from 'react';
import {
  Trophy,
  Medal,
  Star,
  Calendar,
  MapPin,
  Award,
  Target,
  TrendingUp,
  TrendingDown,
  Camera,
  Play,
  ChevronDown,
  ChevronUp,
  Download,
  Share2,
  Eye,
  Crown,
  Heart,
} from 'lucide-react';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';

export interface TournamentHistoryEntry {
  id: string;
  tournamentId: string;
  tournamentTitle: string;
  tournamentImage?: string;
  sport: string;
  date: string;
  venue: string;
  location: string;
  rank: number;
  totalParticipants: number;
  pointsEarned: number;
  skillRatingChange: number;
  matchesPlayed: number;
  matchesWon: number;
  winRate: number;
  highlights: Array<{
    type: 'achievement' | 'milestone' | 'memorable_moment' | 'photo' | 'video';
    title: string;
    description: string;
    media?: string;
    timestamp?: string;
  }>;
  opponents: Array<{
    id: string;
    name: string;
    avatar?: string;
    result: 'win' | 'loss' | 'draw';
    score?: string;
  }>;
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
  }>;
  organizer: {
    name: string;
    avatar?: string;
  };
  isExpanded?: boolean;
}

interface TournamentHistoryTimelineProps {
  entries: TournamentHistoryEntry[];
  onViewTournament?: (tournamentId: string) => void;
  onShareEntry?: (entryId: string) => void;
  onDownloadCertificate?: (entryId: string) => void;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export default function TournamentHistoryTimeline({
  entries,
  onViewTournament,
  onShareEntry,
  onDownloadCertificate,
  loading = false,
  hasMore = false,
  onLoadMore
}: TournamentHistoryTimelineProps) {
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [filterSport, setFilterSport] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'rank' | 'points'>('date');

  const toggleExpanded = (entryId: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  const getRankColor = (rank: number, totalParticipants: number) => {
    const percentage = (rank / totalParticipants) * 100;
    if (rank === 1) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    if (rank <= 3) return 'text-gray-600 bg-gray-100 border-gray-200';
    if (percentage <= 25) return 'text-emerald-600 bg-emerald-100 border-emerald-200';
    if (percentage <= 50) return 'text-blue-600 bg-blue-100 border-blue-200';
    return 'text-red-600 bg-red-100 border-red-200';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return Crown;
    if (rank <= 3) return Medal;
    return Trophy;
  };

  const getSkillRatingTrend = (change: number) => {
    if (change > 0) return { icon: TrendingUp, color: 'text-emerald-500', text: `+${change}` };
    if (change < 0) return { icon: TrendingDown, color: 'text-red-500', text: `${change}` };
    return { icon: Target, color: 'text-gray-500', text: '0' };
  };

  const getAchievementRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'epic': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'rare': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      day: date.getDate(),
      year: date.getFullYear(),
      full: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    };
  };

  // Filter and sort entries
  const filteredEntries = entries
    .filter(entry => !filterSport || entry.sport === filterSport)
    .filter(entry => !filterYear || new Date(entry.date).getFullYear().toString() === filterYear)
    .sort((a, b) => {
      switch (sortBy) {
        case 'rank':
          return a.rank - b.rank;
        case 'points':
          return b.pointsEarned - a.pointsEarned;
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

  const sports = [...new Set(entries.map(entry => entry.sport))];
  const years = [...new Set(entries.map(entry => new Date(entry.date).getFullYear().toString()))];

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Tournament History</h2>
            <p className="text-gray-600">Your complete tournament journey and achievements</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={filterSport}
              onChange={(e) => setFilterSport(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            >
              <option value="">All Sports</option>
              {sports.map(sport => (
                <option key={sport} value={sport}>{sport}</option>
              ))}
            </select>

            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            >
              <option value="">All Years</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            >
              <option value="date">Sort by Date</option>
              <option value="rank">Sort by Rank</option>
              <option value="points">Sort by Points</option>
            </select>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <div className="text-2xl font-bold text-emerald-600">{entries.length}</div>
            <div className="text-sm text-emerald-700">Total Tournaments</div>
          </div>
          
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <div className="text-2xl font-bold text-amber-600">
              {entries.filter(e => e.rank === 1).length}
            </div>
            <div className="text-sm text-amber-700">Championships</div>
          </div>
          
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {entries.filter(e => e.rank <= 3).length}
            </div>
            <div className="text-sm text-blue-700">Podium Finishes</div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {entries.reduce((sum, e) => sum + e.pointsEarned, 0)}
            </div>
            <div className="text-sm text-purple-700">Total Points</div>
          </div>
        </div>
      </Card>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />

        <div className="space-y-8">
          {filteredEntries.map((entry) => {
            const date = formatDate(entry.date);
            const isExpanded = expandedEntries.has(entry.id);
            const rankColor = getRankColor(entry.rank, entry.totalParticipants);
            const RankIcon = getRankIcon(entry.rank);
            const skillTrend = getSkillRatingTrend(entry.skillRatingChange);

            return (
              <div key={entry.id} className="relative flex items-start gap-6">
                {/* Timeline node */}
                <div className={`
                  relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 transition-all duration-300
                  ${entry.rank === 1 
                    ? 'bg-yellow-500 border-yellow-300 shadow-lg' 
                    : entry.rank <= 3
                    ? 'bg-gray-400 border-gray-300'
                    : 'bg-white border-emerald-300'
                  }
                `}>
                  <RankIcon className={`h-6 w-6 ${
                    entry.rank === 1 ? 'text-white' : 
                    entry.rank <= 3 ? 'text-white' : 'text-emerald-600'
                  }`} />
                </div>

                {/* Date badge */}
                <div className="absolute left-20 top-0 bg-white border border-gray-200 rounded-lg px-3 py-1 shadow-sm">
                  <div className="text-center">
                    <div className="text-xs text-gray-500">{date.month}</div>
                    <div className="text-lg font-bold text-gray-900">{date.day}</div>
                    <div className="text-xs text-gray-500">{date.year}</div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 ml-12">
                  <Card className="p-6 hover:shadow-lg transition-shadow">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">{entry.tournamentTitle}</h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${rankColor}`}>
                            <RankIcon className="h-3 w-3 mr-1 inline" />
                            #{entry.rank} of {entry.totalParticipants}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{date.full}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{entry.venue}, {entry.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Trophy className="h-3 w-3" />
                            <span>{entry.sport}</span>
                          </div>
                        </div>
                      </div>

                      {/* Tournament Image */}
                      {entry.tournamentImage && (
                        <img
                          src={entry.tournamentImage}
                          alt={entry.tournamentTitle}
                          className="w-20 h-20 rounded-lg object-cover ml-4"
                        />
                      )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-bold text-gray-900">{entry.pointsEarned}</div>
                        <div className="text-xs text-gray-600">Points Earned</div>
                      </div>
                      
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-center gap-1">
                          <skillTrend.icon className={`h-4 w-4 ${skillTrend.color}`} />
                          <span className={`text-lg font-bold ${skillTrend.color}`}>
                            {skillTrend.text}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">Rating Change</div>
                      </div>
                      
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-bold text-gray-900">
                          {entry.matchesWon}/{entry.matchesPlayed}
                        </div>
                        <div className="text-xs text-gray-600">Matches Won</div>
                      </div>
                      
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-bold text-gray-900">{entry.winRate}%</div>
                        <div className="text-xs text-gray-600">Win Rate</div>
                      </div>
                    </div>

                    {/* Achievements */}
                    {entry.achievements.length > 0 && (
                      <div className="mb-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">Achievements Unlocked:</div>
                        <div className="flex flex-wrap gap-2">
                          {entry.achievements.map((achievement) => (
                            <span
                              key={achievement.id}
                              className={`px-3 py-1 rounded-full text-xs font-medium border ${getAchievementRarityColor(achievement.rarity)}`}
                              title={achievement.description}
                            >
                              <Award className="h-3 w-3 mr-1 inline" />
                              {achievement.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Highlights Preview */}
                    {entry.highlights.length > 0 && (
                      <div className="mb-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">Highlights:</div>
                        <div className="flex gap-2">
                          {entry.highlights.slice(0, 3).map((highlight, idx) => (
                            <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full">
                              {highlight.type === 'photo' && <Camera className="h-3 w-3" />}
                              {highlight.type === 'video' && <Play className="h-3 w-3" />}
                              {highlight.type === 'achievement' && <Award className="h-3 w-3" />}
                              {highlight.type === 'milestone' && <Star className="h-3 w-3" />}
                              {highlight.type === 'memorable_moment' && <Heart className="h-3 w-3" />}
                              <span>{highlight.title}</span>
                            </div>
                          ))}
                          {entry.highlights.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              +{entry.highlights.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => toggleExpanded(entry.id)}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-1" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-1" />
                              Show Details
                            </>
                          )}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onViewTournament?.(entry.tournamentId)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Tournament
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onShareEntry?.(entry.id)}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        
                        {entry.rank <= 3 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDownloadCertificate?.(entry.id)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-6 pt-6 border-t border-gray-200 space-y-6">
                        {/* Detailed Highlights */}
                        {entry.highlights.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Tournament Highlights</h4>
                            <div className="space-y-3">
                              {entry.highlights.map((highlight, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                  <div className="p-1 bg-emerald-100 rounded">
                                    {highlight.type === 'photo' && <Camera className="h-4 w-4 text-emerald-600" />}
                                    {highlight.type === 'video' && <Play className="h-4 w-4 text-emerald-600" />}
                                    {highlight.type === 'achievement' && <Award className="h-4 w-4 text-emerald-600" />}
                                    {highlight.type === 'milestone' && <Star className="h-4 w-4 text-emerald-600" />}
                                    {highlight.type === 'memorable_moment' && <Heart className="h-4 w-4 text-emerald-600" />}
                                  </div>
                                  <div className="flex-1">
                                    <h5 className="font-medium text-gray-900">{highlight.title}</h5>
                                    <p className="text-sm text-gray-600">{highlight.description}</p>
                                    {highlight.timestamp && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        {new Date(highlight.timestamp).toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                  {highlight.media && (
                                    <img
                                      src={highlight.media}
                                      alt={highlight.title}
                                      className="w-16 h-16 rounded-lg object-cover"
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Opponents */}
                        {entry.opponents.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Match Results</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {entry.opponents.map((opponent) => (
                                <div key={opponent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    {opponent.avatar ? (
                                      <img
                                        src={opponent.avatar}
                                        alt={opponent.name}
                                        className="w-8 h-8 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center">
                                        <span className="text-xs font-bold text-white">
                                          {opponent.name.charAt(0)}
                                        </span>
                                      </div>
                                    )}
                                    <div>
                                      <p className="font-medium text-gray-900">{opponent.name}</p>
                                      {opponent.score && (
                                        <p className="text-xs text-gray-500">{opponent.score}</p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    opponent.result === 'win' 
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : opponent.result === 'loss'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {opponent.result.toUpperCase()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Organizer */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Organized By</h4>
                          <div className="flex items-center gap-3">
                            {entry.organizer.avatar ? (
                              <img
                                src={entry.organizer.avatar}
                                alt={entry.organizer.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                                <span className="text-sm font-bold text-white">
                                  {entry.organizer.name.charAt(0)}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{entry.organizer.name}</p>
                              <p className="text-sm text-gray-600">Tournament Organizer</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            );
          })}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="text-center mt-8">
            <Button
              onClick={onLoadMore}
              disabled={loading}
              variant="secondary"
              size="lg"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  Loading...
                </div>
              ) : (
                'Load More History'
              )}
            </Button>
          </div>
        )}

        {filteredEntries.length === 0 && (
          <Card className="p-12 text-center">
            <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Tournament History</h3>
            <p className="text-gray-600">
              {filterSport || filterYear 
                ? 'No tournaments found matching your filters.'
                : 'Start participating in tournaments to build your history!'
              }
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}