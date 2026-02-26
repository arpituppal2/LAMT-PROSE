import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { 
  Home, LayoutDashboard, PenTool, List, Trophy, 
  MessageSquare, FileText, LogOut, Menu, X, Moon, Sun
} from 'lucide-react';

export const useDarkMode = () => {
  const [dark, setDark] = useState(() => localStorage.getItem('darkMode') === 'true');
  const toggle = () => {
    setDark(prev => {
      localStorage.setItem('darkMode', !prev);
      return !prev;
    });
  };
  return [dark, toggle];
};

const Sidebar = ({ dark, toggleDark }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const links = [
    { to: '/home', icon: Home, label: 'Home' },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/write', icon: PenTool, label: 'Write New Problem' },
    { to: '/inventory', icon: List, label: 'Problem Inventory' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { to: '/feedback', icon: MessageSquare, label: 'Give Feedback' },
    { to: '/tests', icon: FileText, label: 'View Tests' },
  ];

  return (
    <div 
      className={`h-screen text-white transition-all duration-300 flex flex-col ${
        collapsed ? 'w-16' : 'w-64'
      }`}
      style={{ backgroundColor: '#2774AE' }}
    >
      <div className="p-4 flex items-center justify-between flex-shrink-0">
        {!collapsed && <h1 className="text-xl font-bold tracking-wide" style={{ color: '#FFD100' }}>LAMT PROSE</h1>}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded transition-colors hover:bg-blue-700"
        >
          {collapsed ? <Menu size={20} /> : <X size={20} />}
        </button>
      </div>
      <nav className="mt-4 flex-1 overflow-y-auto">
        {links.map(link => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center px-4 py-3 transition-colors ${
                isActive 
                  ? 'border-l-4 bg-blue-700'
                  : 'hover:bg-blue-600'
              }`}
              style={isActive ? { borderColor: '#FFD100' } : {}}
            >
              <Icon size={20} style={isActive ? { color: '#FFD100' } : {}} />
              {!collapsed && <span className="ml-3 text-sm">{link.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="p-2 flex-shrink-0">
        <button
          onClick={toggleDark}
          className="flex items-center w-full px-4 py-3 hover:bg-blue-600 transition-colors rounded"
          title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {dark ? <Sun size={20} /> : <Moon size={20} />}
          {!collapsed && <span className="ml-3 text-sm">{dark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-4 py-3 hover:bg-red-600 transition-colors rounded"
        >
          <LogOut size={20} />
          {!collapsed && <span className="ml-3 text-sm">Sign Out</span>}
        </button>
      </div>
    </div>
  );
};

const Layout = ({ children }) => {
  const [dark, toggleDark] = useDarkMode();

  return (
    <div className={`flex h-screen overflow-hidden ${dark ? 'dark' : ''}`}>
      <Sidebar dark={dark} toggleDark={toggleDark} />
      <main
        className="flex-1 overflow-y-auto transition-colors duration-300"
        style={{
          backgroundColor: dark ? '#1a1f2e' : '#F0F4FF',
          color: dark ? '#e2e8f0' : '#1a202c'
        }}
      >
        <div className="container mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
