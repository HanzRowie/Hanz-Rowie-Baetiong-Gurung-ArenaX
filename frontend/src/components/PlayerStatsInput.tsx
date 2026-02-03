import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';

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
  disabled = false
}) => {
  const [validationError, setValidationError] = useState<string>('');

  // Calculate running total of goals
  const totalGoals = playerStats.reduce((sum, stat) => sum + stat.goals, 0);

  // Validate goals match team score
  useEffect(() => {
    if (totalGoals !== teamScore) {
      setValidationError(`Total goals (${totalGoals}) must equal team score (${teamScore})`);
    } else {
      setValidationError('');
    }
  }, [totalGoals, teamScore]);

  const addPlayerStat = () => {
    const newStat: PlayerStat = {
      player_id: '',
      player_name: '',
      goals: 0,
      assists: 0
    };
    onChange([...playerStats, newStat]);
  };

  const removePlayerStat = (index: number) => {
    const updated = playerStats.filter((_, i) => i !== index);
    onChange(updated);
  };

  const updatePlayerStat = (index: number, field: keyof PlayerStat, value: string | number) => {
    const updated = playerStats.map((stat, i) => {
      if (i === index) {
        const updatedStat = { ...stat, [field]: value };
        
        // Auto-fill player name when player is selected
        if (field === 'player_id' && value) {
          const player = availablePlayers.find(p => p.id === value);
          if (player) {
            updatedStat.player_name = player.full_name || player.name;
          }
        }
        
        return updatedStat;
      }
      return stat;
    });
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">{teamName} Player Statistics</h4>
          <p className="text-sm text-gray-600">
            Running total: <span className={`font-semibold ${totalGoals === teamScore ? 'text-green-600' : 'text-red-600'}`}>
              {totalGoals} / {teamScore} goals
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={addPlayerStat}
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          Add Player
        </button>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">⚠️ {validationError}</p>
        </div>
      )}

      {/* No players warning */}
      {availablePlayers.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            ⚠️ No players found for this team. Make sure the team has registered members.
          </p>
        </div>
      )}

      {/* Player Stats List */}
      <div className="space-y-3">
        {playerStats.map((stat, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="grid grid-cols-12 gap-3 items-start">
              {/* Player Selection */}
              <div className="col-span-5">
                <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-1">
                  Player
                </label>
                <select
                  value={stat.player_id}
                  onChange={(e) => updatePlayerStat(index, 'player_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={disabled}
                >
                  <option value="">Select player</option>
                  {availablePlayers.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.full_name || player.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Goals */}
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-1">
                  Goals
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={stat.goals}
                  onChange={(e) => updatePlayerStat(index, 'goals', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={disabled}
                />
              </div>

              {/* Assists */}
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-1">
                  Assists
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={stat.assists}
                  onChange={(e) => updatePlayerStat(index, 'assists', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={disabled}
                />
              </div>

              {/* Delete Button */}
              <div className="col-span-1 flex items-end justify-center">
                <button
                  type="button"
                  onClick={() => removePlayerStat(index)}
                  disabled={disabled}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Remove player"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {playerStats.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-sm">Add player statistics for {teamName}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerStatsInput;
