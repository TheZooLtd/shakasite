import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  useListJobs,
  useListJobMilestones,
  useListWorksites,
  useUpdateJob,
  useCreateJobMilestone,
  getListJobMilestonesQueryKey,
  getListJobsQueryKey,
} from '@workspace/api-client-react';
import type { Job, Milestone } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Briefcase, Clock, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Pencil, Plus, Save } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

function BudgetBar({ used, budgeted }: { used: number; budgeted: number | null | undefined }) {
  if (!budgeted) return <p className="text-xs text-muted-foreground italic">No budget set — click Edit to configure</p>;
  const pct = Math.min((used / budgeted) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{used}h used</span>
        <span>{budgeted}h budgeted</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 100 ? "bg-destructive" : pct >= 70 ? "bg-warning" : "bg-success"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={cn(
        "text-xs font-semibold",
        pct >= 100 ? "text-destructive" : pct >= 70 ? "text-warning" : "text-success"
      )}>
        {Math.round(pct)}% used
        {pct >= 70 && pct < 100 && " · ⚠ Approaching budget"}
        {pct >= 100 && " · ✗ Over budget"}
      </p>
    </div>
  );
}

function JobCard({ job, worksiteMap }: { job: Job; worksiteMap: Record<number, string> }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [budgetHours, setBudgetHours] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<string>(job.status);
  const [newMilestoneName, setNewMilestoneName] = useState('');
  const [newMilestoneHours, setNewMilestoneHours] = useState('');

  const { data: milestones = [], refetch: refetchMilestones } = useListJobMilestones(job.id, {
    query: { enabled: expanded, queryKey: getListJobMilestonesQueryKey(job.id) }
  });

  const updateJob = useUpdateJob();
  const createMilestone = useCreateJobMilestone();

  useEffect(() => {
    setBudgetHours(job.budgetedHours != null ? String(job.budgetedHours) : '');
    setDeadline(job.deadline ? job.deadline.slice(0, 10) : '');
    setStatus(job.status);
  }, [job]);

  const pct = job.budgetedHours ? (job.hoursUsed / job.budgetedHours) * 100 : null;

  const handleSaveBudget = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await updateJob.mutateAsync({
      id: job.id,
      data: {
        budgetedHours: budgetHours ? parseFloat(budgetHours) : null,
        deadline: deadline || null,
        status,
      }
    });
    queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
    setEditing(false);
  };

  const handleAddMilestone = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!newMilestoneName.trim()) return;
    await createMilestone.mutateAsync({
      id: job.id,
      data: {
        name: newMilestoneName.trim(),
        hoursAtMilestone: newMilestoneHours ? parseFloat(newMilestoneHours) : null,
        sortOrder: milestones.length + 1,
      }
    });
    setNewMilestoneName('');
    setNewMilestoneHours('');
    refetchMilestones();
  };

  return (
    <Card className={cn(
      "hover:border-primary/30 transition-colors",
      pct !== null && pct >= 100 && "border-destructive/30",
      pct !== null && pct >= 70 && pct < 100 && "border-warning/30"
    )}>
      <CardContent className="p-5 space-y-3">
        <div
          className="flex items-start justify-between gap-3 cursor-pointer"
          onClick={() => { if (!editing) setExpanded(!expanded); }}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-bold truncate">{job.name}</p>
              <p className="text-xs text-muted-foreground">{worksiteMap[job.worksiteId] ?? 'Unknown site'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {pct !== null && pct >= 70 && (
              <AlertTriangle className={cn("w-4 h-4", pct >= 100 ? "text-destructive" : "text-warning")} />
            )}
            <Badge className={cn(
              "text-xs",
              job.status === 'active' ? "bg-success/20 text-success border-success/30" :
              job.status === 'completed' ? "bg-primary/20 text-primary border-primary/30" :
              "bg-secondary text-muted-foreground"
            )}>
              {job.status}
            </Badge>
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(!editing); setExpanded(true); }}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              title="Edit budget"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {!editing && (expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />)}
          </div>
        </div>

        {!editing && <BudgetBar used={job.hoursUsed} budgeted={job.budgetedHours} />}

        {!editing && job.deadline && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            Deadline: {format(new Date(job.deadline), 'dd MMM yyyy')}
          </div>
        )}

        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border border-border/50 rounded-xl p-4 space-y-4 bg-secondary/20"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm font-semibold">Configure Job Budget</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Total Budget Hours</Label>
                <Input
                  type="number"
                  placeholder="e.g. 200"
                  value={budgetHours}
                  onChange={e => setBudgetHours(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Deadline</Label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <div className="flex gap-2">
                {['active', 'on_hold', 'completed'].map(s => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all",
                      status === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    )}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveBudget} disabled={updateJob.isPending} className="flex-1">
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {updateJob.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="px-3">Cancel</Button>
            </div>

            <div className="border-t border-border pt-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Milestone</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Milestone name"
                  value={newMilestoneName}
                  onChange={e => setNewMilestoneName(e.target.value)}
                  className="flex-1 text-sm h-9"
                />
                <Input
                  type="number"
                  placeholder="At Xh"
                  value={newMilestoneHours}
                  onChange={e => setNewMilestoneHours(e.target.value)}
                  className="w-24 text-sm h-9"
                />
                <Button size="sm" onClick={handleAddMilestone} disabled={!newMilestoneName.trim() || createMilestone.isPending} className="h-9 px-3">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {expanded && !editing && milestones.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-t border-border pt-4 mt-2 space-y-2"
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Milestones</p>
            {milestones.map((m: Milestone, idx: number) => {
              const reached = job.hoursUsed >= (m.hoursAtMilestone ?? Infinity) || !!m.completedAt;
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                    reached ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"
                  )}>
                    {reached ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", reached ? "text-foreground" : "text-muted-foreground")}>{m.name}</p>
                    {m.hoursAtMilestone && (
                      <p className="text-xs text-muted-foreground">At {m.hoursAtMilestone}h</p>
                    )}
                  </div>
                  {m.completedAt && (
                    <span className="text-xs text-success">{format(new Date(m.completedAt), 'dd MMM')}</span>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}

        {expanded && !editing && milestones.length === 0 && (
          <p className="text-xs text-muted-foreground italic pt-2">No milestones yet — click the pencil icon to add some.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ManagerJobs() {
  const { data: jobs = [], isLoading } = useListJobs();
  const { data: worksites = [] } = useListWorksites();
  const worksiteMap = Object.fromEntries(worksites.map(w => [w.id, w.name]));

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

  const activeJobs = jobs.filter(j => j.status === 'active');
  const otherJobs = jobs.filter(j => j.status !== 'active');

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold">Jobs & Budgets</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure budgets and milestones for each job. Click the pencil icon to edit.</p>
      </motion.div>

      {isLoading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-card animate-pulse" />)}
        </div>
      )}

      {activeJobs.length > 0 && (
        <motion.div variants={item} className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Jobs</p>
          {activeJobs.map(job => <JobCard key={job.id} job={job} worksiteMap={worksiteMap} />)}
        </motion.div>
      )}

      {otherJobs.length > 0 && (
        <motion.div variants={item} className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Other Jobs</p>
          {otherJobs.map(job => <JobCard key={job.id} job={job} worksiteMap={worksiteMap} />)}
        </motion.div>
      )}
    </motion.div>
  );
}
