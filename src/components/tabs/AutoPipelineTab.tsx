'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Globe, Target, BarChart3, FileText, Briefcase, Zap, Loader2, X, Check, AlertTriangle, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHireMeOSStore } from '@/lib/store';
import type { EvaluationReport, Application } from '@/lib/types';
import { AI_ENGINES, GRADE_COLORS } from '@/lib/types';
import EvaluationResultDisplay from '@/components/shared/EvaluationResultDisplay';

export default function AutoPipelineTab() {
  const { isAutoPipelining, setIsAutoPipelining, settings, weights } = useHireMeOSStore();
  const [url, setUrl] = useState('');
  const [engine, setEngine] = useState('glm');
  const [result, setResult] = useState<{ report: EvaluationReport; application: Application } | null>(null);
  const [currentStep, setCurrentStep] = useState(-1);

  const STEPS = [
    { label: 'Scraping job description...', icon: Globe },
    { label: 'Detecting archetype...', icon: Target },
    { label: 'Evaluating fit (6-block analysis)...', icon: BarChart3 },
    { label: 'Generating report...', icon: FileText },
    { label: 'Adding to pipeline...', icon: Briefcase },
  ];

  const handleRun = async () => {
    if (!url.trim()) { toast.error('Please enter a URL'); return; }
    setIsAutoPipelining(true);
    setResult(null);
    setCurrentStep(0);

    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= 4) { clearInterval(stepInterval); return prev; }
        return prev + 1;
      });
    }, 2000);

    try {
      const res = await fetch('/api/auto-pipeline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, engine }) });
      const data = await res.json();
      clearInterval(stepInterval);
      setCurrentStep(4);
      if (data.report) { setResult(data); toast.success('Auto-pipeline complete'); }
      else { toast.error(data.error || 'Auto-pipeline failed'); setCurrentStep(-1); }
    } catch {
      clearInterval(stepInterval);
      toast.error('Auto-pipeline failed');
      setCurrentStep(-1);
    }
    finally { setIsAutoPipelining(false); }
  };

  const hasCV = Boolean(settings.cv?.trim());

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4 text-teal-400" />Auto-Pipeline</CardTitle>
          <CardDescription>Paste a job URL to automatically scrape, evaluate, and add to your pipeline</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasCV && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="text-sm text-amber-400">Add your CV in Settings for accurate match analysis</span>
            </div>
          )}
          <Input placeholder="Paste a job posting URL..." value={url} onChange={(e) => setUrl(e.target.value)} className="bg-secondary/50 border-border/50" />
          <div className="flex gap-3 items-center">
            <Select value={engine} onValueChange={setEngine}><SelectTrigger className="w-36 bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger><SelectContent>{AI_ENGINES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent></Select>
            <Button onClick={handleRun} disabled={isAutoPipelining} className="bg-teal-600 hover:bg-teal-700 text-white">
              {isAutoPipelining ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}Run Auto-Pipeline
            </Button>
            {url && <Button variant="ghost" size="icon" onClick={() => setUrl('')} className="h-8 w-8"><X className="h-4 w-4" /></Button>}
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {isAutoPipelining && currentStep >= 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="border-teal-500/30 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex flex-col gap-3">
                  {STEPS.map((step, i) => {
                    const StepIcon = step.icon;
                    const isActive = i === currentStep;
                    const isCompleted = i < currentStep;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 transition-colors ${isCompleted ? 'bg-emerald-500/20' : isActive ? 'bg-teal-500/20' : 'bg-secondary/50'}`}>
                          {isCompleted ? <Check className="h-4 w-4 text-emerald-400" /> : isActive ? <Loader2 className="h-4 w-4 text-teal-400 animate-spin" /> : <StepIcon className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <span className={`text-sm ${isCompleted ? 'text-emerald-400' : isActive ? 'text-teal-400 font-medium' : 'text-muted-foreground'}`}>{step.label}</span>
                        {isCompleted && <Check className="h-4 w-4 text-emerald-400 ml-auto" />}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <Card className="border-teal-500/30 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <Badge className={`${GRADE_COLORS[result.report.overallGrade] || ''} text-4xl font-bold px-6 py-3`}>{result.report.overallGrade}</Badge>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold">{result.report.company} — {result.report.role}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      <span className="text-sm text-muted-foreground">Score: {result.report.overallScore}/5.0</span>
                      <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.round(result.report.overallScore) ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`} />)}</div>
                      <Badge variant="outline" className="text-xs border-teal-500/30 text-teal-400">{result.report.archetype}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Added to pipeline as #{result.application.number} — {result.application.status}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <EvaluationResultDisplay report={result.report} weights={weights} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
