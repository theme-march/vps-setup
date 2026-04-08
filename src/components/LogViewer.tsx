import React, { useEffect, useState, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { io } from 'socket.io-client';

interface LogViewerProps {
  projectId: string;
}

export function LogViewer({ projectId }: LogViewerProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = io();

    socket.emit('join-project-logs', projectId);

    socket.on('log', (message: string) => {
      setLogs((prev) => [...prev, message]);
    });

    return () => {
      socket.disconnect();
    };
  }, [projectId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="bg-[#141414] text-[#E4E3E0] p-4 font-mono text-[11px] h-[400px] border border-[#141414] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-[#141414]/20 z-10" />
      <ScrollArea className="h-full w-full">
        <div className="space-y-1">
          {logs.length === 0 && (
            <div className="opacity-40 animate-pulse">Waiting for logs...</div>
          )}
          {logs.map((log, i) => (
            <div key={i} className="whitespace-pre-wrap leading-relaxed">
              <span className="opacity-30 mr-3">[{i + 1}]</span>
              {log}
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
