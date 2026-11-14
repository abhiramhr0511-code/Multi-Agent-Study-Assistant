import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Bot,
  HelpCircle,
  Map,
  Compass,
  FileText,
  TrendingUp,
  User,
  LogOut,
  Search,
  Bell,
  Menu,
  X,
  BookOpen,
  Target,
  Network,
  CalendarClock,
  FolderGit2,
  Brain,
  Mic
} from 'lucide-react';

export const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Learning Twin', path: '/learning-twin', icon: Brain },
    { name: 'Knowledge Graph', path: '/knowledge-graph', icon: Network },
    { name: 'Revision Scheduler', path: '/revision', icon: CalendarClock },
    { name: 'Project Mentor', path: '/project-mentor', icon: FolderGit2 },
    { name: 'Interview Coach', path: '/interview-coach', icon: Mic },
    { name: 'AI Tutor', path: '/tutor', icon: Bot },
    { name: 'Quiz Generator', path: '/quiz', icon: HelpCircle },
    { name: 'Skill Assessment', path: '/skill-assessment', icon: Target },
    { name: 'Learning Roadmap', path: '/roadmap', icon: Map },
    { name: 'Resources', path: '/resources', icon: Compass },
    { name: 'Document Q&A', path: '/documents', icon: FileText },
    { name: 'Progress', path: '/progress', icon: TrendingUp },
    { name: 'Profile', path: '/profile', icon: User },
  ];





  return (
    <div className="flex h-screen w-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 flex flex-col h-full overflow-hidden shadow-xs ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo & Brand Header */}
        <div className="flex-shrink-0 flex items-center justify-between h-20 px-6 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
                StudyMate <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-extrabold">AI</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">Smart Multi-Agent Learning</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3.5 px-4 py-3 rounded-2xl font-semibold text-xs sm:text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-50 text-brand-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Footer Profile & Logout */}
        <div className="flex-shrink-0 p-4 border-t border-slate-100 space-y-3 bg-white">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-brand-200 text-brand-800 flex items-center justify-center font-extrabold text-sm shadow-xs flex-shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.name || 'Abhishek'}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email || 'abhishek@gmail.com'}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-500 bg-rose-50/80 hover:bg-rose-100 border border-rose-100 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full min-h-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex-shrink-0 h-20 bg-white border-b border-slate-100 px-6 sm:px-8 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative hidden md:flex items-center w-80">
              <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search anything..."
                className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-16 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500 transition-all"
              />
              <span className="absolute right-3 text-[10px] font-semibold text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded">
                Ctrl + K
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>FLAN-T5 RAG Local Engine Ready</span>
            </div>

            <button className="p-2.5 rounded-2xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative border border-slate-200/60">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500"></span>
            </button>
          </div>
        </header>

        {/* Dynamic Page View Container */}
        <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#f8fafc]">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
