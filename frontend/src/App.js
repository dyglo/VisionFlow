import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/Sidebar';
import TopNavbar from './components/TopNavbar';
import Dashboard from './pages/Dashboard';
import Images from './pages/Images';
import Videos from './pages/Videos';
import Exports from './pages/Exports';
import Settings from './pages/Settings';
import Notifications from './components/Notifications';
import './App.css';

const App = () => {
  return (
    <AppProvider>
      <Router>
        <div className="min-h-screen bg-black text-white flex">
          {/* Sidebar */}
          <Sidebar />
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Top Navigation */}
            <TopNavbar />
            
            {/* Page Content */}
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/images" element={<Images />} />
                <Route path="/videos" element={<Videos />} />
                <Route path="/exports" element={<Exports />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </main>
          </div>
          
          {/* Notifications */}
          <Notifications />
        </div>
      </Router>
    </AppProvider>
  );
};

export default App;
