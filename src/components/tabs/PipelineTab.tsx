'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import {
  Briefcase, Search, Star, Plus, ChevronDown, ExternalLink,
  MapPin, DollarSign, Calendar, ArrowUpDown, X, Check,
  RefreshCw, Scale, Loader2,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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

import { useHireMeOSStore } from '@/lib/store';
import type { Application, ApplicationsResponse } from '@/lib/types';
import { STATUS_COLORS, ALL_STATUSES } from '@/lib/types';

import HealthCheckBanner from '@/components/shared/HealthCheckBanner';
import FillFormDialog from '@/components/shared/FillFormDialog';

function getStatusColor(status: string): string {
  return (STATUS_COLORS as Record<string, string>)[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return dateStr; }
}

export { getStatusColor, formatDate };

export default function PipelineTab() {
  const { applications, setApplications, setMetrics, searchQuery, setSearchQuery, statusFilter, setStatusFilter, sortBy, setSortBy, isLoadingApplications, setIsLoadingApplications, setHealthIssues } = useHireMeOSStore();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newApp, setNewApp] = useState({ company: '', role: '', location: '', salary: '', url: '', notes: '', score: '', date: '' });
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
      const res = await fetch('/api/applications/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company: newApp.company, role: newApp.role, location: newApp.location, salary: newApp.salary, url: newApp.url, notes: newApp.notes, score: parseFloat(newApp.score) || 0, date: newApp.date || new Date().toISOString().split('T')[0] }) });
      if (res.ok) { toast.success('Application created'); setAddDialogOpen(false); setNewApp({ company: '', role: '', location: '', salary: '', url: '', notes: '', score: '', date: '' }); fetchApplications(); }
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
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-secondary/50 border-border/50" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full sm:w-40 bg-secondary/50 border-border/50"><SelectValue placeholder="Filter status" /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem>{ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        <Select value={sortBy} onValueChange={setSortBy}><SelectTrigger className="w-full sm:w-36 bg-secondary/50 border-border/50"><ArrowUpDown className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="date">By Date</SelectItem><SelectItem value="score">By Score</SelectItem><SelectItem value="company">By Company</SelectItem></SelectContent></Select>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}><DialogTrigger asChild><Button className="bg-teal-600 hover:bg-teal-700 text-white"><Plus className="h-4 w-4 mr-2" /> Add</Button></DialogTrigger>
          <DialogContent className="bg-card border-border"><DialogHeader><DialogTitle>Add New Application</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Company *</Label><Input value={newApp.company} onChange={(e) => setNewApp({ ...newApp, company: e.target.value })} className="bg-secondary/50" /></div><div className="space-y-1"><Label>Role *</Label><Input value={newApp.role} onChange={(e) => setNewApp({ ...newApp, role: e.target.value })} className="bg-secondary/50" /></div></div>
              <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Location</Label><Input value={newApp.location} onChange={(e) => setNewApp({ ...newApp, location: e.target.value })} className="bg-secondary/50" /></div><div className="space-y-1"><Label>Salary</Label><Input value={newApp.salary} onChange={(e) => setNewApp({ ...newApp, salary: e.target.value })} className="bg-secondary/50" /></div></div>
              <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Score (0-5)</Label><Input type="number" min="0" max="5" step="0.1" value={newApp.score} onChange={(e) => setNewApp({ ...newApp, score: e.target.value })} className="bg-secondary/50" /></div><div className="space-y-1"><Label>Date</Label><Input type="date" value={newApp.date} onChange={(e) => setNewApp({ ...newApp, date: e.target.value })} className="bg-secondary/50" /></div></div>
              <div className="space-y-1"><Label>URL</Label><Input value={newApp.url} onChange={(e) => setNewApp({ ...newApp, url: e.target.value })} className="bg-secondary/50" /></div>
              <div className="space-y-1"><Label>Notes</Label><Textarea value={newApp.notes} onChange={(e) => setNewApp({ ...newApp, notes: e.target.value })} className="bg-secondary/50" rows={2} /></div>
              <Button onClick={handleCreate} className="bg-teal-600 hover:bg-teal-700 text-white w-full">Create Application</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
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
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-teal-400" onClick={() => handleNegotiation(app)} title="Negotiate">
                              <Scale className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {app.status === 'Interview' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-teal-400" onClick={() => handleNegotiation(app)} title="Negotiation">
                              <Scale className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {app.url && <a href={app.url} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="icon" className="h-7 w-7 hover:text-teal-400"><ExternalLink className="h-3.5 w-3.5" /></Button></a>}
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
