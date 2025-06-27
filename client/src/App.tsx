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
import ActiveProjects from "@/pages/ActiveProjects";
import TransactionHistory from "@/pages/TransactionHistory";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminProjects from "@/pages/AdminProjects";
import AdminProjectsTest from "@/pages/AdminProjectsTest";
import AdminProjectsSimple from "@/pages/AdminProjectsSimple";
import AdminProjectsFixed from "@/pages/AdminProjectsFixed";
import AdminProjectsDebug from "@/pages/AdminProjectsDebug";
import AdminServices from "@/pages/AdminServices";
import AdminSEO from "@/pages/AdminSEO";
import AdminReferrals from "@/pages/AdminReferrals";
import AdminLogin from "@/pages/AdminLogin";
import Checkout from "@/pages/Checkout";
import ReferralDashboard from "@/pages/ReferralDashboardNew";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import WhatsAppFloat from "@/components/WhatsAppFloat";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  // Initialize payment state immediately from sessionStorage to prevent flash
  const [paymentInProgress, setPaymentInProgress] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('payment_in_progress') === 'true';
    }
    return false;
  });

  useEffect(() => {
    setMounted(true);
    
    // Debug and clear any persistent payment flags on app start
    const paymentFlag = sessionStorage.getItem('payment_in_progress');

    
    // Clear the flag on fresh app load to prevent persistent loader
    if (paymentFlag === 'true') {

      sessionStorage.removeItem('payment_in_progress');
      setPaymentInProgress(false);
    }
  }, []);

  // Check for payment states and handle auto-submit
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('clear_payment') === 'true') {
        sessionStorage.removeItem('payment_in_progress');
        sessionStorage.removeItem('pendingCheckout');
        setPaymentInProgress(false);
      } else {
        // Check payment flags immediately
        const inProgress = sessionStorage.getItem('payment_in_progress') === 'true';
        const pendingCheckout = sessionStorage.getItem('pendingCheckout');
        

        
        // Set payment loader if payment is in progress or authenticated user has pending checkout
        if (inProgress || (isAuthenticated && pendingCheckout)) {
          setPaymentInProgress(true);
          // Ensure immediate auto-submission for authenticated users with pending data
          if (isAuthenticated && pendingCheckout && !inProgress) {
            sessionStorage.setItem('payment_in_progress', 'true');
          }
        }
      }
    }
  }, [isAuthenticated]);

  // Clear payment flag after a timeout to prevent persistent loading
  useEffect(() => {
    if (paymentInProgress) {

      const timeout = setTimeout(() => {

        sessionStorage.removeItem('payment_in_progress');
        sessionStorage.removeItem('pendingCheckout');
        setPaymentInProgress(false);
      }, 5000); // 5 seconds max for payment processing

      return () => clearTimeout(timeout);
    }
  }, [paymentInProgress]);

  if (isLoading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check for immediate payment conditions
  const pendingCheckout = typeof window !== 'undefined' && sessionStorage.getItem('pendingCheckout');
  const shouldShowPaymentLoader = paymentInProgress || (isAuthenticated && pendingCheckout);
  
  // Priority render: payment loader before anything else
  if (shouldShowPaymentLoader) {

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Processing Payment...</h1>
          <p className="text-gray-600">Redirecting to secure payment gateway...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <>
        <Route path="/" component={!isAuthenticated ? Landing : Home} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/admin" component={AdminLogin} />
        <Route path="/admin-dashboard" component={AdminDashboard} />
        <Route path="/admin/projects" component={AdminProjectsFixed} />
        <Route path="/admin/services" component={AdminServices} />
        <Route path="/admin/seo" component={AdminSEO} />
        <Route path="/admin/referrals" component={AdminReferrals} />
        <Route path="/dashboard" component={ClientDashboard} />
        <Route path="/active-projects" component={ActiveProjects} />
        <Route path="/referrals" component={ReferralDashboard} />
        <Route path="/transactions" component={TransactionHistory} />
        <Route path="/transaction-history" component={TransactionHistory} />
        <Route path="/services" component={Services} />
        <Route path="/service/:id" component={ServiceDetails} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/projects" component={Projects} />
        <Route path="/project/:id" component={ProjectDetails} />
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
      </>
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