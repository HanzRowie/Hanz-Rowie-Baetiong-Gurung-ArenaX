import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Edit2, Check, X, Trophy } from 'lucide-react';
import MatchDetailModal from './MatchDetailModal';

export interface LeagueMatch {
  id: string;
  round_number: number;
  home_team: {
    id: string;
    name: string;
  };
  away_team: {
    id: string;
    name: string;
  };
  home_score?: number;
  away_score?: number;
  scheduled_time?: string;
  venue?: string;
  match_venue?: number | null;
  match_venue_name?: string;
  match_venue_display?: string | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

interface LeagueScheduleTableProps {
  matches: LeagueMatch[];
  tournamentId?: string;
  editable?: boolean;
  onEditMatch?: (matchId: string, updates: Partial<LeagueMatch>) => void;
  onEnterScore?: (matchId: string) => void;
  loading?: boolean;
  tournamentStartDate?: string;
  isTeamTournament?: boolean;
}

// Loading skeleton component
const ScheduleTableSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-shadow hover:shadow-md">
      <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200">
        <div className="h-6 w-48 bg-gray-300 rounded animate-pulse"></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Round', 'Date/Time', 'Home Team', 'Away Team', 'Venue'].map((_, i) => (
                <th key={i} className="px-3 md:px-4 py-3 text-left">
                  <div className="h-4 w-16 bg-gray-300 rounded animate-pulse"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                <td className="px-3 md:px-4 py-3 md:py-4">
                  <div className="h-4 w-12 bg-gray-200 rounded animate-pulse"></div>
                </td>
                <td className="px-3 md:px-4 py-3 md:py-4">
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </td>
                <td className="px-3 md:px-4 py-3 md:py-4">
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                </td>
                <td className="px-3 md:px-4 py-3 md:py-4">
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                </td>
                <td className="hidden lg:table-cell px-4 py-4">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const LeagueScheduleTable: React.FC<LeagueScheduleTableProps> = ({
  matches,
  tournamentId,
  editable = false,
  onEditMatch,
  onEnterScore,
  loading = false,
  tournamentStartDate,
  isTeamTournament = true,
}) => {
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editedDate, setEditedDate] = useState<string>('');
  const [editedTime, setEditedTime] = useState<string>('');
  const [detailMatch, setDetailMatch] = useState<LeagueMatch | null>(null);

  if (loading) {
    return <ScheduleTableSkeleton />;
  }

  // Separate matches into upcoming and completed
  const upcomingMatches = matches.filter(m => m.status !== 'COMPLETED');
  const completedMatches = matches.filter(m => m.status === 'COMPLETED');

  const handleStartEdit = (match: LeagueMatch) => {
    setEditingMatchId(match.id);
    if (match.scheduled_time) {
      const date = new Date(match.scheduled_time);
      // Use local date/time so the inputs show what the user originally saved
      const localYear = date.getFullYear();
      const localMonth = String(date.getMonth() + 1).padStart(2, '0');
      const localDay = String(date.getDate()).padStart(2, '0');
      const localHours = String(date.getHours()).padStart(2, '0');
      const localMinutes = String(date.getMinutes()).padStart(2, '0');
      setEditedDate(`${localYear}-${localMonth}-${localDay}`);
      setEditedTime(`${localHours}:${localMinutes}`);
    } else {
      setEditedDate('');
      setEditedTime('');
    }
  };

