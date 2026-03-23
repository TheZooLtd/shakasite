import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import {
  useListWorkers,
  useListTimesheets,
  useSignOffTimesheetEntry,
  useSignOffWeek,
  getListTimesheetsQueryKey,
} from '@workspace/api-client-react';
import type { TimesheetEntry } from '@workspace/api-client-react';
import { useAppContext } from '@/context/AppContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  FileCheck2,
  ChevronDown,
  Clock,
  Coffee,
  MapPin,
  Briefcase,
  StickyNote,
} from 'lucide-react';

function SkeletonRow() {
  return (
    <div className="p-4 flex flex-col gap-3 animate-pulse">
      <div className="flex gap-8">
        <div className="h-4 w-20 bg-white/10 rounded" />
        <div className="h-4 w-16 bg-white/10 rounded" />
        <div className="h-4 w-32 bg-white/10 rounded" />
        <div className="ml-auto h-7 w-20 bg-white/10 rounded-lg" />
      </div>
    </div>
  );
}

function SkeletonWorkerCard() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg animate-pulse">
      <div className="bg-secondary/40 p-4 border-b border-border flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-white/10" />
        <div className="space-y-2">
          <div className="h-4 w-28 bg-white/10 rounded" />
          <div className="h-3 w-20 bg-white/10 rounded" />
        </div>
      </div>
      <div className="divide-y divide-border">
        {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
      </div>
    </div>
  );
}

