'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { BookOpen, Plus, RefreshCw, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useHireMeOSStore } from '@/lib/store';

export default function StoryBankTab() {
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
          <Button variant="outline" size="sm" onClick={fetchStories} className="border-border/50"><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh</Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogTrigger asChild><Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white"><Plus className="h-3.5 w-3.5 mr-1.5" />Add Story</Button></DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg"><DialogHeader><DialogTitle>Add STAR+R Story</DialogTitle></DialogHeader>
              <div className="grid gap-3 py-2 max-h-96 overflow-y-auto">
                <div className="space-y-1"><Label>Title *</Label><Input value={newStory.title} onChange={e => setNewStory({ ...newStory, title: e.target.value })} className="bg-secondary/50" placeholder="e.g. Leading a migration to microservices" /></div>
                <div className="space-y-1"><Label>Situation *</Label><Textarea value={newStory.situation} onChange={e => setNewStory({ ...newStory, situation: e.target.value })} className="bg-secondary/50" rows={2} placeholder="What was the context?" /></div>
                <div className="space-y-1"><Label>Task</Label><Textarea value={newStory.task} onChange={e => setNewStory({ ...newStory, task: e.target.value })} className="bg-secondary/50" rows={2} placeholder="What was your responsibility?" /></div>
                <div className="space-y-1"><Label>Action</Label><Textarea value={newStory.action} onChange={e => setNewStory({ ...newStory, action: e.target.value })} className="bg-secondary/50" rows={2} placeholder="What did you do?" /></div>
                <div className="space-y-1"><Label>Result</Label><Textarea value={newStory.result} onChange={e => setNewStory({ ...newStory, result: e.target.value })} className="bg-secondary/50" rows={2} placeholder="What was the outcome?" /></div>
                <div className="space-y-1"><Label>Reflection</Label><Textarea value={newStory.reflection} onChange={e => setNewStory({ ...newStory, reflection: e.target.value })} className="bg-secondary/50" rows={2} placeholder="What would you do differently?" /></div>
                <div className="space-y-1"><Label>Tags</Label><Input value={newStory.tags} onChange={e => setNewStory({ ...newStory, tags: e.target.value })} className="bg-secondary/50" placeholder="leadership, technical, collaboration" /></div>
                <Button onClick={handleAdd} className="bg-teal-600 hover:bg-teal-700 text-white w-full">Save Story</Button>
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
            <Card key={s.id} className="border-border/50 bg-card/80 backdrop-blur-sm hover:border-border transition-colors">
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
