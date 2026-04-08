import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Github, Globe, Box, Terminal, ChevronRight, Rocket, ShieldCheck } from 'lucide-react';

interface AddProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const FRAMEWORKS = [
  { id: 'react', name: 'React', icon: '⚛️', build: 'npm install && npm run build', output: 'dist' },
  { id: 'nextjs', name: 'Next.js', icon: '▲', build: 'npm install && npm run build', output: '.next' },
  { id: 'vite', name: 'Vite', icon: '⚡', build: 'npm install && npm run build', output: 'dist' },
  { id: 'nodejs', name: 'Node.js', icon: '🟢', build: 'npm install', output: '.' },
  { id: 'static', name: 'Static HTML', icon: '📄', build: 'echo "No build needed"', output: '.' },
];

export function AddProjectDialog({ open, onOpenChange, onSuccess }: AddProjectDialogProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    repoUrl: '',
    branch: 'main',
    buildCommand: 'npm install && npm run build',
    outputDir: 'dist',
    port: '80',
    internalPort: 3000,
    customDomain: '',
    framework: 'react',
    serverId: ''
  });
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchServers();
    } else {
      setStep(1);
    }
  }, [open]);

  const fetchServers = async () => {
    try {
      const response = await api.get('/servers');
      setServers(response.data);
      if (response.data.length > 0 && !formData.serverId) {
        setFormData(prev => ({ ...prev, serverId: response.data[0]._id }));
      }
    } catch (err) {
      console.error('Failed to fetch servers');
    }
  };

  const handleFrameworkChange = (val: string) => {
    const fw = FRAMEWORKS.find(f => f.id === val);
    if (fw) {
      setFormData({
        ...formData,
        framework: val,
        buildCommand: fw.build,
        outputDir: fw.output
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/projects', formData);
      toast.success('Deployment started successfully!');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] border-[#141414] bg-[#E4E3E0] rounded-none shadow-2xl p-0 overflow-hidden">
        <div className="flex h-[500px]">
          {/* Left Sidebar - Progress */}
          <div className="w-48 bg-[#141414] p-6 flex flex-col gap-8">
            <div className="flex items-center gap-2 text-[#E4E3E0]">
              <Rocket className="w-5 h-5" />
              <span className="font-serif italic font-bold text-sm">Deploy</span>
            </div>
            
            <div className="space-y-6">
              {[
                { s: 1, label: 'Import' },
                { s: 2, label: 'Configure' },
                { s: 3, label: 'Domain' }
              ].map((item) => (
                <div key={item.s} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-mono ${
                    step === item.s ? 'bg-[#E4E3E0] text-[#141414] border-[#E4E3E0]' : 
                    step > item.s ? 'bg-green-500 border-green-500 text-white' : 'border-white/20 text-white/40'
                  }`}>
                    {step > item.s ? '✓' : item.s}
                  </div>
                  <span className={`text-[10px] uppercase tracking-widest font-bold ${
                    step === item.s ? 'text-[#E4E3E0]' : 'text-white/40'
                  }`}>{item.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-6 border-t border-white/10">
              <div className="flex items-center gap-2 text-white/40 text-[9px] uppercase tracking-tighter">
                <ShieldCheck className="w-3 h-3" />
                <span>Secure VPS Deploy</span>
              </div>
            </div>
          </div>

          {/* Right Content - Form */}
          <div className="flex-1 flex flex-col">
            <DialogHeader className="p-8 pb-4">
              <DialogTitle className="text-2xl font-bold tracking-tighter uppercase italic font-serif">
                {step === 1 && "Import Project"}
                {step === 2 && "Build Settings"}
                {step === 3 && "Domain & SSL"}
              </DialogTitle>
              <DialogDescription className="text-[10px] font-mono uppercase tracking-widest opacity-50">
                {step === 1 && "Connect your repository to get started"}
                {step === 2 && "We've auto-detected your framework"}
                {step === 3 && "Finalize your production URL"}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 p-8 pt-4 overflow-y-auto">
              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-mono uppercase tracking-widest opacity-60 flex items-center gap-2">
                      <ShieldCheck className="w-3 h-3" /> Target Server
                    </Label>
                    <Select 
                      value={formData.serverId} 
                      onValueChange={(val) => setFormData({ ...formData, serverId: val })}
                    >
                      <SelectTrigger className="border-[#141414] bg-white rounded-none h-12 focus:ring-0">
                        <SelectValue placeholder="Select a server" />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-[#141414]">
                        {servers.map(server => (
                          <SelectItem key={server?._id} value={server?._id} className="focus:bg-[#141414] focus:text-[#E4E3E0] rounded-none">
                            {server?.name} ({server?.ip})
                          </SelectItem>
                        ))}
                        {servers.length === 0 && (
                          <div className="p-2 text-[10px] opacity-50 italic">No servers found. Add one in VPS Guide.</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-mono uppercase tracking-widest opacity-60 flex items-center gap-2">
                      <Github className="w-3 h-3" /> Repository URL
                    </Label>
                    <Input 
                      value={formData.repoUrl} 
                      onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })} 
                      placeholder="https://github.com/user/repo"
                      className="border-[#141414] bg-white rounded-none h-12 focus-visible:ring-0"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-mono uppercase tracking-widest opacity-60">Project Name</Label>
                      <Input 
                        value={formData.name} 
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                        placeholder="my-app"
                        className="border-[#141414] bg-white rounded-none h-12 focus-visible:ring-0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-mono uppercase tracking-widest opacity-60">Branch</Label>
                      <Input 
                        value={formData.branch} 
                        onChange={(e) => setFormData({ ...formData, branch: e.target.value })} 
                        className="border-[#141414] bg-white rounded-none h-12 focus-visible:ring-0"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-mono uppercase tracking-widest opacity-60 flex items-center gap-2">
                      <Box className="w-3 h-3" /> Framework Preset
                    </Label>
                    <Select value={formData.framework} onValueChange={handleFrameworkChange}>
                      <SelectTrigger className="border-[#141414] bg-white rounded-none h-12 focus:ring-0">
                        <SelectValue placeholder="Select framework" />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-[#141414]">
                        {FRAMEWORKS.map(fw => (
                          <SelectItem key={fw.id} value={fw.id} className="focus:bg-[#141414] focus:text-[#E4E3E0] rounded-none">
                            <span className="mr-2">{fw.icon}</span> {fw.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-mono uppercase tracking-widest opacity-60 flex items-center gap-2">
                      <Terminal className="w-3 h-3" /> Build Command
                    </Label>
                    <Input 
                      value={formData.buildCommand} 
                      onChange={(e) => setFormData({ ...formData, buildCommand: e.target.value })} 
                      className="border-[#141414] bg-white font-mono text-xs rounded-none h-12 focus-visible:ring-0"
                    />
                  </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-mono uppercase tracking-widest opacity-60">Output Directory</Label>
                        <Input 
                          value={formData.outputDir} 
                          onChange={(e) => setFormData({ ...formData, outputDir: e.target.value })} 
                          className="border-[#141414] bg-white font-mono text-xs rounded-none h-12 focus-visible:ring-0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-mono uppercase tracking-widest opacity-60">Server Port</Label>
                        <Input 
                          value={formData.port} 
                          onChange={(e) => setFormData({ ...formData, port: e.target.value })} 
                          placeholder="8080"
                          className="border-[#141414] bg-white font-mono text-xs rounded-none h-12 focus-visible:ring-0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-mono uppercase tracking-widest opacity-60">Internal Port</Label>
                        <Input 
                          type="number"
                          value={formData.internalPort} 
                          onChange={(e) => setFormData({ ...formData, internalPort: parseInt(e.target.value) || 0 })} 
                          className="border-[#141414] bg-white font-mono text-xs rounded-none h-12 focus-visible:ring-0"
                        />
                      </div>
                    </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-mono uppercase tracking-widest opacity-60 flex items-center gap-2">
                      <Globe className="w-3 h-3" /> Custom Domain (Optional)
                    </Label>
                    <Input 
                      value={formData.customDomain} 
                      onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })} 
                      placeholder="app.yourdomain.com"
                      className="border-[#141414] bg-white rounded-none h-12 focus-visible:ring-0"
                    />
                    <p className="text-[9px] opacity-40 italic">SSL will be automatically provisioned via Let's Encrypt.</p>
                  </div>
                  
                  <div className="p-4 border border-[#141414]/10 bg-white/30 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-tight">Deployment Summary</p>
                    <div className="grid grid-cols-2 gap-2 text-[9px] font-mono opacity-60">
                      <span>REPO: {formData.repoUrl.split('/').pop() || '---'}</span>
                      <span>BRANCH: {formData.branch}</span>
                      <span>PRESET: {formData.framework.toUpperCase()}</span>
                      <span>SSL: ENABLED</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 pt-0 flex items-center justify-between">
              {step > 1 ? (
                <Button 
                  variant="ghost" 
                  onClick={() => setStep(step - 1)}
                  className="rounded-none font-mono text-[10px] uppercase tracking-widest hover:bg-[#141414]/5"
                >
                  Back
                </Button>
              ) : (
                <div />
              )}
              
              {step < 3 ? (
                <Button 
                  onClick={() => setStep(step + 1)}
                  disabled={!formData.repoUrl || !formData.name}
                  className="bg-[#141414] text-[#E4E3E0] hover:bg-[#141414]/90 rounded-none font-mono text-[10px] uppercase tracking-widest px-8 h-12 group"
                >
                  Continue <ChevronRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-[#141414] text-[#E4E3E0] hover:bg-[#141414]/90 rounded-none font-mono text-[10px] uppercase tracking-widest px-8 h-12"
                >
                  {loading ? 'Deploying...' : 'Deploy Now'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
