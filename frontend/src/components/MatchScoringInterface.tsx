import React, { useState, useEffect } from 'react';
import { BracketMatchScorer } from './BracketMatchScorer';
import { tournamentService } from '@/services/tournamentService';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { toast } from 'react-hot-toast';
import {
  Zap, Trophy, Clock, Calendar,
  RefreshCw, ChevronDown, Swords, CheckCircle2,
  Circle, AlertCircle
} from 'lucide-react';

interface Match {
  id: string;
  tournament: {
    id: string;
    title: string;
    sport_type: 'FUTSAL' | 'BADMINTON';
    registration_type: 'TEAM' | 'INDIVIDUAL';
  };
  round_number: number;
  match_number: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  team1?: { id: string; name: string };
  team2?: { id: string; name: string };
  player1?: { id: string; name: string };
  player2?: { id: string; name: string };
  team1_score?: number;
  team2_score?: number;
  player1_score?: number;
  player2_score?: number;
  winning_team?: { id: string; name: string };
  winner?: { id: string; name: string };
  scheduled_time?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  notes?: string;
}

interface Tournament {
  id: string;
  title: string;
  sport_type: 'FUTSAL' | 'BADMINTON';
  tournament_type?: 'knockout' | 'league' | 'round_robin';
  registration_type: 'TEAM' | 'INDIVIDUAL';
  status: string;
}

interface MatchScoringInterfaceProps {
  tournamentId?: string;
  onMatchScored?: (match: Match) => void;
}

