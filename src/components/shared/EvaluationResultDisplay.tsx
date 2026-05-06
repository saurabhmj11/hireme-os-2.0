'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import {
  Briefcase, Star, TrendingUp, DollarSign,
  UserCheck, Sparkles, MessageSquare, BookOpen, BarChart3,
  Check, Loader2,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

import type { EvaluationReport, ScoringWeight, DimensionScore } from '@/lib/types';
import { GRADE_COLORS } from '@/lib/types';

// =================== HELPERS ===================
const PIE_COLORS = ['#38bdf8', '#a78bfa', '#fbbf24', '#34d399', '#f87171', '#fb923c'];

function parseDimensions(dimStr: string, weights: ScoringWeight[]): DimensionScore[] {
  try {
    const scores = JSON.parse(dimStr) as Record<string, number>;
    return weights.map(w => ({ dimension: w.dimension, label: w.label, score: scores[w.dimension] ?? 0, weight: w.weight }));
  } catch { return []; }
}

function getDimensionBarColor(score: number): string {
  if (score >= 4) return '#34d399';
  if (score >= 3) return '#2dd4bf';
  if (score >= 2) return '#fbbf24';
  return '#f87171';
}

const BLOCK_CONFIG = [
  { value: 'b1', title: 'Role Summary', icon: Briefcase },
  { value: 'b2', title: 'CV Match Analysis', icon: UserCheck },
  { value: 'b3', title: 'Level Strategy', icon: TrendingUp },
  { value: 'b4', title: 'Comp Research', icon: DollarSign },
  { value: 'b5', title: 'Personalization Notes', icon: Sparkles },
  { value: 'b6', title: 'Interview Prep (STAR+R)', icon: MessageSquare },
] as const;

export { PIE_COLORS, parseDimensions, getDimensionBarColor, BLOCK_CONFIG };

export default function EvaluationResultDisplay({ report, compact, weights }: { report: EvaluationReport; compact?: boolean; weights: ScoringWeight[] }) {
  const dimData = parseDimensions(report.dimensions, weights);
  const barData = dimData.map(d => ({ name: d.label, score: d.score, weight: Math.round(d.weight * 100), fill: getDimensionBarColor(d.score) }));

  const handleSaveStories = async () => {
    if (!report.block6) return;
    const stories = report.block6.split(/(?=##?\s|Situation:|S:)/i).filter(s => s.trim().length > 20);
    for (const s of stories.slice(0, 5)) {
      try {
        await fetch('/api/stories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: `${report.company} - ${report.role}`, situation: s.trim().substring(0, 500), task: '', action: '', result: '', reflection: '', tags: report.archetype, source: report.id }) });
      } catch { /* ignore */ }
    }
    toast.success('Stories saved to Story Bank');
  };

  const handleAddToPipeline = async () => {
    try {
      const res = await fetch('/api/applications/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company: report.company, role: report.role, score: report.overallScore, notes: `Archetype: ${report.archetype} | Grade: ${report.overallGrade}` }) });
      if (res.ok) { toast.success('Added to pipeline'); }
    } catch { toast.error('Failed to add to pipeline'); }
  };

  const blockContent = [
    { value: 'b1', content: report.block1 },
    { value: 'b2', content: report.block2 },
    { value: 'b3', content: report.block3 },
    { value: 'b4', content: report.block4 },
    { value: 'b5', content: report.block5 },
    { value: 'b6', content: report.block6 },
  ];

  return (
    <div className="space-y-4">
      {/* Top section — Grade & Score */}
      <Card className="border-teal-500/30 bg-card/80 backdrop-blur-sm">
        <CardContent className={compact ? 'p-4' : 'p-6'}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Badge className={`${GRADE_COLORS[report.overallGrade] || ''} ${compact ? 'text-3xl font-bold px-5 py-2' : 'text-4xl font-bold px-6 py-3'}`}>{report.overallGrade}</Badge>
            <div className="flex-1 min-w-0">
              <h3 className={`${compact ? 'text-base' : 'text-lg'} font-bold truncate`}>{report.company} — {report.role}</h3>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <span className="text-sm text-muted-foreground">Score: {report.overallScore}/5.0</span>
                <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.round(report.overallScore) ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`} />)}</div>
                <Badge variant="outline" className="text-xs border-teal-500/30 text-teal-400">{report.archetype}</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleSaveStories} className="border-border/50"><BookOpen className="h-3.5 w-3.5 mr-1.5" />Save Stories</Button>
              <Button variant="outline" size="sm" onClick={handleAddToPipeline} className="border-border/50"><Briefcase className="h-3.5 w-3.5 mr-1.5" />Add to Pipeline</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Middle section — 6 Accordion blocks */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className={compact ? 'p-3' : 'p-4'}>
          <Accordion type="multiple" className="w-full">
            {BLOCK_CONFIG.map((block, i) => (
              <AccordionItem key={block.value} value={block.value}>
                <AccordionTrigger className="text-sm font-medium hover:no-underline">
                  <div className="flex items-center gap-2">
                    <block.icon className="h-4 w-4 text-teal-400" />
                    <span>{block.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">{blockContent[i].content}</pre>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Bottom section — Dimension Scores horizontal bar chart */}
      {barData.length > 0 && (
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><BarChart3 className="h-4 w-4 text-teal-400" />Dimension Scores</CardTitle></CardHeader>
          <CardContent>
            <div className={compact ? 'h-56' : 'h-72'}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 40, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.01 270)" horizontal={false} />
                  <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 10 }} stroke="oklch(0.65 0.01 270)" />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} stroke="oklch(0.65 0.01 270)" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'oklch(0.22 0.015 270)', border: '1px solid oklch(0.35 0.015 270)', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: number, name: string) => [name === 'score' ? `${value}/5` : value, name === 'score' ? 'Score' : name]}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {barData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 mt-3 text-xs">
              {barData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-medium">{d.score}/5</span>
                  <span className="text-muted-foreground">({d.weight}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
