import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Calendar, MapPin, Users, Trophy, DollarSign,
  Info, Award, ArrowLeft, Lock, ChevronDown, ChevronUp
} from 'lucide-react';
import { api } from '@/services/api';
import { getMediaUrl } from '@/utils/constants';
import BracketVisualization from '@/components/BracketVisualization';
import { LeagueStandingsTable } from '@/components/LeagueStandingsTable';
import LeagueScheduleTable from '@/components/LeagueScheduleTable';
import type { StandingsRow } from '@/components/LeagueStandingsTable';

function TeamRow({ team }: { team: any }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <li>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-sm font-bold flex-shrink-0">
            {team.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">{team.name}</p>
            {team.registered_by && (
              <p className="text-xs text-gray-400">Registered by {team.registered_by}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{team.player_count} players</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      {expanded && team.players?.length > 0 && (
        <ul className="bg-gray-50 border-t border-gray-100 divide-y divide-gray-100">
          {team.players.map((player: any) => (
            <li key={player.id} className="flex items-center gap-3 px-8 py-2">
              {player.profile_picture ? (
                <img src={player.profile_picture} alt={player.name} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 text-xs font-medium flex-shrink-0">
                  {player.name?.[0]?.toUpperCase()}
                </div>
              )}
              <span className="text-sm text-gray-700">{player.name}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function PublicTournamentPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [tournament, setTournament] = useState<any>(null);
  const [standings, setStandings] = useState<StandingsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'participants' | 'bracket' | 'schedule' | 'standings' | 'rules'>('overview');

  useEffect(() => {
    if (shareToken) loadTournament();
  }, [shareToken]);

  const loadTournament = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/tournaments/public/${shareToken}/`);
      setTournament(response.data);
      if (response.data.tournament_type === 'league') {
        loadStandings(response.data.id);
      }
    } catch (err: any) {
      setError(err.response?.status === 404 ? 'Tournament not found or link is invalid.' : 'Failed to load tournament.');
    } finally {
      setLoading(false);
    }
  };

  const loadStandings = async (tournamentId: string) => {
    try {
      const res = await api.get(`/api/tournaments/tournaments/${tournamentId}/standings/`);
      setStandings(res.data);
    } catch {
      setStandings([]);
    }
  };

  const isLeague = tournament?.tournament_type === 'league';
  const isKnockout = tournament?.tournament_type === 'knockout' || tournament?.tournament_type === 'SINGLE_ELIMINATION';

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'participants', label: 'Participants' },
    ...(isKnockout ? [{ id: 'bracket', label: 'Bracket' }] : []),
    ...(isLeague ? [{ id: 'schedule', label: 'Schedule' }, { id: 'standings', label: 'Standings' }] : []),
    { id: 'rules', label: 'Rules' },
  ] as const;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 p-4">
        <Trophy className="w-16 h-16 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-700">{error || 'Tournament not found'}</h2>
        <Link to="/login" className="text-purple-600 hover:underline text-sm">Sign in to explore more tournaments</Link>
      </div>
    );
  }

  const imageUrl = getMediaUrl(tournament.tournament_image);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Guest banner */}
      <div className="bg-purple-600 text-white text-center py-2 px-4 text-sm flex items-center justify-center gap-2">
        <Lock className="w-4 h-4" />
        <span>You're viewing a shared tournament. <Link to="/login" className="underline font-medium">Sign in</Link> or <Link to="/register" className="underline font-medium">create an account</Link> to register.</span>
      </div>

      {/* Header image */}
      {imageUrl && (
        <div className="w-full h-48 md:h-64 overflow-hidden">
          <img src={imageUrl} alt={tournament.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back link */}
        <Link to="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>

        {/* Title & status */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{tournament.title}</h1>
            <p className="text-gray-500 mt-1 capitalize">{tournament.sport_type} · {tournament.tournament_type}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            tournament.status === 'UPCOMING' ? 'bg-green-100 text-green-700' :
            tournament.status === 'ONGOING' ? 'bg-blue-100 text-blue-700' :
            tournament.status === 'COMPLETED' ? 'bg-gray-100 text-gray-600' :
            'bg-red-100 text-red-600'
          }`}>
            {tournament.status}
          </span>
        </div>

        {/* Key info cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col gap-1">
            <Calendar className="w-5 h-5 text-purple-500" />
            <span className="text-xs text-gray-500">Date</span>
            <span className="text-sm font-medium text-gray-800">{new Date(tournament.date).toLocaleDateString()}</span>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col gap-1">
            <MapPin className="w-5 h-5 text-purple-500" />
            <span className="text-xs text-gray-500">Venue</span>
            <span className="text-sm font-medium text-gray-800 truncate">{tournament.venue || 'TBD'}</span>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col gap-1">
            <Users className="w-5 h-5 text-purple-500" />
            <span className="text-xs text-gray-500">Participants</span>
            <span className="text-sm font-medium text-gray-800">{tournament.registered_count} / {tournament.max_participants}</span>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col gap-1">
            <DollarSign className="w-5 h-5 text-purple-500" />
            <span className="text-xs text-gray-500">Entry Fee</span>
            <span className="text-sm font-medium text-gray-800">
              {parseFloat(tournament.entry_fee) === 0 ? 'Free' : `NPR ${tournament.entry_fee}`}
            </span>
          </div>
        </div>

        {/* Prize pool */}
        {tournament.prize_pool && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Award className="w-6 h-6 text-yellow-500" />
            <div>
              <p className="text-xs text-yellow-700">Prize Pool</p>
              <p className="text-lg font-bold text-yellow-800">NPR {tournament.prize_pool}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {tournament.description && (
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><Info className="w-4 h-4" /> About</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{tournament.description}</p>
              </div>
            )}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-3">Tournament Details</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div><dt className="text-gray-500">Registration Type</dt><dd className="font-medium text-gray-800 capitalize">{tournament.registration_type}</dd></div>
                <div><dt className="text-gray-500">Registration Deadline</dt><dd className="font-medium text-gray-800">{new Date(tournament.registration_deadline).toLocaleDateString()}</dd></div>
                {tournament.start_time && <div><dt className="text-gray-500">Start Time</dt><dd className="font-medium text-gray-800">{tournament.start_time}</dd></div>}
                {tournament.venue_address && <div><dt className="text-gray-500">Address</dt><dd className="font-medium text-gray-800">{tournament.venue_address}</dd></div>}
                <div><dt className="text-gray-500">Organizer</dt><dd className="font-medium text-gray-800">{tournament.organizer?.name}</dd></div>
              </dl>
            </div>
            {/* CTA */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 text-center">
              <p className="text-purple-700 font-medium mb-3">Want to join this tournament?</p>
              <div className="flex gap-3 justify-center">
                <Link to="/register" className="px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">Create Account</Link>
                <Link to="/login" className="px-5 py-2 border border-purple-300 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-50 transition-colors">Sign In</Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {tournament.registration_type === 'TEAM' ? (
              tournament.registered_teams?.length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {tournament.registered_teams.map((team: any, i: number) => (
                    <TeamRow key={team.id || i} team={team} />
                  ))}
                </ul>
              ) : (
                <div className="p-8 text-center text-gray-400 text-sm">No teams registered yet.</div>
              )
            ) : (
              tournament.registered_players?.length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {tournament.registered_players.map((player: any, i: number) => (
                    <li key={player.id || i} className="flex items-center gap-3 px-5 py-3">
                      {player.profile_picture ? (
                        <img src={player.profile_picture} alt={player.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-sm font-medium">
                          {player.name?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm text-gray-800">{player.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-8 text-center text-gray-400 text-sm">No participants yet.</div>
              )
            )}
          </div>
        )}

        {activeTab === 'bracket' && isKnockout && (
          <div className="bg-white rounded-xl shadow-sm p-4 overflow-x-auto">
            {tournament.matches?.length > 0 ? (
              <BracketVisualization tournament={tournament} matches={tournament.matches} isOrganizer={false} />
            ) : (
              <p className="text-center text-gray-400 text-sm py-8">Bracket not generated yet.</p>
            )}
          </div>
        )}

        {activeTab === 'schedule' && isLeague && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {tournament.matches?.length > 0 ? (
              <LeagueScheduleTable matches={tournament.matches} tournamentId={tournament.id} />
            ) : (
              <p className="text-center text-gray-400 text-sm py-8">Schedule not generated yet.</p>
            )}
          </div>
        )}

        {activeTab === 'standings' && isLeague && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {standings.length > 0 ? (
              <LeagueStandingsTable standings={standings} />
            ) : (
              <p className="text-center text-gray-400 text-sm py-8">Standings not available yet.</p>
            )}
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            {tournament.rules ? (
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{tournament.rules}</p>
            ) : (
              <p className="text-gray-400 text-sm">No rules specified.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
