import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useAppContext } from "@/context/AppContext";

// Pages
import RoleSelection from "@/pages/RoleSelection";
import WorkerDashboard from "@/pages/worker/Dashboard";
import WorkerLogTime from "@/pages/worker/LogTime";
import WorkerMyTimesheets from "@/pages/worker/MyTimesheets";
import WorkerSettings from "@/pages/worker/Settings";
import WorkerMessages from "@/pages/worker/Messages";
import ManagerDashboard from "@/pages/manager/Dashboard";
import ManagerTimesheets from "@/pages/manager/Timesheets";
import ManagerJobs from "@/pages/manager/Jobs";
import ManagerMessages from "@/pages/manager/Messages";
import ManagerExport from "@/pages/manager/Export";
import NotFound from "@/pages/not-found";
import { AppLayout } from "./components/layout/AppLayout";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { role } = useAppContext();

  if (!role) {
    return <RoleSelection />;
  }

  return (
    <AppLayout>
      <Switch>
        {role === 'worker' ? (
          <>
            <Route path="/" component={WorkerDashboard} />
            <Route path="/log-time" component={WorkerLogTime} />
            <Route path="/my-timesheets" component={WorkerMyTimesheets} />
            <Route path="/messages" component={WorkerMessages} />
            <Route path="/settings" component={WorkerSettings} />
          </>
        ) : (
          <>
            <Route path="/" component={ManagerDashboard} />
            <Route path="/team-timesheets" component={ManagerTimesheets} />
            <Route path="/jobs" component={ManagerJobs} />
            <Route path="/messages" component={ManagerMessages} />
            <Route path="/export" component={ManagerExport} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <ProtectedRoutes />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
