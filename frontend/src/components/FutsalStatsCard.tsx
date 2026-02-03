import type { LucideIcon } from 'lucide-react';

interface FutsalStatsCardProps {
  statType: 'goals' | 'assists';
  value: number;
  rank: number;
  totalPlayers: number;
  icon: LucideIcon;
}

/**
 * FutsalStatsCard Component
 * 
 * Displays individual player statistics in a visually appealing card format.
 * Shows the stat value, label, rank, and an icon.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9
 */
export default function FutsalStatsCard({
  statType,
  value,
  rank,
  totalPlayers,
  icon: Icon
}: FutsalStatsCardProps) {
  // Get ordinal suffix for rank (1st, 2nd, 3rd, 4th, etc.)
  const getOrdinalSuffix = (n: number): string => {
    const j = n % 10;
    const k = n % 100;

    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  // Format rank display: "Xth out of Y players"
  const rankDisplay = `${rank}${getOrdinalSuffix(rank)} out of ${totalPlayers} players`;

  // Get color scheme based on stat type
  const colorScheme = statType === 'goals'
    ? {
      bg: 'bg-gradient-to-br from-purple-50 to-purple-100',
      border: 'border-purple-200',
      iconBg: 'bg-purple-500',
      iconColor: 'text-white',
      valueColor: 'text-purple-900',
      labelColor: 'text-purple-700',
      rankColor: 'text-purple-600'
    }
    : {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
      border: 'border-blue-200',
      iconBg: 'bg-blue-500',
      iconColor: 'text-white',
      valueColor: 'text-blue-900',
      labelColor: 'text-blue-700',
      rankColor: 'text-blue-600'
    };

  // Format label
  const label = statType === 'goals' ? 'Goals' : 'Assists';

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border-2 ${colorScheme.border} ${colorScheme.bg}
        p-6 shadow-sm hover:shadow-md transition-all duration-200
        flex flex-col items-center justify-center
      `}
      role="article"
      aria-label={`${label} statistics card`}
    >
      {/* Icon in corner */}
      <div
        className={`absolute top-4 right-4 p-2 rounded-full ${colorScheme.iconBg}`}
        aria-hidden="true"
      >
        <Icon className={`h-5 w-5 ${colorScheme.iconColor}`} />
      </div>

      {/* Stat value - large font */}
      <div
        className={`text-5xl font-bold ${colorScheme.valueColor} mb-2`}
        aria-label={`${value} ${label.toLowerCase()}`}
      >
        {value}
      </div>

      {/* Label - medium font */}
      <div className={`text-lg font-semibold ${colorScheme.labelColor} mb-3`}>
        {label}
      </div>

      {/* Rank display - smaller font */}
      <div
        className={`text-sm ${colorScheme.rankColor} text-center`}
        aria-label={`Ranked ${rankDisplay}`}
      >
        {rankDisplay}
      </div>
    </div>
  );
}
