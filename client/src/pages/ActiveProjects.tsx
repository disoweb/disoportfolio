import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChartGantt } from 'lucide-react';
import { Link } from 'wouter';
import Navigation from '@/components/Navigation';
import ProjectTimer from '@/components/ProjectTimer';

export default function ActiveProjects() {
  const { data: allProjects, isLoading, error } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: statsData } = useQuery({
    queryKey: ["/api/client/stats"],
  });
  
  const stats = (statsData as any) || { activeProjects: 0 };

  // Filter for only active projects
  const projects = React.useMemo(() => {
    if (!allProjects || !Array.isArray(allProjects)) {
      return [];
    }
    return allProjects.filter((project: any) => project.status === 'active');
  }, [allProjects]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Active Projects
          </h1>
          <p className="text-slate-600">
            Track progress and manage your ongoing projects ({stats?.activeProjects || 0} active)
          </p>
        </div>

        {/* Projects Section - Exact same design as dashboard */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-900">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {projects && projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {projects.map((project: any) => (
                  <ProjectTimer key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ChartGantt className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Active Projects</h3>
                <p className="text-slate-600 mb-4">
                  Projects will be created automatically after successful order payment.
                </p>
                <Link href="/services">
                  <Button>Browse Services</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}