import { useQueryClient as useTanstackQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateQueries } from '../lib/queryClient';

/**
 * Custom hook that provides access to the query client and common invalidation functions
 */
export const useQueryClient = () => {
  const queryClient = useTanstackQueryClient();

  return {
    queryClient,
    queryKeys,
    invalidateQueries,
    
    // Convenience methods for common operations
    invalidateUserProfile: invalidateQueries.userProfile,
    invalidateAuth: invalidateQueries.auth,
    invalidateUserSearch: invalidateQueries.userSearch,
    clearAllQueries: invalidateQueries.clearAll,
  };
};