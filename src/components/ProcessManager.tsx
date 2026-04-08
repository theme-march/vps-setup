import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, List, Activity, Cpu, HardDrive, Terminal, GitPullRequest } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PM2Process {
  id: number;
  name: string;
  pm2_env: {
    status: string;
    restart_time: number;
    unstable_restarts: number;
    exec_mode: string;
  };
  monitored: {
    cpu: number;
    memory: number;
  };
  git?: {
    isRepo: boolean;
    remoteUrl?: string;
    branch?: string;
    lastCommit?: string;
    cwd: string;
  };
}

interface ProcessManagerProps {
  vpsStatus: { connected: boolean; ip?: string; username?: string };
}

export function ProcessManager({ vpsStatus }: ProcessManagerProps) {
  const [processes, setProcesses] = useState<PM2Process[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectingGit, setConnectingGit] = useState<{cwd: string, name: string} | null>(null);
  const [repoUrl, setRepoUrl] = useState('');

  const fetchProcesses = async () => {
    if (!vpsStatus.connected) {
      setProcesses([]);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/pm2/list', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        // Map data if it's from real PM2
        const mapped = Array.isArray(data) ? data.map((p: any) => ({
          id: p.pm_id !== undefined ? p.pm_id : p.id,
          name: p.name,
          pm2_env: {
            status: p.pm2_env?.status || 'unknown',
            restart_time: p.pm2_env?.restart_time || 0,
            unstable_restarts: p.pm2_env?.unstable_restarts || 0,
            exec_mode: p.pm2_env?.exec_mode || 'fork'
          },
          monitored: {
            cpu: p.monitored?.cpu ?? p.pm2_env?.cpu ?? p.pm2_env?.axm_monitor?.['CPU Usage']?.value ?? 0,
            memory: p.monitored?.memory ?? p.pm2_env?.memory ?? p.pm2_env?.axm_monitor?.['Heap Size']?.value ?? p.pm2_env?.axm_monitor?.['Memory']?.value ?? 0
          },
          git: p.git
        })) : [];
        setProcesses(mapped);
      }
    } catch (err) {
      // Silent catch
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, [vpsStatus.connected]);

  const handleRestart = async (id: number | string) => {
    try {
      const response = await fetch(`/api/pm2/restart/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        toast.success(`Process ${id} restarted`);
        fetchProcesses();
      } else {
        toast.error('Failed to restart process');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const handleStop = async (id: number | string) => {
    try {
      const response = await fetch(`/api/pm2/stop/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        toast.success(`Process ${id} stopped`);
        fetchProcesses();
      } else {
        toast.error('Failed to stop process');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!window.confirm(`Are you sure you want to delete process ${id}?`)) return;
    try {
      const response = await fetch(`/api/pm2/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        toast.success(`Process ${id} deleted`);
        fetchProcesses();
      } else {
        toast.error('Failed to delete process');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const handleGitPull = async (name: string, id: number) => {
    const toastId = toast.loading(`Pulling latest changes for ${name}...`);
    try {
      const response = await fetch(`/api/pm2/pull/${name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ shouldBuild: true })
      });
      if (response.ok) {
        toast.success('Git pull and Build successful', { id: toastId });
        // Automatically restart after pull
        handleRestart(id);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Git pull failed', { id: toastId });
      }
    } catch (err) {
      toast.error('Network error', { id: toastId });
    }
  };

  const handleGitReset = async (name: string, id: number, branch: string) => {
    if (!window.confirm(`Are you sure you want to force reset ${name} to origin/${branch}? This will destroy all local changes.`)) return;
    
    const toastId = toast.loading(`Force resetting ${name} to origin/${branch}...`);
    try {
      const response = await fetch(`/api/pm2/reset/${name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ branch, shouldBuild: true })
      });
      if (response.ok) {
        toast.success('Git reset and Build successful', { id: toastId });
        handleRestart(id);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Git reset failed', { id: toastId });
      }
    } catch (err) {
      toast.error('Network error', { id: toastId });
    }
  };

  const handleBuild = async (name: string, id: number) => {
    const toastId = toast.loading(`Building ${name}...`);
    try {
      const response = await fetch(`/api/pm2/build/${name}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        toast.success('Build successful', { id: toastId });
        handleRestart(id);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Build failed', { id: toastId });
      }
    } catch (err) {
      toast.error('Network error', { id: toastId });
    }
  };

  const handleConnectGit = async () => {
    if (!connectingGit || !repoUrl) return;
    const toastId = toast.loading('Connecting Git repository...');
    try {
      const response = await fetch('/api/pm2/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ cwd: connectingGit.cwd, repoUrl })
      });
      if (response.ok) {
        toast.success('Git connected successfully', { id: toastId });
        setConnectingGit(null);
        setRepoUrl('');
        fetchProcesses();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to connect Git', { id: toastId });
      }
    } catch (err) {
      toast.error('Network error', { id: toastId });
    }
  };

  const handlePullAll = async () => {
    if (!vpsStatus.connected) return;
    const toastId = toast.loading('Pulling latest changes for all projects...');
    try {
      // We can iterate through all git repos and pull
      const gitRepos = processes.filter(p => p.git?.isRepo);
      if (gitRepos.length === 0) {
        toast.error('No Git repositories found', { id: toastId });
        return;
      }

      let successCount = 0;
      for (const repo of gitRepos) {
        try {
          const response = await fetch(`/api/pm2/pull/${repo.name}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ shouldBuild: true })
          });
          if (response.ok) {
            successCount++;
            await handleRestart(repo.id);
          }
        } catch (e) {
          console.error(`Failed to pull ${repo.name}`, e);
        }
      }

      toast.success(`Successfully updated ${successCount}/${gitRepos.length} projects`, { id: toastId });
      fetchProcesses();
    } catch (err) {
      toast.error('Network error', { id: toastId });
    }
  };

  const handleBuildAll = async () => {
    if (!vpsStatus.connected) return;
    const toastId = toast.loading('Building all projects...');
    try {
      let successCount = 0;
      for (const proc of processes) {
        try {
          const response = await fetch(`/api/pm2/build/${proc.name}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          if (response.ok) {
            successCount++;
            await handleRestart(proc.id);
          }
        } catch (e) {
          console.error(`Failed to build ${proc.name}`, e);
        }
      }
      toast.success(`Successfully built ${successCount}/${processes.length} projects`, { id: toastId });
      fetchProcesses();
    } catch (err) {
      toast.error('Network error', { id: toastId });
    }
  };

  const formatMemory = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest opacity-40">Infrastructure</span>
            <span className="text-[10px] font-mono opacity-20">/</span>
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Process Manager</span>
          </div>
          <h2 className="text-4xl font-bold tracking-tighter font-serif italic uppercase">PM2 Runtime</h2>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            <span className="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-widest">Manual Refresh Mode</span>
          </div>
          <p className="text-sm opacity-60 max-w-xl">Monitor and control your application processes in real-time.</p>
        </div>
        <Button 
          variant="outline" 
          className="border-[#141414] rounded-none gap-2 h-12 px-6 font-mono text-[10px] uppercase tracking-widest"
          onClick={fetchProcesses}
          disabled={loading}
        >
          <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh List
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {!vpsStatus.connected ? (
          <div className="border border-[#141414] bg-white shadow-[6px_6px_0px_0px_rgba(20,20,20,1)] p-12 flex flex-col items-center justify-center text-center space-y-4">
            <Activity className="w-12 h-12 opacity-20 animate-pulse" />
            <div className="space-y-1">
              <h3 className="text-xl font-bold uppercase tracking-tight italic font-serif">Server Disconnected</h3>
              <p className="text-xs opacity-60 font-mono uppercase tracking-widest">Connect your VPS to monitor real-time processes.</p>
            </div>
          </div>
        ) : processes.length === 0 && !loading ? (
          <div className="border border-[#141414] bg-white shadow-[6px_6px_0px_0px_rgba(20,20,20,1)] p-12 flex flex-col items-center justify-center text-center space-y-4">
            <List className="w-12 h-12 opacity-20" />
            <div className="space-y-1">
              <h3 className="text-xl font-bold uppercase tracking-tight italic font-serif">No Processes Found</h3>
              <p className="text-xs opacity-60 font-mono uppercase tracking-widest">PM2 is running but no active processes were detected.</p>
            </div>
          </div>
        ) : (
          processes.map((proc) => (
            <div key={proc.id} className="border border-[#141414] bg-white shadow-[6px_6px_0px_0px_rgba(20,20,20,1)] p-6 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6 flex-1">
                <div className="w-12 h-12 bg-[#141414] text-[#E4E3E0] flex items-center justify-center font-mono font-bold text-xl">
                  {proc.id}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold uppercase tracking-tight italic font-serif">{proc?.name}</h3>
                    {proc.git?.isRepo ? (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded-none border border-blue-500/20">
                        <GitPullRequest className="w-3 h-3" />
                        <span className="text-[9px] font-mono font-bold uppercase">{proc.git.branch}</span>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setConnectingGit({ cwd: proc?.git?.cwd || '', name: proc?.name || '' })}
                        className="text-[8px] font-mono font-bold uppercase text-gray-400 hover:text-[#141414] transition-colors flex items-center gap-1"
                      >
                        <GitPullRequest className="w-2.5 h-2.5" />
                        Connect Git
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 ${proc.pm2_env.status === 'online' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                      {proc.pm2_env.status}
                    </span>
                    <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 bg-[#141414]/5 opacity-60">
                      {proc.pm2_env.exec_mode.replace('_mode', '')}
                    </span>
                    <span className="text-[9px] font-mono opacity-40 uppercase tracking-widest">Restarts: {proc.pm2_env.restart_time}</span>
                    {proc.pm2_env.status === 'online' && (
                      <span className="text-[9px] font-mono opacity-40 uppercase tracking-widest">Port: {processes.find(p => p.id === proc.id)?.pm2_env?.exec_mode === 'fork' ? 'N/A' : 'Active'}</span>
                    )}
                  </div>
                  {proc.git?.isRepo && (
                    <div className="flex items-center gap-2">
                      <div className="text-[8px] font-mono opacity-40 truncate max-w-md">
                        {proc.git.remoteUrl} • {proc.git.lastCommit}
                      </div>
                      <button 
                        onClick={() => {
                          setConnectingGit({ cwd: proc.git?.cwd || '', name: proc.name });
                          setRepoUrl(proc.git?.remoteUrl || '');
                        }}
                        className="text-[8px] font-mono font-bold uppercase text-blue-500 hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-12">
                <div className="flex flex-col items-center gap-1">
                  <Cpu className="w-4 h-4 opacity-20" />
                  <span className="text-[10px] font-mono font-bold">{proc.monitored.cpu}%</span>
                  <span className="text-[8px] font-mono uppercase opacity-40">CPU</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <HardDrive className="w-4 h-4 opacity-20" />
                  <span className="text-[10px] font-mono font-bold">{formatMemory(proc.monitored.memory)}</span>
                  <span className="text-[8px] font-mono uppercase opacity-40">MEM</span>
                </div>
                <div className="w-px h-10 bg-[#141414]/10 hidden md:block" />
                <div className="flex items-center gap-3">
                  {proc.git?.isRepo && (
                    <div className="flex items-center gap-2">
                      <Button 
                        onClick={() => handleGitPull(proc?.name || '', proc?.id)}
                        variant="outline"
                        className="border-[#141414] rounded-none h-10 px-4 font-mono text-[9px] uppercase tracking-widest flex items-center gap-2 hover:bg-[#141414] hover:text-[#E4E3E0]"
                        title="Pull & Build"
                      >
                        <GitPullRequest className="w-3 h-3" />
                        Pull
                      </Button>
                      <Button 
                        onClick={() => handleBuild(proc?.name || '', proc?.id)}
                        variant="outline"
                        className="border-[#141414] rounded-none h-10 px-4 font-mono text-[9px] uppercase tracking-widest flex items-center gap-2 hover:bg-[#141414] hover:text-[#E4E3E0]"
                        title="Run Build Command"
                      >
                        <Activity className="w-3 h-3" />
                        Build
                      </Button>
                      <Button 
                        onClick={() => handleGitReset(proc?.name || '', proc?.id, proc?.git?.branch || 'main')}
                        variant="outline"
                        className="border-red-500/50 text-red-600 rounded-none h-10 px-4 font-mono text-[9px] uppercase tracking-widest flex items-center gap-2 hover:bg-red-500 hover:text-white"
                        title="Force reset to remote & Build (destroys local changes)"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset
                      </Button>
                    </div>
                  )}
                  <Button 
                    onClick={() => handleRestart(proc?.id)}
                    variant="outline"
                    className="border-[#141414] rounded-none h-10 px-4 font-mono text-[9px] uppercase tracking-widest flex items-center gap-2 hover:bg-[#141414] hover:text-[#E4E3E0]"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restart
                  </Button>
                  <Button 
                    onClick={() => handleStop(proc?.id)}
                    variant="outline"
                    className="border-[#141414] rounded-none h-10 px-4 font-mono text-[9px] uppercase tracking-widest flex items-center gap-2 hover:bg-yellow-500 hover:text-white"
                  >
                    <Play className="w-3 h-3 rotate-90" />
                    Stop
                  </Button>
                  <Button 
                    onClick={() => handleDelete(proc?.id)}
                    variant="outline"
                    className="border-red-500/50 text-red-600 rounded-none h-10 px-4 font-mono text-[9px] uppercase tracking-widest flex items-center gap-2 hover:bg-red-600 hover:text-white"
                  >
                    <List className="w-3 h-3" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {connectingGit && (
        <div className="fixed inset-0 bg-[#141414]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#E4E3E0] border border-[#141414] shadow-[12px_12px_0px_0px_rgba(20,20,20,1)] w-full max-w-md p-8 space-y-6">
            <div className="space-y-1">
              <h3 className="text-2xl font-bold uppercase tracking-tighter italic font-serif">
                {processes.find(p => p.git?.cwd === connectingGit?.cwd)?.git?.isRepo ? 'Update Git Remote' : 'Connect Git'}
              </h3>
              <p className="text-[10px] font-mono uppercase tracking-widest opacity-50">
                {processes.find(p => p.git?.cwd === connectingGit?.cwd)?.git?.isRepo 
                  ? `Change repository URL for ${connectingGit?.name}` 
                  : `Initialize Git for ${connectingGit?.name}`}
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest opacity-60">Repository URL</label>
              <input 
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/user/repo.git"
                className="w-full h-12 px-4 border border-[#141414] bg-white rounded-none focus:outline-none font-mono text-xs"
              />
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={handleConnectGit}
                className="flex-1 bg-[#141414] text-[#E4E3E0] hover:bg-[#141414]/90 rounded-none h-12 font-mono text-[10px] uppercase tracking-widest"
              >
                {processes.find(p => p.git?.cwd === connectingGit?.cwd)?.git?.isRepo ? 'Update URL' : 'Connect Repository'}
              </Button>
              <Button 
                onClick={() => setConnectingGit(null)}
                variant="outline"
                className="flex-1 border-[#141414] rounded-none h-12 font-mono text-[10px] uppercase tracking-widest"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {vpsStatus.connected && (
        <div className="bg-[#141414] p-8 text-[#E4E3E0] space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <Terminal className="w-5 h-5 opacity-40" />
            <h3 className="text-sm font-bold uppercase tracking-widest italic">Quick Commands</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tight">
                <GitPullRequest className="w-4 h-4 text-blue-400" />
                Git Pull (All Projects)
              </div>
              <p className="text-[10px] opacity-40 font-mono">Fetch and merge latest changes from remote repositories.</p>
              <Button 
                onClick={handlePullAll}
                variant="outline" 
                className="w-full border-white/20 text-white hover:bg-white/10 rounded-none h-10 text-[9px] uppercase font-bold tracking-widest"
              >
                Execute sudo git pull
              </Button>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tight">
                <Activity className="w-4 h-4 text-yellow-400" />
                Build (All Projects)
              </div>
              <p className="text-[10px] opacity-40 font-mono">Run build commands for all projects in the list.</p>
              <Button 
                onClick={handleBuildAll}
                variant="outline" 
                className="w-full border-white/20 text-white hover:bg-white/10 rounded-none h-10 text-[9px] uppercase font-bold tracking-widest"
              >
                Execute Build Commands
              </Button>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tight">
                <Activity className="w-4 h-4 text-green-400" />
                PM2 Status Check
              </div>
              <p className="text-[10px] opacity-40 font-mono">Refresh all process metrics and health indicators.</p>
              <Button 
                onClick={fetchProcesses}
                variant="outline" 
                className="w-full border-white/20 text-white hover:bg-white/10 rounded-none h-10 text-[9px] uppercase font-bold tracking-widest"
              >
                Execute sudo pm2 list
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
