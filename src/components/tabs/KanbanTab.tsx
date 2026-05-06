'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { LayoutGrid, Loader2, Badge as BadgeIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHireMeOSStore } from '@/lib/store';

export default function KanbanTab() {
  const { applications, setApplications, isLoadingApplications } = useHireMeOSStore();

  const fetchApplications = useCallback(async () => {
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      setApplications(data.applications || []);
    } catch { /* ignore */ }
  }, [setApplications]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const handleStatusChange = async (number: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/applications/${number}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ new_status: newStatus }) });
      if (res.ok) { toast.success(`Moved to ${newStatus}`); fetchApplications(); }
    } catch { toast.error('Failed to update status'); }
  };

  const columns = [
    { id: 'Wishlist', title: 'Wishlist', color: 'from-slate-500/20 to-slate-600/10', border: 'border-slate-500/30' },
    { id: 'Applied', title: 'Applied', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
    { id: 'Screening', title: 'Screening', color: 'from-yellow-500/20 to-yellow-600/10', border: 'border-yellow-500/30' },
    { id: 'Interview', title: 'Interview', color: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/30' },
    { id: 'Offer', title: 'Offer', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
    { id: 'Rejected', title: 'Rejected', color: 'from-red-500/20 to-red-600/10', border: 'border-red-500/30' },
  ];

  if (isLoadingApplications) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-teal-400" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Kanban Board</h3>
          <p className="text-sm text-muted-foreground">Drag applications between columns or click status buttons to move</p>
        </div>
        <Badge variant="outline" className="border-border/50">{applications.length} total</Badge>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto">
        {columns.map(col => {
          const colApps = (applications || []).filter(a => a.status === col.id);
          return (
            <div key={col.id} className={`flex flex-col rounded-xl bg-gradient-to-b ${col.color} border ${col.border} min-h-[300px]`}>
              <div className="p-3 flex items-center justify-between border-b border-border/20">
                <span className="text-sm font-semibold">{col.title}</span>
                <Badge variant="secondary" className="text-xs h-5">{colApps.length}</Badge>
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {colApps.map(app => (
                  <motion.div key={app.number} layout className="p-2.5 rounded-lg bg-card/80 border border-border/30 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold truncate">{app.company}</p>
                      <p className="text-xs text-muted-foreground truncate">{app.role}</p>
                      <div className="flex items-center gap-1.5">
                        {app.score > 0 && (
                          <Badge className={`text-[10px] px-1.5 py-0 ${app.score >= 4 ? 'bg-emerald-500/20 text-emerald-400' : app.score >= 3 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                            {app.score.toFixed(1)}
                          </Badge>
                        )}
                        {(app as Record<string, unknown>).autoApplied && <Badge className="text-[10px] px-1.5 py-0 bg-teal-500/20 text-teal-400">Auto</Badge>}
                      </div>
                      {app.url && (
                        <a href={app.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-teal-400 hover:underline truncate block">
                          {app.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                        </a>
                      )}
                      <div className="flex gap-1 mt-1">
                        {columns.filter(c => c.id !== col.id).slice(0, 3).map(c => (
                          <button key={c.id} onClick={() => handleStatusChange(app.number, c.id)} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                            {c.title.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {colApps.length === 0 && (
                  <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50">
                    No applications
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