  const handleSaveEdit = (matchId: string) => {
    if (onEditMatch && editedDate && editedTime) {
      const localDate = new Date(`${editedDate}T${editedTime}:00`);

      // Validate: must be after tournament start date
      if (tournamentStartDate) {
        const tournamentStart = new Date(tournamentStartDate);
        if (localDate < tournamentStart) {
          alert(`Match date must be on or after the tournament start date (${tournamentStart.toLocaleDateString()}).`);
          return;
        }
      }

      // Validate: must be after the previous match's scheduled time (same round or earlier round)
      const currentMatch = matches.find(m => m.id === matchId);
      if (currentMatch) {
        const previousMatches = matches.filter(m =>
          m.id !== matchId &&
          m.scheduled_time &&
          m.round_number <= currentMatch.round_number
        );
        const latestPrevious = previousMatches.reduce<Date | null>((latest, m) => {
          const d = new Date(m.scheduled_time!);
          return !latest || d > latest ? d : latest;
        }, null);

        if (latestPrevious && localDate < latestPrevious) {
          alert(`Match date must be after the previous match (${latestPrevious.toLocaleString()}).`);
          return;
        }
      }

      onEditMatch(matchId, { scheduled_time: localDate.toISOString() });
    }
    setEditingMatchId(null);
  };

  const handleCancelEdit = () => {
    setEditingMatchId(null);
    setEditedDate('');
    setEditedTime('');
  };

