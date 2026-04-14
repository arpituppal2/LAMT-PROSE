import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Star, LayoutDashboard, MessageSquare, Trash2, User,
  Eye, X, ChevronDown, ChevronUp, CheckCircle,
  ClipboardEdit, Save, Search, Plus, Filter, Clock, Lightbulb
} from 'lucide-react';
import Layout from '../components/Layout';
import api from '../utils/api';
import KatexRenderer from '../components/KatexRenderer';

const TOPIC_COLORS = {
  Algebra: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Geometry: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Combinatorics: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Number Theory': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const STATUS_COLORS = {
  Idea: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Endorsed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Needs Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Archived: 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400',
};

function StatCard({ label, value, icon: Icon, active, onClick, color = 'text-[#2774AE]' }) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border p-4 transition-all ${
        active
          ? 'bg-[#2774AE] text-white border-[#2774AE] shadow-md shadow-[#2774AE]/15 dark:bg-[#1b5e8c] dark:border-[#1b5e8c]'
          : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/8 hover:border-[#2774AE]/30 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-medium ${active ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>{label}</span>
        <Icon size={14} className={active ? 'text-white' : color} />
      </div>
      <div className={`text-2xl font-bold tabular-nums ${active ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{value}</div>
    </button>
  );
}

function EditProblemDrawer({ problem, open, onClose, onSave }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(problem ? {
      statement: problem.statement || '',
      answer: problem.answer || '',
      solution: problem.solution || '',
      topic: problem.topic || 'Algebra',
      difficulty: problem.difficulty || 'Medium',
      notes: problem.notes || '',
      status: problem.status || 'Idea',
    } : null);
  }, [problem]);

  if (!open || !form) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/problems/${problem.id}`, form);
      onSave(res.data);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px] flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-sm h-full bg-white dark:bg-[#0d1b2a] border-l border-slate-200 dark:border-white/10 shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Quick Edit</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Problem #{problem.id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Statement</label>
            <textarea value={form.statement} onChange={e => set('statement', e.target.value)} rows={6}
              className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Answer</label>
            <input value={form.answer} onChange={e => set('answer', e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Solution</label>
            <textarea value={form.solution} onChange={e => set('solution', e.target.value)} rows={5}
              className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Topic</label>
              <select value={form.topic} onChange={e => set('topic', e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none">
                <option>Algebra</option>
                <option>Geometry</option>
                <option>Combinatorics</option>
                <option>Number Theory</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Difficulty</label>
              <select value={form.difficulty} onChange={e => set('difficulty', e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none">
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
                <option>Very Hard</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none">
              <option>Idea</option>
              <option>Needs Review</option>
              <option>Endorsed</option>
              <option>Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
              className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30" />
          </div>
        </div>

        <div className="px-4 py-3 border-t border-slate-200 dark:border-white/10 flex gap-2">
          <button onClick={onClose} className="flex-1 px-3 py-2 rounded-lg text-sm bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-[#2774AE] text-white hover:bg-[#1f6396] disabled:opacity-50">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={14} /> Save</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ problem, onClose }) {
  if (!problem) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#0d1b2a] border border-slate-200 dark:border-white/10 w-full sm:max-w-2xl max-h-[92dvh] sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {problem.topic && <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TOPIC_COLORS[problem.topic] || 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400'}`}>{problem.topic}</span>}
              {problem.status && <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[problem.status] || 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400'}`}>{problem.status}</span>}
              {problem.difficulty && <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400">{problem.difficulty}</span>}
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Problem Preview</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto px-5 py-5 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Statement</p>
            <div className="text-sm text-slate-800 dark:text-slate-100 leading-7"><KatexRenderer content={problem.statement || '_No statement_'} /></div>
          </div>
          {problem.answer && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Answer</p>
              <div className="text-sm text-slate-800 dark:text-slate-100"><KatexRenderer content={problem.answer} /></div>
            </div>
          )}
          {problem.solution && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Solution</p>
              <div className="text-sm text-slate-800 dark:text-slate-100 leading-7"><KatexRenderer content={problem.solution} /></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [myProblems, setMyProblems] = useState([]);
  const [feedbackProblems, setFeedbackProblems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('mine');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [previewProblem, setPreviewProblem] = useState(null);
  const [editingProblem, setEditingProblem] = useState(null);
  const [expandedReviewId, setExpandedReviewId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, mineRes, feedbackRes, reviewsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/my-problems'),
        api.get('/dashboard/needs-feedback'),
        api.get('/dashboard/my-reviews'),
      ]);
      setStats(statsRes.data);
      setMyProblems(mineRes.data || []);
      setFeedbackProblems(feedbackRes.data || []);
      setReviews(reviewsRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const filter = searchParams.get('filter');
    const topic = searchParams.get('topic');
    if (tab) setActiveTab(tab);
    if (filter) setActiveFilter(filter);
    if (topic) setSelectedTopic(topic);
  }, [searchParams]);

  const setTab = (tab) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next);
  };

  const setFilter = (filter) => {
    setActiveFilter(filter);
    const next = new URLSearchParams(searchParams);
    next.set('filter', filter);
    setSearchParams(next);
  };

  const setTopic = (topic) => {
    setSelectedTopic(topic);
    const next = new URLSearchParams(searchParams);
    next.set('topic', topic);
    setSearchParams(next);
  };

  const updateProblemLocally = (updated) => {
    setMyProblems(prev => prev.map(p => p.id === updated.id ? updated : p));
    load();
  };

  const deleteProblem = async (id) => {
    if (!window.confirm('Delete this problem?')) return;
    try {
      await api.delete(`/problems/${id}`);
      setMyProblems(prev => prev.filter(p => p.id !== id));
      load();
    } catch (e) {
      console.error(e);
      alert('Failed to delete problem.');
    }
  };

  const endorseProblem = async (id) => {
    try {
      await api.post(`/problems/${id}/endorse`);
      load();
    } catch (e) {
      console.error(e);
      alert('Failed to endorse problem.');
    }
  };

  const filteredMine = myProblems.filter(p => {
    const matchesSearch = !search ||
      p.statement?.toLowerCase().includes(search.toLowerCase()) ||
      p.topic?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === 'all'
      || (activeFilter === 'endorsed' && p.status === 'Endorsed')
      || (activeFilter === 'needs-review' && p.status === 'Needs Review')
      || (activeFilter === 'idea' && p.status === 'Idea');
    const matchesTopic = selectedTopic === 'All' || p.topic === selectedTopic;
    return matchesSearch && matchesFilter && matchesTopic;
  });

  const topicCounts = myProblems.reduce((acc, p) => {
    if (p.topic) acc[p.topic] = (acc[p.topic] || 0) + 1;
    return acc;
  }, {});
  const topics = ['All', ...Object.keys(topicCounts).sort()];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-2 border-[#2774AE] border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full px-[5%] py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your problems, reviews, and feedback queue.</p>
          </div>
          <button
            onClick={() => navigate('/write')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2774AE] text-white text-sm font-semibold hover:bg-[#1f6396] shadow-sm"
          >
            <Plus size={16} />
            New Problem
          </button>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            label="My Problems"
            value={stats?.myProblems ?? myProblems.length}
            icon={LayoutDashboard}
            active={activeTab === 'mine' && activeFilter === 'all'}
            onClick={() => { setTab('mine'); setFilter('all'); }}
          />
          <StatCard
            label="Endorsed"
            value={stats?.endorsed ?? myProblems.filter(p => p.status === 'Endorsed').length}
            icon={Star}
            active={activeTab === 'mine' && activeFilter === 'endorsed'}
            onClick={() => { setTab('mine'); setFilter('endorsed'); }}
            color="text-green-500"
          />
          <StatCard
            label="Needs Review"
            value={stats?.needsReview ?? myProblems.filter(p => p.status === 'Needs Review').length}
            icon={Clock}
            active={activeTab === 'mine' && activeFilter === 'needs-review'}
            onClick={() => { setTab('mine'); setFilter('needs-review'); }}
            color="text-amber-500"
          />
          <StatCard
            label="Ideas"
            value={myProblems.filter(p => p.status === 'Idea').length}
            icon={Lightbulb}
            active={activeTab === 'mine' && activeFilter === 'idea'}
            onClick={() => { setTab('mine'); setFilter('idea'); }}
            color="text-blue-500"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {[
            { key: 'mine', label: 'My Problems', icon: LayoutDashboard },
            { key: 'feedback', label: 'Needs Feedback', icon: MessageSquare },
            { key: 'reviews', label: 'My Reviews', icon: User },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setTab(tab.key)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/8 text-slate-600 dark:text-slate-300 hover:border-[#2774AE]/30'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* My Problems */}
        {activeTab === 'mine' && (
          <>
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by statement or topic…"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2774AE]/30"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 text-sm">
                  <Filter size={14} />
                  Topic
                </div>
                <div className="flex gap-2 flex-wrap">
                  {topics.map(topic => (
                    <button
                      key={topic}
                      onClick={() => setTopic(topic)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedTopic === topic
                          ? 'bg-[#2774AE] text-white'
                          : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#091521] border border-slate-200 dark:border-white/8 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-white/8 bg-slate-50/70 dark:bg-white/4">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Problem</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Topic</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Difficulty</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMine.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-16 text-center">
                          <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                            <LayoutDashboard size={26} />
                            <p className="text-sm">No problems match your filters.</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredMine.map(problem => (
                      <tr key={problem.id} className="border-b last:border-b-0 border-slate-100 dark:border-white/6 hover:bg-slate-50/80 dark:hover:bg-white/3 transition-colors">
                        <td className="px-5 py-4 align-top">
                          <button
                            onClick={() => navigate(`/problem/${problem.id}`)}
                            className="text-left group"
                          >
                            <div className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2 group-hover:text-[#2774AE] transition-colors">
                              <KatexRenderer content={problem.statement || '_No statement_'} />
                            </div>
                          </button>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${TOPIC_COLORS[problem.topic] || 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400'}`}>
                            {problem.topic || '—'}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <span className="text-sm text-slate-600 dark:text-slate-300">{problem.difficulty || '—'}</span>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[problem.status] || 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400'}`}>
                            {problem.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => setPreviewProblem(problem)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 hover:text-[#2774AE] hover:border-[#2774AE]/30 dark:text-slate-300"
                              title="Preview"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => setEditingProblem(problem)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10"
                            >
                              <ClipboardEdit size={12} /> Edit
                            </button>
                            {problem.status !== 'Endorsed' && (
                              <button
                                onClick={() => endorseProblem(problem.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700"
                              >
                                <CheckCircle size={12} /> Endorse
                              </button>
                            )}
                            <button
                              onClick={() => deleteProblem(problem.id)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Needs Feedback */}
        {activeTab === 'feedback' && (
          <div className="bg-white dark:bg-[#091521] border border-slate-200 dark:border-white/8 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/8 bg-slate-50/70 dark:bg-white/4">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Problem</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Topic</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Author</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbackProblems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                          <MessageSquare size={26} />
                          <p className="text-sm">No problems need your feedback right now.</p>
                        </div>
                      </td>
                    </tr>
                  ) : feedbackProblems.map(problem => (
                    <tr key={problem.id} className="border-b last:border-b-0 border-slate-100 dark:border-white/6 hover:bg-slate-50/80 dark:hover:bg-white/3 transition-colors cursor-pointer" onClick={() => navigate(`/problem/${problem.id}`)}>
                      <td className="px-5 py-4 align-top">
                        <div className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2"><KatexRenderer content={problem.statement || '_No statement_'} /></div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${TOPIC_COLORS[problem.topic] || 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400'}`}>{problem.topic || '—'}</span>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <span className="text-sm text-slate-600 dark:text-slate-300">{problem.authorName || '—'}</span>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingProblem(problem); }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10"
                          >
                            <ClipboardEdit size={12} /> Edit
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/feedback/${problem.id}`); }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#2774AE] text-white hover:bg-[#1f6396]"
                          >
                            <MessageSquare size={12} /> Give Feedback
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reviews */}
        {activeTab === 'reviews' && (
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <div className="bg-white dark:bg-[#091521] border border-slate-200 dark:border-white/8 rounded-2xl px-5 py-16 text-center">
                <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                  <User size={26} />
                  <p className="text-sm">You have not written any reviews yet.</p>
                </div>
              </div>
            ) : reviews.map(review => {
              const expanded = expandedReviewId === review.id;
              return (
                <div key={review.id} className="bg-white dark:bg-[#091521] border border-slate-200 dark:border-white/8 rounded-2xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => setExpandedReviewId(expanded ? null : review.id)}
                    className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50/80 dark:hover:bg-white/3 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        {review.problem?.topic && <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TOPIC_COLORS[review.problem.topic] || 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400'}`}>{review.problem.topic}</span>}
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400">Rating {review.rating ?? '—'}/5</span>
                      </div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2">
                        <KatexRenderer content={review.problem?.statement || '_No statement_'} />
                      </div>
                    </div>
                    {expanded ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0 mt-1" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0 mt-1" />}
                  </button>
                  {expanded && (
                    <div className="px-5 py-4 border-t border-slate-200 dark:border-white/8 space-y-4">
                      {review.comment && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Comment</p>
                          <p className="text-sm text-slate-700 dark:text-slate-200 leading-6 whitespace-pre-wrap">{review.comment}</p>
                        </div>
                      )}
                      {Array.isArray(review.tags) && review.tags.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Tags</p>
                          <div className="flex flex-wrap gap-2">
                            {review.tags.map(tag => (
                              <span key={tag} className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-[#2774AE]/10 text-[#2774AE] dark:bg-[#2774AE]/20 dark:text-blue-300">{tag}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PreviewModal problem={previewProblem} onClose={() => setPreviewProblem(null)} />
      <EditProblemDrawer
        problem={editingProblem}
        open={!!editingProblem}
        onClose={() => setEditingProblem(null)}
        onSave={updateProblemLocally}
      />
    </Layout>
  );
}