const STATUS_CONFIG = {
  SCHEDULED:   { label: 'Scheduled',   icon: Circle,        cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  IN_PROGRESS: { label: 'Live',        icon: Zap,           cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  COMPLETED:   { label: 'Completed',   icon: CheckCircle2,  cls: 'bg-green-50 text-green-700 border border-green-200' },
  CANCELLED:   { label: 'Cancelled',   icon: AlertCircle,   cls: 'bg-red-50 text-red-700 border border-red-200' },
} as const;

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.SCHEDULED;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function formatScheduled(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  };
}

function filterLabel(filter: 'all' | 'pending' | 'completed') {
  if (filter === 'completed') return 'Completed Matches';
  if (filter === 'pending') return 'Pending Matches';
  return 'All Matches';
}

function emptyLabel(filter: 'all' | 'pending' | 'completed') {
  if (filter === 'completed') return 'No completed matches yet';
  if (filter === 'pending') return 'No pending matches';
  return 'No matches found';
}

export const MatchScoringInterface: React.FC<MatchScoringInterfaceProps> = ({
  tournamentId,
  onMatchScored,
}) => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>(tournamentId || '');
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [liveMatchId, setLiveMatchId] = useState<string | null>(null);

  const isOrganizer = user?.role === 'ORGANIZER';

  // Track the selected tournament's metadata separately so loadMatches doesn't
  // depend on the tournaments array being populated first (fixes empty dropdown on direct URL)
  const [tournamentMeta, setTournamentMeta] = useState<Tournament | null>(null);

  useEffect(() => { if (isOrganizer) loadTournaments(); }, [isOrganizer]);

  // When selectedTournament changes, update meta from the list (or fetch it)
  useEffect(() => {
    if (!selectedTournament) return;
    const found = tournaments.find(t => t.id === selectedTournament);
    if (found) {
      setTournamentMeta(found);
    } else {
      // Fetch tournament info directly (handles direct URL navigation)
      tournamentService.getTournamentDetail(selectedTournament)
        .then((data: any) => {
          setTournamentMeta({
            id: data.id,
            title: data.title,
            sport_type: data.sport_type,
            tournament_type: data.tournament_type,
            registration_type: data.registration_type || 'INDIVIDUAL',
            status: data.status,
          });
        })
        .catch(() => {});
    }
  }, [selectedTournament, tournaments]);

  useEffect(() => { if (selectedTournament && tournamentMeta) loadMatches(); }, [selectedTournament, tournamentMeta]);

  const loadTournaments = async () => {
    try {
      const response = await tournamentService.getMyTournaments();
      const mapped: Tournament[] = (response.organized_tournaments || []).map((t: any) => ({
        id: t.id, title: t.title,
        sport_type: t.sport_type as 'FUTSAL' | 'BADMINTON',
        tournament_type: t.tournament_type,
        registration_type: t.registration_type || 'INDIVIDUAL',
        status: t.status,
      }));
      setTournaments(mapped);
      if (!selectedTournament && mapped.length > 0) setSelectedTournament(mapped[0].id);
    } catch { toast.error('Failed to load tournaments'); }
  };

  const loadMatches = async () => {
    if (!selectedTournament || !tournamentMeta) return;
    setIsLoading(true);
    try {
      let raw: any[] = [];
      if (tournamentMeta.tournament_type === 'league' || tournamentMeta.tournament_type === 'round_robin') {
        raw = (await tournamentService.getTournamentMatches(selectedTournament)).matches || [];
      } else {
        try {
          raw = (await tournamentService.getTournamentBracket(selectedTournament)).matches || [];
        } catch {
          raw = (await tournamentService.getTournamentMatches(selectedTournament)).matches || [];
        }
      }
      const tInfo = {
        id: selectedTournament,
        title: tournamentMeta.title,
        sport_type: tournamentMeta.sport_type,
        registration_type: tournamentMeta.registration_type,
      };
      // Fetch team members for each match so BracketMatchScorer has players for the dropdown
      const enriched = await Promise.all(raw.map(async (m: any) => {
        let team1_members: any[] = m.team1_members || [];
        let team2_members: any[] = m.team2_members || [];
        if (tournamentMeta.sport_type === 'FUTSAL' && tournamentMeta.registration_type === 'TEAM') {
          if (m.team1?.id && team1_members.length === 0) {
            try {
              const res = await api.get(`/api/teams/${m.team1.id}/members/`);
              team1_members = (res.data.members || res.data || []).map((mb: any) => ({
                id: mb.player?.id || mb.id,
                name: mb.player?.full_name || mb.full_name || mb.name,
                full_name: mb.player?.full_name || mb.full_name || mb.name,
              })).filter((p: any) => p.id && p.name);
            } catch {}
          }
          if (m.team2?.id && team2_members.length === 0) {
            try {
              const res = await api.get(`/api/teams/${m.team2.id}/members/`);
              team2_members = (res.data.members || res.data || []).map((mb: any) => ({
                id: mb.player?.id || mb.id,
                name: mb.player?.full_name || mb.full_name || mb.name,
                full_name: mb.player?.full_name || mb.full_name || mb.name,
              })).filter((p: any) => p.id && p.name);
            } catch {}
          }
        }
        return { ...m, tournament: tInfo, team1_members, team2_members };
      }));
      setMatches(enriched);
    } catch { toast.error('Failed to load matches'); }
    finally { setIsLoading(false); }
  };

  const handleMatchScored = (updated: Match) => {
    setMatches(prev => prev.map(m => m.id === updated.id ? updated : m));
    if (onMatchScored) onMatchScored(updated);
    if (updated.status === 'COMPLETED') setLiveMatchId(null);
    toast.success('Match score updated');
  };

  const getFiltered = () => {
    if (filter === 'pending') return matches.filter(m => m.status !== 'COMPLETED' && m.status !== 'CANCELLED');
    if (filter === 'completed') return matches.filter(m => m.status === 'COMPLETED');
    return matches;
  };

  if (!isOrganizer) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Trophy className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">Only tournament organizers can access match scoring.</p>
      </div>
    );
  }

  const selectedMatch = matches.find(m => m.id === liveMatchId);
  if (selectedMatch) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
          <BracketMatchScorer
            match={selectedMatch as any}
            onSubmit={async (payload: any) => {
              try {
                const { api: apiClient } = await import('@/services/api');
                await apiClient.put(
                  `/api/tournaments/${selectedMatch.tournament.id}/matches/${selectedMatch.id}/result/`,
                  payload
                );
                handleMatchScored({ ...selectedMatch, status: 'COMPLETED' } as any);
              } catch (err: any) {
                toast.error(err?.response?.data?.error || 'Failed to save score');
              }
            }}
            onCancel={() => { setLiveMatchId(null); loadMatches(); }}
          />
        </div>
      </div>
    );
  }

  const filtered = getFiltered();
  const selectedTournamentData = tournaments.find(t => t.id === selectedTournament);

  return (
    <div className="space-y-6">

      {/* ── Controls card ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Swords className="w-4 h-4 text-purple-600" />
            Match Scoring
          </h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tournament selector */}
            <div>
              <label htmlFor="tournament-select" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Tournament
              </label>
              <div className="relative">
                <select
                  id="tournament-select"
                  value={selectedTournament}
                  onChange={e => setSelectedTournament(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800"
                >
                  <option value="">Select a tournament…</option>
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.sport_type})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Filter selector */}
            <div>
              <label htmlFor="filter-select" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Show
              </label>
              <div className="relative">
                <select
                  id="filter-select"
                  value={filter}
                  onChange={e => setFilter(e.target.value as 'all' | 'pending' | 'completed')}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800"
                >
                  <option value="all">All Matches</option>
                  <option value="pending">Pending Matches</option>
                  <option value="completed">Completed Matches</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Match list ── */}
      {selectedTournament && (
        <div className="space-y-4">

          {/* List header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {filterLabel(filter)}
                {!isLoading && <span className="ml-2 text-sm font-normal text-gray-500">({filtered.length})</span>}
              </h3>
              {selectedTournamentData && (
                <p className="text-xs text-gray-400 mt-0.5">{selectedTournamentData.title}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Refresh */}
              <button
                onClick={loadMatches}
                disabled={isLoading}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50 transition-colors disabled:opacity-40"
                title="Refresh matches"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Loading skeleton */}
          {isLoading && (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="h-3 w-28 bg-gray-200 rounded" />
                      <div className="h-4 w-36 bg-gray-200 rounded" />
                      <div className="h-4 w-32 bg-gray-200 rounded" />
                    </div>
                    <div className="h-10 w-28 bg-gray-200 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && filtered.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 py-14 flex flex-col items-center text-center">
              <Trophy className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">
                {emptyLabel(filter)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Generate a bracket or schedule to see matches here.</p>
            </div>
          )}

          {/* Match cards */}
          {!isLoading && filtered.length > 0 && (
            <div className="space-y-3">
              {filtered.map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onScore={() => setLiveMatchId(match.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* No tournament selected */}
      {!selectedTournament && (
        <div className="bg-white rounded-xl border border-gray-200 py-14 flex flex-col items-center text-center">
          <Swords className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">Select a tournament to manage match scoring</p>
        </div>
      )}
    </div>
  );
};

/* ─── Individual match card ─────────────────────────────────── */
function MatchCard({ match, onScore }: { match: Match; onScore: () => void }) {
  const home = match.team1?.name || match.player1?.name || 'TBD';
  const away = match.team2?.name || match.player2?.name || 'TBD';
  const homeScore = match.team1_score ?? match.player1_score ?? 0;
  const awayScore = match.team2_score ?? match.player2_score ?? 0;
  const scheduled = formatScheduled(match.scheduled_time);
  const isCompleted = match.status === 'COMPLETED';
  const isLive = match.status === 'IN_PROGRESS';

  const homeWon = isCompleted && homeScore > awayScore;
  const awayWon = isCompleted && awayScore > homeScore;

  return (
    <div className={`bg-white rounded-xl border transition-shadow hover:shadow-md overflow-hidden ${
      isLive ? 'border-amber-300 shadow-amber-100 shadow-sm' : 'border-gray-200'
    }`}>
      {/* Live pulse bar */}
      {isLive && (
        <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400 animate-pulse" />
      )}

      <div className="p-5">
        <div className="flex items-center justify-between gap-4">

          {/* Left: round info + teams */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-400 font-medium">
                Round {match.round_number} · Match {match.match_number}
              </span>
              <StatusBadge status={match.status} />
            </div>

            {/* Teams vs score */}
            <div className="flex items-center gap-3">
              {/* Team names */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className={`flex items-center gap-2 ${homeWon ? 'text-gray-900' : 'text-gray-600'}`}>
                  {homeWon && <Trophy className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                  <span className={`text-sm truncate ${homeWon ? 'font-bold' : 'font-medium'}`}>{home}</span>
                </div>
                <div className={`flex items-center gap-2 ${awayWon ? 'text-gray-900' : 'text-gray-600'}`}>
                  {awayWon && <Trophy className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                  <span className={`text-sm truncate ${awayWon ? 'font-bold' : 'font-medium'}`}>{away}</span>
                </div>
              </div>

              {/* Score */}
              <div className="flex flex-col items-center gap-1 px-4">
                <span className={`text-2xl font-bold leading-none ${homeWon ? 'text-purple-600' : 'text-gray-800'}`}>
                  {homeScore}
                </span>
                <span className="text-xs text-gray-300 font-medium">vs</span>
                <span className={`text-2xl font-bold leading-none ${awayWon ? 'text-purple-600' : 'text-gray-800'}`}>
                  {awayScore}
                </span>
              </div>
            </div>

            {/* Scheduled time */}
            {scheduled && (
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar className="w-3 h-3" /> {scheduled.date}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" /> {scheduled.time}
                </span>
              </div>
            )}
          </div>

          {/* Right: action button */}
          <div className="flex-shrink-0">
            {isCompleted ? (
              <div className="flex flex-col items-center gap-1 px-4 py-2 bg-green-50 rounded-lg border border-green-100">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-xs font-semibold text-green-600">Done</span>
              </div>
            ) : !match.scheduled_time ? (
              <div className="flex flex-col items-center gap-1 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200" title="Set a date and time for this match before scoring">
                <Clock className="w-5 h-5 text-gray-300" />
                <span className="text-xs font-semibold text-gray-400">No date set</span>
              </div>
            ) : (
              <button
                onClick={onScore}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm text-white shadow-sm transition-all active:scale-95 ${
                  isLive
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-200'
                    : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-purple-200'
                }`}
              >
                <Zap className="w-4 h-4" />
                {isLive ? 'Continue' : 'Score Live'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MatchScoringInterface;
