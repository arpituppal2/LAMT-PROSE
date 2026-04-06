import { useState, createContext, useContext, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import {
  LayoutDashboard, PenTool, List, Trophy,
  MessageSquare, LogOut, Menu, X, Moon, Sun, ClipboardList, Archive
} from 'lucide-react';

// Theme context so children can react to dark mode
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

  const links = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/write', icon: PenTool, label: 'Write New Problem' },
    { to: '/inventory', icon: List, label: 'Problem Inventory' },
    { to: '/exams', icon: ClipboardList, label: 'Exams' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { to: '/feedback', icon: MessageSquare, label: 'Give Feedback' },
    { to: '/archive', icon: Archive, label: 'Archive' },
  ];

  return (
    <div
      className={`h-screen text-white transition-all duration-300 flex flex-col ${
        collapsed ? 'w-16' : 'w-64'
      } bg-ucla-blue dark:bg-slate-900`}
    >
      {/* Header */}
      <div className={`p-4 flex items-center flex-shrink-0 ${
        collapsed ? 'justify-center' : 'justify-between'
      }`}>
        {!collapsed && (
          <h1 className="text-xl font-bold tracking-wide text-ucla-gold">
            LAMT PROSE
          </h1>
        )}
        <button
          onClick={handleToggleCollapse}
          className="p-2 rounded transition-colors hover:bg-white/10 flex-shrink-0"
        >
          {collapsed ? <Menu size={20} /> : <X size={20} />}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        {links.map(link => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to ||
            (link.to === '/dashboard' && location.pathname === '/');
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={20} className="flex-shrink-0" />
              {!collapsed && <span className="text-sm">{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 space-y-1 border-t border-white/10">
        <button
          onClick={toggleDark}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          {dark ? <Sun size={20} className="flex-shrink-0" /> : <Moon size={20} className="flex-shrink-0" />}
          {!collapsed && <span className="text-sm">{dark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-white/70 hover:bg-red-600 hover:text-white transition-colors"
        >
          <LogOut size={20} className="flex-shrink-0" />
          {!collapsed && <span className="text-sm">Sign Out</span>}
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
        {/* Light: very light blue tint. Dark: near-black slate, not neon */}
        <main className="flex-1 overflow-y-auto bg-sky-50 dark:bg-slate-950">
          <div className="p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </ThemeContext.Provider>
  );
};

export default Layout;
