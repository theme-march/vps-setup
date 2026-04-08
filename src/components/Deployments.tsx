import React, { useState, useEffect } from 'react';
import { History, Activity, CheckCircle2, XCircle, Clock, ExternalLink, Terminal, Trash2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Deployment {
  _id: string;
  projectId: {
    _id: string;
    name: string;
  };
  status: 'building' | 'success' | 'failed';
  createdAt: string;
  finishedAt?: string;
}

export function Deployments() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchDeployments = async () => {
    try {
      const response = await fetch('/api/deployments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setDeployments(data);
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to fetch deployments', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(deployments.length / ITEMS_PER_PAGE));
  const paginatedDeployments = deployments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    fetchDeployments();
  }, []);

  const handleStop = async (id: string) => {
    try {
      const response = await fetch(`/api/deployments/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: 'failed' })
      });

      if (response.ok) {
        toast.success('Deployment stopped');
        fetchDeployments();
      } else {
        toast.error('Failed to stop deployment');
      }
    } catch (error) {
      toast.error('Error stopping deployment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deployment record?')) return;

    try {
      const response = await fetch(`/api/deployments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success('Deployment record deleted');
        fetchDeployments();
      } else {
        toast.error('Failed to delete deployment');
      }
    } catch (error) {
      toast.error('Error deleting deployment');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="w-8 h-8 animate-spin opacity-20" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight font-serif italic mb-2">Deployment History</h2>
        <p className="text-sm opacity-60">Track all build and deployment activities.</p>
      </div>

      <div className="border border-[#141414] bg-white/50 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#141414] bg-[#141414]/5">
              <th className="p-4 text-[10px] font-mono uppercase tracking-[0.2em] opacity-50">Project</th>
              <th className="p-4 text-[10px] font-mono uppercase tracking-[0.2em] opacity-50">Status</th>
              <th className="p-4 text-[10px] font-mono uppercase tracking-[0.2em] opacity-50">Started</th>
              <th className="p-4 text-[10px] font-mono uppercase tracking-[0.2em] opacity-50">Duration</th>
              <th className="p-4 text-[10px] font-mono uppercase tracking-[0.2em] opacity-50">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#141414]/10">
            {deployments.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-30">
                    <History className="w-12 h-12" />
                    <p className="text-sm font-bold uppercase tracking-widest italic">No deployments yet</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedDeployments.map((deployment) => (
                <tr key={deployment._id} className="hover:bg-[#141414]/5 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#141414] p-1.5 rounded-sm">
                        <Terminal className="w-3 h-3 text-[#E4E3E0]" />
                      </div>
                      <span className="font-bold uppercase tracking-tight text-sm italic">{deployment.projectId?.name || 'Deleted Project'}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className={cn(
                      "flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest",
                      deployment.status === 'success' ? "text-green-600" : 
                      deployment.status === 'failed' ? "text-red-600" : "text-blue-600"
                    )}>
                      {deployment.status === 'success' && <CheckCircle2 className="w-3 h-3" />}
                      {deployment.status === 'failed' && <XCircle className="w-3 h-3" />}
                      {deployment.status === 'building' && <Activity className="w-3 h-3 animate-spin" />}
                      {deployment.status}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-xs font-mono opacity-60">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(deployment.createdAt), { addSuffix: true })}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-xs font-mono opacity-60">
                      {deployment.finishedAt 
                        ? `${Math.round((new Date(deployment.finishedAt).getTime() - new Date(deployment.createdAt).getTime()) / 1000)}s`
                        : '--'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="rounded-none hover:bg-[#141414] hover:text-[#E4E3E0] gap-2 text-[10px] uppercase font-bold tracking-widest">
                        <ExternalLink className="w-3 h-3" />
                        Logs
                      </Button>
                      
                      {deployment.status === 'building' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleStop(deployment._id)}
                          className="rounded-none hover:bg-orange-600 hover:text-white gap-2 text-[10px] uppercase font-bold tracking-widest text-orange-600"
                        >
                          <Square className="w-3 h-3 fill-current" />
                          Stop
                        </Button>
                      )}

                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(deployment._id)}
                        className="rounded-none hover:bg-red-600 hover:text-white gap-2 text-[10px] uppercase font-bold tracking-widest text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {deployments.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#141414]/10 bg-[#141414]/5">
            <span className="text-[10px] font-mono uppercase tracking-widest opacity-50">
              Page {currentPage} of {totalPages}
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="rounded-none text-[10px] uppercase font-bold tracking-widest"
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="rounded-none text-[10px] uppercase font-bold tracking-widest"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
