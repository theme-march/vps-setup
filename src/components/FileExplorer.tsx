import React, { useState, useEffect } from 'react';
import { Folder, File, ChevronLeft, Search, RefreshCw, HardDrive, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  mtime?: string;
  permissions?: string;
  owner?: string;
  group?: string;
  error?: string;
}

export function FileExplorer() {
  const [currentPath, setCurrentPath] = useState('/opt');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isConnected, setIsConnected] = useState(true);

  const fetchFiles = async (path: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/system/files?path=${encodeURIComponent(path)}&remote=true`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setFiles(data.files);
        setCurrentPath(data.currentPath);
        setIsConnected(true);
      } else {
        if (response.status === 400 || data.error?.includes('SSH')) {
          setIsConnected(false);
        }
        toast.error(data.error || 'Failed to fetch files');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles(currentPath);
  }, []);

  const handleFolderClick = (path: string) => {
    fetchFiles(path);
  };

  const handleBack = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    fetchFiles(parentPath);
  };

  const formatSize = (bytes?: number) => {
    if (bytes === undefined) return '-';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  if (!isConnected) {
    return (
      <div className="space-y-8 max-w-6xl mx-auto">
        <div className="border border-[#141414] bg-white shadow-[8px_8px_0px_0px_rgba(20,20,20,1)] p-12 text-center space-y-6">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <HardDrive className="w-10 h-10 text-red-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold uppercase tracking-tighter italic font-serif">No Server Connected</h3>
            <p className="text-sm opacity-60 max-w-sm mx-auto font-mono uppercase tracking-widest">Please connect your VPS in the Setup Wizard to browse files.</p>
          </div>
          <div className="pt-6">
            <Button 
              className="bg-[#141414] text-[#E4E3E0] hover:bg-[#141414]/90 rounded-none h-12 px-8 font-mono text-[10px] uppercase tracking-widest"
            >
              Go to Setup Wizard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest opacity-40">System</span>
            <span className="text-[10px] font-mono opacity-20">/</span>
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold">File Explorer</span>
          </div>
          <h2 className="text-4xl font-bold tracking-tighter font-serif italic uppercase">FileSystem</h2>
          <p className="text-sm opacity-60 max-w-xl">Browse and manage files across your server infrastructure.</p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            className="border-[#141414] rounded-none gap-2 h-12 px-6 font-mono text-[10px] uppercase tracking-widest"
            onClick={() => fetchFiles(currentPath)}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="border border-[#141414] bg-white shadow-[8px_8px_0px_0px_rgba(20,20,20,1)] overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#141414] bg-[#141414]/5 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center gap-2 flex-1 w-full">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-none hover:bg-[#141414]/10"
              onClick={handleBack}
              disabled={currentPath === '/'}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 bg-white border border-[#141414] px-4 py-2 font-mono text-xs flex items-center gap-3">
              <HardDrive className="w-4 h-4 opacity-30" />
              <span className="opacity-60">{currentPath}</span>
            </div>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
            <Input 
              placeholder="Search files..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 border-[#141414] rounded-none h-10 bg-white font-mono text-xs"
            />
          </div>
        </div>

        {/* File List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#141414] bg-[#141414]/5">
                <th className="p-4 text-[10px] font-mono uppercase tracking-widest opacity-40">Name</th>
                <th className="p-4 text-[10px] font-mono uppercase tracking-widest opacity-40">Size</th>
                <th className="p-4 text-[10px] font-mono uppercase tracking-widest opacity-40">Permissions</th>
                <th className="p-4 text-[10px] font-mono uppercase tracking-widest opacity-40">Owner</th>
                <th className="p-4 text-[10px] font-mono uppercase tracking-widest opacity-40">Modified</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[11px]">
              {filteredFiles.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="p-12 text-center opacity-40 italic">
                    No files found in this directory.
                  </td>
                </tr>
              )}
              {filteredFiles.map((file, i) => (
                <tr 
                  key={i} 
                  className="border-b border-[#141414]/10 hover:bg-[#141414]/5 cursor-pointer transition-colors group"
                  onClick={() => file.isDirectory ? handleFolderClick(file.path) : null}
                >
                  <td className="p-4 flex items-center gap-3">
                    {file.isDirectory ? (
                      <Folder className="w-4 h-4 text-blue-600 fill-blue-600/20" />
                    ) : (
                      <File className="w-4 h-4 opacity-40" />
                    )}
                    <span className={file.isDirectory ? "font-bold" : ""}>{file.name}</span>
                    {file.error && <span className="text-[8px] text-red-500 uppercase font-bold">[{file.error}]</span>}
                  </td>
                  <td className="p-4 opacity-60">{file.isDirectory ? '-' : formatSize(file.size)}</td>
                  <td className="p-4 opacity-60">{file.permissions || '-'}</td>
                  <td className="p-4 opacity-60">{file.owner || 'root'}</td>
                  <td className="p-4 opacity-60">
                    {file.mtime ? new Date(file.mtime).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#141414] p-6 text-[#E4E3E0] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Terminal className="w-5 h-5 opacity-40" />
          <div className="space-y-1">
            <p className="text-[10px] font-mono uppercase tracking-widest opacity-40">Active Session</p>
            <p className="text-xs font-mono">root@vortex-server:{currentPath}# ll</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-mono uppercase tracking-widest opacity-40">Total Items</p>
          <p className="text-xl font-bold font-serif italic">{files.length}</p>
        </div>
      </div>
    </div>
  );
}
