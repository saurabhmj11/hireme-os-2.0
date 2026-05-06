'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Settings2, Scale, Check, Loader2, Save, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useHireMeOSStore } from '@/lib/store';
import type { SettingsData, ScoringWeight } from '@/lib/types';
import { DEFAULT_WEIGHTS } from '@/lib/types';

export default function SettingsTab() {
  const { settings, setSettings, weights, setWeights } = useHireMeOSStore();
  const [localSettings, setLocalSettings] = useState<SettingsData>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [localWeights, setLocalWeights] = useState<ScoringWeight[]>([]);

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
          <Button onClick={handleSave} disabled={isSaving} className="bg-teal-600 hover:bg-teal-700 text-white">{isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}Save Settings</Button>
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
            <Button onClick={handleSaveWeights} className="bg-teal-600 hover:bg-teal-700 text-white"><Save className="h-4 w-4 mr-2" />Save Weights</Button>
            <Button variant="outline" onClick={handleResetWeights} className="border-border/50"><RefreshCw className="h-4 w-4 mr-2" />Reset to Default</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
