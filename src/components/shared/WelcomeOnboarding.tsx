'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Sparkle, FileUser, ArrowRight, Loader2, Rocket, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useHireMeOSStore } from '@/lib/store';

export default function WelcomeOnboarding({ onComplete }: { onComplete: () => void }) {
  const { settings, setSettings } = useHireMeOSStore();
  const [resumeText, setResumeText] = useState('');
  const [profileText, setProfileText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState(1);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newSettings = {
        ...settings,
        cv: resumeText,
        profile: profileText || `AI Engineer | Specialized in LLMs, RAG, Agentic AI, LangChain, LangGraph | Looking for AI Engineer, ML Engineer, LLM Engineer, GenAI Engineer roles`,
        portals: 'linkedin,indeed,glassdoor,wellfound,naukri',
        proofs: '',
      };
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        setSettings(newSettings);
        toast.success('Resume saved! Your AI job search is ready.');
        onComplete();
      }
    } catch {
      toast.error('Failed to save resume');
    }
    finally { setIsSaving(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-background flex items-center justify-center p-4"
    >
      <Card className="w-full max-w-2xl border-teal-500/30 bg-card/90 backdrop-blur-md shadow-xl shadow-teal-500/5">
        <CardHeader className="text-center pb-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="mx-auto mb-3 p-3 rounded-2xl bg-teal-500/10 w-fit"
          >
            <Sparkle className="h-8 w-8 text-teal-400" />
          </motion.div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
            Welcome to Hire Me OS 2.0
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            Your AI-powered autonomous job search command center
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
                <FileUser className="h-5 w-5 text-teal-400 shrink-0" />
                <p className="text-sm text-teal-300">
                  Paste your resume below — the AI will use it to evaluate jobs, auto-apply, and generate follow-ups tailored to you.
                </p>
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
                <p className="text-xs text-muted-foreground">
                  {resumeText.length > 0 ? `${resumeText.length} characters — looking good!` : 'Your resume is required to unlock all features'}
                </p>
                <Button
                  onClick={() => resumeText.trim() ? setStep(2) : toast.error('Please paste your resume first')}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Target className="h-5 w-5 text-emerald-400 shrink-0" />
                <p className="text-sm text-emerald-300">
                  Add a short profile summary — this helps the AI understand what roles you&apos;re targeting.
                </p>
              </div>
              <Textarea
                value={profileText}
                onChange={(e) => setProfileText(e.target.value)}
                placeholder="AI Engineer | 3 years exp | LangChain, LangGraph, RAG, Agentic AI, FastAPI | Looking for AI/ML Engineer roles"
                rows={3}
                className="bg-secondary/50 border-border/50 text-sm resize-y focus:border-teal-500/50"
                autoFocus
              />
              <div className="flex justify-between items-center">
                <Button variant="ghost" onClick={() => setStep(1)} className="text-muted-foreground">
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="border-border/50"
                  >
                    Skip & Start
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Rocket className="h-4 w-4 mr-2" />}
                    Launch Hire Me OS
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Steps indicator */}
          <div className="flex justify-center gap-2 pt-2">
            <div className={`h-2 w-8 rounded-full transition-colors ${step === 1 ? 'bg-teal-400' : 'bg-teal-400/30'}`} />
            <div className={`h-2 w-8 rounded-full transition-colors ${step === 2 ? 'bg-teal-400' : 'bg-teal-400/30'}`} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
