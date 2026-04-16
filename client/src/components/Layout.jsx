import { useState, createContext, useContext, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import {
  LayoutDashboard, PenTool, List, Trophy,
  MessageSquare, LogOut, Menu, X, Moon, Sun, ClipboardList, Archive
} from 'lucide-react';

export const ThemeContext = createContext({ dark: false });
export const useTheme = () => useContext(ThemeContext);

export const useDarkMode = () => {
  const [dark, setDark] = useState(() => localStorage.getItem('darkMode') === 'true');

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [dark]);

  const toggle = () => {
    setDark(prev => {
      const next = !prev;
      localStorage.setItem('darkMode', String(next));
      return next;
    });
  };
  return [dark, toggle];
};

const Sidebar = ({ dark, toggleDark }) => {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleToggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebarCollapsed', String(next));
  };

  // Account tab removed — accessible from Dashboard instead
  const links = [
    { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/write',       icon: PenTool,          label: 'Write' },
    { to: '/inventory',   icon: List,             label: 'Inventory' },
    { to: '/exams',       icon: ClipboardList,    label: 'Exams' },
    { to: '/leaderboard', icon: Trophy,           label: 'Leaderboard' },
    { to: '/feedback',    icon: MessageSquare,    label: 'Feedback' },
    { to: '/archive',     icon: Archive,          label: 'Archive' },
  ];

  return (
    <div
      className={`h-screen text-white flex flex-col flex-shrink-0 ${
        collapsed ? 'w-14' : 'w-64'
      } bg-[#2774AE]/90 dark:bg-[#001020]/90 backdrop-blur-xl border-r border-white/20 dark:border-white/10 transition-[width] duration-200 ease-in-out shadow-2xl`}
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-white/15 bg-white/5">
        {!collapsed && (
          <span className="font-bold text-xl tracking-tight px-1">PROSE</span>
        )}
        <button
          onClick={handleToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors ml-auto"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {links.map(link => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to ||
            (link.to === '/dashboard' && location.pathname === '/');
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-base transition-colors ${
                isActive
                  ? 'bg-white/20 text-white font-semibold shadow-sm'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 py-2 border-t border-white/15 space-y-1 bg-white/5">
        <button
          onClick={toggleDark}
          className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-base text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          {dark ? <Sun size={18} className="flex-shrink-0" /> : <Moon size={18} className="flex-shrink-0" />}
          {!collapsed && <span>{dark ? 'Light mode' : 'Dark mode'}</span>}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-base text-white/70 hover:bg-red-500/20 hover:text-red-200 transition-colors"
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );
};

const Layout = ({ children }) => {
  const [dark, toggleDark] = useDarkMode();
  return (
    <ThemeContext.Provider value={{ dark }}>
      <div className={`flex h-screen overflow-hidden ${dark ? 'dark' : ''}`}>
        <Sidebar dark={dark} toggleDark={toggleDark} />
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#dce8f5] via-[#EEF4FB] to-[#f6f9fc] dark:from-[#020c16] dark:via-[#030e1a] dark:to-[#010810]">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </ThemeContext.Provider>
  );
};

export default Layout;
