import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExternalLink, GitBranch, Play, Clock, Terminal, Globe, Trash2, Github, MoreVertical, Settings } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { LogViewer } from '@/components/LogViewer';
import { formatDistanceToNow } from 'date-fns';

interface Project {
  _id: string;
  name: string;
  repoUrl: string;
  branch: string;
  status: 'idle' | 'building' | 'success' | 'failed';
  port?: string;
  internalPort?: number;
  customDomain?: string;
  serverId?: {
    ip: string;
    name: string;
  };
  lastDeployment?: {
    createdAt: string;
  };
  stats?: {
    cpu: string;
    memory: string;
    uptime: string;
  };
}

export function ProjectList({ refreshTrigger }: { refreshTrigger: number }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      const { data } = await api.get('/projects');
      // Adding mock stats for visual representation if not present
      const projectsWithStats = data.map((p: Project) => ({
        ...p,
        stats: p.stats || {
          cpu: p.status === 'success' ? `${Math.floor(Math.random() * 5)}%` : '0%',
          memory: p.status === 'success' ? `${(Math.random() * 100 + 20).toFixed(1)}MB` : '0MB',
          uptime: p.status === 'success' ? `${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m` : '0m'
        }
      }));
      setProjects(projectsWithStats);
    } catch (err: any) {
      toast.error('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [refreshTrigger]);

  const handleDeploy = async (id: string) => {
    try {
      await api.post(`/projects/${id}/deploy`);
      toast.info('Deployment triggered');
      setSelectedProject(id);
      fetchProjects();
    } catch (err: any) {
      toast.error('Failed to trigger deployment');
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteProject(id);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map(i => (
          <div key={i} className="h-64 bg-[#141414]/5 animate-pulse border border-[#141414]/10" />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-32 border border-dashed border-[#141414]/20 bg-white/30">
        <div className="bg-[#141414] w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
          <Terminal className="w-6 h-6 text-[#E4E3E0]" />
        </div>
        <h3 className="text-lg font-bold uppercase tracking-tight italic font-serif mb-2">No Projects Yet</h3>
        <p className="text-xs font-mono uppercase tracking-widest opacity-40 max-w-xs mx-auto">
          Connect your GitHub repository to start deploying to your VPS.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {projects.map((project) => (
          <Card key={project._id} className="border-[#141414] bg-white rounded-none shadow-[8px_8px_0px_0px_rgba(20,20,20,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_0px_rgba(20,20,20,1)] transition-all duration-200 group overflow-hidden">
            <CardHeader className="border-b border-[#141414] p-6 pb-4 bg-[#141414]/5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-bold tracking-tighter uppercase italic font-serif flex items-center gap-2">
                    {project?.name}
                    {project?.status === 'success' && (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <a 
                      href={project?.repoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 flex items-center gap-1 transition-opacity"
                    >
                      <Github className="w-3 h-3" />
                      {project?.repoUrl?.split('/').pop()}
                    </a>
                    <span className="text-[10px] font-mono opacity-20">|</span>
                    <span className="text-[10px] font-mono uppercase tracking-widest opacity-40 flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      {project?.branch}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 hover:bg-[#141414]/5 rounded-none"
                    onClick={() => setEditProject(project)}
                  >
                    <Settings className="w-3.5 h-3.5 opacity-40" />
                  </Button>
                  <Badge 
                    className={`rounded-none font-mono text-[9px] uppercase tracking-widest px-3 py-1 ${
                      project.status === 'success' ? 'bg-green-600 text-white' :
                      project.status === 'failed' ? 'bg-red-600 text-white' :
                      project.status === 'building' ? 'bg-blue-600 text-white animate-pulse' :
                      'bg-[#141414] text-[#E4E3E0]'
                    }`}
                  >
                    {project.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* PM2-like Stats Row */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-[#141414]/5 border border-[#141414]/10">
                <div className="space-y-1">
                  <p className="text-[8px] font-mono uppercase tracking-widest opacity-40">CPU</p>
                  <p className="text-xs font-mono font-bold text-green-600">{project.stats?.cpu}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-mono uppercase tracking-widest opacity-40">Memory</p>
                  <p className="text-xs font-mono font-bold">{project.stats?.memory}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-mono uppercase tracking-widest opacity-40">Uptime</p>
                  <p className="text-xs font-mono font-bold">{project.stats?.uptime}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-mono uppercase tracking-widest opacity-40">Production URL</p>
                  <div className="flex items-center gap-2 group/url">
                    <Globe className="w-3 h-3 opacity-40" />
                    <span className="text-xs font-mono font-bold truncate">
                      {project?.customDomain || project?.serverId?.ip || `${project?.name}.vortex.io`}{project?.port && project?.port !== '80' ? `:${project?.port}` : ''}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-mono uppercase tracking-widest opacity-40">Last Deployment</p>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 opacity-40" />
                    <span className="text-xs font-mono font-bold">
                      {project?.lastDeployment ? formatDistanceToNow(new Date(project.lastDeployment.createdAt), { addSuffix: true }) : 'Never'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button 
                  className="flex-1 bg-[#141414] text-[#E4E3E0] hover:bg-[#141414]/90 rounded-none font-mono text-[10px] uppercase tracking-widest h-11"
                  onClick={() => handleDeploy(project?._id)}
                  disabled={project?.status === 'building'}
                >
                  <Play className="w-3 h-3 mr-2" />
                  Redeploy
                </Button>
                <Button 
                  variant="outline" 
                  className="border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] rounded-none font-mono text-[10px] uppercase tracking-widest h-11 px-6"
                  onClick={() => setSelectedProject(project?._id)}
                >
                  <Terminal className="w-3 h-3 mr-2" />
                  Logs
                </Button>
                {project.status === 'success' && (
                  <Button 
                    variant="outline" 
                    className="border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] rounded-none font-mono text-[10px] uppercase tracking-widest h-11 px-4"
                    onClick={() => {
                      const domain = project.customDomain || project.serverId?.ip || `${project.name}.vortex.io`;
                      const port = project.port && project.port !== '80' ? `:${project.port}` : '';
                      window.open(`http://${domain}${port}`, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  className="text-red-600 hover:bg-red-500/10 rounded-none h-11 px-3"
                  onClick={() => handleDelete(project?._id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedProject && (
        <div className="mt-12 border border-[#141414] bg-[#141414] p-1 shadow-[8px_8px_0px_0px_rgba(20,20,20,0.2)]">
          <div className="flex items-center justify-between p-4 bg-[#141414] text-[#E4E3E0]">
            <div className="flex items-center gap-3">
              <Terminal className="w-4 h-4" />
              <h3 className="text-xs font-mono uppercase tracking-widest font-bold italic">
                Build Logs: {projects.find(p => p._id === selectedProject)?.name}
              </h3>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[10px] font-mono uppercase tracking-widest hover:bg-white/10 text-[#E4E3E0] rounded-none h-8"
              onClick={() => setSelectedProject(null)}
            >
              Close
            </Button>
          </div>
          <div className="bg-white p-1">
            <LogViewer projectId={selectedProject} />
          </div>
        </div>
      )}
      {editProject && (
        <EditProjectDialog 
          project={editProject} 
          open={!!editProject} 
          onOpenChange={(open) => !open && setEditProject(null)}
          onSuccess={() => {
            setEditProject(null);
            fetchProjects();
          }}
        />
      )}
      {deleteProject && (
        <DeleteProjectDialog 
          projectId={deleteProject}
          projectName={projects.find(p => p._id === deleteProject)?.name || ''}
          open={!!deleteProject}
          onOpenChange={(open) => !open && setDeleteProject(null)}
          onSuccess={() => {
            setDeleteProject(null);
            fetchProjects();
          }}
        />
      )}
    </div>
  );
}

interface DeleteProjectDialogProps {
  projectId: string;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function DeleteProjectDialog({ projectId, projectName, open, onOpenChange, onSuccess }: DeleteProjectDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/projects/${projectId}`);
      toast.success('Project deleted successfully');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] border-[#141414] bg-[#E4E3E0] rounded-none shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-8 pb-4">
          <DialogTitle className="text-2xl font-bold tracking-tighter uppercase italic font-serif text-red-600">
            Delete Project
          </DialogTitle>
          <DialogDescription className="text-[10px] font-mono uppercase tracking-widest opacity-50">
            This action cannot be undone. This will permanently delete the project and all its data from the server.
          </DialogDescription>
        </DialogHeader>
        <div className="p-8 pt-4 space-y-6">
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 font-mono text-[10px] uppercase tracking-widest leading-relaxed">
            Are you sure you want to delete <span className="font-bold underline">{projectName}</span>? 
            This will stop the PM2 process and remove the Nginx configuration.
          </div>
          <div className="flex gap-4">
            <Button 
              variant="outline"
              className="flex-1 border-[#141414] rounded-none h-12 font-mono text-[10px] uppercase tracking-widest"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              disabled={loading}
              className="flex-1 bg-red-600 text-white hover:bg-red-700 rounded-none font-mono text-[10px] uppercase tracking-widest h-12"
              onClick={handleDelete}
            >
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface EditProjectDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function EditProjectDialog({ project, open, onOpenChange, onSuccess }: EditProjectDialogProps) {
  const [formData, setFormData] = useState({
    name: project?.name || '',
    port: project?.port || '80',
    internalPort: project?.internalPort || 3000,
    customDomain: project?.customDomain || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch(`/projects/${project?._id}`, formData);
      toast.success('Project updated successfully!');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] border-[#141414] bg-[#E4E3E0] rounded-none shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-8 pb-4">
          <DialogTitle className="text-2xl font-bold tracking-tighter uppercase italic font-serif">
            Edit Project
          </DialogTitle>
          <DialogDescription className="text-[10px] font-mono uppercase tracking-widest opacity-50">
            Update your project configuration and port settings
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-mono uppercase tracking-widest opacity-60">Project Name</Label>
            <Input 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              className="border-[#141414] bg-white rounded-none h-12 focus-visible:ring-0"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-mono uppercase tracking-widest opacity-60">Server Port (External)</Label>
              <Input 
                value={formData.port} 
                onChange={(e) => setFormData({ ...formData, port: e.target.value })} 
                placeholder="5000"
                className="border-[#141414] bg-white font-mono text-xs rounded-none h-12 focus-visible:ring-0"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-mono uppercase tracking-widest opacity-60">Internal Port (PM2)</Label>
              <Input 
                type="number"
                value={formData.internalPort} 
                onChange={(e) => setFormData({ ...formData, internalPort: parseInt(e.target.value) || 0 })} 
                placeholder="3001"
                className="border-[#141414] bg-white font-mono text-xs rounded-none h-12 focus-visible:ring-0"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-mono uppercase tracking-widest opacity-60">Custom Domain (Optional)</Label>
            <Input 
              value={formData.customDomain} 
              onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })} 
              placeholder="app.yourdomain.com"
              className="border-[#141414] bg-white rounded-none h-12 focus-visible:ring-0"
            />
          </div>
          <div className="pt-4">
            <Button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#141414] text-[#E4E3E0] hover:bg-[#141414]/90 rounded-none font-mono text-[10px] uppercase tracking-widest h-12"
            >
              {loading ? 'Updating...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
