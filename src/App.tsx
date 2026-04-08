import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ProjectList } from '@/components/ProjectList';
import { Auth } from '@/components/Auth';
import { Toaster } from '@/components/ui/sonner';
import { Sidebar } from '@/components/layout/Sidebar';
import { VPSGuide } from '@/components/VPSGuide';
import { Settings } from '@/components/Settings';
import { Deployments } from '@/components/Deployments';
import { FileExplorer } from '@/components/FileExplorer';
import { ProcessManager } from '@/components/ProcessManager';
import { Plus, Terminal, Activity, ShieldCheck, Search, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddProjectDialog } from '@/components/AddProjectDialog';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

export default function App() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('dashboard');

  // VPS Global State
  const [vpsStatus, setVpsStatus] = useState<{ connected: boolean; ip?: string; username?: string }>({ connected: false });
  const [vpsHealth, setVpsHealth] = useState({ cpu: '0%', memory: '0%', disk: '0%' });

  const fetchVpsStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/system/status', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setVpsStatus(data);
    } catch (err) {
      console.error('Failed to fetch VPS status');
    }
  }, []);

  const fetchVpsHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/system/health', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      
      // Sync connection status with health check
      setVpsStatus(prev => {
        if (data.connected !== prev.connected) {
          return { ...prev, connected: data.connected };
        }
        return prev;
      });

      if (data.connected) {
        setVpsHealth({ cpu: data.cpu, memory: data.memory, disk: data.disk });
      }
    } catch (err) {
      setVpsStatus(prev => {
        if (prev.connected) return { ...prev, connected: false };
        return prev;
      });
    }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser && storedUser !== 'undefined') {
      try {
        setUser(JSON.parse(storedUser));
        fetchVpsStatus();
      } catch (e) {
        console.error('Failed to parse user from localStorage', e);
        localStorage.removeItem('user');
      }
    }
  }, [fetchVpsStatus]);

  useEffect(() => {
    if (user && vpsStatus.connected) {
      fetchVpsHealth();
    }
  }, [user, vpsStatus.connected, fetchVpsHealth]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully');
  }, []);

  const content = useMemo(() => {
    switch (activeTab) {
      case 'dashboard':
      case 'projects':
        return (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest opacity-40">Infrastructure</span>
                  <span className="text-[10px] font-mono opacity-20">/</span>
                  <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Vortex-01</span>
                </div>
                <h2 className="text-4xl font-bold tracking-tighter font-serif italic uppercase">Overview</h2>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="hidden lg:flex items-center gap-6 px-6 py-3 border border-[#141414]/10 bg-white/30">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono uppercase tracking-tighter opacity-40">System Status</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-[10px] font-mono font-bold">OPERATIONAL</span>
                    </div>
                  </div>
                  <div className="w-px h-8 bg-[#141414]/10" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono uppercase tracking-tighter opacity-40">Active Nodes</span>
                    <span className="text-[10px] font-mono font-bold">12 / 12</span>
                  </div>
                </div>

                <Button 
                  className="bg-[#141414] text-[#E4E3E0] hover:bg-[#141414]/90 transition-all duration-200 rounded-none h-14 px-8 uppercase tracking-widest font-bold italic shadow-[6px_6px_0px_0px_rgba(20,20,20,0.2)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(20,20,20,0.2)]"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </div>
            </div>

            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20 group-focus-within:opacity-100 transition-opacity" />
              <Input 
                placeholder="Search projects, domains, or deployments..." 
                className="w-full h-14 pl-12 border-[#141414] bg-white rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:opacity-30 font-mono text-xs uppercase tracking-widest"
              />
            </div>

            <ProjectList refreshTrigger={refreshTrigger} />
          </div>
        );
      case 'deployments':
        return <Deployments />;
      case 'explorer':
        return <FileExplorer />;
      case 'processes':
        return <ProcessManager vpsStatus={vpsStatus} />;
      case 'guide':
        return (
          <VPSGuide 
            vpsStatus={vpsStatus} 
            vpsHealth={vpsHealth} 
            onStatusChange={fetchVpsStatus} 
            onRefreshHealth={fetchVpsHealth}
          />
        );
      case 'settings':
        return <Settings userEmail={user?.email || ''} />;
      default:
        return null;
    }
  }, [activeTab, refreshTrigger, vpsStatus, vpsHealth, fetchVpsStatus, fetchVpsHealth, user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center font-sans">
        <Auth onLogin={(u) => setUser(u)} />
        <Toaster position="top-right" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0] flex overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userEmail={user.email} 
        onLogout={handleLogout} 
        className="border-r border-[#141414]"
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="h-16 border-b border-[#141414] bg-white/50 backdrop-blur-md flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-[#141414] text-[#E4E3E0] text-[9px] font-mono uppercase tracking-widest">
              <ShieldCheck className="w-3 h-3" />
              Production Environment
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button className="relative p-2 hover:bg-[#141414]/5 transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <div className="w-px h-6 bg-[#141414]/10" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-bold uppercase tracking-tight leading-none">{user.email.split('@')[0]}</p>
                <p className="text-[8px] font-mono uppercase tracking-widest opacity-40 leading-none mt-1">Administrator</p>
              </div>
              <div className="w-8 h-8 bg-[#141414] rounded-none flex items-center justify-center text-[#E4E3E0] font-serif italic font-bold">
                {user.email[0].toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto bg-[#E4E3E0]/50">
          <div className="max-w-7xl mx-auto">
            {content}
          </div>
        </main>
      </div>

      <AddProjectDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen} 
        onSuccess={() => {
          setRefreshTrigger(prev => prev + 1);
          setIsAddDialogOpen(false);
          setActiveTab('dashboard');
        }}
      />
      
      <Toaster position="top-right" theme="light" richColors />
    </div>
  );
}
