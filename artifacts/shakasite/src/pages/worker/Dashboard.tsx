import React from 'react';
import { motion } from 'framer-motion';
import { format, isToday, isYesterday, subDays, startOfWeek } from 'date-fns';
import { 
  useGetWorkerStats, 
  useGetWorker 
} from '@workspace/api-client-react';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Clock, MapPin, Target, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function WorkerDashboard() {
  const { workerId } = useAppContext();
  
  const { data: worker } = useGetWorker(workerId!);
  const { data: stats, isLoading } = useGetWorkerStats(workerId!);

  if (isLoading || !worker || !stats) {
    return <div className="animate-pulse h-full w-full bg-secondary/20 rounded-xl" />;
  }

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {stats.missedYesterday && (
        <motion.div variants={item} className="bg-warning/10 border-2 border-warning/30 rounded-2xl p-5 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-warning shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-warning font-bold text-lg">Did you forget to submit yesterday?</h3>
            <p className="mt-1 text-[#ffffff]">We noticed you didn't log any hours yesterday. Keep your timesheet up to date!</p>
          </div>
          <Link href="/log-time">
            <Button variant="outline" className="bg-warning text-warning-foreground border-warning hover:bg-warning/80">
              Log Time
            </Button>
          </Link>
        </motion.div>
      )}
      <motion.div variants={item} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-card to-secondary border border-border p-8 shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <HardHatBg className="w-64 h-64 text-primary" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-2">
            Hi {worker.name.split(' ')[0]},
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl">
            You've logged <span className="text-primary font-bold">{stats.weeklyHours} hours</span> this week.
            {stats.streakDays > 2 && ` Great job on your ${stats.streakDays} day submission streak!`}
          </p>
        </div>
      </motion.div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div variants={item}>
          <Card className="h-full bg-card hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Hours This Week</p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-display font-bold">{stats.weeklyHours}</span>
                <span className="text-muted-foreground pb-1">/ {stats.daysPerWeek * 8}h</span>
              </div>
              <div className="mt-4 h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary" 
                  style={{ width: `${Math.min(100, (stats.weeklyHours / (stats.daysPerWeek * 8)) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full bg-card hover:border-success/50 transition-colors">
            <CardContent className="p-6">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Days Submitted</p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-display font-bold">{stats.submittedDaysThisWeek}</span>
                <span className="text-muted-foreground pb-1">/ {stats.daysPerWeek} days</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full bg-card hover:border-info/50 transition-colors flex flex-col justify-between">
            <CardContent className="p-6">
              <div className="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-info" />
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Top Worksite</p>
              <h3 className="text-xl font-bold truncate">{stats.topWorksite || 'None yet'}</h3>
              
              {stats.topTaskType && (
                <div className="mt-3 inline-flex items-center px-2.5 py-1 rounded-md bg-secondary text-xs font-semibold text-muted-foreground">
                  <Target className="w-3 h-3 mr-1.5" />
                  Mostly {stats.topTaskType}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
      <motion.div variants={item} className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold">Recent Entries</h2>
          <Link href="/my-timesheets" className="text-sm text-primary font-medium flex items-center hover:underline">
            View all <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        
        <div className="space-y-3">
          {stats.recentEntries.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No entries this week.</p>
              <Link href="/log-time">
                <Button className="mt-4" variant="outline">Log your first hours</Button>
              </Link>
            </div>
          ) : (
            stats.recentEntries.map((entry) => (
              <div key={entry.id} className="bg-card border border-border p-4 rounded-xl flex items-center justify-between group hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-2 h-12 rounded-full",
                    entry.isSignedOff ? "bg-success" : "bg-warning"
                  )} />
                  <div>
                    <p className="font-bold text-lg">{format(new Date(entry.date), 'EEEE, MMM d')}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.startTime} - {entry.finishTime} • {entry.lunchMinutes}m break
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-display font-bold text-primary">{entry.totalHours}h</p>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {entry.isSignedOff ? 'Approved' : 'Pending'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function HardHatBg(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2a9 9 0 0 0-9 9v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a9 9 0 0 0-9-9zm0 2a7 7 0 0 1 7 7h-14a7 7 0 0 1 7-7zm-8 9h16v2h-16v-2z" />
    </svg>
  );
}
