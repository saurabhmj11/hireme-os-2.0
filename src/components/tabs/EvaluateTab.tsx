'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { FileText, Zap, Loader2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHireMeOSStore } from '@/lib/store';
import { AI_ENGINES } from '@/lib/types';
import EvaluationResultDisplay from '@/components/shared/EvaluationResultDisplay';

export default function EvaluateTab() {
  const [jdText, setJdText] = useState('');
  const [engine, setEngine] = useState('glm');
  const { evaluateResult, setEvaluateResult, isEvaluating, setIsEvaluating, weights } = useHireMeOSStore();

  useEffect(() => {
    if (weights.length === 0) {
      fetch('/api/weights').then(r => r.json()).then(d => useHireMeOSStore.getState().setWeights(d.weights || [])).catch(() => {});
    }
  }, [weights.length]);

  const handleEvaluate = async () => {
    if (!jdText.trim()) { toast.error('Please paste a job description'); return; }
    setIsEvaluating(true);
    setEvaluateResult(null);
    try {
      const res = await fetch('/api/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jd_text: jdText, engine }) });
      const data = await res.json();
      if (data.report) { setEvaluateResult(data.report); toast.success('Evaluation complete'); }
      else { toast.error(data.error || 'Evaluation failed'); }
    } catch { toast.error('Failed to evaluate'); }
    finally { setIsEvaluating(false); }
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-teal-400" />Structured Evaluation</CardTitle>
          <CardDescription>Paste a JD for 6-block analysis with A-F grading</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea placeholder="Paste a job description here for comprehensive analysis..." value={jdText} onChange={(e) => setJdText(e.target.value)} rows={10} className="bg-secondary/50 border-border/50 resize-y font-mono text-sm" />
          <div className="flex gap-3 items-center">
            <Select value={engine} onValueChange={setEngine}><SelectTrigger className="w-36 bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger><SelectContent>{AI_ENGINES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent></Select>
            <Button onClick={handleEvaluate} disabled={isEvaluating} className="bg-teal-600 hover:bg-teal-700 text-white">
              {isEvaluating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}Evaluate
            </Button>
            {jdText && <Button variant="ghost" size="icon" onClick={() => setJdText('')} className="h-8 w-8"><X className="h-4 w-4" /></Button>}
          </div>
        </CardContent>
      </Card>

      {isEvaluating && (
        <Card className="border-teal-500/30 bg-card/80 backdrop-blur-sm">
          <CardContent className="py-12 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
            <p className="text-sm text-muted-foreground">Running 6-block evaluation...</p>
          </CardContent>
        </Card>
      )}

      <AnimatePresence>
        {evaluateResult && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <EvaluationResultDisplay report={evaluateResult} weights={weights} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
