import { Trophy, Users } from 'lucide-react';

interface TournamentTypeSelectorProps {
  value: 'knockout' | 'league';
  onChange: (type: 'knockout' | 'league') => void;
  disabled?: boolean;
}

export default function TournamentTypeSelector({ value, onChange, disabled = false }: TournamentTypeSelectorProps) {
  const tournamentTypes = [
    {
      value: 'knockout' as const,
      label: 'Knockout',
      description: 'Single elimination format where losing teams are eliminated',
      icon: Trophy,
    },
    {
      value: 'league' as const,
      label: 'League',
      description: 'Round-robin format where all teams play each other',
      icon: Users,
    },
  ];

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Tournament Format <span className="text-red-500">*</span>
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tournamentTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = value === type.value;
          
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => !disabled && onChange(type.value)}
              disabled={disabled}
              className={`
                relative p-4 rounded-lg border-2 transition-all text-left
                ${isSelected
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-300 bg-white hover:border-purple-300'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-start gap-3">
                <div className={`
                  p-2 rounded-lg
                  ${isSelected ? 'bg-purple-100' : 'bg-gray-100'}
                `}>
                  <Icon className={`h-5 w-5 ${isSelected ? 'text-purple-600' : 'text-gray-600'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-semibold ${isSelected ? 'text-purple-900' : 'text-gray-900'}`}>
                      {type.label}
                    </h3>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {type.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
