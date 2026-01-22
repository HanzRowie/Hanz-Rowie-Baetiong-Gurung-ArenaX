import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { profileService } from '@/services/profileService';
import type { ExtendedUserProfile } from '@/types';
import { Search, Users, Star, MapPin, Filter, ArrowLeft, UserPlus, CheckCircle, TrendingUp, Award, Calendar, MessageCircle, Target } from 'lucide-react';

export default function PlayerFinderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchResults, setSearchResults] = useState<ExtendedUserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'compatibility' | 'recent' | 'location'>('compatibility');

  // Search filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [minMatchScore, setMinMatchScore] = useState<number>(0);
  const [availableOnly, setAvailableOnly] = useState(false);

  // Available sports (based on common tournament sports)
  const sports = ['FUTSAL', 'BADMINTON'];
  const skillLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL'];

  // Format sport name for display
  const formatSportName = (sport: string) => {
    return sport.charAt(0).toUpperCase() + sport.slice(1).toLowerCase();
  };

  useEffect(() => {
    // Load players on mount and when filters change
    handleFilteredSearch();
  }, [selectedSport, selectedSkill, selectedLocation]);

  const handleFilteredSearch = async () => {
    setLoading(true);
    try {
      const filters = {
        q: searchQuery || undefined,
        sport: selectedSport || undefined,
        location: selectedLocation || undefined,
        skill_level: selectedSkill || undefined,
      };
      const results = await profileService.searchPlayers(filters);

      // Filter out current user (double check even though backend should do this)
      let filteredResults = results.players.filter(player => player.id !== user?.id);

      if (minMatchScore > 0) {
        filteredResults = filteredResults.filter(player =>
          player.match_score && player.match_score >= minMatchScore
        );
      }

      if (availableOnly) {
        filteredResults = filteredResults.filter(player =>
          player.is_available_for_matches
        );
      }

      // Sort results based on selected criteria
      filteredResults = sortResults(filteredResults);

      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Failed to search players:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortResults = (results: ExtendedUserProfile[]) => {
    return [...results].sort((a, b) => {
      switch (sortBy) {
        case 'compatibility':
          return (b.match_score || 0) - (a.match_score || 0);
        case 'recent':
          return new Date(b.date_joined).getTime() - new Date(a.date_joined).getTime();
        case 'location':
          if (a.location === b.location) return 0;
          if (a.location === selectedLocation) return -1;
          if (b.location === selectedLocation) return 1;
          return a.location.localeCompare(b.location);
        default:
          return 0;
      }
    });
  };

  const handleSendJoinRequest = async (playerId: string) => {
    try {
      await profileService.sendJoinRequest(playerId);
      // Update UI to show request sent
      setSentRequests(prev => new Set([...prev, playerId]));

      // Show success message
      const playerName = searchResults.find(p => p.id === playerId)?.full_name || 'Player';
      // You could add a toast notification here
      console.log(`Connection request sent to ${playerName}`);
    } catch (error) {
      console.error('Failed to send join request:', error);
      // You could add error toast notification here
    }
  };

  const getCompatibilityLevel = (score?: number) => {
    if (!score) return { level: 'Unknown', color: 'gray', icon: Target };
    if (score >= 80) return { level: 'Excellent', color: 'green', icon: Award };
    if (score >= 60) return { level: 'Very Good', color: 'blue', icon: TrendingUp };
    if (score >= 40) return { level: 'Good', color: 'yellow', icon: Star };
    return { level: 'Fair', color: 'orange', icon: Target };
  };

  const renderCompatibilityScore = (player: ExtendedUserProfile) => {
    if (!player.match_score) return null;

    const compatibility = getCompatibilityLevel(player.match_score);
    const IconComponent = compatibility.icon;

    return (
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <div className={`p-2 rounded-full bg-${compatibility.color}-100`}>
          <IconComponent className={`h-5 w-5 text-${compatibility.color}-600`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-900">
              Compatibility: {compatibility.level}
            </span>
            <span className={`text-sm font-bold text-${compatibility.color}-600`}>
              {player.match_score}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`bg-${compatibility.color}-500 h-2 rounded-full transition-all duration-300`}
              style={{ width: `${player.match_score}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

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
              <h1 className="text-2xl font-bold text-gray-900">Find Teammates</h1>
              <p className="text-sm text-gray-600">Discover compatible players for your games</p>
            </div>
            <div className="w-32"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="bg-white p-6 rounded-xl shadow-md mb-6">
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search players by name, bio, or interests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={(e) => e.key === 'Enter' && handleFilteredSearch()}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-3 border rounded-lg transition-colors ${showFilters
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <Filter className="h-5 w-5" />
                Advanced Filters
              </button>
            </div>
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <div className="flex gap-2">
              {[
                { key: 'compatibility', label: 'Compatibility', icon: TrendingUp },
                { key: 'recent', label: 'Recently Joined', icon: Calendar },
                { key: 'location', label: 'Location', icon: MapPin }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => {
                    setSortBy(key as any);
                    if (searchResults.length > 0) {
                      setSearchResults(sortResults(searchResults));
                    }
                  }}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors ${sortBy === key
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Enhanced Filters */}
          {showFilters && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sport</label>
                  <select
                    value={selectedSport}
                    onChange={(e) => setSelectedSport(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Sports</option>
                    {sports.map((sport) => (
                      <option key={sport} value={sport}>{formatSportName(sport)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Skill Level</label>
                  <select
                    value={selectedSkill}
                    onChange={(e) => setSelectedSkill(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Levels</option>
                    {skillLevels.map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    placeholder="City or region"
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Compatibility: {minMatchScore}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={minMatchScore}
                    onChange={(e) => setMinMatchScore(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(e) => setAvailableOnly(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Available for matches only</span>
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleFilteredSearch}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Finding compatible players...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-md">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No players found</h3>
              <p className="text-gray-600">Try adjusting your search filters to find players.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Compatible Players ({searchResults.length})
                </h2>
                <div className="text-sm text-gray-600">
                  {searchResults.some(p => p.match_score) && "Sorted by compatibility"}
                </div>
              </div>

              {searchResults.map((player) => (
                <div key={player.id} className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0 relative">
                      {player.profile_picture ? (
                        <img
                          src={player.profile_picture}
                          alt={player.full_name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                          <span className="text-2xl font-semibold text-white">
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
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {player.full_name}
                            </h3>
                            {player.is_available_for_matches && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Available
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                            {player.skill_level && (
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500" />
                                {player.skill_level}
                              </div>
                            )}
                            {player.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                {player.location}
                              </div>
                            )}
                            {player.preferred_sports && player.preferred_sports.length > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-400">Sports:</span>
                                <span>{player.preferred_sports.slice(0, 2).map(formatSportName).join(', ')}
                                  {player.preferred_sports.length > 2 && ` +${player.preferred_sports.length - 2}`}
                                </span>
                              </div>
                            )}
                          </div>

                          {player.bio && (
                            <p className="text-gray-700 text-sm line-clamp-2 mb-3">
                              {player.bio}
                            </p>
                          )}

                          {/* Player Stats */}
                          {(player.tournaments_participated || player.matches_played || player.win_rate) && (
                            <div className="flex gap-4 text-xs text-gray-500 mb-3">
                              {player.tournaments_participated && (
                                <span>🏆 {player.tournaments_participated} tournaments</span>
                              )}
                              {player.matches_played && (
                                <span>⚔️ {player.matches_played} matches</span>
                              )}
                              {player.win_rate && (
                                <span>📈 {Math.round(player.win_rate)}% win rate</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 ml-4">
                          <button
                            onClick={() => navigate(`/profile/${player.id}`)}
                            className="flex items-center gap-1 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                          >
                            <Users className="h-4 w-4" />
                            View Profile
                          </button>
                          <button
                            onClick={() => handleSendJoinRequest(player.id)}
                            disabled={sentRequests.has(player.id)}
                            className={`flex items-center gap-1 px-4 py-2 rounded-lg transition-colors text-sm ${sentRequests.has(player.id)
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                          >
                            {sentRequests.has(player.id) ? (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                Request Sent
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-4 w-4" />
                                Connect
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => navigate(`/chats/${player.id}`)}
                            className="flex items-center gap-1 px-3 py-2 text-green-600 border border-green-300 rounded-lg hover:bg-green-50 transition-colors text-sm"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Message
                          </button>
                        </div>
                      </div>

                      {/* Enhanced Compatibility Display */}
                      {renderCompatibilityScore(player)}

                      {/* Match Reasons */}
                      {player.match_reasons && player.match_reasons.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs font-medium text-gray-700 mb-2">Why you're compatible:</p>
                          {player.match_reasons.slice(0, 3).map((reason, index) => (
                            <p key={index} className="text-xs text-gray-600 flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                              {reason}
                            </p>
                          ))}
                          {player.match_reasons.length > 3 && (
                            <p className="text-xs text-gray-500 italic">
                              +{player.match_reasons.length - 3} more reasons
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
