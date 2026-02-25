import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { 
  Home, LayoutDashboard, PenTool, List, Trophy, 
  MessageSquare, FileText, LogOut, Menu, X 
} from 'lucide-react';

const Sidebar = () => {
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
      className={`h-screen bg-ucla-dark-blue text-white transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="p-4 flex items-center justify-between">
        {!collapsed && <h1 className="text-xl font-bold">Math Platform</h1>}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-ucla-blue rounded transition-colors"
        >
          {collapsed ? <Menu size={20} /> : <X size={20} />}
        </button>
      </div>

      <nav className="mt-8">
        {links.map(link => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center px-4 py-3 hover:bg-ucla-blue transition-colors ${
                isActive ? 'bg-ucla-blue border-l-4 border-ucla-gold' : ''
              }`}
            >
              <Icon size={20} />
              {!collapsed && <span className="ml-3">{link.label}</span>}
            </Link>
          );
        })}

        <button
          onClick={handleLogout}
          className="flex items-center w-full px-4 py-3 hover:bg-red-600 transition-colors mt-8"
        >
          <LogOut size={20} />
          {!collapsed && <span className="ml-3">Sign Out</span>}
        </button>
      </nav>
    </div>
  );
};

const Layout = ({ children }) => {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#F0F4FF]">
        <div className="container mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
