import React, { useState, useEffect } from 'react';
import {
  BookmarkIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  StarIcon,
  ClockIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { searchService } from '@/services/searchService';
import type { SearchPreference, SearchFilters, SearchHistory } from '@/types/search.types';

interface SearchPreferencesProps {
  currentFilters: SearchFilters;
  onPreferenceSelect: (preference: SearchPreference) => void;
  onClose?: () => void;
}

interface SavePreferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, isDefault: boolean) => void;
  filters: SearchFilters;
  editingPreference?: SearchPreference;
}

const SavePreferenceModal: React.FC<SavePreferenceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  filters,
  editingPreference
}) => {
  // Initialize state based on editing preference (key prop will reset component)
  const [name, setName] = useState(editingPreference?.name || '');
  const [isDefault, setIsDefault] = useState(editingPreference?.is_default || false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!name.trim()) {
      setError('Please enter a name for this search preference');
      return;
    }

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters long');
      return;
    }

    onSave(name.trim(), isDefault);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {editingPreference ? 'Edit Search Preference' : 'Save Search Preference'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preference Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Tennis tournaments in NYC"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
              Set as default search preference
            </label>
          </div>

          {/* Preview of current filters */}
          <div className="bg-gray-50 rounded-md p-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Search Criteria:</h4>
            <div className="space-y-1 text-sm text-gray-600">
              {filters.query && (
                <div>Query: <span className="font-medium">"{filters.query}"</span></div>
              )}
              {filters.category && filters.category !== 'all' && (
                <div>Category: <span className="font-medium capitalize">{filters.category}</span></div>
              )}
              {filters.location && (
                <div>Location: <span className="font-medium">{filters.location}</span></div>
              )}
              {filters.sport_type && (
                <div>Sport: <span className="font-medium">{filters.sport_type}</span></div>
              )}
              {filters.date_from && (
                <div>From: <span className="font-medium">{filters.date_from}</span></div>
              )}
              {filters.date_to && (
                <div>To: <span className="font-medium">{filters.date_to}</span></div>
              )}
              {filters.price_min !== undefined && (
                <div>Min Price: <span className="font-medium">${filters.price_min}</span></div>
              )}
              {filters.price_max !== undefined && (
                <div>Max Price: <span className="font-medium">${filters.price_max}</span></div>
              )}
              {filters.skill_level && (
                <div>Skill Level: <span className="font-medium">{filters.skill_level}</span></div>
              )}
              {filters.availability && (
                <div>Available only: <span className="font-medium">Yes</span></div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {editingPreference ? 'Update' : 'Save'} Preference
          </button>
        </div>
      </div>
    </div>
  );
};

const SearchPreferences: React.FC<SearchPreferencesProps> = ({
  currentFilters,
  onPreferenceSelect,
  onClose
}) => {
  const [preferences, setPreferences] = useState<SearchPreference[]>([]);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingPreference, setEditingPreference] = useState<SearchPreference | undefined>();
  const [activeTab, setActiveTab] = useState<'preferences' | 'history'>('preferences');

  // Load preferences and history
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [prefs, hist] = await Promise.all([
        searchService.getSearchPreferences(),
        searchService.getSearchHistory(50)
      ]);
      
      setPreferences(prefs);
      setHistory(hist);
    } catch (err) {
      console.error('Failed to load search data:', err);
      setError('Failed to load search preferences and history');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreference = async (name: string, isDefault: boolean) => {
    try {
      if (editingPreference) {
        // Update existing preference
        const updated = await searchService.updateSearchPreference(editingPreference.id, {
          name,
          filters: currentFilters,
          is_default: isDefault
        });
        
        setPreferences(prev => 
          prev.map(p => p.id === editingPreference.id ? updated : { ...p, is_default: false })
        );
      } else {
        // Create new preference
        const newPreference = await searchService.saveSearchPreference({
          name,
          filters: currentFilters,
          is_default: isDefault
        });
        
        setPreferences(prev => {
          const updated = isDefault 
            ? prev.map(p => ({ ...p, is_default: false }))
            : prev;
          return [...updated, newPreference];
        });
      }
      
      setEditingPreference(undefined);
    } catch (err) {
      console.error('Failed to save preference:', err);
      setError('Failed to save search preference');
    }
  };

  const handleDeletePreference = async (id: string) => {
    if (!confirm('Are you sure you want to delete this search preference?')) {
      return;
    }

    try {
      await searchService.deleteSearchPreference(id);
      setPreferences(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Failed to delete preference:', err);
      setError('Failed to delete search preference');
    }
  };

  const handleSetDefault = async (preference: SearchPreference) => {
    try {
      await searchService.updateSearchPreference(preference.id, {
        is_default: true
      });
      
      setPreferences(prev => 
        prev.map(p => ({ ...p, is_default: p.id === preference.id }))
      );
    } catch (err) {
      console.error('Failed to set default preference:', err);
      setError('Failed to set default preference');
    }
  };

  const handleHistoryClick = (historyItem: SearchHistory) => {
    const preference: SearchPreference = {
      id: `history_${historyItem.id}`,
      user: historyItem.user,
      name: historyItem.query || 'Recent Search',
      filters: historyItem.filters,
      is_default: false,
      created_at: historyItem.searched_at
    };
    
    onPreferenceSelect(preference);
    if (onClose) onClose();
  };

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear your search history?')) {
      return;
    }

    try {
      await searchService.clearSearchHistory();
      setHistory([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
      setError('Failed to clear search history');
    }
  };

  const formatFiltersPreview = (filters: SearchFilters): string => {
    const parts: string[] = [];
    
    if (filters.query) parts.push(`"${filters.query}"`);
    if (filters.category && filters.category !== 'all') parts.push(filters.category);
    if (filters.location) parts.push(filters.location);
    if (filters.sport_type) parts.push(filters.sport_type);
    
    return parts.join(' • ') || 'All categories';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 w-96">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 w-96 max-h-96 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Search Preferences</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              activeTab === 'preferences'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookmarkIcon className="h-4 w-4 inline mr-1" />
            Saved ({preferences.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              activeTab === 'history'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClockIcon className="h-4 w-4 inline mr-1" />
            History ({history.length})
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="max-h-64 overflow-y-auto">
          {activeTab === 'preferences' && (
            <div className="p-4 space-y-3">
              {/* Save Current Search Button */}
              <button
                onClick={() => setShowSaveModal(true)}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-dashed border-gray-300 rounded-md hover:border-gray-400 hover:bg-gray-50 text-gray-600 hover:text-gray-700"
              >
                <PlusIcon className="h-4 w-4" />
                <span className="text-sm">Save Current Search</span>
              </button>

              {/* Saved Preferences */}
              {preferences.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <BookmarkIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No saved preferences yet</p>
                </div>
              ) : (
                preferences.map(preference => (
                  <div
                    key={preference.id}
                    className="group border border-gray-200 rounded-md p-3 hover:border-gray-300 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          onPreferenceSelect(preference);
                          if (onClose) onClose();
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-900">
                            {preference.name}
                          </h4>
                          {preference.is_default && (
                            <StarIconSolid className="h-4 w-4 text-yellow-400" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatFiltersPreview(preference.filters)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(preference.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!preference.is_default && (
                          <button
                            onClick={() => handleSetDefault(preference)}
                            className="p-1 text-gray-400 hover:text-yellow-500"
                            title="Set as default"
                          >
                            <StarIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingPreference(preference);
                            setShowSaveModal(true);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-500"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePreference(preference.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="p-4 space-y-3">
              {/* Clear History Button */}
              {history.length > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={handleClearHistory}
                    className="text-xs text-gray-500 hover:text-red-600"
                  >
                    Clear History
                  </button>
                </div>
              )}

              {/* Search History */}
              {history.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <ClockIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No search history yet</p>
                </div>
              ) : (
                history.map(item => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-md p-3 hover:border-gray-300 hover:shadow-sm cursor-pointer"
                    onClick={() => handleHistoryClick(item)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {item.query || 'Browse All'}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatFiltersPreview(item.filters)}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-400">
                            {new Date(item.searched_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.results_count} results
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save Preference Modal */}
      <SavePreferenceModal
        key={editingPreference?.id || 'new'}
        isOpen={showSaveModal}
        onClose={() => {
          setShowSaveModal(false);
          setEditingPreference(undefined);
        }}
        onSave={handleSavePreference}
        filters={currentFilters}
        editingPreference={editingPreference}
      />
    </>
  );
};

export default SearchPreferences;