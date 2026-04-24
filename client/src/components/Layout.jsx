import { useState, createContext, useContext, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import {
  LayoutDashboard, PenTool, List, Trophy,
  MessageSquare, LogOut, Menu, X, Moon, Sun,
  ClipboardList, Archive, ShieldAlert,
  AlertTriangle, ArrowLeft, FlaskConical,
} from 'lucide-react';

/* ── Theme context ──────────────────────────────────────────── */
export const ThemeContext = createContext({ dark: false });
export const useTheme = () => useContext(ThemeContext);

export const useDarkMode = () => {
  const [dark, setDark] = useState(() => localStorage.getItem('darkMode') === 'true');
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);
  const toggle = () =>
    setDark((prev) => {
      const next = !prev;
      localStorage.setItem('darkMode', String(next));
      return next;
    });
  return [dark, toggle];
};

/* Pages that can have access revoked (Dashboard is always allowed) */
export const MANAGEABLE_PAGES = [
  { key: 'write',       label: 'Write',       to: '/write' },
  { key: 'inventory',   label: 'Inventory',   to: '/inventory' },
  { key: 'exams',       label: 'Exams',       to: '/exams' },
  { key: 'leaderboard', label: 'Leaderboard', to: '/leaderboard' },
  { key: 'feedback',    label: 'Feedback',    to: '/feedback' },
  { key: 'archive',     label: 'Archive',     to: '/archive' },
  { key: 'testsolving', label: 'Testsolving', to: '/testsolving' },
];

const NAV_LINKS = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard',   key: null },
  { to: '/write',       icon: PenTool,          label: 'Write',       key: 'write' },
  { to: '/inventory',   icon: List,             label: 'Inventory',   key: 'inventory' },
  { to: '/exams',       icon: ClipboardList,    label: 'Exams',       key: 'exams' },
  { to: '/leaderboard', icon: Trophy,           label: 'Leaderboard', key: 'leaderboard' },
  { to: '/feedback',    icon: MessageSquare,    label: 'Feedback',    key: 'feedback' },
  { to: '/archive',     icon: Archive,          label: 'Archive',     key: 'archive' },
  { to: '/testsolving', icon: FlaskConical,     label: 'Testsolving', key: 'testsolving' },
];

/* ── Helpers ─────────────────────────────────────────────────── */
const hasAccess = (user, key) => {
  if (!key) return true; // Dashboard always allowed
  if (!user) return true;
  const pa = user.pageAccess || {};
  // If key is absent from pageAccess, default is true (all access enabled)
  return pa[key] !== false;
};

