import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';
import { 
  Home, 
  Clock, 
  History, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Briefcase, 
  MessageSquare, 
  Download,
  HardHat,
  Tag,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { role, logout } = useAppContext();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const workerNav = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Log Time', path: '/log-time', icon: Clock },
    { name: 'My Timesheets', path: '/my-timesheets', icon: History },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const managerNav = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Team Timesheets', path: '/team-timesheets', icon: History },
    { name: 'Jobs & Budgets', path: '/jobs', icon: Briefcase },
    { name: 'Workers', path: '/workers', icon: Users },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
    { name: 'Job Codes', path: '/job-codes', icon: Tag },
    { name: 'Export', path: '/export', icon: Download },
  ];

  const navItems = role === 'manager' ? managerNav : workerNav;

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 flex-col bg-card border-r border-border h-screen sticky top-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <HardHat className="text-primary-foreground w-6 h-6" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight">ShakaSite</span>
        </div>
        
        <div className="px-6 pb-4">
          <div className="px-3 py-2 rounded-lg bg-secondary/50 border border-border/50 text-xs font-semibold text-muted-foreground flex justify-between items-center">
            <span>{role === 'manager' ? 'MANAGER MODE' : 'WORKER MODE'}</span>
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <div className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200",
                  isActive 
                    ? "bg-primary/10 text-primary font-semibold" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}>
                  <item.icon className="w-5 h-5 shrink-0" />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <button 
            onClick={logout}
            className="flex w-full items-center gap-3 px-4 py-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Switch Role
          </button>
        </div>
      </aside>

      {/* Mobile Layout */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <HardHat className="text-primary w-6 h-6" />
            <span className="font-display font-bold text-xl">ShakaSite</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 bg-secondary rounded-lg text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 relative">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Nav — first 4 items */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around p-2 pb-safe z-30">
          {navItems.slice(0, 4).map((item) => {
             const isActive = location === item.path;
             return (
               <Link key={item.path} href={item.path}>
                 <div className={cn(
                   "flex flex-col items-center gap-1 p-2 rounded-xl transition-colors",
                   isActive ? "text-primary" : "text-muted-foreground"
                 )}>
                   <item.icon className="w-5 h-5" />
                   <span className="text-[10px] font-medium">{item.name.split(' ')[0]}</span>
                 </div>
               </Link>
             )
          })}
        </nav>
      </div>

      {/* Mobile Reveal Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="md:hidden fixed top-0 right-0 bottom-0 w-4/5 max-w-sm bg-card border-l border-border z-50 flex flex-col shadow-2xl"
            >
              <div className="p-4 flex justify-end border-b border-border">
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-secondary rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 pt-6 pb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Navigation</p>
              </div>
              <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive = location === item.path;
                  return (
                    <Link key={item.path} href={item.path}>
                      <div 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                        "flex items-center gap-4 px-4 py-4 rounded-xl cursor-pointer transition-all duration-200",
                        isActive 
                          ? "bg-primary/10 text-primary font-bold" 
                          : "text-foreground font-medium hover:bg-secondary"
                      )}>
                        <item.icon className="w-6 h-6" />
                        {item.name}
                      </div>
                    </Link>
                  );
                })}
              </nav>
              <div className="p-6 border-t border-border">
                <button 
                  onClick={logout}
                  className="flex w-full justify-center items-center gap-2 px-4 py-3 bg-destructive/10 text-destructive font-bold rounded-xl transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Switch Role
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
