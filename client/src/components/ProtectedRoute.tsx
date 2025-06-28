import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import Landing from '@/pages/Landing';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If not authenticated, show landing page directly - no redirects needed
  if (!isAuthenticated || !user) {
    return fallback || <Landing />;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}