import { useState, useEffect } from 'react';
import { Target, Hand } from 'lucide-react';
import FutsalStatsCard from './FutsalStatsCard';
import { tournamentService } from '@/services/tournamentService';
import toastService from '@/services/toastService';

interface PlayerStatsDashboardProps {
  playerId?: string;
  tournamentId?: string; // Optional: filter by tournament
}

interface PlayerStats {
  player_id: string;
  player_name: string;
  team_name: string;
  goals: number;
  assists: number;
  rank: number;
  rank_display: string;
  total_players: number;
}

/**
 * PlayerStatsDashboard Component
 * 
 * Fetches and displays player statistics in a grid of FutsalStatsCard components.
 * Shows goals and assists with rankings.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.7, 6.8
 */
export default function PlayerStatsDashboard({
  playerId,
  tournamentId
}: PlayerStatsDashboardProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlayerStats();
  }, [playerId, tournamentId]);

  const loadPlayerStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch player statistics from API
      const response = await tournamentService.getMyPlayerStats(tournamentId);
      
      setStats(response);
    } catch (err: any) {
      console.error('Failed to load player statistics:', err);
      setError(err.message || 'Failed to load statistics');
      
      // Don't show error toast for 404 or no data scenarios
      if (err.response?.status !== 404) {
        toastService.error('Failed to load player statistics');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Loading skeletons */}
        {[1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse bg-gray-100 rounded-xl border-2 border-gray-200 p-6 h-48"
          >
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="h-12 w-24 bg-gray-300 rounded"></div>
              <div className="h-6 w-32 bg-gray-300 rounded"></div>
              <div className="h-4 w-40 bg-gray-300 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-800 text-sm">
          {error || 'No statistics available yet. Play in league tournaments to see your stats!'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Optional tournament filter info */}
      {tournamentId && (
        <div className="text-sm text-gray-600">
          Showing statistics for selected tournament
        </div>
      )}

      {/* Stats Grid - side-by-side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Goals Card */}
        <FutsalStatsCard
          statType="goals"
          value={stats.goals}
          rank={stats.rank}
          totalPlayers={stats.total_players}
          icon={Target}
        />

        {/* Assists Card */}
        <FutsalStatsCard
          statType="assists"
          value={stats.assists}
          rank={stats.rank}
          totalPlayers={stats.total_players}
          icon={Hand}
        />
      </div>

      {/* Additional info */}
      {stats.team_name && (
        <div className="text-center text-sm text-gray-600">
          Playing for <span className="font-semibold">{stats.team_name}</span>
        </div>
      )}
    </div>
  );
}
