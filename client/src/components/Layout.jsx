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
    <aside
      className={`
        h-screen text-white flex flex-col flex-shrink-0
        ${collapsed ? 'w-14' : 'w-56'}
        bg-[#2774AE] dark:bg-[#001628]
        border-r border-[#005587] dark:border-white/10
        transition-[width] duration-200 ease-in-out
        relative z-20
      `}
    >
      <div className="flex items-center justify-between px-3 py-3.5 border-b border-white/15 dark:border-white/10">
        {!collapsed && (
          <span className="font-bold text-[15px] tracking-widest uppercase px-1 text-white select-none">
            PROSE
          </span>
        )}
        <button
          onClick={handleToggleCollapse}
          className="p-1.5 hover:bg-white/15 active:bg-white/25 transition-colors ml-auto rounded-sm"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <Menu size={17} /> : <X size={17} />}
        </button>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {links.map(link => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to ||
            (link.to === '/dashboard' && location.pathname === '/');
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`
                flex items-center gap-3 px-3 py-2.5 text-[14px] font-medium transition-colors duration-150 rounded-sm
                ${
                  isActive
                    ? 'bg-white text-[#2774AE] dark:bg-white dark:text-[#2774AE]'
                    : 'text-white/80 hover:bg-white/15 hover:text-white'
                }
              `}
            >
              <Icon size={17} className="flex-shrink-0" />
              {!collapsed && <span className="tracking-[-0.01em]">{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 py-2.5 border-t border-white/15 dark:border-white/10 space-y-0.5">
        <button
          onClick={toggleDark}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-[14px] font-medium text-white/75 hover:bg-white/15 hover:text-white transition-colors rounded-sm"
        >
          {dark
            ? <Sun  size={17} className="flex-shrink-0" />
            : <Moon size={17} className="flex-shrink-0" />}
          {!collapsed && <span>{dark ? 'Light mode' : 'Dark mode'}</span>}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-[14px] font-medium text-white/75 hover:bg-red-600/30 hover:text-white transition-colors rounded-sm"
        >
          <LogOut size={17} className="flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
};

const Layout = ({ children }) => {
  const [dark, toggleDark] = useDarkMode();
  return (
    <ThemeContext.Provider value={{ dark }}>
      <div className={`flex h-screen overflow-hidden ${dark ? 'dark' : ''}`}>
        <Sidebar dark={dark} toggleDark={toggleDark} />
        <main className="flex-1 overflow-y-auto bg-[#F5F7FA] dark:bg-[#001628] text-black dark:text-white">
          <div className="relative p-6 md:p-8 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </ThemeContext.Provider>
  );
};

export default Layout;
