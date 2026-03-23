import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useGetWorker, useUpdateWorker, useListWorkers } from '@workspace/api-client-react';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { User, Phone, Calendar, HardHat, Check, LogOut } from 'lucide-react';

export default function WorkerSettings() {
  const { workerId, logout } = useAppContext();
  const { data: worker, isLoading, refetch } = useGetWorker(workerId!);
  const { data: allWorkers = [] } = useListWorkers();
  const updateWorker = useUpdateWorker();

  const [mobile, setMobile] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState('');
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    if (worker) {
      setMobile(worker.mobileNumber ?? '');
      setDaysPerWeek(String(worker.daysPerWeek));
    }
  }, [worker]);

  const siteManager = allWorkers.find(w => w.id === worker?.siteManagerId);

  const handleSave = async () => {
    if (!workerId) return;
    await updateWorker.mutateAsync({
      id: workerId,
      data: {
        mobileNumber: mobile || null,
        daysPerWeek: parseInt(daysPerWeek, 10) || 5,
      }
    });
    await refetch();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

  if (isLoading || !worker) {
    return <div className="animate-pulse h-64 rounded-2xl bg-card" />;
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-lg">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Your personal preferences and contact info</p>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-bold text-lg">{worker.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{worker.role}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                Mobile Number
              </Label>
              <Input
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                placeholder="021 000 0000"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Days Per Week
              </Label>
              <div className="flex gap-2">
                {[3, 4, 5, 6].map(d => (
                  <button
                    key={d}
                    onClick={() => setDaysPerWeek(String(d))}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                      daysPerWeek === String(d)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {siteManager && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <HardHat className="w-4 h-4 text-muted-foreground" />
                  Site Manager
                </Label>
                <div className="px-4 py-3 rounded-xl bg-secondary text-sm font-medium text-foreground">
                  {siteManager.name}
                  {siteManager.mobileNumber && (
                    <span className="text-muted-foreground ml-2 text-xs">{siteManager.mobileNumber}</span>
                  )}
                </div>
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={updateWorker.isPending || saved}
              className="w-full"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Saved!
                </>
              ) : updateWorker.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardContent className="p-6">
            <button
              onClick={logout}
              className="flex items-center gap-3 text-destructive hover:text-destructive/80 transition-colors w-full"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Switch Role / Exit</span>
            </button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
