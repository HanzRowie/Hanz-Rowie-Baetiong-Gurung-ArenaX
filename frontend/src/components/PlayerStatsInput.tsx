import React from 'react';
import { Plus, Trash2, Minus } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  full_name: string;
}

export interface PlayerStat {
  player_id: string;
  player_name: string;
  goals: number;
  assists: number;
}

interface PlayerStatsInputProps {
  teamName: string;
  teamScore: number;
  availablePlayers: Player[];
  playerStats: PlayerStat[];
  onChange: (stats: PlayerStat[]) => void;
  disabled?: boolean;
}

export const PlayerStatsInput: React.FC<PlayerStatsInputProps> = ({
  teamName,
  teamScore,
  availablePlayers,
  playerStats,
  onChange,
  disabled = false,
}) => {
  const totalGoals = playerStats.reduce((sum, stat) => sum + stat.goals, 0);
  const goalsMatch = totalGoals === teamScore;

  const addPlayerStat = () => {
    onChange([...playerStats, { player_id: '', player_name: '', goals: 0, assists: 0 }]);
  };

  const removePlayerStat = (index: number) => {
    onChange(playerStats.filter((_, i) => i !== index));
  };

  const updatePlayerStat = (index: number, field: keyof PlayerStat, value: string | number) => {
    const updated = playerStats.map((stat, i) => {
      if (i !== index) return stat;
      const updatedStat = { ...stat, [field]: value };
      if (field === 'player_id' && value) {
        const player = availablePlayers.find(p => p.id === value);
        if (player) updatedStat.player_name = player.full_name || player.name;
      }
      return updatedStat;
    });
    onChange(updated);
  };

  const increment = (index: number, field: 'goals' | 'assists') => {
    const max = field === 'goals' ? 20 : 20;
    const current = playerStats[index][field];
    if (current < max) updatePlayerStat(index, field, current + 1);
  };

  const decrement = (index: number, field: 'goals' | 'assists') => {
    const current = playerStats[index][field];
    if (current > 0) updatePlayerStat(index, field, current - 1);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-base font-semibold text-gray-900">{teamName}</h4>
          <p className="text-xs text-gray-500 mt-0.5">
            Goals entered:{' '}
            <span className={`font-semibold ${goalsMatch ? 'text-green-600' : 'text-amber-600'}`}>
              {totalGoals} / {teamScore}
            </span>
            {!goalsMatch && teamScore > 0 && (
              <span className="ml-1 text-amber-600">— add {teamScore - totalGoals} more</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={addPlayerStat}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Player
        </button>
      </div>

      {/* No players warning */}
      {availablePlayers.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-xs text-yellow-800">
            ⚠️ No players found for this team. Make sure the team has registered members.
          </p>
        </div>
      )}

      {/* Column headers — only show when there are rows */}
      {playerStats.length > 0 && (
        <div className="grid grid-cols-12 gap-2 px-1">
          <div className="col-span-5 text-xs font-medium text-gray-500 uppercase tracking-wide">Player</div>
          <div className="col-span-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-center">Goals</div>
          <div className="col-span-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-center">Assists</div>
          <div className="col-span-1" />
        </div>
      )}

      {/* Player rows */}
      <div className="space-y-2">
        {playerStats.map((stat, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
            {/* Player dropdown */}
            <div className="col-span-5">
              <select
                value={stat.player_id}
                onChange={(e) => updatePlayerStat(index, 'player_id', e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white truncate"
                disabled={disabled}
              >
                <option value="">Select…</option>
                {availablePlayers.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.full_name || player.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Goals stepper */}
            <div className="col-span-3 flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => decrement(index, 'goals')}
                disabled={disabled || stat.goals === 0}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-6 text-center text-sm font-semibold text-gray-900 tabular-nums">
                {stat.goals}
              </span>
              <button
                type="button"
                onClick={() => increment(index, 'goals')}
                disabled={disabled || stat.goals >= 20}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            {/* Assists stepper */}
            <div className="col-span-3 flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => decrement(index, 'assists')}
                disabled={disabled || stat.assists === 0}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-6 text-center text-sm font-semibold text-gray-900 tabular-nums">
                {stat.assists}
              </span>
              <button
                type="button"
                onClick={() => increment(index, 'assists')}
                disabled={disabled || stat.assists >= 20}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            {/* Delete */}
            <div className="col-span-1 flex justify-center">
              <button
                type="button"
                onClick={() => removePlayerStat(index)}
                disabled={disabled}
                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Remove player"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {playerStats.length === 0 && (
          <button
            type="button"
            onClick={addPlayerStat}
            disabled={disabled}
            className="w-full py-6 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-purple-300 hover:text-purple-500 hover:bg-purple-50 transition-colors disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:text-gray-400 disabled:hover:bg-transparent"
          >
            <Plus className="h-5 w-5 mx-auto mb-1" />
            <p className="text-sm">Add player stats for {teamName}</p>
          </button>
        )}
      </div>
    </div>
  );
};

export default PlayerStatsInput;
