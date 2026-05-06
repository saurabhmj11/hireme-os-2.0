'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { PenLine, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { Application } from '@/lib/types';

export default function FillFormDialog({ app }: { app: Application }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', linkedin: '', portfolio: '', why_interested: '', salary_expectation: '' });
  const [isFilling, setIsFilling] = useState(false);

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-teal-400" title="Fill Form">
          <PenLine className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader><DialogTitle>Fill Form — {app.company}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-secondary/50" /></div>
            <div className="space-y-1"><Label>Email</Label><Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-secondary/50" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Phone</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="bg-secondary/50" /></div>
            <div className="space-y-1"><Label>LinkedIn</Label><Input value={formData.linkedin} onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })} className="bg-secondary/50" /></div>
          </div>
          <div className="space-y-1"><Label>Portfolio</Label><Input value={formData.portfolio} onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })} className="bg-secondary/50" /></div>
          <div className="space-y-1"><Label>Why interested?</Label><Textarea value={formData.why_interested} onChange={(e) => setFormData({ ...formData, why_interested: e.target.value })} className="bg-secondary/50" rows={2} /></div>
          <div className="space-y-1"><Label>Salary expectation</Label><Input value={formData.salary_expectation} onChange={(e) => setFormData({ ...formData, salary_expectation: e.target.value })} className="bg-secondary/50" /></div>
          <div className="flex gap-3">
            <Button onClick={handleAiFill} disabled={isFilling} className="bg-teal-600 hover:bg-teal-700 text-white flex-1">
              {isFilling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}AI Fill
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
