import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useListJobs, useListJobMilestones, useListWorksites, getListJobMilestonesQueryKey } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Clock, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

function BudgetBar({ used, budgeted }: { used: number; budgeted: number | null | undefined }) {
  if (!budgeted) return null;
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

function JobCard({ job, worksiteMap }: { job: any; worksiteMap: Record<number, string> }) {
  const [expanded, setExpanded] = useState(false);
  const { data: milestones = [] } = useListJobMilestones(job.id, { query: { enabled: expanded, queryKey: getListJobMilestonesQueryKey(job.id) } });

  const pct = job.budgetedHours ? (job.hoursUsed / job.budgetedHours) * 100 : null;

  return (
    <Card className={cn(
      "cursor-pointer hover:border-primary/30 transition-colors",
      pct !== null && pct >= 100 && "border-destructive/30",
      pct !== null && pct >= 70 && pct < 100 && "border-warning/30"
    )}
      onClick={() => setExpanded(!expanded)}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
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
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>

        <BudgetBar used={job.hoursUsed} budgeted={job.budgetedHours} />

        {job.deadline && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            Deadline: {format(new Date(job.deadline), 'dd MMM yyyy')}
          </div>
        )}

        {expanded && milestones.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-t border-border pt-4 mt-2 space-y-2"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Milestones</p>
            {milestones.map((m, idx) => {
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
        <p className="text-muted-foreground text-sm mt-1">Track hours against job budgets and milestones</p>
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
