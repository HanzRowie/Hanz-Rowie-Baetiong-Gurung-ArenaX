import { useState, useEffect } from 'react';
import { Search, MapPin, MessageCircle, User, Filter } from 'lucide-react';
import { profileService } from '@/services/profileService';
import type { ExtendedUserProfile } from '@/types';
import toastService from '@/services/toastService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { BottomNavigation } from '@/components';

export default function PlayersPage() {
  const navigate = useNavigate();
  const { } = useAuth();
  const [players, setPlayers] = useState<ExtendedUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedSkillLevel, setSelectedSkillLevel] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const sportTypes = [
    'Futsal', 'Badminton'
  ];

  const skillLevels = [
    { value: 'BEGINNER', label: 'Beginner' },
    { value: 'INTERMEDIATE', label: 'Intermediate' },
    { value: 'ADVANCED', label: 'Advanced' },
    { value: 'PROFESSIONAL', label: 'Professional' },
  ];

  useEffect(() => {
    searchPlayers();
  }, [searchQuery, selectedSport, selectedLocation, selectedSkillLevel]);

  const searchPlayers = async () => {
    try {
      setLoading(true);
      const filters = {
        q: searchQuery || undefined,
        sport: selectedSport || undefined,
        location: selectedLocation || undefined,
        skill_level: selectedSkillLevel || undefined,
      };

      const response = await profileService.searchPlayers(filters);
      setPlayers(response.players);
    } catch (error) {
      toastService.error('Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'BEGINNER': return 'bg-green-100 text-green-800';
      case 'INTERMEDIATE': return 'bg-blue-100 text-blue-800';
      case 'ADVANCED': return 'bg-purple-100 text-purple-800';
      case 'PROFESSIONAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const startChat = async (player: ExtendedUserProfile) => {
    try {
      // Navigate to chats page and try to open conversation with this player
      navigate('/chats', { state: { startChatWith: player.id } });
    } catch (error) {
      toastService.error('Failed to start chat');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page title and filter toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Find Players</h1>
          <p className="text-sm text-gray-500">
            Search and connect with players based on sport, location, and skill level.
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
        >
          <Filter className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Search and Filters */}
      <div>
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search players by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none shadow-sm"
            />
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sport</label>
                <select
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                >
                  <option value="">All Sports</option>
                  {sportTypes.map((sport) => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  placeholder="Enter location"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skill Level</label>
                <select
                  value={selectedSkillLevel}
                  onChange={(e) => setSelectedSkillLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                >
                  <option value="">All Levels</option>
                  {skillLevels.map((level) => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            <div className="mt-4">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSport('');
                  setSelectedLocation('');
                  setSelectedSkillLevel('');
                }}
                className="text-purple-600 hover:text-purple-700 text-sm font-medium"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}

        {/* Players Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <User className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No players found</h3>
            <p className="text-gray-600 text-sm">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {players.map((player) => (
              <div key={player.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                {/* Player Header */}
                <div className="flex items-center gap-4 mb-4">
                  {player.profile_picture ? (
                    <img
                      src={player.profile_picture}
                      alt={player.full_name}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-purple-100 flex items-center justify-center">
                      <User className="h-8 w-8 text-purple-600" />
                    </div>
                  )}

                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{player.full_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {player.skill_level && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSkillLevelColor(player.skill_level)}`}>
                          {player.skill_level}
                        </span>
                      )}
                      {player.is_available_for_matches && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Available
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Player Info */}
                <div className="space-y-3 mb-4">
                  {player.bio && (
                    <p className="text-sm text-gray-600 line-clamp-2">{player.bio}</p>
                  )}

                  {player.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{player.location}</span>
                    </div>
                  )}

                  {player.preferred_sports && player.preferred_sports.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Preferred Sports</p>
                      <div className="flex flex-wrap gap-1">
                        {player.preferred_sports.slice(0, 3).map((sport) => (
                          <span key={sport} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {sport}
                          </span>
                        ))}
                        {player.preferred_sports.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            +{player.preferred_sports.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Player Stats */}
                  {(player.tournaments_participated || player.matches_played || player.win_rate) && (
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                      {player.tournaments_participated !== undefined && (
                        <div className="text-center">
                          <p className="text-lg font-semibold text-gray-900">{player.tournaments_participated}</p>
                          <p className="text-xs text-gray-600">Tournaments</p>
                        </div>
                      )}
                      {player.matches_played !== undefined && (
                        <div className="text-center">
                          <p className="text-lg font-semibold text-gray-900">{player.matches_played}</p>
                          <p className="text-xs text-gray-600">Matches</p>
                        </div>
                      )}
                      {player.win_rate !== undefined && (
                        <div className="text-center">
                          <p className="text-lg font-semibold text-gray-900">{player.win_rate.toFixed(0)}%</p>
                          <p className="text-xs text-gray-600">Win Rate</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => startChat(player)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Message</span>
                  </button>

                  <button
                    onClick={() => navigate(`/profile/${player.id}`)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}