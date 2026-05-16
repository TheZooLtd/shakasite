import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  useListJobs,
  useListJobMilestones,
  useListWorksites,
  useListWorkers,
  useListClients,
  useListJobCodeCategories,
  useListJobCodes,
  useUpdateJob,
  useCreateJobMilestone,
  useCreateJob,
  useCreateClient,
  getListJobMilestonesQueryKey,
  getListJobsQueryKey,
  getListClientsQueryKey,
} from '@workspace/api-client-react';
import type { Job, Milestone, Client, JobCode, JobCodeCategory } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Briefcase, Clock, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
  Pencil, Plus, Save, X, Building2, Users, Tag,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

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

function JobCard({ job, worksiteMap, clientMap }: {
  job: Job;
  worksiteMap: Record<number, string>;
  clientMap: Record<number, string>;
}) {
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

  const assignedWorkerIds: number[] = (() => {
    try { return JSON.parse(job.assignedWorkerIds ?? '[]'); } catch { return []; }
  })();

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
              <p className="text-xs text-muted-foreground">
                {worksiteMap[job.worksiteId] ?? 'Unknown site'}
                {job.clientId && clientMap[job.clientId] && (
                  <span> · <Building2 className="w-3 h-3 inline" /> {clientMap[job.clientId]}</span>
                )}
              </p>
              {assignedWorkerIds.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  <Users className="w-3 h-3 inline mr-1" />{assignedWorkerIds.length} worker{assignedWorkerIds.length !== 1 ? 's' : ''} assigned
                </p>
              )}
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
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {!editing && (expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />)}
          </div>
        </div>

        {!editing && <BudgetBar used={job.hoursUsed} budgeted={job.budgetedHours} />}

        {!editing && (job.startDate || job.deadline) && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {job.startDate && <span><Clock className="w-3.5 h-3.5 inline mr-1" />Start: {format(new Date(job.startDate), 'dd MMM yyyy')}</span>}
            {job.deadline && <span><Clock className="w-3.5 h-3.5 inline mr-1" />Deadline: {format(new Date(job.deadline), 'dd MMM yyyy')}</span>}
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
                <Input type="number" placeholder="e.g. 200" value={budgetHours} onChange={e => setBudgetHours(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Deadline</Label>
                <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <div className="flex gap-2">
                {['active', 'on_hold', 'completed'].map(s => (
                  <button key={s} onClick={() => setStatus(s)} className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all",
                    status === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  )}>
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
                <Input placeholder="Milestone name" value={newMilestoneName} onChange={e => setNewMilestoneName(e.target.value)} className="flex-1 text-sm h-9" />
                <Input type="number" placeholder="At Xh" value={newMilestoneHours} onChange={e => setNewMilestoneHours(e.target.value)} className="w-24 text-sm h-9" />
                <Button size="sm" onClick={handleAddMilestone} disabled={!newMilestoneName.trim() || createMilestone.isPending} className="h-9 px-3">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {expanded && !editing && milestones.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t border-border pt-4 mt-2 space-y-2">
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
                    {m.hoursAtMilestone && <p className="text-xs text-muted-foreground">At {m.hoursAtMilestone}h</p>}
                  </div>
                  {m.completedAt && <span className="text-xs text-success">{format(new Date(m.completedAt), 'dd MMM')}</span>}
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

// ── Client typeahead ──────────────────────────────────────────────────────────
function ClientInput({
  clients,
  value,
  onChange,
  onCreateClient,
}: {
  clients: Client[];
  value: string;
  onChange: (v: string) => void;
  onCreateClient: (name: string) => Promise<number | null>;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = clients.filter(c => c.name.toLowerCase().includes(value.toLowerCase())).slice(0, 6);
  const exactMatch = clients.some(c => c.name.toLowerCase() === value.toLowerCase().trim());

  const handleCreate = async () => {
    if (!value.trim() || exactMatch) return;
    setCreating(true);
    await onCreateClient(value.trim());
    setCreating(false);
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            placeholder="Search or type a client name…"
            value={value}
            onChange={e => { onChange(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            autoComplete="off"
          />
          {showDropdown && (filtered.length > 0 || (value.trim() && !exactMatch)) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
              {filtered.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={() => { onChange(c.name); setShowDropdown(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors flex items-center gap-2"
                >
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  {c.name}
                </button>
              ))}
              {value.trim() && !exactMatch && (
                <button
                  type="button"
                  onMouseDown={handleCreate}
                  disabled={creating}
                  className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/10 transition-colors border-t border-border flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {creating ? 'Creating…' : `Add "${value.trim()}" as new client`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Job code budget picker ────────────────────────────────────────────────────
function CodeBudgetPicker({
  categories,
  allCodes,
  codeBudget,
  onChange,
}: {
  categories: JobCodeCategory[];
  allCodes: JobCode[];
  codeBudget: Record<string, number>;
  onChange: (cb: Record<string, number>) => void;
}) {
  const total = Object.values(codeBudget).reduce((s, v) => s + (v || 0), 0);

  return (
    <div className="space-y-3">
      {categories.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          No job codes configured — add them in the Job Codes admin section.
        </p>
      )}
      {categories.map(cat => {
        const codes = allCodes.filter(c => c.categoryId === cat.id);
        if (codes.length === 0) return null;
        return (
          <div key={cat.id} className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{cat.name}</p>
            <div className="space-y-1.5">
              {codes.map(code => (
                <div key={code.id} className="flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="font-mono text-xs font-bold text-primary w-20 shrink-0">{code.code}</span>
                    <span className="text-sm text-muted-foreground truncate">{code.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="0h"
                      value={codeBudget[code.code] ?? ''}
                      onChange={e => {
                        const v = e.target.value ? parseFloat(e.target.value) : 0;
                        const next = { ...codeBudget };
                        if (v > 0) next[code.code] = v; else delete next[code.code];
                        onChange(next);
                      }}
                      className="w-20 text-sm h-8 text-right"
                    />
                    <span className="text-xs text-muted-foreground">h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {total > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-sm font-semibold">Total budget</span>
          <span className="text-lg font-bold text-primary">{total}h</span>
        </div>
      )}
    </div>
  );
}

// ── Worker assignment picker ──────────────────────────────────────────────────
function WorkerPicker({
  workers,
  selected,
  onChange,
}: {
  workers: { id: number; name: string; role: string }[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const fieldWorkers = workers.filter(w => w.role === 'worker');
  return (
    <div className="flex flex-wrap gap-2">
      {fieldWorkers.map(w => {
        const isSelected = selected.includes(w.id);
        return (
          <button
            key={w.id}
            type="button"
            onClick={() => onChange(isSelected ? selected.filter(id => id !== w.id) : [...selected, w.id])}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
              isSelected
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-transparent text-muted-foreground border-border/50 hover:border-border hover:text-foreground"
            )}
          >
            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5" />}
            {w.name.split(' ')[0]}
          </button>
        );
      })}
      {fieldWorkers.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No workers found.</p>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ManagerJobs() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: jobs = [], isLoading } = useListJobs();
  const { data: worksites = [] } = useListWorksites();
  const { data: workers = [] } = useListWorkers();
  const { data: clients = [] } = useListClients();
  const { data: categories = [] } = useListJobCodeCategories();
  const { data: allCodes = [] } = useListJobCodes();
  const createJob = useCreateJob();
  const createClient = useCreateClient();

  const worksiteMap = Object.fromEntries(worksites.map(w => [w.id, w.name]));
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

  const [showCreate, setShowCreate] = useState(false);
  // Basic fields
  const [newName, setNewName] = useState('');
  const [newWorksiteId, setNewWorksiteId] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientId, setNewClientId] = useState<number | null>(null);
  const [newStartDate, setNewStartDate] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newStatus, setNewStatus] = useState('active');
  // Code budget
  const [codeBudget, setCodeBudget] = useState<Record<string, number>>({});
  // Worker assignment
  const [assignedWorkerIds, setAssignedWorkerIds] = useState<number[]>([]);

  const totalBudgetHours = Object.values(codeBudget).reduce((s, v) => s + (v || 0), 0);

  const handleClientChange = (name: string) => {
    setNewClientName(name);
    const match = clients.find(c => c.name.toLowerCase() === name.toLowerCase().trim());
    setNewClientId(match?.id ?? null);
  };

  const handleCreateClient = async (name: string): Promise<number | null> => {
    try {
      const client = await createClient.mutateAsync({ data: { name } });
      queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
      setNewClientName(client.name);
      setNewClientId(client.id);
      return client.id;
    } catch {
      return null;
    }
  };

  const resetForm = () => {
    setNewName('');
    setNewWorksiteId('');
    setNewClientName('');
    setNewClientId(null);
    setNewStartDate('');
    setNewDeadline('');
    setNewStatus('active');
    setCodeBudget({});
    setAssignedWorkerIds([]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newWorksiteId) return;

    let clientId = newClientId;
    if (!clientId && newClientName.trim()) {
      clientId = await handleCreateClient(newClientName.trim());
    }

    try {
      await createJob.mutateAsync({
        data: {
          name: newName.trim(),
          worksiteId: parseInt(newWorksiteId),
          clientId: clientId ?? null,
          budgetedHours: totalBudgetHours > 0 ? totalBudgetHours : null,
          startDate: newStartDate || null,
          deadline: newDeadline || null,
          status: newStatus,
          assignedWorkerIds: JSON.stringify(assignedWorkerIds),
          codeBudget: JSON.stringify(codeBudget),
        },
      });
      queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
      toast({ title: 'Job created', description: `"${newName.trim()}" has been added.` });
      setShowCreate(false);
      resetForm();
    } catch {
      toast({ title: 'Error', description: 'Could not create job.', variant: 'destructive' });
    }
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

  const activeJobs = jobs.filter(j => j.status === 'active');
  const otherJobs = jobs.filter(j => j.status !== 'active');

  const selectCls = "flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Jobs & Budgets</h1>
            <p className="text-muted-foreground text-sm mt-1">Configure budgets and milestones for each job.</p>
          </div>
          <Button
            size="sm"
            onClick={() => { setShowCreate(v => !v); if (showCreate) resetForm(); }}
            className={cn(
              "rounded-full w-9 h-9 p-0 transition-all",
              showCreate ? "bg-secondary text-foreground hover:bg-secondary/80" : "bg-primary text-primary-foreground"
            )}
            aria-label="Create new job"
          >
            {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>

        <AnimatePresence initial={false}>
          {showCreate && (
            <motion.form
              key="create-form"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              onSubmit={handleCreate}
              className="overflow-hidden"
            >
              <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 space-y-5">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">New Job</p>

                {/* ── Basic info ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Job name <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="e.g. Soffit Framing Package"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Worksite <span className="text-destructive">*</span></Label>
                    <select className={selectCls} value={newWorksiteId} onChange={e => setNewWorksiteId(e.target.value)} required>
                      <option value="" disabled>Select worksite…</option>
                      {worksites.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Client</Label>
                    <ClientInput
                      clients={clients}
                      value={newClientName}
                      onChange={handleClientChange}
                      onCreateClient={handleCreateClient}
                    />
                  </div>
                </div>

                {/* ── Dates ── */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dates (optional)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Start date</Label>
                      <Input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Deadline</Label>
                      <Input type="date" value={newDeadline} onChange={e => setNewDeadline(e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* ── Job code budget ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Job Code Budget</p>
                    {totalBudgetHours > 0 && (
                      <span className="text-xs text-muted-foreground">Auto-totals → <span className="font-bold text-primary">{totalBudgetHours}h</span></span>
                    )}
                  </div>
                  <CodeBudgetPicker
                    categories={categories}
                    allCodes={allCodes}
                    codeBudget={codeBudget}
                    onChange={setCodeBudget}
                  />
                </div>

                {/* ── Worker assignment ── */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Assign Workers {assignedWorkerIds.length > 0 && `(${assignedWorkerIds.length} selected)`}
                  </p>
                  <WorkerPicker
                    workers={workers}
                    selected={assignedWorkerIds}
                    onChange={setAssignedWorkerIds}
                  />
                </div>

                {/* ── Status ── */}
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <div className="flex gap-2">
                    {['active', 'on_hold', 'completed'].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewStatus(s)}
                        className={cn(
                          "flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all",
                          newStatus === s
                            ? s === 'active' ? "bg-success/20 text-success border-success/40"
                              : s === 'on_hold' ? "bg-warning/20 text-warning border-warning/40"
                              : "bg-secondary text-foreground border-border"
                            : "bg-transparent text-muted-foreground border-border/50 hover:border-border"
                        )}
                      >
                        {s === 'on_hold' ? 'On Hold' : s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setShowCreate(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={createJob.isPending} className="bg-primary">
                    {createJob.isPending ? 'Creating…' : <><Plus className="w-4 h-4 mr-1.5" />Create Job</>}
                  </Button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      {isLoading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-card animate-pulse" />)}
        </div>
      )}

      {activeJobs.length > 0 && (
        <motion.div variants={item} className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Jobs</p>
          {activeJobs.map(job => <JobCard key={job.id} job={job} worksiteMap={worksiteMap} clientMap={clientMap} />)}
        </motion.div>
      )}

      {otherJobs.length > 0 && (
        <motion.div variants={item} className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Other Jobs</p>
          {otherJobs.map(job => <JobCard key={job.id} job={job} worksiteMap={worksiteMap} clientMap={clientMap} />)}
        </motion.div>
      )}
    </motion.div>
  );
}
