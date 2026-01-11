import { QueryClient } from '@tanstack/react-query';

// Create a client with default options
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache time: How long data stays in cache after component unmounts (5 minutes)
      gcTime: 1000 * 60 * 5,
      
      // Stale time: How long data is considered fresh (1 minute)
      staleTime: 1000 * 60 * 1,
      
      // Retry failed requests 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch on window focus for important data
      refetchOnWindowFocus: true,
      
      // Don't refetch on reconnect by default (can be overridden per query)
      refetchOnReconnect: true,
      
      // Don't refetch on mount if data is fresh
      refetchOnMount: true,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Query invalidation strategies
export const queryKeys = {
  // Authentication related queries
  auth: {
    user: ['auth', 'user'] as const,
    sessions: ['auth', 'sessions'] as const,
  },
  
  // User profile related queries
  users: {
    all: ['users'] as const,
    profile: (userId?: string) => ['users', 'profile', userId] as const,
    search: (params: Record<string, any>) => ['users', 'search', params] as const,
  },
} as const;

// Helper functions for query invalidation
export const invalidateQueries = {
  // Invalidate all user-related queries after profile updates
  userProfile: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
    queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
  },
  
  // Invalidate auth queries after login/logout
  auth: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions });
  },
  
  // Invalidate search results after user updates
  userSearch: () => {
    queryClient.invalidateQueries({ queryKey: ['users', 'search'] });
  },
  
  // Clear all queries on logout
  clearAll: () => {
    queryClient.clear();
  },
};