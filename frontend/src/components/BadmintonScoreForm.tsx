import React, { useState, useEffect } from 'react';
import { Button } from '@/design-system/components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/components/Card';
import { toast } from 'react-hot-toast';

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
      if (!validateBWFRules(set.home_score, set.away_score)) {
        newErrors.push(`Set ${index + 1}: Invalid score according to BWF rules`);
      }
      
      if (set.duration <= 0) {
        newErrors.push(`Set ${index + 1}: Duration must be greater than 0 minutes`);
      }
    });

    // Validate match result
    if (setsData.length > 0) {
      const homeSetsWon = setsData.filter(set => {
        const maxScore = Math.max(set.home_score, set.away_score);
        return set.home_score === maxScore && set.home_score !== set.away_score;
      }).length;
      
      const awaySetsWon = setsData.filter(set => {
        const maxScore = Math.max(set.home_score, set.away_score);
        return set.away_score === maxScore && set.home_score !== set.away_score;
      }).length;

      if (setsData.length === 2) {
        // 2-0 result required
        if (!((homeSetsWon === 2 && awaySetsWon === 0) || (homeSetsWon === 0 && awaySetsWon === 2))) {
          newErrors.push('For 2-set match, one player/team must win both sets');
        }
      } else if (setsData.length === 3) {
        // 2-1 result required
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

  const matchScore = getMatchScore();
  const homeTeamName = match.tournament?.registration_type === 'TEAM' 
    ? match.team1?.name || 'Home Team'
    : match.player1?.name || 'Home Player';
  const awayTeamName = match.tournament?.registration_type === 'TEAM'
    ? match.team2?.name || 'Away Team'
    : match.player2?.name || 'Away Player';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Match Score</span>
            <div className="text-lg font-bold text-blue-600">
              {homeTeamName}: {matchScore.home} - {awayTeamName}: {matchScore.away}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
            <h4 className="text-sm font-medium text-blue-800 mb-1">BWF Scoring Rules:</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Games are played to 21 points</li>
              <li>• Must win by 2 points (e.g., 21-19, 22-20)</li>
              <li>• At 29-all, first to 30 points wins</li>
              <li>• Match is best of 3 games</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Set Scores</span>
            {!isReadOnly && (
              <div className="flex gap-2">
                {setsData.length < 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSet}
                  >
                    Add Set 3
                  </Button>
                )}
                {setsData.length > 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={removeSet}
                  >
                    Remove Set 3
                  </Button>
                )}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {setsData.map((set, index) => {
            const winner = getSetWinner(set);
            return (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Set {set.set_number}</h4>
                  {winner !== 'none' && (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      winner === 'home' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      Winner: {winner === 'home' ? homeTeamName : awayTeamName}
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {homeTeamName}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={set.home_score}
                      onChange={(e) => updateSetData(index, 'home_score', Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isReadOnly}
                    />
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-400">VS</div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {awayTeamName}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={set.away_score}
                      onChange={(e) => updateSetData(index, 'away_score', Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={set.duration}
                    onChange={(e) => updateSetData(index, 'duration', Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isReadOnly}
                  />
                </div>
                
                {!validateBWFRules(set.home_score, set.away_score) && (set.home_score > 0 || set.away_score > 0) && (
                  <div className="mt-2 text-sm text-red-600">
                    ⚠️ This score violates BWF rules
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {!isReadOnly && (
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
          >
            {isLoading ? 'Recording...' : 'Record Score'}
          </Button>
        </div>
      )}
    </form>
  );
};

export default BadmintonScoreForm;