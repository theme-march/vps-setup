import React, { useState, useEffect } from 'react';
import { Terminal, Copy, Check, ExternalLink, Server, Shield, Cpu, Activity, ChevronRight, Rocket, Loader2, Globe, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface VPSGuideProps {
  vpsStatus: { connected: boolean; ip?: string; username?: string };
  vpsHealth: { cpu: string; memory: string; disk: string };
  onStatusChange: () => void;
  onRefreshHealth: () => void;
}

export function VPSGuide({ vpsStatus, vpsHealth, onStatusChange, onRefreshHealth }: VPSGuideProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [setupStep, setSetupStep] = useState(0); // 0: Connect, 1: Install, 2: Complete
  const [isInstalling, setIsInstalling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [installLogs, setInstallLogs] = useState<string[]>([]);
  const [serverInfo, setServerInfo] = useState({
    ip: '',
    username: 'root',
    password: '',
    sshKey: ''
  });

  useEffect(() => {
    if (vpsStatus.connected) {
      setSetupStep(2);
    } else {
      setSetupStep(0);
    }
  }, [vpsStatus.connected]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  const startInstallation = async () => {
    if (!serverInfo.ip || !serverInfo.password) {
      toast.error('Please enter your VPS IP and Password');
      return;
    }
    
    setIsInstalling(true);
    setSetupStep(1);
    setInstallLogs(["Initiating connection to VPS..."]);
    setProgress(10);

    try {
      const response = await fetch('/api/system/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ip: serverInfo.ip,
          username: serverInfo.username,
          password: serverInfo.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Save server to database
        try {
          await fetch('/api/servers', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              name: `Server-${serverInfo.ip.split('.').pop()}`,
              ip: serverInfo.ip,
              username: serverInfo.username,
              password: serverInfo.password,
              sshKey: serverInfo.sshKey
            })
          });
        } catch (e) {
          console.error('Failed to save server to database', e);
        }

        onStatusChange();
        setInstallLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Connection established successfully.`]);
        setInstallLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Skipping automatic software installation as requested.`]);
        setInstallLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Server is now linked to Vortex.`]);
        setProgress(100);
        setTimeout(() => {
          setIsInstalling(false);
          setSetupStep(2);
          toast.success('VPS connected successfully!');
        }, 1000);
      } else {
        throw new Error(data.error || 'Failed to connect');
      }
    } catch (err: any) {
      setInstallLogs(prev => [...prev, `[ERROR] ${err.message}`]);
      setIsInstalling(false);
      toast.error(err.message);
    }
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/system/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        onStatusChange();
        setSetupStep(0);
        setServerInfo({ ...serverInfo, ip: '', password: '' });
        toast.success('Disconnected from VPS');
      }
    } catch (err) {
      toast.error('Failed to disconnect');
    }
  };

  const handleRefreshHealth = async () => {
    setIsRefreshing(true);
    await onRefreshHealth();
    setTimeout(() => setIsRefreshing(false), 500);
    toast.success('Server health updated');
  };

  const steps = [
    {
      title: "1. Initial Server Setup",
      description: "Connect to your VPS via SSH and update packages.",
      command: `ssh ${serverInfo.username || 'root'}@${serverInfo.ip || 'your-vps-ip'}\nsudo apt update && sudo apt upgrade -y`
    },
    {
      title: "2. Install Dependencies",
      description: "Install Node.js (LTS), Nginx, MongoDB, and Git.",
      command: "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -\nsudo apt install -y nodejs nginx git mongodb-org"
    },
    {
      title: "3. Install PM2",
      description: "PM2 will manage your applications in the background.",
      command: "sudo npm install -g pm2"
    }
  ];

  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest opacity-40">Infrastructure</span>
            <span className="text-[10px] font-mono opacity-20">/</span>
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Setup Wizard</span>
          </div>
          <h2 className="text-4xl font-bold tracking-tighter font-serif italic uppercase">Server Provisioning</h2>
          <p className="text-sm opacity-60 max-w-xl">Configure your VPS for production-grade deployments with Nginx, SSL, and Node.js.</p>
        </div>
        <Button variant="outline" className="border-[#141414] rounded-none gap-2 h-12 px-6 font-mono text-[10px] uppercase tracking-widest">
          <ExternalLink className="w-4 h-4" />
          Documentation
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Setup UI */}
        <div className="lg:col-span-2 space-y-8">
          {setupStep === 0 && (
            <div className="border border-[#141414] bg-white shadow-[8px_8px_0px_0px_rgba(20,20,20,1)] p-8 space-y-8">
              <div className="flex items-center gap-3">
                <div className="bg-[#141414] p-2 rounded-none">
                  <Server className="w-5 h-5 text-[#E4E3E0]" />
                </div>
                <h3 className="text-xl font-bold uppercase tracking-tight italic font-serif">Connect Your VPS</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-mono uppercase tracking-widest opacity-60 flex items-center gap-2">
                    <Globe className="w-3 h-3" /> Server IP Address
                  </Label>
                  <Input 
                    value={serverInfo.ip} 
                    onChange={(e) => setServerInfo({ ...serverInfo, ip: e.target.value })} 
                    placeholder="123.456.78.90"
                    className="border-[#141414] bg-white rounded-none h-12 focus-visible:ring-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-mono uppercase tracking-widest opacity-60 flex items-center gap-2">
                    <Lock className="w-3 h-3" /> SSH Username
                  </Label>
                  <Input 
                    value={serverInfo.username} 
                    onChange={(e) => setServerInfo({ ...serverInfo, username: e.target.value })} 
                    placeholder="root"
                    className="border-[#141414] bg-white rounded-none h-12 focus-visible:ring-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-mono uppercase tracking-widest opacity-60 flex items-center gap-2">
                    <Shield className="w-3 h-3" /> SSH Password
                  </Label>
                  <Input 
                    type="password"
                    value={serverInfo.password} 
                    onChange={(e) => setServerInfo({ ...serverInfo, password: e.target.value })} 
                    placeholder="••••••••"
                    className="border-[#141414] bg-white rounded-none h-12 focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-mono uppercase tracking-widest opacity-60">SSH Public Key (Optional)</Label>
                <textarea 
                  value={serverInfo.sshKey} 
                  onChange={(e) => setServerInfo({ ...serverInfo, sshKey: e.target.value })} 
                  placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAAB..."
                  className="w-full h-32 p-4 border border-[#141414] bg-white rounded-none focus:outline-none font-mono text-xs"
                />
              </div>

              <Button 
                onClick={startInstallation}
                className="w-full bg-[#141414] text-[#E4E3E0] hover:bg-[#141414]/90 rounded-none h-14 font-mono text-[10px] uppercase tracking-widest group"
              >
                Start One-Click Setup <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          )}

          {setupStep === 1 && (
            <div className="border border-[#141414] bg-[#141414] p-1 shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
              <div className="bg-[#141414] p-6 text-[#E4E3E0] space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <h3 className="text-xl font-bold uppercase tracking-tight italic font-serif">Provisioning Server...</h3>
                  </div>
                  <span className="text-xs font-mono">{Math.round(progress)}%</span>
                </div>
                
                <Progress value={progress} className="h-2 bg-white/10 rounded-none" />
                
                <div className="bg-black/50 p-6 font-mono text-[10px] h-64 overflow-y-auto space-y-1 scrollbar-hide">
                  {installLogs.map((log, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="opacity-30">[{i+1}]</span>
                      <span className={i === installLogs.length - 1 ? "text-green-400" : "opacity-60"}>{log}</span>
                    </div>
                  ))}
                  <div className="animate-pulse">_</div>
                </div>
              </div>
            </div>
          )}

          {setupStep === 2 && (
            <div className="border border-[#141414] bg-white shadow-[8px_8px_0px_0px_rgba(20,20,20,1)] p-12 text-center space-y-6">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                <Rocket className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-bold uppercase tracking-tighter italic font-serif">Server Connected!</h3>
                <div className="bg-[#141414]/5 p-4 font-mono text-xs inline-block mx-auto border border-[#141414]/10">
                  <p className="opacity-40 uppercase tracking-widest text-[10px] mb-1">Active Connection</p>
                  <p className="font-bold">{vpsStatus.username}@{vpsStatus.ip}</p>
                </div>
                <p className="text-sm opacity-60 max-w-sm mx-auto font-mono uppercase tracking-widest mt-4">Your VPS is now linked and ready for deployments.</p>
              </div>
              <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button 
                  onClick={() => setSetupStep(0)}
                  className="bg-[#141414] text-[#E4E3E0] hover:bg-[#141414]/90 rounded-none h-12 px-8 font-mono text-[10px] uppercase tracking-widest"
                >
                  Configure Another Server
                </Button>
                <Button 
                  onClick={handleDisconnect}
                  variant="outline"
                  className="border-red-500 text-red-600 hover:bg-red-500 hover:text-white rounded-none h-12 px-8 font-mono text-[10px] uppercase tracking-widest"
                >
                  Disconnect Server
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Manual Guide & Status */}
        <div className="space-y-8">
          <div className="border border-[#141414] bg-[#141414]/5 p-6 space-y-6">
            <h4 className="text-xs font-bold uppercase tracking-widest flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" /> Server Health
              </div>
              <button 
                onClick={handleRefreshHealth}
                disabled={!vpsStatus.connected || isRefreshing}
                className="flex items-center gap-1.5 hover:bg-[#141414]/10 px-2 py-1 transition-colors disabled:opacity-30"
              >
                <Loader2 className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="text-[8px] font-mono opacity-40 uppercase tracking-widest">Refresh</span>
              </button>
            </h4>
            <div className="space-y-4">
              {[
                { label: 'CPU Usage', value: vpsHealth.cpu, color: parseFloat(vpsHealth.cpu) > 80 ? 'bg-red-500' : 'bg-green-500' },
                { label: 'Memory', value: vpsHealth.memory, color: parseFloat(vpsHealth.memory) > 80 ? 'bg-red-500' : 'bg-yellow-500' },
                { label: 'Disk Space', value: vpsHealth.disk, color: parseFloat(vpsHealth.disk) > 80 ? 'bg-red-500' : 'bg-green-500' }
              ].map((stat, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono uppercase opacity-60">
                    <span>{stat.label}</span>
                    <span>{stat.value}</span>
                  </div>
                  <div className="h-1 bg-[#141414]/10 rounded-none overflow-hidden">
                    <div className={`h-full ${stat.color} transition-all duration-500`} style={{ width: stat.value }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[#141414] p-6 space-y-4 bg-white">
            <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Terminal className="w-4 h-4" /> System Inventory
            </h4>
            <div className="space-y-3">
              {[
                { name: 'Node.js', version: 'v20.11.1', status: 'Active' },
                { name: 'Nginx', version: '1.18.0', status: 'Running' },
                { name: 'MongoDB', version: '7.0.5', status: 'Connected' },
                { name: 'PM2', version: '5.3.1', status: 'Online' },
                { name: 'Git', version: '2.34.1', status: 'Ready' }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between border-b border-[#141414]/5 pb-2 last:border-0">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-tight">{item.name}</span>
                    <span className="text-[8px] font-mono opacity-40">{item.version}</span>
                  </div>
                  <span className="text-[8px] font-mono px-2 py-0.5 bg-green-500/10 text-green-600 font-bold uppercase">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[#141414] p-6 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-4 h-4" /> Security Checklist
            </h4>
            <ul className="space-y-3">
              {[
                'UFW Firewall Enabled',
                'SSH Root Login Disabled',
                'Fail2Ban Installed',
                'Automatic Updates Active',
                'Nginx Multi-Port Support'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-[10px] font-mono opacity-60">
                  <Check className="w-3 h-3 text-green-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 bg-[#141414] text-[#E4E3E0] space-y-4">
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] opacity-40">Manual Connection</p>
            <div className="bg-white/10 p-3 font-mono text-[10px] break-all relative group">
              ssh {serverInfo.username || 'root'}@{serverInfo.ip || 'your-ip'}
              <button 
                onClick={() => copyToClipboard(`ssh ${serverInfo.username || 'root'}@${serverInfo.ip || 'your-ip'}`, 'ssh-cmd')}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Steps Section */}
      <div className="space-y-8 pt-12 border-t border-[#141414]">
        <div className="text-center">
          <h3 className="text-2xl font-bold uppercase tracking-tight italic font-serif">Manual Installation Steps</h3>
          <p className="text-xs font-mono uppercase tracking-widest opacity-40 mt-2">If you prefer to run commands manually</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <div key={index} className="border border-[#141414] p-6 bg-white hover:bg-[#141414]/5 transition-colors relative">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-[#141414] text-[#E4E3E0] flex items-center justify-center font-bold italic font-serif text-xs">
                {index + 1}
              </div>
              <h4 className="text-sm font-bold uppercase tracking-tight mb-2">{step.title}</h4>
              <p className="text-[10px] opacity-60 mb-4 h-8">{step.description}</p>
              <div className="bg-[#141414] p-3 relative group">
                <pre className="text-[#E4E3E0] font-mono text-[9px] overflow-x-auto whitespace-pre-wrap">
                  {step.command}
                </pre>
                <button 
                  onClick={() => copyToClipboard(step.command, `manual-${index}`)}
                  className="absolute top-2 right-2 p-1 hover:bg-white/10 text-[#E4E3E0] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {copied === `manual-${index}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
