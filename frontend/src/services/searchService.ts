import api from './api';
import type {
  GlobalSearchResult,
  SearchFilters,
  FilterOptions,
  AutocompleteResult,
  SearchPreference,
  SearchHistory,
  SearchAnalytics
} from '@/types/search.types';

export class SearchService {
  private static instance: SearchService;

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  // Global search across all content types
  async globalSearch(filters: SearchFilters): Promise<GlobalSearchResult> {
    const response = await api.get('/api/search/global/', {
      params: this.cleanFilters(filters)
    });
    return response.data;
  }

  // Get autocomplete suggestions
  async getAutocompleteSuggestions(query: string, category?: string): Promise<AutocompleteResult> {
    const response = await api.get('/api/search/autocomplete/', {
      params: { query, category }
    });
    return response.data;
  }

  // Get available filter options
  async getFilterOptions(category?: string): Promise<FilterOptions> {
    const response = await api.get('/api/search/filters/', {
      params: { category }
    });
    return response.data;
  }

  // Search preferences management
  async getSearchPreferences(): Promise<SearchPreference[]> {
    const response = await api.get('/api/search/preferences/');
    return response.data;
  }

  async saveSearchPreference(preference: Omit<SearchPreference, 'id' | 'user' | 'created_at'>): Promise<SearchPreference> {
    const response = await api.post('/api/search/preferences/', preference);
    return response.data;
  }

  async updateSearchPreference(id: string, preference: Partial<SearchPreference>): Promise<SearchPreference> {
    const response = await api.patch(`/api/search/preferences/${id}/`, preference);
    return response.data;
  }

  async deleteSearchPreference(id: string): Promise<void> {
    await api.delete(`/api/search/preferences/${id}/`);
  }

  // Search history management
  async getSearchHistory(limit: number = 20): Promise<SearchHistory[]> {
    const response = await api.get('/api/search/history/', {
      params: { limit }
    });
    return response.data;
  }

  async recordSearch(query: string, filters: SearchFilters, resultsCount: number): Promise<void> {
    await api.post('/api/search/history/', {
      query,
      filters: this.cleanFilters(filters),
      results_count: resultsCount
    });
  }

  async recordSearchClick(historyId: string, resultType: string, resultId: string, resultTitle: string): Promise<void> {
    await api.post(`/api/search/history/${historyId}/click/`, {
      type: resultType,
      id: resultId,
      title: resultTitle
    });
  }

  async clearSearchHistory(): Promise<void> {
    await api.delete('/api/search/history/');
  }

  // Search analytics (for admin/insights)
  async getSearchAnalytics(dateFrom?: string, dateTo?: string): Promise<SearchAnalytics> {
    const response = await api.get('/api/search/analytics/', {
      params: { date_from: dateFrom, date_to: dateTo }
    });
    return response.data;
  }

  // Helper method to clean filters (remove empty values)
  private cleanFilters(filters: SearchFilters): Record<string, any> {
    const cleaned: Record<string, any> = {};
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value) && value.length > 0) {
          cleaned[key] = value;
        } else if (!Array.isArray(value)) {
          cleaned[key] = value;
        }
      }
    });
    
    return cleaned;
  }

  // Local storage helpers for client-side caching
  private getCachedResults(cacheKey: string): GlobalSearchResult | null {
    try {
      const cached = localStorage.getItem(`search_cache_${cacheKey}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Cache expires after 5 minutes
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          return data;
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve cached search results:', error);
    }
    return null;
  }

  private setCachedResults(cacheKey: string, data: GlobalSearchResult): void {
    try {
      localStorage.setItem(`search_cache_${cacheKey}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to cache search results:', error);
    }
  }

  // Generate cache key from filters
  private generateCacheKey(filters: SearchFilters): string {
    return btoa(JSON.stringify(this.cleanFilters(filters))).replace(/[^a-zA-Z0-9]/g, '');
  }

  // Enhanced search with caching
  async searchWithCache(filters: SearchFilters, useCache: boolean = true): Promise<GlobalSearchResult> {
    const cacheKey = this.generateCacheKey(filters);
    
    if (useCache) {
      const cached = this.getCachedResults(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    const results = await this.globalSearch(filters);
    
    if (useCache) {
      this.setCachedResults(cacheKey, results);
    }
    
    return results;
  }
}

// Export singleton instance
export const searchService = SearchService.getInstance();
export default searchService;