import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import ActivityHistoryTimeline from '../ActivityHistoryTimeline';

// Mock the team service
vi.mock('@/services/teamService', () => ({
  TeamService: {
    getTeamActivityHistory: vi.fn(),
    searchTeamActivity: vi.fn(),
  }
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('ActivityHistoryTimeline', () => {
  it('displays loading state initially', () => {
    const queryClient = createTestQueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <ActivityHistoryTimeline teamId="test-team-id" />
      </QueryClientProvider>
    );

    // Should show loading skeletons initially
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});