/* ── Sidebar ─────────────────────────────────────────────────── */
const Sidebar = ({ dark, toggleDark }) => {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebarCollapsed') === 'true',
  );
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const handleToggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebarCollapsed', String(next));
  };

  return (
    <aside className={[
      'sidebar h-screen flex flex-col relative z-20',
      collapsed ? 'sidebar--collapsed' : 'sidebar--expanded',
    ].join(' ')}>

      {/* Brand */}
      <div className="sidebar__brand">
        {!collapsed && (
          <div className="sidebar__wordmark">
            <span className="sidebar__prose-label">PROSE</span>
            <span className="sidebar__lamt-label">by Arpit Uppal</span>
          </div>
        )}
        <button onClick={handleToggle} className="sidebar__toggle"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <Menu size={14} /> : <X size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="sidebar__nav" aria-label="Main navigation">
        {NAV_LINKS.map(({ to, icon: Icon, label, key }) => {
          const accessible = hasAccess(user, key);
          const isActive =
            location.pathname === to ||
            (to === '/dashboard' && location.pathname === '/');
          return (
            <Link
              key={to}
              to={accessible ? to : '#'}
              onClick={accessible ? undefined : (e) => e.preventDefault()}
              className={[
                'sidebar__link',
                isActive ? 'sidebar__link--active' : '',
                !accessible ? 'sidebar__link--locked' : '',
              ].join(' ')}
              title={collapsed ? label : undefined}
              style={!accessible ? { opacity: 0.38, cursor: 'not-allowed', pointerEvents: 'none' } : {}}
            >
              <Icon size={14} className="sidebar__link-icon" />
              {!collapsed && <span className="sidebar__link-label">{label}</span>}
            </Link>
          );
        })}

        {/* Admin link — only shown to admins */}
        {user?.isAdmin && (
          <Link
            to="/admin"
            className={['sidebar__link', location.pathname.startsWith('/admin') ? 'sidebar__link--active' : ''].join(' ')}
            title={collapsed ? 'Admin' : undefined}
            style={{ marginTop: 'auto' }}
          >
            <ShieldAlert size={14} className="sidebar__link-icon" />
            {!collapsed && <span className="sidebar__link-label">Admin</span>}
          </Link>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar__footer">
        <button onClick={toggleDark} className="sidebar__util-btn"
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {dark ? <Sun size={14} className="flex-shrink-0" /> : <Moon size={14} className="flex-shrink-0" />}
          {!collapsed && <span>{dark ? 'Light mode' : 'Dark mode'}</span>}
        </button>
        <button onClick={handleLogout} className="sidebar__util-btn sidebar__util-btn--danger" title="Sign out">
          <LogOut size={14} className="flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
};

/* ── Disabled account wall ───────────────────────────────────── */
const DisabledWall = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await logout(); navigate('/login'); };
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: '2rem', textAlign: 'center',
      background: 'var(--color-bg)', color: 'var(--color-text)',
    }}>
      <AlertTriangle size={40} style={{ color: '#dc2626', marginBottom: '1.25rem' }} />
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 800, marginBottom: '0.75rem' }}>
        Account Disabled
      </h1>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', maxWidth: '38ch', lineHeight: 1.7, marginBottom: '1.75rem' }}>
        Your PROSE account has been disabled by an admin. Please contact them for more information.
      </p>
      <button onClick={handleLogout} className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        <LogOut size={14} /> Sign out
      </button>
    </div>
  );
};

/* ── Page-access wall ────────────────────────────────────────── */
const AccessWall = ({ pageName }) => {
  const navigate = useNavigate();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '80vh', padding: '2rem', textAlign: 'center',
    }}>
      <ShieldAlert size={40} style={{ color: 'var(--color-text-faint)', marginBottom: '1.25rem' }} />
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 800, marginBottom: '0.75rem' }}>
        Access Restricted
      </h2>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', maxWidth: '44ch', lineHeight: 1.7, marginBottom: '1.75rem' }}>
        An admin has removed your access to <strong>{pageName}</strong>.
        If you think this is a mistake, please contact a tournament admin.
      </p>
      <button onClick={() => navigate('/dashboard')} className="btn-outline"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        <ArrowLeft size={14} /> Return to Dashboard
      </button>
    </div>
  );
};

/* ── Layout wrapper ─────────────────────────────────────────── */
const Layout = ({ children, noPadding = false, pageKey = null }) => {
  const [dark, toggleDark] = useDarkMode();
  const { user } = useAuth();
  const location = useLocation();

  // Disabled account — full-screen wall (skip for admins)
  if (user && user.disabled && !user.isAdmin) {
    return (
      <ThemeContext.Provider value={{ dark }}>
        <DisabledWall />
      </ThemeContext.Provider>
    );
  }

  // Page-access check
  const blocked = pageKey && !user?.isAdmin && !hasAccess(user, pageKey);
  const blockedPage = blocked
    ? MANAGEABLE_PAGES.find(p => p.key === pageKey)?.label || pageKey
    : null;

  return (
    <ThemeContext.Provider value={{ dark }}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar dark={dark} toggleDark={toggleDark} />
        <main
          className="flex-1 overflow-y-auto"
          style={{
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            paddingTop: noPadding ? 0 : '3vh',
            paddingInline: noPadding ? 0 : '3%',
          }}
        >
          {blocked ? <AccessWall pageName={blockedPage} /> : children}
        </main>
      </div>
    </ThemeContext.Provider>
  );
};

export default Layout;
