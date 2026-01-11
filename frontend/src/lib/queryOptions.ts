import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

// Common query options for different types of data
export const queryOptions = {
  // User profile data - should be fresh and refetch on focus
  userProfile: {
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  } as Partial<UseQueryOptions>,

  // Search results - can be stale longer, don't refetch as aggressively
  search: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  } as Partial<UseQueryOptions>,

  // Session data - should be fresh for security
  sessions: {
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  } as Partial<UseQueryOptions>,

  // Static/reference data - can be cached for a long time
  static: {
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  } as Partial<UseQueryOptions>,
};

// Common mutation options
export const mutationOptions = {
  // Profile updates - should invalidate related queries
  profileUpdate: {
    retry: 2,
    retryDelay: 1000,
  } as Partial<UseMutationOptions>,

  // Authentication mutations - critical, retry once
  auth: {
    retry: 1,
    retryDelay: 2000,
  } as Partial<UseMutationOptions>,

  // File uploads - don't retry automatically
  fileUpload: {
    retry: 0,
  } as Partial<UseMutationOptions>,
};