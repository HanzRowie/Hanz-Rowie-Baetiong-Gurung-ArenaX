import React from 'react';

export interface PlayerStats {
  player_id: number;
  player_name: string;
  team_name: string;
  goals?: number;
  assists?: number;
  rank: number;
}

interface TopScorersTableProps {
  scorers: PlayerStats[];
  limit?: number;
  loading?: boolean;
}

// Loading skeleton component
const TopScorersTableSkeleton: React.FC = () => {
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
              {['Rank', 'Player Name', 'Team', 'Goals'].map((_, i) => (
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

export const TopScorersTable: React.FC<TopScorersTableProps> = ({
  scorers,
  limit = 10,
  loading = false,
}) => {
  if (loading) {
    return <TopScorersTableSkeleton />;
  }

  // Limit to top N players
  const displayedScorers = scorers.slice(0, limit);

  if (!displayedScorers || displayedScorers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Top Scorers
        </h3>
        <p className="text-gray-600 text-center py-8">
          No scoring data available yet. Complete matches with player statistics to see top scorers.
        </p>
      </div>
    );
  }

  const getRankDisplay = (currentRank: number, index: number, scorers: PlayerStats[]): string => {
    // Check if this is the first occurrence of this rank
    if (index === 0 || scorers[index - 1].rank !== currentRank) {
      return currentRank.toString();
    }
    // If same rank as previous, show empty string (tied)
    return '';
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden transition-shadow hover:shadow-lg"
      role="region"
      aria-label="Top scorers leaderboard"
    >
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2" id="top-scorers-heading">
          <span className="text-2xl" aria-hidden="true">⚽</span>
          Top Scorers
        </h3>
      </div>

      {/* Desktop view */}
      <div className="hidden md:block overflow-x-auto">
        <table 
          className="min-w-full divide-y divide-gray-200"
          aria-labelledby="top-scorers-heading"
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
                Goals
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayedScorers.map((player, index) => {
              const isTopRank = player.rank === 1;
              const rankDisplay = getRankDisplay(player.rank, index, displayedScorers);
              
              return (
                <tr
                  key={`${player.player_id}-${index}`}
                  className={`transition-colors ${
                    isTopRank 
                      ? 'bg-gradient-to-r from-yellow-50 to-amber-50 hover:from-yellow-100 hover:to-amber-100' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    {rankDisplay && (
                      <div className={`flex items-center gap-2 ${
                        isTopRank ? 'text-amber-600' : 'text-gray-900'
                      }`}>
                        {isTopRank && <span className="text-2xl">🏆</span>}
                        <span className={`text-sm font-bold ${isTopRank ? 'text-lg' : ''}`}>
                          {rankDisplay}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                    isTopRank ? 'font-bold text-gray-900' : 'font-medium text-gray-900'
                  }`}>
                    {player.player_name}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                    isTopRank ? 'font-semibold text-gray-800' : 'text-gray-700'
                  }`}>
                    {player.team_name}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-center ${
                    isTopRank ? 'font-extrabold text-amber-600 text-lg' : 'font-bold text-gray-900'
                  }`}>
                    {player.goals || 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile view */}
      <div className="md:hidden divide-y divide-gray-200">
        {displayedScorers.map((player, index) => {
          const isTopRank = player.rank === 1;
          const rankDisplay = getRankDisplay(player.rank, index, displayedScorers);
          
          return (
            <div
              key={`${player.player_id}-${index}`}
              className={`p-4 ${
                isTopRank 
                  ? 'bg-gradient-to-r from-yellow-50 to-amber-50' 
                  : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  {rankDisplay && (
                    <div className={`flex items-center gap-1 ${
                      isTopRank ? 'text-amber-600' : 'text-gray-900'
                    }`}>
                      {isTopRank && <span className="text-xl">🏆</span>}
                      <span className={`font-bold ${isTopRank ? 'text-xl' : 'text-lg'}`}>
                        {player.rank}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className={`text-base ${
                      isTopRank ? 'font-bold text-gray-900' : 'font-semibold text-gray-900'
                    }`}>
                      {player.player_name}
                    </div>
                    <div className={`text-sm ${
                      isTopRank ? 'font-medium text-gray-700' : 'text-gray-600'
                    }`}>
                      {player.team_name}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${
                    isTopRank ? 'text-amber-600 text-3xl' : 'text-gray-900'
                  }`}>
                    {player.goals || 0}
                  </div>
                  <div className={`text-xs ${
                    isTopRank ? 'font-medium text-gray-700' : 'text-gray-600'
                  }`}>
                    goals
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
