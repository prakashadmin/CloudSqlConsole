import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider, useUser } from "@/contexts/user-context";
import { Login } from "@/components/login";
import { AppHeader } from "@/components/app-header";
import { AdminPanel } from "@/components/admin-panel";
import SQLClient from "@/pages/sql-client";
import NotFound from "@/pages/not-found";

function AuthenticatedRouter() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto p-4">
        <Switch>
          <Route path="/" component={SQLClient} />
          <Route path="/admin" component={AdminPanel} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function AppContent() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold">Loading...</div>
          <div className="text-sm text-muted-foreground">Checking authentication</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={() => {}} />;
  }

  return <AuthenticatedRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UserProvider>
          <Toaster />
          <AppContent />
        </UserProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
