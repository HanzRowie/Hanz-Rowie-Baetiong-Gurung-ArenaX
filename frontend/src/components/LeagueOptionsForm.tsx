import { Calendar, RefreshCw } from 'lucide-react';

export interface LeagueOptions {
  roundRobinType: 'single' | 'double';
  startDate?: string;
}

interface LeagueOptionsFormProps {
  options: LeagueOptions;
  onChange: (options: LeagueOptions) => void;
  disabled?: boolean;
}

export default function LeagueOptionsForm({ options, onChange, disabled = false }: LeagueOptionsFormProps) {
  const handleRoundRobinTypeChange = (type: 'single' | 'double') => {
    onChange({
      ...options,
      roundRobinType: type,
    });
  };

  const handleStartDateChange = (date: string) => {
    onChange({
      ...options,
      startDate: date,
    });
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <RefreshCw className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-medium text-gray-900">League Settings</h3>
      </div>

      {/* Round Robin Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Round Robin Format <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => !disabled && handleRoundRobinTypeChange('single')}
            disabled={disabled}
            className={`
              p-3 rounded-lg border-2 transition-all text-left
              ${options.roundRobinType === 'single'
                ? 'border-blue-500 bg-blue-100'
                : 'border-gray-300 bg-white hover:border-blue-300'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-center gap-2 mb-1">
              <h4 className={`font-semibold ${options.roundRobinType === 'single' ? 'text-blue-900' : 'text-gray-900'}`}>
                Single Round-Robin
              </h4>
              {options.roundRobinType === 'single' && (
                <div className="w-2 h-2 rounded-full bg-blue-500" />
              )}
            </div>
            <p className="text-sm text-gray-600">
              Each team plays every other team once
            </p>
          </button>

          <button
            type="button"
            onClick={() => !disabled && handleRoundRobinTypeChange('double')}
            disabled={disabled}
            className={`
              p-3 rounded-lg border-2 transition-all text-left
              ${options.roundRobinType === 'double'
                ? 'border-blue-500 bg-blue-100'
                : 'border-gray-300 bg-white hover:border-blue-300'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-center gap-2 mb-1">
              <h4 className={`font-semibold ${options.roundRobinType === 'double' ? 'text-blue-900' : 'text-gray-900'}`}>
                Double Round-Robin
              </h4>
              {options.roundRobinType === 'double' && (
                <div className="w-2 h-2 rounded-full bg-blue-500" />
              )}
            </div>
            <p className="text-sm text-gray-600">
              Each team plays every other team twice (home & away)
            </p>
          </button>
        </div>
      </div>

      {/* Start Date - Optional field for future use */}
      <div>
        <label htmlFor="league_start_date" className="block text-sm font-medium text-gray-700 mb-2">
          League Start Date (Optional)
        </label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="date"
            id="league_start_date"
            value={options.startDate || ''}
            onChange={(e) => handleStartDateChange(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            disabled={disabled}
          />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          If not specified, the tournament date will be used
        </p>
      </div>
    </div>
  );
}