function TaskBreakdownBar({ breakdown }: { breakdown: Record<string, number> }) {
  const total = Object.values(breakdown).reduce((s, v) => s + v, 0);
  const COLOURS = ['bg-sky-400', 'bg-emerald-400', 'bg-amber-400', 'bg-violet-400', 'bg-rose-400'];
  return (
    <div className="space-y-2">
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {Object.entries(breakdown).map(([, hrs], i) => (
          <div
            key={i}
            className={`${COLOURS[i % COLOURS.length]} transition-all`}
            style={{ width: `${(hrs / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {Object.entries(breakdown).map(([task, hrs], i) => (
          <div key={task} className="flex items-center gap-1.5 text-xs">
            <div className={`w-2 h-2 rounded-full ${COLOURS[i % COLOURS.length]}`} />
            <span className="text-muted-foreground">{task}</span>
            <span className="font-semibold">{hrs}h</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EntryDetailPanel({ entry }: { entry: TimesheetEntry }) {
  let breakdown: Record<string, number> = {};
  try {
    if (entry.taskBreakdown) breakdown = JSON.parse(entry.taskBreakdown);
  } catch {}

  const lunchMins = entry.lunchMinutes ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="px-4 pb-4 pt-3 bg-white/[0.04] border-t border-white/10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 mt-0.5 text-sky-400 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Hours on site</p>
              <p className="font-bold text-sky-400">{entry.totalHours}h</p>
              <p className="text-xs text-muted-foreground">{entry.startTime} – {entry.finishTime}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Coffee className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Lunch break</p>
              <p className="font-semibold">{lunchMins > 0 ? `${lunchMins} min` : 'None'}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Worksite</p>
              <p className="font-semibold">{entry.worksiteId ? `Site #${entry.worksiteId}` : '—'}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Briefcase className="w-4 h-4 mt-0.5 text-violet-400 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Job</p>
              <p className="font-semibold">{entry.jobId ? `Job #${entry.jobId}` : '—'}</p>
            </div>
          </div>
        </div>

        {Object.keys(breakdown).length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">Task breakdown</p>
            <TaskBreakdownBar breakdown={breakdown} />
          </div>
        )}

        {entry.notes && (
          <div className="flex items-start gap-2 bg-white/[0.04] rounded-xl p-3 border border-white/10">
            <StickyNote className="w-4 h-4 mt-0.5 text-amber-300 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Worker notes</p>
              <p className="text-sm italic text-foreground/90">"{entry.notes}"</p>
            </div>
          </div>
        )}

        {entry.isSignedOff && entry.signedOffAt && (
          <p className="text-xs text-muted-foreground mt-3">
            Approved {format(new Date(entry.signedOffAt), 'MMM d, yyyy h:mm a')}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default function ManagerTimesheets() {
  const { workerId: managerId } = useAppContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [expandedEntryId, setExpandedEntryId] = useState<number | null>(null);

  const weekStartStr = format(currentWeek, 'yyyy-MM-dd');
  const weekEndStr = format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const { data: workers, isLoading: workersLoading } = useListWorkers();
  const { data: timesheets, isLoading: timesheetsLoading } = useListTimesheets({
    workerId: selectedWorkerId,
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
  });

  const isLoading = workersLoading || timesheetsLoading;

  const signOffEntryMutation = useSignOffTimesheetEntry();
  const signOffWeekMutation = useSignOffWeek();

  const handlePrevWeek = () => { setCurrentWeek(subWeeks(currentWeek, 1)); setExpandedEntryId(null); };
  const handleNextWeek = () => { setCurrentWeek(addWeeks(currentWeek, 1)); setExpandedEntryId(null); };

  const handleSignOffEntry = async (e: React.MouseEvent, entryId: number) => {
    e.stopPropagation();
    try {
      await signOffEntryMutation.mutateAsync({ id: entryId, data: { signedOffBy: managerId! } });
      queryClient.invalidateQueries({ queryKey: getListTimesheetsQueryKey() });
      toast({ title: 'Approved', description: 'Timesheet entry signed off.' });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleSignOffWeek = async () => {
    if (!selectedWorkerId) return;
    try {
      await signOffWeekMutation.mutateAsync({
        data: { workerId: selectedWorkerId, weekStart: weekStartStr, signedOffBy: managerId! },
      });
      queryClient.invalidateQueries({ queryKey: getListTimesheetsQueryKey() });
      toast({ title: 'Week Approved', description: 'All entries for the week signed off.' });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const toggleEntry = (id: number) => setExpandedEntryId(prev => prev === id ? null : id);

  const displayEntries = timesheets || [];
  const entriesByWorker = displayEntries.reduce(
    (acc, entry) => {
      if (!acc[entry.workerId]) acc[entry.workerId] = { entries: [], totalHours: 0, pending: 0 };
      acc[entry.workerId].entries.push(entry);
      acc[entry.workerId].totalHours += entry.totalHours || 0;
      if (!entry.isSignedOff) acc[entry.workerId].pending++;
      return acc;
    },
    {} as Record<number, { entries: TimesheetEntry[]; totalHours: number; pending: number }>
  );

  const getWorkerName = (id: number) => workers?.find(w => w.id === id)?.name || `Worker ${id}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-5xl mx-auto">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Team Timesheets</h1>
          <p className="text-muted-foreground">Review and sign off hours.</p>
        </div>

        <div className="flex items-center bg-card border border-border rounded-xl p-1 shadow-sm">
          <Button variant="ghost" size="icon" onClick={handlePrevWeek}><ChevronLeft className="w-5 h-5" /></Button>
          <div className="px-4 font-semibold text-sm">
            {format(currentWeek, 'MMM d')} – {format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d, yyyy')}
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextWeek}><ChevronRight className="w-5 h-5" /></Button>
        </div>
      </div>

      {/* Worker filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {workersLoading ? (
          <>
            {[1,2,3,4].map(i => <div key={i} className="h-9 w-24 rounded-full bg-white/10 animate-pulse shrink-0" />)}
          </>
        ) : (
          <>
            <Button
              variant={selectedWorkerId === null ? 'default' : 'secondary'}
              onClick={() => { setSelectedWorkerId(null); setExpandedEntryId(null); }}
              className="rounded-full whitespace-nowrap"
            >
              All Workers
            </Button>
            {workers?.filter(w => w.role === 'worker').map(w => (
              <Button
                key={w.id}
                variant={selectedWorkerId === w.id ? 'default' : 'secondary'}
                onClick={() => { setSelectedWorkerId(w.id); setExpandedEntryId(null); }}
                className="rounded-full whitespace-nowrap"
              >
                {w.name}
              </Button>
            ))}
          </>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-8">
          <SkeletonWorkerCard />
          <SkeletonWorkerCard />
        </div>
      ) : Object.keys(entriesByWorker).length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-border rounded-2xl">
          <p className="text-muted-foreground text-lg">No timesheets submitted for this period.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(entriesByWorker).map(([wId, data]) => {
            const workerId = parseInt(wId);
            return (
              <div key={wId} className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
                <div className="bg-secondary/40 p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                      {getWorkerName(workerId)[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{getWorkerName(workerId)}</h3>
                      <p className="text-sm text-muted-foreground">
                        {data.totalHours.toFixed(1)}h total
                        {data.pending > 0 && (
                          <span className="ml-2 text-amber-400 font-medium">• {data.pending} pending</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {data.pending > 0 && selectedWorkerId !== null && (
                    <Button
                      onClick={handleSignOffWeek}
                      disabled={signOffWeekMutation.isPending}
                      className="bg-success text-success-foreground hover:bg-success/90"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Approve All
                    </Button>
                  )}
                </div>

                <div className="divide-y divide-border/60">
                  {data.entries
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(entry => {
                      const isExpanded = expandedEntryId === entry.id;
                      return (
                        <div key={entry.id}>
                          {/* Row — clickable */}
                          <button
                            className="w-full text-left p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors cursor-pointer group"
                            onClick={() => toggleEntry(entry.id)}
                          >
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 flex-1">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Date</p>
                                <p className="font-semibold">{format(new Date(entry.date), 'EEE, MMM d')}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Hours</p>
                                <p className="font-bold text-primary">
                                  {entry.totalHours}h{' '}
                                  <span className="text-xs font-normal text-muted-foreground">
                                    ({entry.startTime}–{entry.finishTime})
                                  </span>
                                </p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-xs text-muted-foreground mb-1">Tasks</p>
                                <p className="text-sm truncate">
                                  {entry.taskBreakdown
                                    ? Object.entries(JSON.parse(entry.taskBreakdown))
                                        .map(([k, v]) => `${k} (${v}h)`)
                                        .join(', ')
                                    : 'General'}
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-3">
                              {entry.isSignedOff ? (
                                <div className="flex items-center text-success text-sm font-bold bg-success/10 px-3 py-1.5 rounded-lg border border-success/20">
                                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approved
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => handleSignOffEntry(e, entry.id)}
                                  disabled={signOffEntryMutation.isPending}
                                  className="hover:border-success hover:text-success"
                                >
                                  <FileCheck2 className="w-4 h-4 mr-2" /> Sign Off
                                </Button>
                              )}
                              <ChevronDown
                                className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </div>
                          </button>

                          {/* Expandable detail panel */}
                          <AnimatePresence initial={false}>
                            {isExpanded && <EntryDetailPanel entry={entry} />}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
