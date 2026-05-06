'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase, Star, TrendingUp, Users, Award,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { useHireMeOSStore } from '@/lib/store';

export default function MetricsCards() {
  const { metrics } = useHireMeOSStore();
  const cards = [
    { title: 'Total Applications', value: metrics?.total_applications ?? 0, icon: Briefcase, color: 'text-teal-400', bg: 'bg-teal-500/10' },
    { title: 'Average Score', value: metrics?.avg_score ?? 0, icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/10', suffix: '/5' },
    { title: 'Response Rate', value: metrics?.response_rate ?? 0, icon: TrendingUp, color: 'text-sky-400', bg: 'bg-sky-500/10', suffix: '%' },
    { title: 'Interview Rate', value: metrics?.interview_rate ?? 0, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10', suffix: '%' },
    { title: 'Offer Rate', value: metrics?.offer_rate ?? 0, icon: Award, color: 'text-emerald-400', bg: 'bg-emerald-500/10', suffix: '%' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {cards.map((card, i) => (
        <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm hover:border-border transition-colors">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bg}`}><card.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color}`} /></div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{card.title}</p>
                  <p className="text-lg sm:text-2xl font-bold">{card.value}{card.suffix && <span className="text-sm text-muted-foreground">{card.suffix}</span>}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
