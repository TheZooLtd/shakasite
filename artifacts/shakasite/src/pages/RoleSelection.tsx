import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HardHat, ClipboardCheck, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/context/AppContext';
import { useSeedData, useListWorkers } from '@workspace/api-client-react';

export default function RoleSelection() {
  const { setRole, setWorkerId } = useAppContext();
  const seedMutation = useSeedData();
  const { data: workers, isLoading: isLoadingWorkers, refetch } = useListWorkers();
  const [isInitializing, setIsInitializing] = useState(false);

  const handleSelectRole = async (role: 'worker' | 'manager') => {
    setIsInitializing(true);
    
    let allWorkers = workers;

    // Seed data if not seeded yet
    if (!allWorkers || allWorkers.length === 0) {
      try {
        await seedMutation.mutateAsync();
        const result = await refetch();
        allWorkers = result.data;
      } catch (err) {
        console.error("Failed to seed data", err);
      }
    }

    // Find the correct demo ID by role (first worker or first manager in the seeded data)
    const matchingWorker = allWorkers?.find(w => w.role === role);
    const demoId = matchingWorker?.id ?? (role === 'worker' ? 3 : 2);

    setTimeout(() => {
      setWorkerId(demoId);
      setRole(role);
      setIsInitializing(false);
    }, 800); // Artificial delay for smooth animation
  };

  if (isLoadingWorkers || isInitializing) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-medium animate-pulse">Setting up site environment...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-background">
      {/* Decorative background elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-success/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://pixabay.com/get/g1c4466a6ed95a30568fce90afb249f254d430993d65c1184de067d12b51c9f72c126f2944dd805805b12fb311f1c82accb76b12b7fa4caa9ce5e8017cf1f9b96_1280.png')] opacity-5 bg-cover bg-center mix-blend-overlay" />
      </div>

      <div className="relative z-10 w-full max-w-5xl px-4 py-12 flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-xl shadow-primary/20 mb-6">
            <HardHat className="w-10 h-10 text-white" />
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight text-white mb-4">
            ShakaSite
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Professional timesheet and site management. Choose your view to explore the demo.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div 
              onClick={() => handleSelectRole('worker')}
              className="glass p-8 rounded-3xl cursor-pointer group hover:bg-card/80 transition-all duration-500 hover:-translate-y-2"
            >
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <HardHat className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-3xl font-bold font-display mb-3">Worker Mode</h2>
              <p className="text-muted-foreground mb-8 line-clamp-3">
                Log your daily hours, break down tasks by category, and view your weekly timesheet summaries.
              </p>
              <div className="flex items-center text-primary font-semibold group-hover:translate-x-2 transition-transform">
                Enter as Worker <ArrowRight className="ml-2 w-5 h-5" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div 
              onClick={() => handleSelectRole('manager')}
              className="glass p-8 rounded-3xl cursor-pointer group hover:bg-card/80 transition-all duration-500 hover:-translate-y-2"
            >
              <div className="w-14 h-14 rounded-full bg-success/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ClipboardCheck className="w-7 h-7 text-success" />
              </div>
              <h2 className="text-3xl font-bold font-display mb-3">Manager Mode</h2>
              <p className="text-muted-foreground mb-8 line-clamp-3">
                Review team timesheets, approve hours, monitor job budgets with health gauges, and export reports.
              </p>
              <div className="flex items-center text-success font-semibold group-hover:translate-x-2 transition-transform">
                Enter as Manager <ArrowRight className="ml-2 w-5 h-5" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
