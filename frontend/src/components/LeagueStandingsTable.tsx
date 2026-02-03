import React from 'react';

export interface StandingsRow {
  position: number;
  team_name: string;
  team_id: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
}

interface LeagueStandingsTableProps {
  standings: StandingsRow[];
  highlightTopN?: number;
  loading?: boolean;
}

// Loading skeleton component
const StandingsTableSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="h-6 w-48 bg-gray-300 rounded animate-pulse"></div>
      </div>
      
      {/* Desktop skeleton */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Pos', 'Team', 'P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts'].map((_, i) => (
                <th key={i} className="px-6 py-3 text-left">
                  <div className="h-4 w-8 bg-gray-300 rounded animate-pulse"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((j) => (
                  <td key={j} className="px-6 py-4">
                    <div className={`h-4 ${j === 2 ? 'w-32' : 'w-8'} bg-gray-200 rounded animate-pulse`}></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile skeleton */}
      <div className="md:hidden divide-y divide-gray-200">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-6 w-8 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="text-center">
                  <div className="h-4 w-8 mx-auto bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const LeagueStandingsTable: React.FC<LeagueStandingsTableProps> = ({
  standings,
  highlightTopN = 3,
  loading = false,
}) => {
  if (loading) {
    return <StandingsTableSkeleton />;
  }

  if (!standings || standings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          League Standings
        </h3>
        <p className="text-gray-500 text-center py-8">
          No standings data available yet. Complete matches to see standings.
        </p>
      </div>
    );
  }

  const getPositionColor = (position: number): string => {
    if (position <= highlightTopN) {
      if (position === 1) {
        return 'bg-yellow-50 border-l-4 border-yellow-500';
      } else if (position === 2) {
        return 'bg-gray-50 border-l-4 border-gray-400';
      } else if (position === 3) {
        return 'bg-orange-50 border-l-4 border-orange-500';
      }
    }
    return '';
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-shadow hover:shadow-md"
      role="region"
      aria-label="League standings table"
    >
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <h3 className="text-lg font-semibold text-gray-900" id="standings-heading">
          League Standings
        </h3>
      </div>

      {/* Desktop view */}
      <div className="hidden md:block overflow-x-auto">
        <table 
          className="min-w-full divide-y divide-gray-200"
          aria-labelledby="standings-heading"
        >
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pos
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Team
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <abbr title="Played">P</abbr>
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <abbr title="Won">W</abbr>
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <abbr title="Drawn">D</abbr>
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <abbr title="Lost">L</abbr>
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <abbr title="Goals For">GF</abbr>
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <abbr title="Goals Against">GA</abbr>
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <abbr title="Goal Difference">GD</abbr>
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <abbr title="Points">Pts</abbr>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {standings.map((row) => (
              <tr
                key={row.team_id}
                className={`${getPositionColor(row.position)} hover:bg-gray-50 transition-colors`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {row.position}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {row.team_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                  {row.played}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                  {row.won}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                  {row.drawn}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                  {row.lost}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                  {row.goals_for}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                  {row.goals_against}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-gray-900">
                  {row.goal_difference > 0 ? '+' : ''}
                  {row.goal_difference}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-900">
                  {row.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile view */}
      <div className="md:hidden divide-y divide-gray-200">
        {standings.map((row) => (
          <div
            key={row.team_id}
            className={`p-4 ${getPositionColor(row.position)}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span className="text-lg font-bold text-gray-900">
                  {row.position}
                </span>
                <span className="text-base font-semibold text-gray-900">
                  {row.team_name}
                </span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                {row.points}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2 text-center text-sm">
              <div>
                <div className="text-gray-500 text-xs">P</div>
                <div className="font-medium text-gray-900">{row.played}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">W</div>
                <div className="font-medium text-gray-900">{row.won}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">D</div>
                <div className="font-medium text-gray-900">{row.drawn}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">L</div>
                <div className="font-medium text-gray-900">{row.lost}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">GD</div>
                <div className="font-medium text-gray-900">
                  {row.goal_difference > 0 ? '+' : ''}
                  {row.goal_difference}
                </div>
              </div>
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-600">
              <span>GF: {row.goals_for}</span>
              <span>GA: {row.goals_against}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      {highlightTopN > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-wrap gap-4 text-xs text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>1st Place</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-400 rounded"></div>
              <span>2nd Place</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span>3rd Place</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
