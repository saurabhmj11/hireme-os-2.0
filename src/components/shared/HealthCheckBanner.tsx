'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertTriangle, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useHireMeOSStore } from '@/lib/store';

export default function HealthCheckBanner() {
  const { healthIssues } = useHireMeOSStore();
  const [expanded, setExpanded] = useState(false);
  const errorCount = healthIssues.filter(i => i.type === 'error').length;
  const warnCount = healthIssues.filter(i => i.type === 'warning').length;
  const totalIssues = errorCount + warnCount;

  if (totalIssues === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <Check className="h-4 w-4 text-emerald-400" />
        <span className="text-sm text-emerald-400 font-medium">Pipeline healthy</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${errorCount > 0 ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15' : 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15'}`}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className={`h-4 w-4 ${errorCount > 0 ? 'text-red-400' : 'text-amber-400'}`} />
          <span className={`text-sm font-medium ${errorCount > 0 ? 'text-red-400' : 'text-amber-400'}`}>
            {totalIssues} issue{totalIssues !== 1 ? 's' : ''} found: {warnCount} warning{warnCount !== 1 ? 's' : ''}, {errorCount} error{errorCount !== 1 ? 's' : ''}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-card/50 p-3 space-y-2 border-t border-border/30">
              {healthIssues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Badge variant="outline" className={`text-xs shrink-0 ${issue.type === 'error' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                    {issue.type === 'error' ? 'Error' : 'Warning'}
                  </Badge>
                  <span className="text-muted-foreground">{issue.message}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
