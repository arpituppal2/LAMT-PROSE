import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, ArrowLeft, BookOpen, Clock } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';

const STAGE_CONFIG = {
  'On Test':      { color: 'bg-[#2774AE]/10 text-[#2774AE] dark:bg-[#2774AE]/20 dark:text-[#8BB8E8]', label: 'In Testing' },
  'Endorsed':     { color: 'bg-[#FFD100]/10 text-yellow-700 dark:bg-[#FFD100]/10 dark:text-[#FFD100]', label: 'Endorsed' },
  'Published':    { color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',       label: 'Published' },
  'Review':       { color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-300',  label: 'Under Review' },
  'Idea':         { color: 'bg-gray-100 text-gray-500 dark:bg-white/8 dark:text-gray-400',             label: 'Idea' },
  'Needs Review': { color: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',              label: 'Needs Edits' },
};

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchProfile(); }, [id]);

  const fetchProfile = async () => {
    try {
      const response = await api.get(`/user/${id}`);
      setProfile(response.data);
    } catch (err) {
      setError('User not found.');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (!profile) return null;
    const counts = {};
    let totalEndorsements = 0;
    profile.problems.forEach(p => {
      counts[p.stage] = (counts[p.stage] || 0) + 1;
      totalEndorsements += (p.endorsements || 0);
    });
    return { counts, totalEndorsements };
  }, [profile]);

  const cardCls = 'bg-white/70 dark:bg-white/[0.05] backdrop-blur-md border border-white/60 dark:border-white/10 rounded-2xl';

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-gray-400 text-base">Loading...</div>
      </Layout>
    );
  }

  if (error || !profile) {
    return (
      <Layout>
        <div className="max-w-sm mx-auto text-center py-20">
          <p className="text-base text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-base text-[#2774AE] dark:text-[#FFD100] hover:underline">
            <ArrowLeft size={14} /> Go back
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-base text-gray-400 hover:text-gray-700 dark:hover:text-white mb-6 transition-colors">
          <ArrowLeft size={14} /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left: profile card */}
          <div className="lg:col-span-4 space-y-4">
            <div className={`${cardCls} p-6`}>
              <div className="w-14 h-14 rounded-xl bg-[#2774AE] flex items-center justify-center text-white text-lg font-bold mb-4">
                {profile.initials}
              </div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {profile.firstName} {profile.lastName}
              </h1>
              <p className="text-sm text-gray-400 dark:text-gray-500 font-mono mb-4">{profile.initials}</p>

              {profile.mathExp && (
                <p className="text-base text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-white/8 pt-4">
                  {profile.mathExp}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-white/8 mt-4 pt-4">
                <div>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mb-0.5">Problems</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">{profile.problems.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mb-0.5">Endorsed</p>
                  <p className="text-2xl font-semibold text-[#FFD100] tabular-nums">{stats.totalEndorsements}</p>
                </div>
              </div>
            </div>

            <div className={`${cardCls} p-4`}>
              <p className="text-sm font-medium text-gray-400 dark:text-gray-500 mb-3">By status</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.counts).map(([stage, count]) => {
                  const config = STAGE_CONFIG[stage] || { color: 'bg-gray-100 text-gray-500', label: stage };
                  return (
                    <span key={stage} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-medium ${config.color}`}>
                      <span className="tabular-nums">{count}</span>
                      <span>{config.label}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: problem history */}
          <div className="lg:col-span-8">
            <div className={`${cardCls} overflow-hidden`}>
              <div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/8 flex items-center gap-2">
                <BookOpen size={15} className="text-gray-400" />
                <h2 className="text-base font-medium text-gray-700 dark:text-gray-300">Submissions</h2>
              </div>

              <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                {profile.problems.length === 0 ? (
                  <div className="py-16 text-center text-base text-gray-400 dark:text-gray-500">No submissions yet.</div>
                ) : profile.problems.map(p => (
                  <Link key={p.id} to={`/problem/${p.id}`}
                    className="group flex items-center justify-between px-5 py-4 hover:bg-white/40 dark:hover:bg-white/[0.04] transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-base font-semibold text-[#2774AE] dark:text-[#FFD100]">{p.id}</span>
                        <div className="flex gap-1">
                          {(p.topics || []).map(t => (
                            <span key={t} className="px-2 py-0.5 bg-gray-100 dark:bg-white/8 text-gray-400 dark:text-gray-500 text-xs rounded-lg">{t}</span>
                          ))}
                        </div>
                      </div>
                      {p.latex && (
                        <p className="text-sm text-gray-400 dark:text-gray-500 truncate">
                          {p.latex.replace(/[$#\\]/g, '').substring(0, 70)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      {p.endorsements > 0 && (
                        <span className="flex items-center gap-1 text-sm text-[#FFD100]">
                          <Star size={11} fill="currentColor" />
                          {p.endorsements}
                        </span>
                      )}
                      <span className={`px-2.5 py-0.5 text-sm rounded-lg font-medium ${
                        STAGE_CONFIG[p.stage]?.color || 'bg-gray-100 text-gray-500'
                      }`}>
                        {STAGE_CONFIG[p.stage]?.label || p.stage}
                      </span>
                      <span className="hidden md:flex items-center gap-1 text-sm text-gray-300 dark:text-gray-600">
                        <Clock size={11} />
                        {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default UserProfile;
