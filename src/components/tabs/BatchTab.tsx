'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Layers, Star, Loader2, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useHireMeOSStore } from '@/lib/store';
import { AI_ENGINES, GRADE_COLORS } from '@/lib/types';

export default function BatchTab() {
  const { batchResults, setBatchResults, batchProgress, setBatchProgress, isRunningBatch, setIsRunningBatch } = useHireMeOSStore();
  const [jdTexts, setJdTexts] = useState('');
  const [engine, setEngine] = useState('glm');

  const handleRun = async () => {
    const texts = jdTexts.split('---').map(t => t.trim()).filter(t => t.length > 20);
    if (texts.length === 0) { toast.error('Paste multiple JDs separated by ---'); return; }
    setIsRunningBatch(true); setBatchResults([]); setBatchProgress({ current: 0, total: texts.length });
    try {
      const res = await fetch('/api/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jdTexts: texts, engine }) });
      const data = await res.json();
      if (data.results) { setBatchResults(data.results); toast.success(`Evaluated ${data.results.length} jobs`); }
      else { toast.error(data.error || 'Batch failed'); }
    } catch { toast.error('Batch evaluation failed'); }
    finally { setIsRunningBatch(false); setBatchProgress({ current: 0, total: 0 }); }
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4 text-teal-400" />Batch Evaluation</CardTitle>
          <CardDescription>Evaluate multiple job descriptions at once. Separate each JD with ---</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea placeholder="Paste multiple job descriptions separated by ---" value={jdTexts} onChange={e => setJdTexts(e.target.value)} rows={12} className="bg-secondary/50 border-border/50 resize-y font-mono text-sm" />
          <div className="flex gap-3 items-center">
            <Select value={engine} onValueChange={setEngine}><SelectTrigger className="w-36 bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger><SelectContent>{AI_ENGINES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent></Select>
            <Button onClick={handleRun} disabled={isRunningBatch} className="bg-teal-600 hover:bg-teal-700 text-white">
              {isRunningBatch ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Layers className="h-4 w-4 mr-2" />}Run Batch ({jdTexts.split('---').filter(t => t.trim().length > 20).length} JDs)
            </Button>
          </div>
          {isRunningBatch && <div className="flex items-center gap-3"><Progress value={batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0} className="flex-1" /><span className="text-sm text-muted-foreground">{batchProgress.current}/{batchProgress.total}</span></div>}
        </CardContent>
      </Card>

      {batchResults.length > 0 && (
        <Card className="border-teal-500/30 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-teal-400" />Batch Results ({batchResults.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table><TableHeader><TableRow className="border-border/50 hover:bg-transparent"><TableHead>Company</TableHead><TableHead>Role</TableHead><TableHead>Grade</TableHead><TableHead>Score</TableHead></TableRow></TableHeader>
                <TableBody>{batchResults.map((r, i) => (
                  <TableRow key={i} className="border-border/30"><TableCell className="font-medium text-sm">{r.company}</TableCell><TableCell className="text-sm">{r.role}</TableCell>
                    <TableCell><Badge className={`${GRADE_COLORS[r.grade] || ''} text-sm font-bold px-2.5 py-0.5`}>{r.grade}</Badge></TableCell>
                    <TableCell><div className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-400 fill-amber-400" /><span className="text-sm">{r.score}/5</span></div></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
