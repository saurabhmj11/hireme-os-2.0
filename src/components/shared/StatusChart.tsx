'use client';

import React from 'react';
import { BarChart3, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { useHireMeOSStore } from '@/lib/store';

const PIE_COLORS = ['#38bdf8', '#a78bfa', '#fbbf24', '#34d399', '#f87171', '#fb923c'];

export default function StatusChart() {
  const { metrics } = useHireMeOSStore();
  if (!metrics?.by_status) return null;
  const barData = Object.entries(metrics.by_status).map(([status, count]) => ({ status, count }));
  const pieData = Object.entries(metrics.by_status).map(([status, count]) => ({ name: status, value: count }));
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><BarChart3 className="h-4 w-4 text-teal-400" />Applications by Status</CardTitle></CardHeader>
        <CardContent className="pt-0"><div className="h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}><CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0.01 270)" /><XAxis dataKey="status" tick={{ fontSize: 10 }} stroke="oklch(0.65 0.01 270)" /><YAxis tick={{ fontSize: 10 }} stroke="oklch(0.65 0.01 270)" /><Tooltip contentStyle={{ backgroundColor: 'oklch(0.22 0.015 270)', border: '1px solid oklch(0.35 0.015 270)', borderRadius: '8px', fontSize: '12px' }} /><Bar dataKey="count" radius={[4, 4, 0, 0]}>{barData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer></div></CardContent>
      </Card>
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Target className="h-4 w-4 text-amber-400" />Status Distribution</CardTitle></CardHeader>
        <CardContent className="pt-0"><div className="h-48 flex items-center"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">{pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Pie><Tooltip contentStyle={{ backgroundColor: 'oklch(0.22 0.015 270)', border: '1px solid oklch(0.35 0.015 270)', borderRadius: '8px', fontSize: '12px' }} /></PieChart></ResponsiveContainer>
          <div className="flex flex-col gap-1 text-xs">{pieData.map((e, i) => <div key={e.name} className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} /><span className="text-muted-foreground">{e.name}</span><span className="font-medium">{e.value}</span></div>)}</div>
        </div></CardContent>
      </Card>
    </div>
  );
}
