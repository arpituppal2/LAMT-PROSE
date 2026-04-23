import { useState, createContext, useContext, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import {
  LayoutDashboard, PenTool, List, Trophy,
  MessageSquare, LogOut, Menu, X, Moon, Sun, ClipboardList, Archive
} from 'lucide-react';

/* ── Theme context ──────────────────────────────────────────── */
export const ThemeContext = createContext({ dark: false });
export const useTheme = () => useContext(ThemeContext);

export const useDarkMode = () => {
  const [dark, setDark] = useState(() => localStorage.getItem('darkMode') === 'true');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const toggle = () =>
    setDark((prev) => {
      const next = !prev;
      localStorage.setItem('darkMode', String(next));
      return next;
    });

  return [dark, toggle];
};

const NAV_LINKS = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/write',       icon: PenTool,          label: 'Write' },
  { to: '/inventory',   icon: List,             label: 'Inventory' },
  { to: '/exams',       icon: ClipboardList,    label: 'Exams' },
  { to: '/leaderboard', icon: Trophy,           label: 'Leaderboard' },
  { to: '/feedback',    icon: MessageSquare,    label: 'Feedback' },
  { to: '/archive',     icon: Archive,          label: 'Archive' },
];

const Sidebar = ({ dark, toggleDark }) => {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebarCollapsed') === 'true',
  );
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleToggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebarCollapsed', String(next));
  };

  return (
    <aside
      className={[
        'sidebar h-screen flex flex-col relative z-20',
        collapsed ? 'sidebar--collapsed' : 'sidebar--expanded',
      ].join(' ')}
    >
      {/* ── Brand ── */}
      <div className="sidebar__brand">
        {!collapsed && (
          <div className="sidebar__wordmark">
            <span className="sidebar__prose-label">PROSE</span>
            <span className="sidebar__lamt-label">by LAMT</span>
          </div>
        )}
        <button
          onClick={handleToggle}
          className="sidebar__toggle"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <Menu size={14} /> : <X size={14} />}
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="sidebar__nav" aria-label="Main navigation">
        {NAV_LINKS.map(({ to, icon: Icon, label }) => {
          const isActive =
            location.pathname === to ||
            (to === '/dashboard' && location.pathname === '/');

          return (
            <Link
              key={to}
              to={to}
              className={['sidebar__link', isActive ? 'sidebar__link--active' : ''].join(' ')}
              title={collapsed ? label : undefined}
            >
              <Icon size={14} className="sidebar__link-icon" />
              {!collapsed && (
                <span className="sidebar__link-label">{label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer controls ── */}
      <div className="sidebar__footer">
        <button
          onClick={toggleDark}
          className="sidebar__util-btn"
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark
            ? <Sun  size={14} className="flex-shrink-0" />
            : <Moon size={14} className="flex-shrink-0" />}
          {!collapsed && <span>{dark ? 'Light mode' : 'Dark mode'}</span>}
        </button>
        <button
          onClick={handleLogout}
          className="sidebar__util-btn sidebar__util-btn--danger"
          title="Sign out"
        >
          <LogOut size={14} className="flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
};

/* ── Layout wrapper ─────────────────────────────────────────── */
const Layout = ({ children }) => {
  const [dark, toggleDark] = useDarkMode();
  return (
    <ThemeContext.Provider value={{ dark }}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar dark={dark} toggleDark={toggleDark} />
        <main
          className="flex-1 overflow-y-auto"
          style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
        >
          {children}
        </main>
      </div>
    </ThemeContext.Provider>
  );
};

export default Layout;
