import React from 'react';
import { motion } from 'framer-motion';
import { useGetManagerStats } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Gauge } from '@/components/ui/gauge';
import { Users, Clock, AlertTriangle, Briefcase, ChevronRight, MapPin } from 'lucide-react';
import { Link } from 'wouter';

export default function ManagerDashboard() {
  const { data: stats, isLoading } = useGetManagerStats();

  if (isLoading || !stats) {
    return <div className="animate-pulse h-full w-full bg-secondary/20 rounded-xl" />;
  }

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-display font-bold">Manager Overview</h1>
          <p className="text-muted-foreground">Monitor site progress and team hours.</p>
        </div>
        <div className="flex gap-2">
          {stats.pendingSignoffs > 0 && (
            <Link href="/team-timesheets">
              <div className="bg-warning/20 text-warning px-4 py-2 rounded-xl font-bold text-sm cursor-pointer hover:bg-warning/30 flex items-center shadow-lg shadow-warning/10">
                {stats.pendingSignoffs} Pending Sign-offs <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </Link>
          )}
        </div>
      </div>

      {stats.jobsAtRisk > 0 && (
        <motion.div variants={item} className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-destructive font-bold">Budget Warning</h3>
            <p className="text-sm text-destructive-foreground/80">{stats.jobsAtRisk} jobs have reached 70% of their allocated hours budget.</p>
          </div>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <motion.div variants={item}>
          <Card className="h-full">
            <CardContent className="p-6">
              <Briefcase className="w-8 h-8 text-primary mb-4 opacity-80" />
              <p className="text-sm font-medium text-muted-foreground mb-1">Active Jobs</p>
              <p className="text-3xl font-display font-bold">{stats.activeJobsCount}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card className="h-full">
            <CardContent className="p-6">
              <Users className="w-8 h-8 text-info mb-4 opacity-80" />
              <p className="text-sm font-medium text-muted-foreground mb-1">Active Workers</p>
              <p className="text-3xl font-display font-bold">{stats.totalWorkersThisWeek}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card className="h-full">
            <CardContent className="p-6">
              <Clock className="w-8 h-8 text-success mb-4 opacity-80" />
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Hours</p>
              <p className="text-3xl font-display font-bold">{stats.totalHoursThisWeek.toFixed(0)}h</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card className="h-full">
            <CardContent className="p-6">
              <AlertTriangle className="w-8 h-8 text-warning mb-4 opacity-80" />
              <p className="text-sm font-medium text-muted-foreground mb-1">Over Budget</p>
              <p className="text-3xl font-display font-bold">{stats.jobsOverBudget}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Job Health Section */}
      <motion.div variants={item} className="pt-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-display font-bold">Job Health</h2>
          <Link href="/jobs" className="text-sm text-primary font-medium flex items-center hover:underline">
            Manage Jobs <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {stats.jobSummaries.map(job => {
            const percent = job.budgetPercent || 0;
            return (
              <Card key={job.id} className="relative overflow-hidden group hover:border-border/80 transition-colors">
                {job.isAtRisk && !job.isOverBudget && (
                  <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                    <div className="absolute top-0 right-0 bg-warning text-warning-foreground text-[10px] font-bold py-1 w-24 text-center transform rotate-45 translate-x-7 translate-y-3">
                      RISK
                    </div>
                  </div>
                )}
                {job.isOverBudget && (
                  <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                    <div className="absolute top-0 right-0 bg-destructive text-destructive-foreground text-[10px] font-bold py-1 w-24 text-center transform rotate-45 translate-x-7 translate-y-3">
                      OVER
                    </div>
                  </div>
                )}
                
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg leading-tight truncate pr-8">{job.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center mt-1">
                        <MapPin className="w-3 h-3 mr-1" /> {job.worksiteName}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-center py-4">
                    <Gauge 
                      value={percent} 
                      size={140} 
                      strokeWidth={14} 
                      label={job.budgetedHours ? 'BUDGET USED' : 'NO BUDGET'} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border mt-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Hours Used</p>
                      <p className="font-bold">{job.hoursUsed.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Budget</p>
                      <p className="font-bold">{job.budgetedHours ? `${job.budgetedHours.toFixed(1)}h` : '—'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {stats.jobSummaries.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-2xl text-muted-foreground">
              No active jobs found. Add jobs to start tracking budgets.
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
