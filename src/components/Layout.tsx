import React from 'react';
import { UserProfile } from '../types';
import { Button } from './ui/button';
import { 
  LayoutDashboard, 
  Store, 
  Users, 
  FileText, 
  LogOut, 
  Menu,
  X,
  TrendingUp
} from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  user: UserProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function Layout({ user, activeTab, setActiveTab, onLogout, children }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'employee'] },
    { id: 'stores', label: 'Stores', icon: Store, roles: ['admin'] },
    { id: 'employees', label: 'Employees', icon: Users, roles: ['admin', 'manager'] },
    { id: 'reports', label: 'Submit Report', icon: FileText, roles: ['admin', 'manager', 'employee'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-zinc-200">
        <div className="p-6 flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-900 text-white">
            <TrendingUp size={24} />
          </div>
          <span className="font-bold text-xl tracking-tight">AdMetric</span>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                activeTab === item.id 
                  ? "bg-zinc-900 text-white" 
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-100">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="h-8 w-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">{user.name}</p>
              <p className="text-xs text-zinc-500 capitalize">{user.role}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-zinc-500 hover:text-red-600 hover:bg-red-50"
            onClick={onLogout}
          >
            <LogOut size={18} />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-zinc-900" size={24} />
            <span className="font-bold text-lg">AdMetric</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute inset-0 z-50 bg-white pt-16">
            <nav className="p-4 space-y-2">
              {filteredNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-4 rounded-xl text-lg font-medium",
                    activeTab === item.id 
                      ? "bg-zinc-900 text-white" 
                      : "text-zinc-500"
                  )}
                >
                  <item.icon size={24} />
                  {item.label}
                </button>
              ))}
              <div className="pt-4 mt-4 border-t border-zinc-100">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-3 text-zinc-500 py-6"
                  onClick={onLogout}
                >
                  <LogOut size={24} />
                  Sign Out
                </Button>
              </div>
            </nav>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
