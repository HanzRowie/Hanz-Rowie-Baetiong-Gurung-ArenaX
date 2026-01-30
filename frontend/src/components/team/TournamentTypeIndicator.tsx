import React from 'react';
import type { Tournament } from '@/types/tournament.types';

interface TournamentTypeIndicatorProps {
  tournament: Tournament;
  className?: string;
}

export const TournamentTypeIndicator: React.FC<TournamentTypeIndicatorProps> = ({
  tournament,
  className = '',
}) => {
  // Determine if tournament is team-based or individual
  // This would typically be determined by a field in the tournament data
  // For now, we'll use sport type as a heuristic
  const isTeamBased = tournament.sport_type.toUpperCase() === 'FUTSAL' || 
    (tournament.sport_type.toUpperCase() === 'BADMINTON' && tournament.title.toLowerCase().includes('doubles'));

  const getIndicatorConfig = () => {
    if (isTeamBased) {
      return {
        label: 'Team Tournament',
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
          </svg>
        ),
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        description: 'Teams compete together'
      };
    } else {
      return {
        label: 'Individual Tournament',
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        ),
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        description: 'Individual players compete'
      };
    }
  };

  const config = getIndicatorConfig();

  return (
    <div className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} ${className}`}>
      {config.icon}
      <span>{config.label}</span>
    </div>
  );
};

// Extended version with more details
export const TournamentTypeCard: React.FC<{
  tournament: Tournament;
  className?: string;
}> = ({ tournament, className = '' }) => {
  const isTeamBased = tournament.sport_type.toUpperCase() === 'FUTSAL' || 
    (tournament.sport_type.toUpperCase() === 'BADMINTON' && tournament.title.toLowerCase().includes('doubles'));

  const getPlayerRequirements = () => {
    const sport = tournament.sport_type.toUpperCase();
    
    if (isTeamBased) {
      switch (sport) {
        case 'FUTSAL':
          return '5 players + substitutes';
        case 'BADMINTON':
          return '2 players (doubles)';
        default:
          return 'Team registration required';
      }
    } else {
      return 'Individual registration';
    }
  };

  const getRegistrationMethod = () => {
    return isTeamBased ? 'Register as a team' : 'Register individually';
  };

  return (
    <div className={`p-4 border border-gray-200 rounded-lg ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <TournamentTypeIndicator tournament={tournament} />
            <span className="text-sm text-gray-500">•</span>
            <span className="text-sm text-gray-600">{tournament.sport_type}</span>
          </div>
          
          <h3 className="font-medium text-gray-900 mb-1">{tournament.title}</h3>
          
          <div className="space-y-1 text-sm text-gray-600">
            <p><span className="font-medium">Players:</span> {getPlayerRequirements()}</p>
            <p><span className="font-medium">Registration:</span> {getRegistrationMethod()}</p>
            <p><span className="font-medium">Entry Fee:</span> {tournament.entry_fee}</p>
            <p><span className="font-medium">Deadline:</span> {new Date(tournament.registration_deadline).toLocaleDateString()}</p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-sm text-gray-500">Participants</p>
          <p className="text-lg font-semibold text-gray-900">
            {tournament.registered_count}/{tournament.max_participants}
          </p>
        </div>
      </div>
      
      {tournament.description && (
        <p className="mt-3 text-sm text-gray-600 line-clamp-2">
          {tournament.description}
        </p>
      )}
    </div>
  );
};

export default TournamentTypeIndicator;