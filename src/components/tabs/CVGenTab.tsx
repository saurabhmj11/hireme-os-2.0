'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { FileText, Printer, Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHireMeOSStore } from '@/lib/store';
import { AI_ENGINES } from '@/lib/types';

export default function CVGenTab() {
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
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
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
            <Button onClick={handleGenerate} disabled={isGeneratingCV || !selectedApp} className="bg-teal-600 hover:bg-teal-700 text-white">
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
              <Button onClick={handlePrint} size="sm" className="bg-teal-600 hover:bg-teal-700 text-white"><Printer className="h-3.5 w-3.5 mr-1.5" />Print / Download PDF</Button>
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
