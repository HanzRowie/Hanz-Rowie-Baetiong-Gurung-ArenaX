import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, AlertTriangle, Flag, FileText, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '@/services/api';

interface Team {
  id: string;
  name: string;
}

interface Remark {
  id: string;
  remark_type: string;
  remark_type_display: string;
  severity: string;
  severity_display: string;
  team: string | null;
  team_name: string | null;
  player_name: string;
  minute: number | null;
  title: string;
  description: string;
  created_by_name: string;
  created_at: string;
}

interface RemarkOption {
  value: string;
  label: string;
}

interface RemarkCounts {
  total: number;
  penalties: number;
  yellow_cards: number;
  red_cards: number;
}

interface MatchRemarksPanelProps {
  tournamentId: string;
  matchId: string;
  team1: Team;
  team2: Team;
  readOnly?: boolean;
}

const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'bg-blue-100 text-blue-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-red-100 text-red-700',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  PENALTY: <Flag size={14} />,
  YELLOW_CARD: <span className="inline-block w-3 h-4 bg-yellow-400 rounded-sm" />,
  RED_CARD: <span className="inline-block w-3 h-4 bg-red-500 rounded-sm" />,
  FOUL: <AlertTriangle size={14} />,
  CUSTOM: <FileText size={14} />,
};

const emptyForm = {
  remark_type: 'CUSTOM',
  severity: 'LOW',
  team: '',
  player_name: '',
  minute: '',
  title: '',
  description: '',
};

export const MatchRemarksPanel: React.FC<MatchRemarksPanelProps> = ({
  tournamentId,
  matchId,
  team1,
  team2,
  readOnly = false,
}) => {
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [counts, setCounts] = useState<RemarkCounts>({ total: 0, penalties: 0, yellow_cards: 0, red_cards: 0 });
  const [remarkTypes, setRemarkTypes] = useState<RemarkOption[]>([]);
  const [severities, setSeverities] = useState<RemarkOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadOptions = useCallback(async () => {
    try {
      const res = await api.get('/api/tournaments/remarks/options/');
      setRemarkTypes(res.data.remark_types);
      setSeverities(res.data.severities);
    } catch {
      // fallback defaults
      setRemarkTypes([
        { value: 'PENALTY', label: 'Penalty' },
        { value: 'YELLOW_CARD', label: 'Yellow Card' },
        { value: 'RED_CARD', label: 'Red Card' },
        { value: 'FOUL', label: 'Foul' },
        { value: 'INJURY', label: 'Injury' },
        { value: 'SUBSTITUTION', label: 'Substitution' },
        { value: 'DISPUTE', label: 'Dispute' },
        { value: 'CUSTOM', label: 'Custom Note' },
      ]);
      setSeverities([
        { value: 'LOW', label: 'Low' },
        { value: 'MEDIUM', label: 'Medium' },
        { value: 'HIGH', label: 'High' },
      ]);
    }
  }, []);

  const loadRemarks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/api/tournaments/${tournamentId}/matches/${matchId}/remarks/`);
      setRemarks(res.data.remarks);
      setCounts(res.data.counts);
    } catch {
      toast.error('Failed to load remarks');
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId, matchId]);

  useEffect(() => {
    loadOptions();
    loadRemarks();
  }, [loadOptions, loadRemarks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        team: form.team || null,
        minute: form.minute !== '' ? Number(form.minute) : null,
      };
      await api.post(`/api/tournaments/${tournamentId}/matches/${matchId}/remarks/`, payload);
      toast.success('Remark added');
      setForm({ ...emptyForm });
      setShowForm(false);
      loadRemarks();
    } catch (err: any) {
      const msg = err?.response?.data?.description?.[0] || err?.response?.data?.detail || 'Failed to add remark';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (remarkId: string) => {
    if (!confirm('Delete this remark?')) return;
    try {
      await api.delete(`/api/tournaments/${tournamentId}/matches/${matchId}/remarks/${remarkId}/`);
      toast.success('Remark deleted');
      loadRemarks();
    } catch {
      toast.error('Failed to delete remark');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <FileText size={16} className="text-gray-500" />
          <span className="font-semibold text-gray-800 text-sm">Match Remarks</span>
          {counts.total > 0 && (
            <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">{counts.total}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {counts.penalties > 0 && (
            <span className="flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
              <Flag size={10} /> {counts.penalties}
            </span>
          )}
          {counts.yellow_cards > 0 && (
            <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
              <span className="inline-block w-2 h-3 bg-yellow-400 rounded-sm" /> {counts.yellow_cards}
            </span>
          )}
          {counts.red_cards > 0 && (
            <span className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
              <span className="inline-block w-2 h-3 bg-red-500 rounded-sm" /> {counts.red_cards}
            </span>
          )}
          {!readOnly && (
            <button
              onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus size={12} />
              Add
            </button>
          )}
        </div>
      </div>

      {/* Add Remark Form */}
      {showForm && !readOnly && (
        <form onSubmit={handleSubmit} className="p-4 border-b border-gray-100 bg-indigo-50/40 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <div className="relative">
                <select
                  value={form.remark_type}
                  onChange={e => setForm(f => ({ ...f, remark_type: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {remarkTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Severity</label>
              <div className="relative">
                <select
                  value={form.severity}
                  onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {severities.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Team */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Team (optional)</label>
              <div className="relative">
                <select
                  value={form.team}
                  onChange={e => setForm(f => ({ ...f, team: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">— No team —</option>
                  <option value={team1.id}>{team1.name}</option>
                  <option value={team2.id}>{team2.name}</option>
                </select>
                <ChevronDown size={14} className="absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Minute */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Minute (optional)</label>
              <input
                type="number"
                min={1}
                max={120}
                placeholder="e.g. 45"
                value={form.minute}
                onChange={e => setForm(f => ({ ...f, minute: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {/* Player name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Player name (optional)</label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={form.player_name}
              onChange={e => setForm(f => ({ ...f, player_name: e.target.value }))}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title (optional)</label>
            <input
              type="text"
              placeholder="Short summary"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Describe what happened..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm({ ...emptyForm }); }}
              className="text-sm px-4 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="text-sm px-4 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Save Remark'}
            </button>
          </div>
        </form>
      )}

      {/* Remarks List */}
      <div className="divide-y divide-gray-100">
        {isLoading ? (
          <div className="py-6 text-center text-sm text-gray-400">Loading remarks...</div>
        ) : remarks.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-400">No remarks yet</div>
        ) : (
          remarks.map(r => (
            <div key={r.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
              {/* Icon */}
              <div className="mt-0.5 text-gray-500 flex-shrink-0">
                {TYPE_ICONS[r.remark_type] ?? <FileText size={14} />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-gray-700">{r.remark_type_display}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${SEVERITY_COLORS[r.severity] ?? 'bg-gray-100 text-gray-600'}`}>
                    {r.severity_display}
                  </span>
                  {r.minute !== null && (
                    <span className="text-xs text-gray-400">{r.minute}'</span>
                  )}
                  {r.team_name && (
                    <span className="text-xs text-indigo-600 font-medium">{r.team_name}</span>
                  )}
                  {r.player_name && (
                    <span className="text-xs text-gray-500">· {r.player_name}</span>
                  )}
                </div>
                {r.title && <p className="text-sm font-medium text-gray-800">{r.title}</p>}
                {r.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.description}</p>}
                <p className="text-xs text-gray-400 mt-1">by {r.created_by_name}</p>
              </div>

              {/* Delete */}
              {!readOnly && (
                <button
                  onClick={() => handleDelete(r.id)}
                  className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors mt-0.5"
                  title="Delete remark"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
