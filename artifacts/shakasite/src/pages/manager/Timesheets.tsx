import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { 
  useListWorkers,
  useListTimesheets,
  useSignOffTimesheetEntry,
  useSignOffWeek
} from '@workspace/api-client-react';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, CheckCircle2, FileCheck2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getListTimesheetsQueryKey } from '@workspace/api-client-react';

export default function ManagerTimesheets() {
  const { workerId: managerId } = useAppContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);

  const weekStartStr = format(currentWeek, 'yyyy-MM-dd');
  const weekEndStr = format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const { data: workers } = useListWorkers();
  // We fetch timesheets for the selected worker, or all if none selected (the API might need filtering client side if no worker param is passed and it returns all)
  const { data: timesheets, isLoading } = useListTimesheets({
    workerId: selectedWorkerId,
    weekStart: weekStartStr,
    weekEnd: weekEndStr
  });

  const signOffEntryMutation = useSignOffTimesheetEntry();
  const signOffWeekMutation = useSignOffWeek();

  const handlePrevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const handleNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));

  const handleSignOffEntry = async (entryId: number) => {
    try {
      await signOffEntryMutation.mutateAsync({
        id: entryId,
        data: { signedOffBy: managerId! }
      });
      queryClient.invalidateQueries({ queryKey: getListTimesheetsQueryKey() });
      toast({ title: "Approved", description: "Timesheet entry signed off." });
    } catch (err) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleSignOffWeek = async () => {
    if (!selectedWorkerId) return;
    try {
      await signOffWeekMutation.mutateAsync({
        data: {
          workerId: selectedWorkerId,
          weekStart: weekStartStr,
          signedOffBy: managerId!
        }
      });
      queryClient.invalidateQueries({ queryKey: getListTimesheetsQueryKey() });
      toast({ title: "Week Approved", description: "All entries for the week signed off." });
    } catch (err) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  // Group by worker if no specific worker is selected, or just show entries if one is.
  const displayEntries = timesheets || [];
  const entriesByWorker = displayEntries.reduce((acc, entry) => {
    if (!acc[entry.workerId]) acc[entry.workerId] = { entries: [], totalHours: 0, pending: 0 };
    acc[entry.workerId].entries.push(entry);
    acc[entry.workerId].totalHours += (entry.totalHours || 0);
    if (!entry.isSignedOff) acc[entry.workerId].pending++;
    return acc;
  }, {} as Record<number, { entries: any[], totalHours: number, pending: number }>);

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
            {format(currentWeek, 'MMM d')} - {format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d, yyyy')}
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextWeek}><ChevronRight className="w-5 h-5" /></Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Button 
          variant={selectedWorkerId === null ? "default" : "secondary"}
          onClick={() => setSelectedWorkerId(null)}
          className="rounded-full whitespace-nowrap"
        >
          All Workers
        </Button>
        {workers?.filter(w => w.role === 'worker').map(w => (
          <Button
            key={w.id}
            variant={selectedWorkerId === w.id ? "default" : "secondary"}
            onClick={() => setSelectedWorkerId(w.id)}
            className="rounded-full whitespace-nowrap"
          >
            {w.name}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center"><div className="animate-pulse w-8 h-8 rounded-full bg-primary/50" /></div>
      ) : Object.keys(entriesByWorker).length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-border rounded-2xl">
          <p className="text-muted-foreground text-lg">No timesheets submitted for this period.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(entriesByWorker).map(([wId, data]) => (
            <div key={wId} className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
              <div className="bg-secondary/40 p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                    {getWorkerName(parseInt(wId))[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{getWorkerName(parseInt(wId))}</h3>
                    <p className="text-sm text-muted-foreground">{data.totalHours.toFixed(1)}h Total • {data.pending} Pending Sign-off</p>
                  </div>
                </div>
                {data.pending > 0 && selectedWorkerId !== null && (
                  <Button onClick={handleSignOffWeek} disabled={signOffWeekMutation.isPending} className="bg-success text-success-foreground hover:bg-success/90">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Approve All
                  </Button>
                )}
              </div>
              
              <div className="divide-y divide-border">
                {data.entries.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => (
                  <div key={entry.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 flex-1">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Date</p>
                        <p className="font-semibold">{format(new Date(entry.date), 'EEE, MMM d')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Hours</p>
                        <p className="font-bold text-primary">{entry.totalHours}h <span className="text-xs font-normal text-muted-foreground">({entry.startTime}-{entry.finishTime})</span></p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground mb-1">Tasks</p>
                        <p className="text-sm truncate">
                          {entry.taskBreakdown ? 
                            Object.entries(JSON.parse(entry.taskBreakdown)).map(([k,v]) => `${k} (${v}h)`).join(', ') 
                            : 'General'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="shrink-0 flex items-center justify-end">
                      {entry.isSignedOff ? (
                        <div className="flex items-center text-success text-sm font-bold bg-success/10 px-3 py-1.5 rounded-lg border border-success/20">
                          <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approved
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleSignOffEntry(entry.id)}
                          disabled={signOffEntryMutation.isPending}
                          className="hover:border-success hover:text-success"
                        >
                          <FileCheck2 className="w-4 h-4 mr-2" /> Sign Off
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
