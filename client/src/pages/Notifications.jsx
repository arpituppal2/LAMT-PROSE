import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../utils/api';

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

const TYPE_LABEL = {
  feedback: { label: 'New Review', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  endorsement: { label: 'Endorsement', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  reply: { label: 'Reply', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) { console.error(e); }
  };

  const handleClick = (notif) => {
    if (!notif.isRead) markRead(notif.id);
    if (notif.problemId) navigate(`/problem/${notif.problemId}`);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 bg-ucla-blue text-white text-xs font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-ucla-blue transition-colors"
            >
              <CheckCheck size={15} /> Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-ucla-blue border-t-transparent" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <Bell size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400 text-sm">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(notif => {
              const meta = TYPE_LABEL[notif.type] || { label: notif.type, color: 'bg-slate-100 text-slate-600' };
              return (
                <div
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                    notif.isRead
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-70'
                      : 'bg-blue-50/60 dark:bg-slate-800 border-blue-200 dark:border-slate-700 shadow-sm'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wide ${meta.color}`}>
                        {meta.label}
                      </span>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-ucla-blue flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-snug">{notif.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{timeAgo(notif.createdAt)}</p>
                  </div>
                  {notif.problemId && (
                    <ExternalLink size={14} className="text-slate-300 flex-shrink-0 mt-1" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Notifications;
