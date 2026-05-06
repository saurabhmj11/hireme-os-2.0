'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { FileStack, Star, RefreshCw, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useHireMeOSStore } from '@/lib/store';
import { GRADE_COLORS } from '@/lib/types';
import EvaluationResultDisplay from '@/components/shared/EvaluationResultDisplay';

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return dateStr; }
}

export default function ReportsTab() {
  const { reports, setReports, isLoadingReports, setIsLoadingReports, weights } = useHireMeOSStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setIsLoadingReports(true);
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      setReports(data.reports || []);
    } catch { toast.error('Failed to load reports'); }
    finally { setIsLoadingReports(false); }
  }, [setReports, setIsLoadingReports]);

  useEffect(() => { fetchReports(); }, [fetchReports]);
  useEffect(() => {
    if (weights.length === 0) { fetch('/api/weights').then(r => r.json()).then(d => useHireMeOSStore.getState().setWeights(d.weights || [])).catch(() => {}); }
  }, [weights.length]);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/reports/${id}`, { method: 'DELETE' });
      toast.success('Report deleted');
      fetchReports();
      if (expandedId === id) setExpandedId(null);
    } catch { toast.error('Failed to delete report'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium flex items-center gap-2"><FileStack className="h-4 w-4 text-teal-400" />Evaluation Reports ({reports.length})</h3>
        <Button variant="outline" size="sm" onClick={fetchReports} className="border-border/50"><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh</Button>
      </div>

      {isLoadingReports ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-teal-400" /></div>
      ) : reports.length === 0 ? (
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="py-16 text-center">
            <FileStack className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-lg font-medium mb-1">No evaluations yet</p>
            <p className="text-muted-foreground text-sm">Go to Evaluate or Auto-Pipeline to analyze your first job.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <Card key={r.id} className="border-border/50 bg-card/80 backdrop-blur-sm hover:border-border transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Badge className={`${GRADE_COLORS[r.overallGrade] || ''} text-xl font-bold px-3 py-1`}>{r.overallGrade}</Badge>
                    <div className="min-w-0">
                      <h4 className="font-medium text-sm truncate">{r.company}</h4>
                      <p className="text-xs text-muted-foreground truncate">{r.role}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-400 fill-amber-400" /><span className="text-sm">{r.overallScore}/5</span></div>
                    <Badge variant="outline" className="text-xs border-teal-500/30 text-teal-400">{r.archetype}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                    <Button variant="ghost" size="sm" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} className="h-7 text-xs hover:text-teal-400">
                      {expandedId === r.id ? 'Collapse' : 'View'}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-400" onClick={() => handleDelete(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === r.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t border-border/30">
                        <EvaluationResultDisplay report={r} compact weights={weights} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
