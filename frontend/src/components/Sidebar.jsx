import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Image, 
  Video, 
  Download, 
  Settings,
  Zap
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { credits } = useApp();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { id: 'images', label: 'Images', icon: Image, path: '/images' },
    { id: 'videos', label: 'Videos', icon: Video, path: '/videos' },
    { id: 'exports', label: 'Exports', icon: Download, path: '/exports' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <div className="w-64 bg-black border-r border-gray-900 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-900">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">VisionFlow</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleNavigation(item.path)}
                  className={`sidebar-item w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-lg active' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Processing Credits */}
      <div className="p-4 border-t border-gray-900">
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Processing Credits</div>
          <div className="text-2xl font-bold text-white">{credits.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Dynamic tracking</div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
