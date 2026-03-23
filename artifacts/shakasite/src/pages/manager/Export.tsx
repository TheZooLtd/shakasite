import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useListWorkers, useExportTimesheet } from '@workspace/api-client-react';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileText, CheckCircle2, User } from 'lucide-react';
import { format, startOfWeek, subWeeks } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ManagerExport() {
  const { data: workers = [] } = useListWorkers();
  const exportTimesheet = useExportTimesheet();

  const [selectedWorker, setSelectedWorker] = useState<number | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');
  const [exported, setExported] = useState(false);

  const now = new Date();
  const weekOptions = Array.from({ length: 8 }, (_, i) => {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    return {
      label: i === 0 ? `This week (${format(weekStart, 'dd MMM')})` : format(weekStart, 'dd MMM yyyy'),
      value: weekStart.toISOString().slice(0, 10),
    };
  });

  const handleExport = async () => {
    const result = await exportTimesheet.mutateAsync({
      data: {
        workerId: selectedWorker ?? undefined,
        weekStart: selectedWeek || undefined,
        format: exportFormat,
      }
    });
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

  const workerList = workers.filter(w => w.role === 'worker');

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-lg">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold">Export Timesheets</h1>
        <p className="text-muted-foreground text-sm mt-1">Generate reports for payroll and accounts</p>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Worker</label>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => setSelectedWorker(null)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left",
                    selectedWorker === null
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  )}
                >
                  <User className="w-4 h-4" />
                  All Workers
                </button>
                {workerList.map(w => (
                  <button
                    key={w.id}
                    onClick={() => setSelectedWorker(w.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left",
                      selectedWorker === w.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    )}
                  >
                    <User className="w-4 h-4" />
                    {w.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Week</label>
              <select
                value={selectedWeek}
                onChange={e => setSelectedWeek(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">All weeks</option>
                {weekOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Format</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setExportFormat('pdf')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                    exportFormat === 'pdf'
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary hover:border-border/80"
                  )}
                >
                  <FileText className={cn("w-7 h-7", exportFormat === 'pdf' ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-sm font-semibold", exportFormat === 'pdf' ? "text-primary" : "text-muted-foreground")}>PDF</span>
                  <span className="text-xs text-muted-foreground">For printing</span>
                </button>
                <button
                  onClick={() => setExportFormat('excel')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                    exportFormat === 'excel'
                      ? "border-success bg-success/10"
                      : "border-border bg-secondary hover:border-border/80"
                  )}
                >
                  <FileSpreadsheet className={cn("w-7 h-7", exportFormat === 'excel' ? "text-success" : "text-muted-foreground")} />
                  <span className={cn("text-sm font-semibold", exportFormat === 'excel' ? "text-success" : "text-muted-foreground")}>Excel</span>
                  <span className="text-xs text-muted-foreground">For accounts</span>
                </button>
              </div>
            </div>

            <Button
              onClick={handleExport}
              disabled={exportTimesheet.isPending}
              className="w-full"
              size="lg"
            >
              {exported ? (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Export Ready!
                </>
              ) : exportTimesheet.isPending ? 'Generating...' : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Export {exportFormat.toUpperCase()}
                </>
              )}
            </Button>

            {exported && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-success/10 border border-success/30 rounded-xl p-4 text-center"
              >
                <p className="text-success font-medium text-sm">
                  Export generated! In a live system, the file would download automatically.
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">How exports work:</strong> When timesheets are signed off by a manager, they're locked and ready for export. The exported file includes worker names, dates, hours per task type, and total hours. PDF format is formatted for printing; Excel is designed for payroll software import.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
