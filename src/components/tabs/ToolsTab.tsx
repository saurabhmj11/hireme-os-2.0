'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Wrench, Play, Loader2, RefreshCw, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHireMeOSStore } from '@/lib/store';

export default function ToolsTab() {
  const { toolsResult, setToolsResult, isRunningTool, setIsRunningTool } = useHireMeOSStore();
  const handleTool = async (tool: string) => {
    setIsRunningTool(true); setToolsResult(null);
    try {
      const res = await fetch(`/api/tools/${tool}`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await res.json(); setToolsResult(JSON.stringify(data, null, 2)); toast.success(`${tool} completed`);
    } catch { toast.error(`Failed to run ${tool}`); }
    finally { setIsRunningTool(false); }
  };
  const tools = [
    { id: 'dedup', label: 'Dedup', desc: 'Remove duplicate applications', icon: RefreshCw },
    { id: 'merge', label: 'Merge', desc: 'Merge application data sources', icon: Briefcase },
    { id: 'normalize', label: 'Normalize', desc: 'Standardize names and statuses', icon: Wrench },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{tools.map(tool => (
        <Card key={tool.id} className="border-border/50 bg-card/80 backdrop-blur-sm hover:border-teal-500/30 transition-colors">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><tool.icon className="h-4 w-4 text-teal-400" />{tool.label}</CardTitle><CardDescription className="text-xs">{tool.desc}</CardDescription></CardHeader>
          <CardContent><Button onClick={() => handleTool(tool.id)} disabled={isRunningTool} className="bg-teal-600 hover:bg-teal-700 text-white w-full">{isRunningTool ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}Run {tool.label}</Button></CardContent>
        </Card>
      ))}</div>
      <AnimatePresence>{toolsResult && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        <Card className="border-teal-500/30 bg-card/80 backdrop-blur-sm"><CardHeader className="pb-3"><CardTitle className="text-base">Tool Result</CardTitle></CardHeader>
          <CardContent><ScrollArea className="max-h-72"><pre className="text-sm text-foreground/90 whitespace-pre-wrap font-mono">{toolsResult}</pre></ScrollArea></CardContent>
        </Card>
      </motion.div>}</AnimatePresence>
    </div>
  );
}
