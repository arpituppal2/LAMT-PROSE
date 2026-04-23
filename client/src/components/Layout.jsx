import { useState, createContext, useContext, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import {
  LayoutDashboard, PenTool, List, Trophy,
  MessageSquare, LogOut, Menu, X, Moon, Sun, ClipboardList, Archive
} from 'lucide-react';

/* ── Theme context ────────────────────────────────────────────────── */
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

/* ── Sidebar nav links ───────────────────────────────────────────── */
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
      className={`
        h-screen text-white flex flex-col flex-shrink-0
        ${collapsed ? 'w-[52px]' : 'w-56'}
        bg-[var(--ucla-blue)] dark:bg-black
        border-r border-white/10
        transition-[width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]
        relative z-20
      `}
    >
      {/* ── Brand + collapse toggle ── */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-white/15">
        {!collapsed && (
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '15px',
              fontWeight: 800,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
            }}
            className="select-none px-0.5"
          >
            PROSE
          </span>
        )}
        <button
          onClick={handleToggle}
          className="p-1.5 hover:bg-white/15 active:bg-white/25 transition-colors ml-auto rounded-sm"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <Menu size={16} /> : <X size={16} />}
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-1.5 py-2 space-y-0.5 overflow-y-auto">
        {NAV_LINKS.map(({ to, icon: Icon, label }) => {
          const isActive =
            location.pathname === to ||
            (to === '/dashboard' && location.pathname === '/');

          return (
            <Link
              key={to}
              to={to}
              style={{
                fontSize: '15px',
                fontWeight: 800,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-body)',
              }}
              className={`
                flex items-center gap-2.5 px-2.5 py-2.5
                transition-colors duration-150 rounded-sm
                ${
                  isActive
                    ? 'bg-white/20 text-white border-l-2 border-[var(--ucla-gold)]'
                    : 'text-white/75 hover:bg-white/10 hover:text-white border-l-2 border-transparent'
                }
              `}
            >
              <Icon size={15} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer controls ── */}
      <div className="px-1.5 py-2 border-t border-white/15 space-y-0.5">
        <button
          onClick={toggleDark}
          style={{
            fontSize: '15px',
            fontWeight: 800,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-body)',
          }}
          className="flex items-center gap-2.5 w-full px-2.5 py-2.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors rounded-sm"
        >
          {dark
            ? <Sun  size={15} className="flex-shrink-0" />
            : <Moon size={15} className="flex-shrink-0" />}
          {!collapsed && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button
          onClick={handleLogout}
          style={{
            fontSize: '15px',
            fontWeight: 800,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-body)',
          }}
          className="flex items-center gap-2.5 w-full px-2.5 py-2.5 text-white/70 hover:bg-red-500/20 hover:text-red-300 transition-colors rounded-sm"
        >
          <LogOut size={15} className="flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};

/* ── Layout wrapper ─────────────────────────────────────────────── */
const Layout = ({ children }) => {
  const [dark, toggleDark] = useDarkMode();
  return (
    <ThemeContext.Provider value={{ dark }}>
      <div className={`flex h-screen overflow-hidden ${dark ? 'dark' : ''}`}>
        <Sidebar dark={dark} toggleDark={toggleDark} />
        <main
          className="flex-1 overflow-y-auto"
          style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
        >
          <div className="page-content relative p-5 md:p-7 max-w-[1500px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </ThemeContext.Provider>
  );
};

export default Layout;
