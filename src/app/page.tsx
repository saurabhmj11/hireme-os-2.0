'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import {
  Briefcase, Moon, Sun, Database, Search, Star, TrendingUp,
  Users, Award, Plus, ChevronDown, FileText, ScanLine,
  Bot, Settings2, Wrench, Play, Loader2, ExternalLink,
  MapPin, DollarSign, Calendar, ArrowUpDown, X, Check,
  RefreshCw, Zap, Target, BarChart3, BookOpen,
  FileStack, Scale, Layers, Tag, Trash2,
  Save, AlertTriangle, Printer, Code2, Globe,
  UserCheck, Sparkles, MessageSquare, ChevronRight,
  ClipboardList, PenLine, Bell, Rocket, Clock, Mail, Eye, SwitchCamera,
  FileUser, ArrowRight, Sparkle, Shield, PenTool, LayoutGrid, FileCheck,
  Menu, PanelLeftClose, PanelLeft, Home, Activity,
  Command, ArrowUp, ArrowDown, Minus, CheckCircle2, Circle, User,
  TrendingDown, Flame,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  CommandDialog as CmdKDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator as CmdKSeparator, CommandShortcut,
} from '@/components/ui/command';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';

import { useHireMeOSStore } from '@/lib/store';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import type { Application, ApplicationsResponse, SettingsData, EvaluationReport, InterviewStory, ScoringWeight, DimensionScore, SchedulerConfig, FollowUp, Notification as AppNotification, EmailConfig, CycleProgress, ATSResult } from '@/lib/types';
import { STATUS_COLORS, ALL_STATUSES, AI_MODES, AI_ENGINES, GRADE_COLORS, DEFAULT_WEIGHTS } from '@/lib/types';

// =================== HELPERS ===================
function getStatusColor(status: string): string {
  return (STATUS_COLORS as Record<string, string>)[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}
function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return dateStr; }
}
function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch { return ''; }
}
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

// =================== ANIMATED NUMBER ===================
function AnimatedNumber({ value, suffix }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => { setDisplay(value); }, [value]);
  return <span className="count-animate">{typeof value === 'number' ? (suffix === '%' ? display.toFixed(1) : display) : display}{suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}</span>;
}

// =================== SKELETON LOADER ===================
function SkeletonCard() {
  return <div className="skeleton-shimmer h-24 rounded-xl" />;
}

