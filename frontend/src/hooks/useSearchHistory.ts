import { useState, useEffect, useCallback } from 'react';
import { searchService } from '@/services/searchService';
import type { SearchHistory, SearchFilters } from '@/types/search.types';

interface UseSearchHistoryReturn {
  history: SearchHistory[];
  loading: boolean;
  error: string | null;
  addToHistory: (query: string, filters: SearchFilters, resultsCount: number) => Promise<void>;
  recordClick: (historyId: string, resultType: string, resultId: string, resultTitle: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  refreshHistory: () => Promise<void>;
}

export const useSearchHistory = (limit: number = 20): UseSearchHistoryReturn => {
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load search history
  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const historyData = await searchService.getSearchHistory(limit);
      setHistory(historyData);
    } catch (err) {
      console.error('Failed to load search history:', err);
      setError('Failed to load search history');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // Add new search to history
  const addToHistory = useCallback(async (query: string, filters: SearchFilters, resultsCount: number) => {
    try {
      await searchService.recordSearch(query, filters, resultsCount);
      // Refresh history to get the latest entry
      await loadHistory();
    } catch (err) {
      console.error('Failed to add search to history:', err);
      // Don't set error state for history recording failures as it's not critical
    }
  }, [loadHistory]);

  // Record click on search result
  const recordClick = useCallback(async (
    historyId: string, 
    resultType: string, 
    resultId: string, 
    resultTitle: string
  ) => {
    try {
      await searchService.recordSearchClick(historyId, resultType, resultId, resultTitle);
      // Update the local history item with click information
      setHistory(prev => prev.map(item => 
        item.id === historyId 
          ? { 
              ...item, 
              clicked_result: { 
                type: resultType, 
                id: resultId, 
                title: resultTitle 
              } 
            }
          : item
      ));
    } catch (err) {
      console.error('Failed to record search click:', err);
      // Don't set error state for click recording failures as it's not critical
    }
  }, []);

  // Clear all search history
  const clearHistory = useCallback(async () => {
    try {
      await searchService.clearSearchHistory();
      setHistory([]);
    } catch (err) {
      console.error('Failed to clear search history:', err);
      setError('Failed to clear search history');
      throw err; // Re-throw so the UI can handle it
    }
  }, []);

  // Refresh history data
  const refreshHistory = useCallback(async () => {
    await loadHistory();
  }, [loadHistory]);

  // Load initial history
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    history,
    loading,
    error,
    addToHistory,
    recordClick,
    clearHistory,
    refreshHistory
  };
};

export default useSearchHistory;