import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import TeamAnalyticsDashboard from '../TeamAnalyticsDashboard';
import type { Team } from '@/types/team.types';

// Mock the team service
vi.mock('@/services/teamService', () => ({
  TeamService: {
    getTeamActivityStatistics: vi.fn(),
    getTeamActivitySummary: vi.fn(),
    getTeamActivityHistory: vi.fn(),
  }
}));

// Mock chart components
vi.mock('@/components/charts', () => ({
  LineChart: ({ series }: any) => <div data-testid="line-chart">Line Chart: {series[0]?.name}</div>,
  BarChart: ({ data }: any) => <div data-testid="bar-chart">Bar Chart: {data.length} items</div>,
  PieChart: ({ data }: any) => <div data-testid="pie-chart">Pie Chart: {data.length} items</div>,
  KPIDashboard: ({ kpis }: any) => <div data-testid="kpi-dashboard">KPI Dashboard: {kpis.length} items</div>,
  ChartContainer: ({ title, children }: any) => (
    <div data-testid="chart-container">
      <h3>{title}</h3>
      {children}
    </div>
  )
}));

const mockTeam: Team = {
  id: '1',
  name: 'Test Team',
  sport_types: ['FUTSAL'],
  owner: {
    id: '1',
    full_name: 'John Doe',
    email: 'john@example.com'
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  max_size: 15,
  is_active: true,
  memberships: [],
  member_count: 5,
  is_full: false
};

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('TeamAnalyticsDashboard', () => {
  it('renders loading state initially', () => {
    const queryClient = createTestQueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <TeamAnalyticsDashboard team={mockTeam} />
      </QueryClientProvider>
    );

    // Should show loading skeletons initially
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});