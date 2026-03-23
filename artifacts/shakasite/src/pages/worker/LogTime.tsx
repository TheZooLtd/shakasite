import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useLocation } from 'wouter';
import { 
  useListWorksites,
  useListJobs,
  useCreateTimesheetEntry,
  useGetWorker
} from '@workspace/api-client-react';
import { useAppContext } from '@/context/AppContext';
import { calculateHours, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, ChevronDown, ChevronRight, Save } from 'lucide-react';
import { TASK_CATEGORIES } from '@/lib/tasks';

export default function LogTime() {
  const { workerId } = useAppContext();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: worksites } = useListWorksites();
  const { data: jobs } = useListJobs();
  const createMutation = useCreateTimesheetEntry();

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [worksiteId, setWorksiteId] = useState<string>('');
  const [jobId, setJobId] = useState<string>('');
  const [startTime, setStartTime] = useState('07:00');
  const [finishTime, setFinishTime] = useState('17:00');
  const [lunchMinutes, setLunchMinutes] = useState('30');
  const [notes, setNotes] = useState('');
  
  const [taskHours, setTaskHours] = useState<Record<string, string>>({});
  const [expandedCat, setExpandedCat] = useState<string | null>('CONCRETE');

  const availableJobs = useMemo(() => {
    if (!worksiteId) return [];
    return jobs?.filter(j => j.worksiteId.toString() === worksiteId) || [];
  }, [jobs, worksiteId]);

  const totalCalculatedHours = useMemo(() => {
    return calculateHours(startTime, finishTime, parseInt(lunchMinutes || '0', 10));
  }, [startTime, finishTime, lunchMinutes]);

  const allocatedTaskHours = useMemo(() => {
    return Object.values(taskHours).reduce((sum, h) => sum + (parseFloat(h) || 0), 0);
  }, [taskHours]);

  const handleTaskHourChange = (task: string, val: string) => {
    setTaskHours(prev => ({ ...prev, [task]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worksiteId) {
      toast({ title: "Error", description: "Please select a worksite", variant: "destructive" });
      return;
    }

    // Clean up task breakdown to only include > 0
    const cleanBreakdown = Object.entries(taskHours).reduce((acc, [k, v]) => {
      const num = parseFloat(v);
      if (num > 0) acc[k] = num;
      return acc;
    }, {} as Record<string, number>);

    try {
      await createMutation.mutateAsync({
        data: {
          workerId: workerId!,
          worksiteId: parseInt(worksiteId, 10),
          jobId: jobId ? parseInt(jobId, 10) : null,
          date,
          startTime,
          finishTime,
          lunchMinutes: parseInt(lunchMinutes || '0', 10),
          totalHours: totalCalculatedHours,
          taskBreakdown: JSON.stringify(cleanBreakdown),
          notes
        }
      });

      toast({
        title: "Timesheet Saved",
        description: `Successfully logged ${totalCalculatedHours}h for ${format(new Date(date), 'MMM d')}.`,
        className: "bg-success text-success-foreground border-success"
      });
      
      setLocation('/');
    } catch (err: any) {
      toast({ title: "Error saving timesheet", description: err.message, variant: "destructive" });
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">Log Time</h1>
        <p className="text-muted-foreground mt-1">Record your daily hours and task breakdown.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm">1</span> 
              General Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            
            <div className="space-y-2">
              <Label>Worksite</Label>
              <select 
                className="flex h-12 w-full rounded-xl border-2 border-border bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20 transition-all"
                value={worksiteId} 
                onChange={e => {
                  setWorksiteId(e.target.value);
                  setJobId('');
                }}
                required
              >
                <option value="" disabled>Select Worksite...</option>
                {worksites?.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Job / Project (Optional)</Label>
              <select 
                className="flex h-12 w-full rounded-xl border-2 border-border bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20 transition-all disabled:opacity-50"
                value={jobId} 
                onChange={e => setJobId(e.target.value)}
                disabled={!worksiteId || availableJobs.length === 0}
              >
                <option value="">Select Job...</option>
                {availableJobs.map(j => (
                  <option key={j.id} value={j.id}>{j.name}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm">2</span> 
              Time & Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Finish Time</Label>
                <Input type="time" value={finishTime} onChange={e => setFinishTime(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Lunch (mins)</Label>
                <Input type="number" value={lunchMinutes} onChange={e => setLunchMinutes(e.target.value)} min="0" />
              </div>
            </div>
            
            <div className="bg-secondary/50 rounded-xl p-4 flex items-center justify-between border border-border/50">
              <span className="font-semibold text-muted-foreground">Total Daily Hours</span>
              <span className="text-3xl font-display font-bold text-primary">{totalCalculatedHours.toFixed(1)}h</span>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(allocatedTaskHours > totalCalculatedHours ? "border-destructive ring-1 ring-destructive" : "")}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm">3</span> 
                Task Breakdown
              </CardTitle>
              <div className="text-sm font-semibold flex items-center gap-2">
                <span className={allocatedTaskHours !== totalCalculatedHours ? "text-warning" : "text-success"}>
                  {allocatedTaskHours.toFixed(1)}h allocated
                </span>
                <span className="text-muted-foreground">/ {totalCalculatedHours.toFixed(1)}h total</span>
              </div>
            </div>
            {allocatedTaskHours > totalCalculatedHours && (
              <p className="text-destructive text-sm mt-2 font-medium">You have allocated more hours than your daily total.</p>
            )}
          </CardHeader>
          <CardContent className="space-y-2 p-2 pt-0">
            {Object.entries(TASK_CATEGORIES).map(([cat, tasks]) => (
              <div key={cat} className="border border-border rounded-xl overflow-hidden bg-background">
                <button 
                  type="button"
                  onClick={() => setExpandedCat(expandedCat === cat ? null : cat)}
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary transition-colors"
                >
                  <span className="font-bold tracking-wider">{cat}</span>
                  {expandedCat === cat ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
                
                {expandedCat === cat && (
                  <div className="p-4 pt-0 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4 bg-card/30">
                    {tasks.map(task => (
                      <div key={task.code} className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-mono text-primary/70 leading-none mb-0.5">{task.code}</p>
                          <Label className="text-xs font-medium text-muted-foreground leading-tight">{task.name}</Label>
                        </div>
                        <Input 
                          type="number" 
                          step="0.5" 
                          min="0"
                          className="w-20 h-9 text-right shrink-0"
                          placeholder="0"
                          value={taskHours[task.code] || ''}
                          onChange={(e) => handleTaskHourChange(task.code, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="pt-4 flex justify-end">
          <Button 
            type="submit" 
            size="lg" 
            disabled={createMutation.isPending}
            className="w-full md:w-auto"
          >
            {createMutation.isPending ? "Saving..." : "Submit Timesheet"}
            {!createMutation.isPending && <Save className="w-5 h-5 ml-2" />}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
