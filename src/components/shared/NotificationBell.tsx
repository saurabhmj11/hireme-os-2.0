'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHireMeOSStore } from '@/lib/store';

export default function NotificationBell() {
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
    try { await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllRead: true }) }); setUnreadNotificationCount(0); setNotifications(prev => prev.map(n => ({ ...n, read: true }))); } catch { /* ignore */ }
  };

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="h-8 w-8 relative" onClick={() => setOpen(!open)}>
        <Bell className="h-4 w-4" />
        {unreadNotificationCount > 0 && <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}</span>}
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
