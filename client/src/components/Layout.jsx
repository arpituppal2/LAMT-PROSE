import { useState, createContext, useContext, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import api from '../utils/api';
import {
  LayoutDashboard, PenTool, List, Trophy,
  MessageSquare, LogOut, Menu, X, Moon, Sun, ClipboardList, Archive, Bell
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
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await api.get('/notifications');
        setUnreadCount(res.data.filter(n => !n.isRead).length);
      } catch (e) {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, []);

  // Reset badge when visiting notifications page
  useEffect(() => {
    if (location.pathname === '/notifications') setUnreadCount(0);
  }, [location.pathname]);

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
    { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/write',         icon: PenTool,          label: 'Write' },
    { to: '/inventory',     icon: List,             label: 'Inventory' },
    { to: '/exams',         icon: ClipboardList,    label: 'Exams' },
    { to: '/leaderboard',   icon: Trophy,           label: 'Leaderboard' },
    { to: '/feedback',      icon: MessageSquare,    label: 'Feedback' },
    { to: '/archive',       icon: Archive,          label: 'Archive' },
    { to: '/notifications', icon: Bell,             label: 'Notifications', badge: unreadCount },
  ];

  return (
    <aside
      className={`
        h-screen text-white flex flex-col flex-shrink-0
        ${collapsed ? 'w-14' : 'w-56'}
        glass-sidebar
        bg-[#1d5f9e]/85 dark:bg-[#00101f]/80
        border-r border-white/20 dark:border-white/8
        transition-[width] duration-200 ease-in-out
        shadow-[4px_0_32px_rgba(0,0,0,0.12)]
        relative z-20
      `}
    >
      {/* Logo row */}
      <div className="flex items-center justify-between px-3 py-3.5 border-b border-white/15">
        {!collapsed && (
          <span className="font-bold text-[15px] tracking-widest uppercase px-1 text-white/90 select-none">
            PROSE
          </span>
        )}
        <button
          onClick={handleToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-white/15 active:bg-white/25 transition-colors ml-auto"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <Menu size={17} /> : <X size={17} />}
        </button>
      </div>

      {/* Nav links */}
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
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                ${
                  isActive
                    ? 'bg-white/20 text-white shadow-sm ring-1 ring-white/25'
                    : 'text-white/65 hover:bg-white/12 hover:text-white'
                }
              `}
            >
              <div className="relative flex-shrink-0">
                <Icon size={17} />
                {link.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {link.badge > 99 ? '99+' : link.badge}
                  </span>
                )}
              </div>
              {!collapsed && (
                <span className="tracking-[-0.01em] flex-1">{link.label}</span>
              )}
              {!collapsed && link.badge > 0 && (
                <span className="ml-auto px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full leading-none">
                  {link.badge > 99 ? '99+' : link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="px-2 py-2.5 border-t border-white/15 space-y-0.5">
        <button
          onClick={toggleDark}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-white/12 hover:text-white transition-all duration-150"
        >
          {dark
            ? <Sun  size={17} className="flex-shrink-0" />
            : <Moon size={17} className="flex-shrink-0" />}
          {!collapsed && <span>{dark ? 'Light mode' : 'Dark mode'}</span>}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-red-500/20 hover:text-red-200 transition-all duration-150"
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
        <main className="
          flex-1 overflow-y-auto
          bg-gradient-to-br
          from-[#c8ddf0] via-[#ddeaf7] to-[#eef4fb]
          dark:from-[#020c16] dark:via-[#03111e] dark:to-[#010810]
          relative
        ">
          <div className="
            pointer-events-none select-none absolute inset-0 overflow-hidden
            opacity-40 dark:opacity-0
          ">
            <div className="
              absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full
              bg-[#2774AE]/15 blur-[100px]
            " />
            <div className="
              absolute top-1/2 right-[-10%] w-[400px] h-[400px] rounded-full
              bg-[#8BB8E8]/20 blur-[80px]
            " />
          </div>
          <div className="relative p-8">
            {children}
          </div>
        </main>
      </div>
    </ThemeContext.Provider>
  );
};

export default Layout;
