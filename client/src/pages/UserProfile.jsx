import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { User, Star, ArrowLeft, Award, BookOpen, Clock } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';

// UCLA Brand colors for status - consistent with Inventory
const STAGE_CONFIG = {
  'On Test': { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', label: 'In Testing' },
  'Endorsed': { color: 'bg-yellow-100 text-yellow-700 dark:bg-[#FFD100]/20 dark:text-[#FFD100]', label: 'Endorsed' },
  'Published': { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Published' },
  'Review': { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', label: 'Under Review' },
  'Idea': { color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', label: 'Draft/Idea' },
  'Needs Review': { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Needs Edits' },
};

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      const response = await api.get(`/user/${id}`);
      setProfile(response.data);
    } catch (err) {
      setError('Bruin not found in the directory.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats once profile is loaded
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

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-96">
          <div className="w-10 h-10 border-4 border-ucla-blue border-t-ucla-gold rounded-full animate-spin mb-4" />
          <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Accessing Records...</p>
        </div>
      </Layout>
    );
  }

  if (error || !profile) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center py-20 px-4">
          <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-3xl border border-red-100 dark:border-red-900/30">
            <p className="text-red-600 dark:text-red-400 font-bold mb-4">{error}</p>
            <button 
              onClick={() => navigate(-1)} 
              className="flex items-center gap-2 mx-auto px-6 py-2 bg-white dark:bg-slate-800 shadow-sm rounded-xl font-bold text-sm"
            >
              <ArrowLeft size={16} /> Return to Inventory
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 pb-20">
        {/* Navigation */}
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 text-slate-400 hover:text-ucla-blue dark:hover:text-ucla-gold mb-8 transition-colors font-bold text-xs uppercase tracking-widest"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Profile Card */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 p-8 text-center relative overflow-hidden">
              {/* Profile Background Decor */}
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-ucla-blue to-ucla-blue/80" />
              
              <div className="relative pt-4">
                <div className="w-24 h-24 rounded-[2rem] bg-ucla-gold shadow-lg shadow-ucla-gold/40 flex items-center justify-center text-3xl font-black text-ucla-blue mx-auto mb-4 border-4 border-white dark:border-slate-900 transform -rotate-3 hover:rotate-0 transition-transform">
                  {profile.initials}
                </div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                  {profile.firstName} {profile.lastName}
                </h1>
                <p className="text-ucla-blue dark:text-ucla-gold font-bold text-xs uppercase tracking-widest mb-4">
                  Problem Writer
                </p>
                
                {profile.mathExp && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-sm text-slate-600 dark:text-slate-400 italic mb-6 border border-slate-100 dark:border-slate-700/50">
                    "{profile.mathExp}"
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Contributions</p>
                    <p className="text-2xl font-black text-slate-800 dark:text-white">{profile.problems.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Endorsements</p>
                    <p className="text-2xl font-black text-ucla-gold">{stats.totalEndorsements}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Achievement Badge (Dynamic logic example) */}
            {profile.problems.length >= 5 && (
              <div className="bg-gradient-to-r from-ucla-gold to-yellow-500 rounded-2xl p-4 flex items-center gap-4 shadow-lg shadow-ucla-gold/20">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Award className="text-white" size={24} />
                </div>
                <div>
                  <p className="text-white font-black text-xs uppercase tracking-tighter">Contributor Level</p>
                  <p className="text-ucla-blue font-bold">Bruin Veteran</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Problem History */}
          <div className="lg:col-span-8 space-y-6">
            {/* Stage Summary Chips */}
            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-wrap gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase w-full mb-1">Status Breakdown</span>
              {Object.entries(stats.counts).map(([stage, count]) => {
                const config = STAGE_CONFIG[stage] || { color: 'bg-slate-100 text-slate-600', label: stage };
                return (
                  <div key={stage} className={`px-3 py-1.5 rounded-xl flex items-center gap-2 border border-black/5 ${config.color}`}>
                    <span className="text-xs font-black">{count}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{config.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Main List */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h2 className="flex items-center gap-2 font-black text-slate-800 dark:text-white uppercase tracking-tight text-sm">
                  <BookOpen size={18} className="text-ucla-blue" />
                  Submission History
                </h2>
              </div>
              
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {profile.problems.length === 0 ? (
                  <div className="py-20 text-center">
                    <p className="text-slate-400 font-medium italic">No problems submitted to the inventory yet.</p>
                  </div>
                ) : (
                  profile.problems.map(p => (
                    <Link
                      key={p.id}
                      to={`/problem/${p.id}`}
                      className="group block p-6 hover:bg-ucla-blue/[0.02] dark:hover:bg-ucla-gold/[0.02] transition-all"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="font-black text-ucla-blue dark:text-ucla-gold text-lg group-hover:underline decoration-2 underline-offset-4">
                              {p.id}
                            </span>
                            <div className="flex gap-1">
                              {(p.topics || []).map(t => (
                                <span key={t} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold rounded uppercase">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                          {/* LaTeX preview logic - sanitized */}
                          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 italic">
                            {p.latex?.replace(/[$#\\]/g, '').substring(0, 70) || 'No preview available...'}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          {p.endorsements > 0 && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-ucla-gold/10 text-ucla-gold rounded-full border border-ucla-gold/20">
                              <Star size={14} fill="currentColor" />
                              <span className="text-xs font-black">{p.endorsements}</span>
                            </div>
                          )}
                          <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${STAGE_CONFIG[p.stage]?.color || 'bg-slate-100 text-slate-600'}`}>
                            {p.stage}
                          </div>
                          <div className="hidden md:flex flex-col items-end min-w-[80px]">
                            <div className="flex items-center gap-1 text-slate-300 dark:text-slate-600">
                              <Clock size={12} />
                              <span className="text-[10px] font-bold">{new Date(p.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default UserProfile;
