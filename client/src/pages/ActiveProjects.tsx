import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Calendar, Clock, Target } from 'lucide-react';
import { Link } from 'wouter';
import Navigation from '@/components/Navigation';

export default function ActiveProjects() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/client/stats"],
  });

  // Filter for active projects only
  const activeProjects = React.useMemo(() => {
    if (!projects) return [];
    return projects.filter((project: any) => project.status === 'active');
  }, [projects]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTimeRemaining = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return { days: 0, hours: 0, minutes: 0, isOverdue: true };
    }
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return { days, hours, minutes, isOverdue: false };
  };

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

        {/* Projects Grid */}
        {activeProjects.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Target className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Active Projects</h3>
              <p className="text-slate-600 mb-6">You don't have any active projects at the moment.</p>
              <Link href="/">
                <Button>Browse Services</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeProjects.map((project: any) => {
              const timeRemaining = formatTimeRemaining(project.dueDate);
              const progress = project.progress || 0;
              const timeProgress = project.timeProgress || 0;
              
              return (
                <Card key={project.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-bold text-slate-900">
                        {project.title}
                      </CardTitle>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {project.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Progress Section */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-600">Project Progress</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-600">Time Progress</span>
                        <span className="font-medium">{timeProgress}%</span>
                      </div>
                      <Progress value={timeProgress} className="h-2" />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">Started</p>
                          <p className="text-sm font-medium">
                            {formatDate(project.startDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">Due Date</p>
                          <p className="text-sm font-medium">
                            {formatDate(project.dueDate)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Time Remaining */}
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-slate-600" />
                        <span className="text-sm font-medium text-slate-600">
                          {timeRemaining.isOverdue ? 'Overdue' : 'Time Remaining'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className={`text-2xl font-bold ${timeRemaining.isOverdue ? 'text-red-600' : 'text-slate-900'}`}>
                            {timeRemaining.days}
                          </div>
                          <div className="text-xs text-slate-500">Days</div>
                        </div>
                        <div>
                          <div className={`text-2xl font-bold ${timeRemaining.isOverdue ? 'text-red-600' : 'text-slate-900'}`}>
                            {timeRemaining.hours}
                          </div>
                          <div className="text-xs text-slate-500">Hours</div>
                        </div>
                        <div>
                          <div className={`text-2xl font-bold ${timeRemaining.isOverdue ? 'text-red-600' : 'text-slate-900'}`}>
                            {timeRemaining.minutes}
                          </div>
                          <div className="text-xs text-slate-500">Minutes</div>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Link href={`/project/${project.id}`}>
                      <Button className="w-full">
                        View Project Details
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}