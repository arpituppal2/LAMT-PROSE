import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Plus, Trash2, Search, X,
  ChevronRight, AlertCircle, Loader2, FileText,
} from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';

// ... keep TOPICS, TEMPLATES, SHOPPING_TABLE, LaTeX generators,
// StageBadge, Spinner, ErrorMsg, NewExamModal as-is ...

const ExamManager = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [examsError, setExamsError] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    api.get('/auth/me').then(r => setCurrentUser(r.data.user)).catch(() => {});
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setExamsLoading(true); setExamsError('');
    try { const r = await api.get('/tests'); setExams(r.data); }
    catch { setExamsError('Failed to load exams.'); }
    finally { setExamsLoading(false); }
  };

  const isAdmin = currentUser?.isAdmin || false;
  const canEditExam = (exam) =>
    isAdmin || !exam.authorId || exam.author?.id === currentUser?.id || exam.authorId === currentUser?.id;

  const handleCreated = (newExam) => {
    setExams(prev => [newExam, ...prev]);
    navigate(`/exams/${newExam.id}`);  // ← go straight to detail
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm('Delete this exam? This cannot be undone.')) return;
    try {
      await api.delete(`/tests/${examId}`);
      setExams(prev => prev.filter(e => e.id !== examId));
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to delete exam.');
    }
  };

  return (
    <Layout>
      <div className="max-w-[960px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ClipboardList size={26} className="text-ucla-blue dark:text-[#FFD100]" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Exams</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Build and manage competition exam sets</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-ucla-blue dark:bg-[#FFD100] text-white dark:text-slate-900 rounded-lg font-bold text-sm hover:opacity-90 transition shadow-sm"
          >
            <Plus size={16} /> New Exam
          </button>
        </div>

        {/* Exam list */}
        {examsLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin text-ucla-blue dark:text-[#FFD100]" /></div>
        ) : examsError ? (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm"><AlertCircle size={14} />{examsError}</div>
        ) : exams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <FileText size={40} className="text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No exams yet.</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Create your first exam to get started.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {exams.map(exam => (
              <div
                key={exam.id}
                onClick={() => navigate(`/exams/${exam.id}`)}
                className="group relative cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-800 dark:text-white truncate">{exam.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{exam.competition}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canEditExam(exam) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteExam(exam.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition"
                        title="Delete exam"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <ChevronRight size={14} className="text-slate-400 dark:text-slate-600" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{exam.version}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{exam.problems?.length ?? 0} problem{exam.problems?.length !== 1 ? 's' : ''}</span>
                  {exam.templateType && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-ucla-blue/10 dark:bg-[#FFD100]/10 text-ucla-blue dark:text-[#FFD100]">{exam.templateType}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && <NewExamModal onClose={() => setShowModal(false)} onCreate={handleCreated} />}
    </Layout>
  );
};

export default ExamManager;
