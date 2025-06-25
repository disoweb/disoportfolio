import React, { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import Services from "./pages/Services";
import ServiceDetails from "./pages/ServiceDetails";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import About from "./pages/About";
import Contact from "./pages/Contact";
import ClientDashboard from "@/pages/ClientDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import WhatsAppFloat from "@/components/WhatsAppFloat";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (isLoading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/services" component={Services} />
          <Route path="/service/:id" component={ServiceDetails} />
          <Route path="/projects" component={Projects} />
          <Route path="/project/:id" component={ProjectDetails} />
          <Route path="/about" component={About} />
          <Route path="/contact" component={Contact} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/dashboard" component={ClientDashboard} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/services" component={Services} />
          <Route path="/service/:id" component={ServiceDetails} />
          <Route path="/projects" component={Projects} />
          <Route path="/project/:id" component={ProjectDetails} />
          <Route path="/about" component={About} />
          <Route path="/contact" component={Contact} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
        <WhatsAppFloat />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;