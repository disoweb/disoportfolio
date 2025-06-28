import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Handle authentication redirect with proper hook usage
  React.useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user)) {
      // Instead of redirecting to auth, redirect to home page where landing page will be shown
      window.location.href = '/';
    }
  }, [isLoading, isAuthenticated, user]);

  // If not authenticated, show loading state while redirecting
  if (!isAuthenticated || !user) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}