import React from 'react';
import type { PlayerStats } from './TopScorersTable';

interface TopAssistsTableProps {
  assists: PlayerStats[];
  limit?: number;
  loading?: boolean;
}

// Loading skeleton component
const TopAssistsTableSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-shadow hover:shadow-md">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="h-6 w-32 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
      </div>

      {/* Desktop skeleton */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              {['Rank', 'Player Name', 'Team', 'Assists'].map((_, i) => (
                <th key={i} className="px-6 py-3 text-left">
                  <div className="h-4 w-16 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                <td className="px-6 py-4">
                  <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile skeleton */}
      <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div>
                  <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TopAssistsTable: React.FC<TopAssistsTableProps> = ({
  assists,
  limit = 10,
  loading = false,
}) => {
  if (loading) {
    return <TopAssistsTableSkeleton />;
  }

  // Limit to top N players
  const displayedAssists = assists.slice(0, limit);

  if (!displayedAssists || displayedAssists.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Top Assists
        </h3>
        <p className="text-gray-600 text-center py-8">
          No assist data available yet. Complete matches with player statistics to see top assists.
        </p>
      </div>
    );
  }

  const getRankDisplay = (currentRank: number, index: number, assists: PlayerStats[]): string => {
    // Check if this is the first occurrence of this rank
    if (index === 0 || assists[index - 1].rank !== currentRank) {
      return currentRank.toString();
    }
    // If same rank as previous, show empty string (tied)
    return '';
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden transition-shadow hover:shadow-lg"
      role="region"
      aria-label="Top assists leaderboard"
    >
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2" id="top-assists-heading">
          <span className="text-2xl" aria-hidden="true">🤝</span>
          Top Assists
        </h3>
      </div>

      {/* Desktop view */}
      <div className="hidden md:block overflow-x-auto">
        <table 
          className="min-w-full divide-y divide-gray-200"
          aria-labelledby="top-assists-heading"
        >
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Rank
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Player Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Team
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                Assists
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayedAssists.map((player, index) => (
              <tr
                key={`${player.player_id}-${index}`}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {getRankDisplay(player.rank, index, displayedAssists)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {player.player_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {player.team_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-900">
                  {player.assists || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile view */}
      <div className="md:hidden divide-y divide-gray-200">
        {displayedAssists.map((player, index) => (
          <div
            key={`${player.player_id}-${index}`}
            className="p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                {getRankDisplay(player.rank, index, displayedAssists) && (
                  <span className="text-lg font-bold text-gray-900">
                    {player.rank}
                  </span>
                )}
                <div>
                  <div className="text-base font-semibold text-gray-900">
                    {player.player_name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {player.team_name}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {player.assists || 0}
                </div>
                <div className="text-xs text-gray-600">
                  assists
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
