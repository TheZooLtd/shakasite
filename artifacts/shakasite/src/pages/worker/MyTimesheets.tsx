import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { taskLabel } from '@/lib/tasks';
import { format, startOfWeek, subWeeks, endOfWeek } from 'date-fns';
import { useListTimesheets, useListWorksites } from '@workspace/api-client-react';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function weekLabel(weekStart: Date) {
  const end = endOfWeek(weekStart, { weekStartsOn: 1 });
  return `${format(weekStart, 'dd MMM')} – ${format(end, 'dd MMM yyyy')}`;
}

export default function MyTimesheets() {
  const { workerId } = useAppContext();
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

  const { data: entries = [], isLoading } = useListTimesheets({ workerId: workerId ?? undefined });
  const { data: worksites = [] } = useListWorksites();

  const worksiteMap = Object.fromEntries(worksites.map(w => [w.id, w.name]));

  // Group entries by week
  const weekGroups: Record<string, typeof entries> = {};
  for (const entry of entries) {
    const weekStart = startOfWeek(new Date(entry.date + 'T00:00:00'), { weekStartsOn: 1 });
    const key = weekStart.toISOString().slice(0, 10);
    if (!weekGroups[key]) weekGroups[key] = [];
    weekGroups[key].push(entry);
  }

  const sortedWeeks = Object.keys(weekGroups).sort((a, b) => b.localeCompare(a));

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold">My Timesheets</h1>
        <p className="text-muted-foreground text-sm mt-1">Read-only history of your submitted hours</p>
      </motion.div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-card animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && sortedWeeks.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No timesheet history yet.
          </CardContent>
        </Card>
      )}

      {sortedWeeks.map(weekKey => {
        const weekEntries = weekGroups[weekKey].sort((a, b) => b.date.localeCompare(a.date));
        const totalHours = weekEntries.reduce((sum, e) => sum + (e.totalHours ?? 0), 0);
        const allSigned = weekEntries.every(e => e.isSignedOff);
        const someSigned = weekEntries.some(e => e.isSignedOff);
        const isExpanded = expandedWeek === weekKey;
        const weekStartDate = new Date(weekKey + 'T00:00:00');

        return (
          <motion.div key={weekKey} variants={item}>
            <Card className={cn(
              "cursor-pointer hover:border-primary/40 transition-colors",
              isExpanded && "border-primary/30"
            )}
              onClick={() => setExpandedWeek(isExpanded ? null : weekKey)}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{weekLabel(weekStartDate)}</p>
                      <p className="text-xs text-muted-foreground">{weekEntries.length} day{weekEntries.length !== 1 ? 's' : ''} logged</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-lg">{Math.round(totalHours * 10) / 10}h</p>
                      {allSigned ? (
                        <Badge className="bg-success/20 text-success border-success/30 text-xs">Signed Off</Badge>
                      ) : someSigned ? (
                        <Badge className="bg-warning/20 text-warning border-warning/30 text-xs">Partial</Badge>
                      ) : (
                        <Badge className="bg-secondary text-muted-foreground text-xs">Pending</Badge>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 space-y-3 border-t border-border pt-4"
                  >
                    {weekEntries.map(entry => {
                      let breakdown: Record<string, number> = {};
                      try { if (entry.taskBreakdown) breakdown = JSON.parse(entry.taskBreakdown); } catch {}
                      return (
                        <div key={entry.id} className="flex flex-col gap-2 bg-secondary/30 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm">{format(new Date(entry.date + 'T00:00:00'), 'EEEE, d MMM')}</p>
                              {entry.isSignedOff && <CheckCircle2 className="w-4 h-4 text-success" />}
                            </div>
                            <div className="flex items-center gap-1 text-sm font-bold">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              {entry.totalHours ?? 0}h
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {worksiteMap[entry.worksiteId] ?? 'Unknown site'}
                            {entry.startTime && ` · ${entry.startTime} – ${entry.finishTime}`}
                            {entry.lunchMinutes && ` (${entry.lunchMinutes}m lunch)`}
                          </div>
                          {Object.keys(breakdown).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {Object.entries(breakdown).filter(([, h]) => h > 0).map(([key, hrs]) => (
                                <span key={key} className="text-xs bg-secondary rounded-lg px-2 py-0.5 font-mono text-primary/80">
                                  {taskLabel(key)}: <span className="text-foreground font-semibold not-italic">{hrs}h</span>
                                </span>
                              ))}
                            </div>
                          )}
                          {entry.notes && (
                            <p className="text-xs text-muted-foreground italic">"{entry.notes}"</p>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
