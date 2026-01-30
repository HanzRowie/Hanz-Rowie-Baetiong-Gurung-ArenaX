import React from 'react';
import { render, screen } from '@testing-library/react';
import { MatchScorer } from '../MatchScorer';

// Mock dependencies
jest.mock('@/services/teamService', () => ({
  TeamService: {
    getMatchDetails: jest.fn(),
    recordFutsalMatchScore: jest.fn(),
    recordBadmintonMatchScore: jest.fn(),
    updateMatchScore: jest.fn(),
  }
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { role: 'ORGANIZER' }
  })
}));

jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

const mockMatch = {
  id: '1',
  tournament: {
    id: '1',
    title: 'Test Tournament',
    sport_type: 'FUTSAL' as const,
    registration_type: 'TEAM' as const
  },
  round_number: 1,
  match_number: 1,
  status: 'SCHEDULED' as const,
  team1: {
    id: '1',
    name: 'Team A'
  },
  team2: {
    id: '2',
    name: 'Team B'
  }
};

describe('MatchScorer', () => {
  it('renders match information correctly', () => {
    render(<MatchScorer match={mockMatch} />);
    
    expect(screen.getByText('Team A vs Team B')).toBeInTheDocument();
    expect(screen.getByText('Test Tournament - Round 1, Match 1')).toBeInTheDocument();
    expect(screen.getByText('SCHEDULED')).toBeInTheDocument();
    expect(screen.getByText('FUTSAL')).toBeInTheDocument();
  });

  it('shows record score button for organizers when match is not completed', () => {
    render(<MatchScorer match={mockMatch} />);
    
    expect(screen.getByText('Record Score')).toBeInTheDocument();
  });

  it('shows update score button for completed matches', () => {
    const completedMatch = {
      ...mockMatch,
      status: 'COMPLETED' as const,
      team1_score: 3,
      team2_score: 1
    };
    
    render(<MatchScorer match={completedMatch} />);
    
    expect(screen.getByText('Update Score')).toBeInTheDocument();
    expect(screen.getByText('Score: 3 - 1')).toBeInTheDocument();
  });
});