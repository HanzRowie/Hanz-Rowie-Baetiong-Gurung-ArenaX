import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Trophy, MessageSquare, ClipboardList } from 'lucide-react';
import { PlayerStatsInput, type PlayerStat } from './PlayerStatsInput';
import { MatchRemarksPanel } from './MatchRemarksPanel';
import { api } from '@/services/api';

interface Player {
  id: string;
  name: string;
  full_name: string;
}

interface Match {
  id: string;
  tournament: {
    id: string;
    title: string;
    sport_type: string;
    registration_type?: string;
    tournament_type?: string;
  };
  round_number: number;
  match_number: number;
  status: string;
  team1?: { id: string; name: string };
  team2?: { id: string; name: string };
  player1?: { id: string; name: string };
  player2?: { id: string; name: string };
  team1_score?: number;
  team2_score?: number;
  player1_score?: number;
  player2_score?: number;
  team1_members?: Player[];
  team2_members?: Player[];
  scheduled_time?: string;
  notes?: string;
}

interface BracketMatchScorerProps {
  match: Match;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isReadOnly?: boolean;
}

export const BracketMatchScorer: React.FC<BracketMatchScorerProps> = ({
  match,
  onSubmit,
  onCancel,
  isLoading = false,
  isReadOnly = false,
}) => {
  const isTeam = match.tournament.registration_type === 'TEAM' || !!(match.team1 || match.team2);
  const isFutsal = match.tournament.sport_type === 'FUTSAL';
  const isBadminton = match.tournament.sport_type === 'BADMINTON';

  const home = isTeam ? match.team1 : match.player1;
  const away = isTeam ? match.team2 : match.player2;
  const homeName = home?.name || 'Home';
  const awayName = away?.name || 'Away';

  const [homeScore, setHomeScore] = useState(
    isTeam ? (match.team1_score ?? 0) : (match.player1_score ?? 0)
  );
  const [awayScore, setAwayScore] = useState(
    isTeam ? (match.team2_score ?? 0) : (match.player2_score ?? 0)
  );
  const [homePlayerStats, setHomePlayerStats] = useState<PlayerStat[]>([]);
  const [awayPlayerStats, setAwayPlayerStats] = useState<PlayerStat[]>([]);
  const [homePlayers, setHomePlayers] = useState<Player[]>(match.team1_members || []);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>(match.team2_members || []);

  // Fetch team members if not provided in match data
  useEffect(() => {
    if (!isFutsal || !isTeam) return;
    const fetchMembers = async (teamId: string, setter: (p: Player[]) => void) => {
      try {
        const res = await api.get(`/api/teams/${teamId}/members/`);
        const membersData = res.data.data || res.data.members || (Array.isArray(res.data) ? res.data : []);
        const members = membersData.map((m: any) => ({
          id: m.player?.id || m.id,
          name: m.player?.full_name || m.full_name || m.name,
          full_name: m.player?.full_name || m.full_name || m.name,
        })).filter((p: Player) => p.id && p.name);
        if (members.length > 0) setter(members);
      } catch {
        // silently fail — user can still add stats manually
      }
    };
    if (match.team1?.id && (match.team1_members || []).length === 0) {
      fetchMembers(match.team1.id, setHomePlayers);
    }
    if (match.team2?.id && (match.team2_members || []).length === 0) {
      fetchMembers(match.team2.id, setAwayPlayers);
    }
  }, [match.team1?.id, match.team2?.id]);
  const [notes, setNotes] = useState(match.notes || '');
  const [activeTab, setActiveTab] = useState<'score' | 'remarks'>('score');
  const [errors, setErrors] = useState<string[]>([]);

  // Badminton sets
  const [sets, setSets] = useState([
    { set_number: 1, home_score: 0, away_score: 0 },
    { set_number: 2, home_score: 0, away_score: 0 },
  ]);

  useEffect(() => {
    setHomeScore(isTeam ? (match.team1_score ?? 0) : (match.player1_score ?? 0));
    setAwayScore(isTeam ? (match.team2_score ?? 0) : (match.player2_score ?? 0));
  }, [match]);

  const determineWinner = () => {
    if (isBadminton) {
      // Must use BWF-valid set wins only — raw score comparison is not enough
      const validateBWF = (home: number, away: number): boolean => {
        if (home < 0 || away < 0 || home > 30 || away > 30) return false;
        const max = Math.max(home, away);
        const min = Math.min(home, away);
        if (max >= 21 && (max - min) >= 2) return true;
        if (max === 30 && min >= 29) return true;
        return false;
      };
      const homeSets = sets.filter(s => validateBWF(s.home_score, s.away_score) && s.home_score > s.away_score).length;
      const awaySets = sets.filter(s => validateBWF(s.home_score, s.away_score) && s.away_score > s.home_score).length;
      console.log('[BracketMatchScorer] Badminton sets:', sets);
      console.log('[BracketMatchScorer] Valid sets won — home:', homeSets, 'away:', awaySets);
      if (homeSets > awaySets) return home?.id;
      if (awaySets > homeSets) return away?.id;
      return null;
    }
    if (homeScore > awayScore) return home?.id;
    if (awayScore > homeScore) return away?.id;
    return null;
  };

  const validateBWFSet = (home: number, away: number): boolean => {
    if (home < 0 || away < 0 || home > 30 || away > 30) return false;
    const max = Math.max(home, away);
    const min = Math.min(home, away);
    if (max >= 21 && (max - min) >= 2) return true;
    if (max === 30 && min >= 29) return true;
    return false;
  };

  const validate = (): boolean => {
    const errs: string[] = [];
    if (homeScore < 0 || awayScore < 0) errs.push('Scores cannot be negative');

    if (isBadminton) {
      // Validate each set individually
      sets.forEach((s, i) => {
        if (!validateBWFSet(s.home_score, s.away_score)) {
          errs.push(
            `Set ${i + 1}: Invalid score ${s.home_score}-${s.away_score}. ` +
            `A set must reach 21 with a 2-point lead (or 30-29).`
          );
        }
      });

      if (errs.length === 0) {
        const homeSets = sets.filter(s => validateBWFSet(s.home_score, s.away_score) && s.home_score > s.away_score).length;
        const awaySets = sets.filter(s => validateBWFSet(s.home_score, s.away_score) && s.away_score > s.home_score).length;
        console.log('[BracketMatchScorer] validate — homeSets:', homeSets, 'awaySets:', awaySets, 'total sets:', sets.length);

        if (sets.length === 2 && !((homeSets === 2 && awaySets === 0) || (homeSets === 0 && awaySets === 2))) {
          errs.push('With 2 sets, one side must win both (2-0). Add a 3rd set if the match went to a decider.');
        }
        if (sets.length === 3 && !((homeSets === 2 && awaySets === 1) || (homeSets === 1 && awaySets === 2))) {
          errs.push('With 3 sets, the final result must be 2-1.');
        }
        if (homeSets === 0 && awaySets === 0) {
          errs.push('No completed sets yet. Enter valid scores for at least 2 sets.');
        }
      }
    } else {
      if (isFutsal && isTeam) {
        const homeGoals = homePlayerStats.reduce((s, p) => s + p.goals, 0);
        const awayGoals = awayPlayerStats.reduce((s, p) => s + p.goals, 0);
        if (homeGoals !== homeScore) errs.push(`${homeName}: player goals (${homeGoals}) must equal team score (${homeScore})`);
        if (awayGoals !== awayScore) errs.push(`${awayName}: player goals (${awayGoals}) must equal team score (${awayScore})`);
      }
      if (!determineWinner() && homeScore === awayScore) {
        errs.push('Bracket matches cannot end in a draw — one team must have a higher score');
      }
    }

    console.log('[BracketMatchScorer] Validation errors:', errs);
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { toast.error('Please fix validation errors'); return; }

    const winnerId = determineWinner();

    if (isBadminton) {
      const homeSets = sets.filter(s => validateBWFSet(s.home_score, s.away_score) && s.home_score > s.away_score).length;
      const awaySets = sets.filter(s => validateBWFSet(s.home_score, s.away_score) && s.away_score > s.home_score).length;
      // Include full set data so the caller can route to the proper badminton endpoint
      const setsData = sets.map(s => ({
        set_number: s.set_number,
        home_score: s.home_score,
        away_score: s.away_score,
        duration: 0, // duration not captured in this scorer
      }));
      const payload = {
        _isBadminton: true,  // flag for MatchScoringInterface to route correctly
        sets_data: setsData,
        // summary scores for display fallback
        ...(isTeam
          ? { team1_score: homeSets, team2_score: awaySets, winner_id: winnerId }
          : { player1_score: homeSets, player2_score: awaySets, winner_id: winnerId }),
      };
      console.log('[BracketMatchScorer] Submitting badminton payload:', payload);
      onSubmit(payload);
      return;
    }

    const allStats = [...homePlayerStats, ...awayPlayerStats];
    const payload = isTeam
      ? { team1_score: homeScore, team2_score: awayScore, winner_id: winnerId, player_stats: allStats, notes }
      : { player1_score: homeScore, player2_score: awayScore, winner_id: winnerId, notes };

    onSubmit(payload);
  };

  const winnerName = determineWinner() === home?.id ? homeName : determineWinner() === away?.id ? awayName : null;

  return (
    <div className="flex flex-col h-[85vh] max-h-[800px]">
      {/* Header */}
      <div className="flex-none p-6 border-b border-gray-200 bg-white">
        <div className="text-sm text-gray-500 mb-1">
          {match.tournament.title} / Round {match.round_number}, Match {match.match_number}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{homeName} vs. {awayName}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isBadminton ? 'Best of 3 sets' : isFutsal ? 'Record goals and player stats' : 'Enter final score'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex-none flex border-b border-gray-200 bg-white px-6">
        <button
          onClick={() => setActiveTab('score')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'score' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Trophy className="w-4 h-4" /> Score & Stats
        </button>
        <button
          onClick={() => setActiveTab('remarks')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'remarks' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <MessageSquare className="w-4 h-4" /> Remarks & Notes
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {/* Errors always visible */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <ul className="text-sm text-red-700 space-y-1">
              {errors.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          </div>
        )}

        {activeTab === 'score' && (
          <form id="bracket-score-form" onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Score inputs */}
              {!isBadminton ? (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-base font-semibold text-gray-900 mb-5">Match Score</h3>
                  <div className="flex items-center justify-center gap-6">
                    {/* Home score */}
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <span className="text-sm font-medium text-gray-600 text-center truncate w-full text-center">{homeName}</span>
                      <div className="flex items-center gap-3">
                        <button type="button"
                          onClick={() => setHomeScore(s => Math.max(0, s - 1))}
                          disabled={isReadOnly || homeScore === 0}
                          className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                          −
                        </button>
                        <span className="text-4xl font-black text-gray-900 tabular-nums w-12 text-center">{homeScore}</span>
                        <button type="button"
                          onClick={() => setHomeScore(s => s + 1)}
                          disabled={isReadOnly}
                          className="w-9 h-9 flex items-center justify-center rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                          +
                        </button>
                      </div>
                    </div>

                    <span className="text-2xl font-light text-gray-300 flex-shrink-0">–</span>

                    {/* Away score */}
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <span className="text-sm font-medium text-gray-600 text-center truncate w-full text-center">{awayName}</span>
                      <div className="flex items-center gap-3">
                        <button type="button"
                          onClick={() => setAwayScore(s => Math.max(0, s - 1))}
                          disabled={isReadOnly || awayScore === 0}
                          className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                          −
                        </button>
                        <span className="text-4xl font-black text-gray-900 tabular-nums w-12 text-center">{awayScore}</span>
                        <button type="button"
                          onClick={() => setAwayScore(s => s + 1)}
                          disabled={isReadOnly}
                          className="w-9 h-9 flex items-center justify-center rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {winnerName && (
                    <div className="mt-5 flex items-center justify-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
                      <Trophy className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm font-semibold">Winner: {winnerName}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Badminton sets */
                <div className="space-y-4">
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Set Scores</h3>
                      {!isReadOnly && sets.length < 3 && (
                        <button type="button" onClick={() => setSets(s => [...s, { set_number: s.length + 1, home_score: 0, away_score: 0 }])}
                          className="text-sm text-purple-600 hover:text-purple-700 font-medium">+ Add 3rd Set</button>
                      )}
                    </div>
                    {sets.map((set, i) => (
                      <div key={i} className="grid grid-cols-3 gap-4 items-center mb-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">{homeName}</label>
                          <input type="number" min="0" max="30" value={set.home_score}
                            onChange={e => setSets(s => s.map((x, j) => j === i ? { ...x, home_score: parseInt(e.target.value) || 0 } : x))}
                            className="w-full text-2xl font-bold text-center p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            disabled={isReadOnly} />
                        </div>
                        <div className="text-center text-gray-400 font-light">Set {set.set_number}</div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1 text-right">{awayName}</label>
                          <input type="number" min="0" max="30" value={set.away_score}
                            onChange={e => setSets(s => s.map((x, j) => j === i ? { ...x, away_score: parseInt(e.target.value) || 0 } : x))}
                            className="w-full text-2xl font-bold text-center p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            disabled={isReadOnly} />
                        </div>
                      </div>
                    ))}
                    {winnerName && (
                      <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                        <Trophy className="w-4 h-4" />
                        <span className="text-sm font-semibold">Winner: {winnerName}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Player stats for futsal team matches */}
              {isFutsal && isTeam && (
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                    <PlayerStatsInput teamName={homeName} teamScore={homeScore}
                      availablePlayers={homePlayers} playerStats={homePlayerStats}
                      onChange={setHomePlayerStats} disabled={isReadOnly} />
                  </div>
                  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                    <PlayerStatsInput teamName={awayName} teamScore={awayScore}
                      availablePlayers={awayPlayers} playerStats={awayPlayerStats}
                      onChange={setAwayPlayerStats} disabled={isReadOnly} />
                  </div>
                </div>
              )}

              {/* Match notes */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" /> Match Notes
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Add any notes about this match..."
                  rows={3} disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
              </div>
            </div>
          </form>
        )}

        {activeTab === 'remarks' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {isTeam && match.team1 && match.team2 ? (
                <MatchRemarksPanel
                  matchId={match.id}
                  tournamentId={match.tournament.id}
                  team1={match.team1}
                  team2={match.team2}
                  team1Members={homePlayers.map(p => ({ id: p.id, name: p.full_name || p.name }))}
                  team2Members={awayPlayers.map(p => ({ id: p.id, name: p.full_name || p.name }))}
                  readOnly={isReadOnly}
                />
              ) : (
                <div className="p-8 text-center text-gray-400 text-sm">
                  Remarks are available for team matches only.
                </div>
              )}
            </div>
          )}
      </div>

      {/* Footer — only shown on score tab */}
      {!isReadOnly && activeTab === 'score' && (
        <div className="flex-none p-6 border-t border-gray-200 bg-white flex items-center justify-between">
          <button type="button" onClick={onCancel} disabled={isLoading}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit" form="bracket-score-form" disabled={isLoading}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 shadow-lg shadow-purple-500/30">
            {isLoading ? 'Submitting...' : 'Submit Result'}
          </button>
        </div>
      )}
    </div>
  );
};
