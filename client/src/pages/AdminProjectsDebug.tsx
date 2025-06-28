import React from 'react';
import AdminNavigation from '@/components/AdminNavigation';
import { useAuth } from '@/hooks/useAuth';

export default function AdminProjectsDebug() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  console.log('AdminProjectsDebug render:', { user, isAuthenticated, authLoading });

  // Check auth state
  if (authLoading) {
    console.log('Auth loading...');
    return (
      <div className="min-h-screen bg-gray-100">
        <AdminNavigation />
        <div className="p-8">
          <h1>Auth Loading...</h1>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting...');
    window.location.href = '/admin';
    return null;
  }

  if (user?.role !== 'admin') {
    console.log('Not admin user, redirecting...', user?.role);
    window.location.href = '/admin';
    return null;
  }

  console.log('Rendering admin projects debug page');

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNavigation />
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">Admin Projects Debug</h1>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Debug Info:</h2>
          <p><strong>User:</strong> {JSON.stringify(user)}</p>
          <p><strong>Authenticated:</strong> {isAuthenticated.toString()}</p>
          <p><strong>Auth Loading:</strong> {authLoading.toString()}</p>
          <p><strong>User Role:</strong> {user?.role}</p>
        </div>
      </div>
    </div>
  );
}