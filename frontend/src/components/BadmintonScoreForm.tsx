import React, { useState, useEffect } from 'react';
import { Button } from '@/design-system/components/Button';

interface SetData {
  set_number: number;
  home_score: number;
  away_score: number;
  duration: number;
}

interface BadmintonScoreFormProps {
  match: any;
  onSubmit: (data: { setsData: SetData[] }) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isReadOnly?: boolean;
}

export const BadmintonScoreForm: React.FC<BadmintonScoreFormProps> = ({
  match,
  onSubmit,
  onCancel,
  isLoading = false,
  isReadOnly = false
}) => {
  const [setsData, setSetsData] = useState<SetData[]>([
    { set_number: 1, home_score: 0, away_score: 0, duration: 0 },
    { set_number: 2, home_score: 0, away_score: 0, duration: 0 }
  ]);

  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    // Initialize form with existing data if match is completed
    if (match.status === 'COMPLETED' && match.sets) {
      setSetsData(match.sets.map((set: any) => ({
        set_number: set.set_number,
        home_score: set.home_score,
        away_score: set.away_score,
        duration: set.duration
      })));
    }
  }, [match]);

  const validateBWFRules = (homeScore: number, awayScore: number): boolean => {
    // BWF Rules validation
    if (homeScore < 0 || awayScore < 0) return false;
    if (homeScore > 30 || awayScore > 30) return false;

    const maxScore = Math.max(homeScore, awayScore);
    const minScore = Math.min(homeScore, awayScore);

    // Standard win: 21+ points with 2-point lead
    if (maxScore >= 21 && (maxScore - minScore) >= 2) {
      return true;
    }

    // Special case: first to 30 at 29-all or higher
    if (maxScore === 30 && minScore >= 29) {
      return true;
    }

    return false;
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    // Must have 2 or 3 sets
    if (setsData.length < 2 || setsData.length > 3) {
      newErrors.push('Badminton match must have 2 or 3 sets');
    }

    // Validate each set
    setsData.forEach((set, index) => {
      if (set.home_score < 0 || set.away_score < 0) {
        newErrors.push(`Set ${index + 1}: Scores cannot be negative`);
      }
      if (set.home_score > 30 || set.away_score > 30) {
        newErrors.push(`Set ${index + 1}: Score cannot exceed 30`);
      }
    });

    // Validate match result only if sets are complete
    if (setsData.length > 0) {
      const homeSetsWon = setsData.filter(set => set.home_score > set.away_score).length;
      const awaySetsWon = setsData.filter(set => set.away_score > set.home_score).length;
      const totalDecided = homeSetsWon + awaySetsWon;

      if (totalDecided > 0 && setsData.length === 2 && totalDecided === 2) {
        if (!((homeSetsWon === 2 && awaySetsWon === 0) || (homeSetsWon === 0 && awaySetsWon === 2))) {
          newErrors.push('For 2-set match, one player/team must win both sets');
        }
      } else if (setsData.length === 3 && totalDecided === 3) {
        if (!((homeSetsWon === 2 && awaySetsWon === 1) || (homeSetsWon === 1 && awaySetsWon === 2))) {
          newErrors.push('For 3-set match, final result must be 2-1');
        }
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit({ setsData });
  };

  const updateSetData = (setIndex: number, field: keyof SetData, value: number) => {
    setSetsData(prev => prev.map((set, index) =>
      index === setIndex ? { ...set, [field]: value } : set
    ));
  };

  const addSet = () => {
    if (setsData.length < 3) {
      setSetsData(prev => [
        ...prev,
        {
          set_number: prev.length + 1,
          home_score: 0,
          away_score: 0,
          duration: 0
        }
      ]);
    }
  };

  const removeSet = () => {
    if (setsData.length > 2) {
      setSetsData(prev => prev.slice(0, -1));
    }
  };

  const getSetWinner = (set: SetData): 'home' | 'away' | 'none' => {
    if (!validateBWFRules(set.home_score, set.away_score)) return 'none';

    if (set.home_score > set.away_score) return 'home';
    if (set.away_score > set.home_score) return 'away';
    return 'none';
  };

  const getMatchScore = () => {
    const homeSetsWon = setsData.filter(set => getSetWinner(set) === 'home').length;
    const awaySetsWon = setsData.filter(set => getSetWinner(set) === 'away').length;
    return { home: homeSetsWon, away: awaySetsWon };
  };

  const isSingles = match.tournament?.registration_type === 'INDIVIDUAL';

  // Helper to get formatted name for display
  const getParticipantName = (participant: any, type: 'home' | 'away') => {
    if (!participant) return type === 'home' ? 'Home' : 'Away';
    // For doubles, we might want to show both players if available in the team structure
    // but for now, the team name is sufficient
    return participant.name || (type === 'home' ? 'Home' : 'Away');
  };

  const homeTeamName = getParticipantName(match.tournament?.registration_type === 'TEAM' ? match.team1 : match.player1, 'home');
  const awayTeamName = getParticipantName(match.tournament?.registration_type === 'TEAM' ? match.team2 : match.player2, 'away');

  const matchScore = getMatchScore();

  return (
    <div className="flex flex-col h-[85vh] max-h-[800px]">
      {/* Fixed Header */}
      <div className="flex-none p-6 border-b border-gray-200 bg-white">
        <div className="text-sm text-gray-600 mb-1">
          <span>ArenaX</span>
          <span className="mx-2">/</span>
          <span>{match.tournament?.title || 'Badminton Tournament'}</span>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">Match #{match.match_number} Scoring</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            {homeTeamName}
            <span className="text-gray-400 text-lg">vs</span>
            {awayTeamName}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 uppercase tracking-wide">
              {isSingles ? 'Singles' : 'Doubles'}
            </span>
            <p className="text-gray-500 text-sm">
              Best of 3 Sets • {matchScore.home} - {matchScore.away}
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <form id="badminton-score-form" onSubmit={handleSubmit} className="space-y-6">
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              Current Match Status
            </h3>
            <div className="flex items-center justify-center gap-12 py-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600 mb-2">{matchScore.home}</div>
                <div className="text-sm font-medium text-gray-600">{homeTeamName}</div>
              </div>
              <div className="text-3xl font-light text-gray-300">-</div>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600 mb-2">{matchScore.away}</div>
                <div className="text-sm font-medium text-gray-600">{awayTeamName}</div>
              </div>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">BWF Scoring Rules</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-700">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                  Matches are best of 3 games
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                  Win by 2 points (e.g. 21-19, 22-20)
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                  Games played to 21 points
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                  At 29-all, first to 30 wins
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Set Scores</h3>
              {!isReadOnly && (
                <div className="flex gap-2">
                  {setsData.length < 3 && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={addSet}
                    >
                      + Add 3rd Set
                    </Button>
                  )}
                  {setsData.length > 2 && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={removeSet}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      Remove 3rd Set
                    </Button>
                  )}
                </div>
              )}
            </div>

            {setsData.map((set, index) => {
              const winner = getSetWinner(set);
              const isMatchPoint = (set.home_score >= 20 || set.away_score >= 20) && Math.abs(set.home_score - set.away_score) < 2;

              return (
                <div key={index} className={`bg-white border rounded-xl p-6 transition-all ${winner !== 'none' ? 'border-purple-200 shadow-sm' : 'border-gray-200'
                  }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                        {set.set_number}
                      </span>
                      <h4 className="font-medium text-gray-900">Set {set.set_number}</h4>
                    </div>
                    {winner !== 'none' && (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${winner === 'home'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                        }`}>
                        Winner: {winner === 'home' ? homeTeamName : awayTeamName}
                      </span>
                    )}
                    {isMatchPoint && winner === 'none' && (
                      <span className="animate-pulse px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 uppercase tracking-wide">
                        Game Point
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 truncate">
                        {homeTeamName}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={set.home_score}
                        onChange={(e) => updateSetData(index, 'home_score', Number(e.target.value) || 0)}
                        className={`w-full text-3xl font-bold text-center p-3 border rounded-lg focus:outline-none focus:ring-4 transition-all ${winner === 'home'
                          ? 'border-green-300 bg-green-50 text-green-800'
                          : 'border-gray-200 focus:border-purple-500 focus:ring-purple-500/20'
                          }`}
                        disabled={isReadOnly}
                      />
                    </div>

                    <div className="flex flex-col items-center justify-center">
                      <div className="text-gray-300 font-light text-2xl mb-2">vs</div>
                      <div className="w-full">
                        <label className="block text-xs text-center font-medium text-gray-500 mb-1">
                          Duration (min)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={set.duration}
                          onChange={(e) => updateSetData(index, 'duration', Number(e.target.value) || 0)}
                          className="w-20 mx-auto text-center text-sm py-1 border border-gray-200 rounded-md focus:outline-none focus:border-purple-500"
                          placeholder="0"
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 truncate text-right">
                        {awayTeamName}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={set.away_score}
                        onChange={(e) => updateSetData(index, 'away_score', Number(e.target.value) || 0)}
                        className={`w-full text-3xl font-bold text-center p-3 border rounded-lg focus:outline-none focus:ring-4 transition-all ${winner === 'away'
                          ? 'border-orange-300 bg-orange-50 text-orange-800'
                          : 'border-gray-200 focus:border-purple-500 focus:ring-purple-500/20'
                          }`}
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </form>
      </div>

      {/* Fixed Footer Actions */}
      {!isReadOnly && (
        <div className="flex-none p-6 border-t border-gray-200 bg-white">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="badminton-score-form"
              disabled={isLoading}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-purple-500/20 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : 'Save Match Results'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BadmintonScoreForm;