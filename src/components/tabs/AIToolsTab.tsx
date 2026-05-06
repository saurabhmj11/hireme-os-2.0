'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { Bot, Zap, Loader2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHireMeOSStore } from '@/lib/store';
import { AI_MODES, AI_ENGINES } from '@/lib/types';

export default function AIToolsTab() {
  const [mode, setMode] = useState('contacto');
  const [engine, setEngine] = useState('glm');
  const [inputText, setInputText] = useState('');
  const { aiToolResult, setAiToolResult, isRunningAI, setIsRunningAI } = useHireMeOSStore();

  const handleRun = async () => {
    if (!inputText.trim()) { toast.error('Please enter some text'); return; }
    setIsRunningAI(true);
    setAiToolResult(null);
    try {
      const res = await fetch('/api/ai-tool', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode, engine, input_text: inputText }) });
      const data = await res.json();
      if (data.result) { setAiToolResult(data.result); toast.success('AI tool completed'); }
      else { toast.error(data.error || 'AI tool failed'); }
    } catch { toast.error('Failed to run AI tool'); }
    finally { setIsRunningAI(false); }
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Bot className="h-4 w-4 text-teal-400" />AI Tools</CardTitle><CardDescription>Generate cover letters, deep analysis, training plans, and project ideas</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="space-y-1 flex-1"><Label className="text-xs text-muted-foreground">Mode</Label><Select value={mode} onValueChange={setMode}><SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger><SelectContent>{AI_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1 flex-1"><Label className="text-xs text-muted-foreground">Engine</Label><Select value={engine} onValueChange={setEngine}><SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger><SelectContent>{AI_ENGINES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <Textarea placeholder="Enter your text here..." value={inputText} onChange={(e) => setInputText(e.target.value)} rows={6} className="bg-secondary/50 border-border/50 resize-y font-mono text-sm" />
          <div className="flex gap-3"><Button onClick={handleRun} disabled={isRunningAI} className="bg-teal-600 hover:bg-teal-700 text-white">{isRunningAI ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}Run AI Tool</Button>{inputText && <Button variant="ghost" size="icon" onClick={() => setInputText('')} className="h-8 w-8"><X className="h-4 w-4" /></Button>}</div>
        </CardContent>
      </Card>
      <AnimatePresence>{aiToolResult && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        <Card className="border-teal-500/30 bg-card/80 backdrop-blur-sm"><CardHeader className="pb-3"><CardTitle className="text-base">AI Response</CardTitle></CardHeader>
          <CardContent><ScrollArea className="max-h-96"><div className="prose prose-invert prose-sm max-w-none"><ReactMarkdown>{aiToolResult}</ReactMarkdown></div></ScrollArea></CardContent>
        </Card>
      </motion.div>}</AnimatePresence>
    </div>
  );
}
