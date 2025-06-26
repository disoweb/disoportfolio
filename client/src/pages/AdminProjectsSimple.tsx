import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import AdminNavigation from '@/components/AdminNavigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";

export default function AdminProjectsSimple() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Get projects data
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Redirect non-admin users
  if (!authLoading && (!isAuthenticated || user?.role !== 'admin')) {
    window.location.href = '/admin';
    return null;
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <AdminNavigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <AdminNavigation />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="space-y-1 min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Project Management
            </h1>
            <p className="text-slate-600 text-sm lg:text-base">
              Manage all client projects and track progress
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25">
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">New Project</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>

        {/* Projects List */}
        <div className="grid gap-4 lg:gap-6">
          {projects.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">No projects found</p>
              </CardContent>
            </Card>
          ) : (
            projects.map((project: any) => (
              <Card key={project.id} className="border-0 shadow-lg">
                <CardContent className="p-4 lg:p-6">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {project.projectName}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Status: {project.status}
                  </p>
                  <p className="text-sm text-slate-600">
                    Progress: {project.progressPercentage || 0}%
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}