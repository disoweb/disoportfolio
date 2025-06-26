import React from 'react';
import AdminNavigation from '@/components/AdminNavigation';

export default function AdminProjectsTest() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <AdminNavigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Projects Test</h1>
        <p className="mt-4 text-gray-600">This is a test page to verify the route is working.</p>
      </div>
    </div>
  );
}