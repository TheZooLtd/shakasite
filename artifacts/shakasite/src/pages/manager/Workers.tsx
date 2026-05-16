import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useListWorkers,
  useCreateWorker,
} from '@workspace/api-client-react';
import type { Worker } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, X, HardHat, Phone, Calendar, UserPlus, Users } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function WorkerCard({ worker }: { worker: Worker }) {
  const roleColor = worker.role === 'manager'
    ? 'bg-primary/10 text-primary border-primary/20'
    : 'bg-success/10 text-success border-success/20';

  return (
    <Card className="hover:border-border/60 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm",
            worker.role === 'manager' ? "bg-primary/15 text-primary" : "bg-success/15 text-success"
          )}>
            {worker.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold truncate">{worker.name}</p>
              <Badge className={cn("text-xs capitalize border", roleColor)}>
                {worker.role}
              </Badge>
            </div>
            <div className="mt-1.5 space-y-0.5">
              {worker.mobileNumber && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="w-3 h-3" />
                  <span>{worker.mobileNumber}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>{worker.daysPerWeek} day{worker.daysPerWeek !== 1 ? 's' : ''} per week</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function WorkersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: workers = [], isLoading } = useListWorkers();
  const createWorker = useCreateWorker();

  const [showInvite, setShowInvite] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'worker' | 'manager'>('worker');
  const [mobile, setMobile] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState('5');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createWorker.mutateAsync({
        data: {
          name: name.trim(),
          role,
          mobileNumber: mobile.trim() || null,
          daysPerWeek: parseInt(daysPerWeek) || 5,
          siteManagerId: null,
        },
      });
      queryClient.invalidateQueries({ queryKey: ['/api/workers'] });
      toast({ title: 'Staff member added', description: `${name.trim()} has been added to the team.` });
      setName('');
      setMobile('');
      setDaysPerWeek('5');
      setRole('worker');
      setShowInvite(false);
    } catch {
      toast({ title: 'Error', description: 'Could not add staff member.', variant: 'destructive' });
    }
  };

  const managers = workers.filter(w => w.role === 'manager');
  const fieldWorkers = workers.filter(w => w.role === 'worker');

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Workers</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your team and add new staff members.</p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowInvite(v => !v)}
            className={cn(
              "rounded-full transition-all",
              showInvite ? "bg-secondary text-foreground hover:bg-secondary/80" : "bg-primary text-primary-foreground"
            )}
          >
            {showInvite ? <><X className="w-4 h-4 mr-1.5" />Cancel</> : <><UserPlus className="w-4 h-4 mr-1.5" />Add Staff</>}
          </Button>
        </div>

        <AnimatePresence initial={false}>
          {showInvite && (
            <motion.form
              key="invite-form"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.22 }}
              onSubmit={handleInvite}
              className="overflow-hidden"
            >
              <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 space-y-4">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">New Staff Member</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Full name <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="e.g. John Smith"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Mobile number</Label>
                    <Input
                      type="tel"
                      placeholder="e.g. 021 123 4567"
                      value={mobile}
                      onChange={e => setMobile(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <div className="flex gap-2">
                      {(['worker', 'manager'] as const).map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={cn(
                            "flex-1 py-2 text-sm font-semibold rounded-xl border transition-all",
                            role === r
                              ? r === 'worker'
                                ? "bg-success/15 text-success border-success/30"
                                : "bg-primary/15 text-primary border-primary/30"
                              : "bg-transparent text-muted-foreground border-border/50 hover:border-border"
                          )}
                        >
                          {r === 'worker' ? '👷 Worker' : '📋 Manager'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Days per week</Label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDaysPerWeek(String(d))}
                          className={cn(
                            "flex-1 py-2 text-sm font-bold rounded-xl border transition-all",
                            daysPerWeek === String(d)
                              ? "bg-primary/15 text-primary border-primary/30"
                              : "bg-transparent text-muted-foreground border-border/50 hover:border-border"
                          )}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowInvite(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={!name.trim() || createWorker.isPending}>
                    {createWorker.isPending ? 'Adding…' : (
                      <><UserPlus className="w-4 h-4 mr-1.5" />Add to Team</>
                    )}
                  </Button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-2xl bg-card animate-pulse" />)}
        </div>
      )}

      {managers.length > 0 && (
        <motion.div variants={item} className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Managers & Foremen</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {managers.map(w => <WorkerCard key={w.id} worker={w} />)}
          </div>
        </motion.div>
      )}

      {fieldWorkers.length > 0 && (
        <motion.div variants={item} className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Field Workers</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fieldWorkers.map(w => <WorkerCard key={w.id} worker={w} />)}
          </div>
        </motion.div>
      )}

      {!isLoading && workers.length === 0 && (
        <motion.div variants={item}>
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold text-muted-foreground">No team members yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add your first staff member above.</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
