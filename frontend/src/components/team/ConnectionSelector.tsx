import React, { useState, useEffect } from 'react';
import { Button } from '@/design-system/components/Button';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/design-system/components/Modal';
import { profileService } from '@/services/profileService';
import { getAvatarUrl } from '@/utils/imageUtils';
import type { ExtendedUserProfile } from '@/types';
import { Search, Users, CheckCircle, Star, MapPin } from 'lucide-react';

interface ConnectionSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayersSelected: (playerIds: string[]) => void;
  excludePlayerIds?: string[];
  maxSelections?: number;
  sportFilter?: string;
}

export const ConnectionSelector: React.FC<ConnectionSelectorProps> = ({
  isOpen,
  onClose,
  onPlayersSelected,
  excludePlayerIds = [],
  maxSelections,
  sportFilter,
}) => {
  const [connections, setConnections] = useState<ExtendedUserProfile[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadConnections();
    }
  }, [isOpen]);

  const loadConnections = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await profileService.getPlayerConnections();
      setConnections(response.connections);
    } catch (error: any) {
      console.error('Failed to load connections:', error);
      setError('Failed to load your connections. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePlayer = (playerId: string) => {
    const newSelected = new Set(selectedPlayerIds);
    
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId);
    } else {
      if (maxSelections && newSelected.size >= maxSelections) {
        return; // Don't allow more selections
      }
      newSelected.add(playerId);
    }
    
    setSelectedPlayerIds(newSelected);
  };

  const handleSelectAll = () => {
    const filteredConnections = getFilteredConnections();
    const newSelected = new Set<string>();
    
    filteredConnections.forEach(connection => {
      if (!excludePlayerIds.includes(connection.id)) {
        if (!maxSelections || newSelected.size < maxSelections) {
          newSelected.add(connection.id);
        }
      }
    });
    
    setSelectedPlayerIds(newSelected);
  };

  const handleClearAll = () => {
    setSelectedPlayerIds(new Set());
  };

  const handleConfirm = () => {
    onPlayersSelected(Array.from(selectedPlayerIds));
    handleClose();
  };

  const handleClose = () => {
    setSelectedPlayerIds(new Set());
    setSearchQuery('');
    onClose();
  };

  const getFilteredConnections = () => {
    let filtered = connections.filter(
      connection => !excludePlayerIds.includes(connection.id)
    );

    // Apply sport filter if provided
    if (sportFilter) {
      filtered = filtered.filter(connection =>
        connection.preferred_sports?.some(sport => 
          sport.toLowerCase().includes(sportFilter.toLowerCase())
        )
      );
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(connection =>
        connection.full_name.toLowerCase().includes(query) ||
        connection.bio?.toLowerCase().includes(query) ||
        connection.location?.toLowerCase().includes(query) ||
        connection.preferred_sports?.some(sport => 
          sport.toLowerCase().includes(query)
        )
      );
    }

    return filtered;
  };

  const filteredConnections = getFilteredConnections();
  const canSelectMore = !maxSelections || selectedPlayerIds.size < maxSelections;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      closeOnOverlayClick={false}
    >
      <ModalHeader>
        <ModalTitle>Select Players from Connections</ModalTitle>
        <ModalDescription>
          Choose players from your connections to add to the team.
          {maxSelections && ` You can select up to ${maxSelections} players.`}
        </ModalDescription>
      </ModalHeader>

      <div className="space-y-4">
        {/* Search and Actions Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search connections..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSelectAll}
            disabled={filteredConnections.length === 0 || !canSelectMore}
          >
            Select All
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClearAll}
            disabled={selectedPlayerIds.size === 0}
          >
            Clear
          </Button>
        </div>

        {/* Selection Counter */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">
            {selectedPlayerIds.size} player{selectedPlayerIds.size !== 1 ? 's' : ''} selected
            {maxSelections && ` (max ${maxSelections})`}
          </span>
          {sportFilter && (
            <span className="text-sm text-gray-500">
              Filtered by: {sportFilter}
            </span>
          )}
        </div>

        {/* Connections List */}
        <div className="max-h-96 overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button variant="secondary" onClick={loadConnections}>
                Try Again
              </Button>
            </div>
          ) : filteredConnections.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchQuery || sportFilter
                  ? 'No connections match your filters'
                  : 'No connections available'}
              </p>
            </div>
          ) : (
            filteredConnections.map((connection) => {
              const isSelected = selectedPlayerIds.has(connection.id);
              const isDisabled = !isSelected && !canSelectMore;

              return (
                <div
                  key={connection.id}
                  onClick={() => !isDisabled && handleTogglePlayer(connection.id)}
                  className={`
                    flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all
                    ${isSelected 
                      ? 'border-primary-500 bg-primary-50' 
                      : isDisabled
                      ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  {/* Checkbox */}
                  <div className="flex-shrink-0">
                    <div className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center
                      ${isSelected 
                        ? 'border-primary-500 bg-primary-500' 
                        : 'border-gray-300 bg-white'
                      }
                    `}>
                      {isSelected && (
                        <CheckCircle className="h-4 w-4 text-white" />
                      )}
                    </div>
                  </div>

                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {connection.profile_picture ? (
                      <img
                        src={getAvatarUrl(connection.profile_picture)!}
                        alt={connection.full_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                        <span className="text-lg font-semibold text-white">
                          {connection.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 truncate">
                        {connection.full_name}
                      </h4>
                      {connection.is_available_for_matches && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Available
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                      {connection.skill_level && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          {connection.skill_level}
                        </div>
                      )}
                      {connection.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          {connection.location}
                        </div>
                      )}
                    </div>

                    {connection.preferred_sports && connection.preferred_sports.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {connection.preferred_sports.slice(0, 3).map((sport, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {sport}
                          </span>
                        ))}
                        {connection.preferred_sports.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{connection.preferred_sports.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ModalFooter>
        <Button
          variant="secondary"
          onClick={handleClose}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={selectedPlayerIds.size === 0}
        >
          Add {selectedPlayerIds.size} Player{selectedPlayerIds.size !== 1 ? 's' : ''}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ConnectionSelector;
