import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, Play, Pause, Calendar, User } from 'lucide-react';

interface ProjectTimerProps {
  project: any;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "not_started":
      return "bg-slate-500";
    case "active":
      return "bg-green-500";
    case "paused":
      return "bg-yellow-500";
    case "completed":
      return "bg-blue-500";
    default:
      return "bg-slate-500";
  }
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case "active":
      return "default";
    case "completed":
      return "secondary";
    case "paused":
      return "outline";
    default:
      return "outline";
  }
};

const extractProjectInfo = (project: any) => {
  // Handle case where project data might be in different formats
  if (typeof project === 'string') {
    try {
      const parsed = JSON.parse(project);
      return parsed;
    } catch {
      return null;
    }
  }

  // If project has nested structure, extract relevant info
  if (project.contactInfo || project.projectDetails) {
    return {
      projectName: project.projectDetails?.description || project.contactInfo?.fullName + "'s Project" || "Custom Project",
      status: "active",
      progressPercentage: 25,
      currentStage: "discovery",
      timelineWeeks: 2,
      createdAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
      contactInfo: project.contactInfo,
      projectDetails: project.projectDetails,
      selectedAddOns: project.selectedAddOns || [],
      timeline: project.timeline || "2 weeks",
      paymentMethod: project.paymentMethod || "Paystack"
    };
  }

  return project;
};

export default function ProjectTimer({ project: rawProject }: ProjectTimerProps) {
  const [timeSpent, setTimeSpent] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const project = extractProjectInfo(rawProject);

  if (!project) {
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="text-center text-slate-500">
            <p>Invalid project data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold">{project.projectName}</CardTitle>
          <Badge variant={getStatusVariant(project.status)}>
            <div className={`w-2 h-2 rounded-full ${getStatusColor(project.status)} mr-2`} />
            {project.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Add-ons */}
          {project.selectedAddOns && project.selectedAddOns.length > 0 && (
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Selected Add-ons</h4>
              <div className="flex flex-wrap gap-1">
                {project.selectedAddOns.map((addon: any, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {addon.name || addon}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Timer */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-medium">Time Tracking</span>
            </div>
            <div className="text-lg font-mono">{formatTime(timeSpent)}</div>
          </div>

          <div className="flex space-x-2">
            <Button
              variant={isRunning ? "destructive" : "default"}
              size="sm"
              onClick={() => setIsRunning(!isRunning)}
              className="flex-1"
            >
              {isRunning ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {isRunning ? 'Pause' : 'Start'}
            </Button>
          </div>

          {/* Project Info */}
          <div className="flex items-center justify-between text-sm text-slate-600">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>Due: {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'TBD'}</span>
            </div>
            <span className="capitalize">{project.currentStage || 'Discovery'}</span>
          </div>

          {/* Project Stats */}
          <div className="text-xs text-slate-500 pt-2 border-t">
            Timeline: {project.timelineWeeks || project.timeline || '2'} weeks | 
            Payment: {project.paymentMethod || 'Paystack'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}