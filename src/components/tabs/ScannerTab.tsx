'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { ScanLine, Search, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHireMeOSStore } from '@/lib/store';
import { AI_ENGINES } from '@/lib/types';

export default function ScannerTab() {
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
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ScanLine className="h-4 w-4 text-teal-400" />Job Scanner</CardTitle><CardDescription>Search for jobs across portals using AI-powered web search</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Search query (e.g. Senior AI Engineer remote)" value={query} onChange={(e) => setQuery(e.target.value)} className="bg-secondary/50 border-border/50" />
          <div className="flex gap-3 items-center">
            <Select value={engine} onValueChange={setEngine}><SelectTrigger className="w-36 bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger><SelectContent>{AI_ENGINES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent></Select>
            <Button onClick={handleScan} disabled={isScanning} className="bg-teal-600 hover:bg-teal-700 text-white">{isScanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}Scan Portals</Button>
          </div>
        </CardContent>
      </Card>
      <AnimatePresence>{scanResult && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        <Card className="border-teal-500/30 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Scan Results</CardTitle></CardHeader>
          <CardContent><ScrollArea className="max-h-72"><pre className="text-sm text-foreground/90 whitespace-pre-wrap font-mono">{scanResult}</pre></ScrollArea></CardContent>
        </Card>
      </motion.div>}</AnimatePresence>
    </div>
  );
}
