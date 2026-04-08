import React from 'react';
import { 
  LayoutDashboard, 
  Box, 
  History, 
  Settings, 
  BookOpen, 
  LogOut,
  Activity,
  Terminal,
  FolderTree,
  Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userEmail: string;
  onLogout: () => void;
  className?: string;
}

export function Sidebar({ activeTab, setActiveTab, userEmail, onLogout, className }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: Box },
    { id: 'deployments', label: 'Deployments', icon: History },
    { id: 'processes', label: 'Processes', icon: Cpu },
    { id: 'explorer', label: 'File Explorer', icon: FolderTree },
    { id: 'guide', label: 'VPS Guide', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className={cn("w-64 border-r border-[#141414] flex flex-col h-screen sticky top-0 bg-[#E4E3E0] z-20", className)}>
      <div className="p-6 border-b border-[#141414]">
        <div className="flex items-center gap-3">
          <div className="bg-[#141414] p-1.5 rounded-sm">
            <Activity className="w-5 h-5 text-[#E4E3E0]" />
          </div>
          <h1 className="text-xl font-bold tracking-tighter uppercase italic font-serif">Vortex</h1>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="px-3 mb-4">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">Main Menu</span>
        </div>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all duration-200 rounded-none group relative",
              activeTab === item.id 
                ? "bg-[#141414] text-[#E4E3E0]" 
                : "text-[#141414] hover:bg-[#141414]/5"
            )}
          >
            <item.icon className={cn(
              "w-4 h-4 transition-transform duration-200 group-hover:scale-110",
              activeTab === item.id ? "text-[#E4E3E0]" : "opacity-60"
            )} />
            <span className="uppercase tracking-tight italic">{item.label}</span>
            {activeTab === item.id && (
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#141414] translate-x-full" />
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-[#141414] space-y-4">
        <div className="px-3">
          <div className="flex items-center gap-2 mb-1">
            <Terminal className="w-3 h-3 opacity-40" />
            <span className="text-[9px] font-mono uppercase tracking-widest opacity-40">Authenticated As</span>
          </div>
          <p className="text-[10px] font-mono truncate opacity-60">{userEmail}</p>
        </div>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 hover:bg-red-500/10 hover:text-red-600 rounded-none text-xs uppercase tracking-wider font-bold"
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
