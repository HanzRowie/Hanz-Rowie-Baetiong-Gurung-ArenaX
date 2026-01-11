import { useState, useEffect, useCallback } from 'react';
import { searchService } from '@/services/searchService';
import type { SearchPreference, SearchFilters } from '@/types/search.types';

interface UseSearchPreferencesReturn {
  preferences: SearchPreference[];
  loading: boolean;
  error: string | null;
  defaultPreference: SearchPreference | null;
  savePreference: (name: string, filters: SearchFilters, isDefault?: boolean) => Promise<SearchPreference>;
  updatePreference: (id: string, updates: Partial<SearchPreference>) => Promise<SearchPreference>;
  deletePreference: (id: string) => Promise<void>;
  setDefaultPreference: (id: string) => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

export const useSearchPreferences = (): UseSearchPreferencesReturn => {
  const [preferences, setPreferences] = useState<SearchPreference[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get default preference
  const defaultPreference = preferences.find(p => p.is_default) || null;

  // Load search preferences
  const loadPreferences = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const preferencesData = await searchService.getSearchPreferences();
      setPreferences(preferencesData);
    } catch (err) {
      console.error('Failed to load search preferences:', err);
      setError('Failed to load search preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  // Save new preference
  const savePreference = useCallback(async (
    name: string, 
    filters: SearchFilters, 
    isDefault: boolean = false
  ): Promise<SearchPreference> => {
    try {
      const newPreference = await searchService.saveSearchPreference({
        name,
        filters,
        is_default: isDefault
      });

      setPreferences(prev => {
        // If this is set as default, unset all other defaults
        const updated = isDefault 
          ? prev.map(p => ({ ...p, is_default: false }))
          : prev;
        return [...updated, newPreference];
      });

      return newPreference;
    } catch (err) {
      console.error('Failed to save search preference:', err);
      setError('Failed to save search preference');
      throw err;
    }
  }, []);

  // Update existing preference
  const updatePreference = useCallback(async (
    id: string, 
    updates: Partial<SearchPreference>
  ): Promise<SearchPreference> => {
    try {
      const updatedPreference = await searchService.updateSearchPreference(id, updates);

      setPreferences(prev => prev.map(p => {
        if (p.id === id) {
          return updatedPreference;
        }
        // If this preference is being set as default, unset others
        if (updates.is_default && p.is_default) {
          return { ...p, is_default: false };
        }
        return p;
      }));

      return updatedPreference;
    } catch (err) {
      console.error('Failed to update search preference:', err);
      setError('Failed to update search preference');
      throw err;
    }
  }, []);

  // Delete preference
  const deletePreference = useCallback(async (id: string): Promise<void> => {
    try {
      await searchService.deleteSearchPreference(id);
      setPreferences(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Failed to delete search preference:', err);
      setError('Failed to delete search preference');
      throw err;
    }
  }, []);

  // Set preference as default
  const setDefaultPreference = useCallback(async (id: string): Promise<void> => {
    try {
      await searchService.updateSearchPreference(id, { is_default: true });
      
      setPreferences(prev => prev.map(p => ({
        ...p,
        is_default: p.id === id
      })));
    } catch (err) {
      console.error('Failed to set default preference:', err);
      setError('Failed to set default preference');
      throw err;
    }
  }, []);

  // Refresh preferences data
  const refreshPreferences = useCallback(async () => {
    await loadPreferences();
  }, [loadPreferences]);

  // Load initial preferences
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    loading,
    error,
    defaultPreference,
    savePreference,
    updatePreference,
    deletePreference,
    setDefaultPreference,
    refreshPreferences
  };
};

export default useSearchPreferences;