  const formatDateTime = (dateTimeString?: string) => {
    if (!dateTimeString) return 'TBD';
    const date = new Date(dateTimeString);
    return {
      date: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit'
      })
    };
  };

  const renderMatchRow = (match: LeagueMatch, isCompleted: boolean) => {
    const isEditing = editingMatchId === match.id;
    const dateTime = formatDateTime(match.scheduled_time);
    const isDateTimeTBD = dateTime === 'TBD';

    return (
      <tr key={match.id} className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${isCompleted ? 'bg-gray-50 cursor-pointer hover:bg-green-50' : ''}`}
        onClick={isCompleted ? () => setDetailMatch(match) : undefined}
        title={isCompleted ? 'Click to view match details & remarks' : undefined}
      >
        {/* Round */}
        <td className="px-3 md:px-4 py-3 md:py-4 text-xs md:text-sm font-medium text-gray-900">
          <span className="hidden md:inline">Round </span>{match.round_number}
        </td>

        {/* Date/Time */}
        <td className="px-3 md:px-4 py-3 md:py-4">
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <input
                type="date"
                value={editedDate}
                onChange={(e) => setEditedDate(e.target.value)}
                className="px-2 py-1 text-xs md:text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                aria-label="Match date"
              />
              <input
                type="time"
                value={editedTime}
                onChange={(e) => setEditedTime(e.target.value)}
                className="px-2 py-1 text-xs md:text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                aria-label="Match time"
              />
            </div>
          ) : isDateTimeTBD ? (
            <div className="text-xs md:text-sm text-gray-600">TBD</div>
          ) : (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1 text-xs md:text-sm text-gray-900">
                <Calendar className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
                <span className="truncate">{typeof dateTime !== 'string' && dateTime.date}</span>
              </div>
              <div className="flex items-center gap-1 text-xs md:text-sm text-gray-600">
                <Clock className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
                {typeof dateTime !== 'string' && dateTime.time}
              </div>
            </div>
          )}
        </td>

        {/* Home Team */}
        <td className="px-3 md:px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs md:text-sm font-medium text-gray-900 truncate">{match.home_team.name}</span>
            {isCompleted && match.home_score !== undefined && (
              <span className="ml-2 text-sm md:text-base font-bold text-gray-900 flex-shrink-0">{match.home_score}</span>
            )}
          </div>
        </td>

        {/* Away Team */}
        <td className="px-3 md:px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs md:text-sm font-medium text-gray-900 truncate">{match.away_team.name}</span>
            {isCompleted && match.away_score !== undefined && (
              <span className="ml-2 text-sm md:text-base font-bold text-gray-900 flex-shrink-0">{match.away_score}</span>
            )}
          </div>
        </td>

        {/* Venue - Hidden on mobile */}
        <td className="hidden lg:table-cell px-4 py-4">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="truncate">
              {match.match_venue_display || match.match_venue_name || match.venue || 'TBD'}
            </span>
          </div>
        </td>

        {/* Actions */}
        {editable && !isCompleted && (
          <td className="px-3 md:px-4 py-3 md:py-4">
            <div className="flex items-center gap-1 md:gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => handleSaveEdit(match.id)}
                    className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                    title="Save"
                    aria-label="Save changes"
                  >
                    <Check className="w-3 h-3 md:w-4 md:h-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Cancel"
                    aria-label="Cancel editing"
                  >
                    <X className="w-3 h-3 md:w-4 md:h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleStartEdit(match)}
                    className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                    title="Edit date/time"
                    aria-label="Edit match date and time"
                  >
                    <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                  </button>
                  {onEnterScore && (
                    <button
                      onClick={() => {
                        if (!match.scheduled_time) return;
                        onEnterScore(match.id);
                      }}
                      disabled={!match.scheduled_time}
                      className={`p-1 rounded transition-colors ${
                        match.scheduled_time
                          ? 'text-green-600 hover:bg-green-50 cursor-pointer'
                          : 'text-gray-300 cursor-not-allowed'
                      }`}
                      title={match.scheduled_time ? 'Enter score' : 'Set a date and time before scoring'}
                      aria-label={match.scheduled_time ? 'Enter match score' : 'Cannot score — no date set'}
                    >
                      <Trophy className="w-3 h-3 md:w-4 md:h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </td>
        )}
      </tr>
    );
  };

  if (matches.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center transition-shadow hover:shadow-md">
        <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Schedule Generated</h3>
        <p className="text-gray-600">Generate a schedule to see matches here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Matches */}
      {upcomingMatches.length > 0 && (
        <div 
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-shadow hover:shadow-md"
          role="region"
          aria-label="Upcoming matches schedule"
        >
          <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2" id="upcoming-matches-heading">
              <Calendar className="w-5 h-5 text-purple-600" aria-hidden="true" />
              Upcoming Matches ({upcomingMatches.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table 
              className="w-full min-w-[640px]"
              aria-labelledby="upcoming-matches-heading"
            >
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Round
                  </th>
                  <th scope="col" className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date/Time
                  </th>
                  <th scope="col" className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Home Team
                  </th>
                  <th scope="col" className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Away Team
                  </th>
                  <th scope="col" className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Venue
                  </th>
                  {editable && (
                    <th scope="col" className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {upcomingMatches.map(match => renderMatchRow(match, false))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Completed Matches */}
      {completedMatches.length > 0 && (
        <div 
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-shadow hover:shadow-md"
          role="region"
          aria-label="Completed matches results"
        >
          <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2" id="completed-matches-heading">
              <Check className="w-5 h-5 text-green-600" aria-hidden="true" />
              Completed Matches ({completedMatches.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table 
              className="w-full min-w-[640px]"
              aria-labelledby="completed-matches-heading"
            >
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Round
                  </th>
                  <th scope="col" className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date/Time
                  </th>
                  <th scope="col" className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Home Team
                  </th>
                  <th scope="col" className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Away Team
                  </th>
                  <th scope="col" className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Venue
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {completedMatches.map(match => renderMatchRow(match, true))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Match Detail Modal for completed matches */}
      {detailMatch && tournamentId && (
        <MatchDetailModal
          isOpen={!!detailMatch}
          onClose={() => setDetailMatch(null)}
          tournamentId={tournamentId}
          match={{
            id: detailMatch.id,
            round_number: detailMatch.round_number,
            status: detailMatch.status,
            scheduled_time: detailMatch.scheduled_time,
            home_team: detailMatch.home_team,
            away_team: detailMatch.away_team,
            home_score: detailMatch.home_score,
            away_score: detailMatch.away_score,
            venue: detailMatch.venue,
            match_venue_display: detailMatch.match_venue_display,
            match_venue_name: detailMatch.match_venue_name,
          }}
          isTeamTournament={isTeamTournament}
        />
      )}
    </div>
  );
};

export default LeagueScheduleTable;
