import React from 'react';
import { UserProfile } from '@/types';
import { Button } from '@/components/ui/button.tsx';
import { 
  LayoutDashboard, 
  Store, 
  Users, 
  FileText, 
  LogOut, 
  Menu,
  X,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
    { id: 'reports_view', label: 'Reports', icon: BarChart3, roles: ['admin', 'manager', 'employee'] },
    { id: 'stores', label: 'Stores', icon: Store, roles: ['admin'] },
    { id: 'employees', label: 'Employees', icon: Users, roles: ['admin', 'manager'] },
    { id: 'reports', label: 'Submit Report', icon: FileText, roles: ['admin', 'manager', 'employee'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-72 flex-col bg-zinc-950 text-zinc-400 border-r border-zinc-800">
        <div className="p-8 flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/20">
            <TrendingUp size={24} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xl tracking-tight text-white leading-none">AdMetric</span>
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-500 mt-1">Agency Suite</span>
          </div>
        </div>

        <div className="px-4 mb-4">
          <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 font-bold border border-brand-500/20">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">{user.role}</p>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 mt-4">
          <p className="px-4 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-4">Main Menu</p>
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                activeTab === item.id 
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20" 
                  : "hover:bg-zinc-900 hover:text-white"
              )}
            >
              <item.icon size={18} className={cn(
                "transition-colors",
                activeTab === item.id ? "text-white" : "text-zinc-500 group-hover:text-white"
              )} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6 mt-auto">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all duration-200"
            onClick={onLogout}
          >
            <LogOut size={18} />
            <span className="font-medium">Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Header */}
        <header className="h-20 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md border-b border-zinc-200 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 hover:bg-zinc-100 rounded-lg"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="hidden md:flex items-center gap-2 text-sm text-zinc-500">
              <span>Platform</span>
              <span className="text-zinc-300">/</span>
              <span className="text-zinc-900 font-medium capitalize">{activeTab}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Status</span>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-semibold text-zinc-900">Live Sync Active</span>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-zinc-950/90 backdrop-blur-sm">
            <div className="w-72 h-full bg-zinc-950 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <TrendingUp className="text-brand-500" size={24} />
                  <span className="font-bold text-xl text-white">AdMetric</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-zinc-400">
                  <X size={24} />
                </button>
              </div>
              
              <nav className="space-y-2">
                {filteredNavItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-lg font-medium transition-all",
                      activeTab === item.id 
                        ? "bg-brand-500 text-white" 
                        : "text-zinc-400"
                    )}
                  >
                    <item.icon size={24} />
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="mt-auto pt-6 border-t border-zinc-800">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-3 text-zinc-400 py-6"
                  onClick={onLogout}
                >
                  <LogOut size={24} />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto bg-zinc-50/50">
          <div className="max-w-[1600px] mx-auto p-8 md:p-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
