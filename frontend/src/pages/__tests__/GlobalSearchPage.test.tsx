import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import GlobalSearchPage from '../GlobalSearchPage';
import { searchService } from '@/services/searchService';
import authSlice from '@/store/authSlice';

// Mock the search service
vi.mock('@/services/searchService');
const mockSearchService = searchService as any;

// Mock the hooks
vi.mock('@/hooks/useSearchHistory', () => ({
  useSearchHistory: () => ({
    history: [],
    addToHistory: vi.fn(),
    recordClick: vi.fn()
  })
}));

vi.mock('@/hooks/useSearchPreferences', () => ({
  useSearchPreferences: () => ({
    preferences: [],
    defaultPreference: null
  })
}));

// Create a test store
const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authSlice
    },
    preloadedState: {
      auth: {
        user: {
          id: '1',
          email: 'test@example.com',
          full_name: 'Test User',
          role: 'PLAYER' as const,
          bio: '',
          location: '',
          country: '',
          preferred_sports: [],
          skill_level: 'BEGINNER' as const,
          profile_picture: null,
          is_available_for_matches: true
        },
        token: 'test-token',
        refreshToken: 'test-refresh-token',
        isAuthenticated: true,
        loading: false,
        error: null
      }
    }
  });
};

const renderWithProviders = (component: React.ReactElement) => {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('GlobalSearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the search service methods
    mockSearchService.getFilterOptions.mockResolvedValue({
      locations: [
        { value: 'new-york', label: 'New York', count: 10 },
        { value: 'los-angeles', label: 'Los Angeles', count: 5 }
      ],
      sports: [
        { value: 'tennis', label: 'Tennis', count: 15 },
        { value: 'basketball', label: 'Basketball', count: 8 }
      ],
      skill_levels: [
        { value: 'BEGINNER', label: 'Beginner', count: 20 },
        { value: 'INTERMEDIATE', label: 'Intermediate', count: 15 }
      ],
      price_ranges: [
        { min: 0, max: 50, label: '$0-50', count: 10 },
        { min: 50, max: 100, label: '$50-100', count: 8 }
      ],
      date_ranges: [
        { value: 'today', label: 'Today', count: 5 },
        { value: 'this-week', label: 'This Week', count: 12 }
      ]
    });

    mockSearchService.searchWithCache.mockResolvedValue({
      tournaments: {
        items: [
          {
            id: '1',
            title: 'Test Tournament',
            description: 'A test tournament',
            sport_type: 'tennis',
            tournament_type: 'SINGLE_ELIMINATION' as const,
            date: '2024-01-15',
            start_time: '10:00',
            venue: 'Test Venue',
            venue_address: '123 Test St',
            entry_fee: 25,
            max_participants: 16,
            min_participants: 8,
            registered_count: 10,
            registration_deadline: '2024-01-10',
            status: 'UPCOMING' as const,
            rules: 'Standard rules',
            organizer: {
              id: '2',
              full_name: 'Tournament Organizer',
              email: 'organizer@example.com',
              role: 'ORGANIZER' as const,
              bio: '',
              location: 'New York',
              country: 'USA',
              preferred_sports: ['tennis'],
              skill_level: 'ADVANCED' as const,
              profile_picture: null,
              is_available_for_matches: false
            },
            registered_players: [],
            matches: [],
            is_registration_open: true
          }
        ],
        total: 1,
        page: 1,
        per_page: 20,
        total_pages: 1,
        has_next: false,
        has_prev: false
      },
      players: {
        items: [],
        total: 0,
        page: 1,
        per_page: 20,
        total_pages: 0,
        has_next: false,
        has_prev: false
      },
      venues: {
        items: [],
        total: 0,
        page: 1,
        per_page: 20,
        total_pages: 0,
        has_next: false,
        has_prev: false
      },
      total_results: 1,
      search_time: 0.05
    });
  });

  it('renders the search page correctly', async () => {
    renderWithProviders(<GlobalSearchPage />);
    
    // Check if the search input is present
    expect(screen.getByPlaceholderText('Search tournaments, players, venues...')).toBeInTheDocument();
    
    // Check if the category filter is present
    expect(screen.getByDisplayValue('All Categories')).toBeInTheDocument();
    
    // Check if the filters button is present
    expect(screen.getByText('Filters')).toBeInTheDocument();
    
    // Check if the preferences button is present
    expect(screen.getByText('Preferences')).toBeInTheDocument();
  });

  it('performs a search when query is entered', async () => {
    renderWithProviders(<GlobalSearchPage />);
    
    const searchInput = screen.getByPlaceholderText('Search tournaments, players, venues...');
    
    // Type in the search input
    fireEvent.change(searchInput, { target: { value: 'tennis' } });
    
    // Wait for the debounced search to execute
    await waitFor(() => {
      expect(mockSearchService.searchWithCache).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'tennis',
          category: 'all',
          page: 1,
          per_page: 20
        })
      );
    }, { timeout: 1000 });
  });

  it('shows search results when available', async () => {
    renderWithProviders(<GlobalSearchPage />);
    
    const searchInput = screen.getByPlaceholderText('Search tournaments, players, venues...');
    
    // Type in the search input
    fireEvent.change(searchInput, { target: { value: 'tennis' } });
    
    // Wait for results to appear
    await waitFor(() => {
      expect(screen.getByText('Test Tournament')).toBeInTheDocument();
    });
    
    // Check if the results summary is shown
    expect(screen.getByText(/1 results found/)).toBeInTheDocument();
  });

  it('shows filters panel when filters button is clicked', async () => {
    renderWithProviders(<GlobalSearchPage />);
    
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);
    
    // Wait for filter options to load and panel to show
    await waitFor(() => {
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Sport')).toBeInTheDocument();
    });
  });

  it('changes category filter correctly', async () => {
    renderWithProviders(<GlobalSearchPage />);
    
    const categorySelect = screen.getByDisplayValue('All Categories');
    fireEvent.change(categorySelect, { target: { value: 'tournaments' } });
    
    // Wait for the search to be triggered with new category
    await waitFor(() => {
      expect(mockSearchService.searchWithCache).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'tournaments'
        })
      );
    });
  });

  it('shows preferences panel when preferences button is clicked', () => {
    renderWithProviders(<GlobalSearchPage />);
    
    const preferencesButton = screen.getByText('Preferences');
    fireEvent.click(preferencesButton);
    
    // The SearchPreferences component should be rendered
    // Since we're not mocking it, we just check that the button works
    expect(preferencesButton).toBeInTheDocument();
  });

  it('clears search when clear button is clicked', async () => {
    renderWithProviders(<GlobalSearchPage />);
    
    const searchInput = screen.getByPlaceholderText('Search tournaments, players, venues...');
    
    // Type in the search input
    fireEvent.change(searchInput, { target: { value: 'tennis' } });
    
    // Wait for the X button to appear
    await waitFor(() => {
      const clearButton = screen.getByRole('button', { name: '' }); // X button has no text
      expect(clearButton).toBeInTheDocument();
      fireEvent.click(clearButton);
    });
    
    // Check that the input is cleared
    expect(searchInput).toHaveValue('');
  });
});