// =================== REUSABLE EVALUATION RESULT DISPLAY ===================
function EvaluationResultDisplay({ report, compact, weights }: { report: EvaluationReport; compact?: boolean; weights: ScoringWeight[] }) {
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
      <Card className="border-teal-500/30 bg-card/80 backdrop-blur-sm card-hover-lift">
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
              <Button variant="outline" size="sm" onClick={handleSaveStories} className="border-border/50 btn-hover-scale"><BookOpen className="h-3.5 w-3.5 mr-1.5" />Save Stories</Button>
              <Button variant="outline" size="sm" onClick={handleAddToPipeline} className="border-border/50 btn-hover-scale"><Briefcase className="h-3.5 w-3.5 mr-1.5" />Add to Pipeline</Button>
            </div>
          </div>
        </CardContent>
      </Card>

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

// =================== METRICS CARDS (ENHANCED with trends) ===================
function MetricsCards() {
  const { metrics } = useHireMeOSStore();
  const cards = [
    { title: 'Total Applications', value: metrics?.total_applications ?? 0, icon: Briefcase, color: 'text-teal-400', bg: 'bg-teal-500/10', suffix: undefined, gradient: 'from-teal-500/15 to-teal-600/5', trend: metrics?.total_applications ? (metrics.total_applications > 5 ? 'up' : 'neutral') : 'neutral', trendVal: '+12%' },
    { title: 'Average Score', value: metrics?.avg_score ?? 0, icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/10', suffix: '/5', gradient: 'from-amber-500/15 to-amber-600/5', trend: 'up' as const, trendVal: '+0.3' },
    { title: 'Response Rate', value: metrics?.response_rate ?? 0, icon: TrendingUp, color: 'text-sky-400', bg: 'bg-sky-500/10', suffix: '%', gradient: 'from-sky-500/15 to-sky-600/5', trend: 'up' as const, trendVal: '+5%' },
    { title: 'Interview Rate', value: metrics?.interview_rate ?? 0, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10', suffix: '%', gradient: 'from-purple-500/15 to-purple-600/5', trend: 'neutral' as const, trendVal: '0%' },
    { title: 'Offer Rate', value: metrics?.offer_rate ?? 0, icon: Award, color: 'text-emerald-400', bg: 'bg-emerald-500/10', suffix: '%', gradient: 'from-emerald-500/15 to-emerald-600/5', trend: 'up' as const, trendVal: '+2%' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {cards.map((card, i) => (
        <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Card className={`border-border/30 bg-linear-to-br ${card.gradient} backdrop-blur-sm hover:border-border/50 transition-all duration-200 hover:shadow-lg hover:shadow-black/10 card-hover-lift`}>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bg}`}><card.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color}`} /></div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{card.title}</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-lg sm:text-2xl font-bold"><AnimatedNumber value={card.value} suffix={card.suffix} /></p>
                    <span className={`metric-trend ${card.trend}`}>
                      {card.trend === 'up' && <ArrowUp className="h-3 w-3" />}
                      {card.trend === 'down' && <ArrowDown className="h-3 w-3" />}
                      {card.trend === 'neutral' && <Minus className="h-3 w-3" />}
                      {card.trendVal}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// =================== STATUS CHART ===================
function StatusChart() {
  const { metrics } = useHireMeOSStore();
  if (!metrics?.by_status) return null;
  const barData = Object.entries(metrics.by_status).map(([status, count]) => ({ status, count }));
  const pieData = Object.entries(metrics.by_status).map(([status, count]) => ({ name: status, value: count }));
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="border-border/30 bg-card/80 backdrop-blur-sm hover:border-border/50 transition-all card-hover-lift">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><BarChart3 className="h-4 w-4 text-teal-400" />Applications by Status</CardTitle></CardHeader>
        <CardContent className="pt-0"><div className="h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}><CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.01 270)" /><XAxis dataKey="status" tick={{ fontSize: 10 }} stroke="oklch(0.65 0.01 270)" /><YAxis tick={{ fontSize: 10 }} stroke="oklch(0.65 0.01 270)" /><Tooltip contentStyle={{ backgroundColor: 'oklch(0.22 0.015 270)', border: '1px solid oklch(0.35 0.015 270)', borderRadius: '8px', fontSize: '12px' }} /><Bar dataKey="count" radius={[4, 4, 0, 0]}>{barData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer></div></CardContent>
      </Card>
      <Card className="border-border/30 bg-card/80 backdrop-blur-sm hover:border-border/50 transition-all card-hover-lift">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Target className="h-4 w-4 text-amber-400" />Status Distribution</CardTitle></CardHeader>
        <CardContent className="pt-0"><div className="h-48 flex items-center"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">{pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Pie><Tooltip contentStyle={{ backgroundColor: 'oklch(0.22 0.015 270)', border: '1px solid oklch(0.35 0.015 270)', borderRadius: '8px', fontSize: '12px' }} /></PieChart></ResponsiveContainer>
          <div className="flex flex-col gap-1 text-xs">{pieData.map((e, i) => <div key={e.name} className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} /><span className="text-muted-foreground">{e.name}</span><span className="font-medium">{e.value}</span></div>)}</div>
        </div></CardContent>
      </Card>
    </div>
  );
}

// =================== PIPELINE FUNNEL ===================
function PipelineFunnel() {
  const { applications } = useHireMeOSStore();
  const funnelStages = [
    { label: 'Applied', color: 'bg-sky-500', textColor: 'text-sky-400', bgColor: 'bg-sky-500/20' },
    { label: 'Screening', color: 'bg-purple-500', textColor: 'text-purple-400', bgColor: 'bg-purple-500/20' },
    { label: 'Interview', color: 'bg-amber-500', textColor: 'text-amber-400', bgColor: 'bg-amber-500/20' },
    { label: 'Offer', color: 'bg-emerald-500', textColor: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  ];
  const counts = funnelStages.map(stage => ({
    ...stage,
    count: applications.filter(a => a.status === stage.label).length,
  }));
  const maxCount = Math.max(...counts.map(c => c.count), 1);
  return (
    <Card className="border-border/30 bg-card/80 backdrop-blur-sm card-hover-lift">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2"><Target className="h-4 w-4 text-teal-400" />Pipeline Funnel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {counts.map((stage, i) => (
          <div key={stage.label} className="funnel-step">
            <div className="flex items-center gap-3">
              <div className={`w-20 sm:w-24 text-xs sm:text-sm font-medium ${stage.textColor}`}>{stage.label}</div>
              <div className="flex-1 h-8 rounded-lg bg-secondary/30 overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(stage.count / maxCount) * 100}%` }}
                  transition={{ delay: i * 0.1, duration: 0.5, ease: 'easeOut' }}
                  className={`h-full ${stage.bgColor} rounded-lg flex items-center justify-end pr-2`}
                >
                  <span className={`text-xs font-bold ${stage.textColor}`}>{stage.count}</span>
                </motion.div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// =================== ACTIVITY TIMELINE ===================
function ActivityTimeline() {
  const { applications, followUps, cycleHistory } = useHireMeOSStore();
  const activities = useMemo(() => {
    const items: { id: string; type: string; message: string; time: string; icon: React.ElementType; color: string }[] = [];
    applications.slice(0, 5).forEach(app => {
      items.push({ id: `app-${app.number}`, type: 'application', message: `Applied to ${app.company} — ${app.role}`, time: app.createdAt || app.date, icon: Briefcase, color: 'text-sky-400' });
    });
    followUps.slice(0, 3).forEach(fu => {
      items.push({ id: `fu-${fu.id}`, type: 'followup', message: `Follow-up: ${fu.company || `App #${fu.appNumber}`}`, time: fu.createdAt, icon: Mail, color: 'text-amber-400' });
    });
    cycleHistory.slice(0, 3).forEach(ch => {
      items.push({ id: `cycle-${ch.id}`, type: 'cycle', message: `Autopilot cycle: ${ch.scannedJobs} scanned, ${ch.autoAppliedJobs} applied`, time: ch.createdAt, icon: Rocket, color: 'text-emerald-400' });
    });
    return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);
  }, [applications, followUps, cycleHistory]);

  return (
    <Card className="border-border/30 bg-card/80 backdrop-blur-sm card-hover-lift">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2"><Activity className="h-4 w-4 text-teal-400" />Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-6"><Activity className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" /><p className="text-xs text-muted-foreground">No activity yet</p></div>
        ) : (
          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-0">
            {activities.map(act => {
              const ActIcon = act.icon;
              return (
                <div key={act.id} className="activity-item py-2 pr-2">
                  <div className={`activity-dot bg-card ${act.color.replace('text-', 'border-')}`} style={{ borderColor: 'currentColor' }}>
                  </div>
                  <div className="flex items-start gap-2">
                    <ActIcon className={`h-3.5 w-3.5 ${act.color} shrink-0 mt-0.5`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground/90 truncate">{act.message}</p>
                      <p className="text-[10px] text-muted-foreground">{formatTimeAgo(act.time)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =================== GETTING STARTED CHECKLIST ===================
function GettingStartedChecklist() {
  const { gettingStartedItems, toggleGettingStartedItem, setActivePage } = useHireMeOSStore();
  const allDone = gettingStartedItems.every(i => i.completed);
  const pageMap: Record<string, string> = { 'add-cv': 'settings', 'run-auto-pipeline': 'autopipeline', 'enable-autopilot': 'autopilot', 'check-ats': 'ats' };

  return (
    <Card className={`border-border/30 bg-card/80 backdrop-blur-sm card-hover-lift ${allDone ? 'border-emerald-500/30' : ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {allDone ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Rocket className="h-4 w-4 text-teal-400" />}
          {allDone ? 'All Set!' : 'Getting Started'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {gettingStartedItems.map(item => (
          <div
            key={item.id}
            className={`getting-started-item flex items-center gap-3 p-2 rounded-lg ${item.completed ? 'completed' : ''}`}
            onClick={() => {
              if (!item.completed) {
                const page = pageMap[item.id];
                if (page) setActivePage(page);
              }
              toggleGettingStartedItem(item.id);
            }}
            role="button"
            tabIndex={0}
          >
            <div className={`gs-check w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${item.completed ? 'bg-emerald-500 border-emerald-500' : 'border-border hover:border-teal-500/50'}`}>
              {item.completed && <Check className="h-3 w-3 text-white" />}
            </div>
            <span className={`text-xs sm:text-sm ${item.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{item.label}</span>
          </div>
        ))}
        <Progress value={(gettingStartedItems.filter(i => i.completed).length / gettingStartedItems.length) * 100} className="h-1.5 mt-2" />
      </CardContent>
    </Card>
  );
}

// =================== WEEKLY STATS CARD ===================
function WeeklyStatsCard() {
  const { applications, cycleHistory } = useHireMeOSStore();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekApps = applications.filter(a => new Date(a.date).getTime() > weekAgo);
  const weekCycles = cycleHistory.filter(c => new Date(c.createdAt).getTime() > weekAgo);
  const weekScanned = weekCycles.reduce((s, c) => s + c.scannedJobs, 0);
  const weekApplied = weekCycles.reduce((s, c) => s + c.autoAppliedJobs, 0);

  return (
    <Card className="border-border/30 bg-card/80 backdrop-blur-sm card-hover-lift">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2"><Flame className="h-4 w-4 text-amber-400" />This Week</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-secondary/30">
            <p className="text-xl font-bold text-teal-400"><AnimatedNumber value={weekApps.length} /></p>
            <p className="text-[10px] text-muted-foreground">New Apps</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-secondary/30">
            <p className="text-xl font-bold text-sky-400"><AnimatedNumber value={weekScanned} /></p>
            <p className="text-[10px] text-muted-foreground">Scanned</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-secondary/30">
            <p className="text-xl font-bold text-emerald-400"><AnimatedNumber value={weekApplied} /></p>
            <p className="text-[10px] text-muted-foreground">Auto-Applied</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =================== HEALTH CHECK BANNER ===================
function HealthCheckBanner() {
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

// =================== FILL FORM DIALOG ===================
function FillFormDialog({ app }: { app: Application }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', linkedin: '', portfolio: '', why_interested: '', salary_expectation: '' });
  const [recruiter, setRecruiter] = useState({ name: app.recruiterName || '', email: app.recruiterEmail || '' });
  const [isFilling, setIsFilling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAiFill = async () => {
    setIsFilling(true);
    try {
      const fields: Record<string, string> = {
        name: 'Full legal name',
        email: 'Professional email address',
        phone: 'Phone number with country code',
        linkedin: 'LinkedIn profile URL',
        portfolio: 'Portfolio or GitHub URL',
        why_interested: 'Why are you interested in this role and company?',
        salary_expectation: 'Salary expectation in local currency',
      };
      const res = await fetch('/api/fill-form', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appNumber: app.number, fields }) });
      const data = await res.json();
      if (data.filledFields) {
        setFormData(prev => ({ ...prev, ...data.filledFields }));
        toast.success('Form fields auto-filled');
      } else {
        toast.error(data.error || 'Failed to fill form');
      }
    } catch { toast.error('Failed to fill form'); }
    finally { setIsFilling(false); }
  };

  const handleSaveApp = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/applications/${app.number}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recruiterName: recruiter.name, recruiterEmail: recruiter.email }),
      });
      if (res.ok) {
        toast.success('Recruiter info saved');
      }
    } catch { toast.error('Failed to save'); }
    finally { setIsSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-teal-400 btn-hover-scale" title="Application Details">
          <PenLine className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader><DialogTitle>Application Details — {app.company}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-teal-400 uppercase tracking-wider">Recruiter Contact (For Follow-ups)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Recruiter Name</Label><Input value={recruiter.name} onChange={(e) => setRecruiter({ ...recruiter, name: e.target.value })} className="bg-secondary/50 h-8 text-sm" /></div>
              <div className="space-y-1"><Label className="text-xs">Recruiter Email</Label><Input value={recruiter.email} onChange={(e) => setRecruiter({ ...recruiter, email: e.target.value })} className="bg-secondary/50 h-8 text-sm" /></div>
            </div>
            <Button onClick={handleSaveApp} disabled={isSaving} size="sm" variant="outline" className="h-8 border-teal-500/30 text-teal-400 w-full">
              {isSaving ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Save className="h-3 w-3 mr-2" />}Save Recruiter Info
            </Button>
          </div>

          <Separator className="bg-border/30" />

          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-pink-400 uppercase tracking-wider">Form Auto-Fill Data</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Full Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-secondary/50 h-8 text-sm" /></div>
              <div className="space-y-1"><Label className="text-xs">Email</Label><Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-secondary/50 h-8 text-sm" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="bg-secondary/50 h-8 text-sm" /></div>
              <div className="space-y-1"><Label className="text-xs">LinkedIn</Label><Input value={formData.linkedin} onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })} className="bg-secondary/50 h-8 text-sm" /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Why interested?</Label><Textarea value={formData.why_interested} onChange={(e) => setFormData({ ...formData, why_interested: e.target.value })} className="bg-secondary/50 text-sm" rows={2} /></div>
            <Button onClick={handleAiFill} disabled={isFilling} className="bg-teal-600 hover:bg-teal-700 text-white w-full btn-hover-scale">
              {isFilling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}AI Generate Form Answers
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =================== PIPELINE TAB (ENHANCED) ===================
function PipelineTab() {
  const { applications, setApplications, setMetrics, searchQuery, setSearchQuery, statusFilter, setStatusFilter, sortBy, setSortBy, isLoadingApplications, setIsLoadingApplications, healthIssues, setHealthIssues } = useHireMeOSStore();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newApp, setNewApp] = useState({ company: '', role: '', location: '', salary: '', url: '', notes: '', score: '', date: '', recruiterEmail: '', recruiterName: '', jobType: '' });
  const [negoDialogApp, setNegoDialogApp] = useState<Application | null>(null);
  const [negoResult, setNegoResult] = useState<string | null>(null);
  const [negoLoading, setNegoLoading] = useState(false);

  const fetchApplications = useCallback(async () => {
    setIsLoadingApplications(true);
    try {
      const res = await fetch('/api/applications');
      const data: ApplicationsResponse = await res.json();
      setApplications(data.applications || []);
      setMetrics(data.metrics || null);
    } catch { toast.error('Failed to load applications'); }
    finally { setIsLoadingApplications(false); }
  }, [setApplications, setMetrics, setIsLoadingApplications]);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health-check');
      const data = await res.json();
      setHealthIssues(data.issues || []);
    } catch { /* ignore */ }
  }, [setHealthIssues]);

  useEffect(() => { fetchApplications(); fetchHealth(); }, [fetchApplications, fetchHealth]);

  const handleStatusChange = async (number: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/applications/${number}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ new_status: newStatus }) });
      if (res.ok) { toast.success(`Status updated to ${newStatus}`); fetchApplications(); }
    } catch { toast.error('Failed to update status'); }
  };

  const handleCreate = async () => {
    if (!newApp.company || !newApp.role) { toast.error('Company and Role are required'); return; }
    try {
      const res = await fetch('/api/applications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: newApp.company,
          role: newApp.role,
          location: newApp.location,
          salary: newApp.salary,
          url: newApp.url,
          notes: newApp.notes,
          score: parseFloat(newApp.score) || 0,
          date: newApp.date || new Date().toISOString().split('T')[0],
          recruiterEmail: newApp.recruiterEmail,
          recruiterName: newApp.recruiterName,
          jobType: newApp.jobType,
        })
      });
      if (res.ok) {
        toast.success('Application created');
        setAddDialogOpen(false);
        setNewApp({ company: '', role: '', location: '', salary: '', url: '', notes: '', score: '', date: '', recruiterEmail: '', recruiterName: '', jobType: '' });
        fetchApplications();
      }
    } catch { toast.error('Failed to create application'); }
  };

  const handleNegotiation = async (app: Application) => {
    setNegoDialogApp(app);
    setNegoLoading(true);
    setNegoResult(null);
    try {
      const res = await fetch('/api/negotiation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appNumber: app.number, engine: 'glm' }) });
      const data = await res.json();
      setNegoResult(data.result || data.error || 'No result');
    } catch { setNegoResult('Failed to generate negotiation scripts'); }
    finally { setNegoLoading(false); }
  };

  const filteredApps = applications.filter((app) => {
    const matchesSearch = searchQuery === '' || app.company.toLowerCase().includes(searchQuery.toLowerCase()) || app.role.toLowerCase().includes(searchQuery.toLowerCase()) || app.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === 'score') return b.score - a.score;
    if (sortBy === 'company') return a.company.localeCompare(b.company);
    return 0;
  });

  return (
    <div className="space-y-4">
      <HealthCheckBanner />
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search companies, roles, locations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-secondary/50 border-border/50" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full sm:w-40 bg-secondary/50 border-border/50"><SelectValue placeholder="Filter status" /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem>{ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        <Select value={sortBy} onValueChange={setSortBy}><SelectTrigger className="w-full sm:w-36 bg-secondary/50 border-border/50"><ArrowUpDown className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="date">By Date</SelectItem><SelectItem value="score">By Score</SelectItem><SelectItem value="company">By Company</SelectItem></SelectContent></Select>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}><DialogTrigger asChild><Button className="bg-teal-600 hover:bg-teal-700 text-white btn-hover-scale"><Plus className="h-4 w-4 mr-2" /> Add</Button></DialogTrigger>
          <DialogContent className="bg-card border-border"><DialogHeader><DialogTitle>Add New Application</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Company *</Label><Input value={newApp.company} onChange={(e) => setNewApp({ ...newApp, company: e.target.value })} className="bg-secondary/50" /></div><div className="space-y-1"><Label>Role *</Label><Input value={newApp.role} onChange={(e) => setNewApp({ ...newApp, role: e.target.value })} className="bg-secondary/50" /></div></div>
              <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Location</Label><Input value={newApp.location} onChange={(e) => setNewApp({ ...newApp, location: e.target.value })} className="bg-secondary/50" /></div><div className="space-y-1"><Label>Salary</Label><Input value={newApp.salary} onChange={(e) => setNewApp({ ...newApp, salary: e.target.value })} className="bg-secondary/50" /></div></div>
              <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Score (0-5)</Label><Input type="number" min="0" max="5" step="0.1" value={newApp.score} onChange={(e) => setNewApp({ ...newApp, score: e.target.value })} className="bg-secondary/50" /></div><div className="space-y-1"><Label>Date</Label><Input type="date" value={newApp.date} onChange={(e) => setNewApp({ ...newApp, date: e.target.value })} className="bg-secondary/50" /></div></div>
              <div className="space-y-1"><Label>URL</Label><Input value={newApp.url} onChange={(e) => setNewApp({ ...newApp, url: e.target.value })} className="bg-secondary/50" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Recruiter Name</Label><Input value={newApp.recruiterName} onChange={(e) => setNewApp({ ...newApp, recruiterName: e.target.value })} className="bg-secondary/50" /></div>
                <div className="space-y-1"><Label>Recruiter Email</Label><Input value={newApp.recruiterEmail} onChange={(e) => setNewApp({ ...newApp, recruiterEmail: e.target.value })} className="bg-secondary/50" /></div>
              </div>
              <div className="space-y-1"><Label>Notes</Label><Textarea value={newApp.notes} onChange={(e) => setNewApp({ ...newApp, notes: e.target.value })} className="bg-secondary/50" rows={2} /></div>
              <Button onClick={handleCreate} className="bg-teal-600 hover:bg-teal-700 text-white w-full btn-hover-scale">Create Application</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/30 bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader><TableRow className="border-border/50 hover:bg-transparent"><TableHead className="w-10">#</TableHead><TableHead>Company</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="w-16">Score</TableHead><TableHead className="hidden md:table-cell">Location</TableHead><TableHead className="hidden lg:table-cell">Salary</TableHead><TableHead className="hidden sm:table-cell">Date</TableHead><TableHead className="w-28">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoadingApplications ? <TableRow><TableCell colSpan={9} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                : filteredApps.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-12"><Briefcase className="h-8 w-8 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">No applications found</p></TableCell></TableRow>
                  : filteredApps.map(app => (
                    <TableRow key={app.number} className="border-border/30 hover:bg-secondary/30 transition-colors">
                      <TableCell className="text-muted-foreground text-xs">{app.number}</TableCell>
                      <TableCell><div className="flex items-center gap-2"><span className="font-medium text-sm">{app.company}</span>{app.url && <a href={app.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-teal-400"><ExternalLink className="h-3 w-3" /></a>}</div></TableCell>
                      <TableCell className="text-sm max-w-48 truncate">{app.role}</TableCell>
                      <TableCell><DropdownMenu><DropdownMenuTrigger asChild><button className="cursor-pointer"><Badge variant="outline" className={`${getStatusColor(app.status)} text-xs cursor-pointer`}>{app.status} <ChevronDown className="h-3 w-3 ml-1" /></Badge></button></DropdownMenuTrigger><DropdownMenuContent align="start" className="bg-popover border-border">{ALL_STATUSES.map(s => <DropdownMenuItem key={s} onClick={() => handleStatusChange(app.number, s)} className={app.status === s ? 'bg-secondary' : ''}>{app.status === s && <Check className="h-3 w-3 mr-2" />}<Badge variant="outline" className={`${getStatusColor(s)} text-xs`}>{s}</Badge></DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></TableCell>
                      <TableCell><div className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-400 fill-amber-400" /><span className="text-sm">{app.score}</span></div></TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground"><div className="flex items-center gap-1"><MapPin className="h-3 w-3" /><span className="max-w-32 truncate">{app.location}</span></div></TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground"><div className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{app.salary || '-'}</div></TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground"><div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(app.date)}</div></TableCell>
                      <TableCell>
                        <div className="flex gap-0.5">
                          <FillFormDialog app={app} />
                          {app.status === 'Offer' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-teal-400 btn-hover-scale" onClick={() => handleNegotiation(app)} title="Negotiate">
                              <Scale className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {app.status === 'Interview' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-teal-400 btn-hover-scale" onClick={() => handleNegotiation(app)} title="Negotiation">
                              <Scale className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {app.url && <a href={app.url} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="icon" className="h-7 w-7 hover:text-teal-400 btn-hover-scale"><ExternalLink className="h-3.5 w-3.5" /></Button></a>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      </Card>
      <p className="text-xs text-muted-foreground text-right">{filteredApps.length} of {applications.length} applications</p>

      <Dialog open={!!negoDialogApp} onOpenChange={() => setNegoDialogApp(null)}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh]">
          <DialogHeader><DialogTitle>Negotiation Scripts — {negoDialogApp?.company}</DialogTitle></DialogHeader>
          {negoLoading ? <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-teal-400" /></div>
            : negoResult && <ScrollArea className="max-h-96"><div className="prose prose-invert prose-sm max-w-none"><ReactMarkdown>{negoResult}</ReactMarkdown></div></ScrollArea>}
        </DialogContent>
      </Dialog>
    </div>
  );
}


// =================== AUTO-PIPELINE TAB (FLAGSHIP) ===================
function AutoPipelineTab() {
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
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm card-hover-lift">
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
          <div className="flex gap-3 items-center flex-wrap">
            <Select value={engine} onValueChange={setEngine}><SelectTrigger className="w-36 bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger><SelectContent>{AI_ENGINES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent></Select>
            <Button onClick={handleRun} disabled={isAutoPipelining} className="bg-teal-600 hover:bg-teal-700 text-white btn-hover-scale">
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
            <Card className="border-teal-500/30 bg-card/80 backdrop-blur-sm card-hover-lift">
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

// =================== EVALUATE TAB ===================
function EvaluateTab() {
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
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm card-hover-lift">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-teal-400" />Structured Evaluation</CardTitle>
          <CardDescription>Paste a JD for 6-block analysis with A-F grading</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea placeholder="Paste a job description here for comprehensive analysis..." value={jdText} onChange={(e) => setJdText(e.target.value)} rows={10} className="bg-secondary/50 border-border/50 resize-y font-mono text-sm" />
          <div className="flex gap-3 items-center flex-wrap">
            <Select value={engine} onValueChange={setEngine}><SelectTrigger className="w-36 bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger><SelectContent>{AI_ENGINES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent></Select>
            <Button onClick={handleEvaluate} disabled={isEvaluating} className="bg-teal-600 hover:bg-teal-700 text-white btn-hover-scale">
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

// =================== REPORTS TAB ===================
function ReportsTab() {
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
        <Button variant="outline" size="sm" onClick={fetchReports} className="border-border/50 btn-hover-scale"><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh</Button>
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
            <Card key={r.id} className="border-border/50 bg-card/80 backdrop-blur-sm hover:border-border transition-colors card-hover-lift">
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
                    <Button variant="ghost" size="sm" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} className="h-7 text-xs hover:text-teal-400 btn-hover-scale">
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

// =================== SCANNER TAB ===================
function ScannerTab() {
  const [engine, setEngine] = useState('glm');
  const [query, setQuery] = useState('');
  const { scanResult, setScanResult, isScanning, setIsScanning } = useHireMeOSStore();

  const handleScan = async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      const res = await fetch('/api/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ engine, query: query || undefined }) });
      const data = await res.json();
      setScanResult(JSON.stringify(data, null, 2));
      toast.success('Scan completed');
    } catch { toast.error('Scan failed'); }
    finally { setIsScanning(false); }
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm card-hover-lift">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ScanLine className="h-4 w-4 text-teal-400" />Job Scanner</CardTitle><CardDescription>Search for jobs across portals using AI-powered web search</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Search query (e.g. Senior AI Engineer remote)" value={query} onChange={(e) => setQuery(e.target.value)} className="bg-secondary/50 border-border/50" />
          <div className="flex gap-3 items-center flex-wrap">
            <Select value={engine} onValueChange={setEngine}><SelectTrigger className="w-36 bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger><SelectContent>{AI_ENGINES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent></Select>
            <Button onClick={handleScan} disabled={isScanning} className="bg-teal-600 hover:bg-teal-700 text-white btn-hover-scale">{isScanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}Scan Portals</Button>
          </div>
        </CardContent>
      </Card>
      <AnimatePresence>{scanResult && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        <Card className="border-teal-500/30 bg-card/80 backdrop-blur-sm"><CardHeader className="pb-3"><CardTitle className="text-base">Scan Results</CardTitle></CardHeader>
          <CardContent><ScrollArea className="max-h-72"><pre className="text-sm text-foreground/90 whitespace-pre-wrap font-mono">{scanResult}</pre></ScrollArea></CardContent>
        </Card>
      </motion.div>}</AnimatePresence>
    </div>
  );
}

// =================== AI TOOLS TAB ===================
function AIToolsTab() {
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
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm card-hover-lift">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Bot className="h-4 w-4 text-teal-400" />AI Tools</CardTitle><CardDescription>Generate cover letters, deep analysis, training plans, and project ideas</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="space-y-1 flex-1"><Label className="text-xs text-muted-foreground">Mode</Label><Select value={mode} onValueChange={setMode}><SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger><SelectContent>{AI_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1 flex-1"><Label className="text-xs text-muted-foreground">Engine</Label><Select value={engine} onValueChange={setEngine}><SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger><SelectContent>{AI_ENGINES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <Textarea placeholder="Enter your text here..." value={inputText} onChange={(e) => setInputText(e.target.value)} rows={6} className="bg-secondary/50 border-border/50 resize-y font-mono text-sm" />
          <div className="flex gap-3"><Button onClick={handleRun} disabled={isRunningAI} className="bg-teal-600 hover:bg-teal-700 text-white btn-hover-scale">{isRunningAI ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}Run AI Tool</Button>{inputText && <Button variant="ghost" size="icon" onClick={() => setInputText('')} className="h-8 w-8"><X className="h-4 w-4" /></Button>}</div>
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

// =================== SETTINGS TAB ===================
function SettingsTab() {
  const { settings, setSettings, weights, setWeights, setUserName } = useHireMeOSStore();
  const [localSettings, setLocalSettings] = useState<SettingsData>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [localWeights, setLocalWeights] = useState<ScoringWeight[]>([]);

  const handleMagicParse = async () => {
    if (!localSettings.cv?.trim()) { toast.error('Please paste your CV first'); return; }
    setIsParsing(true);
    try {
      const res = await fetch('/api/parse-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText: localSettings.cv, autoPopulate: true }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Magic! Profile and search queries auto-populated.');
        if (data.parsed.name) setUserName(data.parsed.name);
        // Refresh settings to get auto-populated queries
        const sRes = await fetch('/api/settings');
        const sData = await sRes.json();
        setSettings(sData);
        setLocalSettings(sData);
      } else {
        toast.error(data.error || 'Parsing failed');
      }
    } catch { toast.error('Failed to parse CV'); }
    finally { setIsParsing(false); }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try { const res = await fetch('/api/settings'); const data = await res.json(); setSettings(data); setLocalSettings(data); } catch { /* */ }
    };
    fetchSettings();
  }, [setSettings]);

  useEffect(() => {
    const fetchWeights = async () => {
      try { const res = await fetch('/api/weights'); const data = await res.json(); setWeights(data.weights || []); setLocalWeights(data.weights || []); } catch { /* */ }
    };
    fetchWeights();
  }, [setWeights]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(localSettings) });
      if (res.ok) { setSettings(localSettings); toast.success('Settings saved'); }
    } catch { toast.error('Failed to save settings'); }
    finally { setIsSaving(false); }
  };

  const handleSaveWeights = async () => {
    try {
      await fetch('/api/weights', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ weights: localWeights }) });
      setWeights(localWeights);
      toast.success('Weights saved');
    } catch { toast.error('Failed to save weights'); }
  };

  const handleResetWeights = async () => {
    const defaults = DEFAULT_WEIGHTS;
    setLocalWeights(defaults.map((d, i) => ({ ...d, id: localWeights[i]?.id || '', createdAt: localWeights[i]?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() })));
    toast.info('Weights reset to defaults. Click Save to apply.');
  };

  const settingFields = [
    { key: 'env' as const, label: '.env Configuration', placeholder: 'API_KEY=xxx\nMODEL=glm-4\n...' },
    { key: 'cv' as const, label: 'CV Markdown', placeholder: '# John Doe\n## Experience\n- Senior Engineer at...' },
    { key: 'profile' as const, label: 'Profile YAML', placeholder: 'name: John Doe\nlocation: San Francisco\nskills:\n  - Python\n  - ML' },
    { key: 'portals' as const, label: 'Portals YAML', placeholder: 'portals:\n  - name: LinkedIn\n    url: https://linkedin.com/jobs' },
    { key: 'proofs' as const, label: 'Proof Points', placeholder: 'Key achievements, metrics, published articles...' },
  ];

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Settings2 className="h-4 w-4 text-teal-400" />Configuration</CardTitle><CardDescription>Manage your CV, profile, portals, and proof points</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {settingFields.map(field => (
            <div key={field.key} className="space-y-1"><Label className="text-sm font-medium">{field.label}</Label><Textarea value={localSettings[field.key] || ''} onChange={(e) => setLocalSettings({ ...localSettings, [field.key]: e.target.value })} placeholder={field.placeholder} rows={field.key === 'cv' ? 8 : 5} className="bg-secondary/50 border-border/50 font-mono text-xs resize-y" /></div>
          ))}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={isSaving} className="bg-teal-600 hover:bg-teal-700 text-white btn-hover-scale">{isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}Save Settings</Button>
            <Button onClick={handleMagicParse} disabled={isParsing} variant="outline" className="border-teal-500/30 text-teal-400 btn-hover-scale">
              {isParsing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}Magic Parse (AI)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Scale className="h-4 w-4 text-teal-400" />Scoring Weights</CardTitle><CardDescription>Customize dimension weights for evaluation scoring</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {localWeights.map((w, i) => (
            <div key={w.dimension} className="flex items-center gap-4">
              <Label className="text-sm min-w-36">{w.label}</Label>
              <Slider value={[w.weight * 100]} min={0} max={50} step={1} className="flex-1" onValueChange={(v) => {
                const newWeights = [...localWeights];
                newWeights[i] = { ...newWeights[i], weight: v[0] / 100 };
                setLocalWeights(newWeights);
              }} />
              <span className="text-sm font-mono w-12 text-right">{(w.weight * 100).toFixed(0)}%</span>
            </div>
          ))}
          <div className="flex gap-3">
            <Button onClick={handleSaveWeights} className="bg-teal-600 hover:bg-teal-700 text-white btn-hover-scale"><Save className="h-4 w-4 mr-2" />Save Weights</Button>
            <Button variant="outline" onClick={handleResetWeights} className="border-border/50"><RefreshCw className="h-4 w-4 mr-2" />Reset to Default</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


// =================== STORY BANK TAB ===================
function StoryBankTab() {
  const { stories, setStories, isLoadingStories, setIsLoadingStories } = useHireMeOSStore();
  const [newStory, setNewStory] = useState({ title: '', situation: '', task: '', action: '', result: '', reflection: '', tags: '' });
  const [addOpen, setAddOpen] = useState(false);

  const fetchStories = useCallback(async () => {
    setIsLoadingStories(true);
    try {
      const res = await fetch('/api/stories');
      const data = await res.json();
      setStories(data.stories || []);
    } catch { toast.error('Failed to load stories'); }
    finally { setIsLoadingStories(false); }
  }, [setStories, setIsLoadingStories]);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  const handleDelete = async (id: string) => {
    try { await fetch(`/api/stories/${id}`, { method: 'DELETE' }); toast.success('Story deleted'); fetchStories(); }
    catch { toast.error('Failed to delete story'); }
  };

  const handleAdd = async () => {
    if (!newStory.title || !newStory.situation) { toast.error('Title and Situation are required'); return; }
    try {
      const res = await fetch('/api/stories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newStory) });
      if (res.ok) { toast.success('Story added'); setAddOpen(false); setNewStory({ title: '', situation: '', task: '', action: '', result: '', reflection: '', tags: '' }); fetchStories(); }
    } catch { toast.error('Failed to add story'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium flex items-center gap-2"><BookOpen className="h-4 w-4 text-teal-400" />Interview Story Bank ({stories.length})</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchStories} className="border-border/50 btn-hover-scale"><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh</Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogTrigger asChild><Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white btn-hover-scale"><Plus className="h-3.5 w-3.5 mr-1.5" />Add Story</Button></DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg"><DialogHeader><DialogTitle>Add STAR+R Story</DialogTitle></DialogHeader>
              <div className="grid gap-3 py-2 max-h-96 overflow-y-auto">
                <div className="space-y-1"><Label>Title *</Label><Input value={newStory.title} onChange={e => setNewStory({ ...newStory, title: e.target.value })} className="bg-secondary/50" placeholder="e.g. Leading a migration to microservices" /></div>
                <div className="space-y-1"><Label>Situation *</Label><Textarea value={newStory.situation} onChange={e => setNewStory({ ...newStory, situation: e.target.value })} className="bg-secondary/50" rows={2} placeholder="What was the context?" /></div>
                <div className="space-y-1"><Label>Task</Label><Textarea value={newStory.task} onChange={e => setNewStory({ ...newStory, task: e.target.value })} className="bg-secondary/50" rows={2} placeholder="What was your responsibility?" /></div>
                <div className="space-y-1"><Label>Action</Label><Textarea value={newStory.action} onChange={e => setNewStory({ ...newStory, action: e.target.value })} className="bg-secondary/50" rows={2} placeholder="What did you do?" /></div>
                <div className="space-y-1"><Label>Result</Label><Textarea value={newStory.result} onChange={e => setNewStory({ ...newStory, result: e.target.value })} className="bg-secondary/50" rows={2} placeholder="What was the outcome?" /></div>
                <div className="space-y-1"><Label>Reflection</Label><Textarea value={newStory.reflection} onChange={e => setNewStory({ ...newStory, reflection: e.target.value })} className="bg-secondary/50" rows={2} placeholder="What would you do differently?" /></div>
                <div className="space-y-1"><Label>Tags</Label><Input value={newStory.tags} onChange={e => setNewStory({ ...newStory, tags: e.target.value })} className="bg-secondary/50" placeholder="leadership, technical, collaboration" /></div>
                <Button onClick={handleAdd} className="bg-teal-600 hover:bg-teal-700 text-white w-full btn-hover-scale">Save Story</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoadingStories ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-teal-400" /></div>
        : stories.length === 0 ? (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm"><CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-lg font-medium mb-1">No stories yet</p>
            <p className="text-muted-foreground text-sm">Save stories from evaluations or add them manually.</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">{stories.map(s => (
            <Card key={s.id} className="border-border/50 bg-card/80 backdrop-blur-sm hover:border-border transition-colors card-hover-lift">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{s.title}</h4>
                    {s.tags && <div className="flex flex-wrap gap-1 mt-1">{s.tags.split(',').map(t => <Badge key={t} variant="outline" className="text-xs border-teal-500/30 text-teal-400">{t.trim()}</Badge>)}</div>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 hover:text-red-400" onClick={() => handleDelete(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
                <Accordion type="multiple" className="mt-3">
                  {s.situation && <AccordionItem value="s"><AccordionTrigger className="text-xs py-1.5">Situation</AccordionTrigger><AccordionContent><p className="text-sm text-foreground/80">{s.situation}</p></AccordionContent></AccordionItem>}
                  {s.task && <AccordionItem value="t"><AccordionTrigger className="text-xs py-1.5">Task</AccordionTrigger><AccordionContent><p className="text-sm text-foreground/80">{s.task}</p></AccordionContent></AccordionItem>}
                  {s.action && <AccordionItem value="a"><AccordionTrigger className="text-xs py-1.5">Action</AccordionTrigger><AccordionContent><p className="text-sm text-foreground/80">{s.action}</p></AccordionContent></AccordionItem>}
                  {s.result && <AccordionItem value="r"><AccordionTrigger className="text-xs py-1.5">Result</AccordionTrigger><AccordionContent><p className="text-sm text-foreground/80">{s.result}</p></AccordionContent></AccordionItem>}
                  {s.reflection && <AccordionItem value="ref"><AccordionTrigger className="text-xs py-1.5">Reflection</AccordionTrigger><AccordionContent><p className="text-sm text-foreground/80">{s.reflection}</p></AccordionContent></AccordionItem>}
                </Accordion>
                {s.source && <p className="text-xs text-muted-foreground mt-2">Source: evaluation report</p>}
              </CardContent>
            </Card>
          ))}</div>
        )}
    </div>
  );
}

// =================== BATCH TAB ===================
function BatchTab() {
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
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm card-hover-lift">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4 text-teal-400" />Batch Evaluation</CardTitle>
          <CardDescription>Evaluate multiple job descriptions at once. Separate each JD with ---</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea placeholder="Paste multiple job descriptions separated by ---" value={jdTexts} onChange={e => setJdTexts(e.target.value)} rows={12} className="bg-secondary/50 border-border/50 resize-y font-mono text-sm" />
          <div className="flex gap-3 items-center flex-wrap">
            <Select value={engine} onValueChange={setEngine}><SelectTrigger className="w-36 bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger><SelectContent>{AI_ENGINES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent></Select>
            <Button onClick={handleRun} disabled={isRunningBatch} className="bg-teal-600 hover:bg-teal-700 text-white btn-hover-scale">
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

// =================== CV GENERATOR TAB ===================
function CVGenTab() {
  const { applications, cvHtml, setCvHtml, isGeneratingCV, setIsGeneratingCV } = useHireMeOSStore();
  const [selectedApp, setSelectedApp] = useState<string>('');
  const [engine, setEngine] = useState('glm');

  const handleGenerate = async () => {
    if (!selectedApp) { toast.error('Select an application'); return; }
    setIsGeneratingCV(true); setCvHtml(null);
    try {
      const res = await fetch('/api/generate-cv', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appNumber: parseInt(selectedApp), engine }) });
      const data = await res.json();
      if (data.html) { setCvHtml(data.html); toast.success('CV generated'); }
      else { toast.error(data.error || 'CV generation failed'); }
    } catch { toast.error('Failed to generate CV'); }
    finally { setIsGeneratingCV(false); }
  };

  const handlePrint = () => {
    if (!cvHtml) return;
    const win = window.open('', '_blank');
    if (win) { win.document.write(cvHtml); win.document.close(); win.print(); }
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm card-hover-lift">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-teal-400" />ATS-Optimized CV Generator</CardTitle>
          <CardDescription>Generate a tailored, keyword-injected CV for a specific job application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedApp} onValueChange={setSelectedApp}>
              <SelectTrigger className="flex-1 bg-secondary/50 border-border/50"><SelectValue placeholder="Select an application..." /></SelectTrigger>
              <SelectContent>{applications.map(a => <SelectItem key={a.number} value={String(a.number)}>{a.company} — {a.role}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={engine} onValueChange={setEngine}><SelectTrigger className="w-36 bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger><SelectContent>{AI_ENGINES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent></Select>
            <Button onClick={handleGenerate} disabled={isGeneratingCV || !selectedApp} className="bg-teal-600 hover:bg-teal-700 text-white btn-hover-scale">
              {isGeneratingCV ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}Generate CV
            </Button>
          </div>
        </CardContent>
      </Card>

      {cvHtml && (
        <Card className="border-teal-500/30 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Printer className="h-4 w-4 text-teal-400" />CV Preview</CardTitle>
              <Button onClick={handlePrint} size="sm" className="bg-teal-600 hover:bg-teal-700 text-white btn-hover-scale"><Printer className="h-3.5 w-3.5 mr-1.5" />Print / Download PDF</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-white rounded-lg overflow-hidden border border-border/30">
              <iframe srcDoc={cvHtml} className="w-full h-[600px]" title="CV Preview" sandbox="allow-same-origin" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// =================== TOOLS TAB ===================
function ToolsTab() {
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
        <Card key={tool.id} className="border-border/50 bg-card/80 backdrop-blur-sm hover:border-teal-500/30 transition-colors card-hover-lift">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><tool.icon className="h-4 w-4 text-teal-400" />{tool.label}</CardTitle><CardDescription className="text-xs">{tool.desc}</CardDescription></CardHeader>
          <CardContent><Button onClick={() => handleTool(tool.id)} disabled={isRunningTool} className="bg-teal-600 hover:bg-teal-700 text-white w-full btn-hover-scale">{isRunningTool ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}Run {tool.label}</Button></CardContent>
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


// =================== NOTIFICATION BELL ===================
function NotificationBell() {
  const { notifications, unreadNotificationCount, setNotifications, setUnreadNotificationCount } = useHireMeOSStore();
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadNotificationCount(data.unreadCount || 0);
    } catch { /* ignore */ }
  }, [setNotifications, setUnreadNotificationCount]);

  useEffect(() => { fetchNotifications(); const interval = setInterval(fetchNotifications, 30000); return () => clearInterval(interval); }, [fetchNotifications]);

  const markAllRead = async () => {
    try { await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllRead: true }) }); setUnreadNotificationCount(0); setNotifications(notifications.map(n => ({ ...n, read: true }))); } catch { /* ignore */ }
  };

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="h-8 w-8 relative" onClick={() => setOpen(!open)}>
        <Bell className="h-4 w-4" />
        {unreadNotificationCount > 0 && <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white badge-pulse">{unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}</span>}
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 top-10 z-50 w-80 max-h-96 overflow-hidden rounded-lg border border-border/50 bg-card shadow-xl">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
              <span className="text-sm font-medium">Notifications</span>
              {unreadNotificationCount > 0 && <Button variant="ghost" size="sm" className="h-6 text-xs text-teal-400" onClick={markAllRead}>Mark all read</Button>}
            </div>
            <ScrollArea className="max-h-80">
              {notifications.length === 0 ? <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
                : notifications.map(n => (
                  <div key={n.id} className={`px-3 py-2 border-b border-border/20 ${!n.read ? 'bg-teal-500/5' : ''}`}>
                    <div className="flex items-start gap-2">
                      {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{n.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                        {n.link && <a href={n.link} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-400 hover:underline">View</a>}
                      </div>
                    </div>
                  </div>
                ))}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =================== AUTOPILOT TAB (FULLY AUTONOMOUS 24/7) ===================
const AUTOPILOT_PHASES = [
  { id: 'scanning', label: 'Scanning portals', icon: ScanLine, color: 'text-sky-400' },
  { id: 'evaluating', label: 'Evaluating matches', icon: FileText, color: 'text-teal-400' },
  { id: 'applying', label: 'Auto-applying', icon: Rocket, color: 'text-emerald-400' },
  { id: 'followups', label: 'Scheduling follow-ups', icon: Mail, color: 'text-amber-400' },
  { id: 'complete', label: 'Cycle complete', icon: Check, color: 'text-emerald-400' },
] as const;

function AutopilotTab() {
  const {
    schedulerConfig, setSchedulerConfig, isRunningCycle, setIsRunningCycle,
    lastCycleResult, setLastCycleResult, followUps, setFollowUps,
    applications, settings, cycleHistory, setCycleHistory,
    autoApplyLogs, setAutoApplyLogs,
    cycleProgress, setCycleProgress, isServerSchedulerRunning, setIsServerSchedulerRunning,
    emailConfig, setEmailConfig,
  } = useHireMeOSStore();
  const [activeSection, setActiveSection] = useState<'config' | 'live' | 'history' | 'followups' | 'logs' | 'email'>('live');
  const [nextCycleCountdown, setNextCycleCountdown] = useState<number>(0);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/scheduler');
      const data = await res.json();
      setSchedulerConfig(data.config);
      if (data.progress) setCycleProgress(data.progress);
      if (data.isRunning !== undefined) setIsServerSchedulerRunning(data.isRunning);
    } catch { /* ignore */ }
  }, [setSchedulerConfig, setCycleProgress, setIsServerSchedulerRunning]);

  const fetchFollowUps = useCallback(async () => {
    try { const res = await fetch('/api/follow-up'); const data = await res.json(); setFollowUps(data.followUps || []); } catch { /* ignore */ }
  }, [setFollowUps]);

  const fetchCycleHistory = useCallback(async () => {
    try { const res = await fetch('/api/cycle-history?limit=50'); const data = await res.json(); setCycleHistory(data.history || []); } catch { /* ignore */ }
  }, [setCycleHistory]);

  const fetchAutoApplyLogs = useCallback(async () => {
    try { const res = await fetch('/api/auto-apply'); const data = await res.json(); setAutoApplyLogs(data.logs || []); } catch { /* ignore */ }
  }, [setAutoApplyLogs]);

  const fetchEmailConfig = useCallback(async () => {
    try { const res = await fetch('/api/email-config'); const data = await res.json(); setEmailConfig(data.config); } catch { /* ignore */ }
  }, [setEmailConfig]);

  useEffect(() => { fetchConfig(); fetchFollowUps(); fetchCycleHistory(); fetchAutoApplyLogs(); fetchEmailConfig(); }, [fetchConfig, fetchFollowUps, fetchCycleHistory, fetchAutoApplyLogs, fetchEmailConfig]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/scheduler/stream');
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as CycleProgress & { isRunning?: boolean };
            setCycleProgress(data);
            if (data.isRunning !== undefined) setIsServerSchedulerRunning(data.isRunning);
            if (data.phase === 'scanning' || data.phase === 'evaluating' || data.phase === 'applying' || data.phase === 'followups') {
              setIsRunningCycle(true);
            } else if (data.phase === 'complete' || data.phase === 'idle' || data.phase === 'error') {
              if (data.phase === 'complete') { fetchCycleHistory(); fetchFollowUps(); fetchAutoApplyLogs(); }
              setTimeout(() => setIsRunningCycle(false), 2000);
            }
          } catch { /* ignore parse errors */ }
        };
        eventSource.onerror = () => {
          eventSource?.close();
          reconnectTimer = setTimeout(connectSSE, 5000);
        };
      } catch {
        reconnectTimer = setTimeout(() => { fetchConfig(); connectSSE(); }, 10000);
      }
    };
    connectSSE();
    return () => { eventSource?.close(); clearTimeout(reconnectTimer); };
  }, [setCycleProgress, setIsServerSchedulerRunning, setIsRunningCycle, fetchCycleHistory, fetchFollowUps, fetchAutoApplyLogs, fetchConfig]);

  useEffect(() => {
    if (!schedulerConfig?.enabled) { setNextCycleCountdown(0); return; }
    const updateCountdown = () => {
      if (schedulerConfig?.nextRunAt) {
        const next = new Date(schedulerConfig.nextRunAt).getTime();
        const remaining = Math.max(0, Math.floor((next - Date.now()) / 1000));
        setNextCycleCountdown(remaining);
      }
    };
    updateCountdown();
    const id = setInterval(updateCountdown, 1000);
    return () => clearInterval(id);
  }, [schedulerConfig?.enabled, schedulerConfig?.nextRunAt]);

  useEffect(() => {
    if (!schedulerConfig?.enabled) return;
    const refreshId = setInterval(fetchConfig, 30000);
    return () => clearInterval(refreshId);
  }, [schedulerConfig?.enabled, fetchConfig]);

  const handleToggleScheduler = async () => {
    if (!schedulerConfig) return;
    try {
      const res = await fetch('/api/scheduler', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !schedulerConfig.enabled }) });
      const data = await res.json();
      setSchedulerConfig(data.config);
      toast.success(schedulerConfig.enabled ? 'Autopilot stopped' : 'Autopilot started — server will run cycles 24/7');
    } catch { toast.error('Failed to toggle autopilot'); }
  };

  const handleRunCycle = useCallback(async (triggeredBy: string = 'manual') => {
    if (isRunningCycle) return;
    setIsRunningCycle(true);
    try {
      const res = await fetch('/api/scheduler', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ triggeredBy }) });
      const data = await res.json();
      if (data.success) {
        setLastCycleResult(data.results);
        const r = data.results;
        toast.success(`Cycle done: ${r.scannedJobs} scanned, ${r.evaluatedJobs} eval'd, ${r.autoAppliedJobs} applied`, { duration: 5000 });
      } else if (data.message === 'Cycle already in progress') {
        toast.info('A cycle is already running on the server');
      } else { toast.error('Cycle completed with errors'); }
      fetchCycleHistory(); fetchFollowUps(); fetchAutoApplyLogs();
    } catch { toast.error('Scheduler cycle failed'); }
    finally { setTimeout(() => setIsRunningCycle(false), 2000); }
  }, [isRunningCycle, setIsRunningCycle, setLastCycleResult, fetchCycleHistory, fetchFollowUps, fetchAutoApplyLogs]);

  const handleUpdateConfig = async (updates: Partial<SchedulerConfig>) => {
    try {
      const res = await fetch('/api/scheduler', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
      const data = await res.json();
      setSchedulerConfig(data.config);
      toast.success('Config updated');
    } catch { toast.error('Failed to update config'); }
  };

  const handleUpdateEmailConfig = async (updates: Partial<EmailConfig>) => {
    try {
      const res = await fetch('/api/email-config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
      const data = await res.json();
      setEmailConfig(data.config);
      toast.success('Email config updated');
    } catch { toast.error('Failed to update email config'); }
  };

  const handleTestEmail = async () => {
    try {
      const res = await fetch('/api/email-config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...emailConfig, testConnection: true }) });
      const data = await res.json();
      if (data.testResult?.success) toast.success(data.testResult.message);
      else toast.error(data.testResult?.message || 'SMTP test failed');
    } catch { toast.error('Failed to test email connection'); }
  };

  const handleGenerateFollowUp = async (appNumber: number, type: string) => {
    try {
      const res = await fetch('/api/follow-up', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appNumber, type }) });
      const data = await res.json();
      if (data.emailContent) { toast.success('Follow-up email generated'); fetchFollowUps(); }
      else { toast.error(data.error || 'Failed to generate follow-up'); }
    } catch { toast.error('Failed to generate follow-up'); }
  };

  const handleMarkFollowUpSent = async (followUpId: string) => {
    try { await fetch('/api/follow-up', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ followUpId }) }); toast.success('Marked as sent'); fetchFollowUps(); }
    catch { toast.error('Failed to update follow-up'); }
  };

  const hasCV = Boolean(settings.cv?.trim());
  const hasEmailConfig = Boolean(emailConfig?.smtpHost && emailConfig?.fromEmail);
  const config = schedulerConfig;
  const formatCountdown = (seconds: number) => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}:${s.toString().padStart(2, '0')}`; };

  const activePhase = cycleProgress?.phase || 'idle';
  const progressPercent = cycleProgress?.progress || 0;
  const progressMessage = cycleProgress?.message || '';

  const last24hCycles = (cycleHistory || []).filter(c => new Date(c.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000);
  const summary24h = {
    cycles: last24hCycles.length,
    scanned: last24hCycles.reduce((s, c) => s + c.scannedJobs, 0),
    evaluated: last24hCycles.reduce((s, c) => s + c.evaluatedJobs, 0),
    applied: last24hCycles.reduce((s, c) => s + c.autoAppliedJobs, 0),
    followups: last24hCycles.reduce((s, c) => s + c.followUpsScheduled, 0),
  };

  return (
    <div className="space-y-4">
      {/* Master Autopilot Control */}
      <Card className={`border-2 ${config?.enabled ? 'border-emerald-500/50' : 'border-border/50'} bg-card/80 backdrop-blur-sm`}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${config?.enabled ? 'bg-emerald-500/20 animate-pulse' : 'bg-secondary/50'}`}>
                <Rocket className={`h-6 w-6 ${config?.enabled ? 'text-emerald-400' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">Autopilot Mode <span className="pro-badge">Pro</span></CardTitle>
                <CardDescription>
                  {config?.enabled ? `Server-side 24/7 — next cycle in ${formatCountdown(nextCycleCountdown)}` : 'Stopped — enable for fully autonomous server-side 24/7 operation'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {config?.lastRunAt && (<span className="text-xs text-muted-foreground hidden sm:inline">Last: {formatDate(config.lastRunAt)}</span>)}
              <Button onClick={handleToggleScheduler} className={`${config?.enabled ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white btn-hover-scale`}>
                {config?.enabled ? <><X className="h-4 w-4 mr-2" />Stop</> : <><Rocket className="h-4 w-4 mr-2" />Start 24/7</>}
              </Button>
              <Button variant="outline" onClick={() => handleRunCycle('manual')} disabled={isRunningCycle} className="border-teal-500/30 btn-hover-scale">
                {isRunningCycle ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}Run Now
              </Button>
            </div>
          </div>
        </CardHeader>
        {!hasCV && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="text-sm text-amber-400">Add your CV in Settings for auto-apply and accurate evaluations</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Real-Time Progress */}
      <AnimatePresence>
        {(isRunningCycle || (cycleProgress && cycleProgress.phase !== 'idle' && cycleProgress.phase !== 'error')) && activePhase !== 'idle' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border-teal-500/30 bg-card/80 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-4">
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-teal-400">{progressMessage || AUTOPILOT_PHASES.find(p => p.id === activePhase)?.label || 'Running cycle...'}</span>
                    <span className="text-xs text-muted-foreground">{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
                <div className="flex gap-2">
                  {AUTOPILOT_PHASES.map((phase, i) => {
                    const phaseOrder = ['scanning', 'evaluating', 'applying', 'followups', 'complete'];
                    const phaseIdx = phaseOrder.indexOf(activePhase);
                    const isActive = phase.id === activePhase;
                    const isCompleted = i < phaseIdx;
                    const PhaseIcon = phase.icon;
                    return (
                      <div key={phase.id} className="flex items-center gap-1.5 flex-1">
                        <div className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 transition-colors ${isCompleted ? 'bg-emerald-500/20' : isActive ? 'bg-teal-500/20' : 'bg-secondary/50'}`}>
                          {isCompleted ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : isActive ? <Loader2 className="h-3.5 w-3.5 text-teal-400 animate-spin" /> : <PhaseIcon className="h-3.5 w-3.5 text-muted-foreground" />}
                        </div>
                        <span className={`text-xs truncate ${isCompleted ? 'text-emerald-400' : isActive ? 'text-teal-400 font-medium' : 'text-muted-foreground'}`}>{phase.label}</span>
                      </div>
                    );
                  })}
                </div>
                {cycleProgress && (cycleProgress.scannedJobs > 0 || cycleProgress.evaluatedJobs > 0 || cycleProgress.autoAppliedJobs > 0) && (
                  <div className="mt-3 flex gap-3 text-xs">
                    {cycleProgress.scannedJobs > 0 && <span className="text-sky-400">{cycleProgress.scannedJobs} scanned</span>}
                    {cycleProgress.evaluatedJobs > 0 && <span className="text-teal-400">{cycleProgress.evaluatedJobs} evaluated</span>}
                    {cycleProgress.autoAppliedJobs > 0 && <span className="text-emerald-400">{cycleProgress.autoAppliedJobs} applied</span>}
                    {cycleProgress.followUpsScheduled > 0 && <span className="text-amber-400">{cycleProgress.followUpsScheduled} follow-ups</span>}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 24h Summary */}
      {config?.enabled && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Cycles (24h)', value: summary24h.cycles, icon: RefreshCw, color: 'text-teal-400', bg: 'bg-teal-500/10' },
            { label: 'Scanned (24h)', value: summary24h.scanned, icon: ScanLine, color: 'text-sky-400', bg: 'bg-sky-500/10' },
            { label: 'Evaluated (24h)', value: summary24h.evaluated, icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/10' },
            { label: 'Applied (24h)', value: summary24h.applied, icon: Rocket, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Follow-ups (24h)', value: summary24h.followups, icon: Mail, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          ].map(card => (
            <Card key={card.label} className="border-border/50 bg-card/80 backdrop-blur-sm card-hover-lift">
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${card.bg}`}><card.icon className={`h-4 w-4 ${card.color}`} /></div>
                <div><p className="text-lg font-bold"><AnimatedNumber value={card.value} /></p><p className="text-xs text-muted-foreground">{card.label}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'live' as const, label: 'Live', icon: Zap },
          { id: 'config' as const, label: 'Config', icon: Settings2 },
          { id: 'email' as const, label: 'Email', icon: Mail },
          { id: 'history' as const, label: 'History', icon: Clock },
          { id: 'followups' as const, label: 'Follow-Ups', icon: MessageSquare },
          { id: 'logs' as const, label: 'Apply Logs', icon: ClipboardList },
        ].map(tab => (
          <Button key={tab.id} variant={activeSection === tab.id ? 'default' : 'outline'} size="sm" onClick={() => setActiveSection(tab.id)} className={activeSection === tab.id ? 'bg-teal-600 hover:bg-teal-700 text-white' : 'border-border/50 btn-hover-scale'}>
            <tab.icon className="h-3.5 w-3.5 mr-1.5" />{tab.label}
          </Button>
        ))}
      </div>

      {/* Live Section */}
      {activeSection === 'live' && (
        <div className="space-y-4">
          {lastCycleResult && !isRunningCycle && (
            <Card className="border-teal-500/30 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-teal-400" />Last Cycle Results</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                  {[
                    { label: 'Scanned', value: (lastCycleResult as Record<string, unknown>).scannedJobs, icon: ScanLine, color: 'text-sky-400' },
                    { label: 'Evaluated', value: (lastCycleResult as Record<string, unknown>).evaluatedJobs, icon: FileText, color: 'text-teal-400' },
                    { label: 'Auto-Applied', value: (lastCycleResult as Record<string, unknown>).autoAppliedJobs, icon: Rocket, color: 'text-emerald-400' },
                    { label: 'Follow-Ups', value: (lastCycleResult as Record<string, unknown>).followUpsScheduled, icon: Mail, color: 'text-amber-400' },
                    { label: 'New Apps', value: (lastCycleResult as Record<string, unknown>).newApplications, icon: Briefcase, color: 'text-purple-400' },
                    { label: 'Duration', value: `${Math.round(((lastCycleResult as Record<string, unknown>).duration as number || 0) / 1000)}s`, icon: Clock, color: 'text-sky-400' },
                    { label: 'Errors', value: (lastCycleResult as Record<string, unknown>).errors ? ((lastCycleResult as Record<string, unknown>).errors as unknown[]).length : 0, icon: AlertTriangle, color: 'text-red-400' },
                  ].map(item => (
                    <div key={item.label} className="flex flex-col items-center p-3 rounded-lg bg-secondary/30">
                      <item.icon className={`h-4 w-4 ${item.color} mb-1`} />
                      <span className="text-lg font-bold">{String(item.value)}</span>
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
                {((lastCycleResult as Record<string, unknown>).errors as string[])?.length > 0 && (
                  <div className="mt-4 space-y-1">
                    {((lastCycleResult as Record<string, unknown>).errors as string[]).map((err: string, i: number) => (
                      <div key={i} className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">{err}</div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {!lastCycleResult && !isRunningCycle && (
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <Rocket className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-2">No cycle results yet.</p>
                <p className="text-xs text-muted-foreground">Click &quot;Start 24/7&quot; for autonomous operation, or &quot;Run Now&quot; for a single cycle.</p>
              </CardContent>
            </Card>
          )}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-teal-400" />Autopilot Status</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${config?.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-secondary text-muted-foreground'}`}>
                    <div className={`w-2 h-2 rounded-full ${config?.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                    {config?.enabled ? 'ACTIVE' : 'STOPPED'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Autopilot</p>
                </div>
                <div className="text-center"><p className="text-sm font-medium">{config?.scanIntervalMin || 60} min</p><p className="text-xs text-muted-foreground">Scan Interval</p></div>
                <div className="text-center"><p className="text-sm font-medium">{config?.autoApply ? 'On' : 'Off'}</p><p className="text-xs text-muted-foreground">Auto-Apply</p></div>
                <div className="text-center"><p className="text-sm font-medium">{config?.autoEvaluate ? 'On' : 'Off'}</p><p className="text-xs text-muted-foreground">Auto-Evaluate</p></div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Config Section */}
      {activeSection === 'config' && config && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ScanLine className="h-4 w-4 text-teal-400" />Scanning</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5"><Label className="text-xs">Scan Interval (minutes) — minimum 5</Label><Input type="number" min={5} max={1440} value={config.scanIntervalMin} onChange={(e) => handleUpdateConfig({ scanIntervalMin: parseInt(e.target.value) || 60 })} className="bg-secondary/50 border-border/50" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Portals to Scan</Label><Input value={config.portals} onChange={(e) => handleUpdateConfig({ portals: e.target.value })} placeholder="linkedin,indeed,glassdoor,wellfound" className="bg-secondary/50 border-border/50" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Search Queries</Label><Textarea value={config.searchQueries} onChange={(e) => handleUpdateConfig({ searchQueries: e.target.value })} placeholder="AI Engineer, ML Engineer, LLM Engineer..." className="bg-secondary/50 border-border/50" rows={3} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Location Filter</Label><Input value={config.locationFilter} onChange={(e) => handleUpdateConfig({ locationFilter: e.target.value })} placeholder="Remote, San Francisco, London..." className="bg-secondary/50 border-border/50" /></div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-teal-400" />Auto-Actions</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Auto-Evaluate</p><p className="text-xs text-muted-foreground">Automatically evaluate new job matches</p></div><button onClick={() => handleUpdateConfig({ autoEvaluate: !config.autoEvaluate })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.autoEvaluate ? 'bg-teal-600' : 'bg-secondary'}`}><span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${config.autoEvaluate ? 'translate-x-6' : 'translate-x-1'}`} /></button></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Auto-Apply</p><p className="text-xs text-muted-foreground">Automatically apply to jobs meeting threshold</p></div><button onClick={() => handleUpdateConfig({ autoApply: !config.autoApply })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.autoApply ? 'bg-emerald-600' : 'bg-secondary'}`}><span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${config.autoApply ? 'translate-x-6' : 'translate-x-1'}`} /></button></div>
              <div className="space-y-1.5"><Label className="text-xs">Min Score to Auto-Apply (0-5)</Label><Input type="number" min={0} max={5} step={0.1} value={config.minScoreToApply} onChange={(e) => handleUpdateConfig({ minScoreToApply: parseFloat(e.target.value) || 3.5 })} className="bg-secondary/50 border-border/50" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Min Grade to Auto-Apply</Label><Select value={config.minGradeToApply} onValueChange={(v) => handleUpdateConfig({ minGradeToApply: v })}><SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger><SelectContent>{['A', 'B', 'C', 'D'].map(g => <SelectItem key={g} value={g}>{g} or higher</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Follow-Up Interval (days)</Label><Input type="number" min={1} max={30} value={config.followUpIntervalDays} onChange={(e) => handleUpdateConfig({ followUpIntervalDays: parseInt(e.target.value) || 7 })} className="bg-secondary/50 border-border/50" /></div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Email Section */}
      {activeSection === 'email' && (
        <div className="space-y-4">
          <Card className={`border-2 ${hasEmailConfig ? 'border-emerald-500/30' : 'border-amber-500/30'} bg-card/80 backdrop-blur-sm`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4 text-teal-400" />SMTP Email Configuration</CardTitle>
                <Badge variant="outline" className={`text-xs ${hasEmailConfig ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>{hasEmailConfig ? 'Configured' : 'Not Configured'}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!hasEmailConfig && (<div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-3"><AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" /><span className="text-sm text-amber-400">Configure SMTP for automatic email sending. Without this, follow-ups use mailto: links.</span></div>)}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="space-y-1.5"><Label className="text-xs">SMTP Host</Label><Input value={emailConfig?.smtpHost || ''} onChange={(e) => handleUpdateEmailConfig({ smtpHost: e.target.value })} placeholder="smtp.gmail.com" className="bg-secondary/50 border-border/50" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">SMTP Port</Label><Input type="number" value={emailConfig?.smtpPort || 587} onChange={(e) => handleUpdateEmailConfig({ smtpPort: parseInt(e.target.value) || 587 })} placeholder="587" className="bg-secondary/50 border-border/50" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">SMTP Username</Label><Input value={emailConfig?.smtpUser || ''} onChange={(e) => handleUpdateEmailConfig({ smtpUser: e.target.value })} placeholder="your-email@gmail.com" className="bg-secondary/50 border-border/50" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">SMTP Password</Label><Input type="password" value={emailConfig?.smtpPass || ''} onChange={(e) => handleUpdateEmailConfig({ smtpPass: e.target.value })} placeholder="App-specific password" className="bg-secondary/50 border-border/50" /></div>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5"><Label className="text-xs">From Email</Label><Input value={emailConfig?.fromEmail || ''} onChange={(e) => handleUpdateEmailConfig({ fromEmail: e.target.value })} placeholder="your-email@gmail.com" className="bg-secondary/50 border-border/50" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">From Name</Label><Input value={emailConfig?.fromName || ''} onChange={(e) => handleUpdateEmailConfig({ fromName: e.target.value })} placeholder="Your Name" className="bg-secondary/50 border-border/50" /></div>
                  <div className="flex items-center justify-between mt-4"><div><p className="text-sm font-medium">Use TLS</p><p className="text-xs text-muted-foreground">Required for most SMTP servers</p></div><button onClick={() => handleUpdateEmailConfig({ useTLS: !emailConfig?.useTLS })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${emailConfig?.useTLS !== false ? 'bg-teal-600' : 'bg-secondary'}`}><span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${emailConfig?.useTLS !== false ? 'translate-x-6' : 'translate-x-1'}`} /></button></div>
                  <div className="flex gap-2 mt-4"><Button variant="outline" onClick={handleTestEmail} className="flex-1 border-teal-500/30 btn-hover-scale"><Globe className="h-4 w-4 mr-2" />Test Connection</Button></div>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-secondary/30 border border-border/20"><p className="text-xs text-muted-foreground mb-2">Common SMTP Settings:</p><div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs"><div><span className="text-teal-400">Gmail:</span> smtp.gmail.com:587</div><div><span className="text-teal-400">Outlook:</span> smtp.office365.com:587</div><div><span className="text-teal-400">SendGrid:</span> smtp.sendgrid.net:587</div></div></div>
            </CardContent>
          </Card>
          <Card className={`border-2 ${config?.notifyEmail ? 'border-emerald-500/30' : 'border-amber-500/30'} bg-card/80 backdrop-blur-sm`}>
            <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4 text-teal-400" />Email Notification Preferences</CardTitle><Badge variant="outline" className={`text-xs ${config?.notifyEmail ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>{config?.notifyEmail ? 'Active' : 'No email set'}</Badge></div></CardHeader>
            <CardContent className="space-y-4">
              {!config?.notifyEmail && (<div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-2"><AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" /><span className="text-sm text-amber-400">Set your email below to receive notifications.</span></div>)}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="space-y-1.5"><Label className="text-xs">Notification Email</Label><Input value={config?.notifyEmail || ''} onChange={(e) => handleUpdateConfig({ notifyEmail: e.target.value })} placeholder="your-email@gmail.com" className="bg-secondary/50 border-border/50" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Delivery Mode</Label><Select value={config?.notifyDigestMode || 'instant'} onValueChange={(v) => handleUpdateConfig({ notifyDigestMode: v })}><SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="instant">Instant — email every event</SelectItem><SelectItem value="digest">Daily Digest — one email per day</SelectItem></SelectContent></Select></div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Which notifications to email:</p>
                  {[{ key: 'notifyOnAutoApply', label: 'Auto-Apply', desc: 'When a job is auto-applied to' }, { key: 'notifyOnNewMatch', label: 'New Matches', desc: 'When a job scores above 3.0' }, { key: 'notifyOnFollowUp', label: 'Follow-Ups', desc: 'When a follow-up is due' }, { key: 'notifyOnCycleComplete', label: 'Cycle Complete', desc: 'Summary after each cycle' }, { key: 'notifyOnErrors', label: 'Errors', desc: 'When errors occur' }].map(item => (
                    <div key={item.key} className="flex items-center justify-between py-1.5"><div><p className="text-sm">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div><button onClick={() => handleUpdateConfig({ [item.key]: !(config as unknown as Record<string, unknown>)?.[item.key] })} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${(config as unknown as Record<string, unknown>)?.[item.key] !== false ? 'bg-teal-600' : 'bg-secondary'}`}><span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${(config as unknown as Record<string, unknown>)?.[item.key] !== false ? 'translate-x-5' : 'translate-x-0.5'}`} /></button></div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* History Section */}
      {activeSection === 'history' && (
        <div className="space-y-4">
          {cycleHistory.length === 0 ? (
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm"><CardContent className="p-8 text-center"><Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">No cycle history yet.</p></CardContent></Card>
          ) : (
            <>
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm"><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-teal-400" />Activity Over Time</CardTitle></CardHeader>
                <CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={cycleHistory.slice(0, 20).reverse().map((c, i) => ({ cycle: `#${cycleHistory.length - i}`, Scanned: c.scannedJobs, Evaluated: c.evaluatedJobs, Applied: c.autoAppliedJobs, FollowUps: c.followUpsScheduled }))} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}><CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.01 270)" /><XAxis dataKey="cycle" tick={{ fontSize: 10 }} stroke="oklch(0.65 0.01 270)" /><YAxis tick={{ fontSize: 10 }} stroke="oklch(0.65 0.01 270)" /><Tooltip contentStyle={{ backgroundColor: 'oklch(0.22 0.015 270)', border: '1px solid oklch(0.35 0.015 270)', borderRadius: '8px', fontSize: '12px' }} /><Bar dataKey="Scanned" fill="#38bdf8" radius={[2, 2, 0, 0]} maxBarSize={20} /><Bar dataKey="Evaluated" fill="#2dd4bf" radius={[2, 2, 0, 0]} maxBarSize={20} /><Bar dataKey="Applied" fill="#34d399" radius={[2, 2, 0, 0]} maxBarSize={20} /><Bar dataKey="FollowUps" fill="#fbbf24" radius={[2, 2, 0, 0]} maxBarSize={20} /></BarChart></ResponsiveContainer></div></CardContent>
              </Card>
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden"><div className="overflow-x-auto custom-scrollbar">
                <Table><TableHeader><TableRow className="border-border/50 hover:bg-transparent"><TableHead>Time</TableHead><TableHead>Trigger</TableHead><TableHead>Scanned</TableHead><TableHead>Evaluated</TableHead><TableHead>Applied</TableHead><TableHead>Follow-Ups</TableHead><TableHead>Duration</TableHead><TableHead>Errors</TableHead></TableRow></TableHeader>
                  <TableBody>{cycleHistory.map(c => { let errors: string[] = []; try { errors = JSON.parse(c.errors); } catch { /* ignore */ } return (
                    <TableRow key={c.id} className="border-border/30 hover:bg-secondary/30 transition-colors"><TableCell className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</TableCell><TableCell><Badge variant="outline" className={`text-xs ${c.triggeredBy === 'auto' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-sky-500/20 text-sky-400 border-sky-500/30'}`}>{c.triggeredBy}</Badge></TableCell><TableCell className="text-sm">{c.scannedJobs}</TableCell><TableCell className="text-sm">{c.evaluatedJobs}</TableCell><TableCell className="text-sm">{c.autoAppliedJobs}</TableCell><TableCell className="text-sm">{c.followUpsScheduled}</TableCell><TableCell className="text-xs text-muted-foreground">{(c.duration / 1000).toFixed(1)}s</TableCell><TableCell>{errors.length > 0 ? <Badge variant="outline" className="text-xs bg-red-500/20 text-red-400 border-red-500/30">{errors.length}</Badge> : <span className="text-xs text-muted-foreground">0</span>}</TableCell></TableRow>
                  ); })}</TableBody>
                </Table>
              </div></Card>
            </>
          )}
        </div>
      )}

      {/* Follow-Ups Section */}
      {activeSection === 'followups' && (
        <div className="space-y-4">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4 text-teal-400" />Follow-Up Queue</CardTitle><div className="flex items-center gap-2"><Badge variant="outline" className={`text-xs ${hasEmailConfig ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>{hasEmailConfig ? 'SMTP Active' : 'mailto: mode'}</Badge><Badge variant="outline" className="text-xs">{followUps.length} total</Badge></div></div></CardHeader>
            <CardContent>
              {followUps.length === 0 ? (<div className="text-center py-6"><Mail className="h-8 w-8 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">No follow-ups scheduled.</p></div>) : (
                <ScrollArea className="max-h-96"><div className="space-y-2">{followUps.map(fu => { const subjectMatch = fu.content.match(/^Subject:\s*(.+)$/m); const subject = subjectMatch ? subjectMatch[1] : `Follow-up: ${fu.role || 'Application'}`; const body = fu.content.replace(/^Subject:.*\n?/, '').trim(); const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; return (
                  <div key={fu.id} className="flex items-start justify-between p-3 rounded-lg bg-secondary/30 border border-border/20">
                    <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><Badge variant="outline" className={`text-xs ${fu.status === 'sent' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : fu.status === 'generated' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-sky-500/20 text-sky-400 border-sky-500/30'}`}>{fu.status}</Badge><span className="text-sm font-medium truncate">{fu.company || `App #${fu.appNumber}`}</span><span className="text-xs text-muted-foreground">{fu.role}</span></div><p className="text-xs text-muted-foreground line-clamp-2">{fu.content.substring(0, 200)}</p></div>
                    <div className="flex gap-1 ml-3 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(fu.content); toast.success('Email copied'); }} className="text-xs h-7 btn-hover-scale"><ClipboardList className="h-3 w-3 mr-1" />Copy</Button>
                      {fu.status !== 'sent' && (<><a href={mailtoLink} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="sm" className="text-xs h-7 text-sky-400 btn-hover-scale"><ExternalLink className="h-3 w-3 mr-1" />Open</Button></a><Button variant="ghost" size="sm" onClick={() => handleMarkFollowUpSent(fu.id)} className="text-xs h-7 text-emerald-400 btn-hover-scale"><Check className="h-3 w-3 mr-1" />Mark Sent</Button></>)}
                    </div>
                  </div>); })}</div></ScrollArea>
              )}
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-teal-400" />Generate Follow-Up</CardTitle></CardHeader>
            <CardContent><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">{applications.filter(a => ['Applied', 'Screening', 'Interview'].includes(a.status)).slice(0, 8).map(app => (
              <div key={app.number} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 border border-border/20">
                <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{app.company}</p><p className="text-xs text-muted-foreground truncate">{app.role}</p></div>
                <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-6 text-xs"><Mail className="h-3 w-3" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="bg-popover border-border"><DropdownMenuItem onClick={() => handleGenerateFollowUp(app.number, 'check_in')}>Check-in</DropdownMenuItem><DropdownMenuItem onClick={() => handleGenerateFollowUp(app.number, 'thank_you')}>Thank You</DropdownMenuItem><DropdownMenuItem onClick={() => handleGenerateFollowUp(app.number, 'additional_info')}>Additional Info</DropdownMenuItem><DropdownMenuItem onClick={() => handleGenerateFollowUp(app.number, 'counter_offer')}>Counter Offer</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
              </div>))}</div></CardContent>
          </Card>
        </div>
      )}

      {/* Auto-Apply Logs */}
      {activeSection === 'logs' && (
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4 text-teal-400" />Auto-Apply Logs</CardTitle><Badge variant="outline" className="text-xs">{autoApplyLogs.length} entries</Badge></div></CardHeader>
          <CardContent>
            {autoApplyLogs.length === 0 ? (<div className="text-center py-6"><Rocket className="h-8 w-8 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">No auto-apply logs yet.</p></div>) : (
              <ScrollArea className="max-h-96"><div className="space-y-2">{autoApplyLogs.map(log => (
                <div key={log.id} className="flex items-start justify-between p-3 rounded-lg bg-secondary/30 border border-border/20">
                  <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><Badge variant="outline" className={`text-xs ${log.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : log.status === 'failed' ? 'bg-red-500/20 text-red-400 border-red-500/30' : log.status === 'processing' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-sky-500/20 text-sky-400 border-sky-500/30'}`}>{log.status}</Badge>{log.appNumber && <span className="text-xs text-muted-foreground">App #{log.appNumber}</span>}{log.attempts > 1 && <span className="text-xs text-amber-400">{log.attempts} attempts</span>}</div><p className="text-xs text-muted-foreground truncate">{log.url}</p>{log.result && log.status === 'failed' && <p className="text-xs text-red-400 mt-1 line-clamp-2">{log.result}</p>}</div>
                  <span className="text-xs text-muted-foreground ml-3 shrink-0">{formatDate(log.createdAt)}</span>
                </div>))}</div></ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}


// =================== KANBAN BOARD ===================
function KanbanTab() {
  const { applications, setApplications, isLoadingApplications } = useHireMeOSStore();

  const fetchApplications = useCallback(async () => {
    try { const res = await fetch('/api/applications'); const data = await res.json(); setApplications(data.applications || []); } catch { /* ignore */ }
  }, [setApplications]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const handleStatusChange = async (number: number, newStatus: string) => {
    try { const res = await fetch(`/api/applications/${number}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ new_status: newStatus }) }); if (res.ok) { toast.success(`Moved to ${newStatus}`); fetchApplications(); } } catch { toast.error('Failed to update status'); }
  };

  const columns = [
    { id: 'Wishlist', title: 'Wishlist', color: 'from-slate-500/20 to-slate-600/10', border: 'border-slate-500/30' },
    { id: 'Applied', title: 'Applied', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
    { id: 'Screening', title: 'Screening', color: 'from-yellow-500/20 to-yellow-600/10', border: 'border-yellow-500/30' },
    { id: 'Interview', title: 'Interview', color: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/30' },
    { id: 'Offer', title: 'Offer', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
    { id: 'Rejected', title: 'Rejected', color: 'from-red-500/20 to-red-600/10', border: 'border-red-500/30' },
  ];

  if (isLoadingApplications) { return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-teal-400" /></div>; }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold">Kanban Board</h3><p className="text-sm text-muted-foreground">Click status buttons to move applications</p></div>
        <Badge variant="outline" className="border-border/50">{applications.length} total</Badge>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto">
        {columns.map(col => {
          const colApps = (applications || []).filter(a => a.status === col.id);
          return (
            <div key={col.id} className={`flex flex-col rounded-xl bg-linear-to-b ${col.color} border ${col.border} min-h-[300px]`}>
              <div className="p-3 flex items-center justify-between border-b border-border/20"><span className="text-sm font-semibold">{col.title}</span><Badge variant="secondary" className="text-xs h-5">{colApps.length}</Badge></div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {colApps.map(app => (
                  <motion.div key={app.number} layout className="p-2.5 rounded-lg bg-card/80 border border-border/30 shadow-sm hover:shadow-md transition-all cursor-pointer card-hover-lift">
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold truncate">{app.company}</p>
                      <p className="text-xs text-muted-foreground truncate">{app.role}</p>
                      <div className="flex items-center gap-1.5">
                        {app.score > 0 && (<Badge className={`text-[10px] px-1.5 py-0 ${app.score >= 4 ? 'bg-emerald-500/20 text-emerald-400' : app.score >= 3 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>{app.score.toFixed(1)}</Badge>)}
                      </div>
                      {app.url && (<a href={app.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-teal-400 hover:underline truncate block">{app.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</a>)}
                      <div className="flex gap-1 mt-1">{columns.filter(c => c.id !== col.id).slice(0, 3).map(c => (<button key={c.id} onClick={() => handleStatusChange(app.number, c.id)} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors btn-hover-scale">{c.title.slice(0, 3)}</button>))}</div>
                    </div>
                  </motion.div>
                ))}
                {colApps.length === 0 && (<div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50">No applications</div>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =================== ATS SCORE CHECKER ===================
function ATSScoreTab() {
  const { settings } = useHireMeOSStore();
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ATSResult | null>(null);

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) { toast.error('Please paste a job description'); return; }
    setIsAnalyzing(true); setResult(null);
    try {
      const res = await fetch('/api/ats-score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resume: settings.cv, jobDescription }) });
      const data = await res.json();
      if (data.success) { setResult(data.result); } else { toast.error(data.error || 'ATS analysis failed'); }
    } catch { toast.error('Failed to analyze'); }
    finally { setIsAnalyzing(false); }
  };

  const getScoreColor = (score: number) => score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400';
  const getScoreBg = (score: number) => score >= 80 ? 'from-emerald-500/20 to-emerald-600/5' : score >= 60 ? 'from-yellow-500/20 to-yellow-600/5' : 'from-red-500/20 to-red-600/5';

  return (
    <div className="space-y-4">
      <Card className="border-purple-500/20 bg-card/80 backdrop-blur-sm card-hover-lift">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-purple-400" />ATS Score Checker</CardTitle><CardDescription>Check how well your resume matches the job description</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label className="text-sm font-medium">Job Description</Label><Textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the job description here..." rows={8} className="bg-secondary/50 border-border/50 font-mono text-xs resize-y" /></div>
          <Button onClick={handleAnalyze} disabled={isAnalyzing || !settings.cv} className="bg-purple-600 hover:bg-purple-700 text-white btn-hover-scale">{isAnalyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}Analyze ATS Score</Button>
          {!settings.cv && <p className="text-xs text-yellow-500">Add your CV in Settings first to use this feature</p>}
        </CardContent>
      </Card>
      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card className={`bg-linear-to-br ${getScoreBg(result.overallScore)} border-border/50`}>
            <CardContent className="pt-6"><div className="flex items-center justify-center gap-6"><div className="text-center"><div className={`text-5xl font-bold ${getScoreColor(result.overallScore)}`}>{result.overallScore}</div><div className="text-sm text-muted-foreground mt-1">ATS Score</div><Badge className={`mt-2 ${result.atsReady ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{result.atsReady ? 'ATS Ready' : 'Needs Improvement'}</Badge></div><div className="flex-1 space-y-2"><div className="flex items-center justify-between text-sm"><span>Keyword Match</span><span className={getScoreColor(result.keywordMatch.matchPercent)}>{result.keywordMatch.matchPercent}%</span></div><Progress value={result.keywordMatch.matchPercent} className="h-2" /></div></div></CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-emerald-500/20 bg-card/80"><CardHeader className="pb-2"><CardTitle className="text-sm text-emerald-400">Matched Keywords</CardTitle></CardHeader><CardContent><div className="flex flex-wrap gap-1.5">{result.keywordMatch.matched.map((kw, i) => <Badge key={i} className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{kw}</Badge>)}</div></CardContent></Card>
            <Card className="border-red-500/20 bg-card/80"><CardHeader className="pb-2"><CardTitle className="text-sm text-red-400">Missing Keywords</CardTitle></CardHeader><CardContent><div className="flex flex-wrap gap-1.5">{result.keywordMatch.missing.map((kw, i) => <Badge key={i} className="bg-red-500/10 text-red-400 border-red-500/20">{kw}</Badge>)}</div></CardContent></Card>
          </div>
          {result.sectionAnalysis && (<Card className="border-border/50 bg-card/80"><CardHeader className="pb-2"><CardTitle className="text-sm">Section Analysis</CardTitle></CardHeader><CardContent className="space-y-3">{Object.entries(result.sectionAnalysis).map(([section, data]) => (<div key={section} className="space-y-1"><div className="flex justify-between text-sm"><span className="capitalize">{section}</span><span className={getScoreColor(data.score)}>{data.score}/100</span></div><Progress value={data.score} className="h-1.5" /><p className="text-xs text-muted-foreground">{data.feedback}</p></div>))}</CardContent></Card>)}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-yellow-500/20 bg-card/80"><CardHeader className="pb-2"><CardTitle className="text-sm text-yellow-400">Suggestions</CardTitle></CardHeader><CardContent className="space-y-2">{result.suggestions.map((s, i) => (<div key={i} className="flex gap-2 text-xs"><span className="text-yellow-400 shrink-0">{i + 1}.</span><span>{s}</span></div>))}</CardContent></Card>
            <Card className="border-emerald-500/20 bg-card/80"><CardHeader className="pb-2"><CardTitle className="text-sm text-emerald-400">Strengths</CardTitle></CardHeader><CardContent className="space-y-2">{result.strengths.map((s, i) => (<div key={i} className="flex gap-2 text-xs"><Check className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" /><span>{s}</span></div>))}</CardContent></Card>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// =================== AUTO-TAILORED RESUME ===================
function TailorResumeTab() {
  const { settings } = useHireMeOSStore();
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [isTailoring, setIsTailoring] = useState(false);
  const [result, setResult] = useState<{ tailoredResume: string; changes: string; jobTitle: string; company: string } | null>(null);

  const handleTailor = async () => {
    if (!jobDescription.trim()) { toast.error('Please paste a job description'); return; }
    setIsTailoring(true); setResult(null);
    try {
      const res = await fetch('/api/tailor-resume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobDescription, jobTitle, company }) });
      const data = await res.json();
      if (data.success) { setResult(data); toast.success('Resume tailored!'); } else { toast.error(data.error || 'Tailoring failed'); }
    } catch { toast.error('Failed to tailor resume'); }
    finally { setIsTailoring(false); }
  };

  const handleCopy = () => { if (result?.tailoredResume) { navigator.clipboard.writeText(result.tailoredResume); toast.success('Copied to clipboard!'); } };

  return (
    <div className="space-y-4">
      <Card className="border-pink-500/20 bg-card/80 backdrop-blur-sm card-hover-lift">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileCheck className="h-4 w-4 text-pink-400" />Auto-Tailored Resume</CardTitle><CardDescription>AI rewrites your resume for each specific job</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label className="text-sm">Job Title</Label><Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. AI Engineer" className="bg-secondary/50 border-border/50" /></div><div className="space-y-1"><Label className="text-sm">Company</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Google" className="bg-secondary/50 border-border/50" /></div></div>
          <div className="space-y-1"><Label className="text-sm">Job Description</Label><Textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the full job description here..." rows={8} className="bg-secondary/50 border-border/50 font-mono text-xs resize-y" /></div>
          <Button onClick={handleTailor} disabled={isTailoring || !settings.cv} className="bg-pink-600 hover:bg-pink-700 text-white btn-hover-scale">{isTailoring ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}Tailor My Resume</Button>
          {!settings.cv && <p className="text-xs text-yellow-500">Add your CV in Settings first</p>}
        </CardContent>
      </Card>
      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card className="border-teal-500/20 bg-card/80"><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm flex items-center gap-2"><FileUser className="h-4 w-4 text-teal-400" />Tailored Resume{result.company ? ` for ${result.company}` : ''}</CardTitle><Button size="sm" variant="outline" onClick={handleCopy} className="border-border/50 h-7 text-xs btn-hover-scale"><ClipboardList className="h-3 w-3 mr-1" />Copy</Button></div></CardHeader><CardContent><div className="prose prose-sm prose-invert max-w-none bg-secondary/30 rounded-lg p-4 text-xs whitespace-pre-wrap">{result.tailoredResume}</div></CardContent></Card>
          {result.changes && (<Card className="border-yellow-500/20 bg-card/80"><CardHeader className="pb-2"><CardTitle className="text-sm text-yellow-400">What Changed</CardTitle></CardHeader><CardContent><div className="text-xs text-muted-foreground whitespace-pre-wrap">{result.changes}</div></CardContent></Card>)}
        </motion.div>
      )}
    </div>
  );
}

// =================== COVER LETTER GENERATOR ===================
function CoverLetterTab() {
  const { settings } = useHireMeOSStore();
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [tone, setTone] = useState('professional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');

  const handleGenerate = async () => {
    if (!jobDescription.trim()) { toast.error('Please paste a job description'); return; }
    setIsGenerating(true); setCoverLetter('');
    try {
      const res = await fetch('/api/cover-letter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobDescription, jobTitle, company, tone }) });
      const data = await res.json();
      if (data.success) { setCoverLetter(data.coverLetter); toast.success('Cover letter generated!'); } else { toast.error(data.error || 'Generation failed'); }
    } catch { toast.error('Failed to generate cover letter'); }
    finally { setIsGenerating(false); }
  };

  const handleCopy = () => { if (coverLetter) { navigator.clipboard.writeText(coverLetter); toast.success('Copied to clipboard!'); } };

  return (
    <div className="space-y-4">
      <Card className="border-amber-500/20 bg-card/80 backdrop-blur-sm card-hover-lift">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><PenTool className="h-4 w-4 text-amber-400" />Cover Letter Generator</CardTitle><CardDescription>AI generates a personalized cover letter</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1"><Label className="text-sm">Job Title</Label><Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="AI Engineer" className="bg-secondary/50 border-border/50" /></div>
            <div className="space-y-1"><Label className="text-sm">Company</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Google" className="bg-secondary/50 border-border/50" /></div>
            <div className="space-y-1"><Label className="text-sm">Tone</Label><Select value={tone} onValueChange={setTone}><SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="professional">Professional</SelectItem><SelectItem value="enthusiastic">Enthusiastic</SelectItem><SelectItem value="conversational">Conversational</SelectItem><SelectItem value="confident">Confident</SelectItem></SelectContent></Select></div>
          </div>
          <div className="space-y-1"><Label className="text-sm">Job Description</Label><Textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the job description here..." rows={6} className="bg-secondary/50 border-border/50 font-mono text-xs resize-y" /></div>
          <Button onClick={handleGenerate} disabled={isGenerating || !settings.cv} className="bg-amber-600 hover:bg-amber-700 text-white btn-hover-scale">{isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PenTool className="h-4 w-4 mr-2" />}Generate Cover Letter</Button>
          {!settings.cv && <p className="text-xs text-yellow-500">Add your CV in Settings first</p>}
        </CardContent>
      </Card>
      {coverLetter && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-amber-500/20 bg-card/80"><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm">Your Cover Letter{company ? ` — ${company}` : ''}</CardTitle><Button size="sm" variant="outline" onClick={handleCopy} className="border-border/50 h-7 text-xs btn-hover-scale"><ClipboardList className="h-3 w-3 mr-1" />Copy</Button></div></CardHeader><CardContent><div className="bg-secondary/30 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">{coverLetter}</div></CardContent></Card>
        </motion.div>
      )}
    </div>
  );
}


// =================== ENHANCED 3-STEP ONBOARDING ===================
function WelcomeOnboarding({ onComplete }: { onComplete: () => void }) {
  const { settings, setSettings, userName, setUserName, jobPreferences, setJobPreferences, onboardingStep, setOnboardingStep } = useHireMeOSStore();
  const [resumeText, setResumeText] = useState('');
  const [profileText, setProfileText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const step = onboardingStep;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newSettings = {
        ...settings,
        cv: resumeText,
        profile: profileText || `${userName ? userName + ' | ' : ''}${jobPreferences.roles || 'AI Engineer'}`,
        portals: jobPreferences.portals || 'linkedin,indeed,glassdoor,wellfound,naukri',
        proofs: '',
      };
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        setSettings(newSettings);
        toast.success('Welcome aboard! Your AI job search is ready.');
        onComplete();
      }
    } catch { toast.error('Failed to save settings'); }
    finally { setIsSaving(false); }
  };

  const stepTitles = ['Welcome', 'Your Resume', 'Job Preferences'];
  const progress = (step / 3) * 100;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-teal-500/30 bg-card/90 backdrop-blur-md shadow-xl shadow-teal-500/5">
        <CardHeader className="text-center pb-2">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
              {stepTitles.map((t, i) => (
                <span key={t} className={i + 1 <= step ? 'text-teal-400 font-medium' : ''}>Step {i + 1}: {t}</span>
              ))}
            </div>
            <div className="onboarding-progress-track">
              <div className="onboarding-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.2 }} className="mx-auto mb-3 p-3 rounded-2xl bg-teal-500/10 w-fit">
            <Sparkle className="h-8 w-8 text-teal-400" />
          </motion.div>
          <CardTitle className="text-2xl font-bold bg-linear-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
            Welcome to Hire Me OS 2.0
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            Your AI-powered autonomous job search command center
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Step 1: Welcome + Name */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
                <User className="h-5 w-5 text-teal-400 shrink-0" />
                <p className="text-sm text-teal-300">Let&apos;s start with your name — we&apos;ll personalize your experience.</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Your Name</Label>
                <Input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Saurabh Lokhande"
                  className="bg-secondary/50 border-border/50 text-lg h-12 focus:border-teal-500/50"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border/20">
                <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">Hire Me OS will automate your job search: scan portals, evaluate jobs, auto-apply, and send follow-ups — all powered by AI, 24/7.</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  {userName.length > 0 ? `Nice to meet you, ${userName}!` : 'Enter your name to continue'}
                </p>
                <Button onClick={() => setOnboardingStep(2)} className="bg-teal-600 hover:bg-teal-700 text-white btn-hover-scale">
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Resume */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
                <FileUser className="h-5 w-5 text-teal-400 shrink-0" />
                <p className="text-sm text-teal-300">Paste your resume below — the AI will use it to evaluate jobs, auto-apply, and generate follow-ups tailored to you.</p>
              </div>
              <Textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder={`SAURABH LOKHANDE\n+91-7767913887 | saurabhmj11@gmail.com\n\nSUMMARY\nAI Engineer with 3 years of experience building production-grade Generative AI systems...\n\nSKILLS\nProgramming: Python\nFrameworks: LangChain, LangGraph, Hugging Face\n...\n\nEXPERIENCE\nGenerative AI Engineer | Company | Jan 2024 – Present\n- Built AI-powered SaaS...\n\nEDUCATION\nBachelor's Degree in Engineering`}
                rows={12}
                className="bg-secondary/50 border-border/50 font-mono text-xs resize-y focus:border-teal-500/50"
                autoFocus
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">{resumeText.length > 0 ? `${resumeText.length} characters — looking good!` : 'Your resume is required to unlock all features'}</p>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setOnboardingStep(1)} className="text-muted-foreground">Back</Button>
                  <Button onClick={() => resumeText.trim() ? setOnboardingStep(3) : toast.error('Please paste your resume first')} className="bg-teal-600 hover:bg-teal-700 text-white btn-hover-scale">
                    Next <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Job Preferences */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Target className="h-5 w-5 text-emerald-400 shrink-0" />
                <p className="text-sm text-emerald-300">Tell us what you&apos;re looking for — the AI will focus your search.</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Target Roles</Label>
                <Input value={jobPreferences.roles} onChange={(e) => setJobPreferences({ ...jobPreferences, roles: e.target.value })} placeholder="e.g. AI Engineer, ML Engineer, LLM Engineer" className="bg-secondary/50 border-border/50" autoFocus />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Preferred Locations</Label>
                <Input value={jobPreferences.locations} onChange={(e) => setJobPreferences({ ...jobPreferences, locations: e.target.value })} placeholder="e.g. Remote, San Francisco, London" className="bg-secondary/50 border-border/50" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Job Portals to Scan</Label>
                <Input value={jobPreferences.portals} onChange={(e) => setJobPreferences({ ...jobPreferences, portals: e.target.value })} placeholder="e.g. linkedin, indeed, glassdoor, wellfound" className="bg-secondary/50 border-border/50" />
              </div>
              <div className="flex justify-between items-center">
                <Button variant="ghost" onClick={() => setOnboardingStep(2)} className="text-muted-foreground">Back</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleSave} disabled={isSaving} className="border-border/50">Skip & Start</Button>
                  <Button onClick={handleSave} disabled={isSaving} className="bg-teal-600 hover:bg-teal-700 text-white btn-hover-scale">
                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Rocket className="h-4 w-4 mr-2" />}Launch Hire Me OS
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Steps indicator */}
          <div className="flex justify-center gap-2 pt-2">
            {[1, 2, 3].map(s => (
              <button key={s} onClick={() => s < step && setOnboardingStep(s)} className={`h-2 w-8 rounded-full transition-all ${s === step ? 'bg-teal-400 scale-105' : s < step ? 'bg-teal-400/60 cursor-pointer hover:bg-teal-400/80' : 'bg-teal-400/20'}`} />
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// =================== SIDEBAR NAVIGATION (ENHANCED) ===================
const NAV_GROUPS = [
  { label: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: Home, badge: 0 }] },
  { label: 'Pipeline', items: [{ id: 'pipeline', label: 'Applications', icon: Briefcase, badge: 0 }, { id: 'kanban', label: 'Kanban Board', icon: LayoutGrid, badge: 0 }] },
  { label: 'AI Tools', items: [
    { id: 'autopipeline', label: 'Auto-Pipeline', icon: Zap, badge: 0 },
    { id: 'evaluate', label: 'Evaluate Job', icon: FileText, badge: 0 },
    { id: 'ats', label: 'ATS Score', icon: Shield, badge: 0 },
    { id: 'tailor', label: 'Tailor Resume', icon: FileCheck, badge: 0 },
    { id: 'coverletter', label: 'Cover Letter', icon: PenTool, badge: 0 },
    { id: 'cvgen', label: 'CV Generator', icon: Printer, badge: 0 },
    { id: 'aitools', label: 'AI Assistant', icon: Bot, badge: 0 },
  ]},
  { label: 'Automation', items: [{ id: 'autopilot', label: 'Autopilot 24/7', icon: Rocket, badge: 0, pro: true }, { id: 'scanner', label: 'Job Scanner', icon: ScanLine, badge: 0 }] },
  { label: 'Data', items: [{ id: 'reports', label: 'Reports', icon: FileStack, badge: 0 }, { id: 'stories', label: 'Story Bank', icon: BookOpen, badge: 0 }, { id: 'batch', label: 'Batch Eval', icon: Layers, badge: 0 }] },
  { label: 'Config', items: [{ id: 'settings', label: 'Settings', icon: Settings2, badge: 0 }, { id: 'tools', label: 'Tools', icon: Wrench, badge: 0 }] },
];

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard', pipeline: 'Applications Pipeline', kanban: 'Kanban Board', autopipeline: 'Auto-Pipeline',
  evaluate: 'Evaluate Job', ats: 'ATS Score Checker', tailor: 'Tailor Resume', coverletter: 'Cover Letter Generator',
  cvgen: 'CV Generator', aitools: 'AI Assistant', autopilot: 'Autopilot 24/7', scanner: 'Job Scanner',
  reports: 'Evaluation Reports', stories: 'Interview Story Bank', batch: 'Batch Evaluation', settings: 'Settings', tools: 'Data Tools',
};

function AppSidebar() {
  const { activePage, setActivePage, sidebarCollapsed, setSidebarCollapsed, sidebarMobileOpen, setSidebarMobileOpen, unreadNotificationCount, userName, settings } = useHireMeOSStore();
  const pathname = activePage;

  // Get initials for avatar
  const displayName = userName || (() => { try { const m = settings.profile.match(/name\s*:\s*(.+)/i); return m ? m[1].trim().split(' ')[0] : ''; } catch { return ''; } })();
  const initials = displayName ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarMobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarMobileOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full flex flex-col transition-all duration-300 ease-in-out bg-sidebar border-r border-sidebar-border lg:relative lg:z-auto ${sidebarCollapsed ? 'lg:w-16 sidebar-collapsed' : 'lg:w-64 sidebar-expanded'} ${sidebarMobileOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className={`h-14 flex items-center border-b border-sidebar-border px-4 ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="p-1.5 rounded-lg bg-teal-500/20 shrink-0"><Briefcase className="h-5 w-5 text-teal-400" /></div>
          {!sidebarCollapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight text-sidebar-foreground truncate">Hire Me OS 2.0</h1>
              <p className="text-[10px] text-muted-foreground truncate">AI Job Pipeline</p>
            </motion.div>
          )}
        </div>

        {/* Navigation — flex-1 so it fills remaining space without overlapping bottom panel */}
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-1">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="mb-3">
                {!sidebarCollapsed && (<p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-3 mb-1.5">{group.label}</p>)}
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = pathname === item.id;
                  return (
                    <div key={item.id} className="sidebar-item relative">
                      <button
                        onClick={() => { setActivePage(item.id); setSidebarMobileOpen(false); }}
                        className={`w-full flex items-center gap-3 rounded-lg transition-all duration-150 text-sm group ${sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2'} ${isActive ? 'bg-teal-500/15 text-teal-400 font-medium shadow-sm shadow-teal-500/10 sidebar-active-glow' : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <ItemIcon className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-teal-400' : ''}`} />
                        {!sidebarCollapsed && (
                          <>
                            <span className="truncate">{item.label}</span>
                            {'pro' in item && item.pro && <span className="pro-badge ml-1">Pro</span>}
                            {item.badge > 0 && <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white badge-pulse">{item.badge}</span>}
                            {isActive && !sidebarCollapsed && (<div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-400" />)}
                          </>
                        )}
                      </button>
                      {/* Tooltip for collapsed state */}
                      {sidebarCollapsed && (
                        <div className="sidebar-tooltip">{item.label}{'pro' in item && item.pro ? ' Pro' : ''}{item.badge > 0 ? ` (${item.badge})` : ''}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Bottom: User avatar + Logout + Collapse toggle */}
        <div className="border-t border-sidebar-border shrink-0">
          {!sidebarCollapsed && (
            <div className="px-3 py-3 border-b border-sidebar-border/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0 text-teal-400 font-bold text-sm shadow-sm shadow-teal-500/10">{initials}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate text-sidebar-foreground">{displayName || 'User'}</p>
                  <p className="text-[10px] text-muted-foreground truncate opacity-70">SaaS Multi-Tenant</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-xs h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2 px-2"
                onClick={async () => {
                  const supabase = createClient();
                  await supabase.auth.signOut();
                  window.location.href = '/login';
                }}
              >
                <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                Sign Out
              </Button>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="flex flex-col items-center py-3 border-b border-sidebar-border/50 gap-3">
              <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold text-xs shadow-sm shadow-teal-500/10">{initials}</div>
              <button 
                className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10 transition-colors"
                onClick={async () => {
                  const supabase = createClient();
                  await supabase.auth.signOut();
                  window.location.href = '/login';
                }}
                title="Sign Out"
              >
                <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              </button>
            </div>
          )}
          <div className="p-2">
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="w-full items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors text-sm hidden lg:flex">
              {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              {!sidebarCollapsed && <span>Collapse</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// =================== COMMAND PALETTE ===================
function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, setActivePage } = useHireMeOSStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const runCommand = (command: () => void) => {
    setCommandPaletteOpen(false);
    command();
  };

  const allPages = NAV_GROUPS.flatMap(g => g.items);

  return (
    <CmdKDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} title="Command Palette" description="Search for a page or action...">
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {allPages.map(page => {
            const PageIcon = page.icon;
            return (
              <CommandItem key={page.id} onSelect={() => runCommand(() => setActivePage(page.id))}>
                <PageIcon className="h-4 w-4" />
                <span>{page.label}</span>
                {'pro' in page && page.pro && <span className="pro-badge ml-1">Pro</span>}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CmdKSeparator />
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => runCommand(() => { setActivePage('pipeline'); })}>
            <Plus className="h-4 w-4" /><span>Add Application</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => { setActivePage('autopipeline'); })}>
            <Zap className="h-4 w-4" /><span>Run Auto-Pipeline</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => { setActivePage('autopilot'); })}>
            <Rocket className="h-4 w-4" /><span>Toggle Autopilot</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CmdKDialog>
  );
}

// =================== DASHBOARD HOME PAGE (REDESIGNED) ===================
function DashboardPage() {
  const { applications, setApplications, setMetrics, metrics, setActivePage, settings, setIsLoadingApplications, cycleHistory } = useHireMeOSStore();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingApplications(true);
      try { const res = await fetch('/api/applications'); const data: ApplicationsResponse = await res.json(); setApplications(data.applications || []); setMetrics(data.metrics || null); }
      catch { /* ignore */ }
      finally { setIsLoadingApplications(false); }
    };
    fetchData();
  }, [setApplications, setMetrics, setIsLoadingApplications]);

  const profileName = (() => { try { const profile = settings.profile; if (!profile) return ''; const nameMatch = profile.match(/name\s*:\s*(.+)/i); return nameMatch ? nameMatch[1].trim() : ''; } catch { return ''; } })();
  const recentApps = applications.slice(0, 5);

  const quickActions = [
    { label: 'Add Application', icon: Plus, page: 'pipeline', color: 'from-teal-500/20 to-teal-600/5 hover:from-teal-500/30 hover:to-teal-600/10', iconColor: 'text-teal-400' },
    { label: 'Run Auto-Pipeline', icon: Zap, page: 'autopipeline', color: 'from-sky-500/20 to-sky-600/5 hover:from-sky-500/30 hover:to-sky-600/10', iconColor: 'text-sky-400' },
    { label: 'Evaluate Job', icon: FileText, page: 'evaluate', color: 'from-purple-500/20 to-purple-600/5 hover:from-purple-500/30 hover:to-purple-600/10', iconColor: 'text-purple-400' },
    { label: 'Check ATS Score', icon: Shield, page: 'ats', color: 'from-amber-500/20 to-amber-600/5 hover:from-amber-500/30 hover:to-amber-600/10', iconColor: 'text-amber-400' },
    { label: 'Tailor Resume', icon: FileCheck, page: 'tailor', color: 'from-pink-500/20 to-pink-600/5 hover:from-pink-500/30 hover:to-pink-600/10', iconColor: 'text-pink-400' },
    { label: 'Cover Letter', icon: PenTool, page: 'coverletter', color: 'from-amber-500/20 to-amber-600/5 hover:from-amber-500/30 hover:to-amber-600/10', iconColor: 'text-amber-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="bg-linear-to-br from-teal-500/10 via-card/80 to-emerald-500/5 border-teal-500/20 backdrop-blur-sm overflow-hidden relative card-hover-lift">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{profileName ? `Welcome back, ${profileName}` : 'Welcome to Hire Me OS 2.0'}</h2>
              <p className="text-muted-foreground mt-1">Your AI-powered autonomous job search command center. Let the AI work for you 24/7.</p>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border border-border/50 bg-secondary/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100"><Command className="h-3 w-3" />K</kbd>
              <span className="text-xs text-muted-foreground">to search</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <MetricsCards />

      {/* Pipeline Funnel + Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PipelineFunnel />
        <ActivityTimeline />
      </div>

      {/* Charts + Quick Actions + Getting Started */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <StatusChart />
        </div>
        <div className="space-y-4">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm card-hover-lift">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium flex items-center gap-2"><Zap className="h-4 w-4 text-teal-400" />Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map(action => (
                <button key={action.page} onClick={() => setActivePage(action.page)} className={`w-full flex items-center gap-3 p-3 rounded-lg bg-linear-to-r ${action.color} border border-border/30 transition-all duration-150 text-left group btn-hover-scale`}>
                  <action.icon className={`h-4 w-4 ${action.iconColor} shrink-0 group-hover:scale-110 transition-transform`} />
                  <span className="text-sm font-medium">{action.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Getting Started + Weekly Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GettingStartedChecklist />
        <WeeklyStatsCard />
      </div>

      {/* Recent Applications */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm card-hover-lift">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Briefcase className="h-4 w-4 text-teal-400" />Recent Applications</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-teal-400 btn-hover-scale" onClick={() => setActivePage('pipeline')}>View All <ChevronRight className="h-3 w-3 ml-1" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentApps.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">No applications yet. Start by adding one or running Auto-Pipeline!</p>
              <Button variant="outline" size="sm" className="mt-3 border-teal-500/30 text-teal-400 btn-hover-scale" onClick={() => setActivePage('autopipeline')}><Zap className="h-3.5 w-3.5 mr-1.5" />Try Auto-Pipeline</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentApps.map(app => (
                <div key={app.number} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><span className="font-medium text-sm truncate">{app.company}</span><Badge variant="outline" className={`${getStatusColor(app.status)} text-[10px] px-1.5`}>{app.status}</Badge></div>
                    <p className="text-xs text-muted-foreground truncate">{app.role}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0"><Star className="h-3 w-3 text-amber-400 fill-amber-400" /><span className="text-sm font-medium">{app.score}</span></div>
                  <span className="text-xs text-muted-foreground shrink-0">{formatDate(app.date)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =================== MAIN DASHBOARD ===================
export default function CareerOpsDashboard() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { settings, setSettings, activePage, userName, setUserName, user, setUser } = useHireMeOSStore();
  const [mounted, setMounted] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Auth check
  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        window.location.href = '/login';
        return;
      }

      setUser({ id: session.user.id, email: session.user.email || '' });
    };
    checkUser();
  }, [setUser, router]);

  useEffect(() => {
    if (!user) return;

    const checkOnboarding = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          // Extract name from profile
          if (data.profile) {
            try { const nameMatch = data.profile.match(/name\s*:\s*(.+)/i); if (nameMatch) setUserName(nameMatch[1].trim().split(' ')[0]); } catch { /* ignore */ }
          }
          if (!data.cv || data.cv.trim() === '') { setShowOnboarding(true); }
        }
      } catch { /* ignore */ }
      finally { setSettingsLoaded(true); }
    };
    checkOnboarding();
  }, [setSettings, setUserName, user]);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) { toast.success(`Seeded ${data.count} demo applications`); window.location.reload(); }
    } catch { toast.error('Failed to seed data'); }
    finally { setIsSeeding(false); }
  };

  if (!mounted || !settingsLoaded) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="flex items-center gap-3"><Loader2 className="h-6 w-6 animate-spin text-teal-400" /><span className="text-muted-foreground">Loading Hire Me OS 2.0...</span></div></div>;
  }

  if (showOnboarding) {
    return <WelcomeOnboarding onComplete={() => setShowOnboarding(false)} />;
  }

  const pageTitle = PAGE_TITLES[activePage] || 'Dashboard';

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top header */}
        <header className="h-14 border-b border-border/50 bg-card/50 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={() => useHireMeOSStore.getState().setSidebarMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div><h2 className="text-sm font-semibold">{pageTitle}</h2></div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="outline" size="sm" onClick={handleSeed} disabled={isSeeding} className="border-border/50 text-xs btn-hover-scale">
              {isSeeding ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Database className="h-3.5 w-3.5 mr-1.5" />}
              <span className="hidden sm:inline">Seed Demo</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="h-8 w-8 btn-hover-scale">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div key={activePage} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
              {activePage === 'dashboard' && <DashboardPage />}
              {activePage === 'pipeline' && <PipelineTab />}
              {activePage === 'kanban' && <KanbanTab />}
              {activePage === 'autopipeline' && <AutoPipelineTab />}
              {activePage === 'autopilot' && <AutopilotTab />}
              {activePage === 'ats' && <ATSScoreTab />}
              {activePage === 'tailor' && <TailorResumeTab />}
              {activePage === 'coverletter' && <CoverLetterTab />}
              {activePage === 'evaluate' && <EvaluateTab />}
              {activePage === 'reports' && <ReportsTab />}
              {activePage === 'batch' && <BatchTab />}
              {activePage === 'cvgen' && <CVGenTab />}
              {activePage === 'stories' && <StoryBankTab />}
              {activePage === 'scanner' && <ScannerTab />}
              {activePage === 'aitools' && <AIToolsTab />}
              {activePage === 'settings' && <SettingsTab />}
              {activePage === 'tools' && <ToolsTab />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette />
    </div>
  );